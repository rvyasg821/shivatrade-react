// ── Quotation public / preview view ──────────────────────────────────
// One renderer, two entry points:
//   /q/:token              → public, no auth (getPublicQuotation)
//   /quotations/preview/:id → admin "preview as client" (getQuotationPreview)
// Both feed `publicItem` - the sanitized, customer-currency projection.
// Never renders margin / expenses / rebates / internal notes.

import { Fragment, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Table, Badge, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";

import {
  getPublicQuotation,
  getQuotationPreview,
} from "@src/views/quotations/store";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import appLogo from "@src/assets/images/logo/login-logo.png";

const QuotationPublicView = () => {
  const { token, id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.quotation);
  const q = store?.publicItem;
  const loading = !store?.loading; // store.loading is inverted across this slice
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
        <h4 className="text-muted">
          {store?.error || t("Quotation not found")}
        </h4>
      </div>
    );
  }

  return (
    <Fragment>
      <div
        className="quotation-public-view mx-auto py-3"
        style={{ maxWidth: 900 }}
      >
        {isPreview && (
          <div className="alert alert-info py-1 mb-2">
            {t(
              "Preview - this is what the client sees. Not yet shared."
            )}
          </div>
        )}
        {q.is_expired && (
          <div className="alert alert-warning py-1 mb-2">
            {t("This quotation has expired.")}
          </div>
        )}

        <Card>
          <CardBody>
            {/* Letterhead - left: seller identity, right: document identity */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <img
                  src={appLogo}
                  alt="Logo"
                  style={{ height: 38 }}
                  className="mb-1 d-block"
                />
                {q.company_name && (
                  <h4 className="mb-0">{q.company_name}</h4>
                )}
              </div>
              <div className="text-end">
                <h3 className="mb-0 text-uppercase">{t("Quotation")}</h3>
                <div className="fw-bold">{q.voucher_no || "-"}</div>
                <Badge color="light-primary" className="text-capitalize">
                  {q.status || "-"}
                </Badge>
              </div>
            </div>

            {/* Meta */}
            <div className="d-flex justify-content-between flex-wrap mb-3">
              <div style={{ maxWidth: 280 }}>
                <div className="text-muted small">{t("Billed From")}</div>
                <div className="fw-bold">{q.company_name || "-"}</div>
                {q.company_address && (
                  <div
                    className="small text-muted"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {q.company_address}
                  </div>
                )}
                {q.company_phone && (
                  <div className="small">{q.company_phone}</div>
                )}
                {q.company_email && (
                  <div className="small">{q.company_email}</div>
                )}
                {q.company_iec && (
                  <div className="small">
                    <span className="text-muted">{t("IEC")}: </span>
                    {q.company_iec}
                  </div>
                )}
              </div>
              <div style={{ maxWidth: 280 }}>
                <div className="text-muted small">{t("Billed To")}</div>
                <div className="fw-bold">{q.customer_name || "-"}</div>
                {q.customer_contact_name && (
                  <div className="small">{q.customer_contact_name}</div>
                )}
                {q.customer_address && (
                  <div
                    className="small text-muted"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {q.customer_address}
                  </div>
                )}
                {q.customer_phone && (
                  <div className="small">{q.customer_phone}</div>
                )}
                {q.customer_email && (
                  <div className="small">{q.customer_email}</div>
                )}
              </div>
              <div className="text-end">
                <div className="small">
                  <span className="text-muted">{t("Date")}: </span>
                  {(q.quotation_date || "").slice(0, 10) || "-"}
                </div>
                {q.valid_until && (
                  <div className="small">
                    <span className="text-muted">
                      {t("Valid Until")}:{" "}
                    </span>
                    {q.valid_until.slice(0, 10)}
                  </div>
                )}
                <div className="small">
                  <span className="text-muted">{t("Currency")}: </span>
                  {q.currency_code || "-"}
                </div>
              </div>
            </div>

            {/* Line items */}
            <Table bordered responsive size="sm" className="mb-3">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>{t("Product")}</th>
                  <th className="text-end">{t("Qty")}</th>
                  <th>{t("Unit")}</th>
                  <th className="text-end">{t("Rate")}</th>
                  <th className="text-end">{t("Disc%")}</th>
                  <th className="text-end">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(q.lines || []).map((l, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="fw-bold">{l.product_name || "-"}</div>
                      {l.description && (
                        <div className="small text-muted">
                          {l.description}
                        </div>
                      )}
                    </td>
                    <td className="text-end">{l.qty || "-"}</td>
                    <td>{l.unit || "-"}</td>
                    <td className="text-end">{money(l.unit_price)}</td>
                    <td className="text-end">{l.discount_pct || 0}</td>
                    <td className="text-end fw-bold">
                      {money(l.line_total)}
                    </td>
                  </tr>
                ))}
                {(q.lines || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      {t("No line items.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

            {/* Totals */}
            <div className="d-flex justify-content-end mb-3">
              <div style={{ minWidth: 260 }}>
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>{t("Grand Total")}</span>
                  <span>{money(q.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {(q.payment_terms ||
              q.delivery_terms ||
              q.delivery_location) && (
              <div className="mb-2 small">
                {q.payment_terms && (
                  <div>
                    <span className="text-muted">
                      {t("Payment Terms")}:{" "}
                    </span>
                    {q.payment_terms}
                  </div>
                )}
                {q.delivery_terms && (
                  <div>
                    <span className="text-muted">
                      {t("Delivery Terms")}:{" "}
                    </span>
                    {q.delivery_terms}
                  </div>
                )}
                {q.delivery_location && (
                  <div>
                    <span className="text-muted">
                      {t("Delivery Location")}:{" "}
                    </span>
                    {q.delivery_location}
                  </div>
                )}
              </div>
            )}

            {q.notes_to_client && (
              <div className="border-top pt-2 small">
                <div className="text-muted">{t("Notes")}</div>
                <div style={{ whiteSpace: "pre-line" }}>
                  {q.notes_to_client}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default QuotationPublicView;
