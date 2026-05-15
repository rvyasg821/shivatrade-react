import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

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

  if (rows.length === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No bank accounts on file.")}
      </div>
    );
  }

  return (
    <Fragment>
      <h4 className="mb-2">{t("Bank Accounts")}</h4>
      <Table responsive bordered className="mb-0">
        <thead>
          <tr>
            <th>{t("Bank")}</th>
            <th>{t("Account Holder")}</th>
            <th>{t("Account Number")}</th>
            <th>{t("Currency")}</th>
            <th>{t("Type")}</th>
            <th>{t("IFSC")}</th>
            <th>{t("SWIFT")}</th>
            <th>{t("IBAN")}</th>
            <th>{t("Default")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={b?._id || i}>
              <td className="text-wrap">{b?.bank_name || "-"}</td>
              <td>{b?.account_holder_name || "-"}</td>
              <td>{b?.account_number || "-"}</td>
              <td>{currencyByIdOrCode(b?.currency_id, b?.currency_code)}</td>
              <td className="text-capitalize">{b?.account_type || "-"}</td>
              <td>{b?.ifsc || "-"}</td>
              <td>{b?.swift_code || "-"}</td>
              <td>{b?.iban || "-"}</td>
              <td>
                {b?.is_default ? (
                  <Badge color="light-success">{t("Default")}</Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Fragment>
  );
};

export default BankAccountsTab;
