// Stock Turnover Ratio report.
// Measures how quickly inventory is sold and replaced. All money is INR:
//   turnover ratio = COGS ÷ average inventory value (at weighted-avg vendor cost)
//   DIO (days)     = period days ÷ ratio  — how long stock sits before selling
// Per-product rows + an overall (₹-normalised) turnover in the tiles & foot.
// Mirrors so-invoice-reconciliation's structure (date range + filters + export
// + pagination). Slow movers (ratio < 1 over the period) get a subtle wash.
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

// 2-dp grouping, e.g. 1,23,456.00.
const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Plain qty, up to 2 dp, no forced decimals (e.g. "50" / "12.5").
const qty = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// A muted em-dash for null / missing values.
const Dash = () => <span className="text-muted">—</span>;

// Turnover ratio "×" (2 dp), or a dash when undefined (no stock to turn over).
const ratioText = (v) =>
  v === null || v === undefined ? null : `${Number(v).toFixed(2)}×`;

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

const StockTurnover = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState(null);
  const [product, setProduct] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [data, setData] = useState({
    period_label: "",
    period_days: 0,
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });

  const baseParams = useCallback(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      category_id: category?.value || undefined,
      product_id: product?.value || undefined,
      search: searchInput || undefined,
    }),
    [dateFrom, dateTo, category, product, searchInput]
  );

  const load = useCallback(
    async (page = currentPage, perPage = rowsPerPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.reports.stockTurnover, {
          params: { ...baseParams(), page, perPage },
        });
        const payload = resp?.data?.data || {};
        setData({
          period_label: payload.period_label || "",
          period_days: payload.period_days || 0,
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
    [baseParams, currentPage, rowsPerPage, t]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    instance
      .get(API_ENDPOINTS.categories.dropdown)
      .then((r) =>
        setCategoryOptions(
          (r?.data?.data || []).map((c) => ({
            value: c._id || c.value,
            label: c.name || c.label,
          }))
        )
      )
      .catch(() => setCategoryOptions([]));
    instance
      .get(API_ENDPOINTS.products.dropdown)
      .then((r) =>
        setProductOptions(
          (r?.data?.data || []).map((p) => ({
            value: p._id || p.value,
            label: p.code ? `${p.code} - ${p.name}` : p.name || p.label,
          }))
        )
      )
      .catch(() => setProductOptions([]));
  }, []);

  // Debounced search + immediate refetch on any other filter change.
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
  }, [searchInput, dateFrom, dateTo, category, product]);

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
        API_ENDPOINTS.reports.stockTurnoverExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "stock-turnover.xlsx";
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

  return (
    <Fragment>
      <div className="main-content reports-stock-turnover">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Stock Turnover Ratio")}</h3>
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
            label={t("Products")}
            value={totals.product_count ?? 0}
            hint={t("with sales or stock")}
          />
          <StatTile
            label={t("Avg Inventory Value (₹)")}
            value={`₹ ${grp(totals.avg_inventory_value_inr)}`}
          />
          <StatTile label={t("COGS (₹)")} value={`₹ ${grp(totals.cogs_inr)}`} />
          <StatTile
            label={t("Overall Turnover")}
            value={ratioText(totals.turnover_ratio) || <Dash />}
            hint={
              totals.dio_days != null
                ? `${t("DIO")} ${Number(totals.dio_days).toFixed(0)} ${t("days")}`
                : t("no inventory in period")
            }
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="stk-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="stk-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Category")}</Label>
                <Select
                  value={category}
                  onChange={(sel) => setCategory(sel)}
                  options={categoryOptions}
                  isClearable
                  placeholder={t("All categories")}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Product")}</Label>
                <Select
                  value={product}
                  onChange={(sel) => setProduct(sel)}
                  options={productOptions}
                  isClearable
                  placeholder={t("All products")}
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
                    {t("No products with sales or stock in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div
                      className="table-responsive"
                      style={{ overflowX: "auto" }}
                    >
                      <Table className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Product")}</th>
                            <th className="text-nowrap">{t("Category")}</th>
                            <th className="text-end text-nowrap">
                              {t("Opening")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Closing")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Avg Qty")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Unit Cost (₹)")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Avg Inv Value (₹)")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Qty Sold")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("COGS (₹)")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Turnover")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("DIO (days)")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            // Slow mover: didn't turn over even once in the
                            // period → subtle warning wash.
                            const slow =
                              r.turnover_ratio !== null &&
                              r.turnover_ratio !== undefined &&
                              Number(r.turnover_ratio) < 1;
                            return (
                              <tr
                                key={r.product_id}
                                className={slow ? "table-warning" : ""}
                              >
                                <td style={{ minWidth: 220 }}>
                                  <div className="fw-semibold text-wrap">
                                    {r.product_name || <Dash />}
                                  </div>
                                  {r.product_code ? (
                                    <div className="small text-muted">
                                      {r.product_code}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="text-nowrap">
                                  {r.category_name || <Dash />}
                                </td>
                                <td className="text-end">{qty(r.opening_qty)}</td>
                                <td className="text-end">{qty(r.closing_qty)}</td>
                                <td className="text-end">{qty(r.avg_qty)}</td>
                                <td className="text-end text-nowrap">
                                  {grp(r.unit_cost)}
                                </td>
                                <td className="text-end text-nowrap">
                                  {grp(r.avg_inventory_value_inr)}
                                </td>
                                <td className="text-end">{qty(r.qty_sold)}</td>
                                <td className="text-end text-nowrap">
                                  {grp(r.cogs_inr)}
                                </td>
                                <td className="text-end text-nowrap fw-semibold">
                                  {ratioText(r.turnover_ratio) || <Dash />}
                                </td>
                                <td className="text-end text-nowrap">
                                  {r.dio_days === null ||
                                  r.dio_days === undefined ? (
                                    <Dash />
                                  ) : (
                                    Number(r.dio_days).toFixed(0)
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
                            <td className="text-end">
                              {`₹ ${grp(totals.avg_inventory_value_inr)}`}
                            </td>
                            <td className="text-end">{qty(totals.qty_sold)}</td>
                            <td className="text-end">
                              {`₹ ${grp(totals.cogs_inr)}`}
                            </td>
                            <td className="text-end">
                              {ratioText(totals.turnover_ratio) || <Dash />}
                            </td>
                            <td className="text-end">
                              {totals.dio_days === null ||
                              totals.dio_days === undefined ? (
                                <Dash />
                              ) : (
                                Number(totals.dio_days).toFixed(0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
                      <Col sm={6} xl={6}>
                        <div className="d-block d-md-flex align-items-center justify-content-start">
                          <div className="label-select">
                            <Label className="pr-2 mb-0">{t("Show")}</Label>
                            <select
                              id="stkSelectPage"
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
                          previousLabel={
                            <i className="tim-icons icon-minimal-left" />
                          }
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

export default StockTurnover;
