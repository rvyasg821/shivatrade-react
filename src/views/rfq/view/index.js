// RFQ detail — vendor price comparison grid (lines × vendors), select best.
import { Fragment, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  Input,
  Button,
  Badge,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import {
  ArrowLeft,
  Download,
  Upload,
  Save,
  FileText,
  X,
  Briefcase,
  Hash,
} from "react-feather";

import { StatusChangeDropdown } from "@src/views/_shared/detail-page";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getRfq,
  setRfqPrices,
  addRfqVendors,
  removeRfqVendor,
  updateRfq,
  createRfqFromLead,
  cleanRfqMessage,
} from "../store";
import { getLead } from "@src/views/leads/store";
import { getVendorDropdown } from "@src/views/vendors/store";
import { stopLoading } from "../../loadingstore";
import Notification from "@components/toast/notification";
import Avatar from "@components/avatar";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import { appsRoot } from "@constant/defaultValues";
import RfqImportModal from "./RfqImportModal";

const STATUS_COLOR = {
  draft: "secondary",
  sent: "info",
  quoting: "warning",
  completed: "success",
  cancelled: "danger",
};

const STATUS_OPTIONS = ["draft", "sent", "quoting", "completed", "cancelled"];

const mySwal = withReactContent(Swal);

const key = (lineId, vendorId) => `${lineId}|${vendorId}`;

// Lenient numeric parse for price/qty cells (blank/invalid → 0).
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Cap a numeric string to at most 2 decimal places. Used for Qty/price display.
const limit2 = (v) => {
  if (v == null) return "";
  const s = String(v);
  const dot = s.indexOf(".");
  return dot === -1 ? s : s.slice(0, dot + 3);
};

