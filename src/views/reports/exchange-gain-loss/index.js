// Exchange Gain/Loss report.
// Realized forex impact per customer receipt: a foreign (export) invoice is
// booked at its invoice-date rate; the customer pays later at the receipt rate,
// so ₹ received ≠ ₹ booked. One row per non-voided receipt on a non-INR
// invoice; the "Amount" is in the invoice currency, every INR figure is
// summable. Mirrors the advance-vs-invoice page (date + customer + result +
// search + export + server pagination), and the receipt-modal rate display
// "1 CUR = ₹x".
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
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import EntitySearchSelect from "@components/entity-select";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";
import {
  useServerPagination,
  ServerPaginationBar,
} from "@src/views/_shared/table/ServerPagination";

const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const money = (v, symbol) => `${symbol ? `${symbol} ` : ""}${grp(v)}`;

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
};

const Dash = () => <span className="text-muted">—</span>;

// Signed ₹ gain (green) / loss (red).
const glClass = (v) => {
  const n = Number(v || 0);
  if (n < 0) return "text-danger fw-semibold";
  if (n > 0) return "text-success fw-semibold";
  return "";
};
const glText = (v) => {
  const n = Number(v || 0);
  return `${n < 0 ? "− " : ""}₹ ${grp(Math.abs(n))}`;
};

const RESULT_OPTIONS = [
  { value: "all", label: "All receipts" },
  { value: "gain", label: "Gains only" },
  { value: "loss", label: "Losses only" },
];

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

const ExchangeGainLoss = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState(null);
  const [result, setResult] = useState(RESULT_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    period_label: "",
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });

  const baseParams = useCallback(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      customer_id: customer?.value || undefined,
      result: result?.value || undefined,
      search: searchInput || undefined,
    }),
    [dateFrom, dateTo, customer, result, searchInput]
  );

  const load = useCallback(
    async (page, perPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.reports.exchangeGainLoss, {
          params: { ...baseParams(), page, perPage },
        });
        const payload = resp?.data?.data || {};
        setData({
          period_label: payload.period_label || "",
          rows: payload.rows || [],
          totals: payload.totals || {},
          pagination: payload.pagination || { total: 0, perPage },
        });
      } catch (e) {
        Notification("Error", t("There are no records to display"), "warning");
        setData((d) => ({
          ...d,
          rows: [],
          totals: {},
          pagination: { total: 0, perPage },
        }));
      } finally {
        setLoading(false);
      }
    },
    [baseParams, t]
  );

  const sp = useServerPagination(load);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        sp.setPage(1);
        load(1, sp.perPage);
      }, 500);
    } else {
      sp.setPage(1);
      load(1, sp.perPage);
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, dateFrom, dateTo, customer, result]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.exchangeGainLossExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "exchange-gain-loss.xlsx";
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
  const netGl = Number(totals.gain_loss_inr || 0);

  return (
    <Fragment>
      <div className="main-content reports-exchange-gain-loss">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Exchange Gain/Loss")}</h3>
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

        <Row className="mb-1">
          <StatTile
            label={t("Receipts")}
            value={totals.receipts ?? 0}
            hint={`${totals.gains ?? 0} ${t("gains")} · ${
              totals.losses ?? 0
            } ${t("losses")}`}
          />
          <StatTile
            label={t("INR Expected")}
            value={`₹ ${grp(totals.inr_expected)}`}
            hint={t("booked at invoice rate")}
          />
          <StatTile
            label={t("INR Received")}
            value={`₹ ${grp(totals.inr_received)}`}
            hint={t("realized at receipt rate")}
          />
          <StatTile
            label={t("Net Gain / Loss")}
            value={glText(totals.gain_loss_inr)}
            valueClass={netGl < 0 ? "text-danger" : netGl > 0 ? "text-success" : ""}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="egl-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="egl-to"
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
                <Label className="form-label">{t("Result")}</Label>
                <Select
                  value={result}
                  onChange={(sel) => setResult(sel || RESULT_OPTIONS[0])}
                  options={RESULT_OPTIONS}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("Invoice / Receipt No / Customer")}
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
                    {t("No foreign-currency receipts in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Receipt")}</th>
                            <th className="text-nowrap">{t("Invoice")}</th>
                            <th className="text-nowrap">{t("Customer")}</th>
                            <th className="text-end text-nowrap">{t("Amount")}</th>
                            <th className="text-end text-nowrap">{t("Invoice Rate")}</th>
                            <th className="text-end text-nowrap">{t("Receipt Rate")}</th>
                            <th className="text-end text-nowrap">{t("INR Expected")}</th>
                            <th className="text-end text-nowrap">{t("INR Received")}</th>
                            <th className="text-end text-nowrap">{t("Gain / Loss")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const sym = r.currency_symbol;
                            const cur = r.currency_code;
                            return (
                              <tr key={r.payment_id}>
                                <td style={{ minWidth: 130 }}>
                                  <div className="fw-semibold text-nowrap">
                                    {r.receipt_no || <Dash />}
                                  </div>
                                  <div className="small text-muted">
                                    {fmtDate(r.payment_date)}
                                    {r.method ? (
                                      <span className="text-capitalize">
                                        {" · "}
                                        {String(r.method).replace(/_/g, " ")}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td style={{ minWidth: 150 }}>
                                  {r.invoice_no ? (
                                    <a
                                      href={`${appsRoot}/invoices/view/${r.invoice_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary fw-semibold text-nowrap"
                                    >
                                      {r.invoice_no}
                                    </a>
                                  ) : (
                                    <Dash />
                                  )}
                                  <div className="small text-muted">
                                    {fmtDate(r.invoice_date)}
                                  </div>
                                </td>
                                <td style={{ minWidth: 200 }}>
                                  {r.customer_name || <Dash />}
                                </td>
                                <td className="text-end text-nowrap">
                                  {money(r.amount, sym)}
                                </td>
                                <td className="text-end text-nowrap">
                                  {`1 ${cur} = ₹${grp(r.invoice_rate_inr)}`}
                                </td>
                                <td className="text-end text-nowrap">
                                  {`1 ${cur} = ₹${grp(r.receipt_rate_inr)}`}
                                </td>
                                <td className="text-end text-nowrap">
                                  {`₹ ${grp(r.inr_expected)}`}
                                </td>
                                <td className="text-end text-nowrap">
                                  {`₹ ${grp(r.inr_received)}`}
                                </td>
                                <td
                                  className={`text-end text-nowrap ${glClass(
                                    r.gain_loss_inr
                                  )}`}
                                >
                                  {glText(r.gain_loss_inr)}
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
                            <td className="text-end text-nowrap">{`₹ ${grp(
                              totals.inr_expected
                            )}`}</td>
                            <td className="text-end text-nowrap">{`₹ ${grp(
                              totals.inr_received
                            )}`}</td>
                            <td
                              className={`text-end text-nowrap ${
                                netGl < 0
                                  ? "text-danger"
                                  : netGl > 0
                                  ? "text-success"
                                  : ""
                              }`}
                            >
                              {glText(totals.gain_loss_inr)}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <ServerPaginationBar
                      idPrefix="egl"
                      page={sp.page}
                      perPage={data.pagination?.perPage || sp.perPage}
                      total={data.pagination?.total || 0}
                      onPageChange={sp.handlePageChange}
                      onPerPageChange={sp.handlePerPageChange}
                    />
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

export default ExchangeGainLoss;
