// Inventory Aging report.
// Aging of CLOSING stock as of a snapshot date, FIFO-attributed to GRN receipts
// and split into fixed age buckets — 0-30 / 31-60 / 61-90 / 91-120 / >120 days —
// each with qty & value (weighted-avg vendor cost, INR). Identifies slow-moving
// items (the >120 column). Mirrors stock-turnover's structure.
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
import BreakdownDrawer from "./BreakdownDrawer";

// 2-dp grouping, e.g. 1,23,456.00.
const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// Plain qty, up to 2 dp.
const qty = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const Dash = () => <span className="text-muted">—</span>;

// Fixed bucket labels (also the fallback header when a page has no rows).
const BUCKET_LABELS = ["0-30", "31-60", "61-90", "91-120", ">120"];

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

// One bucket cell: qty on top, ₹value below (muted). Emphasized when `danger`.
const BucketCell = ({ bucket, danger }) => {
  const q = Number(bucket?.qty || 0);
  if (q <= 0)
    return (
      <td className="text-end text-nowrap">
        <Dash />
      </td>
    );
  return (
    <td className={`text-end text-nowrap ${danger ? "text-danger" : ""}`}>
      <div className="fw-semibold">{qty(bucket.qty)}</div>
      <div className="small text-muted">₹{grp(bucket.value)}</div>
    </td>
  );
};

const InventoryAging = () => {
  const { t } = useTranslation();

  const [asOf, setAsOf] = useState("");
  const [category, setCategory] = useState(null);
  const [product, setProduct] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [data, setData] = useState({
    as_of_label: "",
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });
  // Product whose closing-inventory breakdown drawer is open (click a row).
  const [bdProductId, setBdProductId] = useState(null);

  const baseParams = useCallback(
    () => ({
      as_of: asOf || undefined,
      category_id: category?.value || undefined,
      product_id: product?.value || undefined,
      search: searchInput || undefined,
    }),
    [asOf, category, product, searchInput]
  );

  const load = useCallback(
    async (page, perPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.reports.inventoryAging, {
          params: { ...baseParams(), page, perPage },
        });
        const payload = resp?.data?.data || {};
        setData({
          as_of_label: payload.as_of_label || "",
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
  }, [searchInput, asOf, category, product]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.inventoryAgingExport,
        { params: baseParams(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-aging.xlsx";
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
  const totalBuckets = totals.buckets || [];
  const bucketLabels = totalBuckets.length
    ? totalBuckets.map((b) => b.label)
    : BUCKET_LABELS;
  // >120 (oldest) bucket — the slow-mover signal — for the tiles.
  const over120Value =
    totalBuckets.length ? totalBuckets[totalBuckets.length - 1].value : 0;
  const closingValue = totals.closing_value_inr || 0;
  const over120Pct = closingValue > 0 ? (over120Value / closingValue) * 100 : 0;

  return (
    <Fragment>
      <div className="main-content reports-inventory-aging">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Inventory Aging")}</h3>
          <div className="d-flex align-items-center gap-1">
            {data.as_of_label ? (
              <span className="text-muted">
                {t("As of")} {data.as_of_label}
              </span>
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
            hint={t("with closing stock")}
          />
          <StatTile
            label={t("Closing Value (₹)")}
            value={`₹ ${grp(closingValue)}`}
          />
          <StatTile
            label={`${t("Value >120 days")} (₹)`}
            value={`₹ ${grp(over120Value)}`}
            valueClass={over120Value > 0 ? "text-danger" : ""}
            hint={t("oldest / slow movers")}
          />
          <StatTile
            label={t("% >120 days (value)")}
            value={`${Number(over120Pct).toFixed(1)}%`}
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
                <Label className="form-label">{t("As of")}</Label>
                <DateInput
                  id="iag-asof"
                  value={asOf}
                  onChange={(d, str, iso) => setAsOf(iso || "")}
                  placeholder={t("Today")}
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
                    {t("No products with closing stock")}
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
                              {t("Closing Qty")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Closing Value (₹)")}
                            </th>
                            {bucketLabels.map((lbl, i) => (
                              <th
                                key={lbl}
                                className={`text-end text-nowrap ${
                                  i === bucketLabels.length - 1
                                    ? "text-danger"
                                    : ""
                                }`}
                                title={t("Qty (top) · ₹ Value (below)")}
                              >
                                {lbl} {t("days")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const buckets = r.buckets || [];
                            const lastIdx = buckets.length - 1;
                            // Slow mover: has any >120-day stock.
                            const slow =
                              lastIdx >= 0 &&
                              Number(buckets[lastIdx]?.qty || 0) > 0;
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
                                  <div
                                    className="fw-semibold text-wrap"
                                    role="button"
                                    style={{ cursor: "pointer", color: "#09418B" }}
                                    title={t(
                                      "View the purchases & sales behind this closing stock"
                                    )}
                                    onClick={() => setBdProductId(r.product_id)}
                                  >
                                    {r.product_name || <Dash />}
                                  </div>
                                  {r.product_code ? (
                                    <div className="small text-muted">
                                      {r.product_code}
                                    </div>
                                  ) : null}
                                  {Number(r.undated_qty) > 0 ? (
                                    <div
                                      className="small text-muted"
                                      title={t(
                                        "Opening / non-GRN stock with no receipt date — counted in >120."
                                      )}
                                    >
                                      * {qty(r.undated_qty)}{" "}
                                      {t("undated (in >120)")}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="text-nowrap">
                                  {r.category_name || <Dash />}
                                </td>
                                <td className="text-end">
                                  {qty(r.closing_qty)}
                                </td>
                                <td className="text-end text-nowrap">
                                  {grp(r.closing_value_inr)}
                                </td>
                                {buckets.map((b, i) => (
                                  <BucketCell
                                    key={b.key || i}
                                    bucket={b}
                                    danger={i === lastIdx}
                                  />
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            className="fw-bolder"
                          >
                            <td colSpan={2}>{t("Totals (INR)")}</td>
                            <td className="text-end">
                              {qty(totals.closing_qty)}
                            </td>
                            <td className="text-end text-nowrap">
                              {`₹ ${grp(totals.closing_value_inr)}`}
                            </td>
                            {totalBuckets.map((b, i) => (
                              <td
                                key={b.key || i}
                                className={`text-end text-nowrap ${
                                  i === totalBuckets.length - 1
                                    ? "text-danger"
                                    : ""
                                }`}
                              >
                                <div>{qty(b.qty)}</div>
                                <div className="small">₹{grp(b.value)}</div>
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    {Number(totals.undated_qty) > 0 ? (
                      <div className="small text-muted mt-1">
                        {qty(totals.undated_qty)}{" "}
                        {t(
                          "on-hand unit(s) had no GRN receipt date (opening / non-GRN stock) and are counted in the >120 bucket."
                        )}
                      </div>
                    ) : null}

                    <ServerPaginationBar
                      idPrefix="iag"
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

      <BreakdownDrawer
        isOpen={!!bdProductId}
        productId={bdProductId}
        asOf={asOf || undefined}
        toggle={() => setBdProductId(null)}
      />
    </Fragment>
  );
};

export default InventoryAging;
