// Vendor PO (POV) import — thin wrapper over the shared 2-step import modal.
// THREE sheets: "VPOs" (header), "LineItems" (products), "VendorCharges"
// (per-charge with GST). Joined by voucher_no. An existing voucher_no
// UPDATES that voucher's line tax_pct from the sheet (e.g. re-uploading a
// corrected file) — qty/rate/status are left untouched.
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("The file has THREE sheets: 'VPOs' (one row per POV), 'LineItems' (products), 'VendorCharges' (charges). They join by voucher_no.")}</li>
      <li>{t("Import Vendors & Products first — POV links a vendor by code and each line a product by code")}</li>
      <li>{t("VPOs sheet requires: voucher_no, vendor_code. deliver_to is optional (blank → your default company location; a name that isn't a saved location is kept as free text)")}</li>
      <li>{t("so_voucher_no is optional — links the VPO to its source Sales Order (blank → standalone). An unknown SO is left unlinked with a warning")}</li>
      <li>{t("LineItems sheet: voucher_no + product_code (must exist), qty (> 0), rate; part_no / hsn / uom / gst_pct optional. VPO is INR-only")}</li>
      <li>{t("VendorCharges sheet: voucher_no + charge_code (must exist as an expense), type (fixed/percent), value, gst_pct — one row per charge")}</li>
      <li>{t("Optional advance_amount / advance_date / advance_notes record an advance payment to the vendor on create")}</li>
      <li>{t("The original voucher number is preserved. Re-uploading an existing voucher_no updates that voucher's line GST% from the sheet (qty/rate/status untouched) — safe to re-run to correct a GST rate. Download the sample to see all three sheets.")}</li>
      <li>{t("Accepts .xlsx / .xls files (max 5 MB)")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-orange">
          {preview.summary.valid_update || 0} {t("GST% Update (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total VPOs")}
        </Badge>
      </div>
      {preview.summary.errors > 0 ? (
        <>
          <Alert color="warning" className="mb-2">
            {t("The following VPOs have errors and will be skipped. Fix them and re-upload, or continue to import only the valid ones.")}
          </Alert>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <Table size="sm" striped bordered responsive>
              <thead>
                <tr>
                  <th>{t("Voucher")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((row) => row.docStatus === "error")
                  .map((row) => (
                    <tr key={row.voucher_no || row.rowNum} className="table-danger">
                      <td className="small text-nowrap">{row.voucher_no || "—"}</td>
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
          {t("All VPOs are valid and ready to import.")}
        </Alert>
      )}
    </div>
  );

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Vendor POs")}
      importUrl={API_ENDPOINTS.poVendors.import}
      sampleUrl={API_ENDPOINTS.poVendors.sampleExcel}
      sampleFilename="vpo-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      computeValidCount={(s) => (s?.valid_new || 0) + (s?.valid_update || 0)}
      confirmLabel={(n) => `${t("Confirm Import")} (${n})`}
    />
  );
};

export default ImportModal;
