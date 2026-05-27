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
    const gstTotal = lines.reduce(
      (s, l) =>
        s +
        (num(l?.line_total) *
          (1 + chargesPct) *
          num(productTaxById[l?.product_id])) /
          100,
      0,
    );
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
      cgst,
      sgst,
      roundOff,
      grandRounded,
    };
  }, [lines, productTaxById, expensesSnapshot]);

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
            {sym} {fmt(totals.subtotal)}
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
              {sym} {fmt(num(e.amount))}
            </span>
          </div>
        ))}

        {totals.chargesTotal > 0 && (
          <div className="d-flex justify-content-between mb-1 text-muted">
            <span>= {t("Taxable")}</span>
            <span>
              {sym} {fmt(totals.taxable)}
            </span>
          </div>
        )}

        {totals.gstTotal > 0 && (
          <Fragment>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>+ {t("CGST")}</span>
              <span>
                {sym} {fmt(totals.cgst)}
              </span>
            </div>
            <div className="d-flex justify-content-between mb-1 text-muted">
              <span>+ {t("SGST")}</span>
              <span>
                {sym} {fmt(totals.sgst)}
              </span>
            </div>
          </Fragment>
        )}

        {Math.abs(totals.roundOff) > 0.005 && (
          <div className="d-flex justify-content-between mb-1 text-muted">
            <span>{t("Round Off")}</span>
            <span>
              {totals.roundOff >= 0 ? "+ " : "− "}
              {sym} {fmt(Math.abs(totals.roundOff))}
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
            {sym} {fmt(totals.grandRounded)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default PoVendorTotalsPanel;
