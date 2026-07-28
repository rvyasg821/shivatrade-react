// POV Expenses tab — manage vendor-side charges (Packing, Transport, etc.)
// snapshotted on the POV. Each row picks from the expense master and may
// override type (% / fixed) and value per POV. Editable only in DRAFT;
// otherwise renders read-only.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import { Plus, Save } from "react-feather";
import { useTranslation } from "react-i18next";

import { updatePoVendor, getPoVendor } from "@src/views/po-vendors/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";
import Notification from "@components/toast/notification";
import ExpenseGrid from "@src/views/_shared/po-vendor/ExpenseGrid";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const TYPE_OPTIONS = REBATE_EXPENSE_TYPE_OPTIONS;

const ExpensesTab = ({ registerActions }) => {
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
        gst_pct: e.gst_pct != null ? String(e.gst_pct) : "0",
      })),
    );
  }, [p?._id, p?.expenses_snapshot]);

  // ── Subtotal (for percent preview) ──────────────────────────────────
  const subtotal = useMemo(
    () => (p?.lines || []).reduce((s, l) => s + num(l?.line_total), 0),
    [p?.lines],
  );

  const addRow = () =>
    setRows((curr) => [
      ...curr,
      {
        expense_id: "",
        code: "",
        name: "",
        type: "percent",
        value: "0",
        gst_pct: "0",
      },
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
              gst_pct: r.gst_pct || "0",
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

  // Publish Add / Save to the tab bar (right of the tab titles).
  useEffect(() => {
    if (!registerActions) return undefined;
    registerActions(
      isDraft ? (
        <Fragment>
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
        </Fragment>
      ) : null
    );
    return () => registerActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft, saving, rows]);

  return (
    <Fragment>
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
        <ExpenseGrid
          rows={rows}
          expenseOptions={expenseOptions}
          typeOptions={TYPE_OPTIONS}
          percentBase={subtotal}
          sym={sym}
          // Amount column always renders in the POV currency (× rate) so its
          // symbol and value agree — the VALUE column stays the raw INR/percent
          // entry. `percentBase` (subtotal) is INR, so a % charge computes in
          // INR then converts, matching the POV Total card.
          rate={Number(p?.exchange_rate) || 1}
          // GST is an Indian (INR) tax — nil on a foreign-currency POV.
          gstApplies={(p?.currency_code || "INR") === "INR"}
          readOnly={!isDraft}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
        />
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
