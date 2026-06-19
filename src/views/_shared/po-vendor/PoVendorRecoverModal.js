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
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RotateCcw, X, Plus, Trash2 } from "react-feather";
import ReactPaginate from "react-paginate";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { recoverPoVendors } from "@src/views/po-vendors/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
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
  // Per-vendor expense picks. Shape: { [vendor_id]: [{ expense_id, type, value }] }.
  const [vendorExpenses, setVendorExpenses] = useState({});

  // ── Client-side pagination for the preview table ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const poId = purchaseOrder?._id;
  const previewEndpoint = `${API_ENDPOINTS.poVendors.recoverPreview}/${poId}`;

  // ── Expense master (loaded once when modal opens) ──
  const expenseStore = useSelector((s) => s.expense);
  useEffect(() => {
    if (isOpen && !expenseStore?.expenseDropdown?.length) {
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
    [expenseStore?.expenseDropdown]
  );
  const expenseTypeOptions = REBATE_EXPENSE_TYPE_OPTIONS;

  useEffect(() => {
    if (!isOpen || !poId) return;
    setLoading(true);
    setPreviewLines([]);
    setActiveVendors([]);
    setAssignment({});
    setDropped({});
    setVendorExpenses({});
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

  // Group active assignments by vendor → "N POVs" preview + goods total (₹).
  const vendorSummary = useMemo(() => {
    const map = new Map();
    for (const l of previewLines) {
      if (dropped[l.purchase_order_line_id]) continue;
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
      existing.total +=
        num(l.pending_qty) * priceForLine(l, vid);
      map.set(vid, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.vendor_name || "").localeCompare(b.vendor_name || "")
    );
  }, [previewLines, assignment, dropped, activeVendors]);

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
  }, [vendorSummary]);

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

  const hasUnassigned = previewLines.some(
    (l) =>
      !dropped[l.purchase_order_line_id] &&
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

    const zeroQtyLines = previewLines.filter(
      (l) =>
        !dropped[l.purchase_order_line_id] && num(l.pending_qty) <= 0
    );
    if (zeroQtyLines.length > 0) {
      Notification(
        "Validation",
        t(
          `Cannot create POV with 0 qty. Skip these line(s): ${zeroQtyLines
            .map((l) => l.product_name || l.purchase_order_line_id)
            .join(", ")}`
        ),
        "warning"
      );
      return;
    }

    const assignments = previewLines
      .filter(
        (l) =>
          !dropped[l.purchase_order_line_id] &&
          assignment[l.purchase_order_line_id]
      )
      .map((l) => ({
        purchase_order_line_id: l.purchase_order_line_id,
        vendor_id: assignment[l.purchase_order_line_id],
      }));
    if (assignments.length === 0) {
      Notification(
        "Validation",
        t("No lines selected. Restore at least one line to proceed."),
        "warning"
      );
      return;
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
        }));
      }
    }

    setCreating(true);
    try {
      const result = await dispatch(
        recoverPoVendors({
          purchase_order_id: poId,
          assignments,
          vendor_expenses: trimmedExpenses,
        })
      ).unwrap();
      const created = result?.created || [];
      onCreated?.({ created });
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
                    <th style={{ width: 80 }}>{t("Unit")}</th>
                    <th style={{ width: 90 }} className="text-end">
                      {t("Pending Qty")}
                    </th>
                    <th style={{ minWidth: 280 }}>{t("Vendor")} (₹)</th>
                    <th style={{ width: 110 }} className="text-end">
                      {t("Rate")}
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
                    const rate = priceForLine(l, picked);
                    const noVendor = vendorOpts.length === 0;
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
                          {l?.hsn_code && (
                            <div className="small text-muted">
                              HSN: {l.hsn_code}
                            </div>
                          )}
                        </td>
                        <td>{l?.unit || "-"}</td>
                        <td className="text-end fw-semibold">
                          {num(l.pending_qty).toLocaleString()}
                        </td>
                        <td>
                          {noVendor ? (
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
                        <td className="text-end">
                          {rate > 0 ? `₹${fmt(rate)}` : "-"}
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
                    <div key={v.vendor_id} className="po-gen-card mb-2">
                      <div className="po-gen-head justify-content-between">
                        <div className="small">
                          <span className="text-muted">{t("PO to")}: </span>
                          <span className="fw-semibold">{v.vendor_name}</span>
                          <span className="ms-1">
                            · {v.lines} {t("line(s)")} · ₹{fmt(v.total)}
                            {chargesTotal > 0 && (
                              <>
                                {" "}
                                + {t("Charges")} ₹{fmt(chargesTotal)} ={" "}
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
                      <div className="p-1">
                        {rows.length === 0 && (
                          <div className="text-muted small text-center py-2">
                            {t(
                              "No charges. Click Add Expense to include Packing, Transport, etc."
                            )}
                          </div>
                        )}
                        {rows.length > 0 && (
                          <Table
                            size="sm"
                            bordered
                            className="mb-0 small align-middle"
                          >
                            <thead className="table-light">
                              <tr>
                                <th style={{ minWidth: 200 }}>
                                  {t("Expense")}
                                </th>
                                <th style={{ width: 150 }}>{t("Type")}</th>
                                <th style={{ width: 100 }}>{t("Value")}</th>
                                <th
                                  style={{ width: 100 }}
                                  className="text-end"
                                >
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
                                    !usedIds.has(o.value)
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
