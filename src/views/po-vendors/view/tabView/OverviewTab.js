// Overview tab — line items table with the four qty columns + derived
// short/undispatched. Per-line qty is locked to the PO ordered qty by
// policy, so there is no line-edit affordance here.

import { Fragment, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { Table, Button, Input, Badge } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Edit } from "react-feather";

import { isAdminUser, appsRoot } from "@constant/defaultValues";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const OverviewTab = ({ registerActions }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};
  const lines = p?.lines || [];

  // Client-side pagination — mirrors the PFI/Quotation detail table.
  const pg = usePagination(lines.length);
  const totalRows = lines.length;
  const pageLines = lines.slice(pg.pageStart, pg.pageStart + pg.pageSize);
  const sym = p?.currency_symbol || "₹";
  // NATIVE model (plan §6.3): POV line amounts are stored in the POV's own
  // currency, shown AS-IS — no conversion.

  // Column totals (whole list, not just current page).
  const totals = lines.reduce(
    (a, l) => {
      a.ordered += num(l?.ordered_qty);
      a.dispatched += num(l?.dispatched_qty);
      a.received += num(l?.received_qty);
      a.amount += num(l?.line_total);
      return a;
    },
    { ordered: 0, dispatched: 0, received: 0, amount: 0 }
  );
  const money = (v) =>
    `${sym} ${num(v).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // po-vendors.can_update — gates the Edit Dispatch / Create GRN actions.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];

  // Edit Dispatch — available once dispatched. Published to the tab bar
  // top-right (no extra row) instead of the page header.
  const canReceive =
    (p?.status || "").toLowerCase() === "dispatched" &&
    (isAdmin || perms?.can_all || perms?.can_update);
  useEffect(() => {
    if (!registerActions) return undefined;
    registerActions(
      canReceive ? (
        <Button
          color="secondary"
          outline
          size="sm"
          onClick={() => navigate(`${appsRoot}/po-vendors/dispatch/${id}`)}
        >
          <Edit size={14} className="me-50" /> {t("Edit Dispatch")}
        </Button>
      ) : null
    );
    return () => registerActions(null);
  }, [registerActions, canReceive, id, navigate, t]);

  // The Remarks block and the Deliver To panel used to live here. Both moved to
  // the POV edit page (/po-vendors/edit/:id) — remarks and the delivery address
  // are set there, and remarks still print on the Vendor PO PDF.

  return (
    <Fragment>
      {lines.length === 0 ? (
            <div className="text-muted py-3 text-center">
              {t("No lines on this POV.")}
            </div>
          ) : (
            <div className="border rounded">
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th style={{ minWidth: 220 }}>{t("Product")}</th>
                  <th style={{ width: 90 }} className="text-end text-nowrap">
                    {t("Qty")}
                  </th>
                  <th style={{ width: 100 }} className="text-end text-nowrap">
                    {t("Price")}
                  </th>
                  <th style={{ width: 64 }} className="text-end text-nowrap">
                    {t("Disc")} %
                  </th>
                  <th style={{ width: 84 }} className="text-end text-nowrap">
                    {t("Dispatched")}
                  </th>
                  <th style={{ width: 80 }} className="text-end text-nowrap">
                    {t("Received")}
                  </th>
                  <th
                    style={{ width: 64 }}
                    className="text-end text-nowrap text-warning"
                  >
                    {t("Short")}
                  </th>
                  <th style={{ width: 88 }} className="text-end text-nowrap">
                    {t("Pending")}
                  </th>
                  <th style={{ width: 120 }} className="text-end text-nowrap">
                    {t("Total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageLines.map((l, i) => {
                  const idx = pg.pageStart + i;
                  const sub = [
                    l?.part_no ? `Part: ${l.part_no}` : null,
                    l?.hsn_code ? `HSN: ${l.hsn_code}` : null,
                  ].filter(Boolean);
                  return (
                  <tr key={l._id || idx}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>
                      <div
                        className="fw-semibold text-capitalize"
                        ref={(el) =>
                          el &&
                          el.style.setProperty("color", "#09418B", "important")
                        }
                      >
                        {l?.product_name || "-"}
                      </div>
                      {sub.length ? (
                        <div className="small text-muted">
                          {sub.join(" · ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-end text-nowrap fw-semibold">
                      {num(l?.ordered_qty).toLocaleString()}
                      {l?.unit ? (
                        <span className="text-muted fw-normal"> {l.unit}</span>
                      ) : null}
                    </td>
                    <td className="text-end text-nowrap">
                      <div>{money(l?.unit_price)}</div>
                      {l?.tolerance_hold && (
                        <div className="mt-25">
                          <Badge
                            className="doc-badge doc-badge-orange"
                            title={l.tolerance_hold_reason}
                          >
                            {t("Tolerance Hold")}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      {num(l?.discount_pct) > 0
                        ? `${num(l.discount_pct)}%`
                        : "-"}
                    </td>
                    <td className="text-end">
                      {num(l?.dispatched_qty).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l?.received_qty).toLocaleString()}
                    </td>
                    <td className="text-end text-warning">
                      {num(l?.short_qty) > 0
                        ? num(l.short_qty).toLocaleString()
                        : "-"}
                    </td>
                    <td className="text-end">
                      {num(l?.undispatched_qty) > 0
                        ? num(l.undispatched_qty).toLocaleString()
                        : "-"}
                    </td>
                    <td className="text-end text-nowrap fw-bold">
                      {money(l?.line_total)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td />
                  <td className="text-end">{t("Totals")}</td>
                  <td className="text-end">
                    {totals.ordered.toLocaleString()}
                  </td>
                  <td />
                  <td />
                  <td className="text-end">
                    {totals.dispatched.toLocaleString()}
                  </td>
                  <td className="text-end">
                    {totals.received.toLocaleString()}
                  </td>
                  <td />
                  <td />
                  <td className="text-end text-nowrap">
                    {money(totals.amount)}
                  </td>
                </tr>
              </tfoot>
            </Table>
            </div>
          )}

          <TablePaginationBar {...pg} totalRows={totalRows} />

          {p?.internal_notes && (
            <Fragment>
              <h6 className="mt-2 mb-1">{t("Internal Notes")}</h6>
              <div
                className="small text-muted"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {p.internal_notes}
              </div>
            </Fragment>
          )}

    </Fragment>
  );
};

export default OverviewTab;
