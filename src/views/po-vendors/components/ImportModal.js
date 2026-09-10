// Vendor PO (POV) import — thin wrapper over the shared 2-step import modal.
// FIVE sheets: "VPOs" (header), "LineItems" (products), "VendorCharges"
// (per-charge with GST), "GRNs" (receipts) and "DebitNotes" (QC-rejected
// returns) — the last two added 2026-09-10, see their own sheet comments.
// Joined by voucher_no. An existing VPO voucher_no UPDATES that VPO instead
// of duplicating it:
//  - DRAFT existing → full replace (every header field, line, charge).
//  - DISPATCHED existing (no GRN yet) → same in-place qty/rate/discount
//    revision the Edit page already allows once "with the vendor" — header
//    and GST% stay frozen, and a GRN already existing means the row is
//    skipped instead (same as CLOSED/CANCELLED).
// GRN/Debit Note existence is 100% driven by their own sheets now — the VPO
// import itself never auto-raises or auto-confirms either one.
import { Badge, Alert, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("5 sheets in one file, all linked by the voucher number: VPOs (order details), LineItems (products), VendorCharges (freight/packing etc.), GRNs (goods received) and DebitNotes (rejected goods returned to the vendor)")}</li>
      <li>{t("Import your Vendors and Products first")}</li>
      <li>{t("VPOs sheet: voucher number + vendor code are required. Delivery address is optional — leave blank to use your default location. Optional: invoice_number (vendor's bill #), creation_date (real historical date, defaults to today), linked_so_voucher_nos (comma-separated, to trace back to more than one Sales Order), vendor_address_label (pick one of the vendor's saved addresses by its label — blank uses their default)")}</li>
      <li>{t("LineItems sheet: product code, quantity and rate are required for each line. HSN, part no., discount % and GST % are optional. If the vendor actually shipped a different quantity than ordered, put that in dispatched_qty — leave it blank to assume the full ordered quantity was shipped")}</li>
      <li>{t("Re-uploading the same voucher number updates that order instead of creating a duplicate — a Draft order is fully replaced with the new data; a Dispatched order can only have its qty/rate/discount corrected (everything else is locked); an order that's already received (has a GRN) or Closed/Cancelled is left untouched")}</li>
      <li>{t("GRNs sheet: one row per product received — voucher number, product code and received quantity are required. Leave the GRN number blank for a new receipt. Notes, batch number and remarks are optional. Set status to 'confirmed' once the receipt is final — a confirmed GRN can no longer be changed by re-import")}</li>
      <li>{t("DebitNotes sheet: only needed for rejected goods you're returning to the vendor — one row per returned product, linked to its GRN number. Date and notes are optional (date defaults to the GRN's own date). Set status to 'issued' once final — an issued Debit Note can no longer be changed by re-import")}</li>
      <li>{t("Dates (dispatch_date, grn_date etc.): use DD/MM/YYYY (e.g. 25/04/2026) or a real Excel date cell")}</li>
      <li>{t("Download the sample file below to see the exact format for all 5 sheets")}</li>
      <li>{t("Accepts .xlsx / .xls files, max 5 MB")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
    <div>
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <Badge className="doc-badge doc-badge-green">
          {preview.summary.valid_new} {t("New")}
        </Badge>
        <Badge className="doc-badge doc-badge-orange">
          {preview.summary.valid_update || 0} {t("Update (exists)")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.skipped || 0} {t("Skip (has GRN / closed)")}
        </Badge>
        <Badge className="doc-badge doc-badge-red">
          {preview.summary.errors} {t("Errors")}
        </Badge>
        <Badge className="doc-badge doc-badge-gray">
          {preview.summary.total} {t("Total VPOs")}
        </Badge>
      </div>
      {preview.summary.errors > 0 || preview.summary.warnings > 0 ? (
        <>
          <Alert color="warning" className="mb-2 p-1">
            {preview.summary.errors > 0
              ? t("The following VPOs have errors and will be skipped. Fix them and re-upload, or continue to import only the valid ones.")
              : t("The following VPOs have warnings — review before importing.")}
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
                  .filter((row) => row.docStatus === "error" || row.warnings?.length)
                  .map((row) => (
                    <tr
                      key={row.voucher_no || row.rowNum}
                      className={row.docStatus === "error" ? "table-danger" : "table-warning"}
                    >
                      <td className="small text-nowrap">{row.voucher_no || "—"}</td>
                      <td className={`small ${row.docStatus === "error" ? "text-danger" : "text-body"}`}>
                        {[...(row.errors || []), ...(row.warnings || [])].join(", ")}
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
