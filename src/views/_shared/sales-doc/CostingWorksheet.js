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

import { Fragment, useEffect, useRef, useState } from "react";
import { useFieldArray, useWatch, useFormState } from "react-hook-form";
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
import Notification from "@components/toast/notification";

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
        type="number"
        step="0.01"
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
  const lineFA = useFieldArray({ control, name: "lines" });
  const liveLines = useWatch({ control, name: "lines" }) || [];
  // Per-line validation errors — drives the red highlight on required fields
  // (e.g. Qty) so the user can fix them inline instead of just seeing a toast.
  const { errors } = useFormState({ control });
  // Stored exchange_rate = "foreign per 1 INR" (e.g. 0.01). The banner lets the
  // user enter the intuitive inverse "1 {foreign} = X INR" (e.g. 100) and we
  // store 1/X. Local input state, seeded from the stored value while unfocused.
  const rawRate = useWatch({ control, name: "exchange_rate" });
  const [rateInput, setRateInput] = useState("");
  const rateFocused = useRef(false);
  useEffect(() => {
    if (rateFocused.current) return;
    const r = num(rawRate);
    setRateInput(r > 0 ? String(round2(1 / r)) : "");
  }, [rawRate]);
  const onRateInput = (v) => {
    setRateInput(v);
    const inrPerForeign = Number(v);
    setValue(
      "exchange_rate",
      inrPerForeign > 0 ? String(1 / inrPerForeign) : "",
      { shouldDirty: true }
    );
  };

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
              ? `${r.vendor_name} [${r.vendor_code}] — ₹${fmt(r.unit_price)}`
              : `${r.vendor_name} — ₹${fmt(r.unit_price)}`,
            raw: r,
          }));
        setVendorsByProduct((m) => ({ ...m, [productId]: rows }));
        // On a fresh product pick, auto-select the cheapest vendor (rows are
        // sorted cheapest-first) + its price.
        if (autoSelect && rows.length) {
          onPickVendor(idx, rows[0]);
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
                  ? `${r.vendor_name} [${r.vendor_code}] — ₹${fmt(r.unit_price)}`
                  : `${r.vendor_name} — ₹${fmt(r.unit_price)}`,
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

  // Backfill per-unit master weights onto lines that already carry a product
  // (seeded from an RFQ/lead, bulk-imported, or hydrated for edit) but never
  // captured them through the picker — then auto-fill each empty weight /
  // package cell from qty. Runs once per line (guarded by `_wt_seeded`) and
  // never overwrites an existing value or a manual override, so saved figures
  // and edits are preserved.
  useEffect(() => {
    if (readOnly || !productOptions.length) return;
    const byId = new Map(
      productOptions.map((o) => [String(o.value), o.raw || {}])
    );
    liveLines.forEach((l, idx) => {
      if (!l || !l.product_id || l._wt_seeded) return;
      const raw = byId.get(String(l.product_id));
      if (!raw) return; // options not loaded yet — retry when they are
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
        setValue(`lines.${idx}.hsn_code`, String(raw.hsn_code));
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
  }, [productIdsKey, productOptions.length, readOnly]);

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
    setValue(`lines.${idx}.vendor_id`, newVendorId);
    setValue(`lines.${idx}.vendor_name`, r.vendor_name || "");
    setValue(`lines.${idx}.vendor_code`, r.vendor_code || "");
    if (opt && r.unit_price != null) {
      setValue(`lines.${idx}.unit_price`, String(r.unit_price));
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
  // exchange_rate is stored as "foreign units per 1 INR" (system convention),
  // so convert INR → quote currency by MULTIPLYING.
  const grandDoc = isForeign ? totals.grand * rate : totals.grand;
  // Per-line freight (document currency), qty-split; residual folded into the
  // last line so Σ == freightTotal. Keyed by absolute line index.
  const lineFreights = splitFreightByQty(liveLines, freightTotal);
  const cnfTotal = round2(grandDoc + freightTotal);
  const cnfRateTotal = totals.qty ? round2(cnfTotal / totals.qty) : 0;
  const money = (v) => `₹${fmt(v)}`;
  // Quote-currency symbol for the Rate/Amt columns (e.g. $ for USD).
  const docSym = isForeign ? currencySymbol(docCurrencyCode) : "₹";
  const moneyDoc = (v) => `${docSym}${fmt(v)}`;

  // Fixed column widths (px) so every value fits on one line.
  const W = {
    product: 210,
    vendor: 170,
    part: 92,
    hsn: 92,
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
      {/* Exchange-rate banner — editable rate (INR per 1 unit of the quote
          currency). Writes to the form's exchange_rate; all customer-currency
          columns recompute from it. */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mb-1">
        <div className="d-flex align-items-center gap-1 flex-wrap">
          {isForeign ? (
            <div className="d-flex align-items-center gap-50 ws-rate-box">
              <span className="fw-bold">1 {docCurrencyCode} =</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                bsSize="sm"
                className="text-end ws-rate-input"
                disabled={readOnly}
                value={rateInput}
                onFocus={() => (rateFocused.current = true)}
                onBlur={() => (rateFocused.current = false)}
                onChange={(e) => onRateInput(e.target.value)}
              />
              <span className="fw-bold">{baseCurrencyCode}</span>
            </div>
          ) : (
            <Badge color="light-secondary">{baseCurrencyCode}</Badge>
          )}
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
          <span className="small text-muted">
            {t("Click any value to edit; costs in")} {baseCurrencyCode}
            {isForeign
              ? `, ${t("customer amounts in")} ${docCurrencyCode}`
              : ""}
            .
          </span>
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
              <th className="text-end">{t("Rate")}</th>
              <th className="text-end">{t("Disc%")}</th>
              <th className="text-end">{t("Price/Disc")}</th>
              <th className="text-end">{t("Value")}</th>
              <th className="text-end">{t("Expense")}</th>
              <th className="text-end">{t("Total+Exp")}</th>
              <th className="text-end">{t("Rebate")}</th>
              <th className="text-end">{t("Margin%")}</th>
              <th className="text-end">{t("Margin")} ₹</th>
              <th className="text-end">{t("Grand Total")}</th>
              {isForeign && (
                <th className="text-end">
                  {t("Rate")} {docCurrencyCode}
                </th>
              )}
              <th className="text-end">
                {t("Amt")} {isForeign ? docCurrencyCode : "₹"}
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
                const priceAfterDisc = round2(
                  num(l.unit_price) * (1 - num(l.discount_pct) / 100)
                );
                const totalAfterExp = round2(c.taxable + c.expenses);
                const grandInr = c.lineTotal;
                const amtDoc = isForeign ? grandInr * rate : grandInr;
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
                      <Select
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                        options={productOptions}
                        value={
                          productOptions.find(
                            (o) => o.value === l.product_id
                          ) || null
                        }
                        isDisabled={readOnly}
                        onChange={(opt) => onPickProduct(idx, opt)}
                        placeholder={t("Select product")}
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                        options={vendorsByProduct[l.product_id] || []}
                        isLoading={!!loadingByProduct[l.product_id]}
                        value={
                          (vendorsByProduct[l.product_id] || []).find(
                            (o) => o.value === l.vendor_id
                          ) ||
                          (l.vendor_id
                            ? { value: l.vendor_id, label: l.vendor_name || "—" }
                            : null)
                        }
                        isDisabled={readOnly || !l.product_id}
                        onChange={(opt) => onPickVendor(idx, opt)}
                        placeholder={t("Pick vendor")}
                      />
                    </td>
                    <td className="small text-muted text-truncate">
                      {l.part_no || "-"}
                    </td>
                    <td className="small text-muted text-truncate">
                      {l.hsn_code || l.hs_code || "-"}
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
                    <td className="text-end ws-calc">{money(priceAfterDisc)}</td>
                    <td className="text-end ws-calc fw-semibold">
                      {money(c.taxable)}
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
                        {money(c.expenses)}
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
                    <td className="text-end ws-calc">{money(totalAfterExp)}</td>
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
                        {money(c.rebates)}
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
                    <td className="text-end ws-calc">{money(c.margin)}</td>
                    <td className="text-end ws-calc fw-bold">
                      {money(grandInr)}
                    </td>
                    {isForeign && (
                      <td className="text-end ws-calc">{moneyDoc(rateDoc)}</td>
                    )}
                    <td className="text-end ws-calc fw-bold">
                      {moneyDoc(amtDoc)}
                    </td>
                    <td className="text-end ws-calc">{moneyDoc(lineFreight)}</td>
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
                <td className="text-end">{money(totals.value)}</td>
                <td className="text-end">{money(totals.expense)}</td>
                <td className="text-end">{money(totals.totalAfterExp)}</td>
                <td className="text-end">{money(totals.rebate)}</td>
                <td />
                <td className="text-end">{money(totals.margin)}</td>
                <td className="text-end ws-foot-grand">{money(totals.grand)}</td>
                {isForeign && <td />}
                <td className="text-end ws-foot-grand">
                  {moneyDoc(grandDoc)}
                </td>
                <td className="text-end">{moneyDoc(freightTotal)}</td>
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
