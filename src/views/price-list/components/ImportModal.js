import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess, vendorId }) => {
  const { t } = useTranslation();
  // Vendor-scoped imports (vendor detail page) skip the vendor_code column —
  // the vendor is already known from page context. The backend mirrors this
  // by treating vendor_code as optional when vendor_id is supplied.
  const vendorQS = vendorId ? `&vendor_id=${vendorId}` : "";
  const vendorQSStart = vendorId ? `?vendor_id=${vendorId}` : "";

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>
        {vendorId
          ? t("Required columns: product_code, unit_price")
          : t("Required columns: vendor_code, product_code, unit_price")}
      </li>
      <li>
        {vendorId
          ? t("A row is skipped if its product_code or unit_price is missing or not found")
          : t("A row is skipped if its vendor_code, product_code or unit_price is missing or not found")}
      </li>
      <li>{t("Currency: blank or unknown code falls back to your company's default currency")}</li>
      <li>{t("Effective Date: blank defaults to today. Use DD/MM/YY (e.g. 14/05/26) or YYYY-MM-DD")}</li>
      <li>{t("If Valid Until is set, Effective Date must be provided — otherwise the row is skipped")}</li>
      <li>{t("A matching vendor + product + effective date updates the existing entry; otherwise a new one is created")}</li>
      <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">{preview.summary.valid_new} {t("New")}</Badge>
        <Badge className="doc-badge doc-badge-orange">{preview.summary.valid_update} {t("Update")}</Badge>
        <Badge className="doc-badge doc-badge-red">{preview.summary.errors} {t("Errors")}</Badge>
        {preview.summary.warnings > 0 && (
          <Badge className="doc-badge doc-badge-orange">{preview.summary.warnings} {t("Warnings")}</Badge>
        )}
        <Badge className="doc-badge doc-badge-gray">{preview.summary.total} {t("Total")}</Badge>
      </div>
      {preview.summary.warnings > 0 && (
        <Alert color="warning" className="mb-2">
          <strong>
            {t("Some currencies were not found — the company default was used instead")}:
          </strong>
          <ul className="mb-0 mt-1" style={{ maxHeight: "120px", overflow: "auto" }}>
            {preview.rows
              .filter((row) => row.warnings?.length)
              .map((row) => (
                <li key={row.rowNum}>
                  {t("Row")} {row.rowNum}: {row.warnings.join("; ")}
                </li>
              ))}
          </ul>
        </Alert>
      )}
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
                  <th>{t("Vendor")}</th>
                  <th>{t("Product")}</th>
                  <th>{t("Price")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.rowNum} className="table-danger">
                      <td>{row.rowNum}</td>
                      <td className="small">{row.data.vendor_code || "—"}</td>
                      <td className="small">
                        <div>{row.data.product_code || "—"}</div>
                        {row.data.product_name ? (
                          <div className="text-muted">{row.data.product_name}</div>
                        ) : null}
                      </td>
                      <td className="small">{row.data.unit_price || "—"}</td>
                      <td className="small text-danger">{row.errors?.join(", ") || ""}</td>
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
      title={t("Import Price List")}
      importUrl={API_ENDPOINTS.priceList.import}
      sampleUrl={API_ENDPOINTS.priceList.sampleExcel}
      sampleFilename="price-list-import-sample.xlsx"
      previewQuery={vendorQS}
      confirmQuery={vendorQSStart}
      sampleQuery={vendorQSStart}
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
