// ── PO Generate Preview Modal ──────────────────────────────────────
// Reusable modal that drives the "Generate Sales Order + Vendor POs"
// auto-split flow from a PFI or a Quotation. Loads preview lines (one row
// per source line with a candidate-vendor list) and walks the user through
// a 3-step wizard:
//   1. Assign Vendors   — pick/confirm a vendor per line (cheapest pre-picked)
//   2. Order & Charges   — Sales-Order details (deliver-to, customer PO,
//                          advance) + optional per-vendor charges
//   3. Review & Confirm  — exact summary of what will be created
//
// Currency note: vendor costs are stored in INR (₹) — that's what the
// per-line rate / per-vendor totals show. The customer advance is in the
// source document's currency (sourceCurrencySym), labelled separately.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Badge,
  Spinner,
  Input,
} from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle,
  Truck,
  FileText,
} from "react-feather";
import { useDispatch, useSelector } from "react-redux";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import { appsRoot } from "@constant/defaultValues";
import LocationSelect from "@src/views/_shared/LocationSelect";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

const STEPS = [
  { n: 1, key: "vendors", label: "Assign Vendors", icon: Truck },
  { n: 2, key: "order", label: "Order & Charges", icon: FileText },
  { n: 3, key: "review", label: "Review & Confirm", icon: CheckCircle },
];

/**
 * Props:
 *   isOpen, toggle
 *   sourceType: 'pfi' | 'quotation'
 *   sourceId: uuid
 *   sourceVoucherNo: string (header text only)
 *   onCreated: optional callback fired after successful create (passed
 *     `{purchase_order, po_vendors[]}` so the parent can refresh).
 */
