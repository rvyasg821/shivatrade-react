import { Badge, Alert } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";
import ImportErrorTable from "@src/views/_shared/import/ImportErrorTable";

// Mirrors the Countries import modal, plus the one thing states add: a parent.
// The country is given by NAME and must already be in the Country master —
// nobody can be asked to paste UUIDs into a spreadsheet, and a parent that does
// not exist yet is an error rather than a silent create.
const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>
        {t(
          "Required columns: name, country. Optional columns: state_code, status"
        )}
      </li>
      <li>
        {t(
          "The country column holds the country NAME (e.g. India) and must already exist in the Country master — import Countries first"
        )}
      </li>
      <li>
        {t(
          "Status must be 'ACTIVE' or 'INACTIVE' (defaults to ACTIVE if left blank)"
        )}
      </li>
      <li>
        {t(
          "A state is matched on name WITHIN its country, so the same name under two countries stays two separate states"
        )}
      </li>
      <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB, 5000 rows)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-orange">
          {preview.summary.valid_update} {t("Update")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t(
              "The following rows have errors and will be skipped. Fix them and re-upload, or continue to import only the valid rows."
            )}
          </Alert>
          <ImportErrorTable
            rows={preview.rows}
            columns={[
              { header: t("Name"), cell: (r) => r.data.name },
              { header: t("Country"), cell: (r) => r.data.country },
              { header: t("State Code"), cell: (r) => r.data.state_code },
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
      title={t("Import States")}
      importUrl={API_ENDPOINTS.states.import}
      sampleUrl={API_ENDPOINTS.states.sampleExcel}
      sampleFilename="states-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
