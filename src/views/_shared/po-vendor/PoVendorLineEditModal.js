// ── PoVendor Line Edit Modal ──────────────────────────────────────
// Draft-only inline editor for POV line quantities. Lets the user
// adjust per-PO-line cover quantity, remove a covered line (set qty
// to 0), or add a line that was missed at create time.
//
// Uses the same coverage endpoint as Create modal but compensates
// pending client-side by adding back THIS POV's existing ordered_qty
// (so editing your own qty doesn't trip the over-shipment guard).
// Backend's replaceLinesOnDraft() does the same exclusion server-side.

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
  Input,
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
  // qty keyed by purchase_order_line_id
  const [qtyByPoLine, setQtyByPoLine] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Existing POV lines indexed by purchase_order_line_id (for prefill +
  // for computing "available" = coverage.pending + this_pov.ordered_qty).
  const existingByPoLine = useMemo(() => {
    const m = new Map();
    for (const l of pov?.lines || []) {
      m.set(l.purchase_order_line_id, l);
    }
    return m;
  }, [pov?.lines]);

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
          Notification(
            "Error",
            t("Failed to load PO coverage."),
            "warning"
          );
          return;
        }
        // Restrict to lines belonging to THIS POV's vendor. PO is multi-
        // vendor at the line level — other vendors' lines must not be
        // selectable here (BE enforces the same rule).
        const myVendorId = pov?.vendor_id;
        const filteredLines = (data.lines || []).filter(
          (l) => !myVendorId || !l.vendor_id || l.vendor_id === myVendorId
        );
        setCoverage({ ...data, lines: filteredLines });

        // Qty always mirrors the PO line's ordered qty (policy: POV =
        // full ordered qty, not less / not greater). Input is read-only.
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
  }, [isOpen, pov?.purchase_order_id, pov?.vendor_id, existingByPoLine, t]);

  // For each PO line, available = coverage.pending + this_pov's existing
  // ordered_qty (because pending already subtracted this POV).
  const availableByPoLine = useMemo(() => {
    const m = new Map();
    if (!coverage) return m;
    for (const l of coverage.lines || []) {
      const existing = existingByPoLine.get(l.purchase_order_line_id);
      const selfOrdered = existing ? num(existing.ordered_qty) : 0;
      m.set(l.purchase_order_line_id, num(l.pending) + selfOrdered);
    }
    return m;
  }, [coverage, existingByPoLine]);

  const totalCover = useMemo(() => {
    let s = 0;
    for (const l of coverage?.lines || []) {
      s += num(qtyByPoLine[l.purchase_order_line_id]);
    }
    return s;
  }, [coverage, qtyByPoLine]);

  const setAll = (mode) => {
    const next = {};
    for (const l of coverage?.lines || []) {
      const avail = availableByPoLine.get(l.purchase_order_line_id) || 0;
      next[l.purchase_order_line_id] = mode === "max" ? String(avail) : "0";
    }
    setQtyByPoLine(next);
  };

  const onSubmit = async () => {
    if (!coverage) return;
    const lines = [];
    for (const l of coverage.lines) {
      const v = num(qtyByPoLine[l.purchase_order_line_id]);
      const max = availableByPoLine.get(l.purchase_order_line_id) || 0;
      if (v < 0 || v > max + 1e-6) {
        Notification(
          "Validation",
          t(
            `Line "${
              l.product_name || l.purchase_order_line_id
            }": qty must be 0–${max}.`
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
        t("Set at least one line to a non-zero quantity."),
        "warning"
      );
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        updatePoVendor({
          id: pov._id,
          data: { lines },
        })
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
          <Table bordered size="sm" className="align-middle mb-0">
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
              {coverage.lines.map((l, idx) => {
                const max = availableByPoLine.get(l.purchase_order_line_id) || 0;
                const cur = num(qtyByPoLine[l.purchase_order_line_id]);
                const tooHigh = cur > max + 1e-6;
                const isMax = max <= 1e-6;
                return (
                  <tr
                    key={l.purchase_order_line_id}
                    style={isMax ? { opacity: 0.4 } : {}}
                  >
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
                );
              })}
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
