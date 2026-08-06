// Quotation Step-2 costing worksheet — a smooth, spreadsheet-style editor
// (one row per product) modelled on the export pricing worksheet (slide 8).
//
// UX: every editable numeric cell shows as a plain right-aligned value (a
// label) and turns into a focused input only on click — commit on blur / Enter,
// cancel on Esc. Computed cells are read-only. Product/Vendor are pickers.
// Fixed column widths (via <colgroup>) keep values on one line; the grid scrolls
// horizontally with a sticky Product column + sticky totals footer.
//
// Writes to the same react-hook-form `lines` array + line shape the existing
// save mapping reads, so the backend is unchanged.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useWatch, useFormState } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  Input,
  Button,
  Badge,
  Popover,
  PopoverHeader,
  PopoverBody,
} from "reactstrap";
import Select from "react-select";
import { Plus, Trash2, X } from "react-feather";
import { useTranslation } from "react-i18next";
import ReactPaginate from "react-paginate";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  num,
  round2,
  fmt,
  currencySymbol,
  computeLineCosting,
  splitFreightByQty,
} from "@src/views/_shared/sales-doc/_helpers";
import LineItemImportExportBar from "@src/views/_shared/sales-doc/import-export/LineItemImportExportBar";
import { getVendorDropdown } from "@src/views/vendors/store";
import Notification from "@components/toast/notification";
import EntitySearchSelect from "@components/entity-select";
import { resolveEntityByIds, ENTITY_KINDS } from "@src/utility/asyncSelect";

// Weights are stored at 3-decimal precision (matches the line entity's
// numeric(14,3)); used when auto-filling qty × per-unit weight.
const round3 = (n) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 1000) / 1000 : 0;