const RfqView = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // Draft mode: the RFQ record is NOT created until the operator saves prices.
  // We reach this page from a lead via /rfq/view/new?lead_id=<id>; the grid is
  // built from the lead's requirement items + locally-added vendors, and only
  // "Save Prices" persists the RFQ (createFromLead + setPrices in one shot).
  const isDraft = id === "new";
  const leadIdParam = searchParams.get("lead_id");

  const store = useSelector((s) => s.rfq);
  const vendorStore = useSelector((s) => s.vendor);
  const leadStore = useSelector((s) => s.lead);
  const rfq = store?.rfqItem;
  const draftLead = isDraft ? leadStore?.leadItem : null;

  const [priceMap, setPriceMap] = useState({});
  // The active vendor in the Price Comparison dropdown — drives the checkbox
  // column + single-vendor export, and is what "Add" adds as a column.
  const [addVendorId, setAddVendorId] = useState("");
  // checkbox state per vendor: { vendorId: { lineId: bool } }. Auto-initialised
  // (sellable products checked) the first time a vendor is selected.
  const [checkedByVendor, setCheckedByVendor] = useState({});
  // Vendors whose ticks the operator has manually edited this session. Once a
  // vendor is here, the "auto-check the products it supplies" seed must never
  // overwrite the operator's choice (it still yields to the server-saved set).
  const userTouchedVendorsRef = useRef({});
  // Per-vendor Excel import (the round-trip return leg) — 2-step modal.
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [draftVendors, setDraftVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  // Price Comparison matrix has its own paginator, independent of the
  // "Collect Vendor Prices" table above.
  const [cmpPageSize, setCmpPageSize] = useState(10);
  const [cmpPage, setCmpPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  // Unsaved-work flag: a draft with vendors added, or typed prices not yet
  // saved. Drives the "leave anyway?" guard on tab close / refresh.
  const [dirty, setDirty] = useState(false);

  // Warn before the browser unloads (close / refresh / back) if there's
  // unsaved RFQ work — pairs with auto-save-on-export to prevent data loss.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    // Clear any global overlay left on by the list page; the detail page
    // shows its own local spinner while the RFQ loads.
    dispatch(stopLoading());
    dispatch(getVendorDropdown());
    if (isDraft) {
      if (leadIdParam) dispatch(getLead(leadIdParam));
    } else {
      dispatch(getRfq(id));
    }
  }, [id, dispatch]);

  // Seed the editable grid from the RFQ's stored prices whenever it loads.
  // Skipped in draft mode (no RFQ yet — the operator types fresh prices).
  useEffect(() => {
    if (isDraft || !rfq) return;
    const m = {};
    for (const p of rfq.prices || []) {
      m[key(p.rfq_line_id, p.vendor_id)] = limit2(p.unit_price ?? "");
    }
    setPriceMap(m);
  }, [rfq?._id, rfq?.prices?.length]);

  // Authoritative per-vendor checkbox seed. Rebuilds each vendor's ticks from
  // its persisted checked_line_ids whenever the server data changes — keyed on
  // a CONTENT signature, not just rfq._id, so SPA back-navigation (same id,
  // freshly-fetched data) re-applies the saved marks instead of leaving the
  // sellable default in place. Overwrites (not clobber-guarded) so it always
  // wins the race with the auto-check-sellable seed. A locally-edited (unsaved)
  // tick survives because the signature only changes when the server set does.
  const checkedSig = (rfq?.vendors || [])
    .map((v) => `${v.vendor_id}:${(v.checked_line_ids || []).join(",")}`)
    .join("|");
  useEffect(() => {
    if (isDraft || !rfq) return;
    setCheckedByVendor((prev) => {
      const next = { ...prev };
      for (const v of rfq.vendors || []) {
        const ids = Array.isArray(v.checked_line_ids) ? v.checked_line_ids : [];
        if (!ids.length) continue; // no saved set → let sellable seed defaults
        const checks = {};
        for (const lid of ids) checks[lid] = true;
        next[v.vendor_id] = checks;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?._id, checkedSig]);

  useEffect(() => {
    // "Best price selected" fires per line; with auto-select-cheapest that
    // would stack a toast for every line. The green highlight is feedback
    // enough, so suppress the success toast for the select action (RFQ_SEL).
    //
    // RFQ_CRTD (createFromLead) is suppressed too: the first "Save Prices" on a
    // draft runs create + setPrices back-to-back, and each set store.success —
    // which double-toasted. The setPrices (RFQ_PRC) toast covers the save; the
    // no-prices case toasts explicitly in persistDraftRfq.
    const SILENT_FLAGS = ["RFQ_SEL", "RFQ_CRTD"];
    if (store?.success && !SILENT_FLAGS.includes(store?.actionFlag)) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanRfqMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  // In draft mode the rows come straight from the lead's requirement items
  // (keyed by the lead-line _id) and vendors live in local state.
  const lines = isDraft
    ? (draftLead?.lines || []).map((l) => ({
        _id: l._id,
        product_id: l.product_id,
        product_name: l.product_name,
        product_code: l.product_code,
        qty: l.qty,
        unit: l.unit,
        hs_code: l.hs_code,
        part_no: l.part_no,
      }))
    : rfq?.lines || [];
  const vendors = isDraft ? draftVendors : rfq?.vendors || [];

  // Client-side pagination for the comparison grid — mirrors the
  // quotation detail's line-item table.
  const totalLines = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalLines / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageLines = lines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  // Price Comparison paginator (independent of the table above).
  const cmpTotal = lines.length;
  const cmpPageCount = Math.max(1, Math.ceil(cmpTotal / cmpPageSize));
  const cmpSafePage = Math.min(cmpPage, cmpPageCount - 1);
  const cmpStart = cmpSafePage * cmpPageSize;
  const cmpLines = lines.slice(cmpStart, cmpStart + cmpPageSize);
  useEffect(() => {
    if (cmpPage > cmpPageCount - 1) setCmpPage(Math.max(0, cmpPageCount - 1));
  }, [cmpPageCount, cmpPage]);

  // The RFQ is single-vendor. The active vendor is the one selected in the
  // dropdown, defaulting to the RFQ's saved vendor.
  const activeVendorId = addVendorId || vendors[0]?.vendor_id || "";

  // On a saved RFQ, default the active column to the first vendor so its saved
  // checks show on land. Re-default when the current selection isn't part of
  // the loaded RFQ (e.g. a stale addVendorId carried over from a previously
  // viewed RFQ via the cached rfqItem) — otherwise the grid stays blank until
  // the user clicks a chip. A valid in-list selection is left untouched.
  useEffect(() => {
    if (isDraft) return;
    const ids = (rfq?.vendors || []).map((v) => v.vendor_id);
    if (!ids.length) return;
    if (!addVendorId || !ids.includes(addVendorId)) setAddVendorId(ids[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?._id, rfq?.vendors?.length]);

  // When the active vendor changes, fetch its current price-list entries and:
  //   • tick (once) the products it supplies — leaving others selectable;
  //   • prefill each line's Price input with the vendor's last active price
  //     (blank when none) so the operator confirms or overwrites the quote.
  // A persisted/locally-edited value always wins — prefill only fills blanks.
  useEffect(() => {
    if (!addVendorId) return;

    const productIds = Array.from(
      new Set(lines.map((l) => l.product_id).filter(Boolean))
    );

    // A vendor's ticks are authoritative in this priority order:
    //   1. the server-saved set (checked_line_ids),
    //   2. the operator's manual edits this session (userTouchedVendorsRef),
    //   3. the auto-checked "this vendor supplies the product" default.
    // Only (3) is derived here, and it must never clobber (1) or (2). The old
    // code keyed this off "does checkedByVendor already hold an object?", which
    // a stale/empty object satisfied — so the auto-seed was skipped and the
    // boxes stayed unchecked even though the vendor had prices.
    const savedVendor = (rfq?.vendors || []).find(
      (v) => v.vendor_id === addVendorId
    );
    const savedIds = Array.isArray(savedVendor?.checked_line_ids)
      ? savedVendor.checked_line_ids
      : [];
    const canAutoSeed = () =>
      !savedIds.length && !userTouchedVendorsRef.current[addVendorId];

    // Always restore the server-saved set (authoritative) when one exists.
    if (savedIds.length) {
      const checks = {};
      for (const lid of savedIds) checks[lid] = true;
      setCheckedByVendor((m) => ({ ...m, [addVendorId]: checks }));
    }

    if (!productIds.length) return;

    instance
      .get(API_ENDPOINTS.priceList.currentPrices, {
        params: { vendor_id: addVendorId, product_ids: productIds.join(",") },
      })
      .then((resp) => {
        const rows = resp?.data?.data || [];
        const sellable = new Set(rows.map((r) => r.product_id));
        const priceByProduct = {};
        for (const r of rows) priceByProduct[r.product_id] = r.unit_price;

        // Auto-check the lines this vendor supplies — re-derived whenever the
        // prices resolve, but yields to a saved set or the operator's edits.
        if (canAutoSeed()) {
          const init = {};
          for (const l of lines) {
            init[l._id] = !!(l.product_id && sellable.has(l.product_id));
          }
          setCheckedByVendor((m) => ({ ...m, [addVendorId]: init }));
        }

        // Prefill the last active price for lines without a value yet.
        setPriceMap((m) => {
          const next = { ...m };
          let changed = false;
          for (const l of lines) {
            const k = key(l._id, addVendorId);
            const cur = priceByProduct[l.product_id];
            if (
              cur != null &&
              (next[k] === undefined || String(next[k]).trim() === "")
            ) {
              next[k] = limit2(cur);
              changed = true;
            }
          }
          return changed ? next : m;
        });
      })
      .catch(() => {
        if (canAutoSeed()) {
          const init = {};
          for (const l of lines) init[l._id] = false;
          setCheckedByVendor((m) => ({ ...m, [addVendorId]: init }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addVendorId, lines.length]);

  // All active vendors (not filtered) — the active vendor stays selectable for
  // export even after it's been added as a comparison column.
  const vendorOptions = (vendorStore?.vendorDropdown || []).map((v) => ({
    value: v._id,
    label: v.vendor_code
      ? `${v.company_name} [${v.vendor_code}]`
      : v.company_name,
  }));

  const alreadyAdded = (vId) => vendors.some((rv) => rv.vendor_id === vId);

  // Multi-vendor RFQ: the Select is an "Add vendor" control. Each pick APPENDS
  // a vendor (deduped) and makes it the active one; a saved RFQ persists it
  // immediately via addRfqVendors, a draft holds it locally until Save.
  const onSelectVendor = (vendorId) => {
    if (!vendorId) return;
    if (alreadyAdded(vendorId)) {
      // Already present — just switch to it as the active column.
      setAddVendorId(vendorId);
      return;
    }
    setAddVendorId(vendorId);
    if (!isDraft) {
      dispatch(addRfqVendors({ id, data: { vendor_ids: [vendorId] } }));
      return;
    }
    const raw = (vendorStore?.vendorDropdown || []).find(
      (x) => x._id === vendorId
    );
    const opt = vendorOptions.find((o) => o.value === vendorId);
    setDraftVendors((prev) => [
      ...prev,
      {
        _id: vendorId,
        vendor_id: vendorId,
        vendor_name: raw?.company_name || opt?.label || vendorId,
        vendor_code: raw?.vendor_code || "",
      },
    ]);
    setDirty(true);
  };

  // Remove a vendor's column from a draft RFQ (local only, no confirm).
  const onRemoveDraftVendor = (vendorId) => {
    setDraftVendors((prev) => prev.filter((v) => v.vendor_id !== vendorId));
    if (addVendorId === vendorId) {
      const next = draftVendors.find((v) => v.vendor_id !== vendorId);
      setAddVendorId(next?.vendor_id || "");
    }
  };

  // Change the RFQ status on a saved record. Any → any (ops may correct
  // mistakes). The redux success/error effect handles the toast; refresh after.
  const onChangeStatus = async (newStatus) => {
    if (isDraft || !newStatus || newStatus === rfq?.status) return;
    try {
      await dispatch(updateRfq({ id, data: { status: newStatus } })).unwrap();
      dispatch(getRfq(id));
    } catch (e) {
      Notification("Error", t("Could not update the status."), "warning");
    }
  };

  // Advance a draft RFQ to "sent" (fire-and-forget) — called when sheets are
  // exported. Only acts on a draft; never walks back a later stage.
  const markSentIfDraft = (rfqId, status) => {
    if (rfqId && status === "draft") {
      dispatch(updateRfq({ id: rfqId, data: { status: "sent" } }));
    }
  };

  // Detach a vendor from a saved RFQ (confirmed). Refresh after; if it drops to
  // zero, the grid's "select a vendor" empty state takes over.
  const onRemoveVendor = (vendorId) => {
    if (isDraft || !vendorId) return;
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("This vendor will be removed from the RFQ."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, remove it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await dispatch(removeRfqVendor({ id, vendorId })).unwrap();
          // Drop the dropdown selection if it pointed at the removed vendor.
          if (addVendorId === vendorId) setAddVendorId("");
          dispatch(getRfq(id));
        } catch (e) {
          Notification("Error", t("Could not remove the vendor."), "warning");
        }
      });
  };

  // Called by the import modal after a confirmed import → seed that vendor's
  // price column and refresh its greyed last-known reference.
  const handleImported = (vendorId, rows) => {
    const byProduct = {};
    for (const r of rows || []) byProduct[r.product_id] = r;
    setPriceMap((m) => {
      const next = { ...m };
      for (const l of lines) {
        const r = byProduct[l.product_id];
        if (r) next[key(l._id, vendorId)] = limit2(r.unit_price);
      }
      return next;
    });
    // Imported prices aren't persisted to the RFQ until Save.
    setDirty(true);
  };

  const collectPrices = () => {
    const prices = [];
    for (const l of lines) {
      for (const v of vendors) {
        const k = key(l._id, v.vendor_id);
        const val = priceMap[k];
        if (val !== undefined && String(val).trim() !== "") {
          // `lineRef` is the lead-line _id in draft mode (mapped to the real
          // rfq_line_id after creation) and the rfq_line_id otherwise.
          prices.push({
            lineRef: l._id,
            vendor_id: v.vendor_id,
            unit_price: String(val),
          });
        }
      }
    }
    return prices;
  };

  // Persist a draft RFQ (createFromLead + any typed prices/checks) and navigate
  // to the saved record. Returns the new rfq id, or null on failure. Shared by
  // Save AND Export so an exported sheet can never reference an unsaved RFQ.
  const persistDraftRfq = async () => {
    if (!leadIdParam) {
      Notification("Error", t("Missing lead reference."), "warning");
      return null;
    }
    if (!vendors.length) {
      Notification("Validation", t("Add at least one vendor."), "warning");
      return null;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        createRfqFromLead({
          leadId: leadIdParam,
          data: { vendor_ids: vendors.map((v) => v.vendor_id) },
        })
      ).unwrap();
      const newRfq = res?.rfqItem;
      if (!newRfq?._id) {
        Notification(
          "Error",
          res?.error || t("Could not create the RFQ."),
          "warning"
        );
        return null;
      }
      // Map each draft price's lead-line ref to the freshly-created
      // rfq_line_id (the new lines carry lead_line_id back).
      const lineByLead = {};
      for (const rl of newRfq.lines || []) {
        if (rl.lead_line_id) lineByLead[rl.lead_line_id] = rl._id;
      }
      const collected = collectPrices();
      const mapped = collected
        .map((p) => ({
          rfq_line_id: lineByLead[p.lineRef],
          vendor_id: p.vendor_id,
          unit_price: p.unit_price,
        }))
        .filter((p) => p.rfq_line_id);
      const checks = checkedByVendor[activeVendorId] || {};
      const checkedLineIds = lines
        .filter((l) => checks[l._id])
        .map((l) => lineByLead[l._id])
        .filter(Boolean);
      if (mapped.length || checkedLineIds.length) {
        // setRfqPrices (RFQ_PRC) fires its own success toast — that's the one
        // the user sees. The create toast (RFQ_CRTD) is suppressed.
        await dispatch(
          setRfqPrices({
            id: newRfq._id,
            data: {
              prices: mapped,
              checked_line_ids: checkedLineIds,
              checked_vendor_id: activeVendorId || undefined,
            },
          })
        ).unwrap();
      } else {
        // No prices/checks to persist → the create toast is suppressed, so
        // surface a single explicit "saved" toast here.
        Notification("Success", t("RFQ saved."), "success");
      }
      // Re-key the active vendor's ticks from the draft's lead-line ids to the
      // freshly-created rfq_line_ids. We SPA-navigate to the saved RFQ below,
      // but local `checkedByVendor` is retained — keyed by the old lead-line
      // ids it would no longer match the new rfq lines, so every box rendered
      // unchecked until a refresh re-seeded from the server (the "gone on first
      // save, back on refresh" bug). Pin the new keys so they carry over.
      if (activeVendorId) {
        const rekeyed = {};
        for (const lid of checkedLineIds) rekeyed[lid] = true;
        setCheckedByVendor((m) => ({ ...m, [activeVendorId]: rekeyed }));
      }
      setDirty(false);
      navigate(`${appsRoot}/rfq/view/${newRfq._id}`);
      return newRfq._id;
    } catch (e) {
      Notification("Error", t("Could not create the RFQ."), "warning");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSavePrices = async () => {
    const collected = collectPrices();

    if (isDraft) {
      await persistDraftRfq();
      return;
    }

    // Checked rfq_line_ids for the active vendor.
    const checks = checkedByVendor[activeVendorId] || {};
    const checkedLineIds = lines.filter((l) => checks[l._id]).map((l) => l._id);

    if (!collected.length && !checkedLineIds.length) {
      Notification("Validation", t("Nothing to save yet."), "warning");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        setRfqPrices({
          id,
          data: {
            prices: collected.map((p) => ({
              rfq_line_id: p.lineRef,
              vendor_id: p.vendor_id,
              unit_price: p.unit_price,
            })),
            checked_line_ids: checkedLineIds,
            checked_vendor_id: activeVendorId || undefined,
          },
        })
      ).unwrap();
      setDirty(false);
      // Keep the active vendor selected across the refetch so the saved values
      // stay on screen (the default-vendor effect won't change a valid pick).
      const keepVendor = activeVendorId;
      await dispatch(getRfq(id));
      if (keepVendor) setAddVendorId(keepVendor);
    } catch (e) {
      Notification("Error", t("Could not save prices."), "warning");
    } finally {
      setSaving(false);
    }
  };

  // Open the RFQ PDF in the in-app viewer (new tab, frontend origin) — fetched
  // via the authed API, shown there, with a correctly-named Download.
  const downloadPdf = (vendorId) =>
    openPdfViewer({
      kind: "rfq",
      id,
      name: `RFQ-${rfq?.voucher_no || id}`,
      params: vendorId ? { vendor_id: vendorId } : {},
    });

  // Export a single vendor's price-request sheet (one .xlsx) — only the checked
  // products (the ones this vendor supplies). One vendor at a time.
  const exportVendorSheet = async () => {
    if (!exportLeadId || !addVendorId) {
      Notification("Validation", t("Select a vendor first."), "warning");
      return;
    }
    // Auto-save a draft before exporting so the sheet always ties to a real
    // RFQ (and a later import can stamp source_rfq_id). The page navigates to
    // the saved RFQ; the export below still runs off the (unchanged) lead.
    let sentRfqId = id;
    let sentStatus = rfq?.status;
    if (isDraft) {
      const newId = await persistDraftRfq();
      if (!newId) return;
      sentRfqId = newId;
      sentStatus = "draft"; // freshly created RFQ
    }
    // Exporting = the request has been issued to the vendor → advance draft to
    // "sent" (no walk-back of a later stage).
    markSentIfDraft(sentRfqId, sentStatus);
    const checks = checkedByVendor[addVendorId] || {};
    const productIds = lines
      .filter((l) => checks[l._id] && l.product_id)
      .map((l) => l.product_id);
    if (!productIds.length) {
      Notification(
        "Validation",
        t("Tick at least one product to export."),
        "warning"
      );
      return;
    }
    setExporting(true);
    const sanitize = (s) =>
      (s || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const vOpt = vendorOptions.find((o) => o.value === addVendorId);
    const vName = sanitize(vOpt?.label || addVendorId.slice(0, 6));
    const base =
      sanitize(leadVoucher) ||
      (exportLeadId ? `LEAD-${exportLeadId.slice(0, 6)}` : "RFQ");
    instance
      .get(API_ENDPOINTS.rfq.vendorPriceSheet, {
        params: {
          lead_id: exportLeadId,
          vendor_id: addVendorId,
          product_ids: productIds.join(","),
        },
        responseType: "blob",
      })
      .then((resp) => {
        const blob = new Blob([resp.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `RFQ-${base}-${vName}.xlsx`;
        link.click();
      })
      .catch(() =>
        Notification("Error", t("Could not export the sheet."), "warning")
      )
      .finally(() => setExporting(false));
  };

  // Export EVERY vendor's price-request sheet at once — the backend returns a
  // zip of per-vendor .xlsx files. Mirrors the single-sheet blob/anchor flow.
  const exportAllSheets = async () => {
    if (!exportLeadId || !vendors.length) {
      Notification("Validation", t("Add at least one vendor first."), "warning");
      return;
    }
    // Auto-save a draft before exporting (see exportVendorSheet).
    let sentRfqId = id;
    let sentStatus = rfq?.status;
    if (isDraft) {
      const newId = await persistDraftRfq();
      if (!newId) return;
      sentRfqId = newId;
      sentStatus = "draft";
    }
    markSentIfDraft(sentRfqId, sentStatus);
    setExporting(true);
    const sanitize = (s) =>
      (s || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const base =
      sanitize(rfq?.voucher_no) ||
      sanitize(leadVoucher) ||
      (exportLeadId ? `LEAD-${exportLeadId.slice(0, 6)}` : "RFQ");
    instance
      .get(API_ENDPOINTS.rfq.vendorPriceSheets, {
        params: {
          lead_id: exportLeadId,
          vendor_ids: vendors.map((v) => v.vendor_id).join(","),
        },
        responseType: "blob",
      })
      .then((resp) => {
        const blob = new Blob([resp.data], { type: "application/zip" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `RFQ-${base}-sheets.zip`;
        link.click();
      })
      .catch(() =>
        Notification("Error", t("Could not export the sheets."), "warning")
      )
      .finally(() => setExporting(false));
  };

  // Export checkboxes for the active (single) vendor.
  const activeChecks = checkedByVendor[activeVendorId] || {};
  const toggleCheck = (lineId) => {
    if (!activeVendorId) return;
    userTouchedVendorsRef.current[activeVendorId] = true;
    setCheckedByVendor((m) => ({
      ...m,
      [activeVendorId]: {
        ...(m[activeVendorId] || {}),
        [lineId]: !m[activeVendorId]?.[lineId],
      },
    }));
  };
  const toggleAllChecks = (val) => {
    if (!activeVendorId) return;
    userTouchedVendorsRef.current[activeVendorId] = true;
    setCheckedByVendor((m) => {
      const next = {};
      for (const l of lines) next[l._id] = val;
      return { ...m, [activeVendorId]: next };
    });
  };
  const allChecked =
    !!activeVendorId &&
    lines.length > 0 &&
    lines.every((l) => activeChecks[l._id]);

  if (isDraft ? leadIdParam && !draftLead : !rfq) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  // Header display values — sourced from the lead in draft mode, from the
  // persisted RFQ otherwise.
  const headerVoucher = isDraft ? t("New RFQ") : rfq.voucher_no || t("RFQ");
  const headerStatus = isDraft ? "draft" : rfq.status;
  const leadCompany = isDraft ? draftLead?.company_name : rfq.lead_company_name;
  const leadVoucher = isDraft ? draftLead?.voucher_no : rfq.lead_voucher_no;
  const exportLeadId = isDraft ? leadIdParam : rfq?.lead_id;

  // The RFQ's single vendor (for the header label).
  const activeVendor =
    vendors.find((v) => v.vendor_id === activeVendorId) || vendors[0] || null;
  const activeVendorLabel = activeVendor
    ? activeVendor.vendor_code
      ? `${activeVendor.vendor_name || ""} [${activeVendor.vendor_code}]`
      : activeVendor.vendor_name || ""
    : "";

  return (
    <Fragment>
      <Card className="mb-1">
        <CardBody className="d-flex flex-wrap justify-content-between align-items-center gap-1 py-1">
          <div className="d-flex align-items-center gap-1">
            <Avatar
              initials
              color="light-primary"
              className="rounded"
              content="R"
              contentStyles={{
                borderRadius: 0,
                fontSize: "calc(18px)",
                width: "100%",
                height: "100%",
              }}
              style={{ height: "56px", width: "56px" }}
            />
            <div>
            <div className="d-flex flex-wrap align-items-center gap-1">
              <h4 className="mb-0">{headerVoucher}</h4>
              <Badge
                color={`light-${STATUS_COLOR[headerStatus] || "secondary"}`}
                className="text-capitalize"
                pill
              >
                {headerStatus}
              </Badge>
            </div>
            {/* Vendors are shown + managed in the "Collect Vendor Prices"
                card below. Lead info kept to one compact muted line so the
                pricing grid surfaces higher. */}
            {(leadCompany || leadVoucher) && (
              <div className="text-muted small mt-25 d-inline-flex flex-wrap align-items-center gap-1">
                {leadCompany && (
                  <span className="d-inline-flex align-items-center text-capitalize fw-semibold text-body">
                    <Briefcase size={13} className="me-25" />
                    {leadCompany}
                  </span>
                )}
                {leadVoucher &&
                  (exportLeadId ? (
                    <a
                      href={`${appsRoot}/leads/view/${exportLeadId}`}
                      className="text-reset text-decoration-none d-inline-flex align-items-center"
                    >
                      <Hash size={13} className="me-25" />
                      {t("Lead")} {leadVoucher}
                    </a>
                  ) : (
                    <span className="d-inline-flex align-items-center">
                      <Hash size={13} className="me-25" />
                      {t("Lead")} {leadVoucher}
                    </span>
                  ))}
              </div>
            )}
            </div>
          </div>
          <div className="d-flex gap-1 align-items-center">
            {/* Editable status — only on a saved RFQ (any → any; ops may need
                to correct mistakes). Placed beside Create Quotation. */}
            {!isDraft && (
              <StatusChangeDropdown
                label={t("Change Status")}
                toggleColor="outline-secondary"
                menuEnd
                items={STATUS_OPTIONS.map((s) => ({
                  key: s,
                  label: t(s),
                  dotColor: STATUS_COLOR[s] || "secondary",
                  current: s === rfq?.status,
                  disabled: store?.loading || s === rfq?.status,
                  onClick: () => onChangeStatus(s),
                }))}
              />
            )}
            {/* Create Quotation — seeds the wizard from this RFQ's lead and
                auto-picks the cheapest current price-list row per line. */}
            {!isDraft &&
              (rfq?.prices || []).some((p) => Number(p.unit_price) > 0) && (
              <Button
                color="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `${appsRoot}/quotations/add?rfq_id=${id}` +
                      (rfq.lead_id ? `&lead_id=${rfq.lead_id}` : "")
                  )
                }
              >
                <FileText size={14} className="me-25" /> {t("Create Quotation")}
              </Button>
            )}
            {/* Quote Request PDF — hidden (prices come via the Excel round-trip). */}
            {false && !isDraft && vendors.length > 0 && (
              <Button
                color="secondary"
                outline
                size="sm"
                onClick={() => downloadPdf()}
              >
                <Download size={14} className="me-25" /> {t("Quote Request PDF")}
              </Button>
            )}
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() => navigate(`${appsRoot}/rfq`)}
            >
              <ArrowLeft size={14} /> {t("Back")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Comparison grid */}
      <Card>
        <CardHeader className="d-flex justify-content-between align-items-start flex-wrap gap-1">
          <div>
            <CardTitle tag="h6" className="mb-25">
              {t("Collect Vendor Prices")}
            </CardTitle>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              {t(
                "Add vendors, export their price sheets, then import each filled sheet to update the price list."
              )}
            </div>
          </div>
          <div className="d-flex align-items-center flex-wrap gap-50">
            <div style={{ minWidth: 200 }}>
              <Select
                classNamePrefix="select"
                options={vendorOptions}
                // "Add vendor" control — clears after each pick so the user can
                // immediately add another vendor (the active one shows via chips).
                value={null}
                onChange={(opt) => onSelectVendor(opt?.value || "")}
                placeholder={t("+ Add vendor")}
                // Only lock while a mutation is in flight — both draft and saved
                // RFQs now hold multiple vendors.
                isDisabled={store?.loading}
                // Shrink the control to match the adjacent btn-sm height so the
                // add-vendor box and the 3 buttons line up on one row.
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 31,
                    height: 31,
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    height: 31,
                    padding: "0 8px",
                  }),
                  input: (base) => ({ ...base, margin: 0, padding: 0 }),
                  indicatorsContainer: (base) => ({ ...base, height: 31 }),
                  indicatorSeparator: () => ({ display: "none" }),
                }}
              />
            </div>
            {/* Export the active vendor's sheet only. */}
            <Button
              color="secondary"
              size="sm"
              outline
              onClick={exportVendorSheet}
              disabled={exporting || !addVendorId}
              title={t("Export the selected vendor's sheet")}
            >
              {exporting ? (
                <>
                  <Spinner size="sm" className="me-25" /> {t("Exporting…")}
                </>
              ) : (
                <>
                  <Download size={14} className="me-25" /> {t("This Vendor")}
                </>
              )}
            </Button>
            {/* Export one sheet per vendor as a zip — the main multi-vendor action. */}
            <Button
              color="primary"
              size="sm"
              outline
              onClick={exportAllSheets}
              disabled={exporting || vendors.length === 0}
              title={t("Export a sheet for every vendor (zip)")}
            >
              <Download size={14} className="me-25" />{" "}
              {t("All Sheets")}
              {vendors.length > 0 ? ` (${vendors.length})` : ""}
            </Button>
            {vendors.length > 0 && (
              <Button
                color="primary"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                title={t("Import a vendor's filled price sheet")}
              >
                <Upload size={14} className="me-25" /> {t("Import Prices")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {/* Vendor chip bar — click a chip to make it the active column,
              × removes it (draft: local; saved: confirmed via onRemoveVendor). */}
          {vendors.length > 0 && (
            <div className="d-flex flex-wrap align-items-center gap-50 mb-1">
              <span className="text-uppercase text-muted fw-bold me-25" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                {t("Vendors")}:
              </span>
              {vendors.map((v) => {
                const isActive = v.vendor_id === activeVendorId;
                const label = v.vendor_code
                  ? `${v.vendor_name || ""} [${v.vendor_code}]`
                  : v.vendor_name || "";
                return (
                  <Badge
                    key={v.vendor_id}
                    color={isActive ? "light-primary" : "light-secondary"}
                    className={`d-inline-flex align-items-center cursor-pointer${
                      isActive ? " border border-primary" : ""
                    }`}
                    role="button"
                    onClick={() => setAddVendorId(v.vendor_id)}
                    title={t("Show this vendor's prices")}
                  >
                    <span className="fw-semibold">{label}</span>
                    <span
                      className="ms-50 lh-1 d-inline-flex"
                      title={t("Remove vendor")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (store?.loading) return;
                        if (isDraft) onRemoveDraftVendor(v.vendor_id);
                        else onRemoveVendor(v.vendor_id);
                      }}
                    >
                      <X size={14} />
                    </span>
                  </Badge>
                );
              })}
            </div>
          )}
          {lines.length === 0 ? (
            <div className="text-center text-muted py-3">
              {t("This lead has no requirement items.")}
            </div>
          ) : (
            <div className="table-responsive">
              {!addVendorId && (
                <div className="text-muted small mb-1">
                  {t(
                    "Add a vendor above to tick the products they supply and export their sheet."
                  )}
                </div>
              )}
              <Table bordered size="sm" className="mb-0 align-top">
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: 36 }}>
                      <Input
                        type="checkbox"
                        checked={allChecked}
                        disabled={!activeVendorId}
                        onChange={(e) => toggleAllChecks(e.target.checked)}
                        title={t("Select all")}
                      />
                    </th>
                    <th style={{ width: 30 }}>#</th>
                    <th style={{ minWidth: 200 }}>{t("Item")}</th>
                    <th style={{ width: 120 }}>{t("HSN Code")}</th>
                    <th style={{ width: 130 }}>{t("Part No")}</th>
                    <th className="text-end" style={{ width: 110 }}>
                      {t("Qty")}
                    </th>
                    <th className="text-end" style={{ width: 120 }}>
                      {t("Price")}
                    </th>
                    <th className="text-end" style={{ width: 130 }}>
                      {t("Total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageLines.map((l, i) => {
                    const k = key(l._id, activeVendorId);
                    const priceVal = priceMap[k];
                    const hasPrice =
                      priceVal !== undefined && String(priceVal).trim() !== "";
                    const pNum = Number(priceVal) || 0;
                    const total = (Number(l.qty) || 0) * pNum;
                    return (
                      <tr key={l._id}>
                        <td className="text-center align-top">
                          <Input
                            type="checkbox"
                            checked={!!activeChecks[l._id]}
                            disabled={!activeVendorId}
                            onChange={() => toggleCheck(l._id)}
                          />
                        </td>
                        <td className="align-top">{pageStart + i + 1}</td>
                        <td className="align-top">
                          <div className="fw-semibold">
                            {l.product_name || "-"}
                          </div>
                          {l.product_code && (
                            <div className="text-muted small">
                              {l.product_code}
                            </div>
                          )}
                        </td>
                        <td className="align-top">
                          {l.hsn_code || l.hs_code || "-"}
                        </td>
                        <td className="align-top">{l.part_no || "-"}</td>
                        <td className="text-end align-top">
                          {limit2(l.qty)} {l.unit || ""}
                        </td>
                        <td className="text-end align-top">
                          <Input
                            bsSize="sm"
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className="text-end"
                            style={{ maxWidth: 120, marginLeft: "auto" }}
                            placeholder="0.00"
                            disabled={!activeVendorId || !activeChecks[l._id]}
                            value={priceVal ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPriceMap((m) => ({ ...m, [k]: v }));
                              setDirty(true);
                            }}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== "" && !Number.isNaN(Number(v))) {
                                setPriceMap((m) => ({
                                  ...m,
                                  [k]: Number(v).toFixed(2),
                                }));
                              }
                            }}
                          />
                        </td>
                        <td className="text-end align-top fw-bold">
                          {hasPrice ? `₹${total.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {totalLines > 0 && (
                <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
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
                      {t("of")} {totalLines} {t("rows")}
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
              )}

              <div className="small text-muted mt-1">
                {t(
                  "Tick the products this vendor supplies, Export the request, then Import their returned Excel to fill prices. Save to record them."
                )}
              </div>

              {vendors.length > 0 && lines.length > 0 && (
                <div className="d-flex justify-content-end align-items-center flex-wrap gap-1 mt-2">
                  <Button
                    color="primary"
                    onClick={onSavePrices}
                    disabled={saving}
                    className="py-75 px-2"
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-50" /> {t("Saving…")}
                      </>
                    ) : (
                      <>
                        <Save size={16} className="me-50" />{" "}
                        {isDraft
                          ? t("Save")
                          : t("Save Prices")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Price comparison matrix — read-only items × vendors view of every
          quoted price (lowest per item highlighted). Saved RFQ with ≥2
          vendors and at least one captured price. */}
      {!isDraft &&
        vendors.length >= 2 &&
        Object.keys(priceMap).length > 0 && (
          <Card className="mb-1">
            <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-1 py-1">
              <CardTitle tag="h6" className="mb-0">
                {t("Price Comparison")}
              </CardTitle>
              <span className="text-muted small">
                {t("Lowest price per item is highlighted")}
              </span>
            </CardHeader>
            <CardBody className="p-0">
              <Table responsive bordered size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t("Product")}</th>
                    {vendors.map((v) => (
                      <th key={v.vendor_id} className="text-end text-nowrap">
                        {v.vendor_code || v.vendor_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmpLines.map((l) => {
                    const cells = vendors.map((v) => {
                      const p = num(priceMap[key(l._id, v.vendor_id)]);
                      const eff = p > 0 ? p : null;
                      return { vid: v.vendor_id, eff };
                    });
                    const valid = cells
                      .filter((c) => c.eff != null)
                      .map((c) => c.eff);
                    const min = valid.length ? Math.min(...valid) : null;
                    return (
                      <tr key={l._id}>
                        <td className="text-wrap" style={{ minWidth: 200 }}>
                          {[l.product_code, l.product_name]
                            .filter(Boolean)
                            .join(" - ") || "-"}
                        </td>
                        {cells.map((c) => {
                          const isMin = c.eff != null && c.eff === min;
                          const txt =
                            c.eff != null
                              ? `₹${c.eff.toLocaleString("en-IN", {
                                  maximumFractionDigits: 2,
                                })}`
                              : "—";
                          return (
                            <td key={c.vid} className="text-end">
                              {isMin ? (
                                <Badge color="light-success">{txt}</Badge>
                              ) : (
                                <span className={c.eff == null ? "text-muted" : ""}>
                                  {txt}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              {cmpTotal > 0 && (
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-1 p-1">
                  <div className="d-flex align-items-center small text-muted">
                    <span className="me-50">{t("Show")}</span>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={cmpPageSize}
                      onChange={(e) => {
                        setCmpPageSize(Number(e.target.value) || 10);
                        setCmpPage(0);
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
                      {t("of")} {cmpTotal} {t("rows")}
                    </span>
                  </div>
                  <ReactPaginate
                    previousLabel=""
                    nextLabel=""
                    pageCount={cmpPageCount}
                    activeClassName="active"
                    forcePage={cmpSafePage}
                    onPageChange={({ selected }) => setCmpPage(selected)}
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
            </CardBody>
          </Card>
        )}

      <RfqImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen((v) => !v)}
        vendorId={activeVendorId}
        vendorLabel={activeVendorLabel}
        rfqId={isDraft ? "" : id}
        onImported={handleImported}
      />
    </Fragment>
  );
};

export default RfqView;
