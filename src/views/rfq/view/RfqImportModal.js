// Two-step vendor price import for the (single-vendor) RFQ.
//   Step 1: upload the vendor's returned Excel → Upload & Preview
//   Step 2: review the parsed rows (valid / errors) → Confirm Import
// The vendor is the RFQ's vendor (passed in) — no picker.

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
  Label,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const RfqImportModal = ({
  isOpen,
  toggle,
  vendorId = "",
  vendorLabel = "",
  rfqId = "",
  onImported,
}) => {
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

  const post = (isPreview) => {
    const form = new FormData();
    form.append("file", file);
    // Pass rfq_id so the backend stamps imported price-list rows with
    // source_type='rfq' (provenance back to this RFQ).
    const qs =
      `?vendor_id=${vendorId}` +
      (rfqId ? `&rfq_id=${rfqId}` : "") +
      (isPreview ? "&preview=true" : "");
    return instance.post(
      `${API_ENDPOINTS.rfq.importVendorPrices}${qs}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  };

  const handlePreview = async () => {
    if (!vendorId || !file) return;
    setLoading(true);
    try {
      const res = await post(true);
      if (res?.data?.statusCode === 200 || res?.data?.data) {
        setPreview(res.data.data);
        setStep(2);
      } else {
        Notification("Error", res?.data?.message || t("Preview failed"), "warning");
      }
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || err?.message || t("Preview failed"),
        "warning"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!vendorId || !file) return;
    setLoading(true);
    try {
      const res = await post(false);
      const data = res?.data?.data || {};
      const rows = data.rows || [];
      Notification(
        "Success",
        `${rows.length} ${t("prices imported")}${
          data.errors?.length ? ` · ${data.errors.length} ${t("error rows")}` : ""
        }`,
        data.errors?.length ? "warning" : "success"
      );
      if (onImported) onImported(vendorId, rows);
      handleClose();
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || err?.message || t("Import failed"),
        "warning"
      );
    } finally {
      setLoading(false);
    }
  };

  const s = preview?.summary || {};
  const validCount = (s.valid_new || 0) + (s.valid_update || 0);
  const errorRows = (preview?.rows || []).filter((r) => r.status === "error");

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg" centered scrollable backdrop="static" keyboard={false}>
      <ModalHeader toggle={handleClose}>
        {step === 1 ? t("Import Vendor Prices") : t("Review Import Data")}
      </ModalHeader>
      <ModalBody>
        {step === 1 && (
          <div>
            <Alert color="info" className="mb-2">
              {t(
                "Upload this vendor's returned Excel. Prices are matched to products by product code; the file's vendor column is ignored."
              )}
            </Alert>
            <div className="mb-2">
              <Label className="form-label">{t("Vendor")}</Label>
              <div className="fw-semibold">{vendorLabel || "-"}</div>
            </div>
            <div>
              <Label className="form-label">{t("Excel file")}</Label>
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
              <Badge color="light-success">
                {s.valid_new || 0} {t("New")}
              </Badge>
              <Badge color="light-warning">
                {s.valid_update || 0} {t("Update")}
              </Badge>
              <Badge color="light-danger">
                {s.errors || 0} {t("Errors")}
              </Badge>
              <Badge color="light-secondary">
                {s.total || 0} {t("Total")}
              </Badge>
            </div>
            {errorRows.length > 0 && (
              <Alert color="warning" className="mb-2">
                {t(
                  "Rows marked Error will be skipped. New rows are added to the price list; Update rows replace an existing price for the same vendor, product and date."
                )}
              </Alert>
            )}
            {errorRows.length === 0 && (
              <Alert
                color="success"
                className="mb-2 p-2 d-flex align-items-center"
              >
                <CheckCircle size={18} className="me-1 flex-shrink-0" />
                {t("All rows are valid and ready to import.")}
              </Alert>
            )}
            {/* Full per-row review: every entry with its computed action
                (New / Update / Error) checked against the price list. */}
            <div style={{ maxHeight: "400px", overflow: "auto" }}>
              <Table size="sm" bordered responsive className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("Product")}</th>
                    <th>{t("Price")}</th>
                    <th>{t("Action")}</th>
                    <th>{t("Details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview?.rows || []).map((row) => {
                    const cfg =
                      row.status === "valid_new"
                        ? { rowCls: "", color: "light-success", label: "New" }
                        : row.status === "valid_update"
                        ? { rowCls: "", color: "light-warning", label: "Update" }
                        : { rowCls: "table-danger", color: "light-danger", label: "Error" };
                    const notes =
                      row.errors?.length
                        ? row.errors.join(", ")
                        : (row.warnings || []).join(", ");
                    return (
                      <tr key={row.rowNum} className={cfg.rowCls}>
                        <td>{row.rowNum}</td>
                        <td className="small">{row.data?.product_code || "—"}</td>
                        <td className="small">{row.data?.unit_price || "—"}</td>
                        <td>
                          <Badge color={cfg.color}>{t(cfg.label)}</Badge>
                        </td>
                        <td
                          className={`small ${
                            row.errors?.length ? "text-danger" : "text-muted"
                          }`}
                        >
                          {notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 1 ? (
          <>
            <Button color="secondary" outline onClick={handleClose}>
              {t("Cancel")}
            </Button>
            <Button
              color="primary"
              onClick={handlePreview}
              disabled={!vendorId || !file || loading}
            >
              {loading ? <Spinner size="sm" /> : t("Upload & Preview")}
            </Button>
          </>
        ) : (
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

export default RfqImportModal;
