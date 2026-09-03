// Advance vs Invoice report.
// Advances taken up-front on Sales Orders vs the invoices later raised against
// them — one row per SO. Money columns are shown in each SO's own currency
// (the symbol prefix carries the identity); the only legitimate cross-document
// total lives in the "Totals (INR)" foot, where every SO is normalised to ₹.
// Mirrors the lead-to-invoice-duration page (date range + customer + status +
// search + export + server pagination).
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

// Colour a signed number: negative = red (advance not yet billed / refund due),
// positive = green (still receivable), zero = neutral.
const signClass = (v) => {
  const n = Number(v || 0);
  if (n < 0) return "text-danger fw-semibold";
  if (n > 0) return "text-success fw-semibold";
  return "";
};

const STATUS_META = {
  advance_unbilled: { label: "Advance unbilled", badge: "doc-badge-orange" },
  partly_adjusted: { label: "Partly adjusted", badge: "doc-badge-gray" },
  fully_adjusted: { label: "Fully adjusted", badge: "doc-badge-green" },
  no_advance: { label: "No advance", badge: "doc-badge-gray" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "advance_unbilled", label: "Advance unbilled" },
  { value: "partly_adjusted", label: "Partly adjusted" },
  { value: "fully_adjusted", label: "Fully adjusted" },
  { value: "no_advance", label: "No advance" },
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

const AdvanceVsInvoice = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
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
      status: status?.value || undefined,
      search: searchInput || undefined,
    }),
    [dateFrom, dateTo, customer, status, searchInput]
  );

  const load = useCallback(
    async (page, perPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.reports.advanceVsInvoice, {
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
  }, [searchInput, dateFrom, dateTo, customer, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.advanceVsInvoiceExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "advance-vs-invoice.xlsx";
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
  const balanceInr = Number(totals.balance_inr || 0);

  return (
    <Fragment>
      <div className="main-content reports-advance-vs-invoice">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Advance vs Invoice")}</h3>
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
            label={t("Sales Orders")}
            value={totals.orders ?? 0}
            hint={`${totals.advance_unbilled ?? 0} ${t("advance unbilled")}`}
          />
          <StatTile
            label={t("Advance Received (₹)")}
            value={`₹ ${grp(totals.advance_inr)}`}
          />
          <StatTile
            label={t("Invoiced (₹)")}
            value={`₹ ${grp(totals.invoiced_inr)}`}
          />
          <StatTile
            label={t("Balance (₹)")}
            value={`₹ ${grp(totals.balance_inr)}`}
            valueClass={balanceInr < 0 ? "text-danger" : ""}
            hint={t("Invoiced − Advance")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="avi-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="avi-to"
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
                <Label className="form-label">{t("Status")}</Label>
                <Select
                  value={status}
                  onChange={(sel) => setStatus(sel || STATUS_OPTIONS[0])}
                  options={STATUS_OPTIONS}
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
                  placeholder={t("Sales Order No / Customer")}
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
                    {t("No Sales Orders with an advance or invoice in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Sales Order")}</th>
                            <th className="text-nowrap">{t("Invoice")}</th>
                            <th className="text-nowrap">{t("Customer")}</th>
                            <th className="text-nowrap">{t("Status")}</th>
                            <th className="text-end text-nowrap">{t("SO Value")}</th>
                            <th className="text-end text-nowrap">{t("Advance Received")}</th>
                            <th className="text-end text-nowrap">{t("Invoiced")}</th>
                            <th className="text-end text-nowrap">{t("Balance")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const sym = r.currency_symbol;
                            const meta =
                              STATUS_META[r.status] || {
                                label: r.status,
                                badge: "doc-badge-gray",
                              };
                            return (
                              <tr key={r.so_id}>
                                <td style={{ minWidth: 150 }}>
                                  {r.so_no ? (
                                    <a
                                      href={`${appsRoot}/purchase-orders/view/${r.so_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary fw-semibold text-nowrap"
                                    >
                                      {r.so_no}
                                    </a>
                                  ) : (
                                    <Dash />
                                  )}
                                  <div className="small text-muted">
                                    {fmtDate(r.so_date)}
                                  </div>
                                </td>
                                <td style={{ minWidth: 160 }}>
                                  {(r.invoices || []).length ? (
                                    <div className="d-flex flex-column">
                                      {r.invoices.map((iv) => (
                                        <a
                                          key={iv.id}
                                          href={`${appsRoot}/invoices/view/${iv.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-nowrap"
                                        >
                                          {iv.no || iv.id}
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td style={{ minWidth: 220 }}>
                                  {r.customer_name || <Dash />}
                                </td>
                                <td>
                                  <span className={`doc-badge ${meta.badge}`}>
                                    {t(meta.label)}
                                  </span>
                                </td>
                                <td className="text-end text-nowrap">
                                  {money(r.so_value, sym)}
                                </td>
                                <td className="text-end text-nowrap">
                                  {money(r.advance, sym)}
                                </td>
                                <td className="text-end text-nowrap">
                                  {money(r.invoiced, sym)}
                                </td>
                                <td
                                  className={`text-end text-nowrap ${signClass(
                                    r.balance
                                  )}`}
                                >
                                  {money(r.balance, sym)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            className="fw-bolder"
                          >
                            <td colSpan={4}>{t("Totals (INR)")}</td>
                            <td className="text-end text-nowrap">{`₹ ${grp(totals.so_value_inr)}`}</td>
                            <td className="text-end text-nowrap">{`₹ ${grp(totals.advance_inr)}`}</td>
                            <td className="text-end text-nowrap">{`₹ ${grp(totals.invoiced_inr)}`}</td>
                            <td className={`text-end text-nowrap ${balanceInr < 0 ? "text-danger" : ""}`}>
                              {`₹ ${grp(totals.balance_inr)}`}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <ServerPaginationBar
                      idPrefix="avi"
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

export default AdvanceVsInvoice;
