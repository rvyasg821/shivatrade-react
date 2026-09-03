// Lead → Invoice Duration report.
// Tracks the conversion cycle time from the originating Lead through Quotation
// and Sales Order to the Invoice, one row per issued invoice. Each stage shows
// its document number + date, and the whole-day gaps between stages; the
// headline "Total" is Lead → Invoice. Defaults to export invoices (the cycle
// the client tracks) with a type switch. Mirrors the so-invoice-reconciliation
// page (date range + customer + search + export + server pagination).
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
import { defaultPerPageRow } from "@constant/defaultValues";
import {
  useServerPagination,
  ServerPaginationBar,
} from "@src/views/_shared/table/ServerPagination";

// Whole-day count, rendered plainly. Null → em-dash.
const daysCell = (v) =>
  v === null || v === undefined ? (
    <span className="text-muted">—</span>
  ) : (
    `${v} ${Math.abs(Number(v)) === 1 ? "day" : "days"}`
  );

// 1-dp average for the stat tiles / foot.
const avg1 = (v) =>
  v === null || v === undefined ? "—" : Number(v).toFixed(1);

// DD/MM/YYYY in IST (dates come back as ISO timestamps at midnight IST).
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
};

const Dash = () => <span className="text-muted">—</span>;

// A document cell: bold voucher number over its muted date (or a dash).
const DocCell = ({ no, date, minWidth = 130 }) => (
  <td style={{ minWidth }}>
    {no ? (
      <div className="fw-semibold text-nowrap">{no}</div>
    ) : (
      <Dash />
    )}
    {date ? <div className="small text-muted">{fmtDate(date)}</div> : null}
  </td>
);

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

const TYPE_OPTIONS = [
  { value: "export", label: "Export invoices" },
  { value: "commercial", label: "Commercial invoices" },
  { value: "all", label: "All invoices" },
];

const LeadToInvoiceDuration = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customer, setCustomer] = useState(null);
  const [invoiceType, setInvoiceType] = useState(TYPE_OPTIONS[0]);
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
      invoice_type: invoiceType?.value || undefined,
      search: searchInput || undefined,
    }),
    [dateFrom, dateTo, customer, invoiceType, searchInput]
  );

  const load = useCallback(
    async (page, perPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(
          API_ENDPOINTS.reports.leadToInvoiceDuration,
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
  }, [searchInput, dateFrom, dateTo, customer, invoiceType]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.leadToInvoiceDurationExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "lead-to-invoice-duration.xlsx";
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

  return (
    <Fragment>
      <div className="main-content reports-lead-to-invoice-duration">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Lead to Invoice Duration")}</h3>
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
            label={t("Invoices")}
            value={totals.invoices ?? 0}
            hint={t("in this period")}
          />
          <StatTile
            label={t("Avg Cycle (Lead → Invoice)")}
            value={`${avg1(totals.avg_total_days)} ${t("days")}`}
            hint={`${totals.chained ?? 0} ${t("fully chained")}`}
          />
          <StatTile
            label={t("Fastest / Slowest")}
            value={`${totals.min_total_days ?? "—"} / ${
              totals.max_total_days ?? "—"
            }`}
            hint={t("days, full cycle")}
          />
          <StatTile
            label={t("Avg SO → Invoice")}
            value={`${avg1(totals.avg_so_to_invoice_days)} ${t("days")}`}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("Lead / Quote / SO / Invoice No")}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="ltid-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="ltid-to"
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
                <Label className="form-label">{t("Invoice Type")}</Label>
                <Select
                  value={invoiceType}
                  onChange={(sel) => setInvoiceType(sel || TYPE_OPTIONS[0])}
                  options={TYPE_OPTIONS}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
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
                    {t("No invoices in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Lead")}</th>
                            <th className="text-nowrap">{t("Quotation")}</th>
                            <th className="text-nowrap">{t("Sales Order")}</th>
                            <th className="text-nowrap">{t("Invoice")}</th>
                            <th className="text-nowrap">{t("Customer")}</th>
                            <th className="text-end text-nowrap">{t("Lead → Quote")}</th>
                            <th className="text-end text-nowrap">{t("Quote → SO")}</th>
                            <th className="text-end text-nowrap">{t("SO → Invoice")}</th>
                            <th className="text-end text-nowrap">{t("Total")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.invoice_id}>
                              <DocCell no={r.lead_no} date={r.lead_date} />
                              <DocCell
                                no={r.quotation_no}
                                date={r.quotation_date}
                              />
                              <DocCell no={r.so_no} date={r.so_date} />
                              <td style={{ minWidth: 150 }}>
                                <div className="fw-semibold text-nowrap">
                                  {r.invoice_no || <Dash />}
                                </div>
                                <div className="small text-muted">
                                  {fmtDate(r.invoice_date)}
                                  {r.invoice_type ? (
                                    <span
                                      className={`doc-badge ms-1 ${
                                        r.invoice_type === "export"
                                          ? "doc-badge-green"
                                          : "doc-badge-gray"
                                      }`}
                                    >
                                      {r.invoice_type === "export"
                                        ? t("Export")
                                        : t("Commercial")}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td style={{ minWidth: 240 }}>
                                {r.customer_name || <Dash />}
                              </td>
                              <td className="text-end text-nowrap">
                                {daysCell(r.lead_to_quotation_days)}
                              </td>
                              <td className="text-end text-nowrap">
                                {daysCell(r.quotation_to_so_days)}
                              </td>
                              <td className="text-end text-nowrap">
                                {daysCell(r.so_to_invoice_days)}
                              </td>
                              <td className="text-end text-nowrap fw-bolder">
                                {daysCell(r.total_days)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr
                            className="fw-bolder"
                          >
                            <td colSpan={5}>{t("Average (days)")}</td>
                            <td className="text-end">
                              {avg1(totals.avg_lead_to_quotation_days)}
                            </td>
                            <td className="text-end">
                              {avg1(totals.avg_quotation_to_so_days)}
                            </td>
                            <td className="text-end">
                              {avg1(totals.avg_so_to_invoice_days)}
                            </td>
                            <td className="text-end">
                              {avg1(totals.avg_total_days)}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <ServerPaginationBar
                      idPrefix="ltid"
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

export default LeadToInvoiceDuration;
