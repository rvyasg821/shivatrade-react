// ── PO Generate Preview Modal ──────────────────────────────────────
// Reusable modal that drives the "Generate POs" auto-split flow from a
// PFI or a Quotation. Loads preview lines (one row per source line with
// candidate-vendor list) and lets the user confirm/change vendor per line
// before POs are created.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { appsRoot } from "@constant/defaultValues";
import CompanyAddressSelect from "@src/views/_shared/CompanyAddressSelect";

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
 */
const PoGeneratePreviewModal = ({
  isOpen,
  toggle,
  sourceType,
  sourceId,
  sourceVoucherNo,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewLines, setPreviewLines] = useState([]);
  // assignment[source_line_id] = vendor_id ("" if user removed it)
  const [assignment, setAssignment] = useState({});
  // dropped[source_line_id] = true if user removed from batch
  const [dropped, setDropped] = useState({});
  // Deliver-to address (applies to every PO created in this batch).
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [companyAddresses, setCompanyAddresses] = useState([]);

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
    instance
      .get(previewEndpoint)
      .then((resp) => {
        const lines = resp?.data?.data?.lines || [];
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
      const resp = await instance.post(createEndpoint, {
        assignments,
        delivery_address_id: deliveryAddressId,
      });
      const created = resp?.data?.data?.created || [];
      const skipped = resp?.data?.data?.skipped || [];

      if (created.length === 0) {
        // Nothing got created — surface the first failure reason loud.
        const reason =
          skipped[0]?.reason ||
          t("No POs were created. Check vendor / company settings.");
        Notification("Error", reason, "warning");
        return; // stay in the modal so the user can act
      }

      if (skipped.length > 0) {
        Notification(
          "Partial success",
          t(
            `${created.length} PO(s) created, ${skipped.length} skipped. Reason: ${skipped[0]?.reason || ""}`
          ),
          "warning"
        );
      } else {
        Notification(
          "Success",
          t(`${created.length} PO(s) created.`),
          "success"
        );
      }
      toggle?.();
      navigate(`${appsRoot}/purchase-orders`);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Failed to create POs"),
        "warning"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Generate Purchase Orders from")}{" "}
        {sourceType === "pfi" ? "PFI" : "Quotation"}{" "}
        <code>{sourceVoucherNo || ""}</code>
      </ModalHeader>
      <ModalBody>
        {/* Deliver-to address — applies to every PO created in this batch. */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            {t("Deliver goods to")}{" "}
            <span className="text-danger">*</span>
          </label>
          <CompanyAddressSelect
            value={deliveryAddressId}
            onChange={setDeliveryAddressId}
            onAddressesLoaded={setCompanyAddresses}
          />
          <small className="text-muted">
            {t(
              "Vendors will deliver to this address. Pick a saved company address."
            )}
          </small>
          {!companyAddresses.length && (
            <div className="alert alert-warning small mt-2 mb-0">
              {t("No company addresses on file.")}{" "}
              <a href="/apps/profile" target="_blank" rel="noopener noreferrer">
                {t("Add one in your Company Profile")}
              </a>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner /> <span className="ms-2">{t("Loading preview…")}</span>
          </div>
        ) : previewLines.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No lines on the source document.")}
          </div>
        ) : (
          <>
            <p className="text-muted small mb-2">
              {t(
                "Each source line is pre-assigned to the cheapest active vendor. Change the vendor per line or drop a line from this batch. One PO is created per unique vendor. Lines already fully covered by existing POs are dropped automatically — restore to add another PO for the same line."
              )}
            </p>
            {previewLines.every((l) => l.fully_covered) && (
              <div className="alert alert-info small mb-2">
                <AlertTriangle size={14} className="me-1" />
                {t(
                  "All lines are already covered by existing POs. To add another, restore a line below."
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
                  {previewLines.map((l, idx) => {
                    const isDropped = !!dropped[l.source_line_id];
                    const cands = l.candidate_vendors || [];
                    const cheapestPrice = cands[0]?.unit_price;
                    const vendorOpts = cands.map((c) => ({
                      value: c.vendor_id,
                      label: `${c.vendor_name} — ₹${fmt(c.unit_price)}${
                        c.unit_price === cheapestPrice ? ` ${t("(cheapest)")}` : ""
                      }`,
                      raw: c,
                    }));
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
                          ) : (
                            <Select
                              classNamePrefix="select"
                              menuPortalTarget={document.body}
                              styles={{
                                menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                              }}
                              isDisabled={isDropped}
                              options={vendorOpts}
                              value={
                                vendorOpts.find((o) => o.value === picked) ||
                                null
                              }
                              onChange={(opt) =>
                                handleVendorChange(
                                  l.source_line_id,
                                  opt ? opt.value : ""
                                )
                              }
                              placeholder={t("Select vendor")}
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

            {/* Vendor summary */}
            {vendorSummary.length > 0 && (
              <div className="mt-3">
                <h6 className="mb-1">{t("Will create")}:</h6>
                <ul className="mb-0">
                  {vendorSummary.map((v) => (
                    <li key={v.vendor_id} className="small">
                      <strong>{v.vendor_name}</strong> — {v.lines}{" "}
                      {t("line(s)")} → ₹{fmt(v.total)}
                    </li>
                  ))}
                </ul>
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
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={creating}>
          {t("Cancel")}
        </Button>
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
          {t("Create POs")}{" "}
          {vendorSummary.length > 0 && (
            <Badge color="light" className="ms-1 text-dark">
              {vendorSummary.length}
            </Badge>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoGeneratePreviewModal;
