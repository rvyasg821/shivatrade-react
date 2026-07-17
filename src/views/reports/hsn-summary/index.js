// HSN Summary — GSTR-1 Table 12 (HSN_SUMMARY_GSTR1_REPORT_PLAN.md).
// One row per HSN × notional IGST rate × UQC, all INR, over a date range.
import { Fragment, useCallback, useEffect, useState, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Card, CardBody, Label, Input, Button } from "reactstrap";
import Select from "react-select";
import { Download, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import DatatablePagination from "@components/datatable/DatatablePagination";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow } from "@constant/defaultValues";
import { getHsnSummary, cleanHsnSummaryMessage } from "./store";

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

const GST_ROUTE_OPTIONS = [
  { value: "igst_paid", label: "IGST paid (with tax)" },
  { value: "lut_zero_rated", label: "LUT (zero-rated)" },
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

const HsnSummary = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.hsnSummary);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gstRoute, setGstRoute] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("asc");
  const [orderBy, setOrderBy] = useState("hsn");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    (
      order = orderBy,
      dir = sort,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      dispatch(
        getHsnSummary({
          page,
          perPage,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          gst_route: gstRoute?.value || undefined,
          search: search || undefined,
          order_by: order,
          order_direction: dir,
        })
      );
    },
    [
      orderBy,
      sort,
      currentPage,
      rowsPerPage,
      searchInput,
      dateFrom,
      dateTo,
      gstRoute,
      dispatch,
    ]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
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
  }, [searchInput, dateFrom, dateTo, gstRoute]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanHsnSummaryMessage());
    }
  }, [store?.error, dispatch]);

  const handleSort = (column, sortDirection) => {
    const col = column.sortField || "hsn";
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
      const resp = await instance.get(API_ENDPOINTS.reports.hsnSummaryExport, {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          gst_route: gstRoute?.value || undefined,
          search: searchInput || undefined,
          order_by: orderBy,
          order_direction: sort,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `hsn-summary-gstr1${dateFrom ? `_${dateFrom}` : ""}${
        dateTo ? `_${dateTo}` : ""
      }.xlsx`;
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

  const totals = store?.totals || {};
  const hsnCount = store?.pagination?.total || 0;

  const columns = [
    {
      name: t("HSN"),
      sortField: "hsn",
      sortable: true,
      selector: (row) => (
        <span className="fw-bold text-nowrap">{row?.hsn_code || "—"}</span>
      ),
    },
    {
      name: t("Description"),
      sortable: false,
      grow: 2,
      selector: (row) => (
        <span className="text-wrap">{row?.description || "—"}</span>
      ),
    },
    { name: t("UQC"), sortable: false, selector: (row) => row?.uqc_code || "—" },
    {
      name: t("Rate %"),
      sortable: false,
      right: true,
      selector: (row) => `${Number(row?.rate || 0).toFixed(2)}%`,
    },
    {
      name: t("Qty"),
      sortField: "qty",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.total_qty),
    },
    {
      name: t("Taxable (₹)"),
      sortField: "taxable",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.taxable_value_inr),
    },
    {
      name: t("IGST (₹)"),
      sortField: "igst",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.igst_inr),
    },
    {
      name: t("CGST (₹)"),
      sortable: false,
      right: true,
      selector: (row) => inr(row?.cgst_inr),
    },
    {
      name: t("SGST (₹)"),
      sortable: false,
      right: true,
      selector: (row) => inr(row?.sgst_inr),
    },
    {
      name: t("Cess (₹)"),
      sortable: false,
      right: true,
      selector: (row) => inr(row?.cess_inr),
    },
    {
      name: t("Total (₹)"),
      sortable: false,
      right: true,
      selector: (row) => (
        <span className="fw-bold">{inr(row?.total_value_inr)}</span>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="main-content reports-hsn-summary">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("HSN Summary (GSTR-1)")}</h3>
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
            label={t("Taxable Value")}
            value={inrCompact(totals.taxable_value_inr)}
            hint={`₹ ${inr(totals.taxable_value_inr)}`}
          />
          <StatTile
            label={t("IGST (notional)")}
            value={inrCompact(totals.igst_inr)}
            hint={t("charged & refunded on IGST-paid exports")}
          />
          <StatTile
            label={t("Total Value")}
            value={inrCompact(totals.total_value_inr)}
            hint={`₹ ${inr(totals.total_value_inr)}`}
          />
          <StatTile
            label={t("HSN Rows")}
            value={hsnCount}
            hint={t("HSN × rate × UQC")}
          />
        </Row>

        {store?.missing_hsn_or_uqc_rows > 0 ? (
          <div className="alert alert-warning py-50 px-1 d-flex align-items-center">
            <AlertTriangle size={16} className="me-50 flex-shrink-0" />
            <span className="small">
              {store.missing_hsn_or_uqc_rows}{" "}
              {t(
                "issued invoice line(s) are missing an HSN or UQC — they group under “—” and may not be GSTR-1 valid."
              )}
            </span>
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="hsn-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="hsn-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("GST route")}</Label>
                <Select
                  value={gstRoute}
                  onChange={(sel) => setGstRoute(sel)}
                  options={GST_ROUTE_OPTIONS.map((o) => ({
                    ...o,
                    label: t(o.label),
                  }))}
                  isClearable
                  placeholder={t("All routes")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Search")}</Label>
                <Input
                  type="text"
                  value={searchInput}
                  placeholder={t("HSN code")}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                />
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
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
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default HsnSummary;
