import { useState } from "react";
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Badge, Alert, Spinner, Table, FormGroup, Label, Input,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const ImportModal = ({ isOpen, toggle, onSuccess, locationId }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1=upload, 2=preview
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setPreview(null);
    setSendWelcomeEmail(true);
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
      const locParam = locationId ? `&location_id=${locationId}` : '';
      const res = await instance.post(`${API_ENDPOINTS.employees.import}?preview=true${locParam}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.statusCode === 200) {
        setPreview(res.data.data);
        setStep(2);
      } else {
        Notification("Error", res?.data?.message || "Preview failed", "warning");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Preview failed";
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
      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId);
      if (sendWelcomeEmail) params.append('send_email', 'true');
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await instance.post(`${API_ENDPOINTS.employees.import}${queryStr}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.statusCode === 200) {
        const data = res.data.data || {};
        const created = data.created || 0;
        const updated = data.updated || 0;
        const failed = data.errors?.length || 0;
        Notification(
          failed ? "Warning" : "Success",
          t(`Import complete: ${created} created, ${updated} updated`) + (failed ? t(`, ${failed} failed`) : ""),
          failed ? "warning" : "success"
        );
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        Notification("Error", res?.data?.message || "Import failed", "warning");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Import failed";
      Notification("Error", msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await instance.get(API_ENDPOINTS.employees.sampleCsv, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "employee-import-sample.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to download sample"), "warning");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg" centered scrollable backdrop="static" keyboard={false}>
      <ModalHeader toggle={handleClose}>
        {step === 1 && t("Import Employees")}
        {step === 2 && t("Review Import Data")}
      </ModalHeader>
      <ModalBody>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <Alert color="info" className="mb-2">
              <strong>{t("Instructions")}:</strong>
              <ol className="mb-0 mt-1">
                <li>{t("Download the sample Excel to see the required format")}</li>
                <li>{t("Required: first_name, last_name, email, gender, role, location, designation, department, date_of_joining")}</li>
                <li>{t("Dates must use YYYY-MM-DD format (e.g. 2026-07-01) — avoids Excel's DD/MM vs MM/DD confusion")}</li>
                <li>{t("If employee_code or email matches an existing employee, the record will be updated")}</li>
                <li>{t("role, location, designation and department must match a value from the 'Reference' sheet — unknown values are rejected")}</li>
              </ol>
            </Alert>
            <Button color="outline-primary" size="sm" className="mb-2" onClick={handleDownloadSample}>
              {t("Download Sample Excel")}
            </Button>
            <div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="form-control" />
              {file && <small className="text-muted mt-50 d-block">{file.name} ({(file.size / 1024).toFixed(1)} KB)</small>}
            </div>
            {/* Hidden: "Send welcome email with login credentials" toggle.
                Kept in code (reversible) — sendWelcomeEmail state still drives
                the send_email flag on confirm. */}
            {/* <FormGroup check className="mt-2">
              <Input type="checkbox" id="send-welcome-email" checked={sendWelcomeEmail} onChange={(e) => setSendWelcomeEmail(e.target.checked)} />
              <Label check for="send-welcome-email">{t("Send welcome email with login credentials to new employees")}</Label>
              <small className="text-muted d-block">{t("Default password: Welcome@123. Only sent for newly created employees, not updates.")}</small>
            </FormGroup> */}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && preview && (
          <div>
            <div className="d-flex gap-2 mb-2">
              <Badge className="doc-badge doc-badge-green">{preview.summary.valid_new} {t("New")}</Badge>
              <Badge className="doc-badge doc-badge-orange">{preview.summary.valid_update} {t("Update")}</Badge>
              <Badge className="doc-badge doc-badge-red">{preview.summary.errors} {t("Errors")}</Badge>
              <Badge className="doc-badge doc-badge-gray">{preview.summary.total} {t("Total")}</Badge>
            </div>
            {/* Only surface the row-level table when there are errors to review.
                When everything is valid, the summary badges are enough. */}
            {preview.summary.errors > 0 ? (
              <div style={{ maxHeight: "400px", overflow: "auto" }}>
                <Table size="sm" striped bordered responsive>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t("Status")}</th>
                      <th>{t("Email")}</th>
                      <th>{t("Name")}</th>
                      <th>{t("Code")}</th>
                      <th>{t("Designation")}</th>
                      <th>{t("Details")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowNum} className={row.status === "error" ? "table-danger" : row.status === "valid_update" ? "table-warning" : ""}>
                        <td>{row.rowNum}</td>
                        <td>
                          {row.status === "valid_new" && <Badge className="doc-badge doc-badge-green">{t("New")}</Badge>}
                          {row.status === "valid_update" && <Badge className="doc-badge doc-badge-orange">{t("Update")}</Badge>}
                          {row.status === "error" && <Badge className="doc-badge doc-badge-red">{t("Error")}</Badge>}
                        </td>
                        <td className="small">{row.data.email}</td>
                        <td className="small">{row.data.first_name} {row.data.last_name}</td>
                        <td className="small">{row.data.employee_code || "—"}</td>
                        <td className="small">{row.data.designation || "—"}</td>
                        <td className="small text-danger">{row.errors?.join(", ") || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert color="success" className="mb-0 p-2">
                {t("All rows are valid and ready to import.")}
              </Alert>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 1 && (
          <>
            <Button color="secondary" outline onClick={handleClose}>{t("Cancel")}</Button>
            <Button color="primary" onClick={handlePreview} disabled={!file || loading}>
              {loading ? <Spinner size="sm" /> : t("Upload & Preview")}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button color="secondary" outline onClick={() => { setStep(1); setPreview(null); }}>{t("Back")}</Button>
            <Button color="primary" onClick={handleConfirm} disabled={loading || preview?.summary?.valid_new + preview?.summary?.valid_update === 0}>
              {loading ? <Spinner size="sm" /> : t(`Confirm Import (${(preview?.summary?.valid_new || 0) + (preview?.summary?.valid_update || 0)} rows)`)}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ImportModal;
