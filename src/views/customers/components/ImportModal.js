// Customer import — thin wrapper over the shared 2-step import modal.
// Customers import in SILENT mode on the backend: no login user and no welcome
// email is created. Upsert by company name — an existing company name is
// UPDATED in place (edit round-trip: export → change → re-import).
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel — columns follow the Add Customer form order")}</li>
      <li>{t("Only company_name is required; contact_name and contact_email are optional")}</li>
      <li>{t("Status must be 'active' or 'inactive' (defaults to active if left blank)")}</li>
      <li>{t("Currency is the customer's default trading currency, e.g. USD / INR / EUR (blank uses your company default)")}</li>
      <li>{t("Country defaults to India when left blank; bill_to_address and ship_to_address are the address lines")}</li>
      <li>{t("Imported customers get NO login account and NO welcome email is sent")}</li>
      <li>{t("If a company name already exists, that customer is updated from the sheet (export → edit → re-import to make changes)")}</li>
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
          {preview.summary.valid_update || 0} {t("Update")}
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
            {t("The following rows have errors and will be skipped. Fix them and re-upload, or continue to import only the valid rows.")}
          </Alert>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Company")}</th>
                  <th>{t("Email")}</th>
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
                      <td className="small">{row.data.contact_email || "—"}</td>
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
      title={t("Import Customers")}
      importUrl={API_ENDPOINTS.customers.import}
      sampleUrl={API_ENDPOINTS.customers.sampleExcel}
      sampleFilename="customer-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      // New + Update rows are both importable; only errors are excluded.
      computeValidCount={(s) => (s?.valid_new || 0) + (s?.valid_update || 0)}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ImportModal;
