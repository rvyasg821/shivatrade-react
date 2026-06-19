import { useState } from "react";
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
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const ImportModal = ({ isOpen, toggle, onSuccess, vendorId }) => {
  // Vendor-scoped imports (vendor detail page) skip the vendor_code column —
  // the vendor is already known from page context. The backend mirrors this
  // by treating vendor_code as optional when vendor_id is supplied.
  const vendorQS = vendorId ? `&vendor_id=${vendorId}` : "";
  const vendorQSStart = vendorId ? `?vendor_id=${vendorId}` : "";
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1=upload, 2=preview
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await instance.post(
        `${API_ENDPOINTS.priceList.import}?preview=true${vendorQS}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
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

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await instance.post(
        `${API_ENDPOINTS.priceList.import}${vendorQSStart}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (res?.data?.statusCode === 200) {
        Notification(
          "Success",
          res?.data?.message || t("Import complete"),
          "success",
        );
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        Notification(
          "Error",
          res?.data?.message || t("Import failed"),
          "warning",
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || t("Import failed");
      Notification("Error", msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await instance.get(
        `${API_ENDPOINTS.priceList.sampleExcel}${vendorQSStart}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "price-list-import-sample.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to download sample"), "warning");
    }
  };

  const validCount =
    (preview?.summary?.valid_new || 0) + (preview?.summary?.valid_update || 0);

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg" centered scrollable backdrop="static" keyboard={false}>
      <ModalHeader toggle={handleClose}>
        {step === 1 && t("Import Price List")}
        {step === 2 && t("Review Import Data")}
      </ModalHeader>
      <ModalBody>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <Alert color="info" className="mb-2">
              <strong>{t("Instructions")}:</strong>
              <ol className="mb-0 mt-1">
                <li>
                  {t(
                    "Download the sample Excel to see the required format",
                  )}
                </li>
                <li>
                  {vendorId
                    ? t("Required columns: product_code, unit_price")
                    : t(
                        "Required columns: vendor_code, product_code, unit_price",
                      )}
                </li>
                <li>
                  {vendorId
                    ? t(
                        "A row is skipped if its product_code or unit_price is missing or not found",
                      )
                    : t(
                        "A row is skipped if its vendor_code, product_code or unit_price is missing or not found",
                      )}
                </li>
                <li>
                  {t(
                    "Currency: blank or unknown code falls back to your company's default currency",
                  )}
                </li>
                <li>
                  {t(
                    "Effective Date: blank defaults to today. Use DD/MM/YY (e.g. 14/05/26) or YYYY-MM-DD",
                  )}
                </li>
                <li>
                  {t(
                    "If Valid Until is set, Effective Date must be provided — otherwise the row is skipped",
                  )}
                </li>
                <li>
                  {t(
                    "A matching vendor + product + effective date updates the existing entry; otherwise a new one is created",
                  )}
                </li>
                <li>{t("Accepts .xlsx, .xls or .csv files (max 5 MB)")}</li>
              </ol>
            </Alert>
            <Button
              color="outline-primary"
              size="sm"
              className="mb-2"
              onClick={handleDownloadSample}
            >
              {t("Download Sample Excel")}
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

        {/* Step 2: Preview */}
        {step === 2 && preview && (
          <div>
            <div className="d-flex gap-2 mb-2 flex-wrap">
              <Badge className="doc-badge doc-badge-green">
                {preview.summary.valid_new} {t("New")}
              </Badge>
              <Badge className="doc-badge doc-badge-orange">
                {preview.summary.valid_update} {t("Update")}
              </Badge>
              <Badge className="doc-badge doc-badge-red">
                {preview.summary.errors} {t("Errors")}
              </Badge>
              {preview.summary.warnings > 0 && (
                <Badge className="doc-badge doc-badge-orange">
                  {preview.summary.warnings} {t("Warnings")}
                </Badge>
              )}
              <Badge className="doc-badge doc-badge-gray">
                {preview.summary.total} {t("Total")}
              </Badge>
            </div>
            {preview.summary.warnings > 0 && (
              <Alert color="warning" className="mb-2">
                <strong>
                  {t(
                    "Some currencies were not found — the company default was used instead",
                  )}
                  :
                </strong>
                <ul
                  className="mb-0 mt-1"
                  style={{ maxHeight: "120px", overflow: "auto" }}
                >
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
                  {t(
                    "The following rows have errors and will be skipped. Fix them and re-upload, or continue to import only the valid rows.",
                  )}
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
                            <td className="small">
                              {row.data.vendor_code || "—"}
                            </td>
                            <td className="small">
                              {row.data.product_code || "—"}
                            </td>
                            <td className="small">
                              {row.data.unit_price || "—"}
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
              disabled={loading || validCount === 0}
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                `${t("Confirm Import")} (${validCount})`
              )}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ImportModal;
