// POV Expenses tab — manage vendor-side charges (Packing, Transport, etc.)
// snapshotted on the POV. Each row picks from the expense master and may
// override type (% / fixed) and value per POV. Editable only in DRAFT;
// otherwise renders read-only.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Input,
  Label,
  Table,
} from "reactstrap";
import Select from "react-select";
import { Plus, Trash2, Save } from "react-feather";
import { useTranslation } from "react-i18next";

import { updatePoVendor, getPoVendor } from "@src/views/po-vendors/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";
import Notification from "@components/toast/notification";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const fmt = (n) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TYPE_OPTIONS = REBATE_EXPENSE_TYPE_OPTIONS;

const ExpensesTab = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const expenseStore = useSelector((s) => s.expense);

  const p = poVendorItem || {};
  const sym = p?.currency_symbol || "₹";
  const isDraft = (p?.status || "").toLowerCase() === "draft";

  // ── Load expense master once ─────────────────────────────────────────
  useEffect(() => {
    if (!expenseStore?.expenseDropdown?.length) {
      dispatch(getExpenseDropdown());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.code ? `${e.code} - ${e.name}` : e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown],
  );

  // ── Local working copy of the snapshot (cancel safe) ────────────────
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(
      (p?.expenses_snapshot || []).map((e) => ({
        expense_id: e.expense_id || "",
        code: e.code || "",
        name: e.name || "",
        type: e.type || "percent",
        value: e.value != null ? String(e.value) : "",
      })),
    );
  }, [p?._id, p?.expenses_snapshot]);

  // ── Subtotal (for percent preview) ──────────────────────────────────
  const subtotal = useMemo(
    () => (p?.lines || []).reduce((s, l) => s + num(l?.line_total), 0),
    [p?.lines],
  );

  const computeAmount = (r) =>
    r.type === "percent"
      ? (subtotal * num(r.value)) / 100
      : num(r.value);

  // ── Used IDs (to filter the picker — block duplicates per rule #3) ──
  const usedIds = useMemo(
    () => new Set(rows.map((r) => r.expense_id).filter(Boolean)),
    [rows],
  );

  const addRow = () =>
    setRows((curr) => [
      ...curr,
      { expense_id: "", code: "", name: "", type: "percent", value: "0" },
    ]);

  const updateRow = (idx, patch) =>
    setRows((curr) => curr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx) =>
    setRows((curr) => curr.filter((_, i) => i !== idx));

  // ── Save handler ─────────────────────────────────────────────────────
  const onSave = async () => {
    // Validate: every row must have an expense pick.
    const incomplete = rows.find((r) => !r.expense_id);
    if (incomplete) {
      Notification(
        t("Validation"),
        t("Pick an expense for every row before saving."),
        "warning",
      );
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updatePoVendor({
          id: p._id,
          data: {
            expenses: rows.map((r) => ({
              expense_id: r.expense_id,
              type: r.type,
              value: r.value || "0",
            })),
          },
        }),
      ).unwrap();
      // Success toast is shown once by the page-level effect in view/index.js
      // (it surfaces the store's "PO Vendor updated successfully." message).
      // Adding another here produced a duplicate toast.
      dispatch(getPoVendor(p._id));
    } catch (err) {
      Notification(
        t("Error"),
        err?.message || t("Could not save vendor charges."),
        "danger",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (r, idx) => {
    const pickOptions = expenseOptions.filter(
      (o) => o.value === r.expense_id || !usedIds.has(o.value),
    );
    return (
      <tr key={idx}>
        <td className="text-muted">{idx + 1}</td>
        <td>
          {isDraft ? (
            <Select
              classNamePrefix="select"
              options={pickOptions}
              value={
                expenseOptions.find((o) => o.value === r.expense_id) || null
              }
              onChange={(opt) => {
                if (!opt) {
                  updateRow(idx, {
                    expense_id: "",
                    code: "",
                    name: "",
                  });
                  return;
                }
                updateRow(idx, {
                  expense_id: opt.value,
                  code: opt.raw?.code || "",
                  name: opt.raw?.name || "",
                  type: opt.raw?.type || r.type,
                  value: opt.raw?.value != null ? String(opt.raw.value) : r.value,
                });
              }}
              placeholder={t("Pick expense…")}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
            />
          ) : (
            <span>
              {r.code ? `${r.code} - ` : ""}
              {r.name}
            </span>
          )}
        </td>
        <td style={{ width: 180 }}>
          {isDraft ? (
            <Select
              classNamePrefix="select"
              options={TYPE_OPTIONS}
              value={
                TYPE_OPTIONS.find((o) => o.value === r.type) || TYPE_OPTIONS[0]
              }
              onChange={(opt) => updateRow(idx, { type: opt.value })}
              menuPortalTarget={document.body}
              styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
            />
          ) : (
            <span>{r.type === "percent" ? "%" : "₹"}</span>
          )}
        </td>
        <td style={{ width: 140 }}>
          {isDraft ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={r.value}
              onChange={(e) => updateRow(idx, { value: e.target.value })}
            />
          ) : (
            <span>{num(r.value)}</span>
          )}
        </td>
        <td className="text-end" style={{ width: 150 }}>
          {sym} {fmt(computeAmount(r))}
        </td>
        {isDraft && (
          <td className="text-end" style={{ width: 60 }}>
            <Button
              type="button"
              color="danger"
              size="sm"
              outline
              onClick={() => removeRow(idx)}
            >
              <Trash2 size={14} />
            </Button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <Fragment>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">{t("Vendor Charges")}</h4>
        {isDraft && (
          <div className="d-flex gap-1">
            <Button
              type="button"
              color="primary"
              outline
              size="sm"
              onClick={addRow}
            >
              <Plus size={14} className="me-50" /> {t("Add Expense")}
            </Button>
            <Button
              type="button"
              color="primary"
              size="sm"
              onClick={onSave}
              disabled={saving}
            >
              <Save size={14} className="me-50" /> {t("Save")}
            </Button>
          </div>
        )}
      </div>

      {!isDraft && (
        <div className="text-muted small mb-2">
          {t(
            "POV is locked. Vendor charges can only be edited while in Draft.",
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-muted py-3 text-center">
          {t("No vendor charges captured for this POV.")}
        </div>
      ) : (
        <Table responsive bordered size="sm" className="mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Expense")}</th>
              <th>{t("Type")}</th>
              <th>{t("Value")}</th>
              <th className="text-end">{t("Amount")}</th>
              {isDraft && <th></th>}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </Table>
      )}

      <div className="text-muted small mt-2">
        {t(
          "Percent expenses are computed on the line subtotal. GST applies on (Subtotal + Charges).",
        )}
      </div>
    </Fragment>
  );
};

export default ExpensesTab;
