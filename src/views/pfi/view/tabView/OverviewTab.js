// Internal read-only overview - shows the same parties + shipping/packing
// + lines + bank + declaration that the public view shows, plus full
// costing breakdown (margin/expenses/rebates) which is admin-only.

import { Fragment, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  User,
  Truck,
  Package,
  CreditCard,
  FileText,
  Anchor,
} from "react-feather";

import { fmt, num, computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

/* ─── Shared design tokens ────────────────────────────────────────── */
const CARD_BASE = "rounded-3 border h-100 d-flex flex-column";
const CARD_PAD = {
  padding: "1rem 1.1rem",
  backgroundColor: "#f8f9fa",
  color: "#212529",
};
const FIELD_LABEL_STYLE = {
  fontSize: "0.7rem",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
};

/* ─── Header chip with icon ───────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, label, color = "primary" }) => (
  <div className="d-flex align-items-center mb-1">
    <div
      className={`d-flex align-items-center justify-content-center rounded-circle bg-light-${color} me-75`}
      style={{ width: 28, height: 28, flexShrink: 0 }}
    >
      <Icon size={14} className={`text-${color}`} />
    </div>
    <h6
      className="text-muted mb-0 fw-bold"
      style={FIELD_LABEL_STYLE}
    >
      {label}
    </h6>
  </div>
);

/* ─── Field cell (label above value) ──────────────────────────────── */
const Field = ({ label, value, md = 4, prominent = false, mono = false }) => {
  if (!value) return null;
  return (
    <Col md={md} className="mb-1">
      <div className="text-muted mb-25" style={FIELD_LABEL_STYLE}>
        {label}
      </div>
      <div
        className={prominent ? "fw-bolder text-primary" : "fw-semibold"}
        style={{
          color: prominent ? undefined : "#212529",
          ...(mono ? { fontFamily: "monospace", letterSpacing: "0.3px" } : {}),
        }}
      >
        {value}
      </div>
    </Col>
  );
};

const Divider = () => <hr className="my-3 opacity-25" />;

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
    () => computeDocTotals(lines, p?.exchange_rate, { excludeGst: true }),
    [lines, p?.exchange_rate]
  );

  const seller = companyItem || {};
  const bank = p?.bank_account;

  return (
    <Fragment>
      {/* ── Parties: Seller / Buyer / Consignee ──────────────────────── */}
      <Row className="g-3 mb-3">
        <Col md="4">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader
              icon={Briefcase}
              label={t("Seller")}
              color="primary"
            />
            <div className="mt-1">
              <div className="fw-bolder mb-25">
                {seller.company_name || "-"}
              </div>
              <div className="small text-muted lh-base">
                {seller.address_1 && <div>{seller.address_1}</div>}
                {seller.address_2 && <div>{seller.address_2}</div>}
                {(seller.city || seller.state || seller.zipcode) && (
                  <div>
                    {[seller.city, seller.state, seller.zipcode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {seller.country && <div>{seller.country}</div>}
              </div>
              {seller.iec && (
                <div className="small mt-1">
                  <span className="text-muted">IEC </span>
                  <span className="fw-semibold">{seller.iec}</span>
                </div>
              )}
              {(seller.email || seller.mobile) && (
                <div className="small mt-1 text-muted lh-base">
                  {seller.email && <div>{seller.email}</div>}
                  {seller.mobile && <div>{seller.mobile}</div>}
                </div>
              )}
            </div>
          </div>
        </Col>

        <Col md="4">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader icon={User} label={t("Buyer")} color="success" />
            <div className="mt-1">
              <div className="fw-bolder mb-25">
                {p.customer_name || "-"}
              </div>
              <div className="small text-muted lh-base">
                {p.customer_contact_name && (
                  <div>{p.customer_contact_name}</div>
                )}
                {p.customer_contact_email && (
                  <div>{p.customer_contact_email}</div>
                )}
                {p.customer_contact_phone && (
                  <div>
                    {p.customer_contact_country_code
                      ? `+${p.customer_contact_country_code} `
                      : ""}
                    {p.customer_contact_phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Col>

        <Col md="4">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader
              icon={Truck}
              label={t("Consignee")}
              color="info"
            />
            <div className="mt-1">
              {(() => {
                const cs = p.consignee_snapshot;
                const hasSnap =
                  cs &&
                  (cs.name ||
                    cs.address_line1 ||
                    cs.city ||
                    cs.country);
                if (hasSnap) {
                  const addr = [
                    cs.address_line1,
                    cs.address_line2,
                    [cs.city, cs.state].filter(Boolean).join(", "),
                    [cs.country, cs.postcode].filter(Boolean).join(" - "),
                  ]
                    .filter(Boolean)
                    .join("\n");
                  return (
                    <>
                      <div className="fw-bolder mb-25">
                        {cs.name || "-"}
                      </div>
                      {addr && (
                        <div
                          className="small text-muted lh-base"
                          style={{ whiteSpace: "pre-line" }}
                        >
                          {addr}
                        </div>
                      )}
                    </>
                  );
                }
                return (
                  <>
                    <div className="fw-bolder mb-25">
                      {p.customer_name || "-"}
                    </div>
                    {p.customer_address && (
                      <div
                        className="small text-muted lh-base"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {p.customer_address}
                      </div>
                    )}
                    <div className="text-muted small fst-italic mt-25">
                      {t("Same as Buyer")}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Shipping & Packing summary ─────────────────────────────── */}
      <div className={`${CARD_BASE} mb-3`} style={CARD_PAD}>
        <SectionHeader
          icon={Anchor}
          label={t("Shipping & Packing")}
          color="warning"
        />
        <Row className="g-2 mt-1">
          <Field label={t("Port of Loading")} value={p?.port_of_loading} />
          <Field
            label={t("Port of Discharge")}
            value={p?.port_of_discharge}
          />
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
          <Field
            label={t("Total Packages")}
            value={`${p?.total_packages ?? 0}${
              p?.packing_type ? ` × ${p.packing_type}` : ""
            }`}
          />
          <Field
            label={t("Container Used")}
            value={p?.container_used === true ? t("Yes") : t("No")}
          />
          {p?.container_used === true && (
            <>
              <Field
                label={t("Container Qty × Size")}
                value={p?.container_details}
              />
              <Field label={t("Container No.")} value={p?.container_no} />
              <Field label={t("Seal No.")} value={p?.seal_no} />
              <Field label={t("Load Type")} value={p?.container_load_type} />
            </>
          )}
          <Field
            label={t("Net / Gross (kg)")}
            value={`${fmt(p?.net_weight_kg || 0)} / ${fmt(
              p?.gross_weight_kg || 0
            )}`}
          />
          <Field label={t("Packing Marks")} value={p?.packing_marks} />
        </Row>
      </div>

      {/* ── Line items ─────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-2 mt-3">
        <div className="d-flex align-items-center">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle bg-light-primary me-75"
            style={{ width: 32, height: 32 }}
          >
            <Package size={16} className="text-primary" />
          </div>
          <h5 className="mb-0 fw-bolder">{t("Line Items")}</h5>
        </div>
        <span className="badge bg-light-primary text-primary">
          {lines.length} {lines.length === 1 ? t("item") : t("items")}
        </span>
      </div>
      <div className="rounded-3 border overflow-hidden mb-3">
        <Table responsive hover size="sm" className="mb-0 align-middle">
          <thead
            className="table-light"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            <tr>
              <th style={{ width: 48, paddingLeft: "1rem" }}>#</th>
              <th>{t("Product")}</th>
              <th>{t("HS Code")}</th>
              <th className="text-end">{t("Qty")}</th>
              <th className="text-end">{t("Price")}</th>
              <th className="text-end">{t("Net Wt")}</th>
              <th className="text-end">{t("Gross Wt")}</th>
              <th className="text-end">{t("Pkgs")}</th>
              <th className="text-end" style={{ paddingRight: "1rem" }}>
                {t("Line Total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">
                  {t("No line items.")}
                </td>
              </tr>
            ) : (
              lines.map((l, i) => (
                <tr key={l._id || i}>
                  <td className="text-muted" style={{ paddingLeft: "1rem" }}>
                    {i + 1}
                  </td>
                  <td className="text-wrap" style={{ minWidth: 200 }}>
                    <div className="fw-semibold">
                      {l.product_name || l.product_code || "-"}
                    </div>
                    {l.description && (
                      <small className="text-muted d-block">
                        {l.description}
                      </small>
                    )}
                  </td>
                  <td>
                    {l.hs_code ? (
                      <code className="text-primary">{l.hs_code}</code>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-end">{l.qty || "-"}</td>
                  <td className="text-end">{fmt(l.unit_price)}</td>
                  <td className="text-end text-muted">
                    {fmt(l.net_weight_kg || 0)}
                  </td>
                  <td className="text-end text-muted">
                    {fmt(l.gross_weight_kg || 0)}
                  </td>
                  <td className="text-end">{num(l.package_count) || 0}</td>
                  <td
                    className="text-end fw-bolder text-primary"
                    style={{ paddingRight: "1rem" }}
                  >
                    {fmt(l.line_total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* ── Bank Account ───────────────────────────────────────────── */}
      {bank && (
        <div className={`${CARD_BASE} mb-3`} style={CARD_PAD}>
          <SectionHeader
            icon={CreditCard}
            label={t("Bank Account (Beneficiary)")}
            color="success"
          />
          <Row className="g-2 mt-1">
            <Field
              label={t("Beneficiary")}
              value={bank.beneficiary_name}
              prominent
            />
            <Field label={t("Bank")} value={bank.bank_name} />
            <Field
              label={t("Account No.")}
              value={bank.account_number}
              prominent
              mono
            />
            <Field
              label={t("SWIFT")}
              value={bank.swift_code}
              prominent
              mono
            />
            <Field label={t("IFSC")} value={bank.ifsc} mono />
            <Field label={t("IBAN")} value={bank.iban} mono />
            <Field label={t("AD Code")} value={bank.ad_code} mono />
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
              md={8}
            />
          </Row>
        </div>
      )}

      {/* ── Payment Terms + Declaration ───────────────────────────── */}
      {(p?.payment_terms_text || p?.declaration_text) && (
        <Row className="g-3 mb-3">
          {p?.payment_terms_text && (
            <Col md="6">
              <div
                className={CARD_BASE}
                style={{
                  ...CARD_PAD,
                  borderLeft: "3px solid var(--bs-primary)",
                }}
              >
                <SectionHeader
                  icon={FileText}
                  label={t("Payment Terms")}
                  color="primary"
                />
                <div
                  className="mt-1 lh-base"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {p.payment_terms_text}
                </div>
              </div>
            </Col>
          )}
          {p?.declaration_text && (
            <Col md="6">
              <div
                className={CARD_BASE}
                style={{
                  ...CARD_PAD,
                  borderLeft: "3px solid var(--bs-info)",
                }}
              >
                <SectionHeader
                  icon={FileText}
                  label={t("Declaration")}
                  color="info"
                />
                <div
                  className="mt-1 lh-base"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {p.declaration_text}
                </div>
              </div>
            </Col>
          )}
        </Row>
      )}

      {p?.internal_notes && (
        <Fragment>
          <Divider />
          <div className="text-muted fw-bold mb-50" style={FIELD_LABEL_STYLE}>
            {t("Internal Notes")}
          </div>
          <div className="small lh-base" style={{ whiteSpace: "pre-line" }}>
            {p.internal_notes}
          </div>
        </Fragment>
      )}

      {/* Costing breakdown - invoice-footer style: right-aligned below the
          line items, same vertical flow as the wizard's final step. */}
      <Row className="mt-4 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={p?.currency_code}
            sticky={false}
            hideGst
          />
        </Col>
      </Row>
    </Fragment>
  );
};

export default OverviewTab;
