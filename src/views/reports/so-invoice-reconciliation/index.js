// SO vs Invoice — Price Reconciliation report.
// Compares the sell rate agreed on the Sales Order against the rate actually
// invoiced, per invoice line. Money columns are shown in EACH ROW's own
// currency (an exporter invoices in USD/EUR/INR, which can't share a symbol);
// the only cross-document total that is legitimate lives in the "Totals (INR)"
// foot, where every line is normalised to ₹. Mirrors the structure of
// product-profitability (date range + search + export + pagination) and borrows
// sales-turnover's customer-dropdown filter.
import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  useLayoutEffect,
} from "react";
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
import ReactPaginate from "react-paginate";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues";

// 2-dp grouping, e.g. 1,23,456.00. Native values — the currency identity comes
// from the symbol prefix, the Indian digit grouping is just a display choice.
const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Money with its row's own currency symbol, e.g. "$ 42.00" / "₹ 2,000.00".
const money = (v, symbol) => `${symbol ? `${symbol} ` : ""}${grp(v)}`;

// DD/MM/YYYY in the viewer's local timezone. invoice_date comes back as a full
// ISO timestamp (e.g. midnight IST → "…T18:30:00Z"), so a raw slice would show
// the previous day; toLocaleDateString('en-GB') resolves it to the local date.
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  // Pin to IST so the stored business date (midnight IST) always renders as the
  // intended day, independent of the viewer's browser timezone. 27/07/2026.
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
};

// A muted em-dash for null / missing values.
const Dash = () => <span className="text-muted">—</span>;

