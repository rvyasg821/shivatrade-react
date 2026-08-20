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
import { ExternalLink, AlertTriangle, Package } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

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
  const { po, coverage, povs, loading } = data;

  const pg = usePagination(coverage?.lines?.length || 0);

  // The invoice-coverage banner + "Generate Invoice" button now live on the
  // Sales Order detail HEADER (single source), so they're intentionally not
  // repeated here on the Coverage tab.

  return (
    <Fragment>
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
        <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: "auto" }}>{t("Product")}</th>
              <th style={{ width: 78 }} className="text-end text-nowrap">
                {t("Ordered")}
              </th>
              <th style={{ width: 92 }} className="text-end text-nowrap">
                {t("Dispatched")}
              </th>
              <th style={{ width: 82 }} className="text-end text-nowrap">
                {t("Received")}
              </th>
              <th
                style={{ width: 82 }}
                className="text-end text-nowrap"
                title={t(
                  "Quantity currently available in inventory for this product. Pending demand up to this amount can be fulfilled from stock instead of a new vendor PO."
                )}
              >
                {t("In Stock")}
              </th>
              <th
                style={{ width: 64 }}
                className="text-end text-nowrap text-warning"
                title={t(
                  "Physical loss: qty that left the vendor but never arrived (dispatched − received on closed POVs). Released back to Pending so a follow-up POV can cover it."
                )}
              >
                {t("Short")}
              </th>
              <th style={{ width: 80 }} className="text-end text-nowrap">
                {t("Pending")}
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.lines
              .slice(pg.pageStart, pg.pageStart + pg.pageSize)
              .map((l) => {
              const short = num(l.short);
              const pending = num(l.pending);
              const inStock = num(l.in_stock);
              const fromStock = num(l.from_stock);
              // Cost variance: the vendor's actual POV rate vs the rate this
              // SO was costed at. We never rewrite the SO line (it is a
              // customer-facing document) — the drift is flagged here so a
              // stale margin is visible. Only meaningful once covered.
              const costVar =
                l.cost_variance == null ? null : num(l.cost_variance);
              const costVarTotal = num(l.cost_variance_total);
              const hasCostVar = costVar != null && Math.abs(costVar) > 0.001;
              return (
                <tr key={l.purchase_order_line_id}>
                  <td>
                    <div className="fw-semibold text-capitalize">
                      {l?.product_name || "-"}
                      {fromStock > 1e-6 ? (
                        <Badge
                          color="light-success"
                          pill
                          className="ms-1 align-middle"
                          title={t(
                            "{{qty}} of the pending quantity is available in stock — no vendor PO needed for it.",
                            { qty: fromStock.toLocaleString() }
                          )}
                        >
                          <Package size={11} className="me-25" />
                          {fromStock >= pending - 1e-6
                            ? t("From stock")
                            : t("{{qty}} from stock", {
                                qty: fromStock.toLocaleString(),
                              })}
                        </Badge>
                      ) : null}
                      {/* Vendor revised their rate after this SO was costed. */}
                      {hasCostVar ? (
                        <Badge
                          className={`ms-1 align-middle doc-badge ${
                            costVar > 0 ? "doc-badge-red" : "doc-badge-green"
                          }`}
                          title={t(
                            "Vendor rate is {{vendor}} vs the {{so}} this order was costed at. The Sales Order line is left unchanged — margin on this line is based on the older cost.",
                            {
                              vendor: num(l.vendor_unit_price).toLocaleString(),
                              so: num(l.so_unit_price).toLocaleString(),
                            }
                          )}
                        >
                          {costVar > 0 ? "▲" : "▼"} {t("Cost")}{" "}
                          {costVar > 0 ? "+" : "−"}
                          {Math.abs(costVar).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          {Math.abs(costVarTotal) > 0.001
                            ? ` (${costVarTotal > 0 ? "+" : "−"}${Math.abs(
                                costVarTotal
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })})`
                            : ""}
                        </Badge>
                      ) : null}
                    </div>
                    {(() => {
                      const sub = [
                        l?.part_no ? `Part: ${l.part_no}` : null,
                        l?.hsn_code ? `HSN: ${l.hsn_code}` : null,
                      ].filter(Boolean);
                      return sub.length ? (
                        <div className="small text-muted">
                          {sub.join(" · ")}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="text-end">
                    {num(l.ordered).toLocaleString()}{" "}
                    {l?.unit ? (
                      <small className="text-muted">{l.unit}</small>
                    ) : null}
                  </td>
                  <td className="text-end">
                    {num(l.dispatched).toLocaleString()}
                  </td>
                  <td className="text-end">
                    {num(l.received).toLocaleString()}
                  </td>
                  <td
                    className={`text-end ${
                      fromStock > 1e-6
                        ? "text-success fw-semibold"
                        : inStock > 1e-6
                        ? ""
                        : "text-muted"
                    }`}
                  >
                    {inStock > 1e-6 ? inStock.toLocaleString() : "-"}
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
              <td className="text-end fw-bold text-success">
                {num(coverage.totals.from_stock) > 1e-6
                  ? num(coverage.totals.from_stock).toLocaleString()
                  : "-"}
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
        </div>

        <TablePaginationBar
          {...pg}
          totalRows={coverage.lines.length}
          className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1"
        />
        </Fragment>
      )}
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

  // Hooks run unconditionally every render — declared before the early
  // returns below.
  const pg = usePagination(orderedPovs.length);

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
  const pagedPovs = orderedPovs.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  return (
    <Fragment>
    <div className="border rounded">
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
                  ref={(el) =>
                    el && el.style.setProperty("color", "#09418B", "important")
                  }
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
                <div className="d-flex align-items-center justify-content-between gap-1 mt-25">
                  {p.vendor_name ? (
                    <span className="small text-muted text-capitalize">
                      {p.vendor_name}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Badge
                    color={`light-${color}`}
                    className={`badge-light-${color} text-capitalize flex-shrink-0`}
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
    </div>

    <TablePaginationBar
      {...pg}
      totalRows={totalPovs}
      className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1"
    />
    </Fragment>
  );
};
