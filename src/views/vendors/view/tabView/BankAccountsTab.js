import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge } from "reactstrap";
import { useTranslation } from "react-i18next";

import DatatablePagination from "@components/datatable/DatatablePagination";

const BankAccountsTab = () => {
  const { t } = useTranslation();
  const { vendorItem } = useSelector((s) => s.vendor);
  const currencyStore = useSelector((s) => s.currency);
  const rows = vendorItem?.bank_accounts || [];

  const currencyByIdOrCode = (cid, code) => {
    const list = currencyStore?.currencyDropdown || [];
    const found = list.find((c) => c._id === cid || c.code === code);
    return found?.code || code || "-";
  };

  const columns = [
    {
      name: t("Bank"),
      minWidth: "180px",
      selector: (row) => (
        <span className="text-wrap">{row?.bank_name || "-"}</span>
      ),
    },
    {
      name: t("Account Holder"),
      minWidth: "160px",
      selector: (row) => row?.account_holder_name || "-",
    },
    {
      name: t("Account Number"),
      selector: (row) => row?.account_number || "-",
    },
    {
      name: t("Currency"),
      selector: (row) => currencyByIdOrCode(row?.currency_id, row?.currency_code),
    },
    {
      name: t("Type"),
      selector: (row) => (
        <span className="text-capitalize">{row?.account_type || "-"}</span>
      ),
    },
    {
      name: t("IFSC"),
      selector: (row) => row?.ifsc || "-",
    },
    {
      name: t("SWIFT"),
      selector: (row) => row?.swift_code || "-",
    },
    {
      name: t("IBAN"),
      selector: (row) => row?.iban || "-",
    },
    {
      name: t("Default"),
      center: true,
      selector: (row) =>
        row?.is_default ? (
          <Badge color="light-success">{t("Default")}</Badge>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  return (
    <Fragment>
      <DatatablePagination columns={columns} data={rows} disablePagination />
    </Fragment>
  );
};

export default BankAccountsTab;
