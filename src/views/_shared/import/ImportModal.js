// Shared 2-step (upload → preview → confirm) importer used by every
// server-side Excel/CSV import (products, vendors, categories, employees,
// attendance, price-list). It owns the invariant flow — file pick +
// validation, sample download, preview/confirm POSTs, toasts, and the footer
// — while each module supplies the parts that genuinely differ as props:
// the instructions block, endpoints, and the step-2 preview body.
//
// Props:
//   isOpen, toggle, onSuccess           – standard modal wiring
//   title                               – step-1 header
//   reviewTitle                         – step-2 header (default "Review Import Data")
//   importUrl                           – base import endpoint (POST)
//   sampleUrl                           – sample-download endpoint (GET, blob)
//   sampleFilename                      – downloaded file name
//   sampleLabel                         – sample button text (default "Download Sample Excel")
//   previewQuery                        – extra query appended AFTER "?preview=true" (starts with "&")
//   confirmQuery                        – full query appended to importUrl on confirm (starts with "?")
//   sampleQuery                         – full query appended to sampleUrl (starts with "?")
//   instructions                        – node rendered inside the step-1 info Alert (the <ol>)
//   renderPreview(preview)              – node for the entire step-2 body (badges + tables)
//   computeValidCount(summary)          – how many rows are importable (default new + update)
//   confirmLabel(n)                     – confirm button text (default "Confirm Import (n)")
//   formatSuccess(data, resp)           – {title,text,type} toast on confirm (default uses resp.message)

import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner,
} from "reactstrap";
import { AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";
import instance from "@src/utility/AxiosConfig";
import Notification from "@components/toast/notification";

// Richest error extractor across all callers (attendance/employees surface an
// errorStack) — a superset that is safe for the simpler modules too.
const errMsg = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.data?.errorStack?.split("\n")?.[0] ||
  err?.message ||
  fallback;

const ImportModal = ({
  isOpen,
  toggle,
  onSuccess,
  title,
  reviewTitle,
  importUrl,
  sampleUrl,
  sampleFilename,
  sampleLabel,
  previewQuery = "",
  confirmQuery = "",
  sampleQuery = "",
  instructions = null,
  extraUpload = null,
  renderPreview,
  computeValidCount = (s) => (s?.valid_new || 0) + (s?.valid_update || 0),
  confirmLabel,
  formatSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1=upload, 2=preview
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  // A file the server could not read at all (no header row, no data rows,
  // wrong file type, too many rows). Shown in place on step 1 rather than only
  // as a toast, because the fix is to go and edit the sheet — the user needs to
  // still be looking at the reason while they do it.
  const [fileError, setFileError] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setPreview(null);
    setFileError(null);
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
    setFileError(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setFileError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await instance.post(
        `${importUrl}?preview=true${previewQuery}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res?.data?.data?.fileError) {
        // The file itself is unusable — stay on step 1 so the reason sits next
        // to the file picker they are about to use again.
        setFileError(res.data.data.fileError);
      } else if (res?.data?.statusCode === 200) {
        setPreview(res.data.data);
        setStep(2);
      } else {
        setFileError(res?.data?.message || t("Preview failed"));
      }
    } catch (err) {
      setFileError(errMsg(err, t("Preview failed")));
      Notification("Error", errMsg(err, t("Preview failed")), "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await instance.post(`${importUrl}${confirmQuery}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.data?.fileError) {
        setStep(1);
        setFileError(res.data.data.fileError);
      } else if (res?.data?.statusCode === 200) {
        const spec = formatSuccess
          ? formatSuccess(res.data.data || {}, res.data)
          : {
              title: "Success",
              text: res?.data?.message || t("Import complete"),
              type: "success",
            };
        Notification(spec.title, spec.text, spec.type);
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        Notification(
          "Error",
          res?.data?.message || t("Import failed"),
          "warning"
        );
      }
    } catch (err) {
      Notification("Error", errMsg(err, t("Import failed")), "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    setSampleLoading(true);
    try {
      const res = await instance.get(`${sampleUrl}${sampleQuery}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = sampleFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to download sample"), "warning");
    } finally {
      setSampleLoading(false);
    }
  };

  const validCount = computeValidCount(preview?.summary);
  const confirmText = confirmLabel
    ? confirmLabel(validCount)
    : `${t("Confirm Import")} (${validCount})`;

  return (
    <Modal
      isOpen={isOpen}
      toggle={handleClose}
      size="lg"
      centered
      scrollable
      backdrop="static"
      keyboard={false}
    >
      <ModalHeader toggle={handleClose}>
        {step === 1 && title}
        {step === 2 && (reviewTitle || t("Review Import Data"))}
      </ModalHeader>
      <ModalBody>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            {fileError && (
              <Alert color="danger" className="mb-2">
                <div className="d-flex">
                  <AlertTriangle size={18} className="me-1 flex-shrink-0 mt-25" />
                  <div>
                    <strong className="d-block">
                      {t("This file could not be imported")}
                    </strong>
                    {fileError}
                  </div>
                </div>
              </Alert>
            )}
            <Alert color="info" className="mb-2">
              <strong>{t("Instructions")}:</strong>
              {instructions}
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
                sampleLabel || t("Download Sample Excel")
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
            {extraUpload}
          </div>
        )}

        {/* Step 2: Preview — each module renders its own body */}
        {step === 2 && preview && renderPreview && renderPreview(preview)}
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
              disabled={loading || validCount === 0}
            >
              {loading ? <Spinner size="sm" /> : confirmText}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ImportModal;
