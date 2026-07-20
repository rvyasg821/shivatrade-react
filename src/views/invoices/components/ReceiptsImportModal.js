// Receipts import — customer payments against invoices (flat single sheet).
// Flips issued invoices to partially_paid / paid so ledgers + Sales-Turnover
// "Received" reconcile. A receipt matching an existing (invoice, date, amount)
// is skipped (safe to re-run).
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ReceiptsImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("One row per receipt. Columns: invoice_voucher_no, payment_date, amount, method, reference, notes")}</li>
      <li>{t("The invoice must already exist and be ISSUED (or partially paid). Import Invoices first")}</li>
      <li>{t("amount is in the invoice currency; each receipt reduces the outstanding and flips the invoice to partially paid / paid")}</li>
      <li>{t("A receipt matching an existing (invoice + date + amount) is skipped — safe to re-run")}</li>
      <li>{t("Accepts .xlsx / .xls / .csv (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total Receipts")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <div style={{ maxHeight: "360px", overflow: "auto" }}>
          <Table size="sm" striped bordered responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("Invoice")}</th>
                <th>{t("Details")}</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows
                .filter((r) => r.status === "error")
                .map((r) => (
                  <tr key={r.rowNum} className="table-danger">
                    <td>{r.rowNum}</td>
                    <td className="small text-nowrap">
                      {r.invoice_voucher_no || "—"}
                    </td>
                    <td className="small text-danger">
                      {r.errors?.join(", ") || ""}
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <Alert color="success" className="mb-0 p-2 d-flex align-items-center">
          <CheckCircle size={18} className="me-1 flex-shrink-0" />
          {t("All receipts are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Receipts")}
      importUrl={API_ENDPOINTS.invoices.receiptsImport}
      sampleUrl={API_ENDPOINTS.invoices.receiptsSample}
      sampleFilename="receipt-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => s?.valid_new || 0}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ReceiptsImportModal;
