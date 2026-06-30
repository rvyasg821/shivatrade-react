// ── Invoice Line Items — Import (Step 3 of the Invoice form) ─────────
// This is a NARROW power-user shortcut, not a generic importer:
//   1. Operator clicks Export → gets the current draft as an .xlsx.
//   2. Edits hsn / desc / customer_reference / qty / uqc / unit_price /
//      igst_rate_pct / discount_pct / rebate codes / expense codes.
//      product_code, product_name, line_total are display-only.
//   3. Uploads → BE validates against the bound Sales Order using the
//      same dispatched/available rules that gate the Add-from-SO popup.
// No "Download Sample" button — the export IS the template.

import { Fragment, useMemo, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Table,
  Badge,
} from "reactstrap";
import { AlertTriangle, CheckCircle, Upload } from "react-feather";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

// Headers we expect from the export. The sheet repeats "rebate" and
// "expense" headers (mirroring the product master template); these are
// collapsed into arrays before posting to the BE.
const parseSheet = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName =
    wb.SheetNames.find((s) => s.toLowerCase() === "lineitems") ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: true,
  });
  if (!aoa.length) return [];
  const headers = aoa[0].map((c) => String(c ?? "").trim());

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
    if (
      !r ||
      r.every((c) => c === "" || c === null || c === undefined)
    ) {
      continue;
    }
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

const StatusBadge = ({ status }) => {
  const map = {
    new: { color: "primary", label: "New" },
    updated: { color: "info", label: "Update" },
    skipped: { color: "warning", label: "Skipped" },
    error: { color: "danger", label: "Error" },
  };
  const s = map[status] || { color: "secondary", label: status };
  return <Badge color={`light-${s.color}`}>{s.label}</Badge>;
};

