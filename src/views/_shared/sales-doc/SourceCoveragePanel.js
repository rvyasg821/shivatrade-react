// PFI / Quotation coverage panel. Mirrors PoCoverageAndVendors but one
// level upstream: shows per source-line how much qty is already booked
// across non-cancelled POs and which POs cover it. Read-only — generation
// is driven from the existing "Generate POs" button on the detail page.

import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  Spinner,
  Badge,
  UncontrolledTooltip,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { ExternalLink, AlertTriangle } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { PURCHASE_ORDER_STATUS_BADGE_COLOR } from "@constant/options";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const SourceCoveragePanel = ({ sourceType, sourceId }) => {
  const { t } = useTranslation();
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);

  const endpoint =
    sourceType === "pfi"
      ? `${API_ENDPOINTS.purchaseOrders.pfiCoverage}/${sourceId}`
      : `${API_ENDPOINTS.purchaseOrders.quotationCoverage}/${sourceId}`;

  const load = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      const resp = await instance.get(endpoint);
      setCoverage(resp?.data?.data || null);
    } catch (_err) {
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, [sourceId, endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !coverage) {
    return (
      <div className="text-center py-3">
        <Spinner />{" "}
        <span className="ms-2">{t("Loading coverage…")}</span>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className="alert alert-warning small mb-0">
        <AlertTriangle size={14} className="me-1" />
        {t("Could not load coverage.")}
      </div>
    );
  }

  if (!coverage.lines.length) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No lines on this document.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="text-muted small mb-2">
        {t(
          "Live qty roll-up of how much of each line is already booked on a Purchase Order."
        )}
      </div>
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
              {t("On POs")}
            </th>
            <th style={{ width: 90 }} className="text-end">
              {t("Pending")}
            </th>
            <th style={{ minWidth: 200 }}>{t("Existing POs")}</th>
          </tr>
        </thead>
        <tbody>
          {coverage.lines.map((l, idx) => {
            const pending = num(l.pending);
            return (
              <tr key={l.source_line_id}>
                <td>{idx + 1}</td>
                <td>
                  <div className="fw-semibold">{l?.product_name || "-"}</div>
                  {l?.product_code && (
                    <small className="text-muted">{l.product_code}</small>
                  )}
                  {l?.hsn_code && (
                    <div className="small text-muted">HSN: {l.hsn_code}</div>
                  )}
                </td>
                <td>{l?.unit || "-"}</td>
                <td className="text-end">{num(l.ordered).toLocaleString()}</td>
                <td className="text-end">{num(l.covered).toLocaleString()}</td>
                <td className="text-end fw-bold">
                  {pending > 0 ? (
                    pending.toLocaleString()
                  ) : (
                    <Badge color="light-success">{t("Covered")}</Badge>
                  )}
                </td>
                <td>
                  {(l.existing_pos || []).length === 0 ? (
                    <span className="text-muted small">—</span>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {l.existing_pos.map((p) => {
                        const color =
                          PURCHASE_ORDER_STATUS_BADGE_COLOR[p.status] ||
                          "secondary";
                        const id = `srcpo-${l.source_line_id}-${p.purchase_order_id}`;
                        return (
                          <span key={p.purchase_order_id} className="small">
                            <Link
                              to={`${appsRoot}/purchase-orders/view/${p.purchase_order_id}`}
                              className="d-inline-flex align-items-center me-25"
                              id={id}
                            >
                              {p.voucher_no}
                              <ExternalLink size={10} className="ms-25" />
                            </Link>
                            <Badge
                              color={`light-${color}`}
                              className={`badge-light-${color} text-capitalize me-50`}
                            >
                              {p.status}
                            </Badge>
                            <span className="text-muted">
                              {t("qty")}: {num(p.qty).toLocaleString()}
                            </span>
                            <UncontrolledTooltip target={id} placement="top">
                              {t("Open PO detail")}
                            </UncontrolledTooltip>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="table-light">
            <td colSpan="3" className="text-end fw-bold">
              {t("Totals")}
            </td>
            <td className="text-end fw-bold">
              {num(coverage.totals.ordered).toLocaleString()}
            </td>
            <td className="text-end fw-bold">
              {num(coverage.totals.covered).toLocaleString()}
            </td>
            <td className="text-end fw-bold">
              {num(coverage.totals.pending).toLocaleString()}
            </td>
            <td />
          </tr>
        </tfoot>
      </Table>
    </Fragment>
  );
};

export default SourceCoveragePanel;
