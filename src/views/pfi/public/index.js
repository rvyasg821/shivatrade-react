// ── PFI public / preview view ────────────────────────────────────────
// One renderer, two entry points:
//   /p/:token              → public, no auth (getPublicPfi)
//   /apps/pfi/preview/:id  → admin "preview as client" (getPfiPreview)
// Both feed `publicItem` - the sanitized, customer-currency projection.
// Never renders margin / expenses / rebates / internal notes.

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Table, Badge, Spinner, Button } from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import { getPublicPfi, getPfiPreview } from "@src/views/pfi/store";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import appLogo from "@src/assets/images/logo/login-logo.png";

const PfiPublicView = () => {
  const { token, id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.pfi);
  const p = store?.publicItem;
  const loading = !store?.loading; // store.loading is inverted across this slice
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
      // user-visible Notification is heavy here; the public page should
      // degrade gracefully — silent failure is acceptable.
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
        <h4 className="text-muted">{store?.error || t("PFI not found")}</h4>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="pfi-public-view mx-auto py-3" style={{ maxWidth: 960 }}>
        {isPreview && (
          <div className="alert alert-info py-1 mb-2">
            {t("Preview - this is what the client sees. Not yet shared.")}
          </div>
        )}
        {p.is_expired && (
          <div className="alert alert-warning py-1 mb-2">
            {t("This PFI has expired.")}
          </div>
        )}

        <div className="d-flex justify-content-end mb-2">
          <Button
            color="primary"
            outline
            size="sm"
            onClick={onDownloadPdf}
            disabled={downloading}
          >
            <Download size={14} className="me-50" />
            {downloading ? t("Generating…") : t("Download PDF")}
          </Button>
        </div>

        <Card>
          <CardBody>
            {/* Letterhead */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <img
                  src={appLogo}
                  alt="Logo"
                  style={{ height: 38 }}
                  className="mb-1 d-block"
                />
                {p.company_name && <h4 className="mb-0">{p.company_name}</h4>}
              </div>
              <div className="text-end">
                <h3 className="mb-0 text-uppercase">{t("Proforma Invoice")}</h3>
                <div className="fw-bold">{p.voucher_no || "-"}</div>
                <Badge color="light-primary" className="text-capitalize">
                  {p.status || "-"}
                </Badge>
              </div>
            </div>

            {/* Exporter / Buyer / Meta */}
            <div className="d-flex justify-content-between flex-wrap mb-3">
              <div style={{ maxWidth: 280 }}>
                <div className="text-muted small">{t("Exporter")}</div>
                <div className="fw-bold">{p.company_name || "-"}</div>
                {p.company_address && (
                  <div
                    className="small text-muted"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {p.company_address}
                  </div>
                )}
                {p.company_phone && (
                  <div className="small">{p.company_phone}</div>
                )}
                {p.company_email && (
                  <div className="small">{p.company_email}</div>
                )}
                {p.company_iec && (
                  <div className="small">
                    <span className="text-muted">{t("IEC")}: </span>
                    {p.company_iec}
                  </div>
                )}
              </div>
              <div style={{ maxWidth: 280 }}>
                <div className="text-muted small">{t("Buyer")}</div>
                <div className="fw-bold">{p.customer_name || "-"}</div>
                {p.customer_contact_name && (
                  <div className="small">{p.customer_contact_name}</div>
                )}
                {p.customer_address && (
                  <div
                    className="small text-muted"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {p.customer_address}
                  </div>
                )}
                {p.customer_phone && (
                  <div className="small">{p.customer_phone}</div>
                )}
                {p.customer_email && (
                  <div className="small">{p.customer_email}</div>
                )}
              </div>
              <div className="text-end">
                <div className="small">
                  <span className="text-muted">{t("Date")}: </span>
                  {(p.pfi_date || "").slice(0, 10) || "-"}
                </div>
                {p.valid_until && (
                  <div className="small">
                    <span className="text-muted">{t("Valid Until")}: </span>
                    {p.valid_until.slice(0, 10)}
                  </div>
                )}
                <div className="small">
                  <span className="text-muted">{t("Currency")}: </span>
                  {p.currency_code || "-"}
                </div>
              </div>
            </div>

            {/* Consignee block (only render if different from buyer block) */}
            {(p.consignee_name || p.consignee_address) && (
              <div className="border-top pt-2 mb-3" style={{ maxWidth: 380 }}>
                <div className="text-muted small">{t("Consignee")}</div>
                <div className="fw-bold">{p.consignee_name || "-"}</div>
                {p.consignee_address && (
                  <div
                    className="small text-muted"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {p.consignee_address}
                  </div>
                )}
              </div>
            )}

            {/* Shipping */}
            {(p.port_of_loading ||
              p.port_of_discharge ||
              p.mode_of_shipment) && (
              <div className="border-top pt-2 mb-3">
                <div className="text-muted small mb-1 text-uppercase">
                  {t("Shipping")}
                </div>
                <div className="d-flex flex-wrap gap-4">
                  {p.port_of_loading && (
                    <div className="small">
                      <span className="text-muted">
                        {t("Port of Loading")}:{" "}
                      </span>
                      {p.port_of_loading}
                    </div>
                  )}
                  {p.port_of_discharge && (
                    <div className="small">
                      <span className="text-muted">
                        {t("Port of Discharge")}:{" "}
                      </span>
                      {p.port_of_discharge}
                    </div>
                  )}
                  {p.final_destination && (
                    <div className="small">
                      <span className="text-muted">
                        {t("Final Destination")}:{" "}
                      </span>
                      {p.final_destination}
                    </div>
                  )}
                  {p.mode_of_shipment && (
                    <div className="small text-capitalize">
                      <span className="text-muted">{t("Mode")}: </span>
                      {p.mode_of_shipment}
                    </div>
                  )}
                  {p.country_of_origin && (
                    <div className="small">
                      <span className="text-muted">
                        {t("Country of Origin")}:{" "}
                      </span>
                      {p.country_of_origin}
                    </div>
                  )}
                  {p.country_of_final_destination && (
                    <div className="small">
                      <span className="text-muted">
                        {t("Country of Destination")}:{" "}
                      </span>
                      {p.country_of_final_destination}
                    </div>
                  )}
                  {p.container_details && (
                    <div className="small">
                      <span className="text-muted">{t("Container")}: </span>
                      {p.container_details}
                    </div>
                  )}
                  {p.est_shipment_date && (
                    <div className="small">
                      <span className="text-muted">{t("Est. Shipment")}: </span>
                      {p.est_shipment_date.slice(0, 10)}
                    </div>
                  )}
                  {p.est_delivery_date && (
                    <div className="small">
                      <span className="text-muted">{t("Est. Delivery")}: </span>
                      {p.est_delivery_date.slice(0, 10)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line items */}
            <Table bordered responsive size="sm" className="mb-3">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>{t("Product")}</th>
                  <th className="text-end">{t("Qty")}</th>
                  <th>{t("Unit")}</th>
                  <th className="text-end">{t("Rate")}</th>
                  <th className="text-end">{t("Net Wt")}</th>
                  <th className="text-end">{t("Gross Wt")}</th>
                  <th className="text-end">{t("Pkgs")}</th>
                  <th className="text-end">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(p.lines || []).map((l, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="fw-bold">{l.product_name || "-"}</div>
                      {l.description && (
                        <div className="small text-muted">{l.description}</div>
                      )}
                    </td>
                    <td className="text-end">{l.qty || "-"}</td>
                    <td>{l.unit || "-"}</td>
                    <td className="text-end">{money(l.unit_price)}</td>
                    <td className="text-end">{fmt(l.net_weight_kg || 0)}</td>
                    <td className="text-end">{fmt(l.gross_weight_kg || 0)}</td>
                    <td className="text-end">{l.package_count || 0}</td>
                    <td className="text-end fw-bold">{money(l.line_total)}</td>
                  </tr>
                ))}
                {(p.lines || []).length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-3">
                      {t("No line items.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

            {/* Packing summary */}
            {(p.total_packages > 0 || p.gross_weight_kg || p.packing_marks) && (
              <div className="border-top pt-2 mb-3 small">
                <div className="text-muted text-uppercase mb-1">
                  {t("Packing")}
                </div>
                <div className="d-flex flex-wrap gap-4">
                  <div>
                    <span className="text-muted">{t("Total Packages")}: </span>
                    {p.total_packages || 0}
                    {p.packing_type ? ` × ${p.packing_type}` : ""}
                  </div>
                  <div>
                    <span className="text-muted">{t("Net Wt")}: </span>
                    {fmt(p.net_weight_kg || 0)} kg
                  </div>
                  <div>
                    <span className="text-muted">{t("Gross Wt")}: </span>
                    {fmt(p.gross_weight_kg || 0)} kg
                  </div>
                  {p.packing_marks && (
                    <div>
                      <span className="text-muted">{t("Marks")}: </span>
                      {p.packing_marks}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="d-flex justify-content-end mb-3">
              <div style={{ minWidth: 280 }}>
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>{t("Grand Total")}</span>
                  <span>{money(p.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            {p.bank && (
              <div className="border-top pt-2 mb-3 p-2 rounded bg-light ">
                <div className="text-muted small text-uppercase mb-1">
                  {t("Beneficiary Bank Details")}
                </div>
                <div className="row small text-dark">
                  {p.bank.beneficiary_name && (
                    <div className="col-md-6 ">
                      <span className="text-muted">{t("Beneficiary")}: </span>
                      {p.bank.beneficiary_name}
                    </div>
                  )}
                  {p.bank.bank_name && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("Bank")}: </span>
                      {p.bank.bank_name}
                    </div>
                  )}
                  {p.bank.account_number && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("Account No.")}: </span>
                      {p.bank.account_number}
                    </div>
                  )}
                  {p.bank.swift_code && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("SWIFT")}: </span>
                      {p.bank.swift_code}
                    </div>
                  )}
                  {p.bank.ifsc && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("IFSC")}: </span>
                      {p.bank.ifsc}
                    </div>
                  )}
                  {p.bank.iban && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("IBAN")}: </span>
                      {p.bank.iban}
                    </div>
                  )}
                  {p.bank.ad_code && (
                    <div className="col-md-6">
                      <span className="text-muted">{t("AD Code")}: </span>
                      {p.bank.ad_code}
                    </div>
                  )}
                  {p.bank.currency_code && (
                    <div className="col-md-6">
                      <span className="text-muted">
                        {t("Account Currency")}:{" "}
                      </span>
                      {p.bank.currency_code}
                    </div>
                  )}
                  {p.bank.branch_name && (
                    <div className="col-md-12">
                      <span className="text-muted">{t("Branch")}: </span>
                      {p.bank.branch_name}
                      {p.bank.branch_address
                        ? `, ${p.bank.branch_address}`
                        : ""}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms / Declaration / Notes */}
            {p.payment_terms_text && (
              <div className="small mb-2">
                <span className="text-muted">{t("Payment Terms")}: </span>
                <span style={{ whiteSpace: "pre-line" }}>
                  {p.payment_terms_text}
                </span>
              </div>
            )}
            {p.declaration_text && (
              <div className="border-top pt-2 small">
                <div className="text-muted">{t("Declaration")}</div>
                <div style={{ whiteSpace: "pre-line" }}>
                  {p.declaration_text}
                </div>
              </div>
            )}
            {p.notes_to_client && (
              <div className="border-top pt-2 small">
                <div className="text-muted">{t("Notes")}</div>
                <div style={{ whiteSpace: "pre-line" }}>
                  {p.notes_to_client}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default PfiPublicView;
