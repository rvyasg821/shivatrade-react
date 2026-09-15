// Customer Ledger Summary — one row per customer: Opening / Debit / Credit /
// Closing for the selected period. Thin config over the shared
// <LedgerSummaryReport> (see the Vendor Ledger Summary report for its twin).
import LedgerSummaryReport from "@src/views/reports/_shared/LedgerSummaryReport";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const CustomerLedgerSummary = () => (
  <LedgerSummaryReport
    kind="customer"
    title="Customer Ledger Summary"
    endpoints={{
      list: API_ENDPOINTS.reports.customerLedgerSummary,
      export: API_ENDPOINTS.reports.customerLedgerSummaryExport,
    }}
  />
);

export default CustomerLedgerSummary;