const PoGeneratePreviewModal = ({
  isOpen,
  toggle,
  sourceType,
  sourceId,
  sourceVoucherNo,
  onCreated,
  // Render as a full page (Card chrome) instead of a modal. The page passes
  // isOpen=true so the preview loads on mount.
  asPage = false,
}) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewLines, setPreviewLines] = useState([]);
  // assignment[source_line_id] = vendor_id ("" if user removed it)
  const [assignment, setAssignment] = useState({});
  // dropped[source_line_id] = true if user removed from batch
  const [dropped, setDropped] = useState({});
  // Deliver-to address (applies to every PO created in this batch).
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [locations, setLocations] = useState([]);
  // Customer order reference + advance (S4) — captured on the Sales Order.
  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  // Source doc grand total (customer currency) — advance must be below it.
  const [sourceGrandTotal, setSourceGrandTotal] = useState(0);
  const [sourceCurrencySym, setSourceCurrencySym] = useState("");
  // Per-vendor expense picks. Shape: { [vendor_id]: [{ expense_id, type, value }] }.
  const [vendorExpenses, setVendorExpenses] = useState({});
  // 3-step wizard: 1 = Assign Vendors, 2 = Order & Charges, 3 = Review.
  const [step, setStep] = useState(1);
  // Pagination for the lines table (step 1).
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // ── Expense master (loaded once when modal opens) ───────────────────
  const dispatch = useDispatch();
  const expenseStore = useSelector((s) => s.expense);
  useEffect(() => {
    if (isOpen && !(expenseStore?.expenseDropdown?.length)) {
      dispatch(getExpenseDropdown());
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
    [expenseStore?.expenseDropdown],
  );
  const expenseTypeOptions = REBATE_EXPENSE_TYPE_OPTIONS;

  const previewEndpoint =
    sourceType === "pfi"
      ? `${API_ENDPOINTS.purchaseOrders.previewFromPfi}/${sourceId}`
      : `${API_ENDPOINTS.purchaseOrders.previewFromQuotation}/${sourceId}`;

  const createEndpoint =
    sourceType === "pfi"
      ? `${API_ENDPOINTS.purchaseOrders.fromPfi}/${sourceId}`
      : `${API_ENDPOINTS.purchaseOrders.fromQuotation}/${sourceId}`;

  useEffect(() => {
    if (!isOpen || !sourceId) return;
    setLoading(true);
    setPreviewLines([]);
    setAssignment({});
    setDropped({});
    setVendorExpenses({});
    setStep(1);
    setPage(0);
    setCustomerPoNumber("");
    setAdvanceAmount("");
    setAdvanceDate("");
    setAdvanceNotes("");
    // Reset deliver-to on every open so we re-derive from the response
    // (existing PO's address if any, else LocationSelect's auto-default).
    setDeliveryAddressId("");
    instance
      .get(previewEndpoint)
      .then((resp) => {
        const data = resp?.data?.data || {};
        const lines = data.lines || [];
        setPreviewLines(lines);
        setSourceGrandTotal(Number(data?.source?.grand_total) || 0);
        setSourceCurrencySym(data?.source?.currency_symbol || "");
        const seeded = {};
        const seedDropped = {};
        for (const l of lines) {
          seeded[l.source_line_id] = l.suggested_vendor_id || "";
          // Auto-drop fully covered lines so they don't re-book by default.
          if (l.fully_covered) seedDropped[l.source_line_id] = true;
        }
        setAssignment(seeded);
        setDropped(seedDropped);
        // Prefill deliver-to with whatever the existing downstream PO
        // used so PFI + Quotation modals agree. Falls through to
        // LocationSelect's auto-default when no PO exists yet.
        if (data.existing_delivery_address_id) {
          setDeliveryAddressId(data.existing_delivery_address_id);
        }
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
  }, [isOpen, sourceId, previewEndpoint]);

  const handleVendorChange = (lineId, vendorId) => {
    setAssignment((s) => ({ ...s, [lineId]: vendorId }));
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

  // Group preview into per-vendor summary (only for non-dropped lines).
  const vendorSummary = useMemo(() => {
    const map = new Map();
    for (const l of previewLines) {
      if (dropped[l.source_line_id]) continue;
      const vid = assignment[l.source_line_id];
      if (!vid) continue;
      const c = (l.candidate_vendors || []).find((v) => v.vendor_id === vid);
      const name = c?.vendor_name || vid;
      const existing = map.get(vid) || {
        vendor_id: vid,
        vendor_name: name,
        lines: 0,
        total: 0,
      };
      const qty = Number(l.qty) || 0;
      const price = Number(c?.unit_price) || 0;
      existing.lines += 1;
      existing.total += qty * price;
      map.set(vid, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.vendor_name || "").localeCompare(b.vendor_name || "")
    );
  }, [previewLines, assignment, dropped]);

  // Pagination — slice the lines table by page/pageSize.
  const totalRows = previewLines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedLines = previewLines.slice(pageStart, pageEnd);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  // Prune vendorExpenses entries for vendors no longer in the batch
  // (e.g. user dropped every line for that vendor).
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
  }, [vendorSummary]);

  const hasUnassignedActiveLines = previewLines.some(
    (l) =>
      !dropped[l.source_line_id] &&
      (!assignment[l.source_line_id] || l.unassigned)
  );

  // Charges total for a single vendor block (sum of percent/fixed rows).
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

  // Resolve the deliver-to location to a human label for the review step.
  const deliveryInfo = useMemo(() => {
    const loc = (locations || []).find(
      (l) => String(l?._id) === String(deliveryAddressId)
    );
    if (!loc) return null;
    const name =
      loc.location_name || loc.name || loc.title || loc.label || "";
    const address = [
      loc.address_line1,
      loc.address_line2,
      loc.city,
      loc.state,
      loc.country,
    ]
      .filter(Boolean)
      .join(", ");
    return { name, address };
  }, [locations, deliveryAddressId]);

  // Advance must stay below the order's grand total.
  const advanceTooHigh =
    advanceAmount !== "" &&
    sourceGrandTotal > 0 &&
    Number(advanceAmount) >= sourceGrandTotal;

  // ── Step gating ─────────────────────────────────────────────────────
  const vendorsStepValid =
    !loading && !hasUnassignedActiveLines && vendorSummary.length > 0;
  const orderStepValid = vendorsStepValid && !!deliveryAddressId && !advanceTooHigh;
  const canGoTo = (target) => {
    if (target <= step) return true; // back navigation always allowed
    if (target === 2) return vendorsStepValid;
    if (target === 3) return orderStepValid;
    return true;
  };

  const onCreate = async () => {
    if (creating) return;
    if (hasUnassignedActiveLines) {
      Notification(
        "Validation",
        t("Some lines have no vendor. Drop or assign them first."),
        "warning"
      );
      return;
    }
    const assignments = previewLines
      .filter((l) => !dropped[l.source_line_id] && assignment[l.source_line_id])
      .map((l) => ({
        source_line_id: l.source_line_id,
        vendor_id: assignment[l.source_line_id],
      }));
    if (assignments.length === 0) {
      Notification("Validation", t("No lines to convert."), "warning");
      return;
    }
    if (!deliveryAddressId) {
      Notification(
        "Validation",
        t("Pick a delivery address before generating POs."),
        "warning"
      );
      return;
    }
    // Advance must be below the order's grand total.
    if (
      advanceAmount !== "" &&
      sourceGrandTotal > 0 &&
      Number(advanceAmount) >= sourceGrandTotal
    ) {
      Notification(
        "Validation",
        t("Advance amount must be less than the order total."),
        "warning"
      );
      return;
    }
    setCreating(true);
    try {
      // Trim out empty vendor blocks (no rows) and rows missing expense_id.
      const trimmedExpenses = {};
      for (const [vid, rows] of Object.entries(vendorExpenses)) {
        const cleaned = (rows || []).filter((r) => r?.expense_id);
        if (cleaned.length) {
          trimmedExpenses[vid] = cleaned.map((r) => ({
            expense_id: r.expense_id,
            type: r.type || "percent",
            value: r.value || "0",
          }));
        }
      }
      const resp = await instance.post(createEndpoint, {
        assignments,
        delivery_address_id: deliveryAddressId,
        vendor_expenses: trimmedExpenses,
        customer_po_number: customerPoNumber?.trim() || undefined,
        advance_amount:
          advanceAmount === "" || advanceAmount == null
            ? undefined
            : String(advanceAmount),
        advance_date: advanceDate || undefined,
        advance_notes: advanceNotes?.trim() || undefined,
      });
      const purchaseOrder = resp?.data?.data?.purchase_order;
      const povs = resp?.data?.data?.po_vendors || [];

      if (!purchaseOrder) {
        Notification(
          "Error",
          t("Sales Order creation failed. Please try again."),
          "warning"
        );
        return;
      }

      Notification(
        "Success",
        t(
          `Sales Order ${purchaseOrder.voucher_no || ""} + ${povs.length} Vendor PO(s) created.`
        ),
        "success"
      );
      onCreated?.({ purchase_order: purchaseOrder, po_vendors: povs });
      toggle?.();
      // Stay on the calling page (PFI / Quotation detail). The parent's
      // onCreated callback is expected to refresh coverage if needed.
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Failed to create PO"),
        "warning"
      );
    } finally {
      setCreating(false);
    }
  };

  // ── Stepper (numbered circles + connecting lines) ───────────────────
  const renderStepper = () => (
    <div className="d-flex justify-content-center align-items-center mb-2 mt-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = step === s.n;
        const done = step > s.n;
        const reachable = canGoTo(s.n);
        const disabled = !reachable;
        return (
          <div key={s.key} className="d-flex align-items-center">
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => reachable && setStep(s.n)}
              onKeyDown={(e) => {
                if (reachable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setStep(s.n);
                }
              }}
              className="d-inline-flex align-items-center"
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1,
                userSelect: "none",
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle me-1"
                style={{
                  width: 30,
                  height: 30,
                  background: active
                    ? "rgb(115, 103, 240)"
                    : done
                    ? "rgba(40,199,111,0.12)"
                    : "#fff",
                  color: active
                    ? "#fff"
                    : done
                    ? "#28c76f"
                    : "#b9b9c3",
                  border: active
                    ? "none"
                    : done
                    ? "1px solid #28c76f"
                    : "1px solid #d8d6de",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                {done ? <CheckCircle size={16} /> : <Icon size={15} />}
              </div>
              <span
                className={`ms-25 ${active ? "fw-bold" : "text-muted"}`}
                style={{ color: active ? "#7367f0" : undefined }}
              >
                {t(s.label)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="mx-2"
                style={{
                  width: 56,
                  height: 2,
                  background: step > s.n ? "#28c76f" : "#d8d6de",
                  display: "inline-block",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Step 1: Assign Vendors ──────────────────────────────────────────
  const renderVendorsStep = () => (
    <>
      {previewLines.every((l) => l.fully_covered) && (
        <div className="alert alert-info small mb-2">
          <AlertTriangle size={14} className="me-1" />
          {t(
            "All lines are already covered by existing Sales Orders. To add another, restore a line below."
          )}
        </div>
      )}

      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th style={{ width: 80 }} className="text-end">
                {t("Qty")}
              </th>
              <th style={{ minWidth: 300 }}>{t("Vendor")} (₹)</th>
              <th style={{ width: 110 }} className="text-end">
                {t("Rate")}
              </th>
              <th style={{ width: 110 }} className="text-end">
                {t("Total")}
              </th>
              <th style={{ width: 80 }} className="text-center">
                {t("Action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedLines.map((l, i) => {
              const idx = pageStart + i;
              const isDropped = !!dropped[l.source_line_id];
              const cands = (l.candidate_vendors || [])
                .slice()
                .sort(
                  (a, b) => Number(a.unit_price) - Number(b.unit_price)
                );
              const cheapestId = cands[0]?.vendor_id;
              const picked = assignment[l.source_line_id];
              const pickedCand = cands.find((c) => c.vendor_id === picked);
              const qty = Number(l.qty) || 0;
              const total = qty * Number(pickedCand?.unit_price || 0);
              const isUnassigned = l.unassigned || (!picked && !isDropped);
              const rowStyle = isDropped
                ? { opacity: 0.4 }
                : isUnassigned
                ? { backgroundColor: "rgba(220,53,69,0.08)" }
                : {};
              const vendorOptions = cands.map((c) => ({
                value: c.vendor_id,
                label: `${c.vendor_name} · ₹${fmt(c.unit_price)}`,
                isCheapest: c.vendor_id === cheapestId,
                raw: c,
              }));
              return (
                <tr key={l.source_line_id} style={rowStyle}>
                  <td>{idx + 1}</td>
                  <td>
                    <div
                      className="fw-semibold"
                      style={
                        isDropped ? { textDecoration: "line-through" } : {}
                      }
                    >
                      {l.product_name || "-"}
                    </div>
                    {l.product_code && (
                      <small className="text-muted">{l.product_code}</small>
                    )}
                    {l.hsn_code && (
                      <div className="small text-muted">HSN: {l.hsn_code}</div>
                    )}
                    {(l.existing_pos || []).length > 0 && (
                      <div className="mt-1">
                        {l.fully_covered ? (
                          <Badge color="light-success" className="me-50">
                            {t("Fully covered")}
                          </Badge>
                        ) : (
                          <Badge color="light-info" className="me-50">
                            {t("Partially covered")}: {fmt(l.covered_qty)} /{" "}
                            {fmt(l.ordered_qty)}
                          </Badge>
                        )}
                        <div className="small text-muted mt-25">
                          {l.existing_pos.map((p, j) => (
                            <span key={p.purchase_order_id}>
                              {j > 0 ? ", " : ""}
                              <Link
                                to={`${appsRoot}/purchase-orders/view/${p.purchase_order_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="d-inline-flex align-items-center"
                              >
                                {p.voucher_no}
                                <ExternalLink size={10} className="ms-25" />
                              </Link>
                              <span className="text-muted"> ({fmt(p.qty)})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="text-end">
                    {fmt(l.qty)} {l.unit ? <small>{l.unit}</small> : null}
                  </td>
                  <td>
                    {l.unassigned || cands.length === 0 ? (
                      <div className="text-danger d-flex align-items-center small">
                        <AlertTriangle size={14} className="me-1 flex-shrink-0" />
                        <span>
                          {t(
                            "No vendor — add this product to a vendor's price list"
                          )}
                        </span>
                      </div>
                    ) : (
                      <Select
                        classNamePrefix="select"
                        isDisabled={isDropped}
                        options={vendorOptions}
                        value={
                          vendorOptions.find((o) => o.value === picked) || null
                        }
                        onChange={(opt) =>
                          handleVendorChange(l.source_line_id, opt?.value || "")
                        }
                        placeholder={t("Pick vendor…")}
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
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        }}
                      />
                    )}
                  </td>
                  <td className="text-end">
                    {pickedCand ? `₹${fmt(pickedCand.unit_price)}` : "-"}
                  </td>
                  <td className="text-end fw-bold">
                    {pickedCand ? `₹${fmt(total)}` : "-"}
                  </td>
                  <td className="text-center">
                    {isDropped ? (
                      <Button
                        size="sm"
                        color="secondary"
                        outline
                        onClick={() => handleRestore(l.source_line_id)}
                      >
                        {t("Restore")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        color="danger"
                        outline
                        onClick={() => handleDrop(l.source_line_id)}
                      >
                        {t("Drop")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalRows > 0 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1">
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
      )}

      {hasUnassignedActiveLines && (
        <div className="alert alert-warning small mt-3 mb-0">
          <AlertTriangle size={14} className="me-1" />
          {t(
            "Some lines have no vendor assigned. Drop them from this batch or add the product to a vendor's price list before continuing."
          )}
        </div>
      )}

      {vendorSummary.length > 0 && (
        <div className="alert alert-info small mt-3 mb-0">
          {t("Will create")}: <strong>1 {t("Sales Order")}</strong> +{" "}
          <strong>
            {vendorSummary.length} {t("Vendor PO(s)")}
          </strong>
          . {t("Continue to add order details and optional vendor charges.")}
        </div>
      )}
    </>
  );

  // ── Step 2: Order & Charges ─────────────────────────────────────────
  const renderOrderStep = () => (
    <div className="row g-2">
      {/* Left — Sales Order (customer side) */}
      <div className="col-lg-5">
        <div
          className="po-gen-card h-100"
        >
          <div className="po-gen-head">
            <FileText size={15} className="me-1 text-primary" />
            <span className="fw-semibold">{t("Sales Order")}</span>
            <span className="ms-1 small text-muted">({t("customer side")})</span>
          </div>
          <div className="p-2">
            <div className="mb-2">
              <label className="form-label fw-semibold">
                {t("Deliver goods to")} <span className="text-danger">*</span>
              </label>
              <LocationSelect
                value={deliveryAddressId}
                onChange={setDeliveryAddressId}
                onLocationsLoaded={setLocations}
              />
              <small className="text-muted">
                {t(
                  "Vendors will deliver to this location. Pick from your Locations master."
                )}
              </small>
              {!locations.length && (
                <div className="alert alert-warning small mt-2 mb-0">
                  {t("No locations on file.")}{" "}
                  <a
                    href={`${appsRoot}/locations`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Add one in Locations")}
                  </a>
                </div>
              )}
            </div>

            <div className="mb-2">
              <label className="form-label fw-semibold">
                {t("Customer PO #")}
              </label>
              <input
                type="text"
                className="form-control"
                maxLength={100}
                value={customerPoNumber}
                onChange={(e) => setCustomerPoNumber(e.target.value)}
                placeholder={t("Buyer's own PO number")}
              />
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label fw-semibold">
                  {t("Advance Amount")}
                  {sourceCurrencySym ? ` (${sourceCurrencySym})` : ""}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`form-control${advanceTooHigh ? " is-invalid" : ""}`}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                />
                {advanceTooHigh ? (
                  <small className="text-danger">
                    {t("Must be less than the order total")} (
                    {sourceCurrencySym}
                    {sourceGrandTotal.toLocaleString()})
                  </small>
                ) : (
                  sourceGrandTotal > 0 && (
                    <small className="text-muted">
                      {t("Order total")}: {sourceCurrencySym}
                      {sourceGrandTotal.toLocaleString()}
                    </small>
                  )
                )}
              </div>
              <div className="col-6">
                <label className="form-label fw-semibold">
                  {t("Advance Date")}
                </label>
                <DateInput
                  id="po-advance-date"
                  value={advanceDate}
                  onChange={(_d, _s, iso) => setAdvanceDate(iso || "")}
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="form-label fw-semibold">
                {t("Advance Notes")}
              </label>
              <input
                type="text"
                className="form-control"
                maxLength={200}
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right — per-vendor charges (vendor side) */}
      <div className="col-lg-7">
        {vendorSummary.map((v) => {
          const rows = vendorExpenses[v.vendor_id] || [];
          const usedIds = new Set(
            rows.map((r) => r.expense_id).filter(Boolean)
          );
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
                  code: "",
                  name: "",
                },
              ],
            }));
          const chargesTotal = chargesFor(v);
          return (
            <div
              key={v.vendor_id}
              className="po-gen-card mb-2"
            >
              <div className="po-gen-head justify-content-between">
                <div className="small">
                  <span className="text-muted">{t("PO to")}: </span>
                  <span className="fw-semibold">{v.vendor_name}</span>
                  <span className="ms-1">
                    · {v.lines} {t("line(s)")} · ₹{fmt(v.total)}
                    {chargesTotal > 0 && (
                      <>
                        {" "}+ {t("Charges")} ₹{fmt(chargesTotal)} ={" "}
                        <strong>₹{fmt(v.total + chargesTotal)}</strong>{" "}
                        <span className="text-muted">({t("Taxable")})</span>
                      </>
                    )}
                  </span>
                </div>
                <Button size="sm" color="primary" outline onClick={addRow}>
                  <Plus size={12} className="me-25" />
                  {t("Add Expense")}
                </Button>
              </div>
              <div className="p-1">
                {rows.length === 0 && (
                  <div className="text-muted small text-center py-2">
                    {t(
                      "No charges. Click Add Expense to include Packing, Transport, etc."
                    )}
                  </div>
                )}
                {rows.length > 0 && (
                  <Table size="sm" bordered className="mb-0 small align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: 200 }}>{t("Expense")}</th>
                        <th style={{ width: 150 }}>{t("Type")}</th>
                        <th style={{ width: 100 }}>{t("Value")}</th>
                        <th style={{ width: 100 }} className="text-end">
                          {t("Amount")}
                        </th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const pickOptions = expenseOptions.filter(
                          (o) =>
                            o.value === r.expense_id || !usedIds.has(o.value)
                        );
                        const amt =
                          r.type === "percent"
                            ? (v.total * Number(r.value || 0)) / 100
                            : Number(r.value || 0);
                        return (
                          <tr key={idx}>
                            <td>
                              <Select
                                classNamePrefix="select"
                                options={pickOptions}
                                value={
                                  expenseOptions.find(
                                    (o) => o.value === r.expense_id
                                  ) || null
                                }
                                onChange={(opt) => {
                                  if (!opt) {
                                    updateRow(idx, {
                                      expense_id: "",
                                      code: "",
                                      name: "",
                                    });
                                    return;
                                  }
                                  updateRow(idx, {
                                    expense_id: opt.value,
                                    code: opt.raw?.code || "",
                                    name: opt.raw?.name || "",
                                    type: opt.raw?.type || r.type,
                                    value:
                                      opt.raw?.value != null
                                        ? String(opt.raw.value)
                                        : r.value,
                                  });
                                }}
                                placeholder={t("Pick expense…")}
                                menuPortalTarget={document.body}
                                menuPlacement="auto"
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                  menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                                }}
                              />
                            </td>
                            <td>
                              <Select
                                classNamePrefix="select"
                                options={expenseTypeOptions}
                                value={
                                  expenseTypeOptions.find(
                                    (o) => o.value === r.type
                                  ) || expenseTypeOptions[0]
                                }
                                onChange={(opt) =>
                                  updateRow(idx, { type: opt.value })
                                }
                                menuPortalTarget={document.body}
                                menuPlacement="auto"
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                  menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                                }}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                bsSize="sm"
                                value={r.value}
                                onChange={(e) =>
                                  updateRow(idx, { value: e.target.value })
                                }
                              />
                            </td>
                            <td className="text-end">₹{fmt(amt)}</td>
                            <td className="text-center">
                              <Button
                                size="sm"
                                color="danger"
                                outline
                                onClick={() => removeRow(idx)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Step 3: Review & Confirm ────────────────────────────────────────
  const renderReviewStep = () => {
    const totalLines = vendorSummary.reduce((s, v) => s + v.lines, 0);
    return (
      <div>
        <div className="alert alert-success d-flex align-items-center mb-3">
          <CheckCircle size={18} className="me-1 flex-shrink-0" />
          <span>
            {t("Ready to create")}{" "}
            <strong>1 {t("Sales Order")}</strong> {t("and")}{" "}
            <strong>
              {vendorSummary.length} {t("Vendor PO(s)")}
            </strong>{" "}
            ({totalLines} {t("line(s)")}). {t("Review the details below.")}
          </span>
        </div>

        {/* Sales Order summary */}
        <div className="po-gen-card mb-3">
          <div className="po-gen-head">
            <FileText size={15} className="me-1 text-primary" />
            <span className="fw-semibold">{t("Sales Order")}</span>
            <span className="ms-1 small text-muted">
              {t("from")} {sourceVoucherNo}
            </span>
          </div>
          <div className="p-2 small">
            <div className="row g-2">
              <div className="col-md-6">
                <span>
                  <span className="text-muted">{t("Deliver to")}: </span>
                  {deliveryInfo ? (
                    <>
                      {deliveryInfo.name ? (
                        <span className="fw-semibold">{deliveryInfo.name}</span>
                      ) : null}
                      {deliveryInfo.address ? (
                        <div className="small text-muted">
                          {deliveryInfo.address}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="fw-semibold">
                      {t("(selected location)")}
                    </span>
                  )}
                </span>
              </div>
              <div className="col-md-6">
                <span className="text-muted">{t("Customer PO #")}: </span>
                <span className="fw-semibold">{customerPoNumber || "—"}</span>
              </div>
              <div className="col-md-6">
                <span className="text-muted">{t("Order total")}: </span>
                <span className="fw-semibold">
                  {sourceCurrencySym}
                  {sourceGrandTotal.toLocaleString()}
                </span>
              </div>
              <div className="col-md-6">
                <span className="text-muted">{t("Advance")}: </span>
                <span className="fw-semibold">
                  {advanceAmount === "" || advanceAmount == null
                    ? "—"
                    : `${sourceCurrencySym}${Number(
                        advanceAmount
                      ).toLocaleString()}`}
                  {advanceDate ? (
                    <span className="text-muted"> · {advanceDate}</span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor PO list */}
        <div className="d-flex align-items-center mb-1 mt-2">
          <Truck size={15} className="me-1 text-primary" />
          <span className="fw-semibold">
            {t("Vendor Purchase Orders")} ({vendorSummary.length})
          </span>
        </div>
        <div className="table-responsive">
          <Table bordered size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("Vendor")}</th>
                <th className="text-end" style={{ width: 90 }}>
                  {t("Lines")}
                </th>
                <th className="text-end" style={{ width: 130 }}>
                  {t("Goods")}
                </th>
                <th className="text-end" style={{ width: 130 }}>
                  {t("Charges")}
                </th>
                <th className="text-end" style={{ width: 140 }}>
                  {t("Taxable")}
                </th>
              </tr>
            </thead>
            <tbody>
              {vendorSummary.map((v) => {
                const charges = chargesFor(v);
                return (
                  <tr key={v.vendor_id}>
                    <td className="fw-semibold">{v.vendor_name}</td>
                    <td className="text-end">{v.lines}</td>
                    <td className="text-end">₹{fmt(v.total)}</td>
                    <td className="text-end">
                      {charges > 0 ? `₹${fmt(charges)}` : "—"}
                    </td>
                    <td className="text-end fw-bold">
                      ₹{fmt(v.total + charges)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td className="fw-bold">{t("Total")}</td>
                <td className="text-end fw-bold">
                  {vendorSummary.reduce((s, v) => s + v.lines, 0)}
                </td>
                <td className="text-end fw-bold">
                  ₹{fmt(vendorSummary.reduce((s, v) => s + v.total, 0))}
                </td>
                <td className="text-end fw-bold">
                  ₹
                  {fmt(
                    vendorSummary.reduce((s, v) => s + chargesFor(v), 0)
                  )}
                </td>
                <td className="text-end fw-bold">
                  ₹
                  {fmt(
                    vendorSummary.reduce(
                      (s, v) => s + v.total + chargesFor(v),
                      0
                    )
                  )}
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>
      </div>
    );
  };

  const headerTitle = (
    <>
      {t("Generate Sales Order & Vendor POs")}{" "}
      <span className="text-muted">
        {t("from")} {sourceType === "pfi" ? "PFI" : t("Quotation")}
      </span>{" "}
      <code>{sourceVoucherNo || ""}</code>
      {sourceGrandTotal > 0 && (
        <Badge color="light-primary" className="ms-1">
          {sourceCurrencySym}
          {sourceGrandTotal.toLocaleString()}
        </Badge>
      )}
    </>
  );

  const bodyNode = (
    <>
      {renderStepper()}
      {loading ? (
        <div className="text-center py-5">
          <Spinner /> <span className="ms-2">{t("Loading preview…")}</span>
        </div>
      ) : previewLines.length === 0 ? (
        <div className="text-center text-muted py-4">
          {t("No lines on the source document.")}
        </div>
      ) : step === 1 ? (
        renderVendorsStep()
      ) : step === 2 ? (
        renderOrderStep()
      ) : (
        renderReviewStep()
      )}
    </>
  );

  const footerNode = (
    <div className="d-flex justify-content-between align-items-center w-100">
      <div className="small text-muted">
        {vendorSummary.length > 0 && (
          <Badge color="light-primary" className="me-1">
            1 {t("SO")} + {vendorSummary.length} {t("PO")}
          </Badge>
        )}
      </div>
      <div className="d-flex align-items-center gap-1">
        <Button color="secondary" outline onClick={toggle} disabled={creating}>
          {t("Cancel")}
        </Button>
        {step > 1 && (
          <Button
            color="secondary"
            outline
            onClick={() => setStep((s) => s - 1)}
            disabled={creating}
          >
            ← {t("Back")}
          </Button>
        )}
        {step < 3 ? (
          <Button
            color="primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              loading ||
              (step === 1 && !vendorsStepValid) ||
              (step === 2 && !orderStepValid)
            }
          >
            {t("Next")} →
          </Button>
        ) : (
          <Button
            color="success"
            onClick={onCreate}
            disabled={creating || loading || !orderStepValid}
          >
            {creating ? <Spinner size="sm" /> : <CheckCircle size={15} />}{" "}
            {t("Create Sales Order & Vendor POs")}
          </Button>
        )}
      </div>
    </div>
  );

  // Full-page layout (preferred for this big multi-step flow); falls back to
  // the modal for any caller that still opens it inline.
  if (asPage) {
    return (
      <Card className="mb-1">
        <CardHeader>
          <h4 className="mb-0">{headerTitle}</h4>
        </CardHeader>
        <CardBody>{bodyNode}</CardBody>
        <CardFooter>{footerNode}</CardFooter>
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

export default PoGeneratePreviewModal;
