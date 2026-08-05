// Shared Excel-import modal for sales-doc line items (quotation/PFI/PO).
// 2-step flow: upload → preview. Statuses mirror the price-list import
// (new/updated/skipped/warning/error) so the chip styling is consistent.
//
// On Confirm the resolved rows are handed back to the parent via
// `onConfirm(rows)`; the parent merges them into the wizard's useFieldArray
// using a fixed update-on-match + append rule (no duplicate product/vendor
// pairs are ever created).

import { useState, useMemo } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  Alert,
  Spinner,
  Table,
} from "reactstrap";
import { CheckCircle, Download } from "react-feather";
import { useTranslation } from "react-i18next";
import XLSX from "xlsx";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const STATUS_BADGE = {
  new: "doc-badge doc-badge-green",
  updated: "doc-badge doc-badge-orange",
  skipped: "doc-badge doc-badge-gray",
  error: "doc-badge doc-badge-red",
};

const downloadBlob = (data, filename) => {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const LineItemImportModal = ({
  isOpen,
  toggle,
  docType,
  existingKeys,
  onConfirm,
}) => {
  const { t } = useTranslation();
  // Quotation & Sales Order use the costing-worksheet sheet (aliased headers +
  // per-code expense/rebate value columns). PFI / Lead keep the legacy sheet.
  const isCosting = docType === "quotation" || docType === "po";
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setPreview(null);
  };
  const handleClose = () => {
    reset();
    toggle();
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && !f.name.match(/\.(csv|xlsx?)$/i)) {
      Notification("Error", t("Please upload a CSV or Excel file"), "warning");
      return;
    }
    setFile(f || null);
  };

  const handleDownloadSample = async () => {
    setSampleLoading(true);
    try {
      const res = await instance.post(
        API_ENDPOINTS.salesDocImport.sample,
        { docType, lines: [] },
        { responseType: "blob" },
      );
      // The "po" docType is the Sales Order module — name its files "so-…".
      const prefix = docType === "po" ? "so" : docType;
      downloadBlob(res.data, `${prefix}-import-sample.xlsx`);
    } catch {
      Notification("Error", t("Failed to download sample"), "warning");
    } finally {
      setSampleLoading(false);
    }
  };

  const parseSheet = async (f) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName =
      wb.SheetNames.find((s) => s.toLowerCase() === "lineitems") ||
      wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // Read as array-of-arrays — the sheet repeats "rebate" and "expense"
    // header cells (mirroring the product master sample sheet), so we can't
    // rely on object-keyed parsing.
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      raw: true,
    });
    if (!aoa.length) return [];
    const headers = aoa[0].map((c) => String(c ?? "").trim());
    // Pre-compute the column indices for each "rebate" / "expense" header so
    // we can pull cells into arrays per row.
    const rebateIdxs = [];
    const expenseIdxs = [];
    headers.forEach((h, idx) => {
      const k = h.toLowerCase();
      if (k === "rebate" || k === "rebates") rebateIdxs.push(idx);
      else if (k === "expense" || k === "expenses") expenseIdxs.push(idx);
    });

    const rows = [];
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r || r.every((c) => c === "" || c === null || c === undefined))
        continue;
      const obj = { rebate_codes: [], expense_codes: [] };
      headers.forEach((h, idx) => {
        if (!h) return;
        const key = h.toLowerCase();
        if (key === "rebate" || key === "rebates") return;
        if (key === "expense" || key === "expenses") return;
        obj[h] = r[idx] ?? "";
      });
      for (const idx of rebateIdxs) {
        const v = String(r[idx] ?? "").trim();
        if (v) obj.rebate_codes.push(v);
      }
      for (const idx of expenseIdxs) {
        const v = String(r[idx] ?? "").trim();
        if (v) obj.expense_codes.push(v);
      }
      rows.push(obj);
    }
    return rows;
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const rows = await parseSheet(file);
      if (!rows.length) {
        Notification("Error", t("The file has no data rows"), "warning");
        setLoading(false);
        return;
      }
      const res = await instance.post(API_ENDPOINTS.salesDocImport.resolve, {
        docType,
        rows,
        existingKeys: existingKeys || [],
      });
      if (res?.data?.statusCode === 200) {
        setPreview(res.data.data);
        setStep(2);
      } else {
        Notification(
          "Error",
          res?.data?.message || t("Preview failed"),
          "warning",
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || t("Preview failed");
      Notification("Error", msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const validRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (r) => r.status === "new" || r.status === "updated",
      ),
    [preview],
  );

  // Show the per-row table only when there's something the user actually
  // needs to inspect — warnings, skipped, or errors. Pure new/updated
  // imports show just the summary chips + a CTA.
  const noisyRows = useMemo(() => {
    const rows = (preview?.rows || []).filter(
      (r) =>
        r.status === "skipped" ||
        r.status === "error" ||
        (r.warnings && r.warnings.length > 0),
    );
    // Errors first, then skipped, then warning-only — so the rows that actually
    // need fixing are always on top even when a big import produces hundreds of
    // benign "added to the price list on save" warnings.
    const rank = (r) =>
      r.status === "error" ? 0 : r.status === "skipped" ? 1 : 2;
    return rows.slice().sort((a, b) => rank(a) - rank(b));
  }, [preview]);

  // Cap the rendered rows so a 700-row import doesn't paint hundreds of <tr>.
  const NOISY_CAP = 100;
  const shownNoisy = noisyRows.slice(0, NOISY_CAP);
  const hiddenNoisy = noisyRows.length - shownNoisy.length;

  const handleConfirm = () => {
    if (!validRows.length) return;
    onConfirm(validRows);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg" centered scrollable backdrop="static" keyboard={false}>
      <ModalHeader toggle={handleClose}>
        {step === 1 && t("Import Line Items")}
        {step === 2 && t("Review Import Data")}
      </ModalHeader>
      <ModalBody>
        {step === 1 && (
          <div>
            <Alert color="info" className="mb-2">
              <strong>{t("Instructions")}:</strong>
              <ol className="mb-0 mt-1">
                <li>
                  {t(
                    "Download the sample Excel below to see the required columns with example rows.",
                  )}
                </li>
                <li>
                  {isCosting
                    ? t(
                        "Required columns: productcode, qty. vendorcode is optional — blank falls back to the cheapest active vendor.",
                      )
                    : t(
                        "Required columns: product_code, qty. vendor_code is optional — blank falls back to the cheapest active vendor.",
                      )}
                </li>
                <li>
                  {isCosting
                    ? t(
                        "Each expense/rebate code is its own column (e.g. PKC, TPC(%), DBK). Type an amount to apply it to that line — the typed value overrides the master; leave blank to skip. Computed columns (price/disc, value, grand total…) are ignored on import.",
                      )
                    : t(
                        "Header row repeats the columns 'rebate' and 'expense'. Put a rebate/expense code (e.g. DBK, RODTEP, CHA) under each cell to attach it to the line; leave blank to skip.",
                      )}
                </li>
                <li>
                  {isCosting
                    ? t(
                        "productname is display-only — it shows which product each code is. The row is always resolved by productcode, so editing the name has no effect.",
                      )
                    : t(
                        "product_name is shown for reference — the row is resolved by product_code.",
                      )}
                </li>
                <li>
                  {t(
                    "Rows matching an existing line (by product_code + vendor_code) will update that line — no duplicates are created.",
                  )}
                </li>
                <li>{t("Accepts .xlsx, .xls or .csv files.")}</li>
              </ol>
            </Alert>

            <Button
              color="outline-primary"
              size="sm"
              className="mb-2"
              onClick={handleDownloadSample}
              disabled={sampleLoading}
            >
              {sampleLoading ? (
                <>
                  <Spinner size="sm" className="me-50" /> {t("Downloading…")}
                </>
              ) : (
                <>
                  <Download size={14} className="me-50" />
                  {t("Download Sample Excel")}
                </>
              )}
            </Button>

            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="form-control"
              />
              {file && (
                <small className="text-muted mt-50 d-block">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </small>
              )}
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div>
            <div className="d-flex gap-2 mb-2 flex-wrap">
              <Badge className="doc-badge doc-badge-green">
                {preview.summary.new} {t("New")}
              </Badge>
              <Badge className="doc-badge doc-badge-orange">
                {preview.summary.updated} {t("Updated")}
              </Badge>
              {preview.summary.skipped > 0 && (
                <Badge className="doc-badge doc-badge-gray">
                  {preview.summary.skipped} {t("Skipped")}
                </Badge>
              )}
              {preview.summary.warnings > 0 && (
                <Badge className="doc-badge doc-badge-orange">
                  {preview.summary.warnings} {t("Warnings")}
                </Badge>
              )}
              {preview.summary.errors > 0 && (
                <Badge className="doc-badge doc-badge-red">
                  {preview.summary.errors} {t("Errors")}
                </Badge>
              )}
              <Badge className="doc-badge doc-badge-gray">
                {preview.summary.total} {t("Total")}
              </Badge>
            </div>

            {validRows.length === 0 ? (
              <Alert color="warning" className="mb-2">
                {t("No valid rows to import.")}
              </Alert>
            ) : (
              <Alert
                color="success"
                className="mb-2 p-2 d-flex align-items-center"
              >
                <CheckCircle size={18} className="me-1 flex-shrink-0" />
                {t(
                  "{{n}} row(s) ready to import — matches on product + vendor will update; the rest will be appended.",
                  { n: validRows.length },
                )}
              </Alert>
            )}

            {noisyRows.length > 0 && (
              <div style={{ maxHeight: 360, overflow: "auto" }}>
                <Table size="sm" striped bordered responsive>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t("Status")}</th>
                      <th>{t("Product")}</th>
                      <th>{t("Vendor")}</th>
                      <th>{t("Details")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownNoisy.map((r) => (
                      <tr
                        key={r.rowNum}
                        className={r.status === "error" ? "table-danger" : ""}
                      >
                        <td>{r.rowNum}</td>
                        <td>
                          <Badge
                            className={
                              STATUS_BADGE[r.status] ||
                              "doc-badge doc-badge-gray"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="small">
                          <div>{r.data?.product_code || "—"}</div>
                          {r.data?.product_name ? (
                            <div className="text-muted">
                              {r.data.product_name}
                            </div>
                          ) : null}
                        </td>
                        <td className="small">{r.data?.vendor_code || "—"}</td>
                        <td className="small">
                          {r.errors?.length ? (
                            <div className="text-danger">
                              {r.errors.join("; ")}
                            </div>
                          ) : null}
                          {r.warnings?.length ? (
                            <div className="text-warning">
                              {r.warnings.join("; ")}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {hiddenNoisy > 0 && (
                  <div className="text-muted small text-center py-1">
                    {t(
                      "…and {{n}} more row(s) with notices — they'll still import where valid.",
                      { n: hiddenNoisy },
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 1 && (
          <>
            <Button color="secondary" outline onClick={handleClose}>
              {t("Cancel")}
            </Button>
            <Button
              color="primary"
              onClick={handlePreview}
              disabled={!file || loading}
            >
              {loading ? <Spinner size="sm" /> : t("Upload & Preview")}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button
              color="secondary"
              outline
              onClick={() => {
                setStep(1);
                setPreview(null);
              }}
            >
              {t("Back")}
            </Button>
            <Button
              color="primary"
              onClick={handleConfirm}
              disabled={!validRows.length}
            >
              {`${t("Confirm Import")} (${validRows.length})`}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default LineItemImportModal;
