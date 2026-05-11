import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, num } from "./_helpers";

/**
 * Sticky right-column costing card — shared by Quotation / PFI / PO forms.
 * Pure display: all math happens in the parent. Pass `totals` from the
 * parent's costing engine (mirrors backend recompute).
 */
const SalesDocCostingCard = ({ totals, currencyCode }) => {
  const { t } = useTranslation();

  return (
    <Card style={{ position: "sticky", top: 80 }}>
      <CardBody>
        <h5 className="mb-2 fw-bold text-uppercase text-muted">
          {t("Costing")}
        </h5>
        <hr className="mt-0 mb-2" />

        <div className="d-flex justify-content-between mb-1">
          <span>{t("Subtotal")}</span>
          <strong>{fmt(totals.subtotal)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>+ {t("Expenses")}</span>
          <strong>{fmt(totals.product_expenses_total)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>− {t("Rebates")}</span>
          <strong>{fmt(totals.product_rebates_total)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1 text-muted">
          <span>= {t("Net")}</span>
          <span>{fmt(totals.net)}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>+ {t("Margin")}</span>
          <strong>{fmt(totals.margin_amount)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1 text-muted small">
          <em>({t("sum of per-line margins")})</em>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>+ {t("Tax")}</span>
          <strong>{fmt(totals.tax_total)}</strong>
        </div>
        <hr className="my-2" />
        <div className="d-flex justify-content-between mb-1">
          <span>{t("Grand Total (INR)")}</span>
          <strong>₹ {fmt(totals.grand_inr)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1 text-muted">
          <small>
            × {t("Rate")} {num(totals.rate)}
          </small>
        </div>
        <div
          className="d-flex justify-content-between p-2 mt-1 rounded"
          style={{ background: "#f6f6f9" }}
        >
          <span className="fw-bold">{t("Customer Total")}</span>
          <span className="fw-bold">
            {currencyCode ? `${currencyCode} ` : ""}
            {fmt(totals.grand_currency)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default SalesDocCostingCard;
