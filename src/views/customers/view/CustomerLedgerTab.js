// Customer Ledger (#9) — statement in the customer's currency.
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import LedgerStatement from "@src/views/_shared/ledger/LedgerStatement";

const CustomerLedgerTab = () => {
  const { t } = useTranslation();
  const customer = useSelector((s) => s.customer?.customerItem) || {};
  if (!customer?._id) {
    return <div className="text-muted py-2">{t("Loading…")}</div>;
  }
  return <LedgerStatement kind="customer" partyId={customer._id} />;
};

export default CustomerLedgerTab;
