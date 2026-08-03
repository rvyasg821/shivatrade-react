// Shared vendor-charges (expense) grid — used by BOTH the POV detail
// "Expenses" tab and the Generate-POV (recover) modal so the two render
// identically: # column, Expense · Type · Value · Amount, 2-decimal ₹ amounts.
//
// Presentational: the parent owns the `rows` state and the update/remove
// handlers. A `%` (percent) row is valued on `percentBase` (the parent decides
// the base — line subtotal on the detail tab, vendor goods total on generate).

import { Button, Input, Table } from "reactstrap";
import Select from "react-select";
import { Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const fmt2 = (n) =>
  num(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ExpenseGrid = ({
  rows = [],
  expenseOptions = [],
  typeOptions = [],
  percentBase = 0, // amount a % expense is computed on
  sym = "₹",
  // Display multiplier for the read-only Amount column: POV amounts are stored
  // in INR; a foreign POV passes exchange_rate (foreign-per-₹1) so the charge
  // renders in the POV currency. Editable callers omit it → 1 (INR entry).
  rate = 1,
  // GST is an Indian (INR) tax — it does not apply on a foreign-currency POV.
  // When false, the charge GST% is disabled/blanked and no GST is added to the
  // charge amount. Callers pass `currency === "INR"`; default keeps GST on.
  gstApplies = true,
  readOnly = false,
  onUpdateRow, // (idx, patch) => void
  onRemoveRow, // (idx) => void
}) => {
  const { t } = useTranslation();

  if (!rows.length) return null;

  const usedIds = new Set(rows.map((r) => r.expense_id).filter(Boolean));
  const amountOf = (r) =>
    r.type === "percent" ? (percentBase * num(r.value)) / 100 : num(r.value);

  const selectStyles = { menuPortal: (b) => ({ ...b, zIndex: 9999 }) };

  return (
    <div className="table-responsive">
      <Table
        size="sm"
        bordered
        className="mb-0 align-middle line-items-grid"
      >
        <thead className="table-light">
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th style={{ minWidth: 180 }}>{t("Expense")}</th>
            <th style={{ width: 90 }}>{t("HSN")}</th>
            <th style={{ width: 140 }}>{t("Type")}</th>
            <th style={{ width: 90 }}>{t("Value")}</th>
            <th style={{ width: 90 }}>{t("GST (%)")}</th>
            <th style={{ width: 120 }} className="text-end">
              {t("Amount")}
            </th>
            {!readOnly && <th style={{ width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const pickOptions = expenseOptions.filter(
              (o) => o.value === r.expense_id || !usedIds.has(o.value)
            );
            const taxable = amountOf(r); // the charge value (pre-GST)
            const gstAmt = gstApplies ? (taxable * num(r.gst_pct)) / 100 : 0;
            const grossAmt = taxable + gstAmt; // charge + its GST
            return (
              <tr key={idx}>
                <td className="text-muted">{idx + 1}</td>
                <td>
                  {readOnly ? (
                    <span>
                      {r.code ? `${r.code} - ` : ""}
                      {r.name}
                    </span>
                  ) : (
                    <Select
                      classNamePrefix="select"
                      options={pickOptions}
                      value={
                        expenseOptions.find((o) => o.value === r.expense_id) ||
                        null
                      }
                      onChange={(opt) => {
                        if (!opt) {
                          onUpdateRow(idx, {
                            expense_id: "",
                            code: "",
                            name: "",
                            hsn_code: "",
                          });
                          return;
                        }
                        onUpdateRow(idx, {
                          expense_id: opt.value,
                          code: opt.raw?.code || "",
                          name: opt.raw?.name || "",
                          hsn_code: opt.raw?.hsn_code || "",
                          type: opt.raw?.type || r.type,
                          value:
                            opt.raw?.value != null
                              ? String(opt.raw.value)
                              : r.value,
                        });
                      }}
                      placeholder={t("Pick expense…")}
                      menuPortalTarget={document.body}
                      menuPlacement="auto"
                      menuPosition="fixed"
                      maxMenuHeight={200}
                      styles={selectStyles}
                    />
                  )}
                </td>
                <td className="text-muted">
                  {/* Expense HSN/SAC — master-derived, not editable per POV. */}
                  {r.hsn_code || "-"}
                </td>
                <td>
                  {readOnly ? (
                    <span>
                      {(typeOptions.find((o) => o.value === r.type) || {})
                        .label || r.type}
                    </span>
                  ) : (
                    <Select
                      classNamePrefix="select"
                      options={typeOptions}
                      value={
                        typeOptions.find((o) => o.value === r.type) ||
                        typeOptions[0]
                      }
                      onChange={(opt) => onUpdateRow(idx, { type: opt.value })}
                      menuPortalTarget={document.body}
                      menuPlacement="auto"
                      menuPosition="fixed"
                      maxMenuHeight={200}
                      styles={selectStyles}
                    />
                  )}
                </td>
                <td>
                  {readOnly ? (
                    <span>{num(r.value)}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      bsSize="sm"
                      value={r.value}
                      onChange={(e) =>
                        onUpdateRow(idx, { value: e.target.value })
                      }
                    />
                  )}
                </td>
                <td>
                  {readOnly ? (
                    <span>{gstApplies ? num(r.gst_pct) : 0}%</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      bsSize="sm"
                      disabled={!gstApplies}
                      value={gstApplies ? r.gst_pct ?? "" : 0}
                      onChange={(e) =>
                        onUpdateRow(idx, { gst_pct: e.target.value })
                      }
                    />
                  )}
                </td>
                <td className="text-end fw-semibold">
                  {sym} {fmt2(grossAmt * rate)}
                </td>
                {!readOnly && (
                  <td className="text-center">
                    <Button
                      size="sm"
                      color="danger"
                      outline
                      onClick={() => onRemoveRow(idx)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default ExpenseGrid;
