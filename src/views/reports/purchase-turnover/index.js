// Purchase Turnover (VPO) — PURCHASE_TURNOVER_VPO_REPORT_PLAN.md.
// What we purchased, paid and still owe. Dispatched + closed POVs, every
// payment status (unpaid POVs are IN — turnover is what was bought, not paid).
// One page, two lenses: By Month (trend) / By Vendor (exposure).
import { Fragment, useCallback, useEffect, useState, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import DatatablePagination from "@components/datatable/DatatablePagination";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow } from "@constant/defaultValues";
import {
  getPurchaseTurnover,
  cleanPurchaseTurnoverMessage,
} from "./store";

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

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overpaid", label: "Overpaid" },
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

// Negative = the vendor was overpaid — legitimate, not a bug (plan §12.7).
const Outstanding = ({ value }) => {
  const n = Number(value || 0);
  return (
    <span className={n < 0 ? "text-danger fw-semibold" : "fw-semibold"}>
      {inr(value)}
    </span>
  );
};

const PurchaseTurnover = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.purchaseTurnover);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendor, setVendor] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [byVendor, setByVendor] = useState(false);
  const [sort, setSort] = useState("desc");
  const [orderBy, setOrderBy] = useState("value");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [exporting, setExporting] = useState(false);
  const [vendorOptions, setVendorOptions] = useState([]);

  const params = useCallback(
    (extra = {}) => ({
      group_by: byVendor ? "vendor" : "month",
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      vendor_id: vendor?.value || undefined,
      payment_status: paymentStatus?.value || undefined,
      ...extra,
    }),
    [byVendor, dateFrom, dateTo, vendor, paymentStatus]
  );

  const load = useCallback(
    (order = orderBy, dir = sort, page = currentPage, perPage = rowsPerPage) => {
      dispatch(
        getPurchaseTurnover(
          params(
            byVendor
              ? { page, perPage, order_by: order, order_direction: dir }
              : // Month mode is bounded by the range — one page, no paging UI.
                { page: 1, perPage: 100000 }
          )
        )
      );
    },
    [orderBy, sort, currentPage, rowsPerPage, byVendor, params, dispatch]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    instance
      .get(API_ENDPOINTS.vendors.dropdown)
      .then((r) =>
        setVendorOptions(
          (r?.data?.data || []).map((v) => ({
            value: v._id || v.value,
            label: v.company_name || v.name || v.label,
          }))
        )
      )
      .catch(() => setVendorOptions([]));
  }, []);

  // Any filter change resets to page 1 and refetches.
  useEffect(() => {
    setCurrentPage(1);
    load(orderBy, sort, 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, vendor, paymentStatus, byVendor]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanPurchaseTurnoverMessage());
    }
  }, [store?.error, dispatch]);

  const handleSort = (column, sortDirection) => {
    const col = column.sortField || "value";
    setOrderBy(col);
    setSort(sortDirection);
    setCurrentPage(1);
    load(col, sortDirection, 1, rowsPerPage);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    load(orderBy, sort, page + 1, rowsPerPage);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
    load(orderBy, sort, 1, Number(value));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.purchaseTurnoverExport,
        {
          params: params({ order_by: orderBy, order_direction: sort }),
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-turnover_${byVendor ? "vendor" : "month"}${
        dateFrom ? `_${dateFrom}` : ""
      }${dateTo ? `_${dateTo}` : ""}.xlsx`;
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

  const rows = store?.rows || [];
  const totals = store?.totals || {};

  const columns = [
    {
      name: t("Vendor"),
      sortable: false,
      grow: 2,
      selector: (row) => (
        <span className="fw-bold text-wrap">{row?.label || "—"}</span>
      ),
    },
    {
      name: t("POVs"),
      sortField: "count",
      sortable: true,
      right: true,
      selector: (row) => row?.pov_count ?? 0,
    },
    {
      name: t("Taxable (₹)"),
      sortable: false,
      right: true,
      selector: (row) => inr(row?.taxable_inr),
    },
    {
      name: t("GST (₹)"),
      sortable: false,
      right: true,
      selector: (row) => inr(row?.gst_inr),
    },
    {
      name: t("Order Value (₹)"),
      sortField: "value",
      sortable: true,
      right: true,
      selector: (row) => (
        <span className="fw-bold">{inr(row?.order_value_inr)}</span>
      ),
    },
    {
      name: t("Paid (₹)"),
      sortField: "paid",
      sortable: true,
      right: true,
      selector: (row) => inr(row?.paid_inr),
    },
    {
      name: t("Outstanding (₹)"),
      sortField: "outstanding",
      sortable: true,
      right: true,
      selector: (row) => <Outstanding value={row?.outstanding_inr} />,
    },
  ];

  return (
    <Fragment>
      <div className="main-content reports-purchase-turnover">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Purchase Turnover (VPO)")}</h3>
          <div className="d-flex align-items-center gap-1">
            {store?.period_label ? (
              <span className="text-muted">{store.period_label}</span>
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
            label={t("Purchase Value")}
            value={inrCompact(totals.order_value_inr)}
            hint={`₹ ${inr(totals.order_value_inr)}`}
          />
          <StatTile
            label={t("Paid")}
            value={inrCompact(totals.paid_inr)}
            hint={`₹ ${inr(totals.paid_inr)} · ${t("gross, before TDS")}`}
          />
          <StatTile
            label={t("Outstanding")}
            value={inrCompact(totals.outstanding_inr)}
            hint={`₹ ${inr(totals.outstanding_inr)}`}
            valueClass={
              Number(totals.outstanding_inr) < 0 ? "text-danger" : "text-warning"
            }
          />
          <StatTile
            label={t("POVs")}
            value={totals.pov_count ?? 0}
            hint={t("dispatched + closed")}
          />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="pt-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="pt-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Vendor")}</Label>
                <Select
                  value={vendor}
                  onChange={(sel) => setVendor(sel)}
                  options={vendorOptions}
                  isClearable
                  placeholder={t("All vendors")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Payment status")}</Label>
                <Select
                  value={paymentStatus}
                  onChange={(sel) => setPaymentStatus(sel)}
                  options={PAYMENT_STATUS_OPTIONS.map((o) => ({
                    ...o,
                    label: t(o.label),
                  }))}
                  isClearable
                  placeholder={t("All")}
                  classNamePrefix="select"
                />
              </Col>
              <Col sm="12" md="2" className="mb-1 d-flex align-items-end">
                <div className="form-check form-switch mb-1">
                  <Input
                    type="switch"
                    id="pt-group-by-vendor"
                    checked={byVendor}
                    onChange={(e) => setByVendor(e.target.checked)}
                  />
                  <Label for="pt-group-by-vendor" className="form-check-label">
                    {t("Group by vendor")}
                  </Label>
                </div>
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
                {byVendor ? (
                  <DatatablePagination
                    columns={columns}
                    data={rows}
                    loading={!store?.loading}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    pagination={store?.pagination}
                    handleSort={handleSort}
                    handleRowPerPage={handlePerPage}
                    handlePagination={handlePagination}
                  />
                ) : (
                  <div className="table-responsive">
                    <Table bordered size="sm" className="align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 110 }}>{t("Month")}</th>
                          <th className="text-end">{t("POVs")}</th>
                          <th className="text-end">{t("Taxable (₹)")}</th>
                          <th className="text-end">{t("GST (₹)")}</th>
                          <th className="text-end">{t("Order Value (₹)")}</th>
                          <th className="text-end">{t("Paid (₹)")}</th>
                          <th className="text-end">{t("Outstanding (₹)")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store?.loading ? (
                          <tr>
                            <td colSpan={7} className="text-center py-3">
                              <Spinner size="sm" /> {t("Loading…")}
                            </td>
                          </tr>
                        ) : rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-3">
                              {t("There are no records to display")}
                            </td>
                          </tr>
                        ) : (
                          rows.map((r) => (
                            <tr key={r.key}>
                              <td className="text-nowrap">{r.label}</td>
                              <td className="text-end">{r.pov_count}</td>
                              <td className="text-end">{inr(r.taxable_inr)}</td>
                              <td className="text-end">{inr(r.gst_inr)}</td>
                              <td className="text-end fw-bold">
                                {inr(r.order_value_inr)}
                              </td>
                              <td className="text-end">{inr(r.paid_inr)}</td>
                              <td className="text-end">
                                <Outstanding value={r.outstanding_inr} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {rows.length > 0 ? (
                        <tfoot className="table-light">
                          <tr className="fw-bolder">
                            <td>{t("TOTAL")}</td>
                            <td className="text-end">{totals.pov_count ?? 0}</td>
                            <td className="text-end">{inr(totals.taxable_inr)}</td>
                            <td className="text-end">{inr(totals.gst_inr)}</td>
                            <td className="text-end">
                              {inr(totals.order_value_inr)}
                            </td>
                            <td className="text-end">{inr(totals.paid_inr)}</td>
                            <td className="text-end">
                              <Outstanding value={totals.outstanding_inr} />
                            </td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </Table>
                  </div>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default PurchaseTurnover;
