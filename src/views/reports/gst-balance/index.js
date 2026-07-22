// Input-Output GST Balance (INPUT_OUTPUT_GST_BALANCE_REPORT_PLAN.md).
// Month-wise output GST (notional, on exports) vs input GST (real ITC paid to
// vendors), split CGST/SGST vs IGST by state. All INR.
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
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Badge,
} from "reactstrap";
import { Download, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { Pager, pageSlice } from "@src/views/reports/_shared/DrawerPager";
import { getGstBalance, cleanGstBalanceMessage } from "./store";

// 2-dp Indian grouping, e.g. 1,23,456.00
const inr = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// The API sends ISO dates (machine-sortable, and the export reads the month
// off them); every screen in the app reads dd-mm-yyyy.
const ddmmyyyy = (iso) => {
  const s = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};

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

const GstBalance = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.gstBalance);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    dispatch(
      getGstBalance({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
    );
  }, [dateFrom, dateTo, dispatch]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanGstBalanceMessage());
    }
  }, [store?.error, dispatch]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.gstBalanceExport, {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `gst-balance${dateFrom ? `_${dateFrom}` : ""}${
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

  // ── Month drill-down ──
  // The client's actual question ("where does the purchase amount come from?")
  // is answered document-by-document, not by prose.
  const [breakdown, setBreakdown] = useState(null);
  const [breakdownMonth, setBreakdownMonth] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  // Paging is per-table; both reset whenever a new month is opened.
  const [purchasePage, setPurchasePage] = useState(0);
  const [purchaseSize, setPurchaseSize] = useState(10);
  const [salesPage, setSalesPage] = useState(0);
  const [salesSize, setSalesSize] = useState(10);

  const purchaseMeta = pageSlice(
    breakdown?.purchases,
    purchasePage,
    purchaseSize
  );
  const salesMeta = pageSlice(breakdown?.sales, salesPage, salesSize);

  const openBreakdown = async (month) => {
    setBreakdownMonth(month);
    setBreakdown(null);
    setPurchasePage(0);
    setSalesPage(0);
    setBreakdownLoading(true);
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.gstBalanceBreakdown, {
        params: { month },
      });
      setBreakdown(resp?.data?.data || null);
    } catch (e) {
      Notification("Error", t("Could not load the breakdown"), "warning");
      setBreakdownMonth(null);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const rows = store?.rows || [];
  const totals = store?.totals || {};
  // Noise on clean data — only surface the column when something landed there.
  const showUnclassified = Number(totals.input_unclassified_inr || 0) > 0;
  // +2 for the two taxable-base columns added alongside the tax columns.
  const colCount = showUnclassified ? 10 : 9;

  return (
    <Fragment>
      <div className="main-content reports-gst-balance">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Input-Output GST Balance")}</h3>
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
            label={t("Output GST")}
            value={inrCompact(totals.output_igst_inr)}
            hint={t("notional IGST on exports")}
          />
          <StatTile
            label={t("Input GST (ITC)")}
            value={inrCompact(totals.input_total_inr)}
            hint={`₹ ${inr(totals.input_total_inr)}`}
          />
          <StatTile
            label={t("Net ITC")}
            value={inrCompact(totals.net_itc_inr)}
            hint={t("refund claimable")}
            valueClass={
              Number(totals.net_itc_inr) < 0 ? "text-danger" : "text-success"
            }
          />
          <StatTile
            label={t("Months")}
            value={rows.length}
            hint={store?.period_label || "—"}
          />
        </Row>

        {store?.unclassified_pov_count > 0 ? (
          <div className="alert alert-warning py-50 px-1 d-flex align-items-center">
            <AlertTriangle size={16} className="me-50 flex-shrink-0" />
            <span className="small">
              {store.unclassified_pov_count}{" "}
              {t(
                "vendor PO(s) could not be classified as intra- or inter-state (no GSTIN and no address state) — their GST is shown under Unclassified."
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
                  id="gstb-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="2" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="gstb-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
                <div className="table-responsive">
                  <Table bordered size="sm" className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 110 }}>{t("Month")}</th>
                        {/* The taxable bases sit immediately left of the tax
                            they produced, so the derivation reads off the row
                            instead of having to be explained. */}
                        <th
                          className="text-end"
                          title={t(
                            "Invoice-line taxable amount on igst_paid invoices (excludes draft/cancelled)."
                          )}
                        >
                          {t("Sales Taxable (₹)")}
                        </th>
                        <th className="text-end">{t("Output IGST (₹)")}</th>
                        <th
                          className="text-end"
                          title={t(
                            "Vendor PO goods + charges, excluding GST. Status dispatched/closed, dated by dispatch date."
                          )}
                        >
                          {t("Purchase Taxable (₹)")}
                        </th>
                        <th className="text-end">{t("Input IGST (₹)")}</th>
                        <th className="text-end">{t("Input CGST (₹)")}</th>
                        <th className="text-end">{t("Input SGST (₹)")}</th>
                        {showUnclassified ? (
                          <th className="text-end">{t("Unclassified (₹)")}</th>
                        ) : null}
                        <th className="text-end">{t("Input Total (₹)")}</th>
                        <th className="text-end">{t("Net ITC (₹)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store?.loading ? (
                        <tr>
                          <td colSpan={colCount} className="text-center py-3">
                            <Spinner size="sm" /> {t("Loading…")}
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={colCount}
                            className="text-center text-muted py-3"
                          >
                            {t("There are no records to display")}
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.month}>
                            <td className="text-nowrap">
                              {/* Click a month to see the exact documents
                                  behind its figures. */}
                              {/* Explicit link styling: the theme renders
                                  .btn-link in body colour, so a bare
                                  color="link" button read as plain text and
                                  nobody found the drill-down. */}
                              <Button
                                color="link"
                                className="p-0 align-baseline text-primary text-decoration-underline"
                                title={t("See the documents behind this month")}
                                onClick={() => openBreakdown(r.month)}
                              >
                                {r.month_label}
                              </Button>
                            </td>
                            <td className="text-end">
                              {inr(r.output_taxable_inr)}
                            </td>
                            <td className="text-end">{inr(r.output_igst_inr)}</td>
                            <td className="text-end">
                              {inr(r.input_taxable_inr)}
                            </td>
                            <td className="text-end">{inr(r.input_igst_inr)}</td>
                            <td className="text-end">{inr(r.input_cgst_inr)}</td>
                            <td className="text-end">{inr(r.input_sgst_inr)}</td>
                            {showUnclassified ? (
                              <td className="text-end">
                                {inr(r.input_unclassified_inr)}
                              </td>
                            ) : null}
                            <td className="text-end">{inr(r.input_total_inr)}</td>
                            <td
                              className={`text-end fw-semibold ${
                                Number(r.net_itc_inr) < 0 ? "text-danger" : ""
                              }`}
                            >
                              {inr(r.net_itc_inr)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {rows.length > 0 ? (
                      <tfoot className="table-light">
                        <tr className="fw-bolder">
                          <td>{t("TOTAL")}</td>
                          <td className="text-end">
                            {inr(totals.output_taxable_inr)}
                          </td>
                          <td className="text-end">
                            {inr(totals.output_igst_inr)}
                          </td>
                          <td className="text-end">
                            {inr(totals.input_taxable_inr)}
                          </td>
                          <td className="text-end">{inr(totals.input_igst_inr)}</td>
                          <td className="text-end">{inr(totals.input_cgst_inr)}</td>
                          <td className="text-end">{inr(totals.input_sgst_inr)}</td>
                          {showUnclassified ? (
                            <td className="text-end">
                              {inr(totals.input_unclassified_inr)}
                            </td>
                          ) : null}
                          <td className="text-end">{inr(totals.input_total_inr)}</td>
                          <td
                            className={`text-end ${
                              Number(totals.net_itc_inr) < 0 ? "text-danger" : ""
                            }`}
                          >
                            {inr(totals.net_itc_inr)}
                          </td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </Table>
                </div>
                {rows.length > 0 ? (
                  <div className="text-muted small mt-1">
                    {t(
                      "Net ITC = Input Total − Output IGST. Positive means GST is refundable to you, not payable."
                    )}
                  </div>
                ) : null}

                {/* Where every number comes from, stated on the report itself
                    — the client could not tell what the purchase amount was
                    derived from. Click any month for the document list. */}
                {rows.length > 0 ? (
                  <div className="border rounded p-1 mt-1 small text-muted">
                    <div className="fw-semibold text-dark mb-25">
                      {t("How these values are derived")}
                    </div>
                    <div>
                      <strong>{t("Purchase Taxable + Input GST")}</strong>{" "}
                      {t(
                        "— from Vendor POs (goods + vendor charges, excluding GST). Only status Dispatched or Closed; drafts and cancelled are excluded. Dated by dispatch date, or the created date when a POV was never dispatch-dated. IGST vs CGST/SGST is decided by the vendor's state against your company's."
                      )}
                    </div>
                    <div className="mt-25">
                      <strong>{t("Sales Taxable + Output IGST")}</strong>{" "}
                      {t(
                        "— from invoice lines on invoices whose GST route is 'IGST paid'. Drafts and cancelled are excluded. Dated by invoice date."
                      )}
                    </div>
                    <div className="mt-25">
                      {t(
                        "Click any month to see the exact Vendor POs and invoices behind its figures."
                      )}
                    </div>
                  </div>
                ) : null}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      {/* Month drill-down — the documents each figure is made of. Right-side
          drawer (the app's pattern for read-only detail), widened because the
          purchase table carries 8 columns. */}
      <Offcanvas
        direction="end"
        isOpen={!!breakdownMonth}
        toggle={() => setBreakdownMonth(null)}
        style={{ width: "min(1100px, 95vw)" }}
      >
        <OffcanvasHeader toggle={() => setBreakdownMonth(null)}>
          {t("Where these figures come from")}
          {breakdown?.month_label ? ` · ${breakdown.month_label}` : ""}
        </OffcanvasHeader>
        <OffcanvasBody>
          {breakdownLoading ? (
            <div className="text-center py-3">
              <Spinner size="sm" /> {t("Loading…")}
            </div>
          ) : (
            <Fragment>
              <h6 className="mb-1">
                {t("Purchases — Vendor POs behind the Input GST")}
              </h6>
              <div className="table-responsive mb-2">
                <Table bordered size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t("Vendor PO")}</th>
                      <th>{t("Vendor")}</th>
                      <th>{t("State")}</th>
                      <th>{t("Status")}</th>
                      <th>{t("Date")}</th>
                      <th className="text-end">{t("Taxable (₹)")}</th>
                      <th className="text-end">{t("GST (₹)")}</th>
                      <th>{t("Split")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseMeta.total === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-2">
                          {t("No vendor POs in this month")}
                        </td>
                      </tr>
                    ) : (
                      purchaseMeta.rows.map((p) => (
                        <tr key={p.po_vendor_id}>
                          <td className="text-nowrap">{p.voucher_no}</td>
                          <td>{p.vendor_name}</td>
                          <td className="text-nowrap">
                            {p.vendor_state || (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-capitalize">{p.status}</td>
                          <td className="text-nowrap">{ddmmyyyy(p.date)}</td>
                          <td className="text-end">{inr(p.taxable_inr)}</td>
                          <td className="text-end">{inr(p.gst_inr)}</td>
                          <td>
                            <Badge
                              className={`doc-badge ${
                                p.gst_split === "unclassified"
                                  ? "doc-badge-orange"
                                  : p.gst_split === "none"
                                    ? "doc-badge-gray"
                                    : "doc-badge-green"
                              }`}
                            >
                              {p.gst_split === "cgst_sgst"
                                ? "CGST/SGST"
                                : p.gst_split === "igst"
                                  ? "IGST"
                                  : p.gst_split === "none"
                                    ? t("No GST")
                                    : t("Unclassified")}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              <Pager
                meta={purchaseMeta}
                size={purchaseSize}
                onSize={setPurchaseSize}
                onPage={setPurchasePage}
                label={t("Vendor POs")}
              />

              <h6 className="mb-1 mt-2">
                {t("Sales — invoices behind the Output IGST")}
              </h6>
              <div className="table-responsive">
                <Table bordered size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t("Invoice")}</th>
                      <th>{t("Customer")}</th>
                      <th>{t("Status")}</th>
                      <th>{t("Date")}</th>
                      <th>{t("GST Route")}</th>
                      <th className="text-end">{t("Taxable (₹)")}</th>
                      <th className="text-end">{t("Output IGST (₹)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesMeta.total === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-2">
                          {t("No invoices in this month")}
                        </td>
                      </tr>
                    ) : (
                      salesMeta.rows.map((s) => (
                        <tr key={s.invoice_id}>
                          <td className="text-nowrap">{s.voucher_no}</td>
                          <td>{s.customer_name}</td>
                          <td className="text-capitalize">
                            {String(s.status).replace(/_/g, " ")}
                          </td>
                          <td className="text-nowrap">
                            {ddmmyyyy(s.invoice_date)}
                          </td>
                          <td className="text-uppercase">
                            {String(s.gst_route || "").replace(/_/g, " ")}
                          </td>
                          <td className="text-end">{inr(s.taxable_inr)}</td>
                          <td className="text-end">{inr(s.igst_inr)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              <Pager
                meta={salesMeta}
                size={salesSize}
                onSize={setSalesSize}
                onPage={setSalesPage}
                label={t("Invoices")}
              />

              <div className="text-muted small mt-2">
                {t(
                  "Taxable excludes GST. A Vendor PO's taxable value is its goods plus vendor charges; only Dispatched and Closed POVs are counted, dated by dispatch date."
                )}
              </div>
            </Fragment>
          )}
        </OffcanvasBody>
      </Offcanvas>
    </Fragment>
  );
};

export default GstBalance;
