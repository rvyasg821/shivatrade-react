// The Export + Import button pair that sits in a master listing's toolbar.
//
// Every master screen had its own copy of the same ~30 lines: a blob GET, an
// object URL, a synthetic <a>, a revoke, and a spinner flag. That is plumbing,
// not behaviour, so it lives here once and each screen supplies only the two
// things that actually differ — which endpoint to hit and what to call the file.
//
// Export deliberately ignores the on-screen filters. The file is a full
// snapshot (active AND inactive), so it can be edited and re-imported without
// silently dropping the rows the filter happened to be hiding.

import { useState } from "react";
import { Button } from "reactstrap";
import { Download, Upload } from "react-feather";
import { useTranslation } from "react-i18next";
import instance from "@src/utility/AxiosConfig";
import Notification from "@components/toast/notification";

const ImportExportButtons = ({
  exportUrl,
  // `cities` → cities-2026-07-22.xlsx
  filenamePrefix,
  exportErrorMessage,
  onImportClick,
  canImport = true,
}) => {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await instance.get(exportUrl, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenamePrefix}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification(
        "Error",
        exportErrorMessage || t("Failed to export"),
        "warning"
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        color="outline-secondary"
        size="sm"
        className="text-nowrap"
        onClick={handleExport}
        disabled={exporting}
      >
        {t("Export")} <Download size={14} />
      </Button>
      {canImport && (
        <Button
          color="outline-secondary"
          size="sm"
          className="text-nowrap"
          onClick={onImportClick}
        >
          {t("Import")} <Upload size={14} />
        </Button>
      )}
    </>
  );
};

export default ImportExportButtons;
