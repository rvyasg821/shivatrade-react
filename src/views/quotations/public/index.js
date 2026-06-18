// ── Quotation public / preview view ──────────────────────────────────
// One renderer, two entry points:
//   /q/:token              → public, no auth (getPublicQuotation)
//   /quotations/preview/:id → admin "preview as client" (getQuotationPreview)
// Both feed `publicItem` — the sanitized, customer-currency projection.
// Never renders margin / expenses / rebates / internal notes.

import { Fragment, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { hostRestApiUrl } from "@constant/defaultValues";
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
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const q = store?.publicItem;
  const loading = !store?.loading;
  const isPreview = !!id;
  const autoPrint = searchParams.get("print") === "1";

  useEffect(() => {
    if (token) dispatch(getPublicQuotation(token));
    else if (id) dispatch(getQuotationPreview(id));
  }, [token, id, dispatch]);

  // Header "Download PDF" opens this page with ?print=1 → once the doc has
  // rendered, fire the browser print dialog so the user can Save as PDF.
  // The small delay lets the injected <style> + logo settle first.
  useEffect(() => {
    if (!autoPrint || !q) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [autoPrint, q]);

  const sym = q?.currency_symbol || q?.currency_code || "";
  const money = (v) => `${sym}${fmt(v)}`;

  // Letterhead logo — company logo (from profile) like the server PDF,
  // falling back to the app logo if none is set.
  const resolvedLogo = q?.company_logo_url
    ? q.company_logo_url.startsWith("http")
      ? q.company_logo_url
      : `${hostRestApiUrl}${q.company_logo_url}`
    : appLogo;

  // Footer identity line — GSTIN · PAN · CIN · IEC · website (same as PDF).
  const footerIdLine = [
    q?.company_gstin ? `GSTIN: ${q.company_gstin}` : "",
    q?.company_pan ? `PAN: ${q.company_pan}` : "",
    q?.company_cin ? `CIN: ${q.company_cin}` : "",
    q?.company_iec ? `IEC: ${q.company_iec}` : "",
    q?.company_website || "",
  ]
    .filter(Boolean)
    .join("  ·  ");

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
          grid-template-columns: 1fr 1fr;
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
        .quotation-doc table.items tbody tr.row-grand-tr td {
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
            {/* Header — logo + company identity (left), doc meta (right),
                mirroring the server PDF letterhead. */}
            <div className="qd-header d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <img
                  src={resolvedLogo}
                  alt="Logo"
                  style={{
                    maxHeight: 48,
                    maxWidth: 180,
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    marginBottom: 8,
                  }}
                  onError={(e) => {
                    e.target.src = appLogo;
                  }}
                />
                <div className="party-name">{q.company_name || "-"}</div>
                {q.company_phone && (
                  <div className="party-line">{q.company_phone}</div>
                )}
                {q.company_email && (
                  <div className="party-line">{q.company_email}</div>
                )}
              </div>
              <div className="text-end">
                <h1 className="qd-title">{t("QUOTATION")}</h1>
                <div className="party-muted" style={{ fontSize: "0.85rem" }}>
                  #{q.voucher_no || "-"}
                </div>
                <div className="party-muted" style={{ fontSize: "0.8rem" }}>
                  {t("Date")}:{" "}
                  {q.quotation_date ? formatDate(q.quotation_date) : "-"}
                  {" · "}
                  {t("Currency")}: {sym} {q.currency_code || "-"}
                </div>
                <span className="status-badge mt-1 d-inline-block">
                  {q.status || "-"}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="qd-body">
              {/* Party grid — Billed To + Details (seller identity now
                  lives in the header letterhead, matching the PDF). */}
              <div className="party-grid">
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
                  <Label>{t("Details")}</Label>
                  {q.valid_until && (
                    <div className="party-line">
                      <span className="party-muted">{t("Valid Until")}: </span>
                      <span className="fw-semibold">
                        {formatDate(q.valid_until)}
                      </span>
                    </div>
                  )}
                  {q.payment_terms && (
                    <div className="party-line">
                      <span className="party-muted">{t("Payment")}: </span>
                      {q.payment_terms}
                    </div>
                  )}
                  {q.delivery_terms && (
                    <div className="party-line">
                      <span className="party-muted">{t("Delivery")}: </span>
                      {q.delivery_terms}
                    </div>
                  )}
                  {q.delivery_location && (
                    <div className="party-line">
                      <span className="party-muted">{t("Ship To")}: </span>
                      {q.delivery_location}
                    </div>
                  )}
                  {!q.valid_until &&
                    !q.payment_terms &&
                    !q.delivery_terms &&
                    !q.delivery_location && (
                      <div className="party-line party-muted">-</div>
                    )}
                </div>
              </div>

              {/* Line items */}
              <Table className="items">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>{t("Product / Description")}</th>
                    <th style={{ width: 90 }}>{t("Part No")}</th>
                    <th className="text-end" style={{ width: 70 }}>
                      {t("Qty")}
                    </th>
                    <th style={{ width: 56 }}>{t("Unit")}</th>
                    <th className="text-end" style={{ width: 80 }}>
                      {t("Rate")}
                    </th>
                    <th className="text-end" style={{ width: 100 }}>
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
                        {l.hs_code ? (
                          <div
                            className="party-muted"
                            style={{ color: "#6e6b7b" }}
                          >
                            HSN: {l.hs_code}
                          </div>
                        ) : null}
                      </td>
                      <td>{l.part_no || "-"}</td>
                      <td className="text-end">{l.qty || "-"}</td>
                      <td>{l.unit || "-"}</td>
                      <td className="text-end">{money(l.unit_price)}</td>
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

              {/* Notes */}
              {q.notes_to_client && (
                <div className="section">
                  <Label>{t("Notes")}</Label>
                  <div className="body">{q.notes_to_client}</div>
                </div>
              )}
            </div>

            {/* Footer — address + identity line (GSTIN · PAN · CIN · IEC ·
                website), mirroring the server PDF footer. */}
            <div className="qd-footer">
              {q.company_footer_address && (
                <div>{q.company_footer_address}</div>
              )}
              {footerIdLine && (
                <div style={{ color: "#9ca3af", marginTop: 2 }}>
                  {footerIdLine}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default QuotationPublicView;
