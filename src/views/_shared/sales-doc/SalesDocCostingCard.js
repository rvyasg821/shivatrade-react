import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, num, round2 } from "./_helpers";
import { getCurrencySymbol } from "@src/utility/currency";

// All breakdown lines are in the base currency (INR by default). Render
// the ₹ prefix so a quick scan tells the user "this is rupees", with the
// foreign-currency Grand Total only at the bottom.
const inr = (v) => `₹${fmt(v)}`;

/**
 * Costing card - shared by Quotation / PFI / PO forms and detail pages.
 * Pure display: all math happens in the parent. Pass `totals` from the
 * parent's costing engine (mirrors backend recompute).
 *   - title:  heading label (default "Costing")
 *   - sticky: sticky-position the card (default true; off for detail pages
 *     where the card sits below the table, not in a side column)
 */
const SalesDocCostingCard = ({
  totals,
  currencyCode,
  title,
  sticky = true,
}) => {
  const { t } = useTranslation();
  const currencySym = getCurrencySymbol(currencyCode);

  return (
    <Card style={sticky ? { position: "sticky", top: 80 } : undefined}>
      <CardBody>
        <h5 className="mb-2 fw-bold text-uppercase text-muted">
          {title || t("Costing Breakdown")}
        </h5>
        <hr className="mt-0 mb-2" />

        {num(totals.discount_total) > 0 && (
          <>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>{t("Gross")}</span>
              <span>{inr(totals.gross_total)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>− {t("Discount")}</span>
              <span>{inr(totals.discount_total)}</span>
            </div>
          </>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>{t("Subtotal")}</span>
          <strong>{inr(totals.subtotal)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>+ {t("Expenses")}</span>
          <strong>{inr(totals.product_expenses_total)}</strong>
        </div>
        {num(totals.expenses_pct_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Rate-based")}</span>
            <span>{inr(totals.expenses_pct_total)}</span>
          </div>
        )}
        {num(totals.expenses_fixed_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Flat amount")}</span>
            <span>{inr(totals.expenses_fixed_total)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>− {t("Rebates")}</span>
          <strong>{inr(totals.product_rebates_total)}</strong>
        </div>
        {num(totals.rebates_pct_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Rate-based")}</span>
            <span>{inr(totals.rebates_pct_total)}</span>
          </div>
        )}
        {num(totals.rebates_fixed_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Flat amount")}</span>
            <span>{inr(totals.rebates_fixed_total)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1 text-muted">
          <span>= {t("Net")}</span>
          <span>{inr(totals.net)}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>
            + {t("Margin")}
            {totals.margin_uniform
              ? ` (${round2(num(totals.margin_pct))}%)`
              : ""}
          </span>
          <strong>{inr(totals.margin_amount)}</strong>
        </div>
        {totals.margin_uniform ? (
          <div className="d-flex justify-content-between mb-1 text-muted small">
            <em>{t("sum of per-line margins")}</em>
          </div>
        ) : (
          Object.entries(totals.margin_by_rate || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([rate, amt]) => (
              <div
                key={`margin-${rate}`}
                className="d-flex justify-content-between mb-1 ps-2 small text-muted"
              >
                <span>· {round2(num(rate))}%</span>
                <span>{inr(amt)}</span>
              </div>
            ))
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>
            + {t("GST")}
            {totals.gst_uniform
              ? ` (${round2(num(totals.gst_pct))}%)`
              : ""}
          </span>
          <strong>{inr(totals.tax_total)}</strong>
        </div>
        {!totals.gst_uniform &&
          Object.entries(totals.gst_by_rate || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([rate, amt]) => (
              <div
                key={`gst-${rate}`}
                className="d-flex justify-content-between mb-1 ps-2 small text-muted"
              >
                <span>· {round2(num(rate))}%</span>
                <span>{inr(amt)}</span>
              </div>
            ))}
        <hr className="my-2" />
        <div className="d-flex justify-content-between mb-1 text-muted">
          <span>{t("Grand Total")}</span>
          <span>₹ {fmt(totals.grand_inr_raw)}</span>
        </div>
        {num(totals.round_off) !== 0 && (
          <div className="d-flex justify-content-between mb-1 text-muted">
            <span>{t("Round Off")}</span>
            <span>
              {num(totals.round_off) >= 0 ? "+ " : "− "}₹{" "}
              {fmt(Math.abs(num(totals.round_off)))}
            </span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span className="fw-bold">{t("Grand Total (INR)")}</span>
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
          <span className="fw-bold">
            {t("Grand Total")}
            {currencySym ? ` (${currencySym})` : currencyCode ? ` (${currencyCode})` : ""}
          </span>
          <span className="fw-bold">
            {currencySym || (currencyCode ? `${currencyCode} ` : "")}
            {fmt(totals.grand_currency)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default SalesDocCostingCard;
