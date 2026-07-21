import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

// Mirrors the Categories import modal. The key differences come from the
// master itself: the match key is `code` (not name), and UOM is global
// reference data so nothing is company-scoped.
const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>
        {t(
          "Required column: code. Optional columns: name, uqc_code, allow_decimal, sort_order, status"
        )}
      </li>
      <li>
        {t(
          "allow_decimal must be 'yes' or 'no' — use 'no' for countable units like Nos or Box (defaults to yes)"
        )}
      </li>
      <li>
        {t(
          "Status must be 'ACTIVE' or 'INACTIVE' (defaults to ACTIVE if left blank)"
        )}
      </li>
      <li>
        {t(
          "If a code matches an existing unit, that unit is updated — the code itself is never renamed, because products store it as plain text"
        )}
      </li>
      <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB)")}</li>
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
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Code")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("UQC")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.rowNum} className="table-danger">
                      <td>{row.rowNum}</td>
                      <td className="small">{row.data.code || "—"}</td>
                      <td className="small">{row.data.name || "—"}</td>
                      <td className="small">{row.data.uqc_code || "—"}</td>
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
      title={t("Import Units of Measure")}
      importUrl={API_ENDPOINTS.uom.import}
      sampleUrl={API_ENDPOINTS.uom.sampleExcel}
      sampleFilename="uom-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
