// Customer detail page — Invoices list. Thin config wrapper around the
// shared PartyDocListPanel (fetch/filter/paginate/table chrome lives there).

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getInvoiceList,
  cleanInvoiceMessage,
} from "@src/views/invoices/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { INVOICE_STATUS_COLOR_MAP } from "@constant/options";
import PartyDocListPanel, {
  fmtMoney,
  statusColumn,
} from "@src/views/_shared/party/PartyDocListPanel";

const CustomerInvoicesPanel = () => {
  const { t } = useTranslation();

  return (
    <PartyDocListPanel
      storeSlice="invoice"
      itemsKey="invoiceItems"
      partyField="customer_id"
      loadAction={getInvoiceList}
      loadParams={{ orderBy: "invoice_date", orderDirection: "desc" }}
      cleanAction={cleanInvoiceMessage}
      emptyText={t("No invoices for this customer yet.")}
      viewHref={(row) => `${appsRoot}/invoices/view/${row?._id}`}
      columns={[
        {
          header: t("Invoice #"),
          minWidth: 200,
          render: (row) => {
            const refVoucher =
              row?.purchase_order_voucher_no || row?.pfi_voucher_no;
            const refTo = row?.purchase_order_id
              ? `${appsRoot}/purchase-orders/view/${row.purchase_order_id}`
              : null;
            return (
              <>
                <Link
                  to={`${appsRoot}/invoices/view/${row?._id || ""}`}
                  className="text-nowrap d-block fw-semibold"
                >
                  {row?.voucher_no || (
                    <span className="text-muted fst-italic">
                      {t("(draft)")}
                    </span>
                  )}
                </Link>
                {refVoucher ? (
                  <div className="mt-25">
                    {refTo ? (
                      <Link to={refTo} className="small text-muted text-nowrap">
                        SO - {refVoucher}
                      </Link>
                    ) : (
                      <span className="small text-muted text-nowrap">
                        SO - {refVoucher}
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
          render: (row) => (row?.invoice_date ? formatDate(row.invoice_date) : "-"),
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
        {
          header: t("Balance"),
          width: 130,
          align: "end",
          render: (row) => {
            const sym = row?.currency_symbol || row?.currency_code || "";
            return row?.balance_receivable !== null &&
              row?.balance_receivable !== undefined
              ? `${sym}${fmtMoney(row.balance_receivable)}`
              : "-";
          },
        },
        statusColumn(
          (row) => ({
            label: (row?.status || "-").replace(/_/g, " "),
            hex:
              INVOICE_STATUS_COLOR_MAP[(row?.status || "").toLowerCase()] ||
              "#6c757d",
          }),
          { header: t("Status"), width: 130 }
        ),
      ]}
    />
  );
};

export default CustomerInvoicesPanel;
