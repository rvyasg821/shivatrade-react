// GRNs raised against this POV. Lists the receipt documents (one per
// delivery) with status; row links to the GRN page and offers a per-row
// PDF download. A "Create GRN" action is published to the tab bar (top-right)
// while the POV is dispatched and no active GRN exists yet.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { ExternalLink, Download, Plus, CornerUpLeft } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { createGrnFromPov } from "@src/views/grn/store";
import { createDebitNoteFromGrn } from "@src/views/debit-notes/store";
import Notification from "@components/toast/notification";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const STATUS_COLOR = {
  draft: "#6c757d",
  confirmed: "#28a745",
  cancelled: "#ea5455",
};

const GrnsTab = ({ registerActions }) => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const status = (poVendorItem?.status || "").toLowerCase();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [creatingDnId, setCreatingDnId] = useState(null);

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

  // A GRN already raised (cancelled ones don't count) hides the create action.
  const hasActiveGrn = rows.some(
    (g) => (g?.status || "").toLowerCase() !== "cancelled"
  );

  const onCreateGrn = useCallback(async () => {
    setCreating(true);
    try {
      const res = await dispatch(createGrnFromPov({ povId: id })).unwrap();
      const newId = res?.grnItem?._id;
      if (newId) navigate(`${appsRoot}/grn/view/${newId}`);
      else
        Notification(
          "Error",
          res?.error || t("Could not create GRN."),
          "warning"
        );
    } catch (err) {
      Notification(
        "Error",
        err?.message || t("Could not create GRN."),
        "warning"
      );
    } finally {
      setCreating(false);
    }
  }, [dispatch, id, navigate, t]);

  // Publish "Create GRN" to the tab bar (top-right) while dispatched with no
  // active GRN. tabView renders nothing when this is null → no white space.
  useEffect(() => {
    if (!registerActions) return undefined;
    registerActions(
      status === "dispatched" && !hasActiveGrn ? (
        <Button
          color="primary"
          size="sm"
          onClick={onCreateGrn}
          disabled={creating}
        >
          {creating ? (
            <Spinner size="sm" className="me-50" />
          ) : (
            <Plus size={14} className="me-50" />
          )}
          {t("Create GRN")}
        </Button>
      ) : null
    );
    return () => registerActions(null);
  }, [registerActions, status, hasActiveGrn, creating, onCreateGrn, t]);

  // Create a Debit Note from a confirmed GRN (one per GRN) and open it.
  const createDn = async (g) => {
    if (!g?._id || creatingDnId) return;
    setCreatingDnId(g._id);
    try {
      const res = await dispatch(
        createDebitNoteFromGrn({ grnId: g._id, data: {} })
      ).unwrap();
      const newId = res?.debitNoteItem?._id;
      if (newId) navigate(`${appsRoot}/debit-notes/view/${newId}`);
      else
        Notification(
          "Error",
          res?.error || t("Could not create Debit Note."),
          "warning"
        );
    } catch (err) {
      Notification(
        "Error",
        err?.message || t("Could not create Debit Note."),
        "warning"
      );
    } finally {
      setCreatingDnId(null);
    }
  };

  // Open a GRN's PDF inline in a new tab (proper name) via a short-lived
  // ticket on the no-auth public route — a blob tab is named by its UUID.
  const downloadGrnPdf = async (g) => {
    if (!g?._id || downloadingId) return;
    setDownloadingId(g._id);
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.grn.pdf}/${g._id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.grn.ticketPdf
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
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 200 }}>{t("GRN")}</th>
              <th style={{ width: 140 }}>{t("Date")}</th>
              <th style={{ width: 90 }} className="text-end">
                {t("Lines")}
              </th>
              <th style={{ width: 130 }} className="text-center">
                {t("Status")}
              </th>
              <th style={{ width: 220 }} className="text-center">
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
                  <td>
                    <Link
                      to={`${appsRoot}/grn/view/${g._id}`}
                      className="fw-bold d-inline-flex align-items-center"
                      ref={(el) =>
                        el &&
                        el.style.setProperty("color", "#09418B", "important")
                      }
                    >
                      {g.voucher_no || "-"}
                      <ExternalLink size={12} className="ms-25" />
                    </Link>
                  </td>
                  <td>{g.grn_date ? formatDate(g.grn_date) : "-"}</td>
                  <td className="text-end">{g.line_count ?? "-"}</td>
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
                          color="warning"
                          size="sm"
                          outline
                          onClick={() =>
                            navigate(
                              `${appsRoot}/debit-notes/view/${g.debit_note_id}`
                            )
                          }
                        >
                          <CornerUpLeft size={13} className="me-25" />
                          {t("Debit Note")}
                        </Button>
                      ) : g.status === "confirmed" &&
                        num(g.rejected_qty) > 0 ? (
                        <Button
                          color="warning"
                          size="sm"
                          title={t("Create Debit Note for rejected goods")}
                          disabled={creatingDnId === g._id}
                          onClick={() => createDn(g)}
                        >
                          {creatingDnId === g._id ? (
                            <Spinner size="sm" className="me-25" />
                          ) : (
                            <CornerUpLeft size={13} className="me-25" />
                          )}
                          {t("Debit Note")}
                        </Button>
                      ) : null}
                      <Button
                        color="flat-secondary"
                        size="sm"
                        className="p-25"
                        title={t("Download PDF")}
                        disabled={downloadingId === g._id}
                        onClick={() => downloadGrnPdf(g)}
                      >
                        {downloadingId === g._id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Download size={15} />
                        )}
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
