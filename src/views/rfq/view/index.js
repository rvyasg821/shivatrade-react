// RFQ detail — vendor price comparison grid (lines × vendors), select best.
import { Fragment, useEffect, useState } from "react";
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
  UncontrolledButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
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
} from "react-feather";
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
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
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

// Cap a numeric string to at most 2 decimal places. Used for Qty/Disc display.
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
  // key(lineId, vendorId) -> discount % string
  const [discountMap, setDiscountMap] = useState({});
  // The active vendor in the Price Comparison dropdown — drives the checkbox
  // column + single-vendor export, and is what "Add" adds as a column.
  const [addVendorId, setAddVendorId] = useState("");
  // checkbox state per vendor: { vendorId: { lineId: bool } }. Auto-initialised
  // (sellable products checked) the first time a vendor is selected.
  const [checkedByVendor, setCheckedByVendor] = useState({});
  // Per-vendor Excel import (the round-trip return leg) — 2-step modal.
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [draftVendors, setDraftVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    const d = {};
    for (const p of rfq.prices || []) {
      m[key(p.rfq_line_id, p.vendor_id)] = limit2(p.unit_price ?? "");
      if (p.discount_pct != null && Number(p.discount_pct) > 0) {
        d[key(p.rfq_line_id, p.vendor_id)] = limit2(p.discount_pct);
      }
    }
    setPriceMap(m);
    setDiscountMap(d);
    // Restore the saved export checkbox state for the RFQ's vendor (only when
    // some line was ticked — otherwise let the auto-check-sellable run).
    const vendorId = rfq.vendors?.[0]?.vendor_id;
    const anyChecked = (rfq.lines || []).some((l) => l.checked);
    if (vendorId && anyChecked) {
      const checks = {};
      for (const l of rfq.lines || []) checks[l._id] = !!l.checked;
      setCheckedByVendor((prev) => ({ ...prev, [vendorId]: checks }));
    }
  }, [rfq?._id, rfq?.prices?.length]);

  useEffect(() => {
    // "Best price selected" fires per line; with auto-select-cheapest that
    // would stack a toast for every line. The green highlight is feedback
    // enough, so suppress the success toast for the select action (RFQ_SEL).
    if (store?.success && store?.actionFlag !== "RFQ_SEL") {
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

  // The RFQ is single-vendor. The active vendor is the one selected in the
  // dropdown, defaulting to the RFQ's saved vendor.
  const activeVendorId = addVendorId || vendors[0]?.vendor_id || "";

  // On a saved RFQ, default the dropdown selection to its vendor.
  useEffect(() => {
    if (isDraft) return;
    const v = rfq?.vendors?.[0]?.vendor_id;
    if (v && !addVendorId) setAddVendorId(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq?._id, rfq?.vendors?.length]);

  // When the active vendor changes, auto-check (once) the products it actually
  // supplies (a current price-list entry). Items it doesn't sell are left
  // unchecked but stay selectable.
  useEffect(() => {
    if (!addVendorId) return;
    if (checkedByVendor[addVendorId]) return; // preserve existing checks
    const productIds = Array.from(
      new Set(lines.map((l) => l.product_id).filter(Boolean))
    );
    const seed = (sellable) => {
      const init = {};
      for (const l of lines) {
        init[l._id] = !!(l.product_id && sellable.has(l.product_id));
      }
      setCheckedByVendor((m) =>
        m[addVendorId] ? m : { ...m, [addVendorId]: init }
      );
    };
    if (!productIds.length) {
      seed(new Set());
      return;
    }
    instance
      .get(API_ENDPOINTS.priceList.currentPrices, {
        params: { vendor_id: addVendorId, product_ids: productIds.join(",") },
      })
      .then((resp) =>
        seed(new Set((resp?.data?.data || []).map((r) => r.product_id)))
      )
      .catch(() => seed(new Set()));
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
  // column (price + discount) and refresh its greyed last-known reference.
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
    setDiscountMap((m) => {
      const next = { ...m };
      for (const l of lines) {
        const r = byProduct[l.product_id];
        if (r && r.discount_pct != null && Number(r.discount_pct) > 0) {
          next[key(l._id, vendorId)] = limit2(r.discount_pct);
        }
      }
      return next;
    });
  };

  const collectPrices = () => {
    const prices = [];
    for (const l of lines) {
      for (const v of vendors) {
        const k = key(l._id, v.vendor_id);
        const val = priceMap[k];
        if (val !== undefined && String(val).trim() !== "") {
          const disc = discountMap[k];
          // `lineRef` is the lead-line _id in draft mode (mapped to the real
          // rfq_line_id after creation) and the rfq_line_id otherwise.
          prices.push({
            lineRef: l._id,
            vendor_id: v.vendor_id,
            unit_price: String(val),
            discount_pct:
              disc !== undefined && String(disc).trim() !== ""
                ? String(disc)
                : "0",
          });
        }
      }
    }
    return prices;
  };

  const onSavePrices = async () => {
    const collected = collectPrices();

    if (isDraft) {
      // Persist the RFQ as soon as vendors are chosen — prices arrive days
      // later via the Excel round-trip, so the RFQ must survive a navigate-away.
      // Prices are optional at this point.
      if (!leadIdParam) {
        Notification("Error", t("Missing lead reference."), "warning");
        return;
      }
      if (!vendors.length) {
        Notification("Validation", t("Add at least one vendor."), "warning");
        return;
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
          return;
        }
        // Map each draft price's lead-line ref to the freshly-created
        // rfq_line_id (the new lines carry lead_line_id back).
        const lineByLead = {};
        for (const rl of newRfq.lines || []) {
          if (rl.lead_line_id) lineByLead[rl.lead_line_id] = rl._id;
        }
        const mapped = collected
          .map((p) => ({
            rfq_line_id: lineByLead[p.lineRef],
            vendor_id: p.vendor_id,
            unit_price: p.unit_price,
            discount_pct: p.discount_pct,
          }))
          .filter((p) => p.rfq_line_id);
        // Persist the export checkbox state (lead-line ids → rfq_line ids).
        const checks = checkedByVendor[activeVendorId] || {};
        const checkedLineIds = lines
          .filter((l) => checks[l._id])
          .map((l) => lineByLead[l._id])
          .filter(Boolean);
        if (mapped.length || checkedLineIds.length) {
          await dispatch(
            setRfqPrices({
              id: newRfq._id,
              data: { prices: mapped, checked_line_ids: checkedLineIds },
            })
          ).unwrap();
        }
        navigate(`${appsRoot}/rfq/view/${newRfq._id}`);
      } catch (e) {
        Notification("Error", t("Could not create the RFQ."), "warning");
      } finally {
        setSaving(false);
      }
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
              discount_pct: p.discount_pct,
            })),
            checked_line_ids: checkedLineIds,
          },
        })
      ).unwrap();
    } catch (e) {
      Notification("Error", t("Could not save prices."), "warning");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = (vendorId) => {
    const url = `${API_ENDPOINTS.rfq.pdf}/${id}/pdf${vendorId ? `?vendor_id=${vendorId}` : ""}`;
    setPdfLoading(true);
    instance
      .get(url, { responseType: "blob" })
      .then((resp) => {
        const blob = new Blob([resp.data], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `RFQ-${rfq?.voucher_no || id}.pdf`;
        link.click();
      })
      .catch(() =>
        Notification("Error", t("Could not generate the PDF."), "warning")
      )
      .finally(() => setPdfLoading(false));
  };

  // Export a single vendor's price-request sheet (one .xlsx) — only the checked
  // products (the ones this vendor supplies). One vendor at a time.
  const exportVendorSheet = () => {
    if (!exportLeadId || !addVendorId) {
      Notification("Validation", t("Select a vendor first."), "warning");
      return;
    }
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
  const exportAllSheets = () => {
    if (!exportLeadId || !vendors.length) {
      Notification("Validation", t("Add at least one vendor first."), "warning");
      return;
    }
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
        <CardBody className="d-flex flex-wrap justify-content-between align-items-start gap-1">
          <div>
            <h4 className="mb-0 d-flex flex-wrap align-items-center gap-1">
              <span>{headerVoucher}</span>
              <Badge
                color={`light-${STATUS_COLOR[headerStatus] || "secondary"}`}
                className="text-capitalize"
              >
                {headerStatus}
              </Badge>
              {/* Editable status — only on a saved RFQ (a draft has no id yet).
                  Any → any transition; ops may need to correct mistakes. */}
              {!isDraft && (
                <UncontrolledButtonDropdown>
                  <DropdownToggle color="flat-secondary" size="sm" caret>
                    {t("Change Status")}
                  </DropdownToggle>
                  <DropdownMenu>
                    {STATUS_OPTIONS.map((s) => (
                      <DropdownItem
                        key={s}
                        className="text-capitalize"
                        active={s === rfq?.status}
                        disabled={store?.loading}
                        onClick={() => onChangeStatus(s)}
                      >
                        {t(s)}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </UncontrolledButtonDropdown>
              )}
            </h4>
            {vendors.length > 0 && (
              <div className="mt-50 d-flex flex-wrap align-items-center gap-50">
                <span className="text-uppercase text-muted fw-bold" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                  {vendors.length > 1 ? t("Vendors") : t("Vendor")}:
                </span>{" "}
                {vendors.map((v) => {
                  const label = v.vendor_code
                    ? `${v.vendor_name || ""} [${v.vendor_code}]`
                    : v.vendor_name || "";
                  return (
                    <Badge
                      key={v.vendor_id}
                      color="light-secondary"
                      className="d-inline-flex align-items-center"
                    >
                      <span className="fw-semibold">{label}</span>
                      {/* Detach this vendor — saved RFQ only. */}
                      {!isDraft && (
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 ms-50 text-danger lh-1"
                          disabled={store?.loading}
                          title={t("Remove vendor")}
                          onClick={() => onRemoveVendor(v.vendor_id)}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
            {(leadCompany || leadVoucher) && (
              <div className="mt-50">
                <div className="text-uppercase text-muted fw-bold" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                  {t("Lead Details")}
                </div>
                {leadCompany && (
                  <div className="fw-semibold text-capitalize mt-25">
                    {leadCompany}
                  </div>
                )}
                <div className="text-muted small d-flex flex-wrap gap-1">
                  {leadVoucher && (
                    <span>
                      {t("Lead")}: {leadVoucher}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="d-flex gap-1">
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
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <>
                    <Spinner size="sm" className="me-25" /> {t("Generating…")}
                  </>
                ) : (
                  <>
                    <Download size={14} className="me-25" /> {t("Quote Request PDF")}
                  </>
                )}
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
        <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-1">
          <CardTitle tag="h6" className="mb-0">
            {t("Vendor Prices")}
          </CardTitle>
          <div className="d-flex align-items-center flex-wrap gap-1">
            <div style={{ minWidth: 220 }}>
              <Select
                classNamePrefix="select"
                options={vendorOptions}
                // "Add vendor" control — clears after each pick so the user can
                // immediately add another vendor (the active one shows via chips).
                value={null}
                onChange={(opt) => onSelectVendor(opt?.value || "")}
                placeholder={t("Add a vendor…")}
                // Only lock while a mutation is in flight — both draft and saved
                // RFQs now hold multiple vendors.
                isDisabled={store?.loading}
              />
            </div>
            <Button
              color="success"
              size="sm"
              outline
              onClick={exportVendorSheet}
              disabled={exporting || !addVendorId}
            >
              {exporting ? (
                <>
                  <Spinner size="sm" className="me-25" /> {t("Exporting…")}
                </>
              ) : (
                <>
                  <Download size={14} className="me-25" /> {t("Export Excel")}
                </>
              )}
            </Button>
            <Button
              color="success"
              size="sm"
              outline
              onClick={exportAllSheets}
              disabled={exporting || vendors.length === 0}
              title={t("Export a sheet for every vendor (zip)")}
            >
              <Download size={14} className="me-25" />{" "}
              {t("Export Sheets (All Vendors)")}
            </Button>
            {vendors.length > 0 && (
              <Button
                color="success"
                size="sm"
                outline
                onClick={() => setImportModalOpen(true)}
              >
                <Upload size={14} className="me-25" />{" "}
                {t("Import vendor prices")}
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
                    <th style={{ minWidth: 220 }}>{t("Item")}</th>
                    <th className="text-end" style={{ width: 110 }}>
                      {t("Qty")}
                    </th>
                    <th className="text-end" style={{ width: 120 }}>
                      {t("Price")}
                    </th>
                    <th className="text-end" style={{ width: 90 }}>
                      {t("Disc %")}
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
                    const dNum = Number(discountMap[k]) || 0;
                    const net = pNum * (1 - dNum / 100);
                    const total = (Number(l.qty) || 0) * net;
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
                        <td className="text-end align-top">
                          {limit2(l.qty)} {l.unit || ""}
                        </td>
                        <td className="text-end align-top">
                          {hasPrice ? `₹${pNum.toFixed(2)}` : "-"}
                        </td>
                        <td className="text-end align-top">
                          {dNum > 0 ? `${limit2(dNum)}%` : "-"}
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
