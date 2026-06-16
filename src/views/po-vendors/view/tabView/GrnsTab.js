// GRNs raised against this POV. Lists the receipt documents (one per
// delivery) with status; row links to the GRN page. A "Create GRN" action
// is published to the tab bar while the POV is dispatched with qty pending.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Link } from "react-router-dom";
import { Plus, ExternalLink } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { createGrnFromPov } from "@src/views/grn/store";
import Notification from "@components/toast/notification";

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
  const [creating, setCreating] = useState(false);

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
      Notification("Error", err?.message || t("Could not create GRN."), "warning");
    } finally {
      setCreating(false);
    }
  }, [dispatch, id, navigate, t]);

  // Publish Create GRN to the tab bar while dispatched.
  useEffect(() => {
    if (!registerActions) return undefined;
    registerActions(
      status === "dispatched" ? (
        <Button
          color="primary"
          size="sm"
          onClick={onCreateGrn}
          disabled={creating}
        >
          <Plus size={14} className="me-50" /> {t("Create GRN")}
        </Button>
      ) : null
    );
    return () => registerActions(null);
  }, [registerActions, status, creating, onCreateGrn, t]);

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
