import { useState } from "react";
import { Badge, Alert, Table, FormGroup, Label, Input } from "reactstrap";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const ImportModal = ({ isOpen, toggle, onSuccess, locationId }) => {
  const { t } = useTranslation();
  // Default OFF — welcome emails are not sent unless the (currently hidden)
  // toggle below is re-enabled and checked.
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);

  const previewQuery = locationId ? `&location_id=${locationId}` : "";
  const confirmQuery = (() => {
    const params = new URLSearchParams();
    if (locationId) params.append("location_id", locationId);
    if (sendWelcomeEmail) params.append("send_email", "true");
    return params.toString() ? `?${params.toString()}` : "";
  })();

  // Hidden (reversible): the "Send welcome email" toggle. sendWelcomeEmail
  // stays true by default so send_email=true is always sent. To re-enable,
  // uncomment this block and pass `extraUpload={extraUpload}` to the modal.
  // const extraUpload = (
  //   <FormGroup check className="mt-2">
  //     <Input
  //       type="checkbox"
  //       id="send-welcome-email"
  //       checked={sendWelcomeEmail}
  //       onChange={(e) => setSendWelcomeEmail(e.target.checked)}
  //     />
  //     <Label check for="send-welcome-email">
  //       {t("Send welcome email with login credentials to new employees")}
  //     </Label>
  //     <small className="text-muted d-block">
  //       {t("Default password: Welcome@123. Only sent for newly created employees, not updates.")}
  //     </small>
  //   </FormGroup>
  // );

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample Excel to see the required format")}</li>
      <li>{t("Required: first_name, last_name, email, gender, role, location, designation, department, date_of_joining")}</li>
      <li>{t("Dates must use YYYY-MM-DD format (e.g. 2026-07-01) — avoids Excel's DD/MM vs MM/DD confusion")}</li>
      <li>{t("If employee_code or email matches an existing employee, the record will be updated")}</li>
      <li>{t("role, location, designation and department must match a value from the 'Reference' sheet — unknown values are rejected")}</li>
    </ol>
  );

  const renderPreview = (preview) => (
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
  );

  const formatSuccess = (data) => {
    const created = data.created || 0;
    const updated = data.updated || 0;
    const failed = data.errors?.length || 0;
    return {
      title: failed ? "Warning" : "Success",
      text:
        t(`Import complete: ${created} created, ${updated} updated`) +
        (failed ? t(`, ${failed} failed`) : ""),
      type: failed ? "warning" : "success",
    };
  };

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Employees")}
      importUrl={API_ENDPOINTS.employees.import}
      sampleUrl={API_ENDPOINTS.employees.sampleCsv}
      sampleFilename="employee-import-sample.xlsx"
      previewQuery={previewQuery}
      confirmQuery={confirmQuery}
      instructions={instructions}
      renderPreview={renderPreview}
      confirmLabel={(n) => t(`Confirm Import (${n} rows)`)}
      formatSuccess={formatSuccess}
    />
  );
};

export default ImportModal;
