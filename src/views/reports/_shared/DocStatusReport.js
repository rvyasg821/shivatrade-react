// Generic "document coverage status" report — shared by the Sales Order Status
// report (order = Sales Order, coverage = Invoice) and the Purchase Order Status
// report (order = Vendor PO, coverage = GRN). Both render <DocStatusReport>
// with a `config` describing their labels, endpoints and filter shape; the
// table, stat tiles, filters, pagination, Excel export and the drill-down
// drawer are identical, so they live here once.
//
// The backend returns the SAME generic shape for both (doc_*, party_*, ordered/
// covered/pending qty + ₹ value, status, cover_count, breakdown cover_* rows).
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
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
} from "reactstrap";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { Download, Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import EntitySearchSelect from "@components/entity-select";
import Notification from "@components/toast/notification";
import { getCurrencySymbol } from "@src/utility/currency";
import instance from "@src/utility/AxiosConfig";
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues";
import { Pager, pageSlice, PAGE_SIZES } from "@src/views/reports/_shared/DrawerPager";

const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const qty = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const money = (v, symbol) => `${symbol ? `${symbol} ` : ""}${grp(v)}`;

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
};

const Dash = () => <span className="text-muted">—</span>;

// open | partial | closed → label + doc-badge colour (green = fully covered).
const STATUS_META = {
  open: { label: "Open", cls: "doc-badge-gray" },
  partial: { label: "Partially Closed", cls: "doc-badge-orange" },
  closed: { label: "Closed", cls: "doc-badge-green" },
};
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "partial", label: "Partially Closed" },
  { value: "closed", label: "Closed" },
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

/**
 * @param {object} config
 *  - title, idPrefix
 *  - endpoints: { list, breakdown, export }
 *  - exportFilename
 *  - partyKind ('customer'|'vendor'), partyLabel, partyPlaceholder, partyParam
 *  - docNoLabel, dateLabel, searchPlaceholder
 *  - coverageParam, coverageOptions ([{value,label}]), coverLabel
 *  - coverTypeBadge(type) => { label, cls }
 *  - breakdownIdParam
 */
