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
        {t("No Purchase Orders generated from this PFI yet.")}
      </div>
    ) : (
      <Table responsive bordered size="sm" className="mb-0">
        <thead className="table-light">
          <tr>
            <th>{t("Date")}</th>
            <th>{t("PO #")}</th>
            <th>{t("Expected Delivery")}</th>
            <th className="text-end">{t("Total")}</th>
            <th>{t("Status")}</th>
            <th className="text-center">{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sym = row?.currency_symbol || row?.currency_code || "";
            // PO is multi-vendor at line level. Derive unique vendors
            // from line items; fall back to legacy header vendor.
            const seen = new Set();
            const vendorList = [];
            for (const ln of row?.lines || []) {
              const vid = ln?.vendor_id;
              if (!vid || seen.has(vid)) continue;
              seen.add(vid);
              vendorList.push(ln?.vendor_name || vid);
            }
            if (vendorList.length === 0 && row?.vendor_name) {
              vendorList.push(row.vendor_name);
            }
            return (
              <tr key={row?._id}>
                <td>{row?.po_date ? formatDate(row.po_date) : "-"}</td>
                <td className="text-wrap">
                  <div>{row?.voucher_no || "-"}</div>
                  {vendorList.length > 0 && (
                    <small className="text-muted text-capitalize d-block">
                      {vendorList.join(", ")}
                    </small>
                  )}
                </td>
                <td>
                  {row?.expected_delivery_date
                    ? formatDate(row.expected_delivery_date)
                    : "-"}
                </td>
                <td className="text-end fw-bold">
                  {row?.grand_total !== null && row?.grand_total !== undefined
                    ? `${sym}${fmt(
                        Number(row.grand_total) *
                          (Number(row?.exchange_rate) || 1)
                      )}`
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
  return <DetailPanel title={t("Purchase Orders")}>{body}</DetailPanel>;
};

export default PfiPosPanel;
