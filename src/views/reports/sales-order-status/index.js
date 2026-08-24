// Sales Order Status report — Open / Partially Closed / Closed Sales Orders by
// how much of each SO's ordered qty has been billed to invoices. It's a thin
// config over the shared <DocStatusReport> (see the Purchase Order Status report
// for the vendor-side twin). Coverage links the invoice line → SO line.
import DocStatusReport from "@src/views/reports/_shared/DocStatusReport";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const CONFIG = {
  title: "Sales Order Status",
  idPrefix: "sos",
  endpoints: {
    list: API_ENDPOINTS.reports.salesOrderStatus,
    breakdown: API_ENDPOINTS.reports.salesOrderStatusBreakdown,
    lineBreakdown: API_ENDPOINTS.reports.salesOrderStatusLineBreakdown,
    export: API_ENDPOINTS.reports.salesOrderStatusExport,
  },
  // Outbound links from the drawer to each document's own detail page.
  docViewPath: "/purchase-orders/view",
  coverViewPath: "/invoices/view",
  exportFilename: "sales-order-status.xlsx",
  partyKind: "customer",
  partyLabel: "Customer",
  partyPlaceholder: "All customers",
  partyParam: "customer_id",
  docNoLabel: "SO No",
  dateLabel: "SO date",
  searchPlaceholder: "SO no / customer",
  // Which invoices count toward coverage (default Export — the client's ask).
  coverageParam: "invoice_type",
  coverageOptions: [
    { value: "export", label: "Export invoices" },
    { value: "domestic", label: "Domestic invoices" },
    { value: "all", label: "All invoices" },
  ],
  coverLabel: "Invoices",
  coverTypeBadge: (type) =>
    type === "export"
      ? { label: "Export", cls: "doc-badge-green" }
      : { label: "Domestic", cls: "doc-badge-gray" },
  breakdownIdParam: "so_id",
};

const SalesOrderStatus = () => <DocStatusReport config={CONFIG} />;

export default SalesOrderStatus;
