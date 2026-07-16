// Vendor Ledger (#10) — statement in INR.
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import LedgerStatement from "@src/views/_shared/ledger/LedgerStatement";

const LedgerTab = () => {
  const { t } = useTranslation();
  const vendor = useSelector((s) => s.vendor?.vendorItem) || {};
  if (!vendor?._id) {
    return <div className="text-muted py-2">{t("Loading…")}</div>;
  }
  return <LedgerStatement kind="vendor" partyId={vendor._id} />;
};

export default LedgerTab;
