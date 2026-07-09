import { Badge, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";

const AttendanceImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>{t("Download the sample CSV to see the required format")}</li>
      <li>{t("Use employee_code to identify employees")}</li>
      <li>{t("Date format: YYYY-MM-DD, Time format: HH:MM (24h)")}</li>
      <li>{t("Valid statuses: present, absent, half_day (on_leave and holiday for past dates only)")}</li>
      <li>{t("Late arrivals: use status 'present' — the system flags late automatically, or use 'late' which converts to present + late flag")}</li>
      <li>{t("If a record exists for the same employee+date, it will be updated")}</li>
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
  );

  const formatSuccess = (data) => {
    const created = data?.created || 0;
    const updated = data?.updated || 0;
    return {
      title: "Success",
      text: `Import complete: ${created} created, ${updated} updated`,
      type: "success",
    };
  };

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Attendance")}
      reviewTitle={t("Review Attendance Data")}
      importUrl={API_ENDPOINTS.attendance.import}
      sampleUrl={API_ENDPOINTS.attendance.sampleCsv}
      sampleFilename="attendance-import-sample.csv"
      sampleLabel={t("Download Sample CSV")}
      instructions={instructions}
      renderPreview={renderPreview}
      confirmLabel={(n) => t(`Confirm Import (${n} rows)`)}
      formatSuccess={formatSuccess}
    />
  );
};

export default AttendanceImportModal;
