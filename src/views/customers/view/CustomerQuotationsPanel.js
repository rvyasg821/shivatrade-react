// Customer detail page — Quotations list. Thin config wrapper around the
// shared PartyDocListPanel (fetch/filter/paginate/table chrome lives there).

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getQuotationList,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import PartyDocListPanel, {
  fmtMoney,
  statusColumn,
} from "@src/views/_shared/party/PartyDocListPanel";

// Hex status colors — mirrors the main Quotation listing.
const QUOTATION_STATUS_HEX = {
  draft: "#6c757d",
  sent: "#0dcaf0",
  approved: "#198754",
  rejected: "#dc3545",
  closed: "#283046",
};

const CustomerQuotationsPanel = () => {
  const { t } = useTranslation();

  return (
    <PartyDocListPanel
      storeSlice="quotation"
      itemsKey="quotationItems"
      partyField="customer_id"
      loadAction={getQuotationList}
      loadParams={{ orderBy: "quotation_date", orderDirection: "desc" }}
      cleanAction={() => cleanQuotationMessage(null)}
      emptyText={t("No quotations for this customer yet.")}
      viewHref={(row) => `${appsRoot}/quotations/view/${row?._id}`}
      columns={[
        {
          header: t("Quote #"),
          minWidth: 200,
          render: (row) => (
            <Link
              to={`${appsRoot}/quotations/view/${row?._id || ""}`}
              className="text-nowrap fw-semibold"
            >
              {row?.voucher_no || "-"}
            </Link>
          ),
        },
        {
          header: t("Date"),
          width: 130,
          render: (row) =>
            row?.quotation_date ? formatDate(row.quotation_date) : "-",
        },
        {
          header: t("Valid Until"),
          width: 140,
          render: (row) => (row?.valid_until ? formatDate(row.valid_until) : "-"),
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
            label: row?.status || "-",
            hex:
              QUOTATION_STATUS_HEX[(row?.status || "").toLowerCase()] ||
              "#6c757d",
          }),
          { header: t("Status"), width: 120 }
        ),
      ]}
    />
  );
};

export default CustomerQuotationsPanel;
