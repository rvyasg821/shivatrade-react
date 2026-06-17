// Toolbar rendered inside SalesDocLineItems — two actions:
//   • Import from Excel  (modal includes its own "Download Sample" button)
//   • Export to Excel    (current rows + computed columns + Totals sheet)
//
// Both POST to the shared /admin/sales-doc/import endpoints so the
// quotation / PFI / PO wizards only differ by `docType`.

import { useState } from "react";
import { Button } from "reactstrap";
import { Upload, FileText } from "react-feather";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

import LineItemImportModal from "./LineItemImportModal";

const downloadBlob = (data, filename) => {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const LineItemImportExportBar = ({
  docType,
  control,
  // Parent's useFieldArray instance — sharing it (instead of spinning up a
  // second one over the same `lines` field) is required for our append /
  // update calls to be reflected in the line-items table without a remount.
  lineFA,
  initLineItem,
  currencyCode = "",
  exchangeRate = 1,
  docNumber = "",
  // Parent hook fired after a successful merge — used for pagination jumps
  // (we move to the last page only when at least one new row was appended).
  onAfterImport,
}) => {
  const { t } = useTranslation();
  const liveLines = useWatch({ control, name: "lines" }) || [];
  const [importOpen, setImportOpen] = useState(false);

  // Used by the resolver to classify rows as new vs updated. Form lines
  // carry IDs (the product/vendor pickers store product_id / vendor_id), so
  // we send those — product_code / vendor_code are best-effort fallbacks.
  const existingKeys = liveLines.map((l) => ({
    product_id: l?.product_id || "",
    vendor_id: l?.vendor_id || "",
    product_code: l?.product_code || "",
    vendor_code: l?.vendor_code || "",
  }));

  const handleExport = async () => {
    if (!liveLines.length) {
      Notification("Info", t("No lines to export yet"), "info");
      return;
    }
    try {
      const res = await instance.post(
        API_ENDPOINTS.salesDocImport.export,
        {
          docType,
          lines: liveLines,
          currencyCode,
          exchangeRate,
          docNumber,
        },
        { responseType: "blob" },
      );
      const datePart = new Date().toISOString().slice(0, 10);
      const id = docNumber || "draft";
      // The "po" docType is the Sales Order module — name its files "so-…".
      const prefix = docType === "po" ? "so" : docType;
      downloadBlob(res.data, `${prefix}-lines-${id}-${datePart}.xlsx`);
    } catch {
      Notification("Error", t("Failed to generate the file"), "warning");
    }
  };

  // Fixed merge rule (no UI option): if (product_code, vendor_code) matches an
  // existing line → update in place; otherwise append. Guarantees no duplicate
  // product+vendor pairs are ever created in the form.
  const applyImport = (rows) => {
    const normalized = rows.map((r) => ({
      ...initLineItem,
      ...r.data,
      qty: String(r.data?.qty ?? ""),
      unit_price: String(r.data?.unit_price ?? ""),
      discount_pct: String(r.data?.discount_pct ?? "0"),
      tax_pct: String(r.data?.tax_pct ?? "0"),
      margin_pct: String(r.data?.margin_pct ?? "0"),
    }));

    // Match by IDs — codes aren't always saved on form lines.
    const keyToIdx = new Map();
    liveLines.forEach((l, i) =>
      keyToIdx.set(`${l.product_id || ""}|${l.vendor_id || ""}`, i),
    );
    let updated = 0;
    let added = 0;
    for (const row of normalized) {
      const key = `${row.product_id || ""}|${row.vendor_id || ""}`;
      const existingIdx = keyToIdx.get(key);
      if (existingIdx !== undefined) {
        lineFA.update(existingIdx, row);
        updated++;
      } else {
        lineFA.append(row);
        keyToIdx.set(key, liveLines.length + added);
        added++;
      }
    }
    Notification(
      "Success",
      t("Imported {{added}} new, updated {{updated}}", { added, updated }),
      "success",
    );
    if (onAfterImport) {
      // `liveLines.length` is the pre-merge count; new rows sit at the end.
      onAfterImport({
        added,
        updated,
        totalAfter: liveLines.length + added,
      });
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap gap-1">
        <Button
          color="secondary"
          outline
          size="sm"
          onClick={() => setImportOpen(true)}
        >
          <Upload size={14} className="me-50" />
          {t("Import Excel")}
        </Button>

        <Button
          color="secondary"
          outline
          size="sm"
          onClick={handleExport}
          disabled={!liveLines.length}
        >
          <FileText size={14} className="me-50" />
          {t("Export Excel")}
        </Button>
      </div>

      <LineItemImportModal
        isOpen={importOpen}
        toggle={() => setImportOpen((o) => !o)}
        docType={docType}
        existingKeys={existingKeys}
        onConfirm={applyImport}
      />
    </>
  );
};

export default LineItemImportExportBar;
