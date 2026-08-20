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
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
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
    async (page, perPage) => {
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
    [baseParams, t]
  );

  const sp = useServerPagination(load);

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
  }, []);

  // Debounced search + immediate refetch on any other filter change.
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
  }, [searchInput, dateFrom, dateTo, category, product]);

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
                <EntitySearchSelect
                  kind="product"
                  value={product}
                  onChange={(sel) => setProduct(sel)}
                  isClearable
                  placeholder={t("All products")}
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

                    <ServerPaginationBar
                      idPrefix="stk"
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

export default StockTurnover;