// ── Click-to-edit numeric cell ──────────────────────────────────────────────
// Shows `display` as a label; click → autofocused input bound to `value`.
const EditableCell = ({
  value,
  display,
  onCommit,
  readOnly,
  placeholder = "—",
  align = "end",
  width,
  suffix = "",
  invalid = false,
  // "number" for money/qty, "text" for codes. HSN has to be text: a number
  // input drops the leading zero on codes like 08011100 and offers a spinner
  // on something that is a classification, not a quantity.
  type = "number",
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const start = () => {
    if (readOnly) return;
    setDraft(value == null ? "" : String(value));
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    onCommit(draft);
  };

  if (editing) {
    return (
      <Input
        innerRef={ref}
        bsSize="sm"
        type={type}
        {...(type === "number" ? { step: "0.01" } : {})}
        className={`text-${align} ws-input`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }
  const has = value !== "" && value != null;
  return (
    <div
      className={`ws-cell text-${align}${readOnly ? "" : " ws-editable"}`}
      style={{
        ...(width ? { minWidth: width } : {}),
        ...(invalid
          ? {
              border: "1px solid #ea5455",
              backgroundColor: "rgba(234,84,85,0.08)",
              borderRadius: "0.25rem",
            }
          : {}),
      }}
      onClick={start}
      role={readOnly ? undefined : "button"}
      title={readOnly ? undefined : "Click to edit"}
    >
      {has ? (
        <span className="ws-num">
          {display != null ? display : value}
          {suffix}
        </span>
      ) : (
        <span className="text-muted">{placeholder}</span>
      )}
    </div>
  );
};

const CostingWorksheet = ({
  control,
  setValue,
  getValues,
  productOptions = [],
  expenseOptions = [],
  rebateOptions = [],
  exchangeRate = 1,
  docCurrencyCode = "INR",
  baseCurrencyCode = "INR",
  readOnly = false,
  // Drives the import/export filename + backend layout. "quotation" by default;
  // the Sales Order wizard passes "po".
  docType = "quotation",
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);
  const lineFA = useFieldArray({ control, name: "lines" });
  const liveLines = useWatch({ control, name: "lines" }) || [];

  // A line's source currency = the VENDOR's currency (the pricelist follows the
  // vendor). The by-product rows can carry a stale row currency, so resolve the
  // TRUE currency from the vendor dropdown (loaded here if empty) and prefer it.
  const vendorDropdown = useSelector((s) => s.vendor?.vendorDropdown || []);
  useEffect(() => {
    if (!vendorDropdown.length) dispatch(getVendorDropdown());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const vendorCcyById = useMemo(() => {
    const m = {};
    for (const v of vendorDropdown) {
      if (v?._id) m[v._id] = (v.currency_code || "INR").toUpperCase();
    }
    return m;
  }, [vendorDropdown]);

  // ── Doc-level vendor (source) currency — one currency per document ──────
  // Currency-first: the operator picks the vendor currency BEFORE any line
  // vendor, so every vendor picker only offers matching-currency vendors
  // (multi-currency rule). Stored on the doc header as `vendor_currency_code`.
  const vendorCurrency = (
    useWatch({ control, name: "vendor_currency_code" }) || ""
  ).toUpperCase();
  const vendorCurrencyOptions = useMemo(() => {
    const set = new Set();
    for (const v of vendorDropdown)
      set.add((v.currency_code || "INR").toUpperCase());
    if (!set.size) set.add("INR");
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [vendorDropdown]);

  // A line's vendor options, filtered to the chosen vendor currency. Empty
  // until a currency is picked (currency-first).
  //   1) price-listed vendors for this product (with ₹ rate + "Cheapest" badge)
  //   2) then EVERY other active vendor in the same currency (no rate yet) — so
  //      you can pick a vendor that doesn't quote the product, enter a cost, and
  //      have it added to the price list on save (client 2026-08-05).
  const vendorOptsFor = (l) => {
    if (!vendorCurrency) return [];
    const priced = (vendorsByProduct[l?.product_id] || []).filter(
      (o) => (o.raw?.currency_code || "INR").toUpperCase() === vendorCurrency
    );
    const pricedIds = new Set(priced.map((o) => String(o.value)));
    const others = (vendorDropdown || [])
      .filter(
        (v) =>
          (v.currency_code || "INR").toUpperCase() === vendorCurrency &&
          !pricedIds.has(String(v._id))
      )
      .map((v) => ({
        value: v._id,
        label: v.vendor_code
          ? `${v.company_name} (${v.vendor_code})`
          : v.company_name,
        raw: {
          vendor_id: v._id,
          vendor_name: v.company_name,
          vendor_code: v.vendor_code,
          currency_code: v.currency_code,
          _no_price: true,
        },
      }));
    return [...priced, ...others];
  };

  // Change the doc vendor currency. If lines already carry vendors, confirm;
  // then re-select the CHEAPEST vendor in the new currency for each line (or
  // clear the line when no vendor in that currency exists for its product).
  const changeVendorCurrency = (opt) => {
    const next = (opt?.value || "").toUpperCase();
    if (next === vendorCurrency) return;
    const withVendor = (liveLines || []).filter((l) => l?.vendor_id).length;
    const apply = () => {
      // 1) Clear every existing vendor pick FIRST so the per-pick currency
      //    guard can't block re-selection mid-loop.
      (liveLines || []).forEach((l, idx) => {
        if (!l?.vendor_id) return;
        setValue(`lines.${idx}.vendor_id`, "");
        setValue(`lines.${idx}.vendor_name`, "");
        setValue(`lines.${idx}.vendor_code`, "");
        setValue(`lines.${idx}.source_currency_code`, next);
        setValue(`lines.${idx}.cost_exchange_rate`, "1");
      });
      setValue("vendor_currency_code", next, { shouldDirty: true });
      // 2) Auto-select the cheapest vendor in the NEW currency per line
      //    (options are sorted cheapest-first). Leaves the line empty when the
      //    product has no vendor in that currency.
      (liveLines || []).forEach((l, idx) => {
        if (!l?.product_id) return;
        const match = (vendorsByProduct[l.product_id] || []).find(
          (o) => (o.raw?.currency_code || "INR").toUpperCase() === next
        );
        if (match) onPickVendor(idx, match);
      });
    };
    if (withVendor > 0 && vendorCurrency) {
      mySwal
        .fire({
          title: t("Change vendor currency?"),
          text: t(
            "Vendors on {{n}} line(s) will switch to the cheapest {{cur}} vendor (or clear if none exists). Continue?",
            { n: withVendor, cur: next }
          ),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: t("Yes, change"),
          cancelButtonText: t("Cancel"),
          customClass: {
            confirmButton: "btn btn-warning",
            cancelButton: "btn btn-outline-secondary ms-1",
          },
          buttonsStyling: false,
        })
        .then((res) => {
          if (res.isConfirmed) apply();
        });
    } else {
      apply();
    }
  };

  // NOTE: the doc Vendor Currency is deliberately NOT auto-derived from seeded
  // lines — it starts BLANK on a fresh document so the operator picks it (client
  // 2026-08-06). Picking it (changeVendorCurrency) then auto-selects each line's
  // vendor in that currency. An EDIT loads the saved `vendor_currency_code` via
  // the form reset, so existing docs still open with their currency set.

  // Vendor's true currency for a picked row (fallback: the row's own currency).
  const vendorCurOf = (vendorId, rowCcy) =>
    (vendorCcyById[vendorId] || rowCcy || "INR").toUpperCase();

  // Reconcile every line's source currency to its vendor's TRUE currency once
  // the dropdown is loaded — fixes the auto-pick race (dropdown may arrive after
  // the initial auto-select) and any stale source_currency_code on an edited doc.
  useEffect(() => {
    liveLines.forEach((l, idx) => {
      const vid = l?.vendor_id;
      if (!vid) return;
      const known = vendorCcyById[vid];
      if (!known) return;
      if ((l?.source_currency_code || "").toUpperCase() !== known) {
        setValue(`lines.${idx}.source_currency_code`, known, {
          shouldDirty: false,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorCcyById, liveLines]);
  // Per-line validation errors — drives the red highlight on required fields
  // (e.g. Qty) so the user can fix them inline instead of just seeing a toast.
  const { errors } = useFormState({ control });

  // Shipment freight for a CNF quote — one figure in the DOCUMENT currency,
  // typed directly (like the rate). Split by qty across lines below; sits
  // beside the costing chain (added after margin to form CNF), never inside it.
  const freightTotalRaw = useWatch({ control, name: "freight_total" });
  const freightTotal = num(freightTotalRaw);

  // All active expense / rebate master heads (from management) — the full set
  // shown in the popover; each can be ticked into a line's calculation.
  const expenseMasters = (expenseOptions || []).map((o) => ({
    id: o.raw?._id || o.value,
    code: o.raw?.code || "",
    name: o.raw?.name || o.label,
    type: o.raw?.type || "fixed",
    defaultAmount: o.raw?.value ?? "0",
  }));
  const rebateMasters = (rebateOptions || []).map((o) => ({
    id: o.raw?._id || o.value,
    code: o.raw?.code || "",
    name: o.raw?.name || o.label,
    type: o.raw?.type || "percent",
    defaultAmount: o.raw?.pct ?? "0",
  }));

  // Vendor lists are cached by product_id (NOT row index): the same product
  // on two lines shares one fetch, and deleting/reordering rows never
  // misaligns a row with another product's vendors.
  const [vendorsByProduct, setVendorsByProduct] = useState({});
  const [loadingByProduct, setLoadingByProduct] = useState({});
  const [openPop, setOpenPop] = useState(null);
  // Client-side pagination over the editable rows. Rows keep their ABSOLUTE
  // index (the cell handlers write to `lines.${idx}`), so we slice but carry
  // the original index along.
  const [wsPageSize, setWsPageSize] = useState(10);
  const [wsPage, setWsPage] = useState(0);

  const isForeign =
    docCurrencyCode &&
    baseCurrencyCode &&
    docCurrencyCode.toUpperCase() !== baseCurrencyCode.toUpperCase();
  const rate = num(exchangeRate) || 1;

  // ── Multi-currency: per-source-currency exchange-rate boxes ─────────────
  // The document is priced in the customer's currency. Each line's cost is in
  // its VENDOR's currency (source); we convert cost → document currency with a
  // rate PER DISTINCT source currency (auto-filled from the master, editable).
  // INR is just another currency. A source == the document currency needs no
  // box (rate 1). (Multi-currency plan §6.5, D-8.)
  const docCur = (docCurrencyCode || "INR").toUpperCase();
  const distinctSources = useMemo(() => {
    const set = new Set();
    for (const l of liveLines) {
      // Only a line with a CHOSEN vendor has a real source currency. An empty
      // "Select product" row must not add a spurious box. With the
      // one-currency-per-document rule this yields at most one box. A vendor
      // whose currency == the document currency still gets a box (shown
      // disabled at rate 1) so the rate is always visible.
      if (!l?.vendor_id) continue;
      const sc = (l?.source_currency_code || "INR").toUpperCase();
      if (sc) set.add(sc);
    }
    return Array.from(set).sort();
  }, [liveLines, docCur]);

  // { [sourceCode]: { rate: string, available: boolean } }
  const [sourceRates, setSourceRates] = useState({});
  const sourcesKey = distinctSources.join("|");
  useEffect(() => {
    let cancelled = false;
    distinctSources.forEach((src) => {
      if (src === docCur) return; // same currency → fixed rate 1, no fetch
      if (sourceRates[src]) return; // fetched or user-edited already
      instance
        .get(API_ENDPOINTS.currencies.currentRate, {
          params: { from: src, to: docCur },
        })
        .then((resp) => {
          if (cancelled) return;
          const r = Number(resp?.data?.data?.rate);
          setSourceRates((m) => ({
            ...m,
            [src]:
              r > 0
                ? { rate: String(r), available: true }
                : { rate: "1", available: false },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setSourceRates((m) => ({
            ...m,
            [src]: { rate: "1", available: false },
          }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, docCur]);

  const setSourceRate = (src, value) =>
    setSourceRates((m) => ({
      ...m,
      [src]: { rate: value, available: Number(value) > 0 },
    }));

  // Push each line's frozen cost_exchange_rate = its source→doc rate (1 same).
  useEffect(() => {
    liveLines.forEach((l, idx) => {
      if (!l?.vendor_id) return; // vendorless row has no cost to convert
      const sc = (l?.source_currency_code || "INR").toUpperCase();
      const want = sc === docCur ? "1" : sourceRates[sc]?.rate || "1";
      if (String(l?.cost_exchange_rate ?? "") !== String(want)) {
        setValue(`lines.${idx}.cost_exchange_rate`, want, {
          shouldDirty: false,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLines, sourceRates, docCur]);

  const fetchVendors = (idx, productId, autoSelect = false) => {
    if (!productId) return;
    setLoadingByProduct((m) => ({ ...m, [productId]: true }));
    instance
      .get(`${API_ENDPOINTS.priceList.byProduct}/${productId}`)
      .then((resp) => {
        const rows = (resp?.data?.data || [])
          .slice()
          .sort((a, b) => num(a.unit_price) - num(b.unit_price))
          .map((r) => ({
            value: r.vendor_id,
            label: r.vendor_code
              ? `${r.vendor_name} [${r.vendor_code}] — ${currencySymbol(r.currency_code) || "₹"}${fmt(r.unit_price)}`
              : `${r.vendor_name} — ${currencySymbol(r.currency_code) || "₹"}${fmt(r.unit_price)}`,
            raw: r,
          }));
        setVendorsByProduct((m) => ({ ...m, [productId]: rows }));
        // On a fresh product pick, auto-select the cheapest vendor IN THE
        // chosen vendor currency (rows are sorted cheapest-first). With no
        // currency picked yet, or no matching vendor, leave it empty.
        if (autoSelect && rows.length && vendorCurrency) {
          const match = rows.find(
            (o) =>
              (o.raw?.currency_code || "INR").toUpperCase() === vendorCurrency
          );
          if (match) onPickVendor(idx, match);
        }
      })
      .catch(() => setVendorsByProduct((m) => ({ ...m, [productId]: [] })))
      .finally(() =>
        setLoadingByProduct((m) => ({ ...m, [productId]: false }))
      );
  };

  // Load vendor lists for every line's product in a SINGLE batch request.
  // (Previously this fired one by-product call per line — a 30-row import meant
  // 30 concurrent requests, some of which could fail under load and leave a
  // vendor dropdown permanently empty.) Keyed off the set of product_ids so it
  // re-runs on bulk import / edit-hydrate when product_ids populate.
  const productIdsKey = liveLines
    .map((l) => l?.product_id || "")
    .join("|");

  // Product master data for the lines' product_ids, resolved via ?ids= so the
  // weight/HSN/part-no backfill below keeps working now that the product picker
  // is a searchable dropdown (the parent no longer ships the whole catalog).
  // Merged with any `productOptions` prop still passed in.
  const [fetchedProductsById, setFetchedProductsById] = useState({});
  useEffect(() => {
    const known = new Set(productOptions.map((o) => String(o.value)));
    const missing = Array.from(
      new Set(
        liveLines
          .map((l) => l?.product_id)
          .filter(
            (pid) =>
              pid && !known.has(String(pid)) && !fetchedProductsById[pid]
          )
      )
    );
    if (!missing.length) return;
    resolveEntityByIds(ENTITY_KINDS.product, missing).then((opts) => {
      if (!opts.length) return;
      setFetchedProductsById((m) => {
        const next = { ...m };
        opts.forEach((o) => {
          next[o.value] = o.raw || {};
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, productOptions.length]);

  useEffect(() => {
    const missing = Array.from(
      new Set(
        liveLines
          .map((l) => l?.product_id)
          .filter(
            (pid) =>
              pid &&
              vendorsByProduct[pid] === undefined &&
              !loadingByProduct[pid]
          )
      )
    );
    if (!missing.length) return;
    setLoadingByProduct((m) => {
      const next = { ...m };
      missing.forEach((pid) => (next[pid] = true));
      return next;
    });
    instance
      .get(API_ENDPOINTS.priceList.byProducts, {
        params: { product_ids: missing.join(",") },
      })
      .then((resp) => {
        const map = resp?.data?.data || {};
        setVendorsByProduct((m) => {
          const next = { ...m };
          missing.forEach((pid) => {
            next[pid] = (map[pid] || [])
              .slice()
              .sort((a, b) => num(a.unit_price) - num(b.unit_price))
              .map((r) => ({
                value: r.vendor_id,
                label: r.vendor_code
                  ? `${r.vendor_name} [${r.vendor_code}] — ${currencySymbol(r.currency_code) || "₹"}${fmt(r.unit_price)}`
                  : `${r.vendor_name} — ${currencySymbol(r.currency_code) || "₹"}${fmt(r.unit_price)}`,
                raw: r,
              }));
          });
          return next;
        });
      })
      .catch(() => {
        // Leave the failed products as `undefined` (don't cache []), so the
        // next product change retries them instead of showing "No options".
        setVendorsByProduct((m) => {
          const next = { ...m };
          missing.forEach((pid) => {
            if (Array.isArray(next[pid]) === false) delete next[pid];
          });
          return next;
        });
      })
      .finally(() => {
        setLoadingByProduct((m) => {
          const next = { ...m };
          missing.forEach((pid) => (next[pid] = false));
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey]);

  // Auto-select the cheapest matching-currency vendor for any line that has a
  // product + a price-listed vendor but NO vendor yet. Fresh product picks and
  // vendor-currency changes already auto-select; this covers lines that arrived
  // PRE-LOADED (seeded from a lead/RFQ, bulk-imported, or edit-hydrated) and so
  // never went through the pick flow. Only fills EMPTY vendors — never overrides
  // an existing pick — and only when a vendor currency is chosen. Keyed off the
  // loaded vendor lists + currency so it doesn't loop after it sets a vendor.
  useEffect(() => {
    if (readOnly || !vendorCurrency) return;
    (liveLines || []).forEach((l, idx) => {
      if (!l?.product_id || l?.vendor_id) return; // only empty-vendor lines
      const opts = vendorsByProduct[l.product_id];
      if (!Array.isArray(opts) || !opts.length) return; // not loaded / none
      const match = opts.find(
        (o) => (o.raw?.currency_code || "INR").toUpperCase() === vendorCurrency
      );
      if (match) onPickVendor(idx, match);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorsByProduct, vendorCurrency, productIdsKey, readOnly]);

  // Backfill per-unit master weights onto lines that already carry a product
  // (seeded from an RFQ/lead, bulk-imported, or hydrated for edit) but never
  // captured them through the picker — then auto-fill each empty weight /
  // package cell from qty. Runs once per line (guarded by `_wt_seeded`) and
  // never overwrites an existing value or a manual override, so saved figures
  // and edits are preserved.
  useEffect(() => {
    if (readOnly) return;
    const byId = new Map(
      productOptions.map((o) => [String(o.value), o.raw || {}])
    );
    // Merge in the ?ids=-resolved products (searchable-dropdown path).
    Object.entries(fetchedProductsById).forEach(([id, raw]) => {
      if (!byId.has(String(id))) byId.set(String(id), raw);
    });
    if (!byId.size) return;
    liveLines.forEach((l, idx) => {
      if (!l || !l.product_id || l._wt_seeded) return;
      const raw = byId.get(String(l.product_id));
      if (!raw) return; // options not loaded yet — retry when they are
      // Backfill product_code / product_name onto lines hydrated with only a
      // product_id (edit / RFQ-seed / import). Without these the dropdown label
      // falls back to the raw UUID. Fill only when blank so a value is never lost.
      if (!l.product_code && (raw.code || raw.product_code)) {
        setValue(`lines.${idx}.product_code`, raw.code || raw.product_code);
      }
      if (!l.product_name && (raw.name || raw.product_name)) {
        setValue(`lines.${idx}.product_name`, raw.name || raw.product_name);
      }
      const nwpu =
        raw.net_weight_per_unit != null ? String(raw.net_weight_per_unit) : "0";
      const gwpu =
        raw.gross_weight_per_unit != null
          ? String(raw.gross_weight_per_unit)
          : "0";
      const packSize = raw.pack_size != null ? Number(raw.pack_size) : 0;
      setValue(`lines.${idx}.net_weight_per_unit`, nwpu);
      setValue(`lines.${idx}.gross_weight_per_unit`, gwpu);
      setValue(`lines.${idx}.pack_size`, packSize);
      setValue(`lines.${idx}._wt_seeded`, true);

      // Backfill HSN / Part No from the master for seeded lines that never
      // went through the product picker — only when the line's own value is
      // blank, so a user override is never clobbered.
      if (!l.hsn_code && !l.hs_code && raw.hsn_code) {
        // Both keys — see the HSN cell below for why.
        setValue(`lines.${idx}.hsn_code`, String(raw.hsn_code));
        setValue(`lines.${idx}.hs_code`, String(raw.hsn_code));
      }
      if (!l.part_no && raw.part_no) {
        setValue(`lines.${idx}.part_no`, String(raw.part_no));
      }
      if (l._wt_manual) return;
      const qty = num(l.qty);
      if (num(nwpu) > 0 && !num(l.net_weight_kg)) {
        setValue(`lines.${idx}.net_weight_kg`, String(round3(qty * num(nwpu))));
      }
      if (num(gwpu) > 0 && !num(l.gross_weight_kg)) {
        setValue(
          `lines.${idx}.gross_weight_kg`,
          String(round3(qty * num(gwpu)))
        );
      }
      if (packSize > 0 && !num(l.package_count)) {
        setValue(
          `lines.${idx}.package_count`,
          qty > 0 ? Math.ceil(qty / packSize) : 0
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, productOptions.length, fetchedProductsById, readOnly]);

  // Label for the product picker's current value. Prefers the line's own
  // code/name; when a line was hydrated with just a product_id (edit / RFQ-seed
  // / import) it falls back to the ?ids=-resolved master so the box never shows
  // the raw UUID while the backfill effect catches up (or in read-only mode).
  const productLabelFor = (l) => {
    let code = l.product_code;
    let name = l.product_name;
    if (!code && !name) {
      const raw =
        fetchedProductsById[l.product_id] ||
        (productOptions.find((o) => String(o.value) === String(l.product_id))
          ?.raw ||
          {});
      code = raw.code || raw.product_code || "";
      name = raw.name || raw.product_name || "";
    }
    if (code) return `${code} - ${name || ""}`;
    return name || t("Loading…");
  };

  const addRow = () => {
    // Jump to the page that will hold the appended row (its index = current
    // length, before the append takes effect).
    setWsPage(Math.floor(lineFA.fields.length / wsPageSize));
    lineFA.append({ ...emptyLine() });
  };

  // Auto-fill the weight/package cells from the line's per-unit master values:
  //   net/gross weight = qty × per-unit,  packages = ceil(qty ÷ pack_size).
  // Skips any dimension the product doesn't define (per-unit / pack_size = 0)
  // so an existing (hydrated) value is never wiped, and yields to a manual
  // override on the line (`_wt_manual`).
  const recomputeWeights = (idx, qtyRaw) => {
    const line =
      (typeof getValues === "function" && getValues(`lines.${idx}`)) ||
      liveLines[idx] ||
      {};
    if (line._wt_manual) return;
    const qty = num(qtyRaw != null ? qtyRaw : line.qty);
    const nwpu = num(line.net_weight_per_unit);
    const gwpu = num(line.gross_weight_per_unit);
    const packSize = num(line.pack_size);
    if (nwpu > 0) {
      setValue(`lines.${idx}.net_weight_kg`, String(round3(qty * nwpu)));
    }
    if (gwpu > 0) {
      setValue(`lines.${idx}.gross_weight_kg`, String(round3(qty * gwpu)));
    }
    if (packSize > 0) {
      setValue(
        `lines.${idx}.package_count`,
        qty > 0 ? Math.ceil(qty / packSize) : 0
      );
    }
  };

  const onPickProduct = (idx, opt) => {
    const raw = opt?.raw || {};
    setValue(`lines.${idx}.product_id`, opt ? opt.value : "");
    setValue(`lines.${idx}.product_code`, raw.code || "");
    setValue(`lines.${idx}.product_name`, raw.name || raw.product_name || "");
    setValue(`lines.${idx}.part_no`, raw.part_no || "");
    setValue(`lines.${idx}.hsn_code`, raw.hsn_code || "");
    setValue(`lines.${idx}.hs_code`, raw.hsn_code || "");
    setValue(
      `lines.${idx}.tax_pct`,
      raw.tax_pct != null ? String(raw.tax_pct) : "0"
    );
    // Pre-fill the line's margin from the product master (overridable per line).
    setValue(
      `lines.${idx}.margin_pct`,
      raw.margin_pct != null ? String(raw.margin_pct) : "0"
    );
    if (raw.unit_of_measure) setValue(`lines.${idx}.unit`, raw.unit_of_measure);
    // Seed per-unit master values then auto-fill weights/packages from the
    // current qty. Picking a (new) product clears any prior manual override.
    setValue(
      `lines.${idx}.net_weight_per_unit`,
      raw.net_weight_per_unit != null ? String(raw.net_weight_per_unit) : "0"
    );
    setValue(
      `lines.${idx}.gross_weight_per_unit`,
      raw.gross_weight_per_unit != null
        ? String(raw.gross_weight_per_unit)
        : "0"
    );
    setValue(
      `lines.${idx}.pack_size`,
      raw.pack_size != null ? Number(raw.pack_size) : 0
    );
    setValue(`lines.${idx}._wt_manual`, false);
    setValue(`lines.${idx}._wt_seeded`, true);
    recomputeWeights(idx);
    // Pre-fill the product's default expense & rebate heads (with their master
    // values) onto the line — still editable/removable per quotation via the
    // popover. Snapshot shape matches the master exactly (expense_id/value,
    // rebate_id/pct).
    setValue(
      `lines.${idx}.product_expenses_snapshot`,
      (raw.product_expenses || []).map((e) => ({
        expense_id: e.expense_id,
        code: e.code || "",
        name: e.name || "",
        type: e.type || "fixed",
        value: String(e.value ?? "0"),
      }))
    );
    setValue(
      `lines.${idx}.product_rebates_snapshot`,
      (raw.product_rebates || []).map((r) => ({
        rebate_id: r.rebate_id,
        code: r.code || "",
        name: r.name || "",
        type: r.type || "percent",
        pct: String(r.pct ?? "0"),
      }))
    );
    setValue(`lines.${idx}.vendor_id`, "");
    setValue(`lines.${idx}.vendor_name`, "");
    setValue(`lines.${idx}.unit_price`, "");
    if (opt) fetchVendors(idx, opt.value, true);
  };

  const onPickVendor = (idx, opt) => {
    const r = opt?.raw || {};
    const newVendorId = opt ? opt.value : "";
    // Read the LIVE form state (not the watched `liveLines`, which can be a
    // stale closure on the async auto-pick path) so the guard sees the row's
    // just-set product_id and every other row's current vendor.
    const allLines =
      (typeof getValues === "function" && getValues("lines")) || liveLines || [];
    const productId = allLines[idx]?.product_id || "";
    // Block the same product + same vendor on two lines. A product may still be
    // added with a different vendor (multi-vendor model) — only an exact
    // product+vendor duplicate is rejected.
    if (newVendorId && productId) {
      const dup = allLines.some(
        (l, i) =>
          i !== idx &&
          String(l?.product_id || "") === String(productId) &&
          String(l?.vendor_id || "") === String(newVendorId)
      );
      if (dup) {
        // Clear any vendor on this row so it can't silently keep a duplicate.
        setValue(`lines.${idx}.vendor_id`, "");
        setValue(`lines.${idx}.vendor_name`, "");
        setValue(`lines.${idx}.vendor_code`, "");
        Notification(
          "Validation",
          t(
            "This product is already added with the same vendor. Pick a different vendor or edit the existing row."
          ),
          "warning"
        );
        return;
      }
    }

    // ── One-currency-per-document rule ──────────────────────────────────
    // Every vendor on a quotation/SO/invoice must share ONE currency. If any
    // other line already has a vendor, this new vendor must match its currency.
    // Source currency = the VENDOR's currency (authoritative), not the price
    // row's (which can be stale).
    const newVendorCur = vendorCurOf(newVendorId, r.currency_code);
    const existingCur = allLines
      .map((l, i) =>
        i !== idx && l?.vendor_id
          ? (l?.source_currency_code || "INR").toUpperCase()
          : null
      )
      .find(Boolean);
    if (existingCur && newVendorCur !== existingCur) {
      Notification(
        "Validation",
        t(
          "All vendors on one document must use the same currency ({{cur}}). This vendor is in {{other}} — pick a {{cur}} vendor."
        )
          .replace("{{cur}}", existingCur)
          .replace("{{other}}", newVendorCur),
        "warning"
      );
      return;
    }
    setValue(`lines.${idx}.vendor_id`, newVendorId);
    setValue(`lines.${idx}.vendor_name`, r.vendor_name || "");
    setValue(`lines.${idx}.vendor_code`, r.vendor_code || "");
    // Multi-currency: the line's cost is in the VENDOR's currency (source).
    setValue(
      `lines.${idx}.source_currency_code`,
      vendorCurOf(newVendorId, r.currency_code)
    );
    if (opt && r.unit_price != null) {
      setValue(`lines.${idx}.unit_price`, String(r.unit_price));
    } else if (opt) {
      // No-price vendor (Option B): clear any rate carried over from a previous
      // vendor so the user enters this vendor's cost — added to the price list
      // on save.
      setValue(`lines.${idx}.unit_price`, "");
    }
  };

  const setField = (idx, field, value) =>
    // Revalidate so a required-field error (e.g. Qty) clears the moment a
    // valid value is entered, instead of lingering until the next submit.
    setValue(`lines.${idx}.${field}`, value, {
      shouldValidate: true,
      shouldDirty: true,
    });

  const setSnapshot = (idx, kind, arr) => {
    const key =
      kind === "expense"
        ? `lines.${idx}.product_expenses_snapshot`
        : `lines.${idx}.product_rebates_snapshot`;
    setValue(key, arr);
  };

  const totals = liveLines.reduce(
    (acc, l) => {
      const c = computeLineCosting(l, { excludeGst: true });
      acc.qty += num(l?.qty);
      acc.value += c.taxable;
      acc.expense += c.expenses;
      acc.totalAfterExp += round2(c.taxable + c.expenses);
      acc.rebate += c.rebates;
      acc.margin += c.margin;
      acc.grand += c.lineTotal;
      acc.netWt += num(l?.net_weight_kg);
      acc.grossWt += num(l?.gross_weight_kg);
      acc.packages += num(l?.package_count);
      return acc;
    },
    {
      qty: 0,
      value: 0,
      expense: 0,
      totalAfterExp: 0,
      rebate: 0,
      margin: 0,
      grand: 0,
      netWt: 0,
      grossWt: 0,
      packages: 0,
    }
  );
  // Multi-currency: `totals` already come from computeLineCosting, which
  // converts each line's cost source→document currency. So every figure is
  // ALREADY in the document currency — NO header × rate here.
  const grandDoc = totals.grand;
  // Per-line freight (document currency). AUTO-SPLIT by qty is the default, but
  // any line the operator types into is an OVERRIDE (freight_manual = true) and
  // keeps its value; the REMAINING freight (freight_total − Σ overrides) then
  // splits across the untouched lines by qty. So Σ line freights == freight_total.
  // A line with a NON-EMPTY `freight` is a manual override; empty = auto-split.
  const isFreightManual = (l) =>
    l?.freight != null && String(l.freight).trim() !== "";
  const lineFreights = (() => {
    const manualSum = liveLines.reduce(
      (s, l) => s + (isFreightManual(l) ? num(l.freight) : 0),
      0
    );
    const remaining = Math.max(0, round2(freightTotal - manualSum));
    // Split the remainder across the NON-overridden lines by qty (a manual line
    // is forced to 0 qty so it gets nothing, keeping the indexes aligned).
    const autoShares = splitFreightByQty(
      liveLines.map((l) => (isFreightManual(l) ? { ...l, qty: 0 } : l)),
      remaining
    );
    return liveLines.map((l, i) =>
      isFreightManual(l) ? num(l.freight) : num(autoShares[i]) || 0
    );
  })();
  const freightSum = round2(lineFreights.reduce((s, v) => s + v, 0));
  const cnfTotal = round2(grandDoc + freightSum);
  const cnfRateTotal = totals.qty ? round2(cnfTotal / totals.qty) : 0;
  // Keep the persisted header freight_total equal to the actual per-line sum —
  // so an override that pushes past the entered total (Σ overrides > total)
  // still flows the correct freight to grand_total + the PDF. Guarded so it
  // only fires on a real divergence (no render loop; equal → no-op).
  useEffect(() => {
    if (readOnly) return;
    if (Math.abs(freightSum - freightTotal) > 0.005) {
      setValue("freight_total", String(freightSum), { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freightSum, freightTotal, readOnly]);
  // Everything is shown in the DOCUMENT currency now (₹ for an INR document).
  const docSym = currencySymbol(docCurrencyCode) || "₹";
  // Customer / document-currency amounts (Rate/Amt {docCur}, Freight, CNF).
  const moneyDoc = (v) => `${docSym}${fmt(v)}`;
  // The Rate column is the editable VENDOR price — native to the vendor's
  // (source) currency, which may differ from the document currency (e.g. a USD
  // vendor on a EUR quote). One-currency-per-document → a single source symbol.
  const srcCur = distinctSources.find(Boolean) || docCurrencyCode;
  const srcSym = currencySymbol(srcCur) || docSym;
  // Cost columns (Price/Disc → Grand Total) are DISPLAYED in the vendor
  // (source) currency: computeLineCosting works in the document currency, so we
  // divide back by the frozen source→doc rate (`cost_exchange_rate`). One
  // currency per document → a single rate; 1 when vendor == document currency.
  // Storage + the customer selling price (Rate/Amt {docCur} columns) stay in the
  // document currency — this is display-only.
  const srcRate =
    Number(
      (
        liveLines.find(
          (l) => l?.source_currency_code && num(l?.cost_exchange_rate) > 0,
        ) || {}
      ).cost_exchange_rate,
    ) || 1;
  const moneySrc = (v) => `${srcSym}${fmt(srcRate ? v / srcRate : v)}`;

  // Fixed column widths (px) so every value fits on one line.
  const W = {
    product: 210,
    vendor: 170,
    part: 92,
    // Wider than part_no now that it holds an input, not a label — an 8-digit
    // HSN plus the cell's own padding does not fit in 92.
    hsn: 112,
    qty: 78,
    uom: 60,
    rate: 92,
    disc: 64,
    pad: 96,
    value: 104,
    exp: 96,
    totexp: 110,
    reb: 96,
    margin: 70,
    marginAmt: 96,
    grand: 120,
    rateDoc: 92,
    amt: 110,
    freight: 96,
    cnfAmt: 116,
    cnfRate: 100,
    netwt: 92,
    grosswt: 92,
    pkg: 76,
    act: 40,
  };

  // ── Pagination (slice fields, keep absolute index) ──
  const wsTotal = lineFA.fields.length;
  const wsPageCount = Math.max(1, Math.ceil(wsTotal / wsPageSize));
  const wsSafePage = Math.min(wsPage, wsPageCount - 1);
  const wsStart = wsSafePage * wsPageSize;
  const pagedFields = lineFA.fields
    .map((row, idx) => ({ row, idx }))
    .slice(wsStart, wsStart + wsPageSize);
  useEffect(() => {
    if (wsPage > wsPageCount - 1) setWsPage(Math.max(0, wsPageCount - 1));
  }, [wsPageCount, wsPage]);

  return (
    <Fragment>
      {/* Exchange-rate boxes — one per distinct VENDOR (source) currency that
          differs from the document currency: converts each line's cost into the
          document currency (1 {source} = rate {doc}). Auto-filled from the
          currency master, editable. INR is just another currency. With the
          one-currency-per-document rule there is at most one box. */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-1">
        <div className="d-flex align-items-center gap-1 flex-wrap">
          {/* Vendor (buy) currency — one per document. Picked FIRST; the line
              vendor pickers only offer vendors in this currency. Distinct from
              the selling-currency rate box that follows. */}
          <div className="d-flex align-items-center gap-50 ws-rate-box">
            <span className="fw-bold">{t("Vendor Currency")}</span>
            <Select
              classNamePrefix="select"
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                container: (b) => ({ ...b, minWidth: 120 }),
              }}
              options={vendorCurrencyOptions}
              value={
                vendorCurrency
                  ? { value: vendorCurrency, label: vendorCurrency }
                  : null
              }
              isDisabled={readOnly}
              onChange={changeVendorCurrency}
              placeholder={t("Select…")}
            />
          </div>
          {(() => {
            // A source currency that EQUALS the document currency needs no rate
            // box (it's always 1) — only show boxes for currencies that convert.
            const converting = distinctSources.filter((s) => s !== docCur);
            if (!converting.length)
              return <Badge color="light-secondary">{docCur}</Badge>;
            return converting.map((src) => {
              const sr = sourceRates[src] || { rate: "", available: true };
              return (
                <div
                  key={src}
                  className="d-flex align-items-center gap-50 ws-rate-box"
                >
                  <span className="fw-bold">1 {src} =</span>
                  <Input
                    type="number"
                    step="0.000001"
                    min="0"
                    bsSize="sm"
                    className="text-end ws-rate-input"
                    disabled={readOnly}
                    value={sr.rate}
                    onChange={(e) => setSourceRate(src, e.target.value)}
                  />
                  <span className="fw-bold">{docCur}</span>
                  {sr.available === false ? (
                    <span className="text-warning small ms-25">
                      {t("exchange rate not available")}
                    </span>
                  ) : null}
                </div>
              );
            });
          })()}
          {/* Shipment freight (document currency) — split by qty across lines
              into the Freight / CNF Amount / CNF Rate columns. */}
          <div className="d-flex align-items-center gap-50 ws-rate-box">
            <span className="fw-bold">
              {t("Freight")} ({docSym})
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              bsSize="sm"
              className="text-end ws-rate-input"
              disabled={readOnly}
              value={freightTotalRaw == null ? "" : freightTotalRaw}
              onChange={(e) =>
                setValue("freight_total", e.target.value, {
                  shouldDirty: true,
                })
              }
            />
          </div>
        </div>
        {!readOnly && (
          <div className="d-flex align-items-center flex-wrap gap-1 listing-toolbar-actions">
            {/* Bulk entry via Excel — shared sales-doc import/export. docType
                drives the filename + backend layout (quotation vs po). Shares
                this worksheet's lineFA so imported rows appear without a
                remount. */}
            <LineItemImportExportBar
              docType={docType}
              control={control}
              lineFA={lineFA}
              initLineItem={emptyLine()}
              currencyCode={docCurrencyCode}
              exchangeRate={exchangeRate}
              // Shipment freight round-trip: exported (and re-imported) with
              // the lines so the sheet's Freight / CNF columns match this
              // worksheet. The per-line split is always re-derived by qty,
              // so only the column's SUM is honoured on import.
              freightTotal={freightTotal}
              onFreightImported={(v) =>
                setValue("freight_total", String(v), { shouldDirty: true })
              }
            />
            <Button color="outline-primary" size="sm" onClick={addRow}>
              <Plus size={14} className="me-25" /> {t("Add Product")}
            </Button>
          </div>
        )}
      </div>

      <div className="ws-scroll border rounded">
        <Table size="sm" className="mb-0 worksheet-table">
          <colgroup>
            <col style={{ width: W.product }} />
            <col style={{ width: W.vendor }} />
            <col style={{ width: W.part }} />
            <col style={{ width: W.hsn }} />
            <col style={{ width: W.qty }} />
            <col style={{ width: W.uom }} />
            <col style={{ width: W.rate }} />
            <col style={{ width: W.disc }} />
            <col style={{ width: W.pad }} />
            <col style={{ width: W.value }} />
            <col style={{ width: W.exp }} />
            <col style={{ width: W.totexp }} />
            <col style={{ width: W.reb }} />
            <col style={{ width: W.margin }} />
            <col style={{ width: W.marginAmt }} />
            <col style={{ width: W.grand }} />
            {isForeign && <col style={{ width: W.rateDoc }} />}
            <col style={{ width: W.amt }} />
            <col style={{ width: W.freight }} />
            <col style={{ width: W.cnfAmt }} />
            <col style={{ width: W.cnfRate }} />
            <col style={{ width: W.netwt }} />
            <col style={{ width: W.grosswt }} />
            <col style={{ width: W.pkg }} />
            {!readOnly && <col style={{ width: W.act }} />}
          </colgroup>
          <thead className="table-light">
            <tr className="text-nowrap ws-head">
              <th className="ws-sticky-col">{t("Product")}</th>
              <th>{t("Vendor")}</th>
              <th>{t("Part No")}</th>
              <th>{t("HSN")}</th>
              <th className="text-end">{t("Qty")}</th>
              <th className="text-center">{t("UOM")}</th>
              <th className="text-end">
                {t("Rate")} {srcSym}
              </th>
              <th className="text-end">{t("Disc%")}</th>
              <th className="text-end">
                {t("Price/Disc")} {srcSym}
              </th>
              <th className="text-end">{t("Value")}</th>
              <th className="text-end">{t("Expense")}</th>
              <th className="text-end">{t("Total+Exp")}</th>
              <th className="text-end">{t("Rebate")}</th>
              <th className="text-end">{t("Margin%")}</th>
              <th className="text-end">
                {t("Margin")} {srcSym}
              </th>
              <th className="text-end">
                {t("Grand Total")} {srcSym}
              </th>
              {isForeign && (
                <th className="text-end">
                  {t("Rate")} {docCur}
                </th>
              )}
              <th className="text-end">
                {t("Amt")} {docCur}
              </th>
              <th className="text-end">{t("Freight")}</th>
              <th className="text-end">{t("CNF Amount")}</th>
              <th className="text-end">{t("CNF Rate")}</th>
              <th className="text-end">{t("Net Wt")}</th>
              <th className="text-end">{t("Gross Wt")}</th>
              <th className="text-end">{t("Pkgs")}</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {lineFA.fields.length === 0 ? (
              <tr>
                <td colSpan={21} className="text-center text-muted py-3">
                  {t('No products yet — click "Add Product".')}
                </td>
              </tr>
            ) : (
              pagedFields.map(({ row, idx }) => {
                const l = liveLines[idx] || {};
                const c = computeLineCosting(l, { excludeGst: true });
                // Price/Disc in the DOCUMENT currency = converted cost − disc,
                // consistent with Value/Expense/… below (all doc currency).
                const costDoc =
                  num(l.unit_price) * (num(l.cost_exchange_rate) || 1);
                const priceAfterDisc = round2(
                  costDoc * (1 - num(l.discount_pct) / 100)
                );
                const totalAfterExp = round2(c.taxable + c.expenses);
                // computeLineCosting already converted the cost source→document
                // currency, so the line total is ALREADY in the doc currency —
                // no × rate here.
                const grandInr = c.lineTotal;
                const amtDoc = grandInr;
                const rateDoc = num(l.qty) ? amtDoc / num(l.qty) : 0;
                // CNF = FOB (amtDoc) + this line's qty-share of freight.
                const lineFreight = lineFreights[idx] || 0;
                const cnfAmt = round2(amtDoc + lineFreight);
                const cnfRate = num(l.qty) ? round2(cnfAmt / num(l.qty)) : 0;
                // Stable per-row ids so the popover target stays in the DOM.
                const expId = `ws-exp-${row.id}`;
                const rebId = `ws-reb-${row.id}`;
                return (
                  <tr key={row.id} className="text-nowrap">
                    <td className="ws-sticky-col">
                      <EntitySearchSelect
                        kind="product"
                        eager={false}
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                        value={
                          l.product_id
                            ? {
                                value: l.product_id,
                                label: productLabelFor(l),
                              }
                            : null
                        }
                        isClearable={false}
                        isDisabled={readOnly}
                        onChange={(opt) => onPickProduct(idx, opt)}
                        placeholder={t("Search product")}
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                        options={vendorOptsFor(l)}
                        isLoading={!!loadingByProduct[l.product_id]}
                        value={
                          vendorOptsFor(l).find(
                            (o) => o.value === l.vendor_id
                          ) ||
                          (l.vendor_id
                            ? { value: l.vendor_id, label: l.vendor_name || "—" }
                            : null)
                        }
                        isDisabled={readOnly || !l.product_id || !vendorCurrency}
                        onChange={(opt) => onPickVendor(idx, opt)}
                        placeholder={
                          !vendorCurrency
                            ? t("Select vendor currency first")
                            : t("Pick vendor")
                        }
                      />
                    </td>
                    <td className="small text-muted text-truncate">
                      {l.part_no || "-"}
                    </td>
                    {/* HSN is editable in draft and overrides the product
                        master for THIS document only — the master is never
                        written back, because a line can legitimately ship under
                        a different classification on one contract. */}
                    <td className="p-0">
                      <EditableCell
                        value={l.hsn_code || l.hs_code || ""}
                        type="text"
                        align="start"
                        readOnly={readOnly}
                        placeholder="-"
                        onCommit={(v) => {
                          // Both keys, deliberately: the Sales Order line field
                          // is `hsn_code` and the Quotation's is `hs_code`, and
                          // the Quotation submit reads `hs_code || hsn_code` —
                          // so writing only one would let a stale hydrated
                          // `hs_code` win over the value just typed.
                          const next = String(v ?? "").trim();
                          setField(idx, "hsn_code", next);
                          setField(idx, "hs_code", next);
                        }}
                      />
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.qty}
                        display={l.qty ? fmt(num(l.qty)) : null}
                        readOnly={readOnly}
                        invalid={!!errors?.lines?.[idx]?.qty}
                        onCommit={(v) => {
                          setField(idx, "qty", v);
                          // Re-derive weights/packages from the new qty
                          // (unless the user manually overrode them).
                          recomputeWeights(idx, v);
                        }}
                      />
                    </td>
                    <td className="text-center text-muted">
                      {l.unit || "-"}
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.unit_price}
                        display={l.unit_price ? fmt(num(l.unit_price)) : null}
                        readOnly={readOnly}
                        onCommit={(v) => setField(idx, "unit_price", v)}
                      />
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.discount_pct}
                        display={l.discount_pct ? num(l.discount_pct) : null}
                        suffix="%"
                        readOnly={readOnly}
                        onCommit={(v) => setField(idx, "discount_pct", v)}
                      />
                    </td>
                    <td className="text-end ws-calc">
                      {moneySrc(priceAfterDisc)}
                    </td>
                    <td className="text-end ws-calc fw-semibold">
                      {moneySrc(c.taxable)}
                    </td>
                    <td className="text-end p-0">
                      <span
                        id={expId}
                        role="button"
                        className="ws-cell text-end d-inline-flex align-items-center justify-content-end gap-25 w-100"
                        onClick={() =>
                          setOpenPop((p) =>
                            p?.idx === idx && p?.kind === "expense"
                              ? null
                              : { idx, kind: "expense" }
                          )
                        }
                      >
                        {moneySrc(c.expenses)}
                      </span>
                      <CostHeadsPopover
                        id={expId}
                        open={openPop?.idx === idx && openPop?.kind === "expense"}
                        toggle={() =>
                          setOpenPop((p) =>
                            p?.idx === idx && p?.kind === "expense"
                              ? null
                              : { idx, kind: "expense" }
                          )
                        }
                        title={t("Expenses")}
                        masters={expenseMasters}
                        snapshot={l.product_expenses_snapshot || []}
                        idKey="expense_id"
                        amountKey="value"
                        onChange={(arr) => setSnapshot(idx, "expense", arr)}
                        readOnly={readOnly}
                        t={t}
                      />
                    </td>
                    <td className="text-end ws-calc">
                      {moneySrc(totalAfterExp)}
                    </td>
                    <td className="text-end p-0">
                      <span
                        id={rebId}
                        role="button"
                        className="ws-cell text-end d-inline-flex align-items-center justify-content-end gap-25 w-100"
                        onClick={() =>
                          setOpenPop((p) =>
                            p?.idx === idx && p?.kind === "rebate"
                              ? null
                              : { idx, kind: "rebate" }
                          )
                        }
                      >
                        {moneySrc(c.rebates)}
                      </span>
                      <CostHeadsPopover
                        id={rebId}
                        open={openPop?.idx === idx && openPop?.kind === "rebate"}
                        toggle={() =>
                          setOpenPop((p) =>
                            p?.idx === idx && p?.kind === "rebate"
                              ? null
                              : { idx, kind: "rebate" }
                          )
                        }
                        title={t("Rebates")}
                        masters={rebateMasters}
                        snapshot={l.product_rebates_snapshot || []}
                        idKey="rebate_id"
                        amountKey="pct"
                        onChange={(arr) => setSnapshot(idx, "rebate", arr)}
                        readOnly={readOnly}
                        t={t}
                      />
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.margin_pct}
                        display={l.margin_pct ? num(l.margin_pct) : null}
                        suffix="%"
                        readOnly={readOnly}
                        onCommit={(v) => setField(idx, "margin_pct", v)}
                      />
                    </td>
                    <td className="text-end ws-calc">{moneySrc(c.margin)}</td>
                    <td className="text-end ws-calc fw-bold">
                      {moneySrc(grandInr)}
                    </td>
                    {isForeign && (
                      <td className="text-end ws-calc">{moneyDoc(rateDoc)}</td>
                    )}
                    <td className="text-end ws-calc fw-bold">
                      {moneyDoc(amtDoc)}
                    </td>
                    <td className="p-0">
                      {/* Editable per-line freight. Auto-split by qty is the
                          default; typing here overrides just this line and the
                          rest re-splits. Clear it to revert to auto. */}
                      <EditableCell
                        value={lineFreight}
                        display={moneyDoc(lineFreight)}
                        readOnly={readOnly}
                        onCommit={(v) => {
                          const s = String(v ?? "").trim();
                          // Empty → clear the override (back to qty auto-split).
                          if (s === "") {
                            setField(idx, "freight", "");
                            return;
                          }
                          // Committing the SAME auto value shouldn't lock an
                          // auto line as manual — only a real change overrides.
                          if (
                            !isFreightManual(l) &&
                            Math.abs(num(s) - num(lineFreight)) < 0.005
                          ) {
                            return;
                          }
                          setField(idx, "freight", s);
                        }}
                      />
                    </td>
                    <td className="text-end ws-calc fw-bold">
                      {moneyDoc(cnfAmt)}
                    </td>
                    <td className="text-end ws-calc">{moneyDoc(cnfRate)}</td>
                    <td className="p-0">
                      <EditableCell
                        value={l.net_weight_kg}
                        display={
                          num(l.net_weight_kg)
                            ? fmt(num(l.net_weight_kg))
                            : null
                        }
                        readOnly={readOnly}
                        onCommit={(v) => {
                          setField(idx, "net_weight_kg", v);
                          setValue(`lines.${idx}._wt_manual`, true);
                        }}
                      />
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.gross_weight_kg}
                        display={
                          num(l.gross_weight_kg)
                            ? fmt(num(l.gross_weight_kg))
                            : null
                        }
                        readOnly={readOnly}
                        onCommit={(v) => {
                          setField(idx, "gross_weight_kg", v);
                          setValue(`lines.${idx}._wt_manual`, true);
                        }}
                      />
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={l.package_count}
                        display={
                          num(l.package_count) ? num(l.package_count) : null
                        }
                        readOnly={readOnly}
                        onCommit={(v) => {
                          setField(idx, "package_count", v);
                          setValue(`lines.${idx}._wt_manual`, true);
                        }}
                      />
                    </td>
                    {!readOnly && (
                      <td className="text-center">
                        <Trash2
                          size={15}
                          className="cursor-pointer text-danger"
                          onClick={() => lineFA.remove(idx)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {lineFA.fields.length > 0 && (
            <tfoot className="ws-foot">
              <tr className="text-nowrap">
                <td className="ws-sticky-col">{t("Totals")}</td>
                <td />
                <td />
                <td />
                <td className="text-end">{fmt(totals.qty)}</td>
                <td />
                <td />
                <td />
                <td />
                <td className="text-end">{moneySrc(totals.value)}</td>
                <td className="text-end">{moneySrc(totals.expense)}</td>
                <td className="text-end">{moneySrc(totals.totalAfterExp)}</td>
                <td className="text-end">{moneySrc(totals.rebate)}</td>
                <td />
                <td className="text-end">{moneySrc(totals.margin)}</td>
                <td className="text-end ws-foot-grand">
                  {moneySrc(totals.grand)}
                </td>
                {isForeign && <td />}
                <td className="text-end ws-foot-grand">
                  {moneyDoc(grandDoc)}
                </td>
                <td className="text-end">{moneyDoc(freightSum)}</td>
                <td className="text-end ws-foot-grand">{moneyDoc(cnfTotal)}</td>
                <td className="text-end">{moneyDoc(cnfRateTotal)}</td>
                <td className="text-end">{fmt(totals.netWt)}</td>
                <td className="text-end">{fmt(totals.grossWt)}</td>
                <td className="text-end">{fmt(totals.packages)}</td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </Table>
      </div>

      {wsTotal > wsPageSize && (
        <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
          <div className="d-flex align-items-center small text-muted">
            <span className="me-50">{t("Show")}</span>
            <Input
              type="select"
              bsSize="sm"
              value={wsPageSize}
              onChange={(e) => {
                setWsPageSize(Number(e.target.value) || 10);
                setWsPage(0);
              }}
              style={{ width: 80 }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Input>
            <span className="ms-50">
              {t("of")} {wsTotal} {t("rows")}
            </span>
          </div>
          <ReactPaginate
            previousLabel=""
            nextLabel=""
            pageCount={wsPageCount}
            activeClassName="active"
            forcePage={wsSafePage}
            onPageChange={({ selected }) => setWsPage(selected)}
            pageClassName="page-item"
            nextLinkClassName="page-link"
            nextClassName="page-item next"
            previousClassName="page-item prev"
            previousLinkClassName="page-link"
            pageLinkClassName="page-link"
            containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
          />
        </div>
      )}
    </Fragment>
  );
};

function emptyLine() {
  return {
    product_id: "",
    vendor_id: "",
    description: "",
    customer_reference: "",
    qty: "",
    unit: "",
    unit_price: "",
    discount_pct: "0",
    tax_pct: "0",
    margin_pct: "0",
    product_rebates_snapshot: [],
    product_expenses_snapshot: [],
    hsn_code: "",
    hs_code: "",
    part_no: "",
    net_weight_kg: "0",
    gross_weight_kg: "0",
    package_count: 0,
    // Per-unit master values (helper fields only — dropped by the submit
    // mapping). Drive qty × per-unit auto-fill of the weight/package cells.
    net_weight_per_unit: "0",
    gross_weight_per_unit: "0",
    pack_size: 0,
    _wt_manual: false,
    _wt_seeded: false,
  };
}

// Cost-heads popover — lists ALL active master heads (expenses or rebates).
// Tick a head to include it in this line's calculation; columns are
// [✓] · Code/Name · Type · Amount input. Ticked heads form the line snapshot.
const CostHeadsPopover = ({
  id,
  open,
  toggle,
  title,
  masters,
  snapshot,
  idKey,
  amountKey,
  onChange,
  readOnly,
  t,
}) => {
  const byId = new Map((snapshot || []).map((s) => [String(s[idKey]), s]));

  const toggleHead = (m, checked) => {
    const next = (snapshot || []).filter((s) => String(s[idKey]) !== String(m.id));
    if (checked) {
      // Pre-fill the head's default value from its module; the user can
      // override it for this quotation.
      next.push({
        [idKey]: m.id,
        code: m.code,
        name: m.name,
        type: m.type,
        [amountKey]: String(m.defaultAmount ?? "0"),
      });
    }
    onChange(next);
  };
  const setAmount = (m, val) => {
    const exists = byId.has(String(m.id));
    const next = exists
      ? (snapshot || []).map((s) =>
          String(s[idKey]) === String(m.id) ? { ...s, [amountKey]: val } : s
        )
      : [
          ...(snapshot || []),
          {
            [idKey]: m.id,
            code: m.code,
            name: m.name,
            type: m.type,
            [amountKey]: val,
          },
        ];
    onChange(next);
  };

  return (
    <Popover
      target={id}
      isOpen={open}
      toggle={toggle}
      placement="left"
      className="ws-cost-pop"
    >
      <PopoverHeader className="d-flex align-items-center justify-content-between">
        <span>{title}</span>
        <X
          size={16}
          role="button"
          className="ws-pop-close"
          onClick={toggle}
        />
      </PopoverHeader>
      <PopoverBody className="p-0">
        {(!masters || masters.length === 0) && (
          <div className="text-muted small p-2">
            {t("No active heads. Add them in management.")}
          </div>
        )}
        {masters && masters.length > 0 && (
          <div className="ws-pop-list">
            {masters.map((m) => {
              const cur = byId.get(String(m.id));
              const checked = !!cur;
              const amount = checked ? cur[amountKey] : m.defaultAmount;
              const isPct = (m.type || "").toLowerCase() === "percent";
              return (
                <div
                  key={m.id}
                  className={`ws-pop-row${checked ? " is-on" : ""}`}
                >
                  <Input
                    type="checkbox"
                    className="ws-pop-chk"
                    checked={checked}
                    disabled={readOnly}
                    onChange={(e) => toggleHead(m, e.target.checked)}
                  />
                  {/* Clicking the code toggles inclusion; the value cell does
                      not (so editing the amount can't untick the head). */}
                  <span
                    className="ws-pop-code text-uppercase"
                    title={m.name}
                    role="button"
                    onClick={() => !readOnly && toggleHead(m, !checked)}
                  >
                    {m.code || m.name}
                  </span>
                  <div className="ws-pop-val">
                    {checked ? (
                      <EditableCell
                        value={amount}
                        display={
                          amount === "" || amount == null
                            ? null
                            : isPct
                              ? num(amount)
                              : fmt(num(amount))
                        }
                        suffix={isPct ? "%" : ""}
                        readOnly={readOnly}
                        placeholder="0.00"
                        onCommit={(v) => setAmount(m, v)}
                      />
                    ) : (
                      // Disabled default until the head is ticked.
                      <div className="ws-cell text-end text-muted">
                        0.00{isPct ? "%" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopoverBody>
    </Popover>
  );
};

export default CostingWorksheet;
