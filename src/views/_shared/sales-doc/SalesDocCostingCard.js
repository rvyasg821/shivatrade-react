import { Fragment } from "react";
import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { fmt, fmtRate, num, round2 } from "./_helpers";
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
  /** Vendor (source) currency code, e.g. "USD" — the doc-level "Vendor
   *  Currency" picked in the Costing Worksheet (one per document). Paired
   *  with `vendorRate` to print a second "Vendor Rate" line under the
   *  Exchange Rate line. Omit (or pass a currency equal to `currencyCode`)
   *  to hide the row — nothing to convert. */
  vendorCurrencyCode,
  /** cost_exchange_rate — DOC units per 1 vendor unit (frozen per line,
   *  same value across all lines under the one-vendor-currency-per-doc
   *  rule). Displayed as its reciprocal to match the Costing Worksheet's
   *  own "1 {doc} = X {vendor}" convention. */
  vendorRate,
}) => {
  const { t } = useTranslation();
  const currencySym = getCurrencySymbol(currencyCode);
  // Foreign (non-INR) quote? Drives the currency round-off display.
  const isForeign =
    !!currencyCode && currencyCode.toUpperCase() !== "INR";
  const curLabel = currencySym || (currencyCode ? `${currencyCode} ` : "");

  // Multi-currency: `totals` are already in the DOCUMENT currency (each line's
  // cost was converted source→doc before summing). So breakdown rows render in
  // the doc symbol with NO extra conversion — base mode uses the doc currency
  // symbol (was a hard-coded ₹). The detail-page `docView` toggle keeps its own.
  const docView = currencyView && currencyView.mode === "doc";
  const viewRate = docView ? num(currencyView.rate) || 1 : 1;
  const viewSym = docView
    ? currencyView.sym || currencySym || ""
    : currencySym || "₹";
  const money = (v) => `${viewSym}${fmt(num(v) * viewRate)}`;

  // "1 {sym} = X ₹" line — currency SIGNS ($/€/₹), not the 3-letter code, to
  // match how every amount on this card is already displayed. Precise (up to
  // 5dp) so a manual hand-check (doc value × this rate) reproduces the PDF's
  // ₹ figure exactly. Same-currency docs (already INR) show "1 ₹ = 1 ₹"
  // instead of hiding the line or a misleading "1 = 0".
  const rateLabel = !isForeign
    ? `₹1 = ₹1`
    : num(totals.rate) > 0
    ? `${currencySym}1 = ₹${fmtRate(1 / num(totals.rate))}`
    : null;

  // "1 {doc} = X {vendor}" — vendor→customer rate, currency SIGNS to match
  // every other rate/amount on this card. Hidden when there's nothing to
  // convert (no vendor currency, or it matches the document currency).
  const showVendorRate =
    !!vendorCurrencyCode &&
    !!currencyCode &&
    vendorCurrencyCode.toUpperCase() !== currencyCode.toUpperCase() &&
    num(vendorRate) > 0;
  const vendorRateLabel = showVendorRate
    ? `${currencySym}1 = ${getCurrencySymbol(vendorCurrencyCode) || vendorCurrencyCode}${fmtRate(1 / num(vendorRate))}`
    : null;

  // Neither side ever touches INR (e.g. a EUR customer billed against a USD
  // vendor) — the INR conversion is meaningless to the operator here, so hide
  // the doc→INR Exchange Rate / ≈₹ / "In INR" rows entirely. Still shown
  // whenever either the document or the vendor currency IS INR.
  const vendorIsForeign =
    !!vendorCurrencyCode && vendorCurrencyCode.toUpperCase() !== "INR";
  const showInr = !(isForeign && vendorIsForeign);

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
        {num(totals.freight_total) > 0 && (
          <div className="d-flex justify-content-between mb-1">
            <span>+ {t("Freight")}</span>
            <strong>{money(totals.freight_total)}</strong>
          </div>
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
            {showInr && (
              <div className="d-flex justify-content-between mt-1 text-muted">
                <small>
                  {t("In INR")}
                  {rateLabel && viewSym !== "₹" ? ` (${rateLabel})` : ""}
                </small>
                <small>₹ {fmt(totals.grand_inr)}</small>
              </div>
            )}
            {vendorRateLabel && (
              <div className="d-flex justify-content-between mt-1 text-muted">
                <small>{t("Vendor Rate")}</small>
                <small>{vendorRateLabel}</small>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Values above are already in the document currency; the grand
                total is their sum (NO header × rate). Round-off is applied to
                the doc-currency total. The <hr> above is the only divider. */}
            {num(totals.round_off) !== 0 && (
              <div className="d-flex justify-content-between align-items-baseline mb-1 text-muted gap-2">
                <span>{t("Round Off")}</span>
                <span>
                  {num(totals.round_off) >= 0 ? "+ " : "− "}
                  {viewSym}
                  {fmt(Math.abs(num(totals.round_off)))}
                </span>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center fw-bold">
              <span>
                {t("Grand Total")}
                {curLabel ? ` (${curLabel.trim()})` : ""}
              </span>
              <span className="text-nowrap text-end">
                {viewSym}
                {fmt(totals.grand_currency)}
              </span>
            </div>
            {rateLabel && showInr && (
              <div className="d-flex justify-content-between mt-1 text-muted">
                <small>{t("Exchange Rate")}</small>
                {isForeign && <small>≈ ₹ {fmt(totals.grand_inr)}</small>}
              </div>
            )}
            {vendorRateLabel && (
              <div className="d-flex justify-content-between mt-1 text-muted">
                <small>{t("Vendor Rate")}</small>
                <small>{vendorRateLabel}</small>
              </div>
            )}
          </>
        )}
      </Inner>
    </Wrapper>
  );
};

export default SalesDocCostingCard;
