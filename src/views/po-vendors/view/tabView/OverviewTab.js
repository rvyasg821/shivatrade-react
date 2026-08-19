// Overview tab — line items table with the four qty columns + derived
// short/undispatched. Per-line qty is locked to the PO ordered qty by
// policy, so there is no line-edit affordance here.

import { Fragment, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { Table, Button, Input, Badge } from "reactstrap";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import { Edit } from "react-feather";

import { isAdminUser, appsRoot } from "@constant/defaultValues";

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
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const totalRows = lines.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);
  const pageLines = lines.slice(pageStart, pageEnd);
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
                  const idx = pageStart + i;
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
                      {money(l?.unit_price)}
                      {l?.tolerance_hold && (
                        <Badge
                          className="doc-badge doc-badge-orange d-block mt-25"
                          title={l.tolerance_hold_reason}
                        >
                          {t("Tolerance Hold")}
                        </Badge>
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

          {totalRows > 0 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
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
                  {t("of")} {totalRows} {t("rows")}
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
