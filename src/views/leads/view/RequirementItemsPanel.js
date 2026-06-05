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
import { getCurrencySymbol, convertFromInr } from "@src/utility/currency";
import { DetailPanel, DetailEmptyState } from "@src/views/_shared/detail-page";
import SalesDocLineItemsTable from "@src/views/_shared/sales-doc/SalesDocLineItemsTable";

const RequirementItemsPanel = ({ embedded = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const l = useSelector((s) => s.lead?.leadItem);
  const exchangeOptions = useSelector((s) => s.currency?.exchangeOptions || []);
  const lines = Array.isArray(l?.lines) ? l.lines : [];

  const sym = getCurrencySymbol(l?.currency || "INR") || "₹";
  const toDocCcy = (v) => convertFromInr(v, l?.currency, exchangeOptions);

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
        <SalesDocLineItemsTable
          lines={lines}
          sym={sym}
          toDocCcy={toDocCcy}
          totalFromQtyPrice
        />
      </Fragment>
    );

  if (embedded) return content;

  return <DetailPanel title={t("Line Items")}>{content}</DetailPanel>;
};

export default RequirementItemsPanel;
