// ── Generate POV Modal ─────────────────────────────────────────────
// Generates Vendor POs (POVs) from a Sales Order's pending lines. Opened
// from the SO detail header ("Generate POV"). Mirrors the old quotation →
// SO popup: assign a vendor per line (price-list candidates, cheapest
// pre-picked) and add optional per-vendor charges; one POV is created per
// unique vendor in a single call.
//
// Also doubles as the "recover" flow — when a POV is cancelled its lines go
// back to pending and reappear here.
//
// Currency note: vendor costs are stored in INR (₹) — that's what the
// per-line rate / per-vendor totals + charges show.

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Table,
  Spinner,
  Input,
  Badge,
  Row,
  Col,
  Label,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RotateCcw, X, Plus } from "react-feather";
import ReactPaginate from "react-paginate";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import { recoverPoVendors } from "@src/views/po-vendors/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { getExchangeRateOptions } from "@src/views/currencies/store";
import { getCurrencySymbol } from "@src/utility/currency";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import ExpenseGrid from "@src/views/_shared/po-vendor/ExpenseGrid";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

/**
 * Props:
 *   isOpen, toggle
 *   purchaseOrder: PO header (used for ID + voucher_no + delivery_address_id)
 *   onCreated: optional callback fired after successful create (passed
 *     `{ created: [pov, ...] }` so the parent can refresh coverage).
 */
