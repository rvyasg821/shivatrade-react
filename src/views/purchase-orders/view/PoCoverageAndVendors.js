// PO Coverage roll-up + POV chain. Used inside the tabs of the PO detail page.
// Owns its own fetch (live coverage + POV list). Two render targets:
//   - `view="coverage"` → coverage table only
//   - `view="vendors"`  → POV chain only
// A shared cache via React state would be ideal but the data is small and
// each tab mounts only when opened, so the cost is negligible.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Table,
  Button,
  UncontrolledTooltip,
  Spinner,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { ExternalLink, AlertTriangle, Plus, FileText } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";
import PoVendorRecoverModal from "@src/views/_shared/po-vendor/PoVendorRecoverModal";

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
  const navigate = useNavigate();
  const { po, coverage, povs, loading, reload } = data;
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const poStatus = (po?.status || "").toLowerCase();

  const isAdmin = isAdminUser(authUserItem);
  const povPerms = authUserItem?.role?.permissions?.["po-vendors"];
  const canCreatePov = isAdmin || povPerms?.can_all || povPerms?.can_add;
  const invoicePerms = authUserItem?.role?.permissions?.invoices;
  const canCreateInvoice =
    isAdmin || invoicePerms?.can_all || invoicePerms?.can_add;

  const [createOpen, setCreateOpen] = useState(false);

  const canCreate =
    canCreatePov &&
    coverage?.has_pending &&
    (poStatus === "confirmed" || poStatus === "in_process");

  // Generate Invoice — gated on actual vendor dispatch. Surfaces only when
  // at least one POV line has been dispatched; the BE enforces the same
  // rule per-line (assertQtyGuardForLines).
  const dispatchedTotal = num(coverage?.totals?.dispatched);
  const canGenerateInvoice =
    canCreateInvoice &&
    dispatchedTotal > 0 &&
    poStatus !== "draft" &&
    poStatus !== "cancelled";

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
      {/* Create POV — recovery only.
          PO+POV are normally created atomically from PFI, so this button
          stays hidden in the happy path (every PO line already has an
          active POV → coverage.has_pending = false).
          It surfaces automatically when has_pending = true — i.e. after a
          POV cancel frees up its lines, or a new vendor line was added to
          the PO post-creation. The Create POV modal filters by vendor and
          only shows uncovered lines, so the recovery flow is clean. */}
      {(canCreate || canGenerateInvoice) && (
        <div className="d-flex justify-content-end mb-2 gap-1">
          {canCreate && (
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
                  "Create a POV for uncovered PO lines (e.g. after a POV cancellation)"
                )}
              </UncontrolledTooltip>
            </Fragment>
          )}
          {canGenerateInvoice && (
            <Button
              color="primary"
              size="sm"
              onClick={() =>
                navigate(`${appsRoot}/invoices/add?po=${po?._id}`)
              }
            >
              <FileText size={14} className="me-50" />
              {t("Generate Invoice")}
            </Button>
          )}
        </div>
      )}

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
                {t("Dispatched")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Received")}
              </th>
              <th
                style={{ width: 90 }}
                className="text-end text-warning"
                title={t(
                  "Physical loss: qty that left the vendor but never arrived (dispatched − received on closed POVs). Released back to Pending so a follow-up POV can cover it."
                )}
              >
                {t("Short")}
              </th>
              <th style={{ width: 90 }} className="text-end">
                {t("Pending")}
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.lines.map((l, idx) => {
              const short = num(l.short);
              return (
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
                  <td
                    className={`text-end ${
                      short > 1e-6 ? "text-warning fw-semibold" : "text-muted"
                    }`}
                  >
                    {short > 1e-6 ? short.toLocaleString() : "-"}
                  </td>
                  <td className="text-end fw-bold">
                    {num(l.pending).toLocaleString()}
                  </td>
                </tr>
              );
            })}
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
              <td className="text-end fw-bold text-warning">
                {num(coverage.totals.short) > 1e-6
                  ? num(coverage.totals.short).toLocaleString()
                  : "-"}
              </td>
              <td className="text-end fw-bold">
                {num(coverage.totals.pending).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </Table>
      )}

      <PoVendorRecoverModal
        isOpen={createOpen}
        toggle={() => {
          setCreateOpen((s) => !s);
          if (createOpen) reload();
        }}
        purchaseOrder={po}
        onCreated={() => reload()}
      />
    </Fragment>
  );
};

export const PoVendorsPanel = ({ data }) => {
  const { t } = useTranslation();
  const { po, povs, loading } = data;
  const fmtMoney = (v) =>
    Number(v || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Flat-siblings model — all POVs are peers. Show in creation order.
  const orderedPovs = useMemo(() => {
    if (!povs.length) return [];
    return [...povs].sort((a, b) =>
      String(a.createdAt || a.voucher_no || "").localeCompare(
        String(b.createdAt || b.voucher_no || "")
      )
    );
  }, [povs]);

  // Map PO line id → PO line so we can take a proportional share of its
  // line_total (which already bakes in expense/rebate/margin/GST after the
  // backend recompute).
  const poLineMap = useMemo(() => {
    const m = new Map();
    for (const l of po?.lines || []) m.set(l._id, l);
    return m;
  }, [po]);

  const summarizeQty = (lines = []) => {
    const ordered = lines.reduce((s, l) => s + num(l.ordered_qty), 0);
    const dispatched = lines.reduce((s, l) => s + num(l.dispatched_qty), 0);
    const received = lines.reduce((s, l) => s + num(l.received_qty), 0);
    return { ordered, dispatched, received };
  };

  // POV amount = simple Σ(ordered_qty × unit_price) — no rebates /
  // expenses / margin / GST applied. Shown in INR.
  const computeAmount = (lines = []) => {
    let inr = 0;
    for (const ln of lines) {
      inr += num(ln.ordered_qty) * num(ln.unit_price);
    }
    return inr;
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
          <th style={{ width: 70 }} className="text-end">
            {t("Items")}
          </th>
          <th style={{ width: 130 }} className="text-end">
            {t("Amount")}
          </th>
          <th style={{ width: 70 }} className="text-center">
            {t("Open")}
          </th>
        </tr>
      </thead>
      <tbody>
        {orderedPovs.map((p) => {
          const { ordered, dispatched, received } = summarizeQty(p?.lines || []);
          const itemsCount = (p?.lines || []).length;
          const amount = computeAmount(p?.lines || []);
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
              <td className="text-end">{itemsCount}</td>
              <td className="text-end fw-bold">₹{fmtMoney(amount)}</td>
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
  );
};
