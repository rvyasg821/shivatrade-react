// Customer detail page — Invoices placeholder. The invoice module isn't
// wired up server-side yet; we render a friendly empty state so the tab
// keeps its place in the layout until the feature lands.

import { useTranslation } from "react-i18next";

const CustomerInvoicesPanel = () => {
  const { t } = useTranslation();
  return (
    <div className="text-muted py-3 text-center">
      {t("Invoices will appear here once the invoicing module is enabled.")}
    </div>
  );
};

export default CustomerInvoicesPanel;
