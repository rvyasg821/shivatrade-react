// Debit Notes raised against this POV (vendor returns for QC-rejected goods).
// Read-only list — a Debit Note is created from a confirmed GRN (see the GRNs
// tab → open a GRN → "Create Debit Note"). Rows link to the Debit Note page.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { ExternalLink, Download, CornerUpLeft } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { getCurrencySymbol } from "@src/utility/currency";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const STATUS_COLOR = {
  draft: "#6c757d",
  issued: "#28a745",
  cancelled: "#ea5455",
};

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
};

const DebitNotesTab = ({ registerActions }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // A confirmed GRN with rejected goods but no Debit Note yet — the "Create
  // Debit Note" action is published only when one exists.
  const [pendingGrn, setPendingGrn] = useState(null);

  // Open a Debit Note's PDF in the in-app viewer (new tab, frontend origin) —
  // fetched via the authed API, shown there, with a correctly-named Download.
  const downloadPdf = (d) =>
    openPdfViewer({ kind: "debit_note", id: d?._id, name: d?.voucher_no });

  // Load the Debit Note list AND the POV's GRNs together, then derive whether
  // a Debit Note is "necessary": a confirmed GRN with rejected qty that isn't
  // already covered by a (non-cancelled) Debit Note in the loaded list. Driving
  // the candidate off the same list the tab shows keeps the two consistent.
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [dnResp, grnResp] = await Promise.all([
        instance.get(API_ENDPOINTS.debitNotes.list, {
          params: {
            po_vendor_id: id,
            page: 1,
            perPage: 200,
            orderBy: "createdAt",
            orderDirection: "asc",
          },
        }),
        instance.get(API_ENDPOINTS.grn.list, {
          params: { po_vendor_id: id, page: 1, perPage: 200 },
        }),
      ]);
      const dnRows = dnResp?.data?.data || [];
      setRows(dnRows);

      // GRN vouchers already covered by a live Debit Note.
      const coveredGrns = new Set(
        dnRows
          .filter((d) => d.status !== "cancelled")
          .map((d) => d.grn_voucher_no)
          .filter(Boolean)
      );
      const grns = grnResp?.data?.data || [];
      const candidate = grns.find(
        (g) =>
          g.status === "confirmed" &&
          num(g.rejected_qty) > 0 &&
          !coveredGrns.has(g.voucher_no)
      );
      setPendingGrn(candidate || null);
    } catch (_err) {
      setRows([]);
      setPendingGrn(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Publish "Create Debit Note" to the tab bar's top-right only when a
  // confirmed GRN has rejected goods awaiting a Debit Note.
  useEffect(() => {
    if (!registerActions) return undefined;
    if (!pendingGrn) {
      registerActions(null);
      return () => registerActions(null);
    }
    registerActions(
      <Button
        color="warning"
        size="sm"
        onClick={() =>
          navigate(`${appsRoot}/debit-notes/create/${pendingGrn._id}`)
        }
        title={t("Create a Debit Note for the GRN's rejected goods")}
      >
        <CornerUpLeft size={14} className="me-50" /> {t("Create Debit Note")}
      </Button>
    );
    return () => registerActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGrn, registerActions]);

  if (loading && !rows.length) {
    return (
      <div className="text-center py-3">
        <Spinner />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-muted py-3 text-center">
        {pendingGrn
          ? t(
              "A confirmed GRN has rejected goods — use “Create Debit Note” (top-right) to raise one."
            )
          : t("No Debit Notes raised against this Vendor PO yet.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 200 }}>{t("Debit Note")}</th>
              <th style={{ width: 130 }}>{t("Date")}</th>
              <th style={{ width: 90 }} className="text-end">
                {t("Qty")}
              </th>
              <th style={{ width: 120 }} className="text-end">
                {t("Price")}
              </th>
              <th style={{ width: 140 }} className="text-end">
                {t("Amount")}
              </th>
              <th style={{ width: 120 }} className="text-center">
                {t("Status")}
              </th>
              <th style={{ width: 90 }} className="text-center">
                {t("Actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              const c = STATUS_COLOR[d?.status] || "#6c757d";
              return (
                <tr key={d._id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <Link
                      to={`${appsRoot}/debit-notes/view/${d._id}`}
                      className="fw-bold d-inline-flex align-items-center text-nowrap"
                      ref={(el) =>
                        el &&
                        el.style.setProperty("color", "#09418B", "important")
                      }
                    >
                      {d.voucher_no || "-"}
                      <ExternalLink size={12} className="ms-25" />
                    </Link>
                    {d.grn_voucher_no ? (
                      <div className="small text-muted">
                        {t("GRN")}: {d.grn_voucher_no}
                      </div>
                    ) : null}
                  </td>
                  <td>{d.dn_date ? formatDate(d.dn_date) : "-"}</td>
                  <td className="text-end text-nowrap">
                    {d.total_qty != null
                      ? num(d.total_qty).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </td>
                  <td className="text-end text-nowrap">
                    {d.unit_price != null && d.unit_price !== ""
                      ? `${getCurrencySymbol(d.currency_code) || ""}${fmtMoney(
                          d.unit_price
                        )}`
                      : "—"}
                  </td>
                  <td className="text-end text-nowrap">
                    {getCurrencySymbol(d.currency_code) || ""}
                    {fmtMoney(d.total_amount)}
                  </td>
                  <td className="text-center">
                    <span
                      className="badge rounded-pill text-capitalize"
                      ref={(el) => {
                        if (el) {
                          el.style.setProperty(
                            "background-color",
                            `${c}1f`,
                            "important"
                          );
                          el.style.setProperty("color", c, "important");
                        }
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <Button
                      color="flat-secondary"
                      size="sm"
                      className="p-25"
                      title={t("Download PDF")}
                      onClick={() => downloadPdf(d)}
                    >
                      <Download size={15} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </Fragment>
  );
};

export default DebitNotesTab;
