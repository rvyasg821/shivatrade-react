// Compact line-items + costing panel for the quotation detail page.
// Reuses fmt/num/computeDocTotals + SalesDocCostingCard from the shared kit.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

import {
  fmt,
  num,
  computeDocTotals,
} from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import { DetailPanel } from "@src/views/_shared/detail-page";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const LineItemsPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const lines = q?.lines || [];

  const totals = useMemo(
    () => computeDocTotals(lines, q?.exchange_rate),
    [lines, q?.exchange_rate]
  );

  // Taxable base for percent rebates/expenses = qty * price - discount.
  const taxableOf = (l) => {
    const gross = num(l.qty) * num(l.unit_price);
    const disc = (gross * num(l.discount_pct)) / 100;
    return round2(gross - disc);
  };

  // Match the edit page exactly: `bg-success text-white` for rebates,
  // `bg-warning text-dark` for expenses, with a touch of extra padding so
  // the chip is comfortable to read.
  const Rebate = ({ label, pct, amount, isFixed }) => (
    <span
      className="badge bg-success text-white me-1 mt-50"
      style={{ padding: "6px 10px", fontSize: "0.78rem" }}
    >
      {label}{" "}
      {isFixed ? fmt(amount) : `${pct}% = ${fmt(amount)}`}
    </span>
  );

  const Expense = ({ label, pct, amount, isPct }) => (
    <span
      className="badge bg-warning text-dark me-1 mt-50"
      style={{ padding: "6px 10px", fontSize: "0.78rem" }}
    >
      {label} {isPct ? `${pct}% ` : ""}= {fmt(amount)}
    </span>
  );

  const body = (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>{t("Product")}</th>
            <th className="text-end">{t("Qty")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Disc%")}</th>
            <th className="text-end">{t("Margin%")}</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted py-3">
                {t("No line items.")}
              </td>
            </tr>
          ) : (
            lines.map((l, i) => {
              const taxable = taxableOf(l);
              const rebates = l.product_rebates_snapshot || [];
              const expenses = l.product_expenses_snapshot || [];
              return (
                <tr key={l._id || i}>
                  <td>{i + 1}</td>
                  <td className="text-wrap" style={{ minWidth: 220 }}>
                    <div>{l.product_name || l.product_code || "-"}</div>
                    {(rebates.length > 0 || expenses.length > 0) && (
                      <div className="mt-25 d-flex flex-wrap">
                        {rebates.map((r, idx) => {
                          const isFixed = r.type === "fixed";
                          const pct = num(r.pct);
                          const amount = isFixed
                            ? pct
                            : round2((taxable * pct) / 100);
                          return (
                            <Rebate
                              key={`r-${idx}`}
                              label={r.code || r.name || t("Rebate")}
                              pct={pct}
                              amount={amount}
                              isFixed={isFixed}
                            />
                          );
                        })}
                        {expenses.map((e, idx) => {
                          const isPct = e.type === "percent";
                          const val = num(e.value);
                          const amount = isPct
                            ? round2((taxable * val) / 100)
                            : val;
                          return (
                            <Expense
                              key={`e-${idx}`}
                              label={e.code || e.name || t("Expense")}
                              pct={val}
                              amount={amount}
                              isPct={isPct}
                            />
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="text-end">
                    {l.qty
                      ? `${l.qty}${l.unit ? ` ${l.unit}` : ""}`
                      : "-"}
                  </td>
                  <td className="text-end">{fmt(l.unit_price)}</td>
                  <td className="text-end">{num(l.discount_pct)}</td>
                  <td className="text-end">{num(l.margin_pct)}</td>
                  <td className="text-end fw-bold">{fmt(l.line_total)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <Row className="mt-3 justify-content-end">
        <Col md="10" lg="8" xl="7">
          <SalesDocCostingCard
            totals={totals}
            currencyCode={q?.currency_code}
            sticky={false}
          />
        </Col>
      </Row>
    </Fragment>
  );

  if (bare) return body;
  return <DetailPanel title={t("Line Items")}>{body}</DetailPanel>;
};

export default LineItemsPanel;
