// Invoice import — thin wrapper over the shared 2-step import modal.
// FOUR sheets: "Invoices" (header), "LineItems" (products + costing), "Banks"
// (bank snapshots). Joined by voucher_no. Imports WITHOUT a Sales Order
// (decision-5). An existing voucher_no UPDATES that invoice's line
// tax_pct/igst_rate_pct from the sheet (e.g. re-uploading a corrected
// file) — qty/price/status are left untouched.
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("The file has sheets: 'Invoices' (one row per invoice), 'LineItems' (products + costing), 'Banks' (optional). They join by voucher_no.")}</li>
      <li>{t("Import Customers & Products first. A Sales Order is NOT required — so_voucher_no / quotation_voucher_no are optional links")}</li>
      <li>{t("Invoices sheet requires: voucher_no, invoice_date, customer_name, currency_code. bill_to_address blank → customer default; a typed unsaved address errors that invoice")}</li>
      <li>{t("exchange_rate is ₹ per 1 unit of the currency (e.g. 83 for USD), like the form. Freight/insurance/other charges are in the invoice currency")}</li>
      <li>{t("Port of Loading comes from your Company profile automatically; Port of Discharge is free text on the sheet")}</li>
      <li>{t("status: 'issued' (or paid/partially_paid — receipts imported separately) issues the invoice preserving the number, snapshotting the ₹ total, and NOT moving stock. 'draft' leaves it a draft")}</li>
      <li>{t("The original voucher number is preserved. Re-uploading an existing voucher_no updates that invoice's line tax_pct/igst_rate_pct from the sheet (qty/price/status untouched) — safe to re-run to correct a GST rate. Download the sample to see all sheets & your rebate/expense columns")}</li>
      <li>{t("Accepts .xlsx / .xls files (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-orange">
          {preview.summary.valid_update || 0} {t("GST% Update (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total Invoices")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t("The following invoices have errors and will be skipped. Fix them and re-upload, or continue to import only the valid ones.")}
          </Alert>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>{t("Voucher")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.docStatus === "error")
                  .map((row) => (
                    <tr key={row.voucher_no || row.rowNum} className="table-danger">
                      <td className="small text-nowrap">{row.voucher_no || "—"}</td>
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
          {t("All invoices are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Invoices")}
      importUrl={API_ENDPOINTS.invoices.import}
      sampleUrl={API_ENDPOINTS.invoices.sampleExcel}
      sampleFilename="invoice-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => (s?.valid_new || 0) + (s?.valid_update || 0)}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ImportModal;
