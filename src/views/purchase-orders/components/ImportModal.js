// Sales Order import — thin wrapper over the shared 2-step import modal.
// Document-level import: rows sharing a voucher_no form one Sales Order (header
// from the first row, product rows become line items). An existing voucher_no
// is NOT skipped — its advance_* fields (amount/date/exchange rate/bank/notes)
// get UPDATED (those are receipt facts that can legitimately arrive/change
// after the SO was first created); nothing else about the SO is ever touched
// on a re-import.
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("The file has TWO sheets: 'SalesOrders' (one row per SO — header fields) and 'LineItems' (the product lines). They join by voucher_no. Same LineItems shape as Quotation.")}</li>
      <li>{t("Import Customers first (and Quotations if you want the SO linked to its source quote)")}</li>
      <li>{t("SalesOrders sheet requires: voucher_no, po_date, and a customer_name (or a resolvable quotation_voucher_no that carries the customer)")}</li>
      <li>{t("bill_to_address is optional — blank uses the customer's default; a typed address not saved on the customer makes that SO an error (never a silent substitute)")}</li>
      <li>{t("LineItems sheet: each row needs voucher_no + product_code (must exist), qty (> 0), unit_price; vendor_code + full costing supported (margin, tax, part_no, hs_code, weights)")}</li>
      <li>{t("Rebates & expenses use the SAME costing-worksheet format: one column per code (e.g. DBK(%), PACKING) — put the per-line value in the cell, blank to skip. Download the sample to get your company's exact code columns.")}</li>
      <li>{t("quotation_voucher_no is optional — links the SO to its source Quotation and ties each line back to the matching quotation line")}</li>
      <li>{t("Dates accept DD/MM/YYYY or YYYY-MM-DD. exchange_rate is ₹ per 1 unit of the currency (e.g. 83 for USD), like the form; currency_code / rate default from the linked quotation, else INR. freight_total is in the SO's currency (e.g. 50 = $50). status defaults to 'draft'.")}</li>
      <li>{t("advance_exchange_rate is ₹ per 1 unit of currency too (blank = 1, i.e. domestic). advance_bank_account_no is matched against the company's saved bank accounts by account NUMBER (not bank name) — unmatched still imports the amount, just without a linked bank record.")}</li>
      <li>{t("Re-importing an EXISTING voucher_no does not create a duplicate or touch its customer/lines/terms — it only updates that SO's advance_amount, advance_date, advance_exchange_rate, advance_bank_account_no and advance_notes. Everything else in the row is ignored for an existing SO. Download the sample to see both sheets.")}</li>
      <li>{t("Accepts .xlsx / .xls files (max 5 MB) — CSV can't carry two sheets")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-orange">
          {preview.summary.valid_update || 0} {t("Advance Update (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total Sales Orders")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t("The following sales orders have errors and will be skipped. Fix them and re-upload, or continue to import only the valid ones.")}
          </Alert>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>{t("Voucher")}</th>
                  <th>{t("Customer")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.voucher_no || row.rowNums?.[0]} className="table-danger">
                      <td className="small text-nowrap">{row.voucher_no || "—"}</td>
                      <td className="small text-capitalize">
                        {row.header?.customer_name || "—"}
                      </td>
                      <td className="small text-danger">
                        {row.errors?.join(", ") || ""}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : (
        <Alert color="success" className="mb-0 p-2 d-flex align-items-center">
          <CheckCircle size={18} className="me-1 flex-shrink-0" />
          {t("All sales orders are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Sales Orders")}
      importUrl={API_ENDPOINTS.purchaseOrders.import}
      sampleUrl={API_ENDPOINTS.purchaseOrders.sampleExcel}
      sampleFilename="sales-order-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => (s?.valid_new || 0) + (s?.valid_update || 0)}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ImportModal;
