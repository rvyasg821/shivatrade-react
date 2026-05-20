// ── PoVendor Create Modal ───────────────────────────────────────────
// Opened from the PO detail page ("Create POV" button). Fetches the
// per-line coverage roll-up, lets the user adjust each cover quantity
// down from pending, and POSTs /admin/po-vendor/from-po/:poId.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Row,
  Col,
  Label,
  Input,
  Table,
  Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { createPoVendorFromPo } from "@src/views/po-vendors/store";
import { appsRoot } from "@constant/defaultValues";
import CompanyAddressSelect from "@src/views/_shared/CompanyAddressSelect";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

/**
 * Props:
 *   isOpen, toggle
 *   purchaseOrder: full PO detail (we use voucher_no, vendor info, delivery_address)
 */
const PoVendorCreateModal = ({ isOpen, toggle, purchaseOrder }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const po = purchaseOrder || {};

  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [coverByLine, setCoverByLine] = useState({});

  // Delivery address state. Priorities (resolved server-side):
  //   manual text > picked company address id > inherit from PO.
  // `addressMode` controls UI only:
  //   "inherit" — show PO's snapshot, send nothing
  //   "pick"    — pick a different company address
  //   "manual"  — type a one-off text override
  const [addressMode, setAddressMode] = useState("inherit");
  const [pickedAddressId, setPickedAddressId] = useState("");
  const [manualText, setManualText] = useState("");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load coverage when opening.
  useEffect(() => {
    if (!isOpen || !po?._id) return;
    let mounted = true;
    setLoading(true);
    setCoverage(null);
    setCoverByLine({});
    setAddressMode("inherit");
    setPickedAddressId("");
    setManualText("");
    setNotes("");

    instance
      .get(`${API_ENDPOINTS.purchaseOrders.coverage}/${po._id}/coverage`)
      .then((resp) => {
        if (!mounted) return;
        const data = resp?.data?.data;
        if (!data) {
          Notification(
            "Error",
            t("Failed to load PO coverage."),
            "warning"
          );
          return;
        }
        setCoverage(data);
        const seed = {};
        for (const l of data.lines || []) {
          seed[l.purchase_order_line_id] = String(num(l.pending));
        }
        setCoverByLine(seed);
      })
      .catch((err) => {
        if (!mounted) return;
        Notification(
          "Error",
          err?.response?.data?.message || t("Failed to load PO coverage."),
          "warning"
        );
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [isOpen, po?._id, t]);

  const setAll = (mode) => {
    const next = {};
    for (const l of coverage?.lines || []) {
      next[l.purchase_order_line_id] = mode === "full" ? String(num(l.pending)) : "0";
    }
    setCoverByLine(next);
  };

  const totalCover = useMemo(() => {
    let s = 0;
    for (const l of coverage?.lines || []) {
      s += num(coverByLine[l.purchase_order_line_id]);
    }
    return s;
  }, [coverage, coverByLine]);

  const onSubmit = async () => {
    if (!coverage) return;

    // Build line payload — drop lines with 0 cover.
    const lines = [];
    for (const l of coverage.lines) {
      const v = num(coverByLine[l.purchase_order_line_id]);
      const max = num(l.pending);
      if (v < 0 || v > max + 1e-6) {
        Notification(
          "Validation",
          t(
            `Line "${
              l.product_name || l.purchase_order_line_id
            }": cover qty must be 0–${max}.`
          ),
          "warning"
        );
        return;
      }
      if (v > 1e-6) {
        lines.push({
          purchase_order_line_id: l.purchase_order_line_id,
          ordered_qty: String(v),
        });
      }
    }
    if (!lines.length) {
      Notification(
        "Validation",
        t("Set at least one line to a non-zero cover quantity."),
        "warning"
      );
      return;
    }

    // Delivery address resolution — see addressMode docs above.
    let deliveryAddressOverride;
    let deliveryAddressIdOverride;
    if (addressMode === "manual" && manualText.trim()) {
      deliveryAddressOverride = manualText.trim();
    } else if (addressMode === "pick" && pickedAddressId) {
      deliveryAddressIdOverride = pickedAddressId;
    }

    setSubmitting(true);
    try {
      const result = await dispatch(
        createPoVendorFromPo({
          purchase_order_id: po._id,
          payload: {
            lines,
            delivery_address: deliveryAddressOverride,
            delivery_address_id: deliveryAddressIdOverride,
            notes: notes || undefined,
          },
        })
      ).unwrap();
      const created = result?.poVendorItem;
      if (created?._id) {
        Notification(
          "Success",
          t(`${created.voucher_no} created.`),
          "success"
        );
        toggle?.();
        navigate(`${appsRoot}/po-vendors/view/${created._id}`);
      } else {
        toggle?.();
      }
    } catch (err) {
      // Page-level effect / global error toast handles it.
    } finally {
      setSubmitting(false);
    }
  };

  const hasPending = coverage?.has_pending;

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Create PO Vendor against PO")} <code>{po?.voucher_no || ""}</code>
      </ModalHeader>
      <ModalBody>
        {/* Vendor info block */}
        <div className="mb-2 p-2 border rounded bg-light">
          <div className="text-muted text-uppercase fw-bold small mb-50">
            {t("Vendor")}
          </div>
          <div className="fw-bold">{po?.vendor_name || "-"}</div>
          {po?.vendor_contact_name && (
            <div className="small">
              {po.vendor_contact_name}
              {po?.vendor_contact_phone && ` · ${po.vendor_contact_phone}`}
            </div>
          )}
          {po?.vendor_contact_email && (
            <div className="small text-muted">{po.vendor_contact_email}</div>
          )}
          <small className="text-muted d-block mt-50">
            {t("Inherited from PO — cannot change here.")}
          </small>
        </div>

        {/* Delivery address — inherit / pick / manual.
            Default: inherit from PO. */}
        <div className="mb-2">
          <Label className="form-label">{t("Deliver To")}</Label>

          {addressMode === "inherit" && (
            <div
              className="p-2 border rounded small bg-light"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {po?.delivery_address || "-"}
            </div>
          )}

          {addressMode === "pick" && (
            <CompanyAddressSelect
              value={pickedAddressId}
              onChange={setPickedAddressId}
              autoSelectDefault={false}
            />
          )}

          {addressMode === "manual" && (
            <Input
              type="textarea"
              rows="3"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={t(
                "One-off destination — factory-to-port direct, customer pickup, etc."
              )}
            />
          )}

          <div className="mt-50 small">
            {addressMode !== "inherit" && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 me-2"
                onClick={() => setAddressMode("inherit")}
              >
                {t("Use PO address")}
              </button>
            )}
            {addressMode !== "pick" && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 me-2"
                onClick={() => setAddressMode("pick")}
              >
                {t("Pick a different company address")}
              </button>
            )}
            {addressMode !== "manual" && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => setAddressMode("manual")}
              >
                {t("Type custom text")}
              </button>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <Label className="form-label mb-0">
            {t("Per-line Cover Quantity")}
          </Label>
          {coverage && (
            <div>
              <Button
                size="sm"
                color="secondary"
                outline
                className="me-50"
                onClick={() => setAll("full")}
              >
                {t("Set all to pending")}
              </Button>
              <Button
                size="sm"
                color="secondary"
                outline
                onClick={() => setAll("zero")}
              >
                {t("Set all to 0")}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-3">
            <Spinner /> <span className="ms-2">{t("Loading coverage…")}</span>
          </div>
        ) : !coverage ? (
          <div className="alert alert-warning small">
            {t("Could not load coverage for this PO.")}
          </div>
        ) : !hasPending ? (
          <div className="alert alert-info small">
            <AlertTriangle size={14} className="me-1" />
            {t("All quantities on this PO are already covered by existing POVs.")}
          </div>
        ) : (
          <Table bordered size="sm" className="align-middle mb-2">
            <thead className="table-light">
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>{t("Product")}</th>
                <th style={{ width: 70 }}>{t("Unit")}</th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Ordered")}
                </th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Covered")}
                </th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Pending")}
                </th>
                <th style={{ width: 130 }} className="text-end">
                  {t("Cover in this POV")}
                </th>
              </tr>
            </thead>
            <tbody>
              {coverage.lines.map((l, idx) => {
                const max = num(l.pending);
                const cur = num(coverByLine[l.purchase_order_line_id]);
                const tooHigh = cur > max + 1e-6;
                const isFullyCovered = max <= 1e-6;
                return (
                  <tr
                    key={l.purchase_order_line_id}
                    style={isFullyCovered ? { opacity: 0.4 } : {}}
                  >
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{l?.product_name || "-"}</div>
                      {l?.product_code && (
                        <small className="text-muted">{l.product_code}</small>
                      )}
                      {l?.hsn_code && (
                        <div className="small text-muted">
                          HSN: {l.hsn_code}
                        </div>
                      )}
                    </td>
                    <td>{l?.unit || "-"}</td>
                    <td className="text-end">
                      {num(l.ordered).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l.covered).toLocaleString()}
                    </td>
                    <td className="text-end fw-semibold">
                      {max.toLocaleString()}
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={max}
                        bsSize="sm"
                        disabled={isFullyCovered}
                        invalid={tooHigh}
                        value={coverByLine[l.purchase_order_line_id] ?? ""}
                        onChange={(e) =>
                          setCoverByLine((s) => ({
                            ...s,
                            [l.purchase_order_line_id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td colSpan="6" className="text-end fw-bold">
                  {t("Total cover in this POV")}
                </td>
                <td className="text-end fw-bold">
                  {totalCover.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </Table>
        )}

        <Row>
          <Col md="12" className="mb-1">
            <Label className="form-label">{t("Notes (optional)")}</Label>
            <Input
              type="textarea"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          onClick={onSubmit}
          disabled={
            submitting || loading || !hasPending || totalCover <= 1e-6
          }
        >
          {submitting ? <Spinner size="sm" /> : null} {t("Create POV")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorCreateModal;
