// Requirement Items table for the lead detail page — the lead's required
// products/quantities, with a "Create RFQ" action. Uses the shared sales-doc
// line-items table (product code-name + vendor badge, paginated).

import { Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "reactstrap";
import { Send } from "react-feather";
import { useTranslation } from "react-i18next";

import { appsRoot } from "@constant/defaultValues";
import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";
import SalesDocLineItemsTable from "@src/views/_shared/sales-doc/SalesDocLineItemsTable";

const RequirementItemsPanel = ({ embedded = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const l = useSelector((s) => s.lead?.leadItem);
  const lines = Array.isArray(l?.lines) ? l.lines : [];

  // Possible sales total from the requirement items, using each product's
  // master selling price (Σ qty × product_selling_price). A pre-quotation
  // estimate — actual figures come from the quotation costing.
  const estimatedSales = lines.reduce(
    (sum, ln) =>
      sum + (Number(ln?.qty) || 0) * (Number(ln?.product_selling_price) || 0),
    0
  );
  const pricedLines = lines.filter(
    (ln) => Number(ln?.product_selling_price) > 0
  ).length;

  const onCreateRfq = () => navigate(`${appsRoot}/rfq/view/new?lead_id=${id}`);

  const createBtn = (
    <Button
      color="primary"
      size="sm"
      onClick={onCreateRfq}
      id="lead-create-rfq-btn"
    >
      <Send size={14} className="me-50" />
      {t("Create RFQ")}
    </Button>
  );

  const content =
    lines.length === 0 ? (
      <DetailEmptyState
        icon={Send}
        title={t("No requirement items")}
        description={t("This lead has no requirement items yet.")}
      />
    ) : (
      <Fragment>
        <div className="d-flex justify-content-end mb-1">{createBtn}</div>
        <SalesDocLineItemsTable lines={lines} requirementMode />
        {estimatedSales > 0 && (
          <div className="d-flex justify-content-end align-items-baseline mt-1 gap-1">
            <span className="text-muted small">
              {t("Estimated Sales Value")}
              {pricedLines < lines.length
                ? ` (${pricedLines}/${lines.length} ${t("priced")})`
                : ""}
              :
            </span>
            <span className="fw-bold">
              ₹{estimatedSales.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </Fragment>
    );

  if (embedded) return content;

  return <DetailPanel title={t("Line Items")}>{content}</DetailPanel>;
};

export default RequirementItemsPanel;
