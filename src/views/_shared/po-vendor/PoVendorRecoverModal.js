// ── PoVendor Recover Modal ─────────────────────────────────────────
// Mirrors the PFI → PO "Generate POs" preview modal (PoGeneratePreviewModal).
// Surfaces on the PO Coverage tab when has_pending = true — i.e. one or
// more PO lines no longer have an active POV (cancelled or never had one).
//
// Per-line vendor selector defaults to the PO line's current `vendor_id`.
// Operator can switch to any active vendor; if changed, BE re-assigns the
// PO line's vendor_id and spawns one POV per chosen vendor in a single
// transaction.

import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Spinner,
  Input,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RotateCcw, X } from "react-feather";
import ReactPaginate from "react-paginate";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { recoverPoVendors } from "@src/views/po-vendors/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

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

  // ── Client-side pagination for the preview table ──
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const poId = purchaseOrder?._id;
  const previewEndpoint = `${API_ENDPOINTS.poVendors.recoverPreview}/${poId}`;
  const recoverEndpoint = `${API_ENDPOINTS.poVendors.recover}/${poId}`;

  useEffect(() => {
    if (!isOpen || !poId) return;
    setLoading(true);
    setPreviewLines([]);
    setActiveVendors([]);
    setAssignment({});
    setDropped({});
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
          seedA[l.purchase_order_line_id] = l.current_vendor_id || "";
          // Auto-drop lines already fully covered (defensive — shouldn't
          // normally appear in this modal, but the BE returns them so we
          // hide by default).
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

  // Group active assignments by vendor → "N POVs will be created" preview.
  const vendorSummary = useMemo(() => {
    const map = new Map();
    for (const l of previewLines) {
      if (dropped[l.purchase_order_line_id]) continue;
      const vid = assignment[l.purchase_order_line_id];
      if (!vid) continue;
      const vendorName =
        activeVendors.find((v) => v.vendor_id === vid)?.vendor_name || vid;
      const existing = map.get(vid) || {
        vendor_id: vid,
        vendor_name: vendorName,
        lines: 0,
      };
      existing.lines += 1;
      map.set(vid, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.vendor_name || "").localeCompare(b.vendor_name || "")
    );
  }, [previewLines, assignment, dropped, activeVendors]);

  const hasUnassigned = previewLines.some(
    (l) => !dropped[l.purchase_order_line_id] && !assignment[l.purchase_order_line_id]
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

    // 0-qty guard: a line with pending_qty <= 0 is fully covered already.
    // The auto-drop on load handles the default case, but if the operator
    // manually restored such a line we must block submission here — BE
    // would also reject it, but a clear FE message is friendlier.
    const zeroQtyLines = previewLines.filter(
      (l) =>
        !dropped[l.purchase_order_line_id] &&
        num(l.pending_qty) <= 0
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

    // delivery_address_id + notes are deliberately NOT sent — the BE
    // inherits the PO's existing delivery_address (already set when the
    // original POVs were created from PFI). Recovery just re-spawns POVs
    // for the same address.
    setCreating(true);
    try {
      const result = await dispatch(
        recoverPoVendors({
          purchase_order_id: poId,
          assignments,
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
  // Reset to the first page whenever the modal opens or the preview reloads.
  useEffect(() => {
    setPage(0);
  }, [isOpen, totalRows]);

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Recover POVs against SO")}{" "}
        <code>{purchaseOrder?.voucher_no || ""}</code>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-5">
            <Spinner /> <span className="ms-2">{t("Loading preview…")}</span>
          </div>
        ) : previewLines.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No PO lines need recovery.")}
          </div>
        ) : (
          <>
            <p className="text-muted small mb-2">
              {t(
                "Each line is defaulted to its current PO vendor. Change vendor to re-assign the line, or skip a line to leave it uncovered for now. One POV is created per unique vendor."
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
                    <th style={{ minWidth: 260 }}>{t("Vendor")}</th>
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
                    const vendorOpts = activeVendors.map((v) => ({
                      value: v.vendor_id,
                      label: v.vendor_name,
                    }));
                    const pickedOpt = vendorOpts.find(
                      (o) => o.value === picked
                    );
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
                          {isDropped ? (
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
                              styles={{
                                menuPortal: (base) => ({
                                  ...base,
                                  zIndex: 9999,
                                }),
                              }}
                            />
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

            {vendorSummary.length > 0 && (
              <div className="alert alert-info small mb-0">
                <strong>{t("Will create")}: </strong>
                {vendorSummary.length}{" "}
                {vendorSummary.length === 1 ? t("POV") : t("POVs")}
                <ul className="mb-0 mt-25">
                  {vendorSummary.map((v) => (
                    <li key={v.vendor_id}>
                      <strong>{v.vendor_name}</strong> — {v.lines}{" "}
                      {v.lines === 1 ? t("line") : t("lines")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={creating}>
          {t("Cancel")}
        </Button>
        <Button
          color="success"
          onClick={onSubmit}
          disabled={
            creating ||
            loading ||
            vendorSummary.length === 0 ||
            hasUnassigned
          }
        >
          {creating ? <Spinner size="sm" /> : null}{" "}
          {vendorSummary.length > 0
            ? t(`Create ${vendorSummary.length} POV(s)`)
            : t("Create POV(s)")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorRecoverModal;
