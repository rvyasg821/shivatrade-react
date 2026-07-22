import { Badge, Alert } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";
import ImportErrorTable from "@src/views/_shared/import/ImportErrorTable";

// The city master ships empty on purpose, so this modal is how it actually gets
// populated. Both parents are named, and `country` is not decorative: Punjab is
// a state in two countries and Georgia is both a state and a country, so
// without it those rows would be genuinely ambiguous.
const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>
        {t(
          "Required columns: name, state, country. Optional columns: city_code, status"
        )}
      </li>
      <li>
        {t(
          "state and country hold NAMES (e.g. Gujarat, India) and must already exist in their masters — import Countries, then States, then Cities"
        )}
      </li>
      <li>
        {t(
          "The country column is required even though the state implies it, because the same state name can exist in more than one country"
        )}
      </li>
      <li>
        {t(
          "Status must be 'ACTIVE' or 'INACTIVE' (defaults to ACTIVE if left blank)"
        )}
      </li>
      <li>
        {t(
          "A city is matched on name WITHIN its state, so the same name in two states stays two separate cities"
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
              { header: t("State"), cell: (r) => r.data.state },
              { header: t("Country"), cell: (r) => r.data.country },
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
      title={t("Import Cities")}
      importUrl={API_ENDPOINTS.cities.import}
      sampleUrl={API_ENDPOINTS.cities.sampleExcel}
      sampleFilename="cities-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
