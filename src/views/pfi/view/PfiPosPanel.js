// Purchase Orders spawned from this PFI. Bare-capable so it can sit in a tab.

import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Table, UncontrolledTooltip } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
import { DetailPanel } from "@src/views/_shared/detail-page";

const PfiPosPanel = ({ bare = false }) => {
  const { t } = useTranslation();
  // List is fetched by PfiRelatedDocsTabs (parent) so the count badge and the
  // tab body stay in sync without double-dispatching.
  const store = useSelector((s) => s.purchaseOrder);

  const rows = store?.purchaseOrderItems || [];

  const body =
    rows.length === 0 ? (
      <div className="text-muted py-3 text-center">
        {t("No Sales Orders generated from this PFI yet.")}
      </div>
    ) : (
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>{t("Date")}</th>
            <th>{t("SO #")}</th>
            <th>{t("Expected Delivery")}</th>
            <th className="text-end">{t("Total")}</th>
            <th>{t("Status")}</th>
            <th className="text-center">{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const sym = row?.currency_symbol || row?.currency_code || "";
            return (
              <tr key={row?._id}>
                <td className="text-muted">{idx + 1}</td>
                <td>{row?.po_date ? formatDate(row.po_date) : "-"}</td>
                <td className="text-wrap">
                  <div>{row?.voucher_no || "-"}</div>
                </td>
                <td>
                  {row?.expected_delivery_date
                    ? formatDate(row.expected_delivery_date)
                    : "-"}
                </td>
                <td className="text-end fw-bold">
                  {row?.grand_total !== null && row?.grand_total !== undefined
                    ? `${sym}${fmt(row.grand_total)}`
                    : "-"}
                </td>
                <td className="text-capitalize">{row?.status || "-"}</td>
                <td className="text-center">
                  <Link
                    to={`${appsRoot}/purchase-orders/view/${row?._id}`}
                    id={`pfi-po-view-${row?._id}`}
                  >
                    <Eye size={18} />
                  </Link>
                  <UncontrolledTooltip
                    placement="top"
                    target={`pfi-po-view-${row?._id}`}
                  >
                    {t("View")}
                  </UncontrolledTooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );

  if (bare) return <Fragment>{body}</Fragment>;
  return <DetailPanel title={t("Sales Orders")}>{body}</DetailPanel>;
};

export default PfiPosPanel;
