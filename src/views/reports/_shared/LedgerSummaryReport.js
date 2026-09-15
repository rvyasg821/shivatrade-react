// Customer/Vendor Ledger Summary — one row per party: Opening / Debit /
// Credit / Closing for the selected period. "Opening" is the true balance
// carried forward from everything dated before the period start (not just
// the static migration figure the per-party Ledger page's own card shows).
// Clicking a row opens the EXISTING per-party <LedgerStatement> in a
// right-side drawer (same Offcanvas pattern as every other report's
// drill-down, e.g. Inventory Aging's BreakdownDrawer) — no new detail view,
// no new export for the drill-down; only this summary table + its own bulk
// export are new.
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Button,
  Table,
  Spinner,
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
} from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";
import ReportBackButton from "@src/views/reports/_shared/ReportBackButton";
import LedgerStatement from "@src/views/_shared/ledger/LedgerStatement";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const StatTile = ({ label, value }) => (
  <Col md="3" sm="6" className="mb-1">
    <Card className="mb-0 border">
      <CardBody className="py-1">
        <div className="text-muted small">{label}</div>
        <div className="fw-bolder" style={{ fontSize: "1.35rem" }}>
          {value}
        </div>
      </CardBody>
    </Card>
  </Col>
);

// kind: "customer" | "vendor"
// endpoints: { list, export }
const LedgerSummaryReport = ({ kind, title, endpoints }) => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ period_label: "", rows: [], totals: {} });
  const [drillDown, setDrillDown] = useState(null); // { partyId, partyName }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await instance.get(endpoints.list, {
        params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
      });
      const payload = resp?.data?.data || {};
      setData({
        period_label: payload.period_label || "",
        rows: payload.rows || [],
        totals: payload.totals || {},
      });
    } catch (e) {
      Notification("Error", t("There are no records to display"), "warning");
      setData({ period_label: "", rows: [], totals: {} });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, endpoints.list]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await instance.get(endpoints.export, {
        params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-ledger-summary.xlsx`;
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
  const pg = usePagination(rows.length);
  const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  return (
    <Fragment>
      <div className="main-content reports-ledger-summary">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t(title)}</h3>
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
            <ReportBackButton />
          </div>
        </div>

        <Row className="mb-1">
          <StatTile label={t("Parties")} value={rows.length} />
          <StatTile label={t("Opening (₹)")} value={`₹ ${grp(totals.opening_inr)}`} />
          <StatTile label={t("Debit (₹)")} value={`₹ ${grp(totals.debit_inr)}`} />
          <StatTile label={t("Credit (₹)")} value={`₹ ${grp(totals.credit_inr)}`} />
        </Row>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="lgs-from"
                  value={dateFrom}
                  onChange={(_d, _s, iso) => {
                    setDateFrom(iso || "");
                    pg.resetPage();
                  }}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="lgs-to"
                  value={dateTo}
                  onChange={(_d, _s, iso) => {
                    setDateTo(iso || "");
                    pg.resetPage();
                  }}
                  placeholder={t("YYYY-MM-DD")}
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
                    {t("No parties in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th className="text-nowrap">
                              {t(kind === "vendor" ? "Vendor" : "Customer")}
                            </th>
                            <th className="text-nowrap">{t("Currency")}</th>
                            <th className="text-end text-nowrap">{t("Opening")}</th>
                            <th className="text-end text-nowrap">{t("Debit")}</th>
                            <th className="text-end text-nowrap">{t("Credit")}</th>
                            <th className="text-end text-nowrap">{t("Closing")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((r) => (
                            <tr
                              key={r.party_id}
                              className="cursor-pointer"
                              onClick={() =>
                                setDrillDown({
                                  partyId: r.party_id,
                                  partyName: r.party_name,
                                })
                              }
                            >
                              <td className="text-primary fw-semibold">
                                {r.party_name}
                              </td>
                              <td>{r.currency_code}</td>
                              <td className="text-end text-nowrap">{grp(r.opening)}</td>
                              <td className="text-end text-nowrap">{grp(r.debit)}</td>
                              <td className="text-end text-nowrap">{grp(r.credit)}</td>
                              <td className="text-end text-nowrap fw-semibold">
                                {grp(r.closing)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="fw-bolder">
                            <td colSpan={2}>{t("TOTAL (INR)")}</td>
                            <td className="text-end text-nowrap">
                              {`₹ ${grp(totals.opening_inr)}`}
                            </td>
                            <td className="text-end text-nowrap">
                              {`₹ ${grp(totals.debit_inr)}`}
                            </td>
                            <td className="text-end text-nowrap">
                              {`₹ ${grp(totals.credit_inr)}`}
                            </td>
                            <td className="text-end text-nowrap">
                              {`₹ ${grp(totals.closing_inr)}`}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>

                    <TablePaginationBar {...pg} totalRows={rows.length} />
                  </Fragment>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <Offcanvas
        direction="end"
        isOpen={!!drillDown}
        toggle={() => setDrillDown(null)}
        style={{ width: "min(1600px, 100vw)" }}
      >
        <OffcanvasHeader toggle={() => setDrillDown(null)}>
          {drillDown?.partyName}
        </OffcanvasHeader>
        <OffcanvasBody>
          {drillDown ? (
            <LedgerStatement kind={kind} partyId={drillDown.partyId} />
          ) : null}
        </OffcanvasBody>
      </Offcanvas>
    </Fragment>
  );
};

export default LedgerSummaryReport;
