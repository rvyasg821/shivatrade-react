// Read-only view of all non-summary lead fields. Anything already shown on
// the InfoCard (name, primary contact, status, follow-up, budget) is omitted
// here to avoid duplication.

import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";

const Field = ({ label, value }) => (
  <Col md="6" className="mb-1">
    <div className="text-muted small">{label}</div>
    <div className="text-break" style={{ overflowWrap: "anywhere" }}>
      {value || "-"}
    </div>
  </Col>
);

const DetailsTab = () => {
  const { t } = useTranslation();
  const { leadItem } = useSelector((s) => s.lead);
  const l = leadItem || {};

  const addressLines = [
    l?.address_line1,
    l?.address_line2,
    [l?.city, l?.state, l?.postcode].filter(Boolean).join(", "),
    l?.country,
  ]
    .filter(Boolean)
    .join("\n");

  const interestedCategories =
    (l?.interested_categories || [])
      .map((c) => c?.name || c?.label || c)
      .filter(Boolean)
      .join(", ") || null;

  const interestedProducts =
    (l?.interested_products || [])
      .map((p) => p?.name || p?.label || p)
      .filter(Boolean)
      .join(", ") || null;

  return (
    <Fragment>
      <h4 className="mb-2">{t("Lead Details")}</h4>

      <h5 className="fw-bolder border-bottom pb-50 mb-1">
        {t("Address")}
      </h5>
      <Row className="mb-2">
        <Col md="12" className="mb-1">
          <div
            className="text-break"
            style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
          >
            {addressLines || "-"}
          </div>
        </Col>
      </Row>

      <h5 className="fw-bolder border-bottom pb-50 mb-1">
        {t("Opportunity")}
      </h5>
      <Row className="mb-2">
        <Field label={t("Quantity")} value={l?.quantity} />
        <Field
          label={t("Delivery Expectation")}
          value={l?.delivery_expectation}
        />
        <Field
          label={t("Interested Categories")}
          value={interestedCategories}
        />
        <Field label={t("Interested Products")} value={interestedProducts} />
      </Row>

      <h5 className="fw-bolder border-bottom pb-50 mb-1">
        {t("Lead Brief / Description")}
      </h5>
      <Row>
        <Col md="12" className="mb-1">
          <div
            className="text-break"
            style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
          >
            {l?.description || "-"}
          </div>
        </Col>
      </Row>
    </Fragment>
  );
};

export default DetailsTab;
