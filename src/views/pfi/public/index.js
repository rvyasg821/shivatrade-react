// ── PFI public / preview view ────────────────────────────────────────
// One renderer, two entry points:
//   /p/:token              → public, no auth (getPublicPfi)
//   /apps/pfi/preview/:id  → admin "preview as client" (getPfiPreview)
// Both feed `publicItem` — the sanitized, customer-currency projection.
// Never renders margin / expenses / rebates / internal notes.

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Download, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import { getPublicPfi, getPfiPreview } from "@src/views/pfi/store";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import { formatDate } from "@src/utility/dateFormat";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import appLogo from "@src/assets/images/logo/login-logo.png";

const Label = ({ children }) => (
  <div
    className="text-uppercase fw-bold text-muted mb-1"
    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
  >
    {children}
  </div>
);

const PfiPublicView = () => {
  const { token, id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.pfi);
  const p = store?.publicItem;
  const loading = !store?.loading;
  const isPreview = !!id;

  useEffect(() => {
    if (token) dispatch(getPublicPfi(token));
    else if (id) dispatch(getPfiPreview(id));
  }, [token, id, dispatch]);

  const [downloading, setDownloading] = useState(false);
  const onDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = token
        ? `${API_ENDPOINTS.pfis.publicPdf}/${token}/pdf`
        : `${API_ENDPOINTS.pfis.pdf}/${id}/pdf`;
      const resp = await instance.get(url, { responseType: "blob" });
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "pfi"}.pdf`;
      const blobUrl = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      /* silent — public page should degrade gracefully */
    } finally {
      setDownloading(false);
    }
  };

  const sym = p?.currency_symbol || p?.currency_code || "";
  const money = (v) => `${sym}${fmt(v)}`;

  if (loading && !p) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-muted mb-2" />
        <h5 className="text-muted">{store?.error || t("PFI not found")}</h5>
      </div>
    );
  }

  const shippingRows = [
    ["Port of Loading", p.port_of_loading],
    ["Port of Discharge", p.port_of_discharge],
    ["Final Destination", p.final_destination],
    ["Mode", p.mode_of_shipment],
    ["Country of Origin", p.country_of_origin],
    ["Country of Destination", p.country_of_final_destination],
    ...(p.container_used === true
      ? [["Container Qty × Size", p.container_details]]
      : []),
    [
      "Est. Shipment",
      p.est_shipment_date ? formatDate(p.est_shipment_date) : "",
    ],
    [
      "Est. Delivery",
      p.est_delivery_date ? formatDate(p.est_delivery_date) : "",
    ],
  ].filter((r) => !!r[1]);

  const hasShipping = shippingRows.length > 0;
  const hasPacking =
    (p.total_packages || 0) > 0 ||
    !!p.net_weight_kg ||
    !!p.gross_weight_kg ||
    !!p.packing_marks;

  return (
    <Fragment>
      <style>{`
        .pfi-public-wrap {
          background: #f4f5f7;
          min-height: 100vh;
          padding: 32px 16px;
        }
        .pfi-doc {
          max-width: 960px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
        .pfi-doc .qd-header {
          padding: 28px 36px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .pfi-doc .qd-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 2px;
          margin: 0;
          color: #1f2937;
        }
        .pfi-doc .qd-body { padding: 24px 36px; }
        .pfi-doc .qd-footer {
          padding: 16px 36px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 0.8rem;
          text-align: center;
        }
        .pfi-doc .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 28px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .pfi-doc .party-grid { grid-template-columns: 1fr; gap: 18px; }
          .pfi-doc .qd-header, .pfi-doc .qd-body, .pfi-doc .qd-footer { padding-left: 20px; padding-right: 20px; }
        }
        .pfi-doc .party-name { font-weight: 600; color: #1f2937; margin-bottom: 6px; }
        .pfi-doc .party-line { font-size: 0.83rem; color: #4b5563; line-height: 1.5; }
        .pfi-doc .party-muted { color: #6b7280; }
        .pfi-doc table.items { width: 100%; margin: 0; }
        .pfi-doc table.items thead th {
          background: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          font-size: 0.72rem;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb !important;
          border-top: 1px solid #e5e7eb !important;
          padding: 10px;
        }
        .pfi-doc table.items td {
          vertical-align: top;
          padding: 10px;
          border-bottom: 1px solid #f1f2f4;
          font-size: 0.85rem;
        }
        .pfi-doc table.items tbody tr:last-child td { border-bottom: 1px solid #e5e7eb; }
        .pfi-doc table.items tr.row-grand-tr td {
          padding: 14px 12px 6px;
          font-size: 1rem;
          color: #09418b;
          background: transparent;
          border: 0;
        }
        .pfi-doc table.items tr.row-grand-tr td.party-grand-label,
        .pfi-doc table.items tr.row-grand-tr td.party-grand-value {
          border-top: 2px solid #1f2937;
          white-space: nowrap;
        }
        .pfi-doc .section {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
        }
        .pfi-doc .section .body { font-size: 0.85rem; color: #4b5563; line-height: 1.6; white-space: pre-line; }
        .pfi-doc .kv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
          font-size: 0.83rem;
          color: #4b5563;
        }
        @media (max-width: 600px) {
          .pfi-doc .kv-grid { grid-template-columns: 1fr; }
        }
        .pfi-doc .kv-grid .kv-key { color: #6b7280; }
        .pfi-doc .banner {
          padding: 8px 14px;
          border-radius: 4px;
          font-size: 0.82rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pfi-doc .banner-info { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .pfi-doc .banner-warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
        .pfi-doc .status-badge {
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
          .pfi-public-wrap { background: #fff; padding: 0; }
          .pfi-doc { border: none; }
          .pfi-doc .no-print { display: none !important; }
        }
      `}</style>

      <div className="pfi-public-wrap">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {isPreview && (
            <div className="banner banner-info no-print">
              {t("Preview - this is what the client sees. Not yet shared.")}
            </div>
          )}
          {p.is_expired && (
            <div className="banner banner-warn">
              <AlertTriangle size={14} />
              {t("This PFI has expired.")}
            </div>
          )}

          <div className="d-flex justify-content-end mb-2 no-print">
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={onDownloadPdf}
              disabled={downloading}
            >
              <Download size={14} className="me-50" />
              {downloading ? t("Generating…") : t("Download PDF")}
            </Button>
          </div>

          <div className="pfi-doc">
            {/* Header */}
            <div className="qd-header d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <img
                  src={appLogo}
                  alt="Logo"
                  style={{ height: 60, marginBottom: 8 }}
                />
              </div>
              <div className="text-end">
                <h1 className="qd-title">{t("PROFORMA INVOICE")}</h1>
                <div className="party-muted" style={{ fontSize: "0.85rem" }}>
                  #{p.voucher_no || "-"}
                </div>
                <span className="status-badge mt-1 d-inline-block">
                  {p.status || "-"}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="qd-body">
              {/* Exporter / Buyer / Meta */}
              <div className="party-grid">
                <div>
                  <Label>{t("Exporter")}</Label>
                  <div className="party-name">{p.company_name || "-"}</div>
                  {p.company_address && (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {p.company_address}
                    </div>
                  )}
                  {p.company_phone && (
                    <div className="party-line">{p.company_phone}</div>
                  )}
                  {p.company_email && (
                    <div className="party-line">{p.company_email}</div>
                  )}
                  {p.company_iec && (
                    <div className="party-line party-muted">
                      {t("IEC")}: {p.company_iec}
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t("Buyer")}</Label>
                  <div className="party-name">{p.customer_name || "-"}</div>
                  {p.customer_contact_name && (
                    <div className="party-line">{p.customer_contact_name}</div>
                  )}
                  {p.customer_address && (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {p.customer_address}
                    </div>
                  )}
                  {p.customer_phone && (
                    <div className="party-line">{p.customer_phone}</div>
                  )}
                  {p.customer_email && (
                    <div className="party-line">{p.customer_email}</div>
                  )}
                </div>

                <div>
                  <Label>{t("PFI Details")}</Label>
                  <div className="party-line">
                    <span className="party-muted">{t("Date")}: </span>
                    <span className="fw-semibold">
                      {p.pfi_date ? formatDate(p.pfi_date) : "-"}
                    </span>
                  </div>
                  {p.valid_until && (
                    <div className="party-line">
                      <span className="party-muted">{t("Valid Until")}: </span>
                      <span className="fw-semibold">
                        {formatDate(p.valid_until)}
                      </span>
                    </div>
                  )}
                  <div className="party-line">
                    <span className="party-muted">{t("Currency")}: </span>
                    <span className="fw-semibold">
                      {sym} {p.currency_code || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consignee */}
              {(p.consignee_name || p.consignee_address) && (
                <div className="section">
                  <Label>{t("Consignee")}</Label>
                  <div className="party-name">{p.consignee_name || "-"}</div>
                  {p.consignee_address && (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {p.consignee_address}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping */}
              {hasShipping && (
                <div className="section">
                  <Label>{t("Shipping")}</Label>
                  <div className="kv-grid">
                    {shippingRows.map(([k, v]) => (
                      <div key={k}>
                        <span className="kv-key">{t(k)}: </span>
                        <span className="fw-semibold text-capitalize">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line items */}
              <div
                className="section"
                style={{ borderTop: "none", paddingTop: 0, marginTop: 24 }}
              >
                <Table className="items">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>{t("Product / Description")}</th>
                      <th className="text-end" style={{ width: 80 }}>
                        {t("Qty")}
                      </th>
                      <th style={{ width: 60 }}>{t("Unit")}</th>
                      <th className="text-end" style={{ width: 100 }}>
                        {t("Rate")}
                      </th>
                      <th className="text-end" style={{ width: 85 }}>
                        {t("Net Wt")}
                      </th>
                      <th className="text-end" style={{ width: 90 }}>
                        {t("Gross Wt")}
                      </th>
                      <th className="text-end" style={{ width: 70 }}>
                        {t("Pkgs")}
                      </th>
                      <th className="text-end" style={{ width: 120 }}>
                        {t("Amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(p.lines || []).map((l, i) => (
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
                        <td className="text-end">
                          {fmt(l.net_weight_kg || 0)}
                        </td>
                        <td className="text-end">
                          {fmt(l.gross_weight_kg || 0)}
                        </td>
                        <td className="text-end">{l.package_count || 0}</td>
                        <td className="text-end fw-semibold">
                          {money(l.line_total)}
                        </td>
                      </tr>
                    ))}
                    {(p.lines || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="text-center party-muted py-3"
                        >
                          {t("No line items.")}
                        </td>
                      </tr>
                    )}
                    {/* Grand Total sits as the last <tr> of <tbody> (not
                        in <tfoot>) so it doesn't repeat on every page when
                        the browser saves to PDF. */}
                    <tr className="row-grand-tr">
                      <td colSpan={7} />
                      <td className="text-end fw-bold party-grand-label">
                        {t("Grand Total")}
                      </td>
                      <td className="text-end fw-bold party-grand-value">
                        {money(p.grand_total)}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>

              {/* Packing summary */}
              {hasPacking && (
                <div className="section">
                  <Label>{t("Packing")}</Label>
                  <div className="kv-grid">
                    <div>
                      <span className="kv-key">{t("Total Packages")}: </span>
                      <span className="fw-semibold">
                        {p.total_packages || 0}
                        {p.packing_type ? ` × ${p.packing_type}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="kv-key">{t("Container")}: </span>
                      <span className="fw-semibold">
                        {p.container_used === true ? t("Yes") : t("No")}
                      </span>
                    </div>
                    {p.container_used === true && p.container_no && (
                      <div>
                        <span className="kv-key">{t("Container No.")}: </span>
                        <span className="fw-semibold">{p.container_no}</span>
                      </div>
                    )}
                    {p.container_used === true && p.seal_no && (
                      <div>
                        <span className="kv-key">{t("Seal No.")}: </span>
                        <span className="fw-semibold">{p.seal_no}</span>
                      </div>
                    )}
                    {p.container_used === true && p.container_load_type && (
                      <div>
                        <span className="kv-key">{t("Load Type")}: </span>
                        <span className="fw-semibold">
                          {p.container_load_type}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="kv-key">{t("Net Wt")}: </span>
                      <span className="fw-semibold">
                        {fmt(p.net_weight_kg || 0)} kg
                      </span>
                    </div>
                    <div>
                      <span className="kv-key">{t("Gross Wt")}: </span>
                      <span className="fw-semibold">
                        {fmt(p.gross_weight_kg || 0)} kg
                      </span>
                    </div>
                    {p.packing_marks && (
                      <div>
                        <span className="kv-key">{t("Marks")}: </span>
                        <span className="fw-semibold">{p.packing_marks}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank */}
              {p.bank && (
                <div className="section">
                  <Label>{t("Beneficiary Bank Details")}</Label>
                  <div className="kv-grid">
                    {p.bank.beneficiary_name && (
                      <div>
                        <span className="kv-key">{t("Beneficiary")}: </span>
                        <span className="fw-semibold">
                          {p.bank.beneficiary_name}
                        </span>
                      </div>
                    )}
                    {p.bank.bank_name && (
                      <div>
                        <span className="kv-key">{t("Bank")}: </span>
                        <span className="fw-semibold">{p.bank.bank_name}</span>
                      </div>
                    )}
                    {p.bank.account_number && (
                      <div>
                        <span className="kv-key">{t("Account No.")}: </span>
                        <span className="fw-semibold">
                          {p.bank.account_number}
                        </span>
                      </div>
                    )}
                    {p.bank.swift_code && (
                      <div>
                        <span className="kv-key">{t("SWIFT")}: </span>
                        <span className="fw-semibold">{p.bank.swift_code}</span>
                      </div>
                    )}
                    {p.bank.ifsc && (
                      <div>
                        <span className="kv-key">{t("IFSC")}: </span>
                        <span className="fw-semibold">{p.bank.ifsc}</span>
                      </div>
                    )}
                    {p.bank.iban && (
                      <div>
                        <span className="kv-key">{t("IBAN")}: </span>
                        <span className="fw-semibold">{p.bank.iban}</span>
                      </div>
                    )}
                    {p.bank.ad_code && (
                      <div>
                        <span className="kv-key">{t("AD Code")}: </span>
                        <span className="fw-semibold">{p.bank.ad_code}</span>
                      </div>
                    )}
                    {p.bank.currency_code && (
                      <div>
                        <span className="kv-key">{t("Account Currency")}: </span>
                        <span className="fw-semibold">
                          {p.bank.currency_code}
                        </span>
                      </div>
                    )}
                    {p.bank.branch_name && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <span className="kv-key">{t("Branch")}: </span>
                        <span className="fw-semibold">
                          {p.bank.branch_name}
                          {p.bank.branch_address
                            ? `, ${p.bank.branch_address}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              {p.payment_terms_text && (
                <div className="section">
                  <Label>{t("Payment Terms")}</Label>
                  <div className="body">{p.payment_terms_text}</div>
                </div>
              )}

              {/* Declaration */}
              {p.declaration_text && (
                <div className="section">
                  <Label>{t("Declaration")}</Label>
                  <div className="body">{p.declaration_text}</div>
                </div>
              )}

              {/* Notes */}
              {p.notes_to_client && (
                <div className="section">
                  <Label>{t("Notes")}</Label>
                  <div className="body">{p.notes_to_client}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="qd-footer">
              {t("Thank you for your business.")}
              {p.company_email && (
                <span className="ms-1">
                  · <a href={`mailto:${p.company_email}`}>{p.company_email}</a>
                </span>
              )}
              {p.company_phone && (
                <span className="ms-1">· {p.company_phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default PfiPublicView;
