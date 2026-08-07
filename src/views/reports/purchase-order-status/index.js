// Purchase Order (Vendor PO) Status report — Open / Partially Closed / Closed
// Vendor POs by how much of each PO's ordered qty has been RECEIVED on GRNs
// (received = accepted/good qty). A thin config over the shared
// <DocStatusReport> — the vendor-side twin of the Sales Order Status report.
// Coverage links the GRN line → POV line.
import DocStatusReport from "@src/views/reports/_shared/DocStatusReport";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const CONFIG = {
  title: "Purchase Order Status",
  idPrefix: "pos",
  endpoints: {
    list: API_ENDPOINTS.reports.purchaseOrderStatus,
    breakdown: API_ENDPOINTS.reports.purchaseOrderStatusBreakdown,
    export: API_ENDPOINTS.reports.purchaseOrderStatusExport,
  },
  exportFilename: "purchase-order-status.xlsx",
  partyKind: "vendor",
  partyLabel: "Vendor",
  partyPlaceholder: "All vendors",
  partyParam: "vendor_id",
  docNoLabel: "PO No",
  dateLabel: "PO date",
  searchPlaceholder: "PO no / vendor",
  // Which GRNs count toward received coverage (default Confirmed).
  coverageParam: "grn_scope",
  coverageOptions: [
    { value: "confirmed", label: "Confirmed GRNs" },
    { value: "all", label: "All GRNs" },
  ],
  coverLabel: "GRNs",
  coverTypeBadge: (type) =>
    type === "confirmed"
      ? { label: "Confirmed", cls: "doc-badge-green" }
      : { label: "Draft", cls: "doc-badge-gray" },
  breakdownIdParam: "pov_id",
  // GRNs carry GST (under the POV) — show GST + GST-inclusive Total in the
  // drill-down. The listing's value columns already include GST + vendor
  // charges (the full POV payable).
  showCoverGst: true,
};

const PurchaseOrderStatus = () => <DocStatusReport config={CONFIG} />;

export default PurchaseOrderStatus;
