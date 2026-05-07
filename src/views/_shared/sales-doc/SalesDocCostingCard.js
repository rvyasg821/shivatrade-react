import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, num } from "./_helpers";

/**
 * Sticky right-column costing card — shared by Quotation / PFI / PO forms.
 * Pure display: all math happens in the parent. Pass `totals` from the
 * parent's costing engine (mirrors backend recompute).
 */
const SalesDocCostingCard = ({ totals, marginPct, currencyCode }) => {
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
          <strong>{fmt(totals.expenses_total)}</strong>
        </div>
        {num(totals.product_expenses_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 text-muted small">
            <span>
              <em>+ {t("Product Expenses")}</em>
            </span>
            <span>{fmt(totals.product_expenses_total)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>− {t("Rebates")}</span>
          <strong>{fmt(totals.rebates_total)}</strong>
        </div>
        {num(totals.product_rebates_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 text-muted small">
            <span>
              <em>− {t("Product Rebates")}</em>
            </span>
            <span>{fmt(totals.product_rebates_total)}</span>
          </div>
        )}
        {totals.skipped &&
          (num(totals.product_rebates_total_raw) > 0 ||
            num(totals.product_expenses_total_raw) > 0) && (
            <div className="text-warning small mb-1">
              <em>
                {t("Skipping")}{" "}
                {fmt(
                  num(totals.product_rebates_total_raw) +
                    num(totals.product_expenses_total_raw)
                )}{" "}
                {t("of product-level costing (opted out).")}
              </em>
            </div>
          )}
        <div className="d-flex justify-content-between mb-1 text-muted">
          <span>= {t("Net")}</span>
          <span>{fmt(totals.net)}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>
            + {t("Margin")} ({num(marginPct)}%)
          </span>
          <strong>{fmt(totals.margin_amount)}</strong>
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
