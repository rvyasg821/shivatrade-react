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
  Input,
} from "reactstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { ExternalLink, AlertTriangle, Info, Plus, FileText } from "react-feather";

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
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const canCreate =
    canCreatePov &&
    coverage?.has_pending &&
    (poStatus === "confirmed" || poStatus === "in_process");

  // Generate Invoice — gated on actual vendor dispatch + remaining
  // un-invoiced qty. Hides once everything dispatched is already on an
  // invoice; the BE enforces the same rule per-line (Rule A).
  const dispatchedTotal = num(coverage?.totals?.dispatched);
  const invoiceableTotal = num(coverage?.totals?.invoiceable);
  const canGenerateInvoice =
    canCreateInvoice &&
    dispatchedTotal > 0 &&
    invoiceableTotal > 0 &&
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

  const invoicedTotal = num(coverage?.totals?.invoiced);
  const fullyInvoiced =
    dispatchedTotal > 0 && invoiceableTotal <= 1e-6 && invoicedTotal > 0;

  return (
    <Fragment>
      {/* Invoice progress hint — shows whenever any qty has been invoiced
          against this PO. Helps the operator see at a glance that an
          invoice already exists, and why "Generate Invoice" may be
          hidden (fully invoiced). */}
      {invoicedTotal > 0 && (
        <div
          className={`d-flex align-items-start gap-1 small p-1 mb-2 rounded ${
            fullyInvoiced
              ? "bg-light-success text-success"
              : "bg-light-info text-info"
          }`}
        >
          <Info size={14} className="mt-25 flex-shrink-0" />
          <div>
            <strong>
              {fullyInvoiced
                ? t("All dispatched qty already invoiced.")
                : t("Partial invoice raised for this PO.")}
            </strong>{" "}
            <span className="text-body">
              {t("Invoiced")}: {invoicedTotal} / {t("Dispatched")}:{" "}
              {dispatchedTotal}
              {invoiceableTotal > 0 && (
                <>
                  {" · "}
                  {t("Still invoiceable")}: {invoiceableTotal}
                </>
              )}
            </span>{" "}
            <Link
              to={`${appsRoot}/invoices?purchase_order_id=${po?._id}`}
              className="text-decoration-underline"
            >
              {t("View invoices")} <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}

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
                navigate(`${appsRoot}/invoices/add?po_id=${po?._id}`)
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
        <Fragment>
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>{t("Product")}</th>
              <th style={{ width: 100 }} className="text-end text-nowrap">
                {t("Ordered")}
              </th>
              <th style={{ width: 100 }} className="text-end text-nowrap">
                {t("Dispatched")}
              </th>
              <th style={{ width: 100 }} className="text-end text-nowrap">
                {t("Received")}
              </th>
              <th
                style={{ width: 90 }}
                className="text-end text-nowrap text-warning"
                title={t(
                  "Physical loss: qty that left the vendor but never arrived (dispatched − received on closed POVs). Released back to Pending so a follow-up POV can cover it."
                )}
              >
                {t("Short")}
              </th>
              <th style={{ width: 100 }} className="text-end text-nowrap">
                {t("Pending")}
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.lines
              .slice(
                Math.min(page, Math.max(0, Math.ceil(coverage.lines.length / pageSize) - 1)) * pageSize,
                Math.min(page, Math.max(0, Math.ceil(coverage.lines.length / pageSize) - 1)) * pageSize + pageSize
              )
              .map((l) => {
              const short = num(l.short);
              const pending = num(l.pending);
              return (
                <tr key={l.purchase_order_line_id}>
                  <td>
                    <div className="fw-semibold">{l?.product_name || "-"}</div>
                    <div className="small text-muted">
                      {[
                        l?.product_code,
                        l?.hsn_code ? `HSN: ${l.hsn_code}` : null,
                        l?.unit ? `${t("Unit")}: ${l.unit}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
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
                  <td
                    className={`text-end fw-bold ${
                      pending > 1e-6 ? "text-warning" : "text-muted"
                    }`}
                  >
                    {pending.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-light">
              <td className="text-end fw-bold">{t("Totals")}</td>
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

        {coverage.lines.length > 0 && (
          <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1">
            <div className="d-flex align-items-center small text-muted">
              <span className="me-50">{t("Show")}</span>
              <Input
                type="select"
                bsSize="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(0);
                }}
                style={{ width: 80 }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span className="ms-50">
                {t("of")} {coverage.lines.length} {t("rows")}
              </span>
            </div>
            <ReactPaginate
              previousLabel=""
              nextLabel=""
              pageCount={Math.max(1, Math.ceil(coverage.lines.length / pageSize))}
              activeClassName="active"
              forcePage={Math.min(
                page,
                Math.max(0, Math.ceil(coverage.lines.length / pageSize) - 1)
              )}
              onPageChange={({ selected }) => setPage(selected)}
              pageClassName="page-item"
              nextLinkClassName="page-link"
              nextClassName="page-item next"
              previousClassName="page-item prev"
              previousLinkClassName="page-link"
              pageLinkClassName="page-link"
              containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
            />
          </div>
        )}
        </Fragment>
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
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
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

  const totalPovs = orderedPovs.length;
  const pageCount = Math.max(1, Math.ceil(totalPovs / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pagedPovs = orderedPovs.slice(pageStart, pageStart + pageSize);

  return (
    <Fragment>
    <Table responsive bordered size="sm" className="align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th style={{ minWidth: 200 }}>{t("POV")}</th>
          <th style={{ width: 130 }}>{t("Dispatch")}</th>
          <th style={{ width: 130 }}>{t("Arrival")}</th>
          <th style={{ width: 80 }} className="text-end">
            {t("Items")}
          </th>
          <th style={{ width: 140 }} className="text-end">
            {t("Value")}
          </th>
        </tr>
      </thead>
      <tbody>
        {pagedPovs.map((p) => {
          const itemsCount = (p?.lines || []).length;
          const amount = computeAmount(p?.lines || []);
          const color =
            PO_VENDOR_STATUS_BADGE_COLOR[p?.status] || "secondary";
          return (
            <tr key={p._id} className="align-middle">
              <td>
                <Link
                  to={`${appsRoot}/po-vendors/view/${p._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="fw-bold d-inline-flex align-items-center"
                  id={`pov-open-${p._id}`}
                >
                  {p.voucher_no}
                  <ExternalLink size={12} className="ms-25" />
                </Link>
                <UncontrolledTooltip
                  target={`pov-open-${p._id}`}
                  placement="top"
                >
                  {t("Open POV detail")}
                </UncontrolledTooltip>
                <div className="mt-25">
                  <Badge
                    color={`light-${color}`}
                    className={`badge-light-${color} text-capitalize`}
                  >
                    {p.status}
                  </Badge>
                </div>
              </td>
              <td>{p.dispatch_date ? formatDate(p.dispatch_date) : "-"}</td>
              <td>
                {p.actual_arrival_date
                  ? formatDate(p.actual_arrival_date)
                  : p.expected_arrival_date
                  ? formatDate(p.expected_arrival_date)
                  : "-"}
              </td>
              <td className="text-end">{itemsCount}</td>
              <td className="text-end fw-bold">₹{fmtMoney(amount)}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>

    {totalPovs > 0 && (
      <div className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1">
        <div className="d-flex align-items-center small text-muted">
          <span className="me-50">{t("Show")}</span>
          <Input
            type="select"
            bsSize="sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) || 10);
              setPage(0);
            }}
            style={{ width: 80 }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Input>
          <span className="ms-50">
            {t("of")} {totalPovs} {t("rows")}
          </span>
        </div>
        <ReactPaginate
          previousLabel=""
          nextLabel=""
          pageCount={pageCount}
          activeClassName="active"
          forcePage={safePage}
          onPageChange={({ selected }) => setPage(selected)}
          pageClassName="page-item"
          nextLinkClassName="page-link"
          nextClassName="page-item next"
          previousClassName="page-item prev"
          previousLinkClassName="page-link"
          pageLinkClassName="page-link"
          containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
        />
      </div>
    )}
    </Fragment>
  );
};
