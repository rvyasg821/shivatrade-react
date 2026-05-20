// PO Coverage roll-up + POV chain. Used inside the tabs of the PO detail page.
// Owns its own fetch (live coverage + POV list). Two render targets:
//   - `view="coverage"` → coverage table only
//   - `view="vendors"`  → POV chain only
// A shared cache via React state would be ideal but the data is small and
// each tab mounts only when opened, so the cost is negligible.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Table,
  Button,
  UncontrolledTooltip,
  Spinner,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { ExternalLink, AlertTriangle, Plus } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";
import PoVendorCreateModal from "@src/views/_shared/po-vendor/PoVendorCreateModal";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export const usePoCoverage = () => {
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const po = purchaseOrderItem || {};
  const poId = po?._id;

  const [coverage, setCoverage] = useState(null);
  const [povs, setPovs] = useState([]);
  const [loading, setLoading] = useState(false);

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
    } catch (_err) {
      setCoverage(null);
      setPovs([]);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  return { po, coverage, povs, loading, reload: load };
};

export const PoCoveragePanel = ({ data }) => {
  const { t } = useTranslation();
  const { po, coverage, povs, loading, reload } = data;
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const poStatus = (po?.status || "").toLowerCase();

  const isAdmin = isAdminUser(authUserItem);
  const povPerms = authUserItem?.role?.permissions?.["po-vendors"];
  const canCreatePov = isAdmin || povPerms?.can_all || povPerms?.can_add;

  const [createOpen, setCreateOpen] = useState(false);

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

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="text-muted small">
          {t("Live qty roll-up across all POVs spawned from this PO.")}
        </div>
        {canCreatePov && (
          <div>
            {canCreate ? (
              <Fragment>
                <Button
                  color="success"
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  id="po-create-pov"
                >
                  <Plus size={14} className="me-50" /> {t("Create POV")}
                </Button>
                <UncontrolledTooltip target="po-create-pov" placement="top">
                  {t(
                    "Open a new POV against this PO to track vendor dispatch"
                  )}
                </UncontrolledTooltip>
              </Fragment>
            ) : (
              <Fragment>
                <Button
                  color="success"
                  size="sm"
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

      {loading && !coverage ? (
        <div className="text-center py-3">
          <Spinner />{" "}
          <span className="ms-2">{t("Loading coverage…")}</span>
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
                {t("Covered")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Dispatched")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Received")}
              </th>
              <th style={{ width: 90 }} className="text-end text-warning">
                {t("Lost")}
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
                    <div className="small text-muted">HSN: {l.hsn_code}</div>
                  )}
                </td>
                <td>{l?.unit || "-"}</td>
                <td className="text-end">
                  {num(l.ordered).toLocaleString()}
                </td>
                <td className="text-end">
                  {num(l.covered).toLocaleString()}
                </td>
                <td className="text-end">
                  {num(l.dispatched).toLocaleString()}
                </td>
                <td className="text-end">
                  {num(l.received).toLocaleString()}
                </td>
                <td className="text-end text-warning">
                  {num(l.lost) > 0 ? num(l.lost).toLocaleString() : "-"}
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
                {num(coverage.totals.covered).toLocaleString()}
              </td>
              <td className="text-end fw-bold">
                {num(coverage.totals.dispatched).toLocaleString()}
              </td>
              <td className="text-end fw-bold">
                {num(coverage.totals.received).toLocaleString()}
              </td>
              <td className="text-end fw-bold text-warning">
                {num(coverage.totals.lost).toLocaleString()}
              </td>
              <td className="text-end fw-bold">
                {num(coverage.totals.pending).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </Table>
      )}

      <PoVendorCreateModal
        isOpen={createOpen}
        toggle={() => {
          setCreateOpen((s) => !s);
          if (createOpen) reload();
        }}
        purchaseOrder={po}
      />
    </Fragment>
  );
};

export const PoVendorsPanel = ({ data }) => {
  const { t } = useTranslation();
  const { povs, loading } = data;

  const orderedPovs = useMemo(() => {
    if (!povs.length) return [];
    const byId = new Map(povs.map((p) => [p._id, p]));
    const result = [];
    const placed = new Set();
    const visit = (p, depth) => {
      if (placed.has(p._id)) return;
      placed.add(p._id);
      result.push({ ...p, _depth: depth });
      povs
        .filter((c) => c.parent_po_vendor_id === p._id)
        .forEach((c) => visit(c, depth + 1));
    };
    povs
      .filter(
        (p) => !p.parent_po_vendor_id || !byId.has(p.parent_po_vendor_id)
      )
      .forEach((p) => visit(p, 0));
    povs.forEach((p) => {
      if (!placed.has(p._id)) visit(p, 0);
    });
    return result;
  }, [povs]);

  const summarizeQty = (lines = []) => {
    const ordered = lines.reduce((s, l) => s + num(l.ordered_qty), 0);
    const dispatched = lines.reduce((s, l) => s + num(l.dispatched_qty), 0);
    const received = lines.reduce((s, l) => s + num(l.received_qty), 0);
    return { ordered, dispatched, received };
  };

  if (loading && orderedPovs.length === 0) {
    return (
      <div className="text-center py-3">
        <Spinner />
      </div>
    );
  }

  if (orderedPovs.length === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No POVs created against this PO yet.")}
      </div>
    );
  }

  return (
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
          const { ordered, dispatched, received } = summarizeQty(p?.lines || []);
          const color =
            PO_VENDOR_STATUS_BADGE_COLOR[p?.status] || "secondary";
          return (
            <tr key={p._id}>
              <td>
                <span
                  style={{ paddingLeft: `${(p._depth || 0) * 20}px` }}
                >
                  {p._depth > 0 && (
                    <span className="text-muted me-50">↳</span>
                  )}
                  <Link
                    to={`${appsRoot}/po-vendors/view/${p._id}`}
                    className="fw-bold"
                  >
                    {p.voucher_no}
                  </Link>
                </span>
              </td>
              <td>
                <Badge
                  color={`light-${color}`}
                  className={`badge-light-${color} text-capitalize`}
                >
                  {p.status}
                </Badge>
              </td>
              <td>{p.dispatch_date ? formatDate(p.dispatch_date) : "-"}</td>
              <td>
                {p.actual_arrival_date
                  ? formatDate(p.actual_arrival_date)
                  : p.expected_arrival_date
                  ? formatDate(p.expected_arrival_date)
                  : "-"}
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
  );
};
