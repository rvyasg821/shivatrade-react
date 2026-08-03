// PO detail → Vendor Tracking tab. Shows live coverage roll-up, the
// chain of POVs for this PO, and a "Create POV" entry button.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Table,
  Button,
  UncontrolledTooltip,
  Spinner,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Truck, ExternalLink, AlertTriangle, Plus } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";
import PoVendorCreateModal from "@src/views/_shared/po-vendor/PoVendorCreateModal";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const VendorTrackingTab = () => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const po = purchaseOrderItem || {};
  const poId = po?._id;
  const poStatus = (po?.status || "").toLowerCase();

  // POV permission gate — controls visibility of the "Create POV" CTA.
  const isAdmin = isAdminUser(authUserItem);
  const povPerms = authUserItem?.role?.permissions?.["po-vendors"];
  const canCreatePov = isAdmin || povPerms?.can_all || povPerms?.can_add;

  const [coverage, setCoverage] = useState(null);
  const [povs, setPovs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const [covResp, listResp] = await Promise.all([
        instance.get(
          `${API_ENDPOINTS.purchaseOrders.coverage}/${poId}/coverage`
        ),
        instance.get(API_ENDPOINTS.poVendors.list, {
          params: {
            purchase_order_id: poId,
            page: 1,
            perPage: 200,
            orderBy: "createdAt",
            orderDirection: "asc",
          },
        }),
      ]);
      setCoverage(covResp?.data?.data || null);
      setPovs(listResp?.data?.data || []);
    } catch (err) {
      setCoverage(null);
      setPovs([]);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  // Flat-siblings model — all POVs are peers. Show in creation order.
  const orderedPovs = useMemo(() => {
    if (!povs.length) return [];
    return [...povs].sort((a, b) =>
      String(a.createdAt || a.voucher_no || "").localeCompare(
        String(b.createdAt || b.voucher_no || "")
      )
    );
  }, [povs]);

  const canCreate =
    canCreatePov &&
    coverage?.has_pending &&
    (poStatus === "confirmed" || poStatus === "in_process");

  const disabledReason = useMemo(() => {
    if (!coverage) return t("Loading coverage…");
    if (!(poStatus === "confirmed" || poStatus === "in_process"))
      return t("PO must be in 'confirmed' or 'in_process' status.");
    if (!coverage?.has_pending)
      return t("All quantities are already covered by existing POVs.");
    return null;
  }, [coverage, poStatus, t]);

  const summarizeQty = (lines = []) => {
    const ordered = lines.reduce((s, l) => s + num(l.ordered_qty), 0);
    const dispatched = lines.reduce((s, l) => s + num(l.dispatched_qty), 0);
    const received = lines.reduce((s, l) => s + num(l.received_qty), 0);
    return { ordered, dispatched, received };
  };

  return (
    <Fragment>
      {/* Coverage roll-up */}
      <Card className="mb-2">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">{t("PO Coverage")}</h4>
            {/* "Create POV" CTA — hidden entirely for users without
                po-vendors.can_add permission. */}
            {canCreatePov && (
              <div>
                {canCreate ? (
                  <Fragment>
                    <Button
                      color="success"
                      onClick={() => setCreateOpen(true)}
                      id="po-create-pov"
                    >
                      <Plus size={14} className="me-50" /> {t("Create POV")}
                    </Button>
                    <UncontrolledTooltip
                      target="po-create-pov"
                      placement="top"
                    >
                      {t(
                        "Open a new POV against this PO to track vendor dispatch"
                      )}
                    </UncontrolledTooltip>
                  </Fragment>
                ) : (
                  <Fragment>
                    <Button
                      color="success"
                      disabled
                      id="po-create-pov-disabled"
                    >
                      <Plus size={14} className="me-50" /> {t("Create POV")}
                    </Button>
                    <UncontrolledTooltip
                      target="po-create-pov-disabled"
                      placement="top"
                    >
                      {disabledReason}
                    </UncontrolledTooltip>
                  </Fragment>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-3">
              <Spinner /> <span className="ms-2">{t("Loading coverage…")}</span>
            </div>
          ) : !coverage ? (
            <div className="alert alert-warning small mb-0">
              <AlertTriangle size={14} className="me-1" />
              {t("Could not load coverage for this PO.")}
            </div>
          ) : (
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>{t("Product")}</th>
                  <th style={{ width: 70 }}>{t("Unit")}</th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Ordered")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Dispatched")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Received")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Pending")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {coverage.lines.map((l, idx) => (
                  <tr key={l.purchase_order_line_id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{l?.product_name || "-"}</div>
                      {l?.product_code && (
                        <small className="text-muted">{l.product_code}</small>
                      )}
                      {l?.hsn_code && (
                        <div className="small text-muted">
                          HSN: {l.hsn_code}
                        </div>
                      )}
                    </td>
                    <td>{l?.unit || "-"}</td>
                    <td className="text-end">
                      {num(l.ordered).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l.dispatched).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l.received).toLocaleString()}
                    </td>
                    <td className="text-end fw-bold">
                      {num(l.pending).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-light">
                  <td colSpan="3" className="text-end fw-bold">
                    {t("Totals")}
                  </td>
                  <td className="text-end fw-bold">
                    {num(coverage.totals.ordered).toLocaleString()}
                  </td>
                  <td className="text-end fw-bold">
                    {num(coverage.totals.dispatched).toLocaleString()}
                  </td>
                  <td className="text-end fw-bold">
                    {num(coverage.totals.received).toLocaleString()}
                  </td>
                  <td className="text-end fw-bold">
                    {num(coverage.totals.pending).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* POV list — chain order (parent → child indented) */}
      <Card>
        <CardBody>
          <h4 className="mb-2">
            {t("Vendor POs")}{" "}
            <small className="text-muted">({orderedPovs.length})</small>
          </h4>
          {loading ? null : orderedPovs.length === 0 ? (
            <div className="text-muted py-3 text-center">
              {t("No POVs created against this PO yet.")}
            </div>
          ) : (
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t("POV #")}</th>
                  <th style={{ width: 130 }}>{t("Status")}</th>
                  <th style={{ width: 120 }}>{t("Dispatch Date")}</th>
                  <th style={{ width: 120 }}>{t("Arrival")}</th>
                  <th style={{ width: 240 }} className="text-end">
                    {t("Qty Summary")}
                  </th>
                  <th style={{ width: 70 }} className="text-center">
                    {t("Open")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedPovs.map((p) => {
                  const { ordered, dispatched, received } = summarizeQty(
                    p?.lines || []
                  );
                  const color =
                    PO_VENDOR_STATUS_BADGE_COLOR[p?.status] || "secondary";
                  return (
                    <tr key={p._id}>
                      <td>
                        <Link
                          to={`${appsRoot}/po-vendors/view/${p._id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="fw-bold"
                        >
                          {p.voucher_no}
                        </Link>
                        {String(p.purchase_order_id || "") !== String(poId) ? (
                          <Badge
                            className="doc-badge doc-badge-gray ms-50"
                            title={t(
                              "Linked for reference — does not cover this SO"
                            )}
                          >
                            {t("Linked")}
                          </Badge>
                        ) : null}
                      </td>
                      <td>
                        <Badge
                          color={`light-${color}`}
                          className={`badge-light-${color} text-capitalize`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td>{(p.dispatch_date || "").slice(0, 10) || "-"}</td>
                      <td>
                        {(p.actual_arrival_date || "").slice(0, 10) ||
                          (p.expected_arrival_date || "").slice(0, 10) ||
                          "-"}
                      </td>
                      <td className="text-end small">
                        <div>
                          {t("Ordered")}: <b>{ordered.toLocaleString()}</b>
                        </div>
                        <div>
                          {t("Dispatched")}: {dispatched.toLocaleString()}
                        </div>
                        <div>
                          {t("Received")}: {received.toLocaleString()}
                        </div>
                      </td>
                      <td className="text-center">
                        <Link
                          to={`${appsRoot}/po-vendors/view/${p._id}`}
                          target="_blank"
                          rel="noreferrer"
                          id={`pov-open-${p._id}`}
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <UncontrolledTooltip
                          target={`pov-open-${p._id}`}
                          placement="top"
                        >
                          {t("Open POV detail")}
                        </UncontrolledTooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <PoVendorCreateModal
        isOpen={createOpen}
        toggle={() => {
          setCreateOpen((s) => !s);
          // After modal closes, refresh coverage + chain so any new POV shows.
          if (createOpen) load();
        }}
        purchaseOrder={po}
      />
    </Fragment>
  );
};

export default VendorTrackingTab;
