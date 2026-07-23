import { Badge, Alert } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";
import ImportErrorTable from "@src/views/_shared/import/ImportErrorTable";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>{t("Required columns: code, name, value. Optional: type, status")}</li>
      <li>{t("Type must be 'percent' or 'fixed' (defaults to percent if left blank)")}</li>
      <li>{t("Status must be 'active' or 'inactive' (defaults to active if left blank)")}</li>
      <li>{t("Rows are matched by code — a matching code updates that expense, a new code creates one")}</li>
      <li>{t("Import never deletes. A blank cell leaves the stored value alone")}</li>
      <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">{preview.summary.valid_new} {t("New")}</Badge>
        <Badge className="doc-badge doc-badge-orange">{preview.summary.valid_update} {t("Update")}</Badge>
        <Badge className="doc-badge doc-badge-red">{preview.summary.errors} {t("Errors")}</Badge>
        <Badge className="doc-badge doc-badge-gray">{preview.summary.total} {t("Total")}</Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t("The following rows have errors and will be skipped. Fix them and re-upload, or continue to import only the valid rows.")}
          </Alert>
          <ImportErrorTable
            rows={preview.rows}
            columns={[
              { header: t("Code"), cell: (r) => r.data.code },
              { header: t("Name"), cell: (r) => r.data.name },
            ]}
          />
        </>
      ) : (
        <Alert color="success" className="mb-0 p-2 d-flex align-items-center">
          <CheckCircle size={18} className="me-1 flex-shrink-0" />
          {t("All rows are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Expenses")}
      importUrl={API_ENDPOINTS.expenses.import}
      sampleUrl={API_ENDPOINTS.expenses.sampleExcel}
      sampleFilename="expense-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
