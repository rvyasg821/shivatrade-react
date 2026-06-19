import { useState } from "react";
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Badge, Alert, Spinner, Table,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const AttendanceImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setPreview(null);
    setResult(null);
  };

  const handleClose = () => { reset(); toggle(); };

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
      const res = await instance.post(`${API_ENDPOINTS.attendance.import}?preview=true`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.statusCode === 200) {
        setPreview(res.data.data);
        setStep(2);
      } else {
        Notification("Error", res?.data?.message || "Preview failed", "warning");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.data?.errorStack?.split('\n')?.[0] || err?.message || "Preview failed";
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
      const res = await instance.post(API_ENDPOINTS.attendance.import, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.statusCode === 200) {
        const data = res.data.data;
        setResult(data);
        setStep(3);
        const created = data?.created || 0;
        const updated = data?.updated || 0;
        Notification("Success", `Import complete: ${created} created, ${updated} updated`, "success");
        if (onSuccess) onSuccess();
        // Auto-close after showing results
        setTimeout(() => { reset(); toggle(); }, 2000);
      } else {
        Notification("Error", res?.data?.message || "Import failed", "warning");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.data?.errorStack?.split('\n')?.[0] || err?.message || "Import failed";
      Notification("Error", msg, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await instance.get(API_ENDPOINTS.attendance.sampleCsv, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance-import-sample.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to download sample"), "warning");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} size="lg" centered scrollable backdrop="static" keyboard={false}>
      <ModalHeader toggle={handleClose}>
        {step === 1 && t("Import Attendance")}
        {step === 2 && t("Review Attendance Data")}
        {step === 3 && t("Import Results")}
      </ModalHeader>
      <ModalBody>
        {step === 1 && (
          <div>
            <Alert color="info" className="mb-2">
              <strong>{t("Instructions")}:</strong>
              <ol className="mb-0 mt-1">
                <li>{t("Download the sample CSV to see the required format")}</li>
                <li>{t("Use employee_code to identify employees")}</li>
                <li>{t("Date format: YYYY-MM-DD, Time format: HH:MM (24h)")}</li>
                <li>{t("Valid statuses: present, absent, half_day (on_leave and holiday for past dates only)")}</li>
                <li>{t("Late arrivals: use status 'present' — the system flags late automatically, or use 'late' which converts to present + late flag")}</li>
                <li>{t("If a record exists for the same employee+date, it will be updated")}</li>
              </ol>
            </Alert>
            <Button color="outline-primary" size="sm" className="mb-2" onClick={handleDownloadSample}>
              {t("Download Sample CSV")}
            </Button>
            <div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="form-control" />
              {file && <small className="text-muted mt-50 d-block">{file.name} ({(file.size / 1024).toFixed(1)} KB)</small>}
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div>
            <div className="d-flex gap-2 mb-2">
              <Badge className="doc-badge doc-badge-green">{preview.summary.valid_new} {t("New")}</Badge>
              <Badge className="doc-badge doc-badge-orange">{preview.summary.valid_update} {t("Update")}</Badge>
              <Badge className="doc-badge doc-badge-red">{preview.summary.errors} {t("Errors")}</Badge>
              <Badge className="doc-badge doc-badge-gray">{preview.summary.total} {t("Total")}</Badge>
            </div>
            <div style={{ maxHeight: "400px", overflow: "auto" }}>
              <Table size="sm" striped bordered responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("Status")}</th>
                    <th>{t("Employee")}</th>
                    <th>{t("Date")}</th>
                    <th>{t("In")}</th>
                    <th>{t("Out")}</th>
                    <th>{t("Break")}</th>
                    <th>{t("Att. Status")}</th>
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
                      <td className="small">{row.data.employee_name || row.data.employee_code}</td>
                      <td className="small">{row.data.date}</td>
                      <td className="small">{row.data.clock_in || "—"}</td>
                      <td className="small">{row.data.clock_out || "—"}</td>
                      <td className="small">{row.data.break_minutes || 0}</td>
                      <td className="small">{row.data.status}</td>
                      <td className="small text-danger">{row.errors?.join(", ") || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            <Alert color="success">
              <strong>{t("Import Complete")}!</strong>
              <div className="mt-1">
                <div>{t("Created")}: <strong>{result.created}</strong></div>
                <div>{t("Updated")}: <strong>{result.updated}</strong></div>
                {result.errors?.length > 0 && <div className="text-danger">{t("Errors")}: <strong>{result.errors.length}</strong></div>}
              </div>
            </Alert>
            {result.errors?.length > 0 && (
              <Table size="sm" bordered>
                <thead><tr><th>{t("Row")}</th><th>{t("Error")}</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}><td>{e.row}</td><td className="text-danger small">{e.message}</td></tr>
                  ))}
                </tbody>
              </Table>
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
            <Button color="primary" onClick={handleConfirm} disabled={loading || (preview?.summary?.valid_new + preview?.summary?.valid_update) === 0}>
              {loading ? <Spinner size="sm" /> : t(`Confirm Import (${(preview?.summary?.valid_new || 0) + (preview?.summary?.valid_update || 0)} rows)`)}
            </Button>
          </>
        )}
        {step === 3 && (
          <Button color="primary" onClick={handleClose}>{t("Close")}</Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default AttendanceImportModal;
