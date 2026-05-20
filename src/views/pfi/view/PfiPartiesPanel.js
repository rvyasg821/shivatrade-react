// Parties + shipping + terms grouped inside the PFI summary card.
// Renders inline (no inner Card) so the parent DetailPanel owns the chrome.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  User,
  Truck,
  CreditCard,
  Anchor,
  FileText,
} from "react-feather";

import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import { formatDate } from "@src/utility/dateFormat";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

const SectionLabel = ({ children, icon: Icon }) => (
  <div className="d-flex align-items-center mb-50">
    {Icon ? <Icon size={14} className="me-50" style={{ color: "#1a2238" }} /> : null}
    <span
      className="fw-bold text-uppercase"
      style={{ fontSize: "0.7rem", letterSpacing: "0.5px", color: "#1a2238" }}
    >
      {children}
    </span>
  </div>
);

const PartyCard = ({ icon: Icon, label, children }) => (
  <div className="p-1 h-100">
    <SectionLabel icon={Icon}>{label}</SectionLabel>
    <div className="small lh-base" style={{ color: "#212529" }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, value, md = 4 }) => {
  if (value === undefined || value === null || value === "" || value === "-")
    return null;
  return (
    <Col md={md} className="mb-1">
      <div
        className="text-muted mb-25"
        style={{ fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase" }}
      >
        {label}
      </div>
      <div className="fw-semibold" style={{ color: "#212529" }}>
        {value}
      </div>
    </Col>
  );
};

const PfiPartiesPanel = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { pfiItem } = useSelector((s) => s.pfi);
  const { companyItem } = useSelector((s) => s.company || { companyItem: {} });
  const p = pfiItem || {};
  const seller = companyItem || {};
  const bank = p?.bank_account;

  useEffect(() => {
    if (!companyItem?._id) dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shipDates =
    p?.est_shipment_date || p?.est_delivery_date
      ? `${p?.est_shipment_date ? formatDate(p.est_shipment_date) : "—"} → ${
          p?.est_delivery_date ? formatDate(p.est_delivery_date) : "—"
        }`
      : null;

  return (
    <Fragment>
      {/* Parties */}
      <Row className="g-1">
        <Col md="4">
          <PartyCard icon={Briefcase} label={t("Seller")}>
            <div className="fw-bolder mb-25" style={{ color: "#212529" }}>
              {seller.company_name || "-"}
            </div>
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
            {seller.iec && (
              <div className="mt-50">
                <span className="text-muted">IEC </span>
                <span className="fw-semibold">{seller.iec}</span>
              </div>
            )}
          </PartyCard>
        </Col>
        <Col md="4">
          <PartyCard icon={User} label={t("Buyer")}>
            <div className="fw-bolder mb-25" style={{ color: "#212529" }}>
              {p.customer_name || "-"}
            </div>
            {p.customer_contact_name && <div>{p.customer_contact_name}</div>}
            {p.customer_contact_email && <div>{p.customer_contact_email}</div>}
            {p.customer_contact_phone && (
              <div>
                {(() => {
                  const cc = p.customer_contact_country_code;
                  const code =
                    cc && typeof cc === "object"
                      ? cc.dial_code || cc.code || cc.value || ""
                      : cc || "";
                  return code ? `+${String(code).replace(/^\+/, "")} ` : "";
                })()}
                {p.customer_contact_phone}
              </div>
            )}
          </PartyCard>
        </Col>
        <Col md="4">
          <PartyCard icon={Truck} label={t("Consignee")}>
            {p.consignee_name || p.consignee_address ? (
              <Fragment>
                <div className="fw-bolder mb-25" style={{ color: "#212529" }}>
                  {p.consignee_name || "-"}
                </div>
                {p.consignee_address && (
                  <div style={{ whiteSpace: "pre-line" }}>
                    {p.consignee_address}
                  </div>
                )}
              </Fragment>
            ) : (
              <div className="fst-italic" style={{ opacity: 0.7 }}>
                {t("Same as Buyer")}
              </div>
            )}
          </PartyCard>
        </Col>
      </Row>

      {/* Shipping & Packing */}
      <div className="mt-2">
        <SectionLabel icon={Anchor}>{t("Shipping & Packing")}</SectionLabel>
        <Row className="g-1">
          <Field label={t("Port of Loading")} value={p?.port_of_loading} />
          <Field label={t("Port of Discharge")} value={p?.port_of_discharge} />
          <Field
            label={t("Mode")}
            value={
              p?.mode_of_shipment ? (
                <span className="text-capitalize">{p.mode_of_shipment}</span>
              ) : null
            }
          />
          <Field label={t("Final Destination")} value={p?.final_destination} />
          <Field label={t("Country of Origin")} value={p?.country_of_origin} />
          <Field
            label={t("Country of Destination")}
            value={p?.country_of_final_destination}
          />
          {shipDates && <Field label={t("Est. Ship / Deliver")} value={shipDates} />}
          <Field label={t("Container")} value={p?.container_details} />
          {(p?.total_packages || p?.packing_type) && (
            <Field
              label={t("Total Packages")}
              value={`${p?.total_packages ?? 0}${
                p?.packing_type ? ` × ${p.packing_type}` : ""
              }`}
            />
          )}
          {(p?.net_weight_kg || p?.gross_weight_kg) && (
            <Field
              label={t("Net / Gross (kg)")}
              value={`${fmt(p?.net_weight_kg || 0)} / ${fmt(p?.gross_weight_kg || 0)}`}
            />
          )}
          <Field label={t("Packing Marks")} value={p?.packing_marks} md={8} />
        </Row>
      </div>

      {/* Bank */}
      {bank && (
        <div className="mt-1">
          <SectionLabel icon={CreditCard}>
            {t("Bank Account (Beneficiary)")}
          </SectionLabel>
          <Row className="g-1">
            <Field label={t("Beneficiary")} value={bank.beneficiary_name} />
            <Field label={t("Bank")} value={bank.bank_name} />
            <Field label={t("Account No.")} value={bank.account_number} />
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
              md={8}
            />
          </Row>
        </div>
      )}

      {/* Terms + Declaration */}
      {(p?.payment_terms_text || p?.declaration_text) && (
        <Row className="g-1 mt-1">
          {p?.payment_terms_text && (
            <Col md="6">
              <SectionLabel icon={FileText}>{t("Payment Terms")}</SectionLabel>
              <div className="small lh-base" style={{ whiteSpace: "pre-line" }}>
                {p.payment_terms_text}
              </div>
            </Col>
          )}
          {p?.declaration_text && (
            <Col md="6">
              <SectionLabel icon={FileText}>{t("Declaration")}</SectionLabel>
              <div className="small lh-base" style={{ whiteSpace: "pre-line" }}>
                {p.declaration_text}
              </div>
            </Col>
          )}
        </Row>
      )}

      {p?.internal_notes && (
        <div className="mt-1">
          <SectionLabel icon={FileText}>{t("Internal Notes")}</SectionLabel>
          <div className="small lh-base" style={{ whiteSpace: "pre-line" }}>
            {p.internal_notes}
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default PfiPartiesPanel;
