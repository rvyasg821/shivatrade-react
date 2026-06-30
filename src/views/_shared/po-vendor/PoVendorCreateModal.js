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
import Select from "react-select";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { createPoVendorFromPo } from "@src/views/po-vendors/store";
import { appsRoot } from "@constant/defaultValues";
import LocationSelect from "@src/views/_shared/LocationSelect";

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

  // Vendor select — PO is multi-vendor at line level. The chosen vendor
  // filters which PO lines are eligible for this POV.
  const [vendorId, setVendorId] = useState("");

  // Vendor options derived from PO lines (unique line-level vendor_ids).
  // Falls back to header vendor for legacy POs.
  const vendorOptions = useMemo(() => {
    const seen = new Map();
    for (const ln of po?.lines || []) {
      const vid = ln?.vendor_id;
      if (!vid || seen.has(vid)) continue;
      seen.set(vid, ln?.vendor_name || vid);
    }
    if (!seen.size && po?.vendor_id) {
      seen.set(po.vendor_id, po?.vendor_name || po.vendor_id);
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [po?.lines, po?.vendor_id, po?.vendor_name]);

  // Auto-pick the single vendor when only one exists.
  useEffect(() => {
    if (vendorOptions.length === 1 && !vendorId) {
      setVendorId(vendorOptions[0].value);
    }
  }, [vendorOptions, vendorId]);

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
    setVendorId("");

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

  // Map PO line _id → vendor_id (so we can filter coverage by chosen vendor).
  const vendorByLineId = useMemo(() => {
    const m = new Map();
    for (const ln of po?.lines || []) {
      m.set(ln._id, ln?.vendor_id || po?.vendor_id || null);
    }
    return m;
  }, [po?.lines, po?.vendor_id]);

  // Coverage rows belonging to the chosen vendor.
  const filteredLines = useMemo(() => {
    if (!coverage?.lines) return [];
    if (!vendorId) return coverage.lines; // before vendor picked: show all (preview)
    return coverage.lines.filter(
      (l) => vendorByLineId.get(l.purchase_order_line_id) === vendorId
    );
  }, [coverage, vendorId, vendorByLineId]);

  const setAll = (mode) => {
    const next = { ...coverByLine };
    for (const l of filteredLines) {
      next[l.purchase_order_line_id] =
        mode === "full" ? String(num(l.pending)) : "0";
    }
    setCoverByLine(next);
  };

  const totalCover = useMemo(() => {
    let s = 0;
    for (const l of filteredLines) {
      s += num(coverByLine[l.purchase_order_line_id]);
    }
    return s;
  }, [filteredLines, coverByLine]);

  const onSubmit = async () => {
    if (!coverage) return;
    if (!vendorId) {
      Notification(
        "Validation",
        t("Pick a vendor for this POV."),
        "warning"
      );
      return;
    }

    // Build line payload — only lines for the chosen vendor; drop zero qty.
    const lines = [];
    for (const l of filteredLines) {
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
            vendor_id: vendorId,
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
    <Modal isOpen={isOpen} toggle={toggle} size="lg" fullscreen="md" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Create PO Vendor against PO")} <code>{po?.voucher_no || ""}</code>
      </ModalHeader>
      <ModalBody>
        {/* Vendor select — pick which vendor this POV is for. PO is
            multi-vendor at line level; only lines matching this vendor
            appear in the per-line table below. */}
        <div className="mb-2">
          <Label className="form-label">
            {t("Vendor")} <span className="text-danger">*</span>
          </Label>
          <Select
            classNamePrefix="select"
            menuPortalTarget={
              typeof document !== "undefined" ? document.body : null
            }
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
            options={vendorOptions}
            value={
              vendorOptions.find((o) => o.value === vendorId) || null
            }
            onChange={(opt) => setVendorId(opt ? opt.value : "")}
            placeholder={t("Select vendor for this POV")}
            isDisabled={vendorOptions.length === 0}
          />
          {vendorOptions.length === 0 && (
            <small className="text-warning">
              {t("This PO has no vendor on any line. Edit the PO to assign vendors.")}
            </small>
          )}
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
            <LocationSelect
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
            {t("Per-line Quantity")}
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
        ) : vendorId && filteredLines.length === 0 ? (
          <div className="alert alert-info small">
            <AlertTriangle size={14} className="me-1" />
            {t("No PO lines are assigned to the selected vendor.")}
          </div>
        ) : (
          <Table responsive bordered size="sm" className="align-middle mb-2">
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
                  {t("Qty")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((l, idx) => {
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
                  {t("Total qty")}
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
            submitting ||
            loading ||
            !hasPending ||
            !vendorId ||
            totalCover <= 1e-6
          }
        >
          {submitting ? <Spinner size="sm" /> : null} {t("Create POV")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorCreateModal;
