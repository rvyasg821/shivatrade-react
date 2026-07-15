// Reports landing — a card grid of the reports suite. Product-wise
// Profitability is live; the other four are placeholders until their build docs
// land (HSN Summary, Customer Turnover, Monthly Turnover, Input-Output GST).
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, CardBody, Badge } from "reactstrap";
import { TrendingUp, FileText, Users, BarChart2, Percent } from "react-feather";
import { useTranslation } from "react-i18next";

import { appsRoot } from "@constant/defaultValues";

const REPORTS = [
  {
    key: "product-profitability",
    title: "Product-wise Profitability",
    description: "Revenue vs fully-loaded cost and margin, per product.",
    icon: TrendingUp,
    to: `${appsRoot}/reports/product-profitability`,
    live: true,
  },
  {
    key: "hsn-summary",
    title: "HSN Summary (GSTR-1)",
    description: "Taxable value and tax grouped by HSN, for GST returns.",
    icon: FileText,
    live: false,
  },
  {
    key: "customer-turnover",
    title: "Customer Turnover",
    description: "Total sales per customer over a period.",
    icon: Users,
    live: false,
  },
  {
    key: "monthly-turnover",
    title: "Monthly Sales & Purchase",
    description: "Month-wise sales and purchase turnover.",
    icon: BarChart2,
    live: false,
  },
  {
    key: "gst-balance",
    title: "Input-Output GST Balance",
    description: "Output GST on sales vs input GST (ITC) on purchases.",
    icon: Percent,
    live: false,
  },
];

const ReportCard = ({ report }) => {
  const { t } = useTranslation();
  const Icon = report.icon;
  const body = (
    <Card className={`mb-0 h-100 ${report.live ? "cursor-pointer" : ""}`}>
      <CardBody>
        <div className="d-flex align-items-center mb-1">
          <div
            className="d-flex align-items-center justify-content-center rounded me-1"
            style={{ width: 42, height: 42, background: "rgba(115,103,240,0.12)" }}
          >
            <Icon size={22} className="text-primary" />
          </div>
          <h5 className="mb-0">{t(report.title)}</h5>
          {!report.live && (
            <Badge color="light-secondary" className="ms-auto">
              {t("Coming soon")}
            </Badge>
          )}
        </div>
        <div className="text-muted small">{t(report.description)}</div>
      </CardBody>
    </Card>
  );

  return (
    <Col md="4" sm="6" className="mb-2">
      {report.live ? (
        <Link to={report.to} style={{ textDecoration: "none" }}>
          {body}
        </Link>
      ) : (
        <div style={{ opacity: 0.6 }}>{body}</div>
      )}
    </Col>
  );
};

const ReportsLanding = () => {
  const { t } = useTranslation();
  return (
    <Fragment>
      <div className="main-content reports-landing">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Reports")}</h3>
        </div>
        <Row>
          {REPORTS.map((r) => (
            <ReportCard key={r.key} report={r} />
          ))}
        </Row>
      </div>
    </Fragment>
  );
};

export default ReportsLanding;
