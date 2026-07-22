import { Badge, Alert } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";
import ImportErrorTable from "@src/views/_shared/import/ImportErrorTable";

// Mirrors the UOM import modal. Countries are shared reference data — no
// company scoping — and the match key is the country NAME, which is why the
// import can update a country but never rename one: states, cities and every
// free-text address row are pinned to that string.
const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>
        {t(
          "Required column: name. Optional columns: country_code, currency_code, time_zone, status"
        )}
      </li>
      <li>
        {t(
          "country_code and currency_code are required for NEW countries — e.g. IN and INR"
        )}
      </li>
      <li>
        {t(
          "Status must be 'ACTIVE', 'INACTIVE' or 'BLOCKED' (defaults to ACTIVE if left blank)"
        )}
      </li>
      <li>
        {t(
          "If a name matches an existing country, that country is updated — the name itself is never renamed, and a blank cell leaves the current value alone"
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
              { header: t("Country Code"), cell: (r) => r.data.country_code },
              { header: t("Currency"), cell: (r) => r.data.currency_code },
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
      title={t("Import Countries")}
      importUrl={API_ENDPOINTS.countries.import}
      sampleUrl={API_ENDPOINTS.countries.sampleExcel}
      sampleFilename="countries-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
