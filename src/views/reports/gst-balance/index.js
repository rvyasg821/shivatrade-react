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
  Button,
  Table,
  Spinner,
} from "reactstrap";
import { Download, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { getGstBalance, cleanGstBalanceMessage } from "./store";

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

  const rows = store?.rows || [];
  const totals = store?.totals || {};
  // Noise on clean data — only surface the column when something landed there.
  const showUnclassified = Number(totals.input_unclassified_inr || 0) > 0;
  const colCount = showUnclassified ? 8 : 7;

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
                        <th className="text-end">{t("Output IGST (₹)")}</th>
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
                            <td className="text-nowrap">{r.month_label}</td>
                            <td className="text-end">{inr(r.output_igst_inr)}</td>
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
                            {inr(totals.output_igst_inr)}
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
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default GstBalance;
