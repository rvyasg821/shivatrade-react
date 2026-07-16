// Reusable party-ledger (bank-statement) view for the Customer (#9) and
// Vendor (#10) detail pages. Date · Particulars · Voucher · DR · CR · running
// Balance, with a from–to filter, totals footer and Excel export. Read-only.

import { Fragment, useCallback, useEffect, useState } from "react";
import { Row, Col, Button, Table, Spinner } from "reactstrap";
import { Download } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import { currencySymbol } from "@src/views/_shared/sales-doc/_helpers";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// Display dates as DD-MM-YYYY (backend sends YYYY-MM-DD for correct sorting).
const fmtDate = (d) => {
  const s = String(d || "").slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}-${m}-${y}` : s || "-";
};

// kind: "customer" | "vendor"
const LedgerStatement = ({ kind, partyId }) => {
  const { t } = useTranslation();
  const base =
    kind === "vendor" ? API_ENDPOINTS.ledger.vendor : API_ENDPOINTS.ledger.customer;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    if (!partyId) return;
    setLoading(true);
    instance
      .get(`${base}/${partyId}`, {
        params: { from: from || undefined, to: to || undefined },
      })
      .then((r) => setData(r?.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [base, partyId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    if (!partyId) return;
    setExporting(true);
    try {
      const resp = await instance.get(`${base}/${partyId}/export`, {
        params: { from: from || undefined, to: to || undefined },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-ledger.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      Notification(t("Error"), t("Export failed"), "warning");
    } finally {
      setExporting(false);
    }
  };

  const ccy = data?.currency_code || "";
  const sym = currencySymbol(ccy);
  const money = (v) => `${sym}${fmt(v)}`;
  const rows = data?.rows || [];

  return (
    <Fragment>
      <Row className="align-items-end g-1 mb-1">
        <Col sm="4" md="3">
          <label className="form-label small mb-25">{t("From")}</label>
          <DateInput id="ledger-from" value={from} onChange={(_d, _s, iso) => setFrom(iso || "")} />
        </Col>
        <Col sm="4" md="3">
          <label className="form-label small mb-25">{t("To")}</label>
          <DateInput id="ledger-to" value={to} onChange={(_d, _s, iso) => setTo(iso || "")} />
        </Col>
        <Col sm="4" md="6" className="text-end">
          <span className="me-1 text-muted small">
            {t("Currency")}: <strong>{ccy || "—"}</strong>
          </span>
          <Button
            color="outline-primary"
            size="sm"
            onClick={handleExport}
            disabled={exporting || !rows.length}
          >
            <Download size={14} className="me-50" />
            {exporting ? t("Exporting…") : t("Export")}
          </Button>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 100 }}>{t("Date")}</th>
              <th>{t("Particulars")}</th>
              <th style={{ width: 190, whiteSpace: "nowrap" }}>{t("Voucher")}</th>
              <th className="text-end" style={{ width: 120 }}>{t("Debit")}</th>
              <th className="text-end" style={{ width: 120 }}>{t("Credit")}</th>
              <th className="text-end" style={{ width: 130 }}>{t("Balance")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-3">
                  <Spinner size="sm" /> {t("Loading…")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-3">
                  {t("No ledger entries.")}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td>{fmtDate(r.date)}</td>
                  <td>{r.particulars}</td>
                  <td className="small text-muted text-nowrap">
                    {r.voucher_no || "-"}
                  </td>
                  <td className="text-end">{r.dr ? money(r.dr) : "-"}</td>
                  <td className="text-end">{r.cr ? money(r.cr) : "-"}</td>
                  <td className="text-end fw-semibold">{money(r.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="table-light">
              <tr>
                <td colSpan={3} className="text-end fw-bold">
                  {t("Total")}
                </td>
                <td className="text-end fw-bold">{money(data?.total_dr)}</td>
                <td className="text-end fw-bold">{money(data?.total_cr)}</td>
                <td className="text-end fw-bold">
                  {money(data?.balance)} {ccy}
                </td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>
      {rows.length > 0 && (
        <div className="text-muted small mt-1">
          {kind === "customer"
            ? t("Balance is the amount receivable from this customer.")
            : t("Balance is the amount payable to this vendor.")}
        </div>
      )}
    </Fragment>
  );
};

export default LedgerStatement;