const InvoiceLineImportModal = ({
  isOpen,
  toggle,
  purchaseOrderId,
  invoiceId,
  draftLines = [],
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setLoading(false);
  };
  const close = () => {
    reset();
    toggle();
  };

  const validRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (r) => r.status === "new" || r.status === "updated",
      ),
    [preview],
  );

  // Rows worth showing — anything that's not a clean new/updated row
  // benefits from a per-row diagnostic table. Pure-success previews
  // collapse to the summary chips + CTA.
  const noisyRows = useMemo(
    () =>
      (preview?.rows || []).filter(
        (r) =>
          r.status === "skipped" ||
          r.status === "error" ||
          (r.warnings && r.warnings.length > 0),
      ),
    [preview],
  );

  const handlePreview = async () => {
    if (!file || !purchaseOrderId) return;
    setLoading(true);
    try {
      const rows = await parseSheet(file);
      if (!rows.length) {
        Notification(
          "Error",
          t("The file has no data rows."),
          "warning",
        );
        setLoading(false);
        return;
      }
      const resp = await instance.post(API_ENDPOINTS.invoices.linesResolve, {
        purchase_order_id: purchaseOrderId,
        invoice_id: invoiceId || undefined,
        rows,
        // Send the form's current draft so new-vs-updated is computed against
        // what the merge will actually target (not just the saved invoice).
        draft_lines: (draftLines || []).map((l) => ({
          _id: l._id,
          product_code: l.product_code,
          purchase_order_line_id: l.purchase_order_line_id,
          qty: l.qty,
        })),
      });
      const sc = resp?.data?.statusCode;
      if (sc === 200 || sc === 201) {
        setPreview(resp.data.data);
        setStep(2);
      } else {
        Notification(
          "Error",
          resp?.data?.message ||
            t("We couldn't read this file — please re-export and try again."),
          "warning",
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("We couldn't read this file — please re-export and try again.");
      Notification("Error", msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!validRows.length) return;
    onConfirm(validRows);
    close();
  };

  return (
    <Modal isOpen={isOpen} toggle={close} size="lg" centered scrollable>
      <ModalHeader toggle={close}>
        {step === 1 && t("Import line items from Excel")}
        {step === 2 && t("Review import")}
      </ModalHeader>
      <ModalBody>
        {step === 1 && (
          <Fragment>
            <div
              className="mb-3 p-2 rounded"
              style={{
                background: "#f5f7fb",
                border: "1px solid #e3e7ef",
              }}
            >
              <div className="fw-semibold mb-1">{t("How this works")}</div>
              <ol className="mb-0 ps-3 small">
                <li>
                  {t(
                    "Click Export to download the current line items as Excel.",
                  )}
                </li>
                <li>
                  {t(
                    "Edit HSN, description, buyer requirement, qty, UQC, unit price, GST %, discount %, and rebate / expense codes.",
                  )}
                </li>
                <li>
                  {t(
                    "Product code, product name and line total are reference only — changes there are ignored.",
                  )}
                </li>
                <li>
                  {t(
                    "Save the file, then upload it here. Only Sales Order lines with stock still available to invoice are accepted.",
                  )}
                </li>
              </ol>
            </div>
            <div className="mb-2">
              <label className="form-label">{t("Choose Excel file")}</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </Fragment>
        )}

        {step === 2 && preview && (
          <Fragment>
            <div className="d-flex flex-wrap gap-1 mb-2">
              <Badge color="light-primary">
                {t("Total")}: {preview.summary.total}
              </Badge>
              <Badge color="light-primary">
                {t("New")}: {preview.summary.new}
              </Badge>
              <Badge color="light-info">
                {t("Updates")}: {preview.summary.updated}
              </Badge>
              <Badge color="light-warning">
                {t("Skipped")}: {preview.summary.skipped}
              </Badge>
              <Badge color="light-danger">
                {t("Errors")}: {preview.summary.errors}
              </Badge>
              <Badge color="light-warning">
                {t("Warnings")}: {preview.summary.warnings}
              </Badge>
            </div>

            {noisyRows.length === 0 && validRows.length > 0 && (
              <div className="alert alert-success small d-flex align-items-center gap-1 p-2">
                <CheckCircle size={14} />
                {t("{{n}} row(s) ready to apply.", {
                  n: validRows.length,
                })}
              </div>
            )}

            {noisyRows.length > 0 && (
              <Table responsive size="sm" bordered className="align-top mb-2">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 60 }}>{t("Row")}</th>
                    <th style={{ width: 110 }}>{t("Status")}</th>
                    <th style={{ width: 200 }}>{t("Product")}</th>
                    <th>{t("Details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {noisyRows.map((r) => (
                    <tr key={r.rowNum}>
                      <td>{r.rowNum}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="small">
                        <div>{r.data?.product_code || "—"}</div>
                        {r.data?.product_name ? (
                          <div className="text-muted">
                            {r.data.product_name}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {r.errors?.length > 0 && (
                          <div className="text-danger small">
                            <AlertTriangle size={12} className="me-50" />
                            {r.errors.join(" · ")}
                          </div>
                        )}
                        {r.warnings?.length > 0 && (
                          <div className="text-warning small">
                            {r.warnings.join(" · ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Fragment>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 1 && (
          <Fragment>
            <Button color="secondary" outline onClick={close}>
              {t("Cancel")}
            </Button>
            <Button
              color="primary"
              onClick={handlePreview}
              disabled={!file || loading || !purchaseOrderId}
            >
              {loading ? (
                <Spinner size="sm" className="me-50" />
              ) : (
                <Upload size={14} className="me-50" />
              )}
              {loading ? t("Previewing…") : t("Preview")}
            </Button>
          </Fragment>
        )}
        {step === 2 && (
          <Fragment>
            <Button color="secondary" outline onClick={() => setStep(1)}>
              {t("Back")}
            </Button>
            <Button
              color="primary"
              onClick={handleConfirm}
              disabled={validRows.length === 0}
            >
              {t("Apply {{n}} row(s)", { n: validRows.length })}
            </Button>
          </Fragment>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default InvoiceLineImportModal;
