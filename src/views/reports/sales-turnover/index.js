// Sales Turnover — SALES_TURNOVER_REPORT_PLAN.md.
// What we sold, received and are still owed — By Month (trend) / By Customer
// (exposure). MULTI-CURRENCY: an exporter invoices in USD, EUR, INR… which can
// never be summed together, so the report is a STACK of per-currency sections,
// each with its own subtotal. KPI tiles show only counts (money can't cross
// currencies); every money total lives inside a currency section.
import { Fragment, useCallback, useEffect, useState, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Input,
  Button,
  Table,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import EntitySearchSelect from "@components/entity-select";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  usePagination,
  TablePaginationBar,
  TotalRowsHint,
} from "@src/views/_shared/table/TablePagination";
import { getSalesTurnover, cleanSalesTurnoverMessage } from "./store";

// 2-dp grouping, e.g. 1,23,456.00. Native values — Indian digit grouping is a
// harmless display choice; the currency identity comes from the symbol prefix.
const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// Money with its currency's symbol, e.g. "$ 42,000.00" / "₹ 2,00,000.00".
const money = (v, symbol) => `${symbol ? `${symbol} ` : ""}${grp(v)}`;

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overpaid", label: "Overpaid" },
];

const StatTile = ({ label, value, hint }) => (
  <Col md="3" sm="6" className="mb-1">
    <Card className="mb-0 border">
      <CardBody className="py-1">
        <div className="text-muted small">{label}</div>
        <div className="fw-bolder" style={{ fontSize: "1.35rem" }}>
          {value}
        </div>
        {hint ? <div className="text-muted small">{hint}</div> : null}
      </CardBody>
    </Card>
  </Col>
);

// One currency's table: rows + a TOTAL foot. Same markup for month/customer —
// only the first column header changes. By-Month is naturally short (~12
// rows/year) but By-Customer is one row per customer with activity —
// unbounded — so this paginates like the other line-item grids. The TOTAL
// row is a separate backend aggregate (group.totals), not derived from
// `rows`, so it reads the same on every page — the group's real total, not a
// page subtotal.
const CurrencySection = ({ group, firstColLabel, loading }) => {
  const { t } = useTranslation();
  const sym = group.currency_symbol;
  const rows = group.rows || [];
  const totals = group.totals || {};

  const pg = usePagination(rows.length);
  const totalRows = rows.length;
  const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center mb-50">
        <h5 className="mb-0 fw-bolder">
          {group.currency}
          {sym ? <span className="text-muted"> ({sym})</span> : null}
        </h5>
      </div>
      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 140 }}>{firstColLabel}</th>
              <th className="text-end">{t("Invoices")}</th>
              <th className="text-end">{t("Sales Value")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-muted py-2">
                  {t("There are no records to display")}
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.key}>
                  <td className="text-nowrap">{r.label}</td>
                  <td className="text-end">{r.invoice_count}</td>
                  <td className="text-end fw-bold">
                    {money(r.sales_value, sym)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot className="table-light">
              <tr className="fw-bolder">
                <td>
                  {t("TOTAL")}{" "}
                  <TotalRowsHint totalRows={totalRows} pageSize={pg.pageSize} />
                </td>
                <td className="text-end">{totals.invoice_count ?? 0}</td>
                <td className="text-end">{money(totals.sales_value, sym)}</td>
              </tr>
            </tfoot>
          ) : null}
        </Table>
      </div>

      <TablePaginationBar {...pg} totalRows={totalRows} />
    </div>
  );
};

