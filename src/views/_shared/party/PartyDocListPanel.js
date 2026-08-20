// Generic read-only document list for a party detail page (e.g. Customer →
// Invoices / Quotations / Sales Orders tabs). Three near-identical panels
// (CustomerInvoicesPanel, CustomerQuotationsPanel, CustomerPosPanel) used to
// each hand-roll this same fetch → filter → paginate → table shape — this is
// the one place to fix/extend it now.
//
// A caller supplies WHAT to show (store slice, columns, status, links) — this
// component owns HOW: the fetch effect, the "still loading" vs "empty"
// states, client-side pagination, and the table/pill/action-column chrome.
//
// Props:
//   storeSlice   : redux state key holding this doc list (e.g. "invoice")
//   itemsKey     : the items array's key on that slice (e.g. "invoiceItems")
//   partyField   : row field the list is filtered by (e.g. "customer_id")
//   loadAction   : (params) => thunk — dispatched on mount/party change
//   loadParams   : extra params merged into the load call (orderBy, etc.)
//   cleanAction  : () => thunk — dispatched on unmount, if the slice needs it
//   emptyText    : shown when the party has zero rows
//   columns      : [{ header, width?, minWidth?, align?, render(row) }]
//                  — everything except the Action column, in order
//   statusOf     : (row) => { label, hex } — used by the Status column via
//                  the `statusColumn()` helper below (optional convenience)
//   viewHref     : (row) => string — used by both the row's own link(s) and
//                  the Action column's Eye icon
//   rowKey       : (row) => string, defaults to row._id
import { Fragment, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip, Spinner } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";
import StatusPill from "@src/views/_shared/StatusPill";

export { StatusPill };

export const fmtMoney = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// Convenience column builder for the common "Status" column shape.
export const statusColumn = (statusOf, opts = {}) => ({
  header: opts.header,
  width: opts.width ?? 120,
  render: (row) => {
    const { label, hex } = statusOf(row);
    return <StatusPill label={label} hex={hex} />;
  },
});

const PartyDocListPanel = ({
  storeSlice,
  itemsKey,
  partyField = "customer_id",
  loadAction,
  loadParams = {},
  cleanAction,
  emptyText,
  columns,
  viewHref,
  rowKey = (row) => row?._id,
}) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s[storeSlice]);

  useEffect(() => {
    if (id) {
      dispatch(
        loadAction({
          page: 1,
          perPage: 200,
          search: "",
          [partyField]: id,
          ...loadParams,
        })
      );
    }
    return () => {
      if (cleanAction) dispatch(cleanAction());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The store slice is shared across every party's detail page, so a
  // previously-viewed party can leave stale rows in it until this fetch
  // resolves. Without this filter, switching parties would briefly show the
  // last party's rows instead of the loading/empty state.
  const rows = (store?.[itemsKey] || []).filter(
    (r) => String(r?.[partyField] || "") === String(id)
  );
  // Inverted-flag convention on these slices: `loading === false` means a
  // fetch is in flight; `loading === true` means idle/done.
  const fetching = store?.loading === false;
  const total = rows.length;
  const pg = usePagination(total);
  const pagedRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  if (fetching && total === 0) {
    return (
      <div className="text-center py-3">
        <Spinner />
      </div>
    );
  }

  if (total === 0) {
    return <div className="text-muted py-3 text-center">{emptyText}</div>;
  }

  return (
    <Fragment>
      <div className="border rounded">
        <Table responsive bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  style={{ width: c.width, minWidth: c.minWidth }}
                  className={c.align === "end" ? "text-end" : undefined}
                >
                  {c.header}
                </th>
              ))}
              <th style={{ width: 80 }} className="text-center">
                {t("Action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const key = rowKey(row);
              return (
                <tr key={key}>
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={c.align === "end" ? "text-end" : undefined}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="text-center">
                    <Link to={viewHref(row)} id={`pdl-view-${key}`}>
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip placement="top" target={`pdl-view-${key}`}>
                      {t("View")}
                    </UncontrolledTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      <TablePaginationBar
        {...pg}
        totalRows={total}
        className="d-flex justify-content-between align-items-center flex-wrap mt-2 gap-1"
      />
    </Fragment>
  );
};

export default PartyDocListPanel;
