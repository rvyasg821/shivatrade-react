import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

// Vendor import — a company + its primary contact + one optional address.
// Vendor code is auto-generated (VND-0001). Import is create-only.
const VendorImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel and fill in your vendors.")}</li>
      <li>{t("Required columns: company_name, name, email, phone")}</li>
      <li>
        {t(
          "Optional: address_line1, address_line2, city, state, country (defaults to India), postcode, gstin, pan, website"
        )}
      </li>
      <li>
        {t(
          "Vendor code is generated automatically (e.g. VND-0001) — no code column."
        )}
      </li>
      <li>
        {t(
          "A row whose company name already exists is skipped (import adds new vendors only)."
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
                  <th>{t("Company Name")}</th>
                  <th>{t("Contact")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.rowNum} className="table-danger">
                      <td>{row.rowNum}</td>
                      <td className="small text-capitalize">
                        {row.data.company_name || "—"}
                      </td>
                      <td className="small">
                        {row.data.email || row.data.name || "—"}
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
      title={t("Import Vendors")}
      importUrl={API_ENDPOINTS.vendors.import}
      sampleUrl={API_ENDPOINTS.vendors.sampleExcel}
      sampleFilename="vendor-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => s?.valid_new || 0}
    />
  );
};

export default VendorImportModal;
