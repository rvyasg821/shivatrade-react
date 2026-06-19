// Debit Notes raised against this POV (vendor returns for QC-rejected goods).
// Read-only list — a Debit Note is created from a confirmed GRN (see the GRNs
// tab → open a GRN → "Create Debit Note"). Rows link to the Debit Note page.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { ExternalLink, Download, Trash2, CornerUpLeft } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import {
  deleteDebitNote,
  cleanDebitNoteMessage,
} from "@src/views/debit-notes/store";
import { getPoVendor } from "@src/views/po-vendors/store";
import Notification from "@components/toast/notification";

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
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // A confirmed GRN with rejected goods but no Debit Note yet — the "Create
  // Debit Note" action is published only when one exists.
  const [pendingGrn, setPendingGrn] = useState(null);

  // Open a Debit Note's PDF inline in a new tab via a short-lived ticket on
  // the no-auth public route — a blob tab is named by its UUID.
  const downloadPdf = async (d) => {
    if (!d?._id || downloadingId) return;
    setDownloadingId(d._id);
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.debitNotes.pdf}/${d._id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.debitNotes.ticketPdf
      }?t=${encodeURIComponent(ticket)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    } finally {
      setDownloadingId(null);
    }
  };

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

  // Delete a Debit Note (with confirm). Reloads the list and refreshes the POV
  // (so a re-deleted DN frees its GRN to raise a new one).
  const handleDelete = (d) => {
    if (!d?._id) return;
    mySwal
      .fire({
        title: t("Delete this Debit Note?"),
        text: t("This cannot be undone."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setDeletingId(d._id);
        try {
          const r = await dispatch(deleteDebitNote(d._id)).unwrap();
          // Clear the slice message so it doesn't re-toast later when a Debit
          // Note detail page mounts (it shows store.success).
          dispatch(cleanDebitNoteMessage());
          if (r?.actionFlag === "DN_DLTD") {
            Notification(
              "Success",
              r?.success || t("Debit Note deleted."),
              "success"
            );
            load();
            if (id) dispatch(getPoVendor(id));
          } else {
            Notification(
              "Error",
              r?.error || t("Could not delete Debit Note."),
              "warning"
            );
          }
        } catch (err) {
          Notification(
            "Error",
            err?.message || t("Could not delete Debit Note."),
            "warning"
          );
        } finally {
          setDeletingId(null);
        }
      });
  };

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
              <th style={{ width: 80 }} className="text-end">
                {t("Lines")}
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
                      className="fw-bold d-inline-flex align-items-center"
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
                  <td className="text-end">{d.line_count ?? "-"}</td>
                  <td className="text-end text-nowrap">
                    {fmtMoney(d.total_amount)}
                    {d.currency_code ? ` ${d.currency_code}` : ""}
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
                      disabled={downloadingId === d._id}
                      onClick={() => downloadPdf(d)}
                    >
                      {downloadingId === d._id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Download size={15} />
                      )}
                    </Button>
                    <Button
                      color="flat-danger"
                      size="sm"
                      className="p-25"
                      title={t("Delete Debit Note")}
                      disabled={deletingId === d._id}
                      onClick={() => handleDelete(d)}
                    >
                      {deletingId === d._id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 size={15} />
                      )}
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
