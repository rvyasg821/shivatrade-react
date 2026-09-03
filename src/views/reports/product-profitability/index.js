// Product-wise Profitability report (PRODUCT_PROFITABILITY_REPORT_PLAN.md).
// Revenue vs fully-loaded cost per product, all INR, over a date range.
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useLayoutEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Input,
  Badge,
  Button,
  Table,
} from "reactstrap";
import Select from "react-select";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import DatatablePagination from "@components/datatable/DatatablePagination";
import { getProductProfitability, cleanReportMessage } from "./store";
import { getCategoryDropdown } from "@src/views/categories/store";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow } from "@constant/defaultValues";

// 2-dp Indian grouping, e.g. 1,23,456.00
const inr = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Compact ₹ for the KPI tiles: ₹1.25 Cr / ₹19.10 L / ₹45,000.
const inrCompact = (v) => {
  const n = Number(v || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
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

// Category-grouped view: product rows under a category header, a subtotal per
// category, and a grand total. Client-side (the grouped fetch pulls all rows).
const GroupedTable = ({ groups, totals, t, inr }) => {
  const marginPct = (profit, cost) =>
    Number(cost) > 0 ? ((Number(profit) / Number(cost)) * 100).toFixed(2) : "0.00";

  if (!groups.length) {
    return (
      <div className="text-center text-muted py-3">
        {t("There are no records to display")}
      </div>
    );
  }

  return (
    <Table bordered size="sm" responsive className="mb-0 align-middle">
      <thead className="table-dark">
        <tr>
          <th>{t("Product")}</th>
          <th>{t("HSN")}</th>
          <th className="text-end">{t("Qty")}</th>
          <th className="text-end">{t("Revenue (₹)")}</th>
          <th className="text-end">{t("Cost (₹)")}</th>
          <th className="text-end">{t("Profit (₹)")}</th>
          <th className="text-center">{t("Margin %")}</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g, gi) => (
          <Fragment key={gi}>
            <tr className="table-light">
              <td colSpan={7} className="fw-bold">
                {g.category_name}
              </td>
            </tr>
            {g.rows.map((row) => (
              <tr key={row.product_id}>
                <td>
                  <div className="fw-semibold">{row.product_name || "—"}</div>
                  {row.product_code ? (
                    <div className="small text-muted">{row.product_code}</div>
                  ) : null}
                </td>
                <td>{row.hsn_code || "—"}</td>
                <td className="text-end">{inr(row.qty_sold)}</td>
                <td className="text-end">{inr(row.revenue_inr)}</td>
                <td className="text-end">{inr(row.cost_inr)}</td>
                <td
                  className={`text-end ${
                    Number(row.profit_inr) < 0 ? "text-danger fw-bold" : ""
                  }`}
                >
                  {inr(row.profit_inr)}
                </td>
                <td className="text-center">
                  <Badge
                    color={
                      Number(row.margin_pct) < 0 ? "light-danger" : "light-success"
                    }
                  >
                    {Number(row.margin_pct || 0).toFixed(2)}%
                  </Badge>
                </td>
              </tr>
            ))}
            <tr className="fw-bold border-top">
              <td>
                {t("Subtotal")} — {g.category_name}
              </td>
              <td />
              <td className="text-end">{inr(g.subtotal.qty_sold)}</td>
              <td className="text-end">{inr(g.subtotal.revenue_inr)}</td>
              <td className="text-end">{inr(g.subtotal.cost_inr)}</td>
              <td className="text-end">{inr(g.subtotal.profit_inr)}</td>
              <td className="text-center">
                {marginPct(g.subtotal.profit_inr, g.subtotal.cost_inr)}%
              </td>
            </tr>
          </Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr className="fw-bolder">
          <td>{t("Grand Total")}</td>
          <td />
          <td className="text-end">{inr(totals.qty_sold)}</td>
          <td className="text-end">{inr(totals.revenue_inr)}</td>
          <td className="text-end">{inr(totals.cost_inr)}</td>
          <td className="text-end">{inr(totals.profit_inr)}</td>
          <td className="text-center">
            {Number(totals.margin_pct || 0).toFixed(2)}%
          </td>
        </tr>
      </tfoot>
    </Table>
  );
};

const ProductProfitability = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.productProfitability);
  const categoryStore = useSelector((s) => s.category);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("desc");
  const [orderBy, setOrderBy] = useState("profit");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  const load = useCallback(
    (
      order = orderBy,
      dir = sort,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      dispatch(
        getProductProfitability({
          // Grouped view needs the whole set (subtotals span all rows), so it
          // asks for one large page; the flat view stays server-paginated.
          ...(groupByCategory ? { perPage: 100000, page: 1 } : { page, perPage }),
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          category_id: category?.value || undefined,
          search: search || undefined,
          order_by: order,
          order_direction: dir,
        })
      );
    },
    [orderBy, sort, currentPage, rowsPerPage, searchInput, dateFrom, dateTo, category, groupByCategory, dispatch]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getCategoryDropdown());
  }, []);

  // Debounced search + immediate filter refetch.
  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        load(orderBy, sort, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      setCurrentPage(1);
      load(orderBy, sort, 1, rowsPerPage, "");
    }
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, dateFrom, dateTo, category, groupByCategory]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanReportMessage());
    }
  }, [store?.error, dispatch]);

  const handleSort = (column, sortDirection) => {
    const col = column.sortField || "profit";
    setOrderBy(col);
    setSort(sortDirection);
    setCurrentPage(1);
    load(col, sortDirection, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    load(orderBy, sort, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
    load(orderBy, sort, 1, Number(value), searchInput);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.productProfitabilityExport,
        {
          params: {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            category_id: category?.value || undefined,
            search: searchInput || undefined,
            order_by: orderBy,
            order_direction: sort,
          },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-profitability.xlsx";
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

  const categoryOptions = (categoryStore?.categoryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const totals = store?.totals || {};

  // Group rows by category (for the grouped view). Each group carries its own
  // subtotal; the grand total stays as `totals`.
  const groups = useMemo(() => {
    const map = new Map();
    for (const row of store?.rows || []) {
      const key = row.category_id || "__none__";
      if (!map.has(key)) {
        map.set(key, {
          category_name: row.category_name || t("Uncategorised"),
          rows: [],
          subtotal: { qty_sold: 0, revenue_inr: 0, cost_inr: 0, profit_inr: 0 },
        });
      }
      const g = map.get(key);
      g.rows.push(row);
      g.subtotal.qty_sold += Number(row.qty_sold || 0);
      g.subtotal.revenue_inr += Number(row.revenue_inr || 0);
      g.subtotal.cost_inr += Number(row.cost_inr || 0);
      g.subtotal.profit_inr += Number(row.profit_inr || 0);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.category_name.localeCompare(b.category_name)
    );
  }, [store?.rows, t]);

  const columns = [
    {
      name: t("Product"),
      sortable: false,
      grow: 2,
      selector: (row) => (
        <div className="py-50" style={{ minWidth: 0 }}>
          <span className="fw-bold text-wrap">{row?.product_name || "—"}</span>
          {row?.product_code ? (
            <div className="small text-muted">{row.product_code}</div>
          ) : null}
        </div>
      ),
    },
    {
      name: t("HSN"),
      sortable: false,
      selector: (row) => row?.hsn_code || "—",
    },
    {
      name: t("Category"),
      sortable: false,
      selector: (row) => row?.category_name || "—",
    },
    {
      name: t("Qty"),
      sortField: "qty",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.qty_sold),
    },
    {
      name: t("Revenue (₹)"),
      sortField: "revenue",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.revenue_inr),
    },
    {
      name: t("Cost (₹)"),
      sortField: "cost",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.cost_inr),
    },
    {
      name: t("Profit (₹)"),
      sortField: "profit",
      sortable: true,
      right: true,
      selector: (row) => (
        <span className={Number(row?.profit_inr) < 0 ? "text-danger fw-bold" : "fw-bold"}>
          {inr(row?.profit_inr)}
        </span>
      ),
    },
    {
      name: t("Margin %"),
      sortField: "margin",
      sortable: true,
      center: true,
      selector: (row) => (
        <Badge color={Number(row?.margin_pct) < 0 ? "light-danger" : "light-success"}>
          {Number(row?.margin_pct || 0).toFixed(2)}%
        </Badge>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content reports-product-profitability">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Product-wise Profitability")}</h3>
          <div className="d-flex align-items-center gap-1">
            {store?.period_label ? (
              <span className="text-muted">{store.period_label}</span>
            ) : null}
            <Button
              color="success"
              outline
              size="sm"
              onClick={handleExport}
              disabled={exporting || !(store?.rows || []).length}
            >
              <Download size={14} className="me-50" />
              {exporting ? t("Exporting…") : t("Export")}
            </Button>
          </div>
        </div>

        <Row className="mb-1">
          <StatTile
            label={t("Revenue")}
            value={inrCompact(totals.revenue_inr)}
            hint={`₹ ${inr(totals.revenue_inr)}`}
          />
          <StatTile
            label={t("Cost")}
            value={inrCompact(totals.cost_inr)}
            hint={`₹ ${inr(totals.cost_inr)}`}
          />
          <StatTile
            label={t("Profit")}
            value={inrCompact(totals.profit_inr)}
            hint={`₹ ${inr(totals.profit_inr)}`}
            valueClass={Number(totals.profit_inr) < 0 ? "text-danger" : "text-success"}
          />
          <StatTile
            label={t("Margin %")}
            value={`${Number(totals.margin_pct || 0).toFixed(2)}%`}
            hint={t("on cost")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="pp-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="pp-to"
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
                  placeholder={t("All Categories")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("Product name / code")}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                />
              </Col>
              <Col sm="12" md="2" className="mb-1 d-flex align-items-end">
                <div className="form-check form-switch mb-1">
                  <Input
                    type="switch"
                    id="pp-group-by-category"
                    checked={groupByCategory}
                    onChange={(e) => setGroupByCategory(e.target.checked)}
                  />
                  <Label
                    for="pp-group-by-category"
                    className="form-check-label"
                  >
                    {t("Group by category")}
                  </Label>
                </div>
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
                {groupByCategory ? (
                  <GroupedTable
                    groups={groups}
                    totals={totals}
                    t={t}
                    inr={inr}
                  />
                ) : (
                  <DatatablePagination
                    columns={columns}
                    data={store?.rows || []}
                    loading={!store?.loading}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    pagination={store?.pagination}
                    handleSort={handleSort}
                    handleRowPerPage={handlePerPage}
                    handlePagination={handlePagination}
                  />
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ProductProfitability;