const SalesTurnover = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.salesTurnover);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [byCustomer, setByCustomer] = useState(false);
  // Off = native (a section per currency, no cross-currency total).
  // On  = every invoice converted to ₹ at ITS OWN stored rate and merged into
  // one section, so the report finally has a single meaningful grand total.
  const [inInr, setInInr] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = useCallback(
    (extra = {}) => ({
      group_by: byCustomer ? "customer" : "month",
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      customer_id: customer?.value || undefined,
      currency: currency?.value || undefined,
      currency_mode: inInr ? "inr" : undefined,
      payment_status: paymentStatus?.value || undefined,
      ...extra,
    }),
    [byCustomer, dateFrom, dateTo, customer, currency, paymentStatus, inInr]
  );

  const load = useCallback(() => {
    dispatch(getSalesTurnover(params()));
  }, [params, dispatch]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Any filter change refetches.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, customer, currency, paymentStatus, byCustomer, inInr]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanSalesTurnoverMessage());
    }
  }, [store?.error, dispatch]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.salesTurnoverExport, {
        params: params(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-turnover_${byCustomer ? "customer" : "month"}${
        dateFrom ? `_${dateFrom}` : ""
      }${dateTo ? `_${dateTo}` : ""}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      Notification("Error", t("Export failed"), "warning");
    } finally {
      setExporting(false);
    }
  };

  const groups = store?.groups || [];
  const currencyOptions = (store?.available_currencies || []).map((c) => ({
    value: c,
    label: c,
  }));
  const firstColLabel = byCustomer ? t("Customer") : t("Month");
  const hasData = groups.length > 0;

  return (
    <Fragment>
      <div className="main-content reports-sales-turnover">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Sales Turnover")}</h3>
          <div className="d-flex align-items-center gap-1">
            {store?.period_label ? (
              <span className="text-muted">{store.period_label}</span>
            ) : null}
            <Button
              color="success"
              outline
              size="sm"
              onClick={handleExport}
              disabled={exporting || !hasData}
            >
              <Download size={14} className="me-50" />
              {exporting ? t("Exporting…") : t("Export")}
            </Button>
          </div>
        </div>

        {/* Native mode: money can't cross currencies, so the tiles are counts
            only. INR mode: everything is on one basis, so the turnover total
            IS meaningful and becomes the headline. */}
        <Row className="mb-1">
          <StatTile
            label={t("Invoices")}
            value={store?.overall_invoice_count ?? 0}
            hint={t("across all currencies")}
          />
          {inInr ? (
            <StatTile
              label={t("Total Sales Turnover")}
              value={money(groups[0]?.totals?.sales_value, "₹")}
              hint={t("all currencies, at each invoice's own rate")}
            />
          ) : (
            <StatTile
              label={t("Currencies")}
              value={groups.length}
              hint={t("value totals shown per currency below")}
            />
          )}
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="st-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="st-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Customer")}</Label>
                <EntitySearchSelect
                  kind="customer"
                  value={customer}
                  onChange={(sel) => setCustomer(sel)}
                  isClearable
                  placeholder={t("All customers")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Currency")}</Label>
                <Select
                  value={currency}
                  onChange={(sel) => setCurrency(sel)}
                  options={currencyOptions}
                  isClearable
                  placeholder={t("All currencies")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Payment status")}</Label>
                <Select
                  value={paymentStatus}
                  onChange={(sel) => setPaymentStatus(sel)}
                  options={PAYMENT_STATUS_OPTIONS.map((o) => ({
                    ...o,
                    label: t(o.label),
                  }))}
                  isClearable
                  placeholder={t("All")}
                  classNamePrefix="select"
                />
              </Col>
              {/* The five selects above already fill the 12-col row, so the
                  switches get their own row — side by side, not stacked, so
                  they read as one toolbar rather than a ragged column. */}
              <Col xs="12">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <div className="form-check form-switch mb-0">
                    <Input
                      type="switch"
                      id="st-group-by-customer"
                      checked={byCustomer}
                      onChange={(e) => setByCustomer(e.target.checked)}
                    />
                    <Label
                      for="st-group-by-customer"
                      className="form-check-label"
                    >
                      {t("Group by customer")}
                    </Label>
                  </div>
                  {/* Native ⇄ INR. Converting at each invoice's own stored rate
                      is what makes a single grand total legitimate. */}
                  <div className="form-check form-switch mb-0">
                    <Input
                      type="switch"
                      id="st-in-inr"
                      checked={inInr}
                      onChange={(e) => setInInr(e.target.checked)}
                    />
                    <Label for="st-in-inr" className="form-check-label">
                      {t("Show all in INR")}
                    </Label>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Never let a converted total pass as a native one. */}
            {inInr && (
              <div className="alert alert-primary py-50 px-1 mt-1 mb-0 small">
                {t(
                  "All currencies converted to INR at each invoice's own exchange rate (the rate on the invoice, not today's), so the total below is the overall sales turnover in ₹."
                )}
              </div>
            )}

            <Row className="mt-1">
              <Col md="12">
                {store?.loading ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" /> {t("Loading…")}
                  </div>
                ) : !hasData ? (
                  <div className="text-center text-muted py-3">
                    {t("There are no records to display")}
                  </div>
                ) : (
                  groups.map((g) => (
                    <CurrencySection
                      key={g.currency}
                      group={g}
                      firstColLabel={firstColLabel}
                      loading={store?.loading}
                    />
                  ))
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default SalesTurnover;
