// POV totals breakdown — Subtotal / CGST / SGST / Round Off / Grand Total.
// Lives in the right column of the POV detail page (sits under the Share
// panel) and mirrors the math used by the PDF: GST pulled live from
// product master, then split 50/50 into CGST + SGST; grand total rounded
// to whole units with the ± delta shown as Round Off.

import { Fragment, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";

import { getProductDropdown } from "@src/views/products/store";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const fmt = (n) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PoVendorTotalsPanel = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const productStore = useSelector((s) => s.product);

  const p = poVendorItem || {};
  const lines = p?.lines || [];
  const sym = p?.currency_symbol || "₹";
  // NATIVE model (plan §6.3): POV money is stored in the POV's own currency, so
  // totals display AS-IS — no conversion (exchange_rate is INR-per-unit, used
  // only for INR stock/books valuation).
  const fmtCcy = (v) => fmt(num(v));
  // GST is an Indian (INR) tax — never applies to a foreign-currency POV.
  const gstApplies = (p?.currency_code || "INR") === "INR";

  // Live tax_pct from product master.
  useEffect(() => {
    if (!productStore?.productDropdown?.length) {
      dispatch(getProductDropdown());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productTaxById = useMemo(() => {
    const m = {};
    (productStore?.productDropdown || []).forEach((pr) => {
      m[pr._id] = pr.tax_pct;
    });
    return m;
  }, [productStore?.productDropdown]);

  const expensesSnapshot = Array.isArray(p?.expenses_snapshot)
    ? p.expenses_snapshot
    : [];

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + num(l?.line_total), 0);
    const chargesTotal = expensesSnapshot.reduce(
      (s, e) => s + num(e?.amount),
      0,
    );
    const taxable = subtotal + chargesTotal;
    // GST applies on Taxable (subtotal + charges), pro-rated to
    // per-line by the same chargesPct factor used on the server.
    const chargesPct = subtotal > 0 ? chargesTotal / subtotal : 0;
    const gstTotal = gstApplies
      ? lines.reduce(
          (s, l) =>
            s +
            (num(l?.line_total) *
              (1 + chargesPct) *
              num(productTaxById[l?.product_id])) /
              100,
          0,
        )
      : 0;
    const cgst = gstTotal / 2;
    const sgst = gstTotal - cgst;
    const rawGrand = taxable + gstTotal;
    const grandRounded = Math.round(rawGrand);
    const roundOff = grandRounded - rawGrand;
    return {
      subtotal,
      chargesTotal,
      taxable,
      gstTotal,
      rawGrand,
      cgst,
      sgst,
      roundOff,
      grandRounded,
    };
  }, [lines, productTaxById, expensesSnapshot, gstApplies]);

  if (!lines.length && !expensesSnapshot.length) return null;

  return (
    <Card>
      <CardBody>
        <h5 className="mb-2 fw-bold text-uppercase text-muted">
          {t("Costing Breakdown")}
        </h5>
        <hr className="mt-0 mb-2" />

        <div className="d-flex justify-content-between mb-1">
          <span>{t("Subtotal")}</span>
          <strong>
            {sym} {fmtCcy(totals.subtotal)}
          </strong>
        </div>

        {expensesSnapshot.map((e, i) => (
          <div
            key={e._id || e.expense_id || i}
            className="d-flex justify-content-between mb-1 text-muted"
          >
            <span>
              + {e.name}
              {e.type === "percent" ? ` (${num(e.value)}%)` : ""}
            </span>
            <span>
              {sym} {fmtCcy(num(e.amount))}
            </span>
          </div>
        ))}

        {totals.chargesTotal > 0 && (
          <div className="d-flex justify-content-between mb-1 text-muted">
            <span>= {t("Taxable")}</span>
            <span>
              {sym} {fmtCcy(totals.taxable)}
            </span>
          </div>
        )}

        {totals.gstTotal > 0 && (
          <Fragment>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>+ {t("CGST")}</span>
              <span>
                {sym} {fmtCcy(totals.cgst)}
              </span>
            </div>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>+ {t("SGST")}</span>
              <span>
                {sym} {fmtCcy(totals.sgst)}
              </span>
            </div>
          </Fragment>
        )}

        {Math.abs(totals.roundOff) > 0.005 && (
          <div className="d-flex justify-content-between mb-1 text-muted">
            <span>{t("Round Off")}</span>
            <span>
              {totals.roundOff >= 0 ? "+ " : "− "}
              {sym} {fmtCcy(Math.abs(totals.roundOff))}
            </span>
          </div>
        )}

        <hr className="my-2" />

        <div
          className="d-flex justify-content-between p-2 rounded"
          style={{ background: "#f6f6f9" }}
        >
          <span className="fw-bold">{t("Grand Total")}</span>
          <span className="fw-bold">
            {sym} {fmtCcy(totals.grandRounded)}
          </span>
        </div>

        {/* POV convention: exchange_rate is INR per 1 unit of the POV
            currency (multiply) — the opposite direction of sales docs. Uses
            the UNROUNDED rawGrand, not the whole-unit-rounded grandRounded —
            multiplying an already-rounded total by ~90-95 amplifies up to
            ₹45+ of rounding drift that isn't really there. */}
        {!gstApplies && (
          <div className="d-flex justify-content-between px-2 pt-1 small text-muted">
            <span>{t("INR equivalent")}</span>
            <span>
              ≈ ₹{fmt(totals.rawGrand * (num(p?.exchange_rate) || 1))}
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default PoVendorTotalsPanel;
