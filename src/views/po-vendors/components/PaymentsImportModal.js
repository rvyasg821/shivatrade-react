// Vendor payments import — payments against VPOs (flat single sheet). amount is
// GROSS (settles the payable); net = amount − TDS. Reconciles the vendor ledger
// + POV payment status. A payment matching an existing (VPO, date, amount) is
// skipped (safe to re-run).
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const PaymentsImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("One row per payment. Columns: vpo_voucher_no, payment_date, amount (GROSS), tds_section, tds_rate_pct, tds_amount, invoice_number, bank, notes")}</li>
      <li>{t("The VPO must already exist. Import VPOs first")}</li>
      <li>{t("amount is the GROSS vendor bill (settles the payable); net paid = amount − TDS. TDS is optional")}</li>
      <li>{t("bank is optional — matched to your company bank account by name/number, else left blank")}</li>
      <li>{t("A payment matching an existing (VPO + date + amount) is skipped — safe to re-run")}</li>
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
          {preview.summary.total} {t("Total Payments")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <div style={{ maxHeight: "360px", overflow: "auto" }}>
          <Table size="sm" striped bordered responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("VPO")}</th>
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
                      {r.vpo_voucher_no || "—"}
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
          {t("All payments are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Vendor Payments")}
      importUrl={API_ENDPOINTS.poVendors.paymentsImport}
      sampleUrl={API_ENDPOINTS.poVendors.paymentsSample}
      sampleFilename="vendor-payment-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => s?.valid_new || 0}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default PaymentsImportModal;
