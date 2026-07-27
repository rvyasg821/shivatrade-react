// PO Customer Order panel — right column of the Sales Order detail page,
// below the Share panel. Shows the buyer's PO number + advance payment
// captured on the order (S4). Hidden entirely when none are set.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { DetailPanel } from "@src/views/_shared/detail-page";

// "YYYY-MM-DD" → "DD/MM/YYYY" (Indian format).
const toIndianDate = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : v;
};

const Row = ({ label, value }) =>
  value === "" || value === null || value === undefined ? null : (
    <div className="d-flex justify-content-between align-items-start mb-1">
      <span className="text-muted small me-2">{label}</span>
      <span className="fw-semibold small text-end text-break">{value}</span>
    </div>
  );

const PoCustomerOrderPanel = () => {
  const { t } = useTranslation();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};

  const hasAdvance = Number(p?.advance_amount) > 0;
  const hasData =
    !!p?.customer_po_number || !!p?.reference_no || hasAdvance || !!p?.advance_notes;
  if (!hasData) return null;

  const sym = p?.currency_symbol || "₹";

  return (
    <DetailPanel title={t("Customer Order")}>
      <Row label={t("Customer PO #")} value={p?.customer_po_number} />
      <Row label={t("Reference No.")} value={p?.reference_no} />
      <Row
        label={t("Advance")}
        value={hasAdvance ? `${sym} ${Number(p.advance_amount).toLocaleString()}` : ""}
      />
      <Row label={t("Advance Date")} value={toIndianDate(p?.advance_date)} />
      <Row label={t("Advance Notes")} value={p?.advance_notes} />
    </DetailPanel>
  );
};

export default PoCustomerOrderPanel;