const PoVendorRecoverModal = ({
  isOpen,
  toggle,
  purchaseOrder,
  onCreated,
  // Render as a full page (Card chrome) instead of a modal. The page passes
  // isOpen=true so the preview loads on mount.
  asPage = false,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewLines, setPreviewLines] = useState([]);
  const [activeVendors, setActiveVendors] = useState([]);
  // assignment[purchase_order_line_id] = vendor_id
  const [assignment, setAssignment] = useState({});
  // dropped[purchase_order_line_id] = true → exclude from batch
  const [dropped, setDropped] = useState({});
  // qtyEdited[purchase_order_line_id] = true → operator changed the "To Procure"
  // quantity, so we send an explicit ordered_qty override (may exceed the SO's
  // pending). Untouched lines omit it and the backend keeps its auto-deduct.
  const [qtyEdited, setQtyEdited] = useState({});
  // rateOverride[purchase_order_line_id] = raw string the operator typed in the
  // Rate column, in the assigned vendor's currency. Blank/absent → use the
  // vendor's price-list rate. Converted back to ₹ by effRate / on submit.
  const [rateOverride, setRateOverride] = useState({});
  // Per-vendor expense picks. Shape: { [vendor_id]: [{ expense_id, type, value }] }.
  const [vendorExpenses, setVendorExpenses] = useState({});
  // Per-vendor optional advance paid. Shape:
  // { [vendor_id]: { payment_date, amount, invoice_number, notes } }.
  const [vendorAdvances, setVendorAdvances] = useState({});
  const updateAdvance = (vid, patch) =>
    setVendorAdvances((curr) => ({
      ...curr,
      [vid]: { ...(curr[vid] || {}), ...patch },
    }));

  // Per-vendor deliver-to location — ShivaTrade's receiving location (Locations
  // master id) where that vendor's goods land. Required per vendor; auto-filled
  // to the company default. Flows to the POV's delivery_address_id → the GRN
  // stamps it on the stock ledger so on-hand is location-scoped.
  // Shape: { [vendor_id]: location_id }.
  const [vendorLocations, setVendorLocations] = useState({});
  // Per-vendor terms printed on that vendor's POV PDF. Free text — these are
  // the VENDOR's terms, never the parent Sales Order's (those are the
  // customer's). Shape: { [vendor_id]: { dispatched_through, payment_terms,
  // delivery_terms } }.
  const [vendorTerms, setVendorTerms] = useState({});
  const setVendorTerm = (vendorId, field, value) =>
    setVendorTerms((curr) => ({
      ...curr,
      [vendorId]: { ...(curr[vendorId] || {}), [field]: value },
    }));
  const [companyLocations, setCompanyLocations] = useState([]);
  const defaultLocationId = useMemo(() => {
    const def =
      companyLocations.find((l) => l.is_default) || companyLocations[0];
    return def?._id || "";
  }, [companyLocations]);
  const locationOptions = useMemo(
    () =>
      companyLocations.map((l) => ({
        value: l._id,
        label: l.location_code
          ? `${l.location_code} - ${l.location_name}`
          : l.location_name,
      })),
    [companyLocations]
  );

  // ── Client-side pagination for the preview table ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const poId = purchaseOrder?._id;
  const previewEndpoint = `${API_ENDPOINTS.poVendors.recoverPreview}/${poId}`;

  // Per-vendor display currency + rate. One POV is created per vendor, so each
  // can be in its own currency. Shape: { [vid]: { currency_code, rate_display } }
  // where rate_display = ₹ per 1 foreign unit (what the operator sees/edits).
  // Prices stay entered in INR; this only sets how each SAVED POV renders.
  const [vendorCurrencies, setVendorCurrencies] = useState({});

  // ── Expense master (loaded once when modal opens) ──
  const expenseStore = useSelector((s) => s.expense);
  const currencyStore = useSelector((s) => s.currency);
  useEffect(() => {
    if (isOpen && !expenseStore?.expenseDropdown?.length) {
      dispatch(getExpenseDropdown());
    }
    if (isOpen && !currencyStore?.exchangeOptions?.length) {
      dispatch(getExchangeRateOptions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.code ? `${e.code} - ${e.name}` : e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown]
  );
  const expenseTypeOptions = REBATE_EXPENSE_TYPE_OPTIONS;

  // Home INR (excluded from the exchange-rate options, which list only foreign
  // targets) + every foreign currency that has a rate configured. Unlike an
  // export quotation, a POV to a domestic vendor is legitimately in ₹.
  const currencyOptions = useMemo(() => {
    const foreign = (currencyStore?.exchangeOptions || [])
      .filter((c) => c.code !== "INR")
      .map((c) => ({
        value: c.code,
        label: c.name ? `${c.code} - ${c.name}` : c.code,
      }));
    return [{ value: "INR", label: "INR (₹)" }, ...foreign];
  }, [currencyStore?.exchangeOptions]);

  // GST is an Indian INR tax, not applicable on a foreign-currency POV. When a
  // vendor's currency isn't INR, GST% is forced to 0 for that vendor everywhere
  // (inputs, per-vendor preview, submit payload).
  const vcFor = (vid) =>
    vendorCurrencies[vid] || { currency_code: "INR", rate_display: "1" };
  const gstAppliesFor = (vid) => vcFor(vid).currency_code === "INR";
  // Stored foreign-per-₹1 rate for a vendor (INR → 1). rate_display is ₹/foreign.
  const storedRateFor = (vid) => {
    const vc = vcFor(vid);
    if (vc.currency_code === "INR") return 1;
    const disp = Number(vc.rate_display);
    return disp > 0 ? 1 / disp : 1;
  };
  // Vendor's currency symbol; multiply an INR amount by storedRateFor to show it
  // in that vendor's currency (all card previews are INR-sourced).
  const symFor = (vid) => getCurrencySymbol(vcFor(vid).currency_code) || "₹";
  const setVendorRateDisplay = (vid, text) =>
    setVendorCurrencies((curr) => ({
      ...curr,
      [vid]: { ...(curr[vid] || { currency_code: "INR" }), rate_display: text },
    }));
  const setVendorCurrency = (vid, code) => {
    setVendorCurrencies((curr) => ({
      ...curr,
      [vid]: {
        currency_code: code,
        rate_display: code === "INR" ? "1" : "",
      },
    }));
    if (code && code !== "INR") {
      instance
        .get(API_ENDPOINTS.currencies.currentRate, { params: { to: code } })
        .then((resp) => {
          const r = Number(resp?.data?.data?.rate);
          if (r > 0)
            setVendorCurrencies((curr) => ({
              ...curr,
              [vid]: {
                currency_code: code,
                rate_display: String(Math.round((1 / r) * 100) / 100),
              },
            }));
        })
        .catch(() => {});
    }
  };

  // ── Company locations (deliver-to options, loaded once when modal opens) ──
  useEffect(() => {
    if (!isOpen || companyLocations.length) return;
    instance
      .get(`${API_ENDPOINTS.locations.list}`, {
        params: { status: "ACTIVE", dropdown: "yes" },
      })
      .then((resp) => setCompanyLocations(resp?.data?.data || []))
      .catch(() => setCompanyLocations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Company POV defaults (deliver-to terms), loaded once when modal opens ──
  // These seed each vendor's terms below, mirroring the standalone POV create
  // form. Without this, "Generate POV" from the Sales Order ignored the company
  // profile's Vendor-PO defaults and rendered the three term fields blank.
  const companyDefaults = useSelector((s) => s.company?.companyItem);
  useEffect(() => {
    if (isOpen && !companyDefaults?._id) dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !poId) return;
    setLoading(true);
    setPreviewLines([]);
    setActiveVendors([]);
    setAssignment({});
    setDropped({});
    setQtyEdited({});
    setVendorExpenses({});
    setVendorAdvances({});
    setVendorLocations({});
    setVendorTerms({});
    instance
      .get(previewEndpoint)
      .then((resp) => {
        const data = resp?.data?.data || {};
        const lines = data.lines || [];
        const vendors = data.active_vendors || [];
        setPreviewLines(lines);
        setActiveVendors(vendors);
        const seedA = {};
        const seedD = {};
        for (const l of lines) {
          seedA[l.purchase_order_line_id] =
            l.suggested_vendor_id || l.current_vendor_id || "";
          if (l.fully_covered) seedD[l.purchase_order_line_id] = true;
        }
        setAssignment(seedA);
        setDropped(seedD);
      })
      .catch((err) => {
        Notification(
          "Error",
          err?.response?.data?.message || t("Failed to load preview"),
          "warning"
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, poId]);

  const handleVendorChange = (lineId, vendorId) => {
    setAssignment((s) => ({ ...s, [lineId]: vendorId }));
    // A new vendor has its own price-list rate — drop any rate the operator
    // typed for the previous vendor so the new default shows through.
    setRateOverride((s) => {
      if (!(lineId in s)) return s;
      const n = { ...s };
      delete n[lineId];
      return n;
    });
  };

  // Rate is editable — the operator can override the vendor's price-list rate
  // per line. Entered in the vendor's currency (raw string kept as typed, like
  // the per-vendor advance); converted to ₹ wherever an INR rate is needed and
  // on submit. Blank reverts the line to its price-list rate.
  const handleRateChange = (lineId, val) => {
    setRateOverride((s) => ({ ...s, [lineId]: val }));
  };

  // GST% is editable — defaults from the product/HSN master, override when a
  // master rate is wrong or blank. The edited value flows into the POV line.
  const handleTaxChange = (lineId, val) => {
    setPreviewLines((rows) =>
      rows.map((r) =>
        r.purchase_order_line_id === lineId ? { ...r, tax_pct: val } : r
      )
    );
  };

  // HSN is editable for the same reason GST% is: the master's code can be
  // wrong or blank, and the vendor-facing document needs the right one. The
  // edit is LOCAL to the POV being generated — neither the Sales Order line
  // nor the product master is written back.
  const handleHsnChange = (lineId, val) => {
    setPreviewLines((rows) =>
      rows.map((r) =>
        r.purchase_order_line_id === lineId ? { ...r, hsn_code: val } : r
      )
    );
  };

  // "To Procure" is editable so the operator can adjust the quantity actually
  // ordered from the vendor (client req #3). Editing it drives every live total
  // below (goods, GST, POV total) because they all read `to_procure`, and marks
  // the line so onSubmit sends an explicit ordered_qty override. Raising a line
  // that was "from stock" (to_procure 0) reveals its vendor picker automatically
  // — `fromStock` is derived from this value on each render.
  const handleQtyChange = (lineId, val) => {
    setPreviewLines((rows) =>
      rows.map((r) =>
        r.purchase_order_line_id === lineId ? { ...r, to_procure: val } : r
      )
    );
    setQtyEdited((s) => ({ ...s, [lineId]: true }));
  };

  const handleDrop = (lineId) => {
    setDropped((d) => ({ ...d, [lineId]: true }));
  };

  const handleRestore = (lineId) => {
    setDropped((d) => {
      const n = { ...d };
      delete n[lineId];
      return n;
    });
  };

  // Per-line vendor options. Prefer price-list candidates (with ₹ rate +
  // Cheapest badge); fall back to the flat active-vendor list when a line's
  // product has no price-list rows.
  const vendorOptionsForLine = (l) => {
    const cands = l.candidate_vendors || [];
    if (cands.length) {
      const cheapestId = cands[0]?.vendor_id;
      return cands.map((c) => ({
        value: c.vendor_id,
        label: `${c.vendor_name} · ₹${fmt(c.unit_price)}`,
        isCheapest: c.vendor_id === cheapestId,
      }));
    }
    return activeVendors.map((v) => ({
      value: v.vendor_id,
      label: v.vendor_name,
    }));
  };

  // Unit price (₹) for the vendor chosen on a line, from its candidates.
  const priceForLine = (l, vendorId) => {
    const c = (l.candidate_vendors || []).find(
      (x) => x.vendor_id === vendorId
    );
    return c ? Number(c.unit_price) || 0 : 0;
  };

  // Effective per-line rate in ₹ — the operator's override (typed in the
  // vendor's currency → back to ₹) when present, else the price-list rate.
  // Everything that costs a line (goods total, GST, POV total, payload) reads
  // this so an edited rate flows through consistently.
  const effRate = (l, vendorId) => {
    const ov = rateOverride[l.purchase_order_line_id];
    if (ov != null && String(ov) !== "") {
      const sr = storedRateFor(vendorId) || 1;
      return Math.round(((Number(ov) || 0) / sr) * 100) / 100;
    }
    return priceForLine(l, vendorId);
  };

  // Group active assignments by vendor → "N POVs" preview + goods total (₹).
  const vendorSummary = useMemo(() => {
    const map = new Map();
    for (const l of previewLines) {
      if (dropped[l.purchase_order_line_id]) continue;
      // Lines fully covered from stock create no POV — exclude from the count.
      if (num(l.to_procure) <= 0) continue;
      const vid = assignment[l.purchase_order_line_id];
      if (!vid) continue;
      const vendorName =
        (l.candidate_vendors || []).find((c) => c.vendor_id === vid)
          ?.vendor_name ||
        activeVendors.find((v) => v.vendor_id === vid)?.vendor_name ||
        vid;
      const existing = map.get(vid) || {
        vendor_id: vid,
        vendor_name: vendorName,
        lines: 0,
        total: 0,
      };
      existing.lines += 1;
      existing.total += num(l.to_procure) * effRate(l, vid);
      map.set(vid, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.vendor_name || "").localeCompare(b.vendor_name || "")
    );
    // effRate reads rateOverride + storedRateFor(vendorCurrencies), so the
    // per-vendor goods total recomputes when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewLines, assignment, dropped, activeVendors, rateOverride, vendorCurrencies]);

  // Default each vendor's currency to INR once vendors are known. Blank-only,
  // so an operator's explicit per-vendor pick is never clobbered. (The vendor
  // decides its own currency here — it is NOT inherited from the Sales Order,
  // whose currency is the customer's, not the vendor's.)
  useEffect(() => {
    if (!vendorSummary.length) return;
    // Blank-only default: each vendor seeds to ITS preferred currency (from the
    // vendor master, surfaced on active_vendors); a foreign pick also fetches
    // the live exchange rate via setVendorCurrency. Vendors with no preference
    // (or INR) fall back to ₹. An operator's explicit pick is never clobbered.
    for (const v of vendorSummary) {
      if (vendorCurrencies[v.vendor_id]) continue;
      const pref = activeVendors.find(
        (av) => av.vendor_id === v.vendor_id
      )?.currency_code;
      if (pref && pref.toUpperCase() !== "INR") {
        setVendorCurrency(v.vendor_id, pref);
      } else {
        setVendorCurrencies((curr) =>
          curr[v.vendor_id]
            ? curr
            : {
                ...curr,
                [v.vendor_id]: { currency_code: "INR", rate_display: "1" },
              }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorSummary, activeVendors]);

  // Prune charges for vendors no longer in the batch.
  useEffect(() => {
    const activeVendorIds = new Set(vendorSummary.map((v) => v.vendor_id));
    setVendorExpenses((curr) => {
      let changed = false;
      const next = {};
      for (const [vid, rows] of Object.entries(curr)) {
        if (activeVendorIds.has(vid)) next[vid] = rows;
        else changed = true;
      }
      return changed ? next : curr;
    });
    setVendorAdvances((curr) => {
      let changed = false;
      const next = {};
      for (const [vid, adv] of Object.entries(curr)) {
        if (activeVendorIds.has(vid)) next[vid] = adv;
        else changed = true;
      }
      return changed ? next : curr;
    });
    // Seed each active vendor's deliver-to location to the default, prune the
    // rest. Keeps an explicit operator pick if one was already made.
    setVendorLocations((curr) => {
      let changed = false;
      const next = {};
      for (const vid of activeVendorIds) {
        const val = curr[vid] || defaultLocationId;
        next[vid] = val;
        if (val !== curr[vid]) changed = true;
      }
      if (Object.keys(curr).length !== Object.keys(next).length) changed = true;
      return changed ? next : curr;
    });
  }, [vendorSummary, defaultLocationId]);

  // Seed each active vendor's terms from the company POV defaults — blank-only,
  // so an operator's typing is never clobbered (mirrors po-vendors/create).
  useEffect(() => {
    const c = companyDefaults;
    if (!c) return;
    const dt = c.pov_default_dispatched_through;
    const pt = c.pov_default_payment_terms;
    const dl = c.pov_default_delivery_terms;
    if (!dt && !pt && !dl) return;
    const ids = vendorSummary.map((v) => v.vendor_id);
    if (!ids.length) return;
    setVendorTerms((curr) => {
      let changed = false;
      const next = { ...curr };
      for (const vid of ids) {
        const seeded = { ...(curr[vid] || {}) };
        if (dt && !seeded.dispatched_through) {
          seeded.dispatched_through = dt;
          changed = true;
        }
        if (pt && !seeded.payment_terms) {
          seeded.payment_terms = pt;
          changed = true;
        }
        if (dl && !seeded.delivery_terms) {
          seeded.delivery_terms = dl;
          changed = true;
        }
        next[vid] = seeded;
      }
      return changed ? next : curr;
    });
  }, [vendorSummary, companyDefaults]);

  // Goods GST for one vendor block. Same formula as the POV PDF and the POV
  // create screen: per line, (to_procure × rate) × tax_pct/100. Without this the
  // "Taxable" figure on each card was the ONLY number shown, and the operator had
  // no idea what the POV would actually cost until the PDF was generated.
  const goodsGstFor = (v) =>
    !gstAppliesFor(v.vendor_id)
      ? 0
      : previewLines.reduce((s, l) => {
          const id = l.purchase_order_line_id;
          if (dropped[id]) return s;
          if (num(l.to_procure) <= 0) return s;
          if (assignment[id] !== v.vendor_id) return s;
          const lineTotal = num(l.to_procure) * effRate(l, v.vendor_id);
          return s + (lineTotal * num(l.tax_pct)) / 100;
        }, 0);

  // GST the operator entered on each charge row. Charges are taxed at their own
  // rate on the PDF, not folded into the goods rate — mirror that here.
  const chargeGstFor = (v) =>
    (vendorExpenses[v.vendor_id] || []).reduce((s, r) => {
      if (!r?.expense_id) return s;
      const amount =
        r.type === "percent"
          ? (v.total * Number(r.value || 0)) / 100
          : Number(r.value || 0);
      return s + (amount * Number(r.gst_pct || 0)) / 100;
    }, 0);

  // Charges total for a single vendor block (percent against its goods total).
  const chargesFor = (v) =>
    (vendorExpenses[v.vendor_id] || []).reduce((s, r) => {
      if (!r?.expense_id) return s;
      return (
        s +
        (r.type === "percent"
          ? (v.total * Number(r.value || 0)) / 100
          : Number(r.value || 0))
      );
    }, 0);

  // Lines fully covered from stock (to_procure ≤ 0) need no vendor.
  const hasUnassigned = previewLines.some(
    (l) =>
      !dropped[l.purchase_order_line_id] &&
      num(l.to_procure) > 0 &&
      !assignment[l.purchase_order_line_id]
  );

  const onSubmit = async () => {
    if (creating) return;
    if (hasUnassigned) {
      Notification(
        "Validation",
        t("Some lines have no vendor. Pick one or drop them."),
        "warning"
      );
      return;
    }

    // Only lines that actually need procuring (to_procure > 0) and have a
    // vendor are submitted. Lines fully covered from stock or already covered
    // are simply skipped — they no longer block generation.
    const assignments = previewLines
      .filter(
        (l) =>
          !dropped[l.purchase_order_line_id] &&
          num(l.to_procure) > 0 &&
          assignment[l.purchase_order_line_id]
      )
      .map((l) => ({
        purchase_order_line_id: l.purchase_order_line_id,
        vendor_id: assignment[l.purchase_order_line_id],
        // GST is an Indian INR tax — a foreign-currency POV carries none, so
        // force the line's GST% to "0" when its vendor's currency isn't INR.
        tax_pct: !gstAppliesFor(assignment[l.purchase_order_line_id])
          ? "0"
          : l.tax_pct != null && l.tax_pct !== ""
          ? String(num(l.tax_pct))
          : undefined,
        // Only send the qty when the operator edited it — otherwise the backend
        // keeps its own pending − stock auto-deduct. An edited value may exceed
        // pending; the backend flags such lines past the over-shipment guard.
        ordered_qty: qtyEdited[l.purchase_order_line_id]
          ? String(num(l.to_procure))
          : undefined,
        // Omitted when blank so the backend keeps its own fallback chain
        // (SO line → product master) rather than storing an empty HSN.
        hsn_code:
          l.hsn_code != null && String(l.hsn_code).trim() !== ""
            ? String(l.hsn_code).trim()
            : undefined,
        // Rate override → send in ₹ (the operator typed it in the vendor's
        // currency; convert back with the vendor's stored foreign-per-₹1 rate).
        // Omitted when untouched so the backend keeps its price-list fallback.
        unit_price: (() => {
          const ov = rateOverride[l.purchase_order_line_id];
          if (ov == null || String(ov) === "") return undefined;
          const sr = storedRateFor(assignment[l.purchase_order_line_id]) || 1;
          return String(Math.round(((Number(ov) || 0) / sr) * 100) / 100);
        })(),
      }));
    if (assignments.length === 0) {
      // Nothing left to buy — either everything is in stock, or no rows kept.
      const allFromStock = previewLines.some(
        (l) =>
          !dropped[l.purchase_order_line_id] && num(l.to_procure) <= 0
      );
      Notification(
        allFromStock ? "Info" : "Validation",
        allFromStock
          ? t("All required lines are fulfilled from stock — no Vendor PO needed.")
          : t("No lines selected. Restore at least one line to proceed."),
        allFromStock ? "success" : "warning"
      );
      if (allFromStock) toggle?.();
      return;
    }

    // Deliver-to location is required per vendor (auto-filled to the default).
    // Guard in case the default never loaded or the operator cleared one.
    const submittingVendorIds = [...new Set(assignments.map((a) => a.vendor_id))];
    const missingLoc = submittingVendorIds.filter((vid) => !vendorLocations[vid]);
    if (missingLoc.length) {
      Notification(
        "Validation",
        t("Pick a deliver-to location for every vendor."),
        "warning"
      );
      return;
    }
    const trimmedLocations = {};
    for (const vid of submittingVendorIds) {
      trimmedLocations[vid] = vendorLocations[vid];
    }

    const trimmedCurrencies = {};
    for (const vid of submittingVendorIds) {
      const vc = vcFor(vid);
      const isForeign = vc.currency_code && vc.currency_code !== "INR";
      // Send every vendor explicitly so an INR vendor under a foreign SO does
      // not inherit the SO currency on the backend.
      trimmedCurrencies[vid] = {
        currency_code: vc.currency_code || "INR",
        exchange_rate: isForeign ? String(storedRateFor(vid)) : "1",
      };
    }

    // Trim out empty vendor blocks (no rows) and rows missing expense_id.
    const trimmedExpenses = {};
    for (const [vid, rows] of Object.entries(vendorExpenses)) {
      const cleaned = (rows || []).filter((r) => r?.expense_id);
      if (cleaned.length) {
        trimmedExpenses[vid] = cleaned.map((r) => ({
          expense_id: r.expense_id,
          type: r.type || "percent",
          value: r.value || "0",
          // GST never applies on a foreign-currency POV.
          gst_pct: gstAppliesFor(vid) ? r.gst_pct || "0" : "0",
        }));
      }
    }

    // Per-vendor advances with a positive amount only. The advance is entered
    // in the vendor's currency, but payments are STORED in INR — convert back
    // (INR = foreign / storedRate, where storedRate is foreign-per-₹1).
    const trimmedAdvances = {};
    for (const [vid, adv] of Object.entries(vendorAdvances)) {
      if (num(adv?.amount) > 0) {
        const sr = storedRateFor(vid) || 1;
        const amountInr = Math.round((num(adv.amount) / sr) * 100) / 100;
        trimmedAdvances[vid] = {
          payment_date:
            adv.payment_date || new Date().toISOString().slice(0, 10),
          amount: String(amountInr),
          invoice_number: adv.invoice_number?.trim() || undefined,
          notes: adv.notes?.trim() || undefined,
        };
      }
    }

    // Per-vendor terms — only vendors with at least one non-empty field.
    const trimmedTerms = {};
    for (const [vid, tv] of Object.entries(vendorTerms)) {
      const cleaned = {
        dispatched_through: tv?.dispatched_through?.trim() || undefined,
        payment_terms: tv?.payment_terms?.trim() || undefined,
        delivery_terms: tv?.delivery_terms?.trim() || undefined,
      };
      if (Object.values(cleaned).some(Boolean)) trimmedTerms[vid] = cleaned;
    }

    setCreating(true);
    try {
      const result = await dispatch(
        recoverPoVendors({
          purchase_order_id: poId,
          vendor_currencies: trimmedCurrencies,
          assignments,
          vendor_expenses: trimmedExpenses,
          vendor_advances: Object.keys(trimmedAdvances).length
            ? trimmedAdvances
            : undefined,
          vendor_delivery_locations: trimmedLocations,
          vendor_terms: Object.keys(trimmedTerms).length
            ? trimmedTerms
            : undefined,
        })
      ).unwrap();
      const created = result?.created || [];
      onCreated?.({ created, all_from_stock: result?.all_from_stock });
      toggle?.();
    } catch (_err) {
      // Notification is fired by the page-level effect that watches
      // store.actionFlag / store.error. No-op here.
    } finally {
      setCreating(false);
    }
  };

  // Pagination derived from the preview lines.
  const totalRows = previewLines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = previewLines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);
  useEffect(() => {
    setPage(0);
  }, [isOpen, totalRows]);

  const headerTitle = (
    <>
      {t("Generate POV")}{" "}
      <span className="text-muted">{t("from Sales Order")}</span>{" "}
      <code>{purchaseOrder?.voucher_no || ""}</code>
    </>
  );

  const bodyNode = (
    <>
        {loading ? (
          <div className="text-center py-5">
            <Spinner /> <span className="ms-2">{t("Loading preview…")}</span>
          </div>
        ) : previewLines.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No PO lines need a Vendor PO.")}
          </div>
        ) : (
          <>
            <p className="text-muted small mb-2">
              {t(
                "Each line is pre-picked to the cheapest price-list vendor. Change the vendor to re-assign, or skip a line. One POV is created per unique vendor."
              )}
            </p>

            {previewLines.every((l) => l.fully_covered) && (
              <div className="alert alert-info small mb-2">
                <AlertTriangle size={14} className="me-1" />
                {t(
                  "All lines are already covered by active POVs. Restore a line below to add another POV for it."
                )}
              </div>
            )}

            <div className="table-responsive">
              <Table bordered size="sm" className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>{t("Product")}</th>
                    <th style={{ width: 100 }}>{t("Part No")}</th>
                    <th style={{ width: 80 }}>{t("HSN")}</th>
                    <th style={{ width: 70 }}>{t("Unit")}</th>
                    {/* `pending_qty` = ordered − qty already held by existing
                        non-cancelled POVs. Not the SO's ordered qty, and not
                        the coverage card's `pending` (which is net of stock). */}
                    <th style={{ width: 100 }} className="text-end">
                      {t("Not Yet Covered")}
                    </th>
                    <th style={{ width: 80 }} className="text-end">
                      {t("In Stock")}
                    </th>
                    <th style={{ width: 90 }} className="text-end">
                      {t("To Procure")}
                    </th>
                    <th style={{ minWidth: 240 }}>{t("Vendor")}</th>
                    <th style={{ width: 100 }} className="text-end">
                      {t("Rate")}
                    </th>
                    <th style={{ width: 60 }} className="text-end">
                      {t("GST")} %
                    </th>
                    <th className="text-end" style={{ width: 110 }}>
                      {t("GST Amt")}
                    </th>
                    <th style={{ width: 70 }} className="text-center">
                      {t("Action")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLines.map((l, idx) => {
                    const rowNum = pageStart + idx + 1;
                    const isDropped = !!dropped[l.purchase_order_line_id];
                    const picked = assignment[l.purchase_order_line_id];
                    const vendorOpts = vendorOptionsForLine(l);
                    const pickedOpt = vendorOpts.find(
                      (o) => o.value === picked
                    );
                    const rate = effRate(l, picked);
                    // Value shown in the Rate input (vendor currency): the raw
                    // override as typed, else the price-list rate × display rate.
                    const rateOv = rateOverride[l.purchase_order_line_id];
                    const rateInputVal =
                      rateOv != null && String(rateOv) !== ""
                        ? rateOv
                        : priceForLine(l, picked) > 0
                        ? String(
                            Math.round(
                              priceForLine(l, picked) * storedRateFor(picked) * 10000
                            ) / 10000
                          )
                        : "";
                    const noVendor = vendorOpts.length === 0;
                    // Fully covered from on-hand stock → no Vendor PO needed.
                    const fromStock = num(l.to_procure) <= 0;
                    // GST applies only when this line's assigned vendor's POV
                    // currency is INR.
                    const lineGstApplies = gstAppliesFor(
                      assignment[l.purchase_order_line_id]
                    );
                    // Display currency follows the line's assigned vendor's POV
                    // currency: rate/amounts are stored in ₹, shown as
                    // ₹value × (foreign-per-₹1). Falls back to ₹ (rate 1) when
                    // no vendor is picked yet — same maths as the vendor card.
                    const lineSym = symFor(picked);
                    const lineRate = storedRateFor(picked);
                    return (
                      <tr
                        key={l.purchase_order_line_id}
                        style={
                          isDropped
                            ? { opacity: 0.4, textDecoration: "line-through" }
                            : {}
                        }
                      >
                        <td>{rowNum}</td>
                        <td>
                          <div className="fw-semibold">
                            {l?.product_name || "-"}
                          </div>
                          {l?.product_code && (
                            <small className="text-muted">
                              {l.product_code}
                            </small>
                          )}
                        </td>
                        <td className="text-muted">{l?.part_no || "-"}</td>
                        <td>
                          <Input
                            type="text"
                            bsSize="sm"
                            style={{ width: 96 }}
                            placeholder="HSN"
                            value={l.hsn_code ?? ""}
                            onChange={(e) =>
                              handleHsnChange(
                                l.purchase_order_line_id,
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>{l?.unit || "-"}</td>
                        <td className="text-end fw-semibold">
                          {num(l.pending_qty).toLocaleString()}
                        </td>
                        <td
                          className="text-end"
                          style={{
                            color: num(l.in_stock) > 0 ? "#28c76f" : "#6e6b7b",
                          }}
                        >
                          {num(l.in_stock).toLocaleString()}
                        </td>
                        <td className="text-end fw-bold" style={{ minWidth: 96 }}>
                          {isDropped || noVendor ? (
                            num(l.to_procure).toLocaleString()
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              bsSize="sm"
                              className="text-end ms-auto"
                              style={{ width: 84 }}
                              value={l.to_procure ?? ""}
                              title={t("Adjust quantity to procure")}
                              onChange={(e) =>
                                handleQtyChange(
                                  l.purchase_order_line_id,
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </td>
                        <td>
                          {fromStock ? (
                            <span className="text-success small fw-semibold">
                              — {t("from stock")} —
                            </span>
                          ) : noVendor ? (
                            <div className="text-danger d-flex align-items-center small">
                              <AlertTriangle
                                size={14}
                                className="me-1 flex-shrink-0"
                              />
                              <span>
                                {t(
                                  "No vendor — add this product to a vendor's price list"
                                )}
                              </span>
                            </div>
                          ) : isDropped ? (
                            <span className="text-muted small">
                              {pickedOpt?.label || "—"}
                            </span>
                          ) : (
                            <Select
                              classNamePrefix="select"
                              options={vendorOpts}
                              value={pickedOpt || null}
                              onChange={(opt) =>
                                handleVendorChange(
                                  l.purchase_order_line_id,
                                  opt?.value || ""
                                )
                              }
                              placeholder={t("Pick a vendor")}
                              isClearable={false}
                              menuPortalTarget={document.body}
                              menuPlacement="auto"
                              menuPosition="fixed"
                              maxMenuHeight={220}
                              formatOptionLabel={(opt) => (
                                <div className="d-flex align-items-center justify-content-between">
                                  <span>{opt.label}</span>
                                  {opt.isCheapest && (
                                    <Badge
                                      color="light-success"
                                      className="ms-1"
                                      pill
                                    >
                                      {t("Cheapest")}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              styles={{
                                menuPortal: (base) => ({
                                  ...base,
                                  zIndex: 9999,
                                }),
                              }}
                            />
                          )}
                        </td>
                        <td className="text-end" style={{ minWidth: 120 }}>
                          {fromStock || noVendor || isDropped || !picked ? (
                            <span>
                              {rate > 0 ? `${lineSym}${fmt(rate * lineRate)}` : "-"}
                            </span>
                          ) : (
                            <div className="d-flex align-items-center justify-content-end">
                              <span className="me-50 text-muted">{lineSym}</span>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                bsSize="sm"
                                className="text-end"
                                style={{ width: 84 }}
                                value={rateInputVal}
                                title={t("Vendor rate (in the vendor's currency)")}
                                onChange={(e) =>
                                  handleRateChange(
                                    l.purchase_order_line_id,
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          )}
                        </td>
                        <td className="text-end" style={{ minWidth: 90 }}>
                          {fromStock || noVendor || isDropped ? (
                            <span className="text-muted">
                              {num(l.tax_pct) > 0 ? `${l.tax_pct}%` : "-"}
                            </span>
                          ) : (
                            <div className="d-flex align-items-center justify-content-end">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                style={{ width: 66 }}
                                value={lineGstApplies ? (l.tax_pct ?? "") : 0}
                                disabled={!lineGstApplies}
                                onChange={(e) =>
                                  handleTaxChange(
                                    l.purchase_order_line_id,
                                    e.target.value
                                  )
                                }
                              />
                              <span className="ms-1 text-muted">%</span>
                            </div>
                          )}
                        </td>
                        {/* Live GST for this line — (to_procure × rate) × GST%.
                            A stock-covered or dropped line buys nothing, so it
                            carries no GST. */}
                        <td className="text-end">
                          {fromStock || noVendor || isDropped ? (
                            <span className="text-muted">-</span>
                          ) : (
                            <span>
                              {lineSym}
                              {fmt(
                                (lineGstApplies
                                  ? (num(l.to_procure) * rate * num(l.tax_pct)) /
                                      100
                                  : 0) * lineRate
                              )}
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {isDropped ? (
                            <Button
                              size="sm"
                              color="secondary"
                              outline
                              onClick={() =>
                                handleRestore(l.purchase_order_line_id)
                              }
                              title={t("Restore line")}
                            >
                              <RotateCcw size={14} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              color="danger"
                              outline
                              onClick={() =>
                                handleDrop(l.purchase_order_line_id)
                              }
                              title={t("Skip this line")}
                            >
                              <X size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 mt-1 mb-2">
              <div className="d-flex align-items-center small text-muted">
                <span className="me-50">{t("Show")}</span>
                <Input
                  type="select"
                  bsSize="sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || 10);
                    setPage(0);
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
                  {t("of")} {totalRows} {t("rows")}
                </span>
              </div>
              <ReactPaginate
                previousLabel=""
                nextLabel=""
                pageCount={pageCount}
                activeClassName="active"
                forcePage={safePage}
                onPageChange={({ selected }) => setPage(selected)}
                pageClassName="page-item"
                nextLinkClassName="page-link"
                nextClassName="page-item next"
                previousClassName="page-item prev"
                previousLinkClassName="page-link"
                pageLinkClassName="page-link"
                containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
              />
            </div>

            {/* Per-vendor charges — mirrors the old quotation → SO popup. */}
            {vendorSummary.length > 0 && (
              <>
                <div className="alert alert-info small mb-2">
                  <strong>{t("Will create")}: </strong>
                  {vendorSummary.length}{" "}
                  {vendorSummary.length === 1 ? t("POV") : t("POVs")}.{" "}
                  {t("Add optional charges per vendor below.")}
                </div>
                {vendorSummary.map((v) => {
                  const rows = vendorExpenses[v.vendor_id] || [];
                  const updateRow = (idx, patch) =>
                    setVendorExpenses((curr) => {
                      const list = (curr[v.vendor_id] || []).map((r, i) =>
                        i === idx ? { ...r, ...patch } : r
                      );
                      return { ...curr, [v.vendor_id]: list };
                    });
                  const removeRow = (idx) =>
                    setVendorExpenses((curr) => {
                      const list = (curr[v.vendor_id] || []).filter(
                        (_, i) => i !== idx
                      );
                      const next = { ...curr };
                      if (list.length === 0) delete next[v.vendor_id];
                      else next[v.vendor_id] = list;
                      return next;
                    });
                  const addRow = () =>
                    setVendorExpenses((curr) => ({
                      ...curr,
                      [v.vendor_id]: [
                        ...(curr[v.vendor_id] || []),
                        {
                          expense_id: "",
                          type: "percent",
                          value: "0",
                          gst_pct: "0",
                          code: "",
                          name: "",
                        },
                      ],
                    }));
                  const chargesTotal = chargesFor(v);
                  const goodsGst = goodsGstFor(v);
                  const chargeGst = chargeGstFor(v);
                  // GST is an Indian INR tax — nil on a foreign-currency POV.
                  const gstTotal = gstAppliesFor(v.vendor_id)
                    ? goodsGst + chargeGst
                    : 0;
                  const grandTotal = v.total + chargesTotal + gstTotal;
                  // Preview totals are INR-sourced; show them in the vendor's
                  // chosen currency (× rate) with its symbol.
                  const vSym = symFor(v.vendor_id);
                  const vRate = storedRateFor(v.vendor_id);
                  return (
                    <div key={v.vendor_id} className="po-gen-card mb-2">
                      <div className="po-gen-head justify-content-between">
                        <div className="small">
                          <span className="text-muted">{t("PO to")}: </span>
                          <span className="fw-semibold">{v.vendor_name}</span>
                          <span className="ms-1">
                            · {v.lines} {t("line(s)")} · {vSym}
                            {fmt(v.total * vRate)}
                            {chargesTotal > 0 && (
                              <>
                                {" "}
                                + {t("Charges")} {vSym}
                                {fmt(chargesTotal * vRate)}
                              </>
                            )}
                            {gstTotal > 0 && (
                              <>
                                {" "}
                                + {t("GST")} {vSym}
                                {fmt(gstTotal * vRate)}
                              </>
                            )}
                            {(chargesTotal > 0 || gstTotal > 0) && (
                              <>
                                {" = "}
                                <strong>
                                  {vSym}
                                  {fmt(grandTotal * vRate)}
                                </strong>{" "}
                                <span className="text-muted">
                                  ({t("POV total")})
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          color="primary"
                          outline
                          onClick={addRow}
                        >
                          <Plus size={12} className="me-25" />
                          {t("Add Expense")}
                        </Button>
                      </div>
                      <div className="p-1">
                        {/* Per-vendor display currency + exchange rate. Vendor
                            prices are entered in INR (₹) above — this only sets
                            how this vendor's SAVED POV renders (detail + PDF).
                            Defaults to the source Sales Order's currency.
                            exchange_rate is stored foreign-per-₹1. */}
                        <Row className="mb-1">
                          <Col md="3" sm="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Currency")}
                            </Label>
                            <Select
                              classNamePrefix="select"
                              options={currencyOptions}
                              value={
                                currencyOptions.find(
                                  (o) => o.value === vcFor(v.vendor_id).currency_code
                                ) || {
                                  value: vcFor(v.vendor_id).currency_code,
                                  label: vcFor(v.vendor_id).currency_code,
                                }
                              }
                              onChange={(opt) =>
                                setVendorCurrency(v.vendor_id, opt?.value || "INR")
                              }
                              isClearable={false}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              }}
                            />
                          </Col>
                          <Col md="3" sm="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Exchange Rate")}
                              {vcFor(v.vendor_id).currency_code !== "INR" && (
                                <span className="text-muted">
                                  {" "}
                                  (₹ {t("per 1")} {vcFor(v.vendor_id).currency_code})
                                </span>
                              )}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              bsSize="sm"
                              value={vcFor(v.vendor_id).rate_display}
                              disabled={vcFor(v.vendor_id).currency_code === "INR"}
                              onChange={(e) =>
                                setVendorRateDisplay(v.vendor_id, e.target.value)
                              }
                            />
                          </Col>
                        </Row>
                        {/* Deliver-to location (ShivaTrade's receiving
                            location). Required — auto-filled to the default;
                            sets the POV's delivery_address_id → stock ledger. */}
                        <Row className="mb-1">
                          <Col md="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Deliver to location")}{" "}
                              <span className="text-danger">*</span>
                            </Label>
                            <Select
                              classNamePrefix="select"
                              placeholder={t("Select location…")}
                              options={locationOptions}
                              value={
                                locationOptions.find(
                                  (o) => o.value === vendorLocations[v.vendor_id]
                                ) || null
                              }
                              onChange={(opt) =>
                                setVendorLocations((curr) => ({
                                  ...curr,
                                  [v.vendor_id]: opt ? opt.value : "",
                                }))
                              }
                              noOptionsMessage={() => t("No locations found")}
                            />
                          </Col>
                          <Col md="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Dispatched Through")}
                            </Label>
                            <Input
                              bsSize="sm"
                              maxLength={150}
                              placeholder={t("e.g. By Sea")}
                              value={
                                vendorTerms[v.vendor_id]?.dispatched_through ||
                                ""
                              }
                              onChange={(e) =>
                                setVendorTerm(
                                  v.vendor_id,
                                  "dispatched_through",
                                  e.target.value
                                )
                              }
                            />
                          </Col>
                        </Row>
                        {/* Vendor-side terms printed on this POV's PDF. Free
                            text — typed per vendor, never inherited from the
                            Sales Order (whose terms are the customer's). */}
                        <Row className="mb-1">
                          <Col md="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Mode/Terms of Payment")}
                            </Label>
                            <Input
                              bsSize="sm"
                              maxLength={500}
                              placeholder={t(
                                "e.g. 50% ADVANCE & 50% AT DISPATCH TIME"
                              )}
                              value={
                                vendorTerms[v.vendor_id]?.payment_terms || ""
                              }
                              onChange={(e) =>
                                setVendorTerm(
                                  v.vendor_id,
                                  "payment_terms",
                                  e.target.value
                                )
                              }
                            />
                          </Col>
                          <Col md="6">
                            <Label className="form-label small fw-semibold mb-25">
                              {t("Terms of Delivery")}
                            </Label>
                            <Input
                              bsSize="sm"
                              type="textarea"
                              rows="3"
                              maxLength={1000}
                              placeholder={t(
                                "e.g. OUR PFI NO:…, DELIVERY TERM: 4 TO 5 WEEKS"
                              )}
                              value={
                                vendorTerms[v.vendor_id]?.delivery_terms || ""
                              }
                              onChange={(e) =>
                                setVendorTerm(
                                  v.vendor_id,
                                  "delivery_terms",
                                  e.target.value
                                )
                              }
                            />
                          </Col>
                        </Row>
                        {rows.length === 0 && (
                          <div className="text-muted small text-center py-2">
                            {t(
                              "No charges. Click Add Expense to include Packing, Transport, etc."
                            )}
                          </div>
                        )}
                        <ExpenseGrid
                          rows={rows}
                          expenseOptions={expenseOptions}
                          typeOptions={expenseTypeOptions}
                          percentBase={v.total}
                          sym={vSym}
                          rate={vRate}
                          gstApplies={gstAppliesFor(v.vendor_id)}
                          onUpdateRow={updateRow}
                          onRemoveRow={removeRow}
                        />
                      </div>
                      {/* Optional advance paid to this vendor */}
                      <div className="px-1 pb-1">
                        <div className="small fw-semibold mb-1">
                          {t("Advance Paid")}{" "}
                          <span className="text-muted">({t("optional")})</span>
                        </div>
                        <div className="row g-1">
                          <div className="col-md-3">
                            <DateInput
                              id={`adv-date-${v.vendor_id}`}
                              value={
                                vendorAdvances[v.vendor_id]?.payment_date || ""
                              }
                              onChange={(_d, _s, iso) =>
                                updateAdvance(v.vendor_id, {
                                  payment_date: iso || "",
                                })
                              }
                              placeholder={t("Date")}
                            />
                          </div>
                          <div className="col-md-3">
                            <Input
                              type="number"
                              bsSize="sm"
                              min="0"
                              step="any"
                              placeholder={`${t("Amount")} ${vSym}`}
                              value={vendorAdvances[v.vendor_id]?.amount || ""}
                              onChange={(e) =>
                                updateAdvance(v.vendor_id, {
                                  amount: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-md-3">
                            <Input
                              bsSize="sm"
                              maxLength={120}
                              placeholder={t("Invoice #")}
                              value={
                                vendorAdvances[v.vendor_id]?.invoice_number || ""
                              }
                              onChange={(e) =>
                                updateAdvance(v.vendor_id, {
                                  invoice_number: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-md-3">
                            <Input
                              bsSize="sm"
                              placeholder={t("Notes")}
                              value={vendorAdvances[v.vendor_id]?.notes || ""}
                              onChange={(e) =>
                                updateAdvance(v.vendor_id, {
                                  notes: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
    </>
  );

  const footerNode = (
    <>
      <Button color="secondary" outline onClick={toggle} disabled={creating}>
        {t("Cancel")}
      </Button>
      <Button
        color="success"
        onClick={onSubmit}
        disabled={
          creating || loading || vendorSummary.length === 0 || hasUnassigned
        }
      >
        {creating ? <Spinner size="sm" /> : null}{" "}
        {vendorSummary.length > 0
          ? t(`Create ${vendorSummary.length} POV(s)`)
          : t("Create POV(s)")}
      </Button>
    </>
  );

  // Full-page layout (preferred — opens as its own edit page); falls back to
  // the modal for any caller that still opens it inline.
  if (asPage) {
    return (
      <Card className="mb-1">
        <CardHeader>
          <h4 className="mb-0">{headerTitle}</h4>
        </CardHeader>
        <CardBody>{bodyNode}</CardBody>
        <CardFooter className="d-flex justify-content-end gap-1">
          {footerNode}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" backdrop="static">
      <ModalHeader toggle={toggle}>{headerTitle}</ModalHeader>
      <ModalBody>{bodyNode}</ModalBody>
      <ModalFooter>{footerNode}</ModalFooter>
    </Modal>
  );
};

export default PoVendorRecoverModal;
