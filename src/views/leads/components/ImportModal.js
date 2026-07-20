// Lead import — thin wrapper over the shared 2-step import modal.
// Document-level import: rows sharing a voucher_no form one lead (header from
// the first row, product rows become requirement lines). Existing voucher_no
// is SKIPPED (leads are transactional — re-import never rewrites them).
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel — one row per requirement line")}</li>
      <li>{t("Required columns: voucher_no, company_name, contact_email")}</li>
      <li>{t("customer_name is optional — fill it to link a repeat-business lead to an EXISTING customer (matched by company name; source becomes existing_customer). Leave blank for a new prospect. An unmatched name errors — it never creates a customer.")}</li>
      <li>{t("Rows sharing the same voucher_no become ONE lead with multiple product lines (header taken from the first row)")}</li>
      <li>{t("product_code lists the interested-in products — must already exist for your company. A lead captures no qty or price (those come at the Quotation stage)")}</li>
      <li>{t("List several products in ONE product_code cell, comma-separated (e.g. PRD-001, PRD-002, PRD-003) — each becomes a requirement line")}</li>
      <li>{t("status defaults to 'new'; source is optional (web, referral, trade_show, cold_call, existing_customer, other)")}</li>
      <li>{t("The original voucher number is preserved; if it already exists the lead is skipped (safe to re-run)")}</li>
      <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total Leads")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t("The following leads have errors and will be skipped. Fix them and re-upload, or continue to import only the valid ones.")}
          </Alert>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>{t("Voucher")}</th>
                  <th>{t("Company")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.status === "error")
                  .map((row) => (
                    <tr key={row.voucher_no || row.rowNums?.[0]} className="table-danger">
                      <td className="small text-nowrap">{row.voucher_no || "—"}</td>
                      <td className="small text-capitalize">
                        {row.header?.company_name || "—"}
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
          {t("All leads are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Leads")}
      importUrl={API_ENDPOINTS.leads.import}
      sampleUrl={API_ENDPOINTS.leads.sampleExcel}
      sampleFilename="lead-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      // Only brand-new leads are importable; skips/errors are not counted.
      computeValidCount={(s) => s?.valid_new || 0}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ImportModal;
