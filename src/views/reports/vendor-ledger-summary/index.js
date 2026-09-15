// Vendor Ledger Summary — one row per vendor: Opening / Debit / Credit /
// Closing for the selected period. Thin config over the shared
// <LedgerSummaryReport> (see the Customer Ledger Summary report for its twin).
import LedgerSummaryReport from "@src/views/reports/_shared/LedgerSummaryReport";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const VendorLedgerSummary = () => (
  <LedgerSummaryReport
    kind="vendor"
    title="Vendor Ledger Summary"
    endpoints={{
      list: API_ENDPOINTS.reports.vendorLedgerSummary,
      export: API_ENDPOINTS.reports.vendorLedgerSummaryExport,
    }}
  />
);

export default VendorLedgerSummary;
