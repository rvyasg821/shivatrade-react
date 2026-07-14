import { useState, useEffect } from "react";
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
// Units come from the UOM master — the import validator on the backend checks
// against the same table, so this list must never diverge from it.
import { useUomOptions } from "@src/views/_shared/uom/useUomOptions";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();
  const [categoryNames, setCategoryNames] = useState([]);
  const uomOptions = useUomOptions();

  // Fetch existing category names so the user can copy them straight into the
  // category_name column — avoids "category not found" errors on import.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await instance.get(API_ENDPOINTS.categories.dropdown);
        if (
          !cancelled &&
          res?.data?.statusCode &&
          Array.isArray(res.data.data)
        ) {
          setCategoryNames(res.data.data.map((c) => c.name).filter(Boolean));
        }
      } catch {
        /* non-blocking — instructions just won't list categories */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel — columns follow the Add Product form order")}</li>
      <li>{t("See the 'Reference' sheet in the sample file for all valid Unit of Measure and Category values to copy")}</li>
      <li>{t("Required columns: name, category_name, unit_of_measure")}</li>
      <li>{t("Category and currency must already exist for your company (matched by name / code)")}</li>
      <li>{t("Status must be 'active' or 'inactive' (defaults to active if left blank)")}</li>
      <li>
        {t("Use one of your existing unit of measure in the unit_of_measure column")}:{" "}
        {uomOptions.length > 0 ? (
          <div
            className="mt-50 p-1 bg-white border rounded text-capitalize"
            style={{ maxHeight: "90px", overflow: "auto", fontSize: "1rem" }}
          >
            {uomOptions.map((o) => o.value).join(", ")}
          </div>
        ) : (
          <span className="text-muted"> {t("(loading…)")}</span>
        )}
      </li>
      <li>{t("Currency defaults to your company's default (home) currency and Country of Origin defaults to India when left blank")}</li>
      <li>{t("If a product code matches an existing one, that product will be updated")}</li>
      <li>
        {t("Use one of your existing category names in the category_name column")}:
        {categoryNames.length > 0 ? (
          <div
            className="mt-50 p-1 bg-white border rounded text-capitalize"
            style={{ maxHeight: "90px", overflow: "auto", fontSize: "1rem" }}
          >
            {categoryNames.join(", ")}
          </div>
        ) : (
          <span className="text-muted"> {t("(loading…)")}</span>
        )}
      </li>
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
            {t("Some rebate / expense codes were not found — those links were skipped, the rows will still import")}:
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
                  <th>{t("Code / SKU")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Category")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.rowNum} className="table-danger">
                      <td>{row.rowNum}</td>
                      <td className="small text-uppercase">{row.data.code || "—"}</td>
                      <td className="small text-capitalize">{row.data.name || "—"}</td>
                      <td className="small text-capitalize">{row.data.category_name || "—"}</td>
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
      title={t("Import Products")}
      importUrl={API_ENDPOINTS.products.import}
      sampleUrl={API_ENDPOINTS.products.sampleExcel}
      sampleFilename="product-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
    />
  );
};

export default ImportModal;
