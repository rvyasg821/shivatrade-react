// GRNs raised against this POV. Lists the receipt documents (one per
// delivery) with status; row links to the GRN page and offers a per-row
// PDF download. A "Create GRN" action is published to the tab bar (top-right)
// while the POV is dispatched and no active GRN exists yet.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Download,
  CornerUpLeft,
  Trash2,
  Inbox,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { deleteGrn, cleanGrnMessage } from "@src/views/grn/store";
import { getPoVendor } from "@src/views/po-vendors/store";
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

  const mySwal = withReactContent(Swal);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
  const canReceive =
    canUpdate && (poVendorItem?.status || "").toLowerCase() === "dispatched";

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

  // Delete a GRN (with confirm). The backend re-computes the POV's received
  // quantities; we then reload the list and refresh the POV detail so the
  // KPI strip / line items reflect the change immediately.
  const handleDelete = (g) => {
    if (!g?._id) return;
    mySwal
      .fire({
        title: t("Delete this GRN?"),
        text: t(
          "This removes the receipt and re-computes the Vendor PO quantities. This cannot be undone."
        ),
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
        setDeletingId(g._id);
        try {
          const r = await dispatch(deleteGrn(g._id)).unwrap();
          // Clear the slice message immediately so it doesn't linger and
          // re-toast later when a GRN detail page mounts (it shows store.success).
          dispatch(cleanGrnMessage());
          if (r?.actionFlag === "GRN_DLTD") {
            Notification("Success", r?.success || t("GRN deleted."), "success");
            load();
            if (id) dispatch(getPoVendor(id));
          } else {
            Notification(
              "Error",
              r?.error || t("Could not delete GRN."),
              "warning"
            );
          }
        } catch (err) {
          Notification(
            "Error",
            err?.message || t("Could not delete GRN."),
            "warning"
          );
        } finally {
          setDeletingId(null);
        }
      });
  };

  // Create a Debit Note from a confirmed GRN — opens a draft form (not
  // persisted until Save), like creating a GRN from a POV.
  const createDn = (g) => {
    if (!g?._id) return;
    navigate(`${appsRoot}/debit-notes/create/${g._id}`);
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
              <th style={{ minWidth: 220 }} className="text-nowrap">
                {t("GRN")}
              </th>
              <th style={{ width: 140 }}>{t("Date")}</th>
              <th style={{ width: 100 }} className="text-end">
                {t("Received")}
              </th>
              <th style={{ width: 100 }} className="text-end">
                {t("Rejected")}
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
                  <td>{g.grn_date ? formatDate(g.grn_date) : "-"}</td>
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
                        disabled={downloadingId === g._id}
                        onClick={() => downloadGrnPdf(g)}
                      >
                        {downloadingId === g._id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Download size={15} />
                        )}
                      </Button>
                      <Button
                        color="flat-danger"
                        size="sm"
                        className="p-25"
                        title={t("Delete GRN")}
                        disabled={deletingId === g._id}
                        onClick={() => handleDelete(g)}
                      >
                        {deletingId === g._id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 size={15} />
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
