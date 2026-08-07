// GRNs raised against this POV. Lists the receipt documents (one per
// delivery) with status; row links to the GRN page and offers a per-row
// PDF download. A "Create GRN" action is published to the tab bar (top-right)
// while the POV is dispatched and no active GRN exists yet.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { ExternalLink, Download, CornerUpLeft, Inbox, FileText } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { openPdfViewer } from "@src/utility/pdf";
import { downloadExcel } from "@src/utility/excel";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { getCurrencySymbol } from "@src/utility/currency";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_COLOR = {
  draft: "#6c757d",
  confirmed: "#28a745",
  cancelled: "#ea5455",
};

const GrnsTab = ({ registerActions }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    instance
      .get(API_ENDPOINTS.grn.list, {
        params: { po_vendor_id: id, page: 1, perPage: 200, orderBy: "createdAt", orderDirection: "asc" },
      })
      .then((resp) => setRows(resp?.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Create GRN — published to the tab bar's top-right (compact), shown only
  // once the POV is dispatched. Opens a draft GRN form.
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authUserItem = useSelector((s) => s.auth?.authUserItem) || null;
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;
  // A POV line's `received_qty` already counts every non-cancelled GRN (drafts
  // included), so once the dispatch is fully receipted there is nothing left to
  // put on a second GRN — the backend rejects it, so hide the action.
  const hasPendingReceipt = (poVendorItem?.lines || []).some(
    (l) => Number(l?.dispatched_qty || 0) - Number(l?.received_qty || 0) > 1e-6
  );
  const canReceive =
    canUpdate &&
    (poVendorItem?.status || "").toLowerCase() === "dispatched" &&
    hasPendingReceipt;

  useEffect(() => {
    if (!registerActions) return undefined;
    if (!canReceive) {
      registerActions(null);
      return () => registerActions(null);
    }
    registerActions(
      <Button
        color="primary"
        size="sm"
        onClick={() => navigate(`${appsRoot}/grn/create/${id}`)}
      >
        <Inbox size={14} className="me-50" /> {t("Create GRN")}
      </Button>
    );
    return () => registerActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReceive, registerActions, id]);

  // Create a Debit Note from a confirmed GRN — opens a draft form (not
  // persisted until Save), like creating a GRN from a POV.
  const createDn = (g) => {
    if (!g?._id) return;
    navigate(`${appsRoot}/debit-notes/create/${g._id}`);
  };

  // Open a GRN's PDF in the in-app viewer (new tab, frontend origin) — fetched
  // via the authed API, shown there, with a correctly-named Download.
  const downloadGrnPdf = (g) =>
    openPdfViewer({ kind: "grn", id: g?._id, name: g?.voucher_no });
  const downloadGrnExcel = (g) =>
    downloadExcel({ kind: "grn", id: g?._id, name: g?.voucher_no });

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
        {t("No GRNs raised against this Vendor PO yet.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0 line-items-grid">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 220 }} className="text-nowrap">
                {t("GRN")}
              </th>
              <th style={{ width: 140 }} className="text-nowrap">
                {t("Date")}
              </th>
              <th style={{ width: 100 }} className="text-end">
                {t("Received")}
              </th>
              <th style={{ width: 100 }} className="text-end">
                {t("Rejected")}
              </th>
              <th style={{ width: 110 }} className="text-end text-nowrap">
                {t("Unit Price")}
              </th>
              <th style={{ width: 120 }} className="text-end">
                {t("Amount")}
              </th>
              <th style={{ width: 120 }} className="text-end">
                {t("GST")}
              </th>
              <th style={{ width: 130 }} className="text-end">
                {t("Total Amt")}
              </th>
              <th style={{ width: 130 }} className="text-center">
                {t("Status")}
              </th>
              <th style={{ width: 130 }} className="text-center">
                {t("Actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => {
              const c = STATUS_COLOR[g?.status] || "#6c757d";
              return (
                <tr key={g._id}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="text-nowrap">
                    <Link
                      to={`${appsRoot}/grn/view/${g._id}`}
                      className="fw-bold d-inline-flex align-items-center text-nowrap"
                      ref={(el) =>
                        el &&
                        el.style.setProperty("color", "#09418B", "important")
                      }
                    >
                      {g.voucher_no || "-"}
                      <ExternalLink size={12} className="ms-25" />
                    </Link>
                  </td>
                  <td className="text-nowrap">
                    {g.grn_date ? formatDate(g.grn_date) : "-"}
                  </td>
                  <td className="text-end">{num(g.received_qty).toFixed(2)}</td>
                  <td className="text-end">
                    {num(g.rejected_qty) > 0 ? (
                      <span className="text-danger fw-semibold">
                        {num(g.rejected_qty).toFixed(2)}
                      </span>
                    ) : (
                      num(g.rejected_qty).toFixed(2)
                    )}
                  </td>
                  <td className="text-end text-nowrap">
                    {g.unit_price != null && g.unit_price !== "" ? (
                      <>
                        {getCurrencySymbol(g.currency_code || "INR") || ""}
                        {money(g.unit_price)}
                      </>
                    ) : (
                      <span className="text-muted" title={t("Lines have different prices")}>
                        {t("Mixed")}
                      </span>
                    )}
                  </td>
                  <td className="text-end text-nowrap fw-semibold">
                    {getCurrencySymbol(g.currency_code || "INR") || ""}
                    {money(g.total_value)}
                  </td>
                  {/* Read-only GST = taxable × POV GST% (vendor currency). */}
                  <td className="text-end text-nowrap">
                    {getCurrencySymbol(g.currency_code || "INR") || ""}
                    {money(g.gst_value)}
                  </td>
                  {/* GST-inclusive total = Amount + GST. */}
                  <td className="text-end text-nowrap fw-semibold">
                    {getCurrencySymbol(g.currency_code || "INR") || ""}
                    {money(g.total_with_gst)}
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
                      {g.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="d-inline-flex align-items-center gap-1">
                      {g.has_debit_note && g.debit_note_id ? (
                        <Button
                          color="flat-warning"
                          size="sm"
                          className="p-25"
                          title={t("View Debit Note")}
                          onClick={() =>
                            navigate(
                              `${appsRoot}/debit-notes/view/${g.debit_note_id}`
                            )
                          }
                        >
                          <CornerUpLeft size={15} />
                        </Button>
                      ) : g.status === "confirmed" &&
                        num(g.rejected_qty) > 0 ? (
                        <Button
                          color="flat-warning"
                          size="sm"
                          className="p-25"
                          title={t("Create Debit Note for rejected goods")}
                          onClick={() => createDn(g)}
                        >
                          <CornerUpLeft size={15} />
                        </Button>
                      ) : null}
                      <Button
                        color="flat-secondary"
                        size="sm"
                        className="p-25"
                        title={t("Download PDF")}
                        onClick={() => downloadGrnPdf(g)}
                      >
                        <Download size={15} />
                      </Button>
                      <Button
                        color="flat-secondary"
                        size="sm"
                        className="p-25"
                        title={t("Download Excel")}
                        onClick={() => downloadGrnExcel(g)}
                      >
                        <FileText size={15} />
                      </Button>
                    </div>
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

export default GrnsTab;
