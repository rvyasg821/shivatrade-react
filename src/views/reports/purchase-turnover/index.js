// Purchase Turnover (VPO) — PURCHASE_TURNOVER_VPO_REPORT_PLAN.md.
// What we purchased, paid and still owe. Sourced from CONFIRMED GRNs — goods
// actually received (client change-request #8, 2026-08-19) — not the PO/POV
// itself, which may not have been fulfilled yet. One row per GRN.
// MULTI-CURRENCY (D-6): a Vendor PO is native to the vendor's own currency and
// currencies can never be summed, so the report is a STACK of per-currency
// sections, each with its own subtotal. KPI tiles show only counts.
// Two lenses: By Month (trend) / By Vendor (exposure).
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
import {
  getPurchaseTurnover,
  cleanPurchaseTurnoverMessage,
} from "./store";

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

// Negative Outstanding = the vendor was overpaid — legitimate, not a bug.
const Outstanding = ({ value, symbol }) => {
  const nsign = Number(value || 0) < 0;
  return (
    <span className={nsign ? "text-danger fw-semibold" : "fw-semibold"}>
      {money(value, symbol)}
    </span>
  );
};

// One currency's table: rows + a TOTAL foot. Same markup for month/vendor —
// only the first column header changes. By-Month is naturally short (~12
// rows/year) but By-Vendor is one row per vendor with activity — unbounded —
// so this paginates like the other line-item grids. The TOTAL row is a
// separate backend aggregate (group.totals), not derived from `rows`, so it
// reads the same on every page — the group's real total, not a page subtotal.
const CurrencySection = ({ group, firstColLabel }) => {
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
              <th className="text-end">{t("GRNs")}</th>
              <th className="text-end">{t("Taxable")}</th>
              <th className="text-end">{t("GST")}</th>
              <th className="text-end">{t("Received Value")}</th>
              <th className="text-end">{t("Paid")}</th>
              <th className="text-end">{t("Outstanding")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-2">
                  {t("There are no records to display")}
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.key}>
                  <td className="text-nowrap">{r.label}</td>
                  <td className="text-end">{r.pov_count}</td>
                  <td className="text-end">{money(r.taxable, sym)}</td>
                  <td className="text-end">{money(r.gst, sym)}</td>
                  <td className="text-end fw-bold">
                    {money(r.order_value, sym)}
                  </td>
                  <td className="text-end">{money(r.paid, sym)}</td>
                  <td className="text-end">
                    <Outstanding value={r.outstanding} symbol={sym} />
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
                <td className="text-end">{totals.pov_count ?? 0}</td>
                <td className="text-end">{money(totals.taxable, sym)}</td>
                <td className="text-end">{money(totals.gst, sym)}</td>
                <td className="text-end">{money(totals.order_value, sym)}</td>
                <td className="text-end">{money(totals.paid, sym)}</td>
                <td className="text-end">
                  <Outstanding value={totals.outstanding} symbol={sym} />
                </td>
              </tr>
            </tfoot>
          ) : null}
        </Table>
      </div>

      <TablePaginationBar {...pg} totalRows={totalRows} />
    </div>
  );
};

const PurchaseTurnover = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.purchaseTurnover);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendor, setVendor] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [byVendor, setByVendor] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = useCallback(
    (extra = {}) => ({
      group_by: byVendor ? "vendor" : "month",
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      vendor_id: vendor?.value || undefined,
      currency: currency?.value || undefined,
      payment_status: paymentStatus?.value || undefined,
      ...extra,
    }),
    [byVendor, dateFrom, dateTo, vendor, currency, paymentStatus]
  );

  const load = useCallback(() => {
    dispatch(getPurchaseTurnover(params()));
  }, [params, dispatch]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Any filter change refetches.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, vendor, currency, paymentStatus, byVendor]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanPurchaseTurnoverMessage());
    }
  }, [store?.error, dispatch]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.purchaseTurnoverExport,
        {
          params: params(),
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-turnover_${byVendor ? "vendor" : "month"}${
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
  const firstColLabel = byVendor ? t("Vendor") : t("Month");
  const hasData = groups.length > 0;

  return (
    <Fragment>
      <div className="main-content reports-purchase-turnover">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Purchase Turnover (VPO)")}</h3>
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

        {/* Money can't cross currencies, so the tiles are counts only; every
            money total lives inside a currency section below. */}
        <Row className="mb-1">
          <StatTile
            label={t("GRNs")}
            value={store?.overall_pov_count ?? 0}
            hint={t("confirmed goods receipts, across all currencies")}
          />
          <StatTile
            label={t("Currencies")}
            value={groups.length}
            hint={t("value totals shown per currency below")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="pt-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="pt-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Vendor")}</Label>
                <EntitySearchSelect
                  kind="vendor"
                  value={vendor}
                  onChange={(sel) => setVendor(sel)}
                  isClearable
                  placeholder={t("All vendors")}
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
              <Col xs="12">
                <div className="form-check form-switch mb-0">
                  <Input
                    type="switch"
                    id="pt-group-by-vendor"
                    checked={byVendor}
                    onChange={(e) => setByVendor(e.target.checked)}
                  />
                  <Label for="pt-group-by-vendor" className="form-check-label">
                    {t("Group by vendor")}
                  </Label>
                </div>
              </Col>
            </Row>

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

export default PurchaseTurnover;
