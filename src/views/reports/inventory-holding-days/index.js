// Inventory Holding Days report.
// Average days a unit was held in stock before it sold — FIFO cohort matching
// of GRN receipts against issued-invoice sales, anchored on the sale date.
// No money columns (this is a days/qty report). Long-holders (high avg days)
// get a subtle wash. Mirrors stock-turnover's structure.
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

// Plain qty, up to 2 dp (e.g. "50" / "12.5").
const qty = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Whole days.
const days = (v) =>
  v === null || v === undefined ? null : Number(v).toFixed(0);

// A muted em-dash for null / missing values.
const Dash = () => <span className="text-muted">—</span>;

// DD/MM/YYYY, pinned to IST so a stored business date renders as intended.
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
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

const InventoryHoldingDays = () => {
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
        const resp = await instance.get(
          API_ENDPOINTS.reports.inventoryHoldingDays,
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
        API_ENDPOINTS.reports.inventoryHoldingDaysExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-holding-days.xlsx";
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
  const overallAvg = totals.avg_holding_days;

  return (
    <Fragment>
      <div className="main-content reports-inventory-holding-days">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Inventory Holding Days")}</h3>
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
            hint={t("sold in period")}
          />
          <StatTile
            label={t("Avg Holding Days")}
            value={days(overallAvg) ?? <Dash />}
            hint={t("receipt → sale, qty-weighted")}
          />
          <StatTile
            label={t("Units Matched")}
            value={qty(totals.qty_sold_matched)}
          />
          <StatTile
            label={t("Unmatched Units")}
            value={qty(totals.unmatched_qty)}
            valueClass={
              Number(totals.unmatched_qty) > 0 ? "text-warning" : ""
            }
            hint={t("no receipt on record")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("Product name / code")}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="ihd-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="ihd-to"
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
            </Row>

            <Row className="mt-1">
              <Col md="12">
                {loading ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" /> {t("Loading…")}
                  </div>
                ) : !rows.length ? (
                  <div className="text-center text-muted py-3">
                    {t("No products sold in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div
                      className="table-responsive"
                      style={{ overflowX: "auto" }}
                    >
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">{t("Product")}</th>
                            <th className="text-nowrap">{t("Category")}</th>
                            <th className="text-end text-nowrap">
                              {t("Qty Sold")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Avg Days")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Min")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Max")}
                            </th>
                            <th className="text-nowrap">{t("First Sale")}</th>
                            <th className="text-nowrap">{t("Last Sale")}</th>
                            <th className="text-end text-nowrap">
                              {t("Unmatched")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            // Long-holder: sat above the overall average →
                            // subtle warning wash.
                            const slow =
                              overallAvg != null &&
                              Number(r.avg_holding_days) >
                                Number(overallAvg) &&
                              Number(r.qty_sold_matched) > 0;
                            return (
                              <tr
                                key={r.product_id}
                                className={slow ? "table-warning" : ""}
                                // Keep the warning background tint but not its
                                // border color — see stock-turnover/index.js
                                // for why (.table-warning also recolors
                                // --bs-table-border-color on a bordered table).
                                style={
                                  slow
                                    ? { "--bs-table-border-color": "var(--bs-border-color)" }
                                    : undefined
                                }
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
                                <td className="text-end">
                                  {qty(r.qty_sold_matched)}
                                </td>
                                <td className="text-end fw-semibold">
                                  {Number(r.qty_sold_matched) > 0 ? (
                                    days(r.avg_holding_days)
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td className="text-end">
                                  {Number(r.qty_sold_matched) > 0 ? (
                                    days(r.min_holding_days)
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td className="text-end">
                                  {Number(r.qty_sold_matched) > 0 ? (
                                    days(r.max_holding_days)
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td className="text-nowrap">
                                  {fmtDate(r.first_sale_date) || <Dash />}
                                </td>
                                <td className="text-nowrap">
                                  {fmtDate(r.last_sale_date) || <Dash />}
                                </td>
                                <td className="text-end">
                                  {Number(r.unmatched_qty) > 0 ? (
                                    <span className="text-warning">
                                      {qty(r.unmatched_qty)}
                                    </span>
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            className="fw-bolder"
                          >
                            <td colSpan={2}>{t("Overall")}</td>
                            <td className="text-end">
                              {qty(totals.qty_sold_matched)}
                            </td>
                            <td className="text-end">
                              {days(overallAvg) ?? <Dash />}
                            </td>
                            <td />
                            <td />
                            <td />
                            <td />
                            <td className="text-end">
                              {qty(totals.unmatched_qty)}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    {Number(totals.unmatched_qty) > 0 ? (
                      <div className="small text-muted mt-1">
                        {qty(totals.unmatched_qty)}{" "}
                        {t(
                          "sold unit(s) had no matching GRN receipt (e.g. opening stock) and are excluded from the average."
                        )}
                      </div>
                    ) : null}

                    <ServerPaginationBar
                      idPrefix="ihd"
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

export default InventoryHoldingDays;