const DocStatusReport = ({ config }) => {
  const { t } = useTranslation();
  const {
    title,
    idPrefix,
    endpoints,
    exportFilename,
    partyKind,
    partyLabel,
    partyPlaceholder,
    partyParam,
    docNoLabel,
    dateLabel,
    searchPlaceholder,
    coverageParam,
    coverageOptions,
    coverLabel,
    coverTypeBadge,
    breakdownIdParam,
    // When true the drill-down shows GST + GST-inclusive Total columns (the
    // coverage doc carries GST, e.g. GRNs under a POV) instead of Amount (₹).
    showCoverGst,
  } = config;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [party, setParty] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [coverageFilter, setCoverageFilter] = useState(coverageOptions[0]);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    period_label: "",
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });

  const [drawerDoc, setDrawerDoc] = useState(null);
  const [drawerRows, setDrawerRows] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerPage, setDrawerPage] = useState(0);
  const [drawerSize, setDrawerSize] = useState(PAGE_SIZES[1]);

  const baseParams = useCallback(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      [partyParam]: party?.value || undefined,
      status: statusFilter?.value || undefined,
      [coverageParam]: coverageFilter?.value || undefined,
      search: searchInput || undefined,
    }),
    [
      dateFrom,
      dateTo,
      party,
      statusFilter,
      coverageFilter,
      searchInput,
      partyParam,
      coverageParam,
    ]
  );

  const load = useCallback(
    async (page = currentPage, perPage = rowsPerPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(endpoints.list, {
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
    [baseParams, currentPage, rowsPerPage, endpoints.list, t]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
  }, [searchInput, dateFrom, dateTo, party, statusFilter, coverageFilter]);

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
      const resp = await instance.get(endpoints.export, {
        params: baseParams(),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename;
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

  const openDrawer = async (row) => {
    setDrawerDoc(row);
    setDrawerRows([]);
    setDrawerPage(0);
    setDrawerLoading(true);
    try {
      const resp = await instance.get(endpoints.breakdown, {
        params: {
          [breakdownIdParam]: row.doc_id,
          [coverageParam]: coverageFilter?.value,
        },
      });
      setDrawerRows(resp?.data?.data || []);
    } catch (e) {
      Notification("Error", t("Could not load the linked documents"), "warning");
      setDrawerRows([]);
    } finally {
      setDrawerLoading(false);
    }
  };
  const closeDrawer = () => setDrawerDoc(null);

  const rows = data.rows || [];
  const totals = data.totals || {};
  const total = data.pagination?.total || 0;
  const perPage = data.pagination?.perPage || rowsPerPage;
  const pageCount = Math.ceil((total || 1) / (perPage || 1));
  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = Math.min(startIndex - 1 + perPage, total);
  const drawerMeta = pageSlice(drawerRows, drawerPage, drawerSize);

  return (
    <Fragment>
      <div className={`main-content reports-${idPrefix}`}>
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t(title)}</h3>
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
            label={t("Open")}
            value={totals.open_count ?? 0}
            hint={t("not yet covered")}
          />
          <StatTile
            label={t("Partially Closed")}
            value={totals.partial_count ?? 0}
            hint={t("part-covered")}
          />
          <StatTile
            label={t("Closed")}
            value={totals.closed_count ?? 0}
            hint={t("fully covered")}
          />
          <StatTile
            label={t("Pending Value (₹)")}
            value={`₹ ${grp(totals.pending_value_inr)}`}
            hint={t("ordered − covered")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">
                  {t("From")} ({t(dateLabel)})
                </Label>
                <DateInput
                  id={`${idPrefix}-from`}
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">
                  {t("To")} ({t(dateLabel)})
                </Label>
                <DateInput
                  id={`${idPrefix}-to`}
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t(partyLabel)}</Label>
                <EntitySearchSelect
                  kind={partyKind}
                  value={party}
                  onChange={(sel) => setParty(sel)}
                  isClearable
                  placeholder={t(partyPlaceholder)}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Status")}</Label>
                <Select
                  value={statusFilter}
                  onChange={(sel) => setStatusFilter(sel || STATUS_OPTIONS[0])}
                  options={STATUS_OPTIONS}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Coverage by")}</Label>
                <Select
                  value={coverageFilter}
                  onChange={(sel) => setCoverageFilter(sel || coverageOptions[0])}
                  options={coverageOptions}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t(searchPlaceholder)}
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
                    {t("No documents in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t(docNoLabel)}</th>
                            <th className="text-nowrap">{t("Date")}</th>
                            <th className="text-nowrap">{t(partyLabel)}</th>
                            <th className="text-nowrap">{t("Status")}</th>
                            <th className="text-end text-nowrap">{t("Ordered Qty")}</th>
                            <th className="text-end text-nowrap">{t("Covered Qty")}</th>
                            <th className="text-end text-nowrap">{t("Pending Qty")}</th>
                            <th className="text-end text-nowrap">{t("Ordered (₹)")}</th>
                            <th className="text-end text-nowrap">{t("Covered (₹)")}</th>
                            <th className="text-end text-nowrap">{t("Pending (₹)")}</th>
                            <th className="text-end text-nowrap">{t("Coverage")}</th>
                            <th className="text-center text-nowrap">{t(coverLabel)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const meta = STATUS_META[r.status] || STATUS_META.open;
                            return (
                              <tr key={r.doc_id}>
                                <td className="fw-semibold text-nowrap">
                                  {r.doc_no || <Dash />}
                                </td>
                                <td className="text-nowrap">
                                  {fmtDate(r.doc_date) || <Dash />}
                                </td>
                                <td style={{ minWidth: 180 }}>
                                  {r.party_name || <Dash />}
                                  {r.currency_code && r.currency_code !== "INR" ? (
                                    <div className="small text-muted">
                                      {r.currency_code}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="text-nowrap">
                                  <span className={`doc-badge ${meta.cls}`}>
                                    {t(meta.label)}
                                  </span>
                                </td>
                                <td className="text-end">{qty(r.ordered_qty)}</td>
                                <td className="text-end">{qty(r.covered_qty)}</td>
                                <td className="text-end">
                                  {Number(r.pending_qty) > 0 ? (
                                    <span className="text-warning fw-semibold">
                                      {qty(r.pending_qty)}
                                    </span>
                                  ) : (
                                    qty(r.pending_qty)
                                  )}
                                </td>
                                <td className="text-end text-nowrap">{`₹ ${grp(r.ordered_value_inr)}`}</td>
                                <td className="text-end text-nowrap">{`₹ ${grp(r.covered_value_inr)}`}</td>
                                <td className="text-end text-nowrap">{`₹ ${grp(r.pending_value_inr)}`}</td>
                                <td className="text-end text-nowrap">
                                  {Number(r.coverage_pct || 0).toFixed(0)}%
                                </td>
                                <td className="text-center text-nowrap">
                                  <Button
                                    color="flat-primary"
                                    size="sm"
                                    className="p-25"
                                    disabled={!r.cover_count}
                                    title={
                                      r.cover_count
                                        ? t("View linked documents")
                                        : t("None yet")
                                    }
                                    onClick={() => openDrawer(r)}
                                  >
                                    <Eye size={15} className="me-25" />
                                    {r.cover_count || 0}
                                  </Button>
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
                            <td colSpan={7}>{t("Totals (INR)")}</td>
                            <td className="text-end">{`₹ ${grp(totals.ordered_value_inr)}`}</td>
                            <td className="text-end">{`₹ ${grp(totals.covered_value_inr)}`}</td>
                            <td className="text-end">{`₹ ${grp(totals.pending_value_inr)}`}</td>
                            <td />
                            <td />
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
                      <Col sm={6} xl={6}>
                        <div className="d-block d-md-flex align-items-center justify-content-start gap-2">
                          <div className="label-select d-flex align-items-center gap-1">
                            <Label className="pr-2 mb-0">{t("Show")}</Label>
                            <select
                              id={`${idPrefix}SelectPage`}
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

      {/* ── Drill-down: coverage documents for one order (QTY/RATE/AMOUNT) ── */}
      <Offcanvas
        direction="end"
        isOpen={!!drawerDoc}
        toggle={closeDrawer}
        style={{ width: "min(1040px, 96vw)" }}
      >
        <OffcanvasHeader toggle={closeDrawer}>
          {t(coverLabel)} — {drawerDoc?.doc_no || ""}
        </OffcanvasHeader>
        <OffcanvasBody>
          {drawerDoc ? (
            <div className="small text-muted mb-1">
              {drawerDoc.party_name || ""} · {t("Ordered")}{" "}
              {qty(drawerDoc.ordered_qty)} · {t("Covered")}{" "}
              {qty(drawerDoc.covered_qty)} · {t("Pending")}{" "}
              {qty(drawerDoc.pending_qty)}
            </div>
          ) : null}

          {drawerLoading ? (
            <div className="text-center py-3">
              <Spinner size="sm" /> {t("Loading…")}
            </div>
          ) : !drawerRows.length ? (
            <div className="text-center text-muted py-3">
              {t("No linked documents for the selected coverage.")}
            </div>
          ) : (
            <Fragment>
              <div className="table-responsive" style={{ overflowX: "auto" }}>
                <Table bordered size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-nowrap">{coverLabel}</th>
                      <th className="text-nowrap">{t("Date")}</th>
                      <th className="text-nowrap">{t("Product")}</th>
                      <th className="text-end text-nowrap">{t("Qty")}</th>
                      <th className="text-end text-nowrap">{t("Rate")}</th>
                      <th className="text-end text-nowrap">{t("Amount")}</th>
                      {showCoverGst ? (
                        <Fragment>
                          <th className="text-end text-nowrap">{t("GST")}</th>
                          <th className="text-end text-nowrap">{t("Total")}</th>
                        </Fragment>
                      ) : (
                        <th className="text-end text-nowrap">{t("Amount (₹)")}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {drawerMeta.rows.map((r, i) => {
                      // Resolve the real symbol from the code (POVs carry the
                      // currency CODE as their "symbol", so "INR" → "₹").
                      const sym =
                        getCurrencySymbol(r.currency_code) ||
                        r.currency_symbol;
                      const badge = coverTypeBadge
                        ? coverTypeBadge(r.cover_type)
                        : null;
                      return (
                        <tr key={`${r.cover_id}-${r.product_code || ""}-${i}`}>
                          <td className="text-nowrap">
                            <div className="fw-semibold">{r.cover_no}</div>
                            {badge ? (
                              <span className={`doc-badge ${badge.cls}`}>
                                {t(badge.label)}
                              </span>
                            ) : null}
                          </td>
                          <td className="text-nowrap">
                            {fmtDate(r.cover_date) || <Dash />}
                          </td>
                          <td style={{ minWidth: 180 }}>
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
                          </td>
                          <td className="text-end">{qty(r.cover_qty)}</td>
                          <td className="text-end text-nowrap">
                            {money(r.cover_rate, sym)}
                          </td>
                          <td className="text-end text-nowrap">
                            {money(r.cover_amount, sym)}
                          </td>
                          {showCoverGst ? (
                            <Fragment>
                              <td className="text-end text-nowrap">
                                {money(r.cover_gst, sym)}
                              </td>
                              <td className="text-end text-nowrap fw-semibold">
                                {money(r.cover_total, sym)}
                              </td>
                            </Fragment>
                          ) : (
                            <td className="text-end text-nowrap">{`₹ ${grp(r.cover_amount_inr)}`}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <Pager
                meta={drawerMeta}
                size={drawerSize}
                onSize={setDrawerSize}
                onPage={setDrawerPage}
                label={t("Rows")}
              />
            </Fragment>
          )}
        </OffcanvasBody>
      </Offcanvas>
    </Fragment>
  );
};

export default DocStatusReport;
