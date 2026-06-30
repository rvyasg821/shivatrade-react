// ── PoVendor Line Edit Modal ──────────────────────────────────────
// Draft-only modal showing this POV's PO lines. Quantities are locked
// to the PO line's ordered qty (policy: POV = full ordered qty). The
// modal still exists as a read-only confirmation view + a hook point
// for future per-line tweaks if the policy changes.

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { updatePoVendor } from "@src/views/po-vendors/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const PoVendorLineEditModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const pov = poVendorItem || {};

  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [qtyByPoLine, setQtyByPoLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !pov?.purchase_order_id) return;
    let mounted = true;
    setLoading(true);
    setCoverage(null);
    setQtyByPoLine({});

    instance
      .get(
        `${API_ENDPOINTS.purchaseOrders.coverage}/${pov.purchase_order_id}/coverage`
      )
      .then((resp) => {
        if (!mounted) return;
        const data = resp?.data?.data;
        if (!data) {
          Notification("Error", t("Failed to load PO coverage."), "warning");
          return;
        }
        // Restrict to lines belonging to THIS POV's vendor (BE enforces same).
        const myVendorId = pov?.vendor_id;
        const filteredLines = (data.lines || []).filter(
          (l) => !myVendorId || !l.vendor_id || l.vendor_id === myVendorId
        );
        setCoverage({ ...data, lines: filteredLines });

        const seed = {};
        for (const l of filteredLines) {
          seed[l.purchase_order_line_id] = String(num(l.ordered));
        }
        setQtyByPoLine(seed);
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
  }, [isOpen, pov?.purchase_order_id, pov?.vendor_id, t]);

  const totalCover = useMemo(() => {
    let s = 0;
    for (const l of coverage?.lines || []) {
      s += num(qtyByPoLine[l.purchase_order_line_id]);
    }
    return s;
  }, [coverage, qtyByPoLine]);

  const onSubmit = async () => {
    if (!coverage) return;
    const lines = coverage.lines
      .map((l) => ({
        purchase_order_line_id: l.purchase_order_line_id,
        ordered_qty: String(num(qtyByPoLine[l.purchase_order_line_id])),
      }))
      .filter((l) => num(l.ordered_qty) > 1e-6);

    if (!lines.length) {
      Notification(
        "Validation",
        t("No lines available to save."),
        "warning"
      );
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        updatePoVendor({ id: pov._id, data: { lines } })
      ).unwrap();
      toggle?.();
    } catch (err) {
      // Page-level effect shows the error toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>
        {t("Edit Lines")} · <code>{pov?.voucher_no}</code>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-3">
            <Spinner /> <span className="ms-2">{t("Loading coverage…")}</span>
          </div>
        ) : !coverage ? (
          <div className="alert alert-warning small">
            <AlertTriangle size={14} className="me-1" />
            {t("Could not load coverage.")}
          </div>
        ) : (
          <Table responsive bordered size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>{t("Product")}</th>
                <th style={{ width: 70 }}>{t("Unit")}</th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Ordered")}
                </th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Qty")}
                </th>
              </tr>
            </thead>
            <tbody>
              {coverage.lines.map((l, idx) => (
                <tr key={l.purchase_order_line_id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="fw-semibold">{l?.product_name || "-"}</div>
                    {l?.product_code && (
                      <small className="text-muted">{l.product_code}</small>
                    )}
                  </td>
                  <td>{l?.unit || "-"}</td>
                  <td className="text-end">
                    {num(l.ordered).toLocaleString()}
                  </td>
                  <td className="text-end">
                    {num(qtyByPoLine[l.purchase_order_line_id]).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td colSpan="4" className="text-end fw-bold">
                  {t("Total qty")}
                </td>
                <td className="text-end fw-bold">
                  {totalCover.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </Table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          onClick={onSubmit}
          disabled={submitting || loading || totalCover <= 1e-6}
        >
          {submitting ? <Spinner size="sm" /> : null} {t("Save Lines")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PoVendorLineEditModal;
