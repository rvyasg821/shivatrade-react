// Customer detail page — Sales Orders list. Thin config wrapper around the
// shared PartyDocListPanel (fetch/filter/paginate/table chrome lives there).
// The SO # cell shows the source PFI (or Quotation) link beneath it,
// mirroring the main listing layout.

import { Link } from "react-router-dom";
import { ExternalLink } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { PURCHASE_ORDER_STATUS_COLOR_MAP } from "@constant/options";
import PartyDocListPanel, {
  fmtMoney,
  statusColumn,
} from "@src/views/_shared/party/PartyDocListPanel";

const CustomerPosPanel = () => {
  const { t } = useTranslation();

  return (
    <PartyDocListPanel
      storeSlice="purchaseOrder"
      itemsKey="purchaseOrderItems"
      partyField="customer_id"
      loadAction={getPurchaseOrderList}
      loadParams={{ orderBy: "po_date", orderDirection: "desc" }}
      cleanAction={() => cleanPurchaseOrderMessage(null)}
      emptyText={t("No sales orders for this customer yet.")}
      viewHref={(row) => `${appsRoot}/purchase-orders/view/${row?._id}`}
      columns={[
        {
          header: t("SO #"),
          minWidth: 220,
          render: (row) => {
            const refVoucher = row?.pfi_voucher_no || row?.quotation_voucher_no;
            const refTo = row?.pfi_id
              ? `${appsRoot}/pfi/view/${row.pfi_id}`
              : row?.quotation_id
              ? `${appsRoot}/quotations/view/${row.quotation_id}`
              : null;
            const refLabel = row?.pfi_id ? "PFI" : "Quote";
            return (
              <>
                <Link
                  to={`${appsRoot}/purchase-orders/view/${row?._id || ""}`}
                  className="text-nowrap d-block fw-semibold"
                >
                  {row?.voucher_no || "-"}
                </Link>
                {refVoucher ? (
                  <div className="mt-25">
                    {refTo ? (
                      <Link
                        to={refTo}
                        className="small text-muted text-nowrap d-inline-flex align-items-center"
                      >
                        {refLabel} - {refVoucher}
                        <ExternalLink size={12} className="ms-1" />
                      </Link>
                    ) : (
                      <span className="small text-muted text-nowrap">
                        {refLabel} - {refVoucher}
                      </span>
                    )}
                  </div>
                ) : null}
              </>
            );
          },
        },
        {
          header: t("Date"),
          width: 130,
          render: (row) => (row?.po_date ? formatDate(row.po_date) : "-"),
        },
        {
          header: t("Expected"),
          width: 150,
          render: (row) =>
            row?.expected_delivery_date
              ? formatDate(row.expected_delivery_date)
              : "-",
        },
        {
          header: t("Total"),
          width: 130,
          align: "end",
          render: (row) => {
            const sym = row?.currency_symbol || row?.currency_code || "";
            return row?.grand_total !== null && row?.grand_total !== undefined
              ? `${sym}${fmtMoney(row.grand_total)}`
              : "-";
          },
        },
        statusColumn(
          (row) => ({
            label: (row?.status || "-").replace(/_/g, " "),
            hex:
              PURCHASE_ORDER_STATUS_COLOR_MAP[(row?.status || "").toLowerCase()] ||
              "#6c757d",
          }),
          { header: t("Status"), width: 120 }
        ),
      ]}
    />
  );
};

export default CustomerPosPanel;
