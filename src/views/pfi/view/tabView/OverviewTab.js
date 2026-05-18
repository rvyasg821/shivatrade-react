// Internal read-only overview - shows the same parties + shipping/packing
// + lines + bank + declaration that the public view shows, plus full
// costing breakdown (margin/expenses/rebates) which is admin-only.

import { Fragment, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import { fmt, num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

const Field = ({ label, value }) =>
  value ? (
    <Col md="4" className="mb-1">
      <small className="text-muted d-block">{label}</small>
      <span>{value}</span>
    </Col>
  ) : null;

const OverviewTab = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { pfiItem } = useSelector((s) => s.pfi);
  const { companyItem } = useSelector((s) => s.company || { companyItem: {} });
  const p = pfiItem || {};
  const lines = p?.lines || [];

  useEffect(() => {
    if (!companyItem?._id) dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => computeDocTotals(lines, p?.exchange_rate),
    [lines, p?.exchange_rate]
  );

  const seller = companyItem || {};
  const bank = p?.bank_account;

  return (
    <Fragment>
      {/* ── Parties: Seller / Buyer / Consignee ──────────────────────── */}
      <Row>
        <Col md="4">
          <div className="mb-3 p-2 border rounded h-100 bg-light text-dark">
            <h6 className="text-uppercase text-muted small mb-2">
              {t("Seller")}
            </h6>
            <div className="fw-bold">{seller.company_name || "-"}</div>
            {seller.address_1 && <div>{seller.address_1}</div>}
            {seller.address_2 && <div>{seller.address_2}</div>}
            <div>
              {[seller.city, seller.state, seller.zipcode]
                .filter(Boolean)
                .join(", ")}
            </div>
            <div>{seller.country}</div>
            {seller.iec && (
              <div>
                <small className="text-muted">IEC: </small>
                {seller.iec}
              </div>
            )}
            {seller.email && <div>{seller.email}</div>}
            {seller.mobile && <div>{seller.mobile}</div>}
          </div>
        </Col>

        <Col md="4">
          <div className="mb-3 p-2 border rounded h-100 bg-light text-dark">
            <h6 className="text-uppercase text-muted small mb-2">
              {t("Buyer")}
            </h6>
            <div className="fw-bold">{p.customer_name || "-"}</div>
            {p.customer_contact_name && <div>{p.customer_contact_name}</div>}
            {p.customer_contact_email && <div>{p.customer_contact_email}</div>}
            {p.customer_contact_phone && (
              <div>
                {p.customer_contact_country_code
                  ? `+${p.customer_contact_country_code} `
                  : ""}
                {p.customer_contact_phone}
              </div>
            )}
          </div>
        </Col>

        <Col md="4">
          <div className="mb-3 p-2 border rounded h-100 bg-light text-dark">
            <h6 className="text-uppercase text-muted small mb-2">
              {t("Consignee")}
            </h6>
            {p.consignee_name || p.consignee_address ? (
              <>
                <div className="fw-bold">{p.consignee_name || "-"}</div>
                {p.consignee_address && (
                  <div style={{ whiteSpace: "pre-line" }}>
                    {p.consignee_address}
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted small">
                {t("Same as Buyer")}
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* ── Shipping & Packing summary ─────────────────────────────── */}
      <div className="mb-3 p-2 border rounded bg-light">
        <h6 className="text-uppercase text-muted small mb-2">
          {t("Shipping & Packing")}
        </h6>
        <Row>
          <Field label={t("Port of Loading")} value={p?.port_of_loading} />
          <Field label={t("Port of Discharge")} value={p?.port_of_discharge} />
          <Field
            label={t("Mode of Shipment")}
            value={
              p?.mode_of_shipment ? (
                <span className="text-capitalize">{p.mode_of_shipment}</span>
              ) : null
            }
          />
          <Field
            label={t("Final Destination")}
            value={p?.final_destination}
          />
          <Field
            label={t("Country of Origin")}
            value={p?.country_of_origin}
          />
          <Field
            label={t("Country of Destination")}
            value={p?.country_of_final_destination}
          />
          {(p?.est_shipment_date || p?.est_delivery_date) && (
            <Field
              label={t("Est. Ship / Deliver")}
              value={`${(p?.est_shipment_date || "-").slice(0, 10)} / ${(
                p?.est_delivery_date || "-"
              ).slice(0, 10)}`}
            />
          )}
          <Field label={t("Container")} value={p?.container_details} />
          <Field
            label={t("Total Packages")}
            value={`${p?.total_packages ?? 0}${
              p?.packing_type ? ` × ${p.packing_type}` : ""
            }`}
          />
          <Field
            label={t("Net / Gross (kg)")}
            value={`${fmt(p?.net_weight_kg || 0)} / ${fmt(
              p?.gross_weight_kg || 0
            )}`}
          />
          <Field label={t("Packing Marks")} value={p?.packing_marks} />
        </Row>
      </div>

      {/* Full-width line items */}
      <h4 className="mb-2">{t("Line Items")}</h4>
      <Table responsive bordered size="sm" className="mb-3">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th>{t("HS Code")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Net Wt")}</th>
            <th className="text-end">{t("Gross Wt")}</th>
            <th className="text-end">{t("Pkgs")}</th>
            <th className="text-end">{t("Line Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            lines.map((l, i) => (
              <tr key={l._id || i}>
                <td>{i + 1}</td>
                <td className="text-wrap">
                  <div className="fw-semibold">
                    {l.product_name || l.product_code || "-"}
                  </div>
                  {l.description && (
                    <small className="text-muted d-block">
                      {l.description}
                    </small>
                  )}
                </td>
                <td>{l.hs_code || "-"}</td>
                <td className="text-end">{l.qty || "-"}</td>
                <td className="text-end">{fmt(l.unit_price)}</td>
                <td className="text-end">{fmt(l.net_weight_kg || 0)}</td>
                <td className="text-end">{fmt(l.gross_weight_kg || 0)}</td>
                <td className="text-end">{num(l.package_count) || 0}</td>
                <td className="text-end fw-bold">{fmt(l.line_total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* ── Bank Account ───────────────────────────────────────────── */}
      {bank && (
        <div className="mb-3 p-2 border rounded bg-light text-dark">
          <h6 className="text-uppercase text-muted small mb-2">
            {t("Bank Account (Beneficiary)")}
          </h6>
          <Row>
            <Field
              label={t("Beneficiary")}
              value={bank.beneficiary_name}
            />
            <Field label={t("Bank")} value={bank.bank_name} />
            <Field
              label={t("Account No.")}
              value={bank.account_number}
            />
            <Field label={t("SWIFT")} value={bank.swift_code} />
            <Field label={t("IFSC")} value={bank.ifsc} />
            <Field label={t("IBAN")} value={bank.iban} />
            <Field label={t("AD Code")} value={bank.ad_code} />
            <Field label={t("Currency")} value={bank.currency_code} />
            <Field
              label={t("Branch")}
              value={
                bank.branch_name
                  ? `${bank.branch_name}${
                      bank.branch_address ? `, ${bank.branch_address}` : ""
                    }`
                  : null
              }
            />
          </Row>
        </div>
      )}

      {/* ── Payment Terms + Declaration ───────────────────────────── */}
      {(p?.payment_terms_text || p?.declaration_text) && (
        <Row>
          {p?.payment_terms_text && (
            <Col md="6">
              <div className="mb-3 p-2 border rounded h-100 bg-light text-dark">
                <h6 className="text-uppercase text-muted small mb-2">
                  {t("Payment Terms")}
                </h6>
                <div style={{ whiteSpace: "pre-line" }}>
                  {p.payment_terms_text}
                </div>
              </div>
            </Col>
          )}
          {p?.declaration_text && (
            <Col md="6">
              <div className="mb-3 p-2 border rounded h-100 bg-light text-dark">
                <h6 className="text-uppercase text-muted small mb-2">
                  {t("Declaration")}
                </h6>
                <div style={{ whiteSpace: "pre-line" }}>
                  {p.declaration_text}
                </div>
              </div>
            </Col>
          )}
        </Row>
      )}

      {p?.internal_notes && (
        <div className="border-top pt-2 mt-3">
          <div className="text-muted small">{t("Internal Notes")}</div>
          <div style={{ whiteSpace: "pre-line" }}>{p.internal_notes}</div>
        </div>
      )}

      {/* Costing breakdown - invoice-footer style: right-aligned below the
          line items, same vertical flow as the wizard's final step. */}
      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={p?.currency_code}
            sticky={false}
          />
        </Col>
      </Row>
    </Fragment>
  );
};

export default OverviewTab;
