// Right-side "Details" panel for the PFI detail page: Shipping & Packing
// followed by Bank Account (Beneficiary). Renders inside a DetailPanel.

import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Anchor, CreditCard } from "react-feather";

import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import { formatDate } from "@src/utility/dateFormat";
import { DetailPanel } from "@src/views/_shared/detail-page";

const SectionLabel = ({ children, icon: Icon }) => (
  <div className="d-flex align-items-center mb-50">
    {Icon ? (
      <Icon size={14} className="me-50" style={{ color: "#1a2238" }} />
    ) : null}
    <span
      className="fw-bold text-uppercase"
      style={{ fontSize: "0.7rem", letterSpacing: "0.5px", color: "#1a2238" }}
    >
      {children}
    </span>
  </div>
);

const Field = ({ label, value, md = 6 }) => {
  if (value === undefined || value === null || value === "" || value === "-")
    return null;
  return (
    <Col md={md} className="mb-1">
      <div
        className="text-muted mb-25"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div className="fw-semibold" style={{ color: "#212529" }}>
        {value}
      </div>
    </Col>
  );
};

const PfiDetailsPanel = () => {
  const { t } = useTranslation();
  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const bank = p?.bank_account;

  const shipDates =
    p?.est_shipment_date || p?.est_delivery_date
      ? `${p?.est_shipment_date ? formatDate(p.est_shipment_date) : "—"} → ${
          p?.est_delivery_date ? formatDate(p.est_delivery_date) : "—"
        }`
      : null;

  return (
    <DetailPanel title={t("Details")}>
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
        {shipDates && (
          <Field label={t("Est. Ship / Deliver")} value={shipDates} md={12} />
        )}
        {(p?.total_packages || p?.packing_type) && (
          <Field
            label={t("Total Packages")}
            value={`${p?.total_packages ?? 0}${
              p?.packing_type ? ` × ${p.packing_type}` : ""
            }`}
          />
        )}
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
        {(p?.net_weight_kg || p?.gross_weight_kg) && (
          <Field
            label={t("Net / Gross (kg)")}
            value={`${fmt(p?.net_weight_kg || 0)} / ${fmt(
              p?.gross_weight_kg || 0
            )}`}
          />
        )}
        <Field
          label={t("Packing Marks")}
          value={p?.packing_marks}
          md={12}
        />
      </Row>

      {bank && (
        <Fragment>
          <div className="mt-1 pt-1 border-top">
            <SectionLabel icon={CreditCard}>
              {t("Bank Account (Beneficiary)")}
            </SectionLabel>
            <Row className="g-1">
              <Field
                label={t("Beneficiary")}
                value={bank.beneficiary_name}
                md={12}
              />
              <Field label={t("Bank")} value={bank.bank_name} md={12} />
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
                md={12}
              />
            </Row>
          </div>
        </Fragment>
      )}
    </DetailPanel>
  );
};

export default PfiDetailsPanel;
