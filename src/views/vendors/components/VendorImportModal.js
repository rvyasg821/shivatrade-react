import { useState } from "react";
import { Badge, Alert, Nav, NavItem, NavLink } from "reactstrap";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "react-feather";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import SharedImportModal from "@src/views/_shared/import/ImportModal";
import ImportErrorTable from "@src/views/_shared/import/ImportErrorTable";

// Vendor import/export — TWO sheets.
//
// Sheet 1 is one row per vendor and carries its main contact, address and bank
// inline, so the common case is a single flat sheet. Sheet 2 exists only for a
// vendor's EXTRA addresses, joined by company_name — something the operator
// already knows, rather than an invented key.
//
// The preview still needs tabs: "row 14" means nothing unless you also know
// which sheet it is on.

const SHEETS = [
  { key: "vendors", label: "Vendors" },
  { key: "addresses", label: "Addresses" },
];

// Per-sheet identifying columns for the error table. Short on purpose — enough
// to find the row back in Excel, not a re-render of the sheet.
const ERROR_COLUMNS = {
  vendors: [{ header: "Company", cell: (r) => r.data?.company_name }],
  addresses: [
    { header: "Company", cell: (r) => r.data?.company_name },
    { header: "Type", cell: (r) => r.data?.type },
    { header: "Label", cell: (r) => r.data?.label },
    { header: "City", cell: (r) => r.data?.city },
  ],
};

const VendorImportModal = ({ isOpen, toggle, onSuccess }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("vendors");

  const instructions = (
    <ol className="mb-0 mt-1">
      <li>
        {t(
          "Vendors sheet: one row per vendor, carrying its main contact and main bank account."
        )}
      </li>
      <li>
        {t(
          "Required for a NEW vendor: company_name, gstin, and contact_name + contact_email (the main contact creates its login). status defaults to active. Everything else is optional."
        )}
      </li>
      <li>
        {t(
          "contact_phone_code is the phone's dial code, e.g. +91. Optional — blank defaults to +91 (India). The country flag is derived from it."
        )}
      </li>
      <li>
        {t(
          "Addresses sheet: one row per address, with the vendor's company_name repeated. A vendor with three addresses gets three rows. Mark one is_default per type."
        )}
      </li>
      <li>
        {t(
          "A company name that already exists updates that vendor instead of creating a second one. Names are compared case-insensitively."
        )}
      </li>
      <li>
        {t(
          "Categories go in one comma-separated cell (e.g. Chemicals, BEARINGS). They must already exist in the Category master — import never creates one."
        )}
      </li>
      <li>
        {t(
          "Import never deletes. Anything already on record and not mentioned in the file is left untouched — including extra bank accounts and contacts, which are managed in the vendor screen."
        )}
      </li>
      <li>
        {t(
          "A blank cell leaves the stored value alone. Use Export to get a filled-in workbook to edit."
        )}
      </li>
      <li>
        {t("Accepts .xlsx, .xls or .csv files (max 5 MB, 5000 rows per sheet)")}
      </li>
    </ol>
  );

  const renderPreview = (preview) => {
    const sheets = preview?.summary?.sheets || {};
    const totalErrors = SHEETS.reduce(
      (s, x) => s + (sheets[x.key]?.errors || 0),
      0
    );
    const rows = preview?.[tab] || [];
    const counts = sheets[tab] || {};

    return (
      <div>
        {/* One badge row per sheet — a vendor can be fine while its bank
            accounts are not, and a single combined count would hide that. */}
        <div className="mb-2">
          {SHEETS.map((s) => {
            const c = sheets[s.key] || {};
            if (!c.total) return null;
            return (
              <div
                key={s.key}
                className="d-flex align-items-center gap-1 flex-wrap mb-50"
              >
                <span
                  className="text-muted small"
                  style={{ minWidth: 110, display: "inline-block" }}
                >
                  {t(s.label)}
                </span>
                <Badge className="doc-badge doc-badge-green">
                  {c.valid_new || 0} {t("New")}
                </Badge>
                {c.valid_update ? (
                  <Badge className="doc-badge doc-badge-orange">
                    {c.valid_update} {t("Update")}
                  </Badge>
                ) : null}
                <Badge className="doc-badge doc-badge-red">
                  {c.errors || 0} {t("Errors")}
                </Badge>
                <Badge className="doc-badge doc-badge-gray">
                  {c.total || 0} {t("Total")}
                </Badge>
              </div>
            );
          })}
        </div>

        {totalErrors === 0 ? (
          <Alert color="success" className="mb-0 p-2 d-flex align-items-center">
            <CheckCircle size={18} className="me-1 flex-shrink-0" />
            {t("All rows are valid and ready to import.")}
          </Alert>
        ) : (
          <>
            <Alert color="warning" className="mb-2">
              {t(
                "The rows below have errors and will be skipped. Fix them and re-upload, or continue to import only the valid rows."
              )}
            </Alert>
            <Nav tabs className="mb-1">
              {SHEETS.map((s) => {
                const c = sheets[s.key] || {};
                return (
                  <NavItem key={s.key}>
                    <NavLink
                      href="#"
                      active={tab === s.key}
                      onClick={(e) => {
                        e.preventDefault();
                        setTab(s.key);
                      }}
                    >
                      {t(s.label)}
                      {c.errors ? (
                        <Badge className="doc-badge doc-badge-red ms-50">
                          {c.errors}
                        </Badge>
                      ) : null}
                    </NavLink>
                  </NavItem>
                );
              })}
            </Nav>
            {counts.errors ? (
              <ImportErrorTable rows={rows} columns={ERROR_COLUMNS[tab] || []} />
            ) : (
              <div className="text-muted small py-2">
                {t("No errors on this sheet.")}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <SharedImportModal
      isOpen={isOpen}
      toggle={toggle}
      onSuccess={onSuccess}
      title={t("Import Vendors")}
      importUrl={API_ENDPOINTS.vendors.import}
      sampleUrl={API_ENDPOINTS.vendors.sampleExcel}
      sampleFilename="vendor-import-sample.xlsx"
      instructions={instructions}
      renderPreview={renderPreview}
      // Every non-error row across all four sheets counts as writable: a child
      // sheet on its own still updates an existing vendor, so counting only the
      // Vendors sheet would disable Confirm on a perfectly valid file.
      computeValidCount={(s) =>
        SHEETS.reduce((n, x) => {
          const c = s?.sheets?.[x.key] || {};
          return n + (c.total || 0) - (c.errors || 0);
        }, 0)
      }
      // A commit can still fail on a rule the preview cannot foresee (a
      // service-level guard, a duplicate contact email against the users
      // table). Those must not disappear behind a green "complete" toast.
      formatSuccess={(data, resp) => ({
        title: data?.errors?.length ? "Error" : "Success",
        text: resp?.message || t("Import complete"),
        type: data?.errors?.length ? "warning" : "success",
      })}
    />
  );
};

export default VendorImportModal;