// diff_pct with an explicit sign, e.g. "-5.00%" / "+2.50%".
const pct = (v) => {
  const n = Number(v || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};

// Colour a signed number: negative = red, positive = green, zero = neutral.
const diffClass = (v) => {
  const n = Number(v || 0);
  if (n < 0) return "text-danger fw-semibold";
  if (n > 0) return "text-success fw-semibold";
  return "";
};

const StatTile = ({ label, value, hint, valueClass = "" }) => (
  <Col md="3" sm="6" className="mb-1">
    <Card className="mb-0 border">
      <CardBody className="py-1">
        <div className="text-muted small">{label}</div>
        <div className={`fw-bolder ${valueClass}`} style={{ fontSize: "1.35rem" }}>
          {value}
        </div>
        {hint ? <div className="text-muted small">{hint}</div> : null}
      </CardBody>
    </Card>
  </Col>
);

const SoInvoiceReconciliation = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [data, setData] = useState({
    period_label: "",
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });

  // Same param shape shared by the data fetch and the export (export drops
  // page/perPage — the whole filtered set is written to the sheet).
  const baseParams = useCallback(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      customer_id: customer?.value || undefined,
      search: searchInput || undefined,
    }),
    [dateFrom, dateTo, customer, searchInput]
  );

  const load = useCallback(
    async (page = currentPage, perPage = rowsPerPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(
          API_ENDPOINTS.reports.soInvoiceReconciliation,
          { params: { ...baseParams(), page, perPage } }
        );
        const payload = resp?.data?.data || {};
        setData({
          period_label: payload.period_label || "",
          rows: payload.rows || [],
          totals: payload.totals || {},
          pagination: payload.pagination || { total: 0, perPage },
        });
      } catch (e) {
        Notification("Error", t("There are no records to display"), "warning");
        setData((d) => ({ ...d, rows: [], totals: {}, pagination: { total: 0, perPage } }));
      } finally {
        setLoading(false);
      }
    },
    [baseParams, currentPage, rowsPerPage, t]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    instance
      .get(API_ENDPOINTS.customers.dropdown)
      .then((r) =>
        setCustomerOptions(
          (r?.data?.data || []).map((c) => ({
            value: c._id || c.value,
            label: c.company_name || c.name || c.label,
          }))
        )
      )
      .catch(() => setCustomerOptions([]));
  }, []);

  // Debounced search + immediate refetch on any other filter change (mirrors
  // product-profitability's filter effect).
  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        load(1, rowsPerPage);
      }, 500);
    } else {
      setCurrentPage(1);
      load(1, rowsPerPage);
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, dateFrom, dateTo, customer]);

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const next = page + 1;
    setCurrentPage(next);
    load(next, rowsPerPage);
  };

  const handlePerPage = (value) => {
    const perPage = Number(value);
    setRowsPerPage(perPage);
    setCurrentPage(1);
    load(1, perPage);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.soInvoiceReconciliationExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "so-invoice-reconciliation.xlsx";
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

  const rows = data.rows || [];
  const totals = data.totals || {};
  const total = data.pagination?.total || 0;
  const perPage = data.pagination?.perPage || rowsPerPage;
  const pageCount = Math.ceil((total || 1) / (perPage || 1));
  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = Math.min(startIndex - 1 + perPage, total);
  const variance = Number(totals.variance_inr || 0);

  return (
    <Fragment>
      <div className="main-content reports-so-invoice-reconciliation">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("SO vs Invoice — Price Reconciliation")}</h3>
          <div className="d-flex align-items-center gap-1">
            {data.period_label ? (
              <span className="text-muted">{data.period_label}</span>
            ) : null}
            <Button
              color="success"
              outline
              size="sm"
              onClick={handleExport}
              disabled={exporting || !rows.length}
            >
              <Download size={14} className="me-50" />
              {exporting ? t("Exporting…") : t("Export")}
            </Button>
          </div>
        </div>

        {/* All three tiles are ₹-normalised (per-currency line money can never
            be summed, but the INR variance is the point of the report). */}
        <Row className="mb-1">
          <StatTile label={t("Lines")} value={totals.lines ?? 0} hint={t("invoiced lines shown")} />
          <StatTile label={t("SO Value (₹)")} value={`₹ ${grp(totals.so_value_inr)}`} />
          <StatTile label={t("Invoice Value (₹)")} value={`₹ ${grp(totals.invoice_value_inr)}`} />
          <StatTile
            label={t("Variance (₹)")}
            value={`₹ ${grp(totals.variance_inr)}`}
            valueClass={variance < 0 ? "text-danger" : ""}
            hint={t("invoice − SO")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="sir-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="sir-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="4" className="mb-1">
                <Label className="form-label">{t("Customer")}</Label>
                <Select
                  value={customer}
                  onChange={(sel) => setCustomer(sel)}
                  options={customerOptions}
                  isClearable
                  placeholder={t("All customers")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="6" md="4" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("Product name / code")}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                />
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
                {loading ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" /> {t("Loading…")}
                  </div>
                ) : !rows.length ? (
                  <div className="text-center text-muted py-3">
                    {t("No invoiced lines in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Invoice No")}</th>
                            <th className="text-nowrap">{t("Type")}</th>
                            <th className="text-nowrap">{t("Date")}</th>
                            <th className="text-nowrap">{t("Customer")}</th>
                            <th className="text-nowrap">{t("SO No")}</th>
                            <th className="text-nowrap">{t("Product")}</th>
                            <th className="text-end text-nowrap">{t("SO Qty")}</th>
                            <th className="text-end text-nowrap">{t("SO Sell Rate")}</th>
                            <th className="text-end text-nowrap">{t("Inv Qty")}</th>
                            <th className="text-end text-nowrap">{t("Inv Sell Rate")}</th>
                            <th className="text-end text-nowrap">{t("Rate Diff")}</th>
                            <th className="text-end text-nowrap">{t("Amount Diff")}</th>
                            <th className="text-end text-nowrap">{t("Diff %")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const sym = r.currency_symbol;
                            // A real, non-zero rate change is the thing this
                            // report exists to surface — give that row a subtle
                            // warning wash.
                            const changed =
                              r.rate_diff !== null &&
                              r.rate_diff !== undefined &&
                              Number(r.rate_diff) !== 0;
                            return (
                              <tr
                                key={`${r.invoice_id}-${r.product_code || ""}-${r.so_no || ""}`}
                                className={changed ? "table-warning" : ""}
                              >
                                <td className="fw-semibold text-nowrap">
                                  {r.invoice_no || <Dash />}
                                </td>
                                <td>
                                  <span
                                    className={`doc-badge ${
                                      r.invoice_type === "export"
                                        ? "doc-badge-green"
                                        : "doc-badge-gray"
                                    }`}
                                  >
                                    {r.invoice_type === "export"
                                      ? t("Export")
                                      : t("Commercial")}
                                  </span>
                                </td>
                                <td className="text-nowrap">{fmtDate(r.invoice_date) || <Dash />}</td>
                                <td style={{ minWidth: 180 }}>{r.customer_name || <Dash />}</td>
                                <td className="text-nowrap">{r.so_no || <Dash />}</td>
                                <td style={{ minWidth: 220 }}>
                                  <div className="fw-semibold text-wrap">
                                    {r.product_name || <Dash />}
                                  </div>
                                  {r.product_code || r.hsn_code ? (
                                    <div className="small text-muted">
                                      {r.product_code || ""}
                                      {r.product_code && r.hsn_code ? " · " : ""}
                                      {r.hsn_code ? `HSN ${r.hsn_code}` : ""}
                                    </div>
                                  ) : null}
                                  {r.currency_mismatch ? (
                                    <div
                                      className="small text-muted"
                                      title={t(
                                        "SO currency differed — converted at the invoice's exchange rate."
                                      )}
                                    >
                                      * {t("converted at invoice rate")}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="text-end">{grp(r.so_qty)}</td>
                                <td className="text-end text-nowrap">
                                  {r.so_rate === null || r.so_rate === undefined ? (
                                    <Dash />
                                  ) : (
                                    money(r.so_rate, sym)
                                  )}
                                </td>
                                <td className="text-end">{grp(r.inv_qty)}</td>
                                <td className="text-end text-nowrap">
                                  {money(r.inv_rate, sym)}
                                </td>
                                <td className={`text-end text-nowrap ${diffClass(r.rate_diff)}`}>
                                  {r.rate_diff === null || r.rate_diff === undefined ? (
                                    <Dash />
                                  ) : (
                                    money(r.rate_diff, sym)
                                  )}
                                </td>
                                <td className={`text-end text-nowrap ${diffClass(r.amount_diff)}`}>
                                  {r.amount_diff === null || r.amount_diff === undefined ? (
                                    <Dash />
                                  ) : (
                                    money(r.amount_diff, sym)
                                  )}
                                </td>
                                <td className={`text-end text-nowrap ${diffClass(r.diff_pct)}`}>
                                  {r.diff_pct === null || r.diff_pct === undefined ? (
                                    <Dash />
                                  ) : (
                                    pct(r.diff_pct)
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            className="fw-bolder"
                            style={{ borderTop: "2px solid #d8d6de" }}
                          >
                            <td colSpan={6}>{t("Totals (INR)")}</td>
                            {/* SO Qty / SO Rate columns */}
                            <td />
                            <td className="text-end">{`₹ ${grp(totals.so_value_inr)}`}</td>
                            {/* Inv Qty / Inv Rate columns */}
                            <td />
                            <td className="text-end">{`₹ ${grp(totals.invoice_value_inr)}`}</td>
                            {/* Rate Diff column */}
                            <td />
                            <td className={`text-end ${variance < 0 ? "text-danger" : ""}`}>
                              {`₹ ${grp(totals.variance_inr)}`}
                            </td>
                            {/* Diff % column */}
                            <td />
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    {Number(totals.unlinked_lines) > 0 ? (
                      <div className="small text-muted mt-1">
                        {totals.unlinked_lines}{" "}
                        {t(
                          "invoice line(s) had no Sales Order link and are not shown."
                        )}
                      </div>
                    ) : null}

                    {/* Server pagination — mirrors DatatablePagination's
                        Show / range / ReactPaginate layout. */}
                    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
                      <Col sm={6} xl={6}>
                        <div className="d-block d-md-flex align-items-center justify-content-start">
                          <div className="label-select">
                            <Label className="pr-2 mb-0">{t("Show")}</Label>
                            <select
                              id="sirSelectPage"
                              value={rowsPerPage}
                              className="form-select form-select-page"
                              onChange={(e) => handlePerPage(e?.target?.value)}
                            >
                              {perPageRowItems?.map((item) => (
                                <option key={item?.value} value={item?.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="text-muted text-center text-sm-start total-pagination">
                            {startIndex}-{endIndex} of {total}
                          </div>
                        </div>
                      </Col>
                      <Col sm={6} xl={6}>
                        <ReactPaginate
                          nextLabel={<i className="tim-icons icon-minimal-right" />}
                          breakLabel="..."
                          previousLabel={<i className="tim-icons icon-minimal-left" />}
                          pageCount={pageCount}
                          activeClassName="active"
                          breakClassName="page-item"
                          pageClassName={"page-item"}
                          breakLinkClassName="page-link"
                          nextLinkClassName={"page-link"}
                          pageLinkClassName={"page-link"}
                          nextClassName={"page-item next next-btn"}
                          previousLinkClassName={"page-link"}
                          previousClassName={"page-item prev prev-btn"}
                          onPageChange={(page) => handlePagination(page?.selected)}
                          forcePage={currentPage - 1}
                          containerClassName={`pagination react-paginate align-items-center justify-content-xl-end mb-0 mt-xl-0`}
                        />
                      </Col>
                    </Row>
                  </Fragment>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default SoInvoiceReconciliation;
