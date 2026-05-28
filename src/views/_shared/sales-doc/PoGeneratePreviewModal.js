// ── PO Generate Preview Modal ──────────────────────────────────────
// Reusable modal that drives the "Generate POs" auto-split flow from a
// PFI or a Quotation. Loads preview lines (one row per source line with
// candidate-vendor list) and lets the user confirm/change vendor per line
// before POs are created.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Badge,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { Input } from "reactstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink, Plus, Trash2 } from "react-feather";
import { useDispatch, useSelector } from "react-redux";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";
import LocationSelect from "@src/views/_shared/LocationSelect";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

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
  // Per-vendor expense picks. Shape: { [vendor_id]: [{ expense_id, type, value }] }.
  const [vendorExpenses, setVendorExpenses] = useState({});
  // 2-step UX: 1 = Product listing, 2 = Vendor charges.
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
    // Reset deliver-to on every open so we re-derive from the response
    // (existing PO's address if any, else LocationSelect's auto-default).
    setDeliveryAddressId("");
    instance
      .get(previewEndpoint)
      .then((resp) => {
        const data = resp?.data?.data || {};
        const lines = data.lines || [];
        setPreviewLines(lines);
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
          `PO ${purchaseOrder.voucher_no || ""} + ${povs.length} POV(s) created.`
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

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Generate Sales Order & POVs from")}{" "}
        {sourceType === "pfi" ? "PFI" : "Quotation"}{" "}
        <code>{sourceVoucherNo || ""}</code>
      </ModalHeader>
      <ModalBody>
        {/* ── Stepper header (numbered circles + connecting line) ── */}
        {(() => {
          const canGoStep2 =
            !loading &&
            !hasUnassignedActiveLines &&
            vendorSummary.length > 0 &&
            !!deliveryAddressId;
          const stepBtn = (n, label, target) => {
            const active = step === target;
            const disabled = target === 2 && !canGoStep2;
            return (
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setStep(target)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setStep(target);
                  }
                }}
                className="d-inline-flex align-items-center"
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  userSelect: "none",
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle me-1"
                  style={{
                    width: 28,
                    height: 28,
                    background: active ? "rgb(115, 103, 240)" : "#fff",
                    color: active ? "rgb(255, 255, 255)" : "#b9b9c3",
                    border: active ? "none" : "1px solid #d8d6de",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {n}
                </div>
                <span
                  className={`ms-1 ${active ? "fw-bold" : "text-muted"}`}
                  style={{ color: active ? "#7367f0" : undefined }}
                >
                  {label}
                </span>
              </div>
            );
          };
          return (
            <div className="d-flex justify-content-center align-items-center mb-2 mt-1">
              {stepBtn(1, t("Products"), 1)}
              <span
                className="mx-2"
                style={{
                  width: 80,
                  height: 1,
                  background: "#d8d6de",
                  display: "inline-block",
                }}
              />
              {stepBtn(2, t("Vendor Charges"), 2)}
            </div>
          );
        })()}

        {loading ? (
          <div className="text-center py-5">
            <Spinner /> <span className="ms-2">{t("Loading preview…")}</span>
          </div>
        ) : previewLines.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No lines on the source document.")}
          </div>
        ) : step === 1 ? (
          <>
            {/* Deliver-to address — applies to every PO created in this batch. */}
            <div className="mb-2">
              <label className="form-label fw-semibold">
                {t("Deliver goods to")}{" "}
                <span className="text-danger">*</span>
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
                  <a href={`${appsRoot}/locations`} target="_blank" rel="noopener noreferrer">
                    {t("Add one in Locations")}
                  </a>
                </div>
              )}
            </div>

            <p className="text-muted small mb-2">
              {t(
                "Each source line is pre-assigned to the cheapest active vendor. Drop a line to exclude it from this batch. Lines already fully covered by existing Sales Orders are dropped automatically."
              )}
            </p>
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
                    <th style={{ minWidth: 280 }}>{t("Vendor")}</th>
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
                    const cands = l.candidate_vendors || [];
                    const picked = assignment[l.source_line_id];
                    const pickedCand = cands.find(
                      (c) => c.vendor_id === picked
                    );
                    const qty = Number(l.qty) || 0;
                    const total = qty * Number(pickedCand?.unit_price || 0);
                    const isUnassigned = l.unassigned || (!picked && !isDropped);
                    const rowStyle = isDropped
                      ? { opacity: 0.4, textDecoration: "line-through" }
                      : isUnassigned
                      ? { backgroundColor: "rgba(220,53,69,0.08)" }
                      : {};
                    return (
                      <tr key={l.source_line_id} style={rowStyle}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="fw-semibold">
                            {l.product_name || "-"}
                          </div>
                          {l.product_code && (
                            <small className="text-muted">
                              {l.product_code}
                            </small>
                          )}
                          {l.hsn_code && (
                            <div className="small text-muted">
                              HSN: {l.hsn_code}
                            </div>
                          )}
                          {(l.existing_pos || []).length > 0 && (
                            <div className="mt-1">
                              {l.fully_covered ? (
                                <Badge color="light-success" className="me-50">
                                  {t("Fully covered")}
                                </Badge>
                              ) : (
                                <Badge color="light-info" className="me-50">
                                  {t("Partially covered")}:{" "}
                                  {fmt(l.covered_qty)} / {fmt(l.ordered_qty)}
                                </Badge>
                              )}
                              <div className="small text-muted mt-25">
                                {l.existing_pos.map((p, i) => (
                                  <span key={p.purchase_order_id}>
                                    {i > 0 ? ", " : ""}
                                    <Link
                                      to={`${appsRoot}/purchase-orders/view/${p.purchase_order_id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="d-inline-flex align-items-center"
                                    >
                                      {p.voucher_no}
                                      <ExternalLink
                                        size={10}
                                        className="ms-25"
                                      />
                                    </Link>
                                    <span className="text-muted">
                                      {" "}
                                      ({fmt(p.qty)})
                                    </span>
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
                          {l.unassigned ? (
                            <div className="text-danger d-flex align-items-center small">
                              <AlertTriangle size={14} className="me-1" />
                              <span>
                                {t(
                                  "Unassigned — add this product to a vendor's price list"
                                )}
                              </span>
                            </div>
                          ) : pickedCand ? (
                            <span
                              className="badge"
                              style={{
                                background: "#eef0f3",
                                color: "#1a2238",
                                fontWeight: 500,
                              }}
                            >
                              {pickedCand.vendor_name}
                            </span>
                          ) : (
                            <span className="text-muted small">—</span>
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

            {/* Pagination — always shown when at least one row exists. */}
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

            {/* Vendor summary line — just a count peek on step 1 */}
            {vendorSummary.length > 0 && (
              <div className="alert alert-info small mt-3 mb-0">
                {t("Will create")}: <strong>1 {t("Sales Order")}</strong> +{" "}
                <strong>{vendorSummary.length} POV(s)</strong>.{" "}
                {t(
                  "Click Next to add optional vendor charges per POV before creating."
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Step 2: Vendor Charges ─────────────────────────────── */
          <>
            {vendorSummary.length > 0 && (
              <div>
                <p className="small text-muted mb-2">
                  {t(
                    "Optional — add Packing, Transport, etc. per vendor. Leave empty to skip."
                  )}
                </p>
                {vendorSummary.map((v) => {
                  const rows = vendorExpenses[v.vendor_id] || [];
                  const usedIds = new Set(rows.map((r) => r.expense_id).filter(Boolean));
                  const updateRow = (idx, patch) =>
                    setVendorExpenses((curr) => {
                      const list = (curr[v.vendor_id] || []).map((r, i) =>
                        i === idx ? { ...r, ...patch } : r,
                      );
                      return { ...curr, [v.vendor_id]: list };
                    });
                  const removeRow = (idx) =>
                    setVendorExpenses((curr) => {
                      const list = (curr[v.vendor_id] || []).filter(
                        (_, i) => i !== idx,
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
                  const chargesTotal = rows.reduce((s, r) => {
                    if (!r?.expense_id) return s;
                    return (
                      s +
                      (r.type === "percent"
                        ? (v.total * Number(r.value || 0)) / 100
                        : Number(r.value || 0))
                    );
                  }, 0);
                  return (
                    <div
                      key={v.vendor_id}
                      className="rounded mb-2"
                      style={{
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                      }}
                    >
                      {/* Vendor header strip — compact */}
                      <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom">
                        <div className="small">
                          <span className="fw-semibold">{v.vendor_name}</span>
                          <span className="ms-1">
                            · {v.lines} {t("line(s)")} · ₹{fmt(v.total)}
                            {chargesTotal > 0 && (
                              <>
                                {" "}+ {t("Charges")} ₹{fmt(chargesTotal)} ={" "}
                                <strong>₹{fmt(v.total + chargesTotal)}</strong>{" "}
                                <span className="text-muted">
                                  ({t("Taxable")})
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
                      {/* Vendor body */}
                      <div className="p-1">
                      {rows.length === 0 && (
                        <div className="text-muted small text-center py-2">
                          {t(
                            "No charges added for this vendor. Click Add Expense to include Packing, Transport, etc."
                          )}
                        </div>
                      )}
                      {rows.length > 0 && (
                        <Table size="sm" bordered className="mb-0 small align-middle">
                          <thead className="table-light">
                            <tr>
                              <th style={{ minWidth: 220 }}>{t("Expense")}</th>
                              <th style={{ width: 160 }}>{t("Type")}</th>
                              <th style={{ width: 110 }}>{t("Value")}</th>
                              <th style={{ width: 110 }} className="text-end">
                                {t("Amount")}
                              </th>
                              <th style={{ width: 40 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, idx) => {
                              const pickOptions = expenseOptions.filter(
                                (o) =>
                                  o.value === r.expense_id ||
                                  !usedIds.has(o.value),
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
                                          (o) => o.value === r.expense_id,
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
                                        menuPortal: (b) => ({
                                          ...b,
                                          zIndex: 9999,
                                        }),
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <Select
                                      classNamePrefix="select"
                                      options={expenseTypeOptions}
                                      value={
                                        expenseTypeOptions.find(
                                          (o) => o.value === r.type,
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
                                        menuPortal: (b) => ({
                                          ...b,
                                          zIndex: 9999,
                                        }),
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
                                        updateRow(idx, {
                                          value: e.target.value,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="text-end">
                                    ₹{fmt(amt)}
                                  </td>
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
            )}

          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={creating}>
          {t("Cancel")}
        </Button>
        {step === 2 && (
          <Button
            color="secondary"
            outline
            onClick={() => setStep(1)}
            disabled={creating}
          >
            ← {t("Back")}
          </Button>
        )}
        {step === 1 ? (
          <Button
            color="primary"
            onClick={() => setStep(2)}
            disabled={
              loading ||
              hasUnassignedActiveLines ||
              vendorSummary.length === 0 ||
              !deliveryAddressId
            }
          >
            {t("Next")} →
          </Button>
        ) : (
          <Button
            color="primary"
            onClick={onCreate}
            disabled={
              creating ||
              loading ||
              hasUnassignedActiveLines ||
              vendorSummary.length === 0 ||
              !deliveryAddressId
            }
          >
            {creating ? <Spinner size="sm" /> : null}{" "}
            {t("Create Sales Order & POVs")}{" "}
            {vendorSummary.length > 0 && (
              <Badge color="light" className="ms-1 text-dark">
                1 + {vendorSummary.length}
              </Badge>
            )}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default PoGeneratePreviewModal;
