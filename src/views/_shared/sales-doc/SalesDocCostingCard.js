import { Fragment } from "react";
import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, num, round2 } from "./_helpers";
import { getCurrencySymbol } from "@src/utility/currency";

// All breakdown lines are in the base currency (INR by default) — the local
// `money` helper renders the ₹ prefix so a quick scan reads "this is rupees",
// with the foreign-currency Grand Total only at the bottom. When a doc-mode
// `currencyView` is supplied the whole breakdown is converted instead.

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
  /** Quotation: capture per-line GST for reference but don't display
   *  the GST row or roll it into the grand total. */
  hideGst = false,
  /**
   * Optional currency-view descriptor `{ mode, rate, sym, code }`.
   * When omitted (or mode === 'base') the card renders exactly as before:
   * the full breakdown in INR with a single foreign Grand Total box.
   * When mode === 'doc' the whole breakdown is converted to the doc
   * currency (× rate) and shown with that symbol, with INR demoted to a
   * reference line. Used by the Quotation detail-page currency toggle.
   */
  currencyView,
  /** Render without the outer Card chrome + inner title/divider — for when
   *  the caller already wraps it in a titled panel (detail pages). */
  bare = false,
}) => {
  const { t } = useTranslation();
  const currencySym = getCurrencySymbol(currencyCode);
  // Foreign (non-INR) quote? Drives the currency round-off display.
  const isForeign =
    !!currencyCode && currencyCode.toUpperCase() !== "INR";
  const curLabel = currencySym || (currencyCode ? `${currencyCode} ` : "");

  // `view.mode === 'doc'` flips every breakdown line into the doc currency.
  const docView = currencyView && currencyView.mode === "doc";
  const viewRate = docView ? num(currencyView.rate) || 1 : 1;
  const viewSym = docView ? currencyView.sym || currencySym || "" : "₹";
  // `money` replaces the old `inr` for breakdown rows: identity in base
  // mode (so output is byte-for-byte the same), × rate in doc mode.
  const money = (v) => `${viewSym}${fmt(num(v) * viewRate)}`;

  const Wrapper = bare ? Fragment : Card;
  const Inner = bare ? Fragment : CardBody;
  const wrapperProps = bare
    ? {}
    : { style: sticky ? { position: "sticky", top: 80 } : undefined };

  return (
    <Wrapper {...wrapperProps}>
      <Inner>
        {!bare && (
          <>
            <h5 className="mb-2 fw-bold text-uppercase text-muted">
              {title || t("Costing Breakdown")}
            </h5>
            <hr className="mt-0 mb-2" />
          </>
        )}

        {num(totals.discount_total) > 0 && (
          <>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>{t("Gross")}</span>
              <span>{money(totals.gross_total)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>− {t("Discount")}</span>
              <span>{money(totals.discount_total)}</span>
            </div>
          </>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>{t("Subtotal")}</span>
          <strong>{money(totals.subtotal)}</strong>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>+ {t("Expenses")}</span>
          <strong>{money(totals.product_expenses_total)}</strong>
        </div>
        {num(totals.expenses_pct_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Rate-based")}</span>
            <span>{money(totals.expenses_pct_total)}</span>
          </div>
        )}
        {num(totals.expenses_fixed_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Flat amount")}</span>
            <span>{money(totals.expenses_fixed_total)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1">
          <span>− {t("Rebates")}</span>
          <strong>{money(totals.product_rebates_total)}</strong>
        </div>
        {num(totals.rebates_pct_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Rate-based")}</span>
            <span>{money(totals.rebates_pct_total)}</span>
          </div>
        )}
        {num(totals.rebates_fixed_total) > 0 && (
          <div className="d-flex justify-content-between mb-1 ps-2 small text-muted">
            <span>· {t("Flat amount")}</span>
            <span>{money(totals.rebates_fixed_total)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-1 text-muted">
          <span>= {t("Net")}</span>
          <span>{money(totals.net)}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span>
            + {t("Margin")}
            {totals.margin_uniform
              ? ` (${round2(num(totals.margin_pct))}%)`
              : ""}
          </span>
          <strong>{money(totals.margin_amount)}</strong>
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
                <span>{money(amt)}</span>
              </div>
            ))
        )}
        {!hideGst && (
          <>
            <div className="d-flex justify-content-between mb-1">
              <span>
                + {t("GST")}
                {totals.gst_uniform
                  ? ` (${round2(num(totals.gst_pct))}%)`
                  : ""}
              </span>
              <strong>{money(totals.tax_total)}</strong>
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
                    <span>{money(amt)}</span>
                  </div>
                ))}
          </>
        )}
        <hr className="my-2" />
        {docView ? (
          <>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>{t("Grand Total")}</span>
              <span>{money(totals.grand_inr_raw)}</span>
            </div>
            {num(totals.round_off) !== 0 && (
              <div className="d-flex justify-content-between mb-1 text-muted">
                <span>{t("Round Off")}</span>
                <span>
                  {num(totals.round_off) >= 0 ? "+ " : "− "}
                  {viewSym}
                  {fmt(Math.abs(num(totals.round_off)))}
                </span>
              </div>
            )}
            <div
              className="d-flex justify-content-between p-2 mt-1 rounded"
              style={{ background: "#f6f6f9" }}
            >
              <span className="fw-bold">
                {t("Grand Total")}
                {viewSym ? ` (${viewSym})` : ""}
              </span>
              <span className="fw-bold">
                {viewSym}
                {fmt(totals.grand_currency)}
              </span>
            </div>
            <div className="d-flex justify-content-between mt-1 text-muted">
              <small>
                {t("In INR")}
                {num(totals.rate) > 0 && viewSym !== "₹"
                  ? ` (1 ${currencyCode} = ${fmt(1 / num(totals.rate))} INR)`
                  : ""}
              </small>
              <small>₹ {fmt(totals.grand_inr)}</small>
            </div>
          </>
        ) : (
          <>
            {/* INR is the internal base (un-rounded); round-off is applied to
                the customer-currency total below. */}
            <div className="d-flex justify-content-between align-items-baseline mb-1 gap-2">
              <span className="fw-bold">{t("Grand Total (INR)")}</span>
              <strong className="text-nowrap text-end">
                ₹ {fmt(totals.grand_inr)}
              </strong>
            </div>
            {isForeign && (
              <>
                <div className="d-flex justify-content-between mb-1 text-muted">
                  <span>
                    {num(totals.rate) > 0
                      ? `1 ${currencyCode} = ${fmt(1 / num(totals.rate))} INR`
                      : t("Rate")}
                  </span>
                  <span>
                    {curLabel} {fmt(totals.grand_currency_raw)}
                  </span>
                </div>
                {num(totals.round_off) !== 0 && (
                  <div className="d-flex justify-content-between mb-1 text-muted">
                    <span>{t("Round Off")}</span>
                    <span>
                      {num(totals.round_off) >= 0 ? "+ " : "− "}
                      {curLabel} {fmt(Math.abs(num(totals.round_off)))}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top fw-bold">
              <span>
                {t("Grand Total")}
                {isForeign && curLabel ? ` (${curLabel.trim()})` : ""}
              </span>
              <span>
                {isForeign
                  ? `${curLabel}${fmt(totals.grand_currency)}`
                  : `₹ ${fmt(totals.grand_currency)}`}
              </span>
            </div>
          </>
        )}
      </Inner>
    </Wrapper>
  );
};

export default SalesDocCostingCard;
