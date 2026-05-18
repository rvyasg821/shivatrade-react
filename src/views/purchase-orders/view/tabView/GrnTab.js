// ── GRN tab (placeholder for v1) ────────────────────────────────────
// Real GRN module is a separate sprint. When it lands, this tab will
// list GRNs posted against this PO.
import { useTranslation } from "react-i18next";
import { Truck } from "react-feather";

const GrnTab = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center text-muted py-5">
      <Truck size={48} strokeWidth={1} className="mb-2 opacity-50" />
      <h5 className="mb-1">{t("Goods Receipt Notes")}</h5>
      <p className="mb-0 small">
        {t(
          "GRN tracking is coming in a later sprint. Once live, GRNs posted against this PO will show here and auto-advance the PO status."
        )}
      </p>
    </div>
  );
};

export default GrnTab;
