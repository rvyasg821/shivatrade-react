// Inventory Aging report.
// Aging of CLOSING stock as of a snapshot date: how much on-hand qty & value
// has been sitting ≥ the selected threshold (30/60/90/120 days, via dropdown).
// FIFO-attributed to GRN receipts, valued at weighted-avg vendor cost (INR).
// Identifies slow-moving items. Mirrors stock-turnover's structure.
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
// Plain qty, up to 2 dp.
const qty = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const Dash = () => <span className="text-muted">—</span>;

const AGING_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 120, label: "120 days" },
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

const InventoryAging = () => {
  const { t } = useTranslation();

  const [asOf, setAsOf] = useState("");
  const [agingDays, setAgingDays] = useState(AGING_OPTIONS[2]); // default 90
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
    as_of_label: "",
    aging_days: 90,
    rows: [],
    totals: {},
    pagination: { total: 0, perPage: defaultPerPageRow },
  });

  const baseParams = useCallback(
    () => ({
      as_of: asOf || undefined,
      aging_days: agingDays?.value || 90,
      category_id: category?.value || undefined,
      product_id: product?.value || undefined,
      search: searchInput || undefined,
    }),
    [asOf, agingDays, category, product, searchInput]
  );

  const load = useCallback(
    async (page = currentPage, perPage = rowsPerPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.reports.inventoryAging, {
          params: { ...baseParams(), page, perPage },
        });
        const payload = resp?.data?.data || {};
        setData({
          as_of_label: payload.as_of_label || "",
          aging_days: payload.aging_days || 90,
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
  }, [searchInput, asOf, agingDays, category, product]);

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
  const total = data.pagination?.total || 0;
  const perPage = data.pagination?.perPage || rowsPerPage;
  const pageCount = Math.ceil((total || 1) / (perPage || 1));
  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = Math.min(startIndex - 1 + perPage, total);
  const nDays = data.aging_days || agingDays?.value || 90;

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
            value={`₹ ${grp(totals.closing_value_inr)}`}
          />
          <StatTile
            label={`${t("Aged Value")} (≥${nDays}d)`}
            value={`₹ ${grp(totals.aged_value_inr)}`}
            valueClass={
              Number(totals.aged_value_inr) > 0 ? "text-danger" : ""
            }
            hint={t("tied up in slow movers")}
          />
          <StatTile
            label={t("% Aged (value)")}
            value={`${Number(totals.aged_pct || 0).toFixed(1)}%`}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("As of")}</Label>
                <DateInput
                  id="iag-asof"
                  value={asOf}
                  onChange={(d, str, iso) => setAsOf(iso || "")}
                  placeholder={t("Today")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("Aged over")}</Label>
                <Select
                  value={agingDays}
                  onChange={(sel) => setAgingDays(sel || AGING_OPTIONS[2])}
                  options={AGING_OPTIONS}
                  isClearable={false}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
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
                    {t("No products with closing stock")}
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
                              {t("Closing Qty")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Closing Value (₹)")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Aged Qty")} (≥{nDays}d)
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Aged Value (₹)")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("% Aged")}
                            </th>
                            <th className="text-end text-nowrap">
                              {t("Oldest (days)")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            // Slow mover: any aged stock → subtle warning wash.
                            const slow = Number(r.aged_qty) > 0;
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
                                  {Number(r.undated_qty) > 0 ? (
                                    <div
                                      className="small text-muted"
                                      title={t(
                                        "Opening / non-GRN stock with no receipt date — counted as oldest."
                                      )}
                                    >
                                      * {qty(r.undated_qty)}{" "}
                                      {t("undated (treated oldest)")}
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
                                <td className="text-end fw-semibold">
                                  {Number(r.aged_qty) > 0 ? (
                                    qty(r.aged_qty)
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td
                                  className={`text-end text-nowrap ${
                                    Number(r.aged_value_inr) > 0
                                      ? "text-danger fw-semibold"
                                      : ""
                                  }`}
                                >
                                  {Number(r.aged_value_inr) > 0 ? (
                                    grp(r.aged_value_inr)
                                  ) : (
                                    <Dash />
                                  )}
                                </td>
                                <td className="text-end">
                                  {Number(r.aged_pct || 0).toFixed(1)}%
                                </td>
                                <td className="text-end">
                                  {r.oldest_days === null ||
                                  r.oldest_days === undefined ? (
                                    <Dash />
                                  ) : (
                                    Number(r.oldest_days).toFixed(0)
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
                            <td colSpan={2}>{t("Totals (INR)")}</td>
                            <td className="text-end">
                              {qty(totals.closing_qty)}
                            </td>
                            <td className="text-end">
                              {`₹ ${grp(totals.closing_value_inr)}`}
                            </td>
                            <td className="text-end">
                              {qty(totals.aged_qty)}
                            </td>
                            <td className="text-end text-danger">
                              {`₹ ${grp(totals.aged_value_inr)}`}
                            </td>
                            <td className="text-end">
                              {Number(totals.aged_pct || 0).toFixed(1)}%
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    {Number(totals.undated_qty) > 0 ? (
                      <div className="small text-muted mt-1">
                        {qty(totals.undated_qty)}{" "}
                        {t(
                          "on-hand unit(s) had no GRN receipt date (opening / non-GRN stock) and are counted as oldest."
                        )}
                      </div>
                    ) : null}

                    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
                      <Col sm={6} xl={6}>
                        <div className="d-block d-md-flex align-items-center justify-content-start gap-2">
                          <div className="label-select d-flex align-items-center gap-1">
                            <Label className="pr-2 mb-0">{t("Show")}</Label>
                            <select
                              id="iagSelectPage"
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

export default InventoryAging;
