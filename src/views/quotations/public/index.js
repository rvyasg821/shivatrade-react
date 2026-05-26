// ── Quotation public / preview view ──────────────────────────────────
// One renderer, two entry points:
//   /q/:token              → public, no auth (getPublicQuotation)
//   /quotations/preview/:id → admin "preview as client" (getQuotationPreview)
// Both feed `publicItem` — the sanitized, customer-currency projection.
// Never renders margin / expenses / rebates / internal notes.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Badge, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "react-feather";

import {
  getPublicQuotation,
  getQuotationPreview,
} from "@src/views/quotations/store";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import { formatDate } from "@src/utility/dateFormat";
import appLogo from "@src/assets/images/logo/login-logo.png";

const Label = ({ children }) => (
  <div
    className="text-uppercase fw-bold text-muted mb-1"
    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
  >
    {children}
  </div>
);

const QuotationPublicView = () => {
  const { token, id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const q = store?.publicItem;
  const loading = !store?.loading;
  const isPreview = !!id;

  useEffect(() => {
    if (token) dispatch(getPublicQuotation(token));
    else if (id) dispatch(getQuotationPreview(id));
  }, [token, id, dispatch]);

  const sym = q?.currency_symbol || q?.currency_code || "";
  const money = (v) => `${sym}${fmt(v)}`;

  if (loading && !q) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner />
      </div>
    );
  }

  if (!q) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-muted mb-2" />
        <h5 className="text-muted">
          {store?.error || t("Quotation not found")}
        </h5>
      </div>
    );
  }

  return (
    <Fragment>
      <style>{`
        .quotation-public-wrap {
          background: #f4f5f7;
          min-height: 100vh;
          padding: 32px 16px;
        }
        .quotation-doc {
          max-width: 920px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
        .quotation-doc .qd-header {
          padding: 28px 36px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .quotation-doc .qd-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 2px;
          margin: 0;
          color: #1f2937;
        }
        .quotation-doc .qd-body { padding: 24px 36px; }
        .quotation-doc .qd-footer {
          padding: 16px 36px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 0.8rem;
          text-align: center;
        }
        .quotation-doc .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 28px;
          margin-bottom: 28px;
        }
        @media (max-width: 768px) {
          .quotation-doc .party-grid { grid-template-columns: 1fr; gap: 18px; }
          .quotation-doc .qd-header, .quotation-doc .qd-body, .quotation-doc .qd-footer { padding-left: 20px; padding-right: 20px; }
        }
        .quotation-doc .party-name { font-weight: 600; color: #1f2937; margin-bottom: 6px; }
        .quotation-doc .party-line { font-size: 0.83rem; color: #4b5563; line-height: 1.5; }
        .quotation-doc .party-muted { color: #6b7280; }
        .quotation-doc table.items { width: 100%; margin: 0; }
        .quotation-doc table.items thead th {
          background: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb !important;
          border-top: 1px solid #e5e7eb !important;
          padding: 10px 12px;
        }
        .quotation-doc table.items td {
          vertical-align: top;
          padding: 12px;
          border-bottom: 1px solid #f1f2f4;
          font-size: 0.88rem;
        }
        .quotation-doc table.items tbody tr:last-child td { border-bottom: 1px solid #e5e7eb; }
        .quotation-doc table.items tr.row-grand-tr td {
          padding: 14px 12px 6px;
          font-size: 1rem;
          color: #09418b;
          background: transparent;
          border: 0;
        }
        .quotation-doc table.items tr.row-grand-tr td.party-grand-label,
        .quotation-doc table.items tr.row-grand-tr td.party-grand-value {
          border-top: 2px solid #1f2937;
          white-space: nowrap;
        }
        .quotation-doc .section {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
        }
        .quotation-doc .section .body { font-size: 0.85rem; color: #4b5563; line-height: 1.6; white-space: pre-line; }
        .quotation-doc .banner {
          padding: 8px 14px;
          border-radius: 4px;
          font-size: 0.82rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .quotation-doc .banner-info { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .quotation-doc .banner-warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
        .quotation-doc .status-badge {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.2px;
        }
        @media print {
          .quotation-public-wrap { background: #fff; padding: 0; }
          .quotation-doc { border: none; }
          .quotation-doc .no-print { display: none !important; }
        }
      `}</style>

      <div className="quotation-public-wrap">
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {isPreview && (
            <div className="banner banner-info no-print">
              {t("Preview - this is what the client sees. Not yet shared.")}
            </div>
          )}
          {q.is_expired && (
            <div className="banner banner-warn">
              <AlertTriangle size={14} />
              {t("This quotation has expired.")}
            </div>
          )}

          <div className="quotation-doc">
            {/* Header */}
            <div className="qd-header d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <img
                  src={appLogo}
                  alt="Logo"
                  style={{ height: 32, marginBottom: 8 }}
                />
                {q.company_name && (
                  <div className="party-name" style={{ fontSize: "1.05rem" }}>
                    {q.company_name}
                  </div>
                )}
              </div>
              <div className="text-end">
                <h1 className="qd-title">{t("QUOTATION")}</h1>
                <div className="party-muted" style={{ fontSize: "0.85rem" }}>
                  #{q.voucher_no || "-"}
                </div>
                <span className="status-badge mt-1 d-inline-block">
                  {q.status || "-"}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="qd-body">
              {/* Party grid */}
              <div className="party-grid">
                <div>
                  <Label>{t("From")}</Label>
                  <div className="party-name">{q.company_name || "-"}</div>
                  {q.company_address && (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {q.company_address}
                    </div>
                  )}
                  {q.company_phone && (
                    <div className="party-line">{q.company_phone}</div>
                  )}
                  {q.company_email && (
                    <div className="party-line">{q.company_email}</div>
                  )}
                  {q.company_iec && (
                    <div className="party-line party-muted">
                      {t("IEC")}: {q.company_iec}
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t("Billed To")}</Label>
                  <div className="party-name">{q.customer_name || "-"}</div>
                  {q.customer_contact_name && (
                    <div className="party-line">{q.customer_contact_name}</div>
                  )}
                  {q.customer_address && (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {q.customer_address}
                    </div>
                  )}
                  {q.customer_phone && (
                    <div className="party-line">{q.customer_phone}</div>
                  )}
                  {q.customer_email && (
                    <div className="party-line">{q.customer_email}</div>
                  )}
                </div>

                <div>
                  <Label>{t("Quote Details")}</Label>
                  <div className="party-line">
                    <span className="party-muted">{t("Date")}: </span>
                    <span className="fw-semibold">
                      {q.quotation_date ? formatDate(q.quotation_date) : "-"}
                    </span>
                  </div>
                  {q.valid_until && (
                    <div className="party-line">
                      <span className="party-muted">{t("Valid Until")}: </span>
                      <span className="fw-semibold">
                        {formatDate(q.valid_until)}
                      </span>
                    </div>
                  )}
                  <div className="party-line">
                    <span className="party-muted">{t("Currency")}: </span>
                    <span className="fw-semibold">
                      {sym} {q.currency_code || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <Table className="items">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>{t("Product / Description")}</th>
                    <th className="text-end" style={{ width: 90 }}>
                      {t("Qty")}
                    </th>
                    <th style={{ width: 70 }}>{t("Unit")}</th>
                    <th className="text-end" style={{ width: 110 }}>
                      {t("Rate")}
                    </th>
                    <th className="text-end" style={{ width: 80 }}>
                      {t("Disc%")}
                    </th>
                    <th className="text-end" style={{ width: 130 }}>
                      {t("Amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(q.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td className="party-muted">{i + 1}</td>
                      <td>
                        <div className="fw-semibold">
                          {l.product_name || "-"}
                        </div>
                        {l.description && (
                          <div
                            className="small party-muted"
                            style={{ whiteSpace: "pre-line" }}
                          >
                            {l.description}
                          </div>
                        )}
                      </td>
                      <td className="text-end">{l.qty || "-"}</td>
                      <td>{l.unit || "-"}</td>
                      <td className="text-end">{money(l.unit_price)}</td>
                      <td className="text-end">{l.discount_pct || 0}</td>
                      <td className="text-end fw-semibold">
                        {money(l.line_total)}
                      </td>
                    </tr>
                  ))}
                  {(q.lines || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center party-muted py-3">
                        {t("No line items.")}
                      </td>
                    </tr>
                  )}
                  {/* Grand Total as the last <tr> of <tbody> (not <tfoot>)
                      so it doesn't repeat on every page when the browser
                      saves to PDF. Value still lines up with the Amount
                      column thanks to colSpan + matching column widths. */}
                  <tr className="row-grand-tr">
                    <td colSpan={5} />
                    <td className="text-end fw-bold party-grand-label">
                      {t("Grand Total")}
                    </td>
                    <td className="text-end fw-bold party-grand-value">
                      {money(q.grand_total)}
                    </td>
                  </tr>
                </tbody>
              </Table>

              {/* Terms */}
              {(q.payment_terms ||
                q.delivery_terms ||
                q.delivery_location) && (
                <div className="section">
                  <Label>{t("Terms")}</Label>
                  {q.payment_terms && (
                    <div className="body">
                      <span className="party-muted">{t("Payment Terms")}: </span>
                      {q.payment_terms}
                    </div>
                  )}
                  {q.delivery_terms && (
                    <div className="body">
                      <span className="party-muted">{t("Delivery Terms")}: </span>
                      {q.delivery_terms}
                    </div>
                  )}
                  {q.delivery_location && (
                    <div className="body">
                      <span className="party-muted">
                        {t("Delivery Location")}:{" "}
                      </span>
                      {q.delivery_location}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {q.notes_to_client && (
                <div className="section">
                  <Label>{t("Notes")}</Label>
                  <div className="body">{q.notes_to_client}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="qd-footer">
              {t("Thank you for your business.")}
              {q.company_email && (
                <span className="ms-1">
                  · <a href={`mailto:${q.company_email}`}>{q.company_email}</a>
                </span>
              )}
              {q.company_phone && (
                <span className="ms-1">· {q.company_phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default QuotationPublicView;
