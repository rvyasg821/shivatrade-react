import { useState } from "react";
import {
  Card,
  CardBody,
  Col,
  Row,
  Button,
  Input,
  Label,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import Select from "react-select";
import { Plus, Trash2, Edit, Edit2, RotateCcw } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { num, round2, fmt, deriveExpenseAmount } from "./_helpers";

/**
 * Expenses section — three-mode model per row:
 *   1. Master-linked, default        → derived amount displayed read-only
 *   2. Master-linked, overridden     → editable amount + reset-to-rule icon
 *   3. Ad-hoc (no master)            → name + amount both manual
 *
 * Compact summary table; "Add" / "Edit" open a Modal with the input form.
 * Shared across Quotation / PFI / PO. Pass `initExpenseItem` for the
 * module-specific empty-row shape.
 */
const SalesDocExpenses = ({
  control,
  setValue,
  expenseOptions,
  expenseMasterMap,
  subtotal,
  initExpenseItem,
  readOnly = false,
  productAppliedIds,
}) => {
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const expenseFA = useFieldArray({ control, name: "expenses" });
  const liveExpenses = useWatch({ control, name: "expenses" }) || [];

  const confirmAndRemove = (idx) =>
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((r) => {
        if (r.isConfirmed) expenseFA.remove(idx);
      });

  const [modal, setModal] = useState({ open: false, idx: null, isNew: false });

  const onPickExpense = (idx, opt) => {
    setValue(`expenses.${idx}.expense_id`, opt?.value || "");
    setValue(`expenses.${idx}.is_overridden`, false);
    if (opt?.raw) setValue(`expenses.${idx}.name`, opt.raw.name || "");
  };

  const toggleOverride = (idx, currentDerived) => {
    setValue(`expenses.${idx}.amount`, String(round2(currentDerived)));
    setValue(`expenses.${idx}.is_overridden`, true);
  };
  const resetOverride = (idx) => {
    setValue(`expenses.${idx}.is_overridden`, false);
  };

  const openAdd = () => {
    expenseFA.append({ ...initExpenseItem });
    setModal({ open: true, idx: expenseFA.fields.length, isNew: true });
  };
  const openEdit = (idx) => setModal({ open: true, idx, isNew: false });
  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveExpenses[idx];
      if (!row?.name && !row?.expense_id) {
        expenseFA.remove(idx);
      }
    }
    setModal({ open: false, idx: null, isNew: false });
  };

  const editingIdx = modal.idx;
  const editingRow = editingIdx != null ? liveExpenses[editingIdx] || {} : {};
  const editingMaster =
    editingRow?.expense_id && expenseMasterMap.get(editingRow.expense_id);
  const editingDerived = deriveExpenseAmount(
    editingRow,
    subtotal,
    expenseMasterMap
  );
  const editingIsMaster = !!editingRow?.expense_id;
  const editingOverridden = !!editingRow?.is_overridden;

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h5 className="mb-0 fw-bold text-uppercase text-muted">
            {t("Expenses")}
          </h5>
          {!readOnly && (
            <Button size="sm" color="primary" type="button" onClick={openAdd}>
              <Plus size={14} /> {t("Add Expense")}
            </Button>
          )}
        </div>
        <small className="text-muted d-block mb-2">
          {t(
            "Tip: per-product HSN expenses (Insurance, etc.) are auto-applied from each product's master. Add expenses here only for shipment-wide charges (Transport, CHA, Documentation)."
          )}
        </small>
        {(() => {
          if (!productAppliedIds || productAppliedIds.size === 0) return null;
          const overlapping = (liveExpenses || [])
            .filter((e) => e.expense_id && productAppliedIds.has(e.expense_id))
            .map(
              (e) =>
                expenseMasterMap.get(e.expense_id)?.code ||
                expenseMasterMap.get(e.expense_id)?.name ||
                e.name
            );
          if (!overlapping.length) return null;
          return (
            <div className="alert alert-warning py-1 px-2 small mb-2">
              ⚠ {t("Already auto-applied from product master:")}{" "}
              <strong>{overlapping.join(", ")}</strong> —{" "}
              {t(
                "adding the same expense here will double-count. Either remove from this list, or check the 'Skip per-product' option in the header."
              )}
            </div>
          );
        })()}

        {expenseFA.fields.length === 0 ? (
          <div className="border rounded p-3 text-center text-muted">
            {t("No expenses (e.g. transport, CHA, freight).")}
          </div>
        ) : (
          <Table responsive bordered className="mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t("Name")}</th>
                <th>{t("Rule")}</th>
                <th className="text-end">{t("Amount")}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {expenseFA.fields.map((field, idx) => {
                const row = liveExpenses[idx] || {};
                const master = row.expense_id
                  ? expenseMasterMap.get(row.expense_id)
                  : null;
                const derived = deriveExpenseAmount(
                  row,
                  subtotal,
                  expenseMasterMap
                );
                return (
                  <tr key={field.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>{row.name || t("(not set)")}</td>
                    <td className="text-muted small">
                      {master
                        ? master.type === "percent"
                          ? `${num(master.value)}% of subtotal`
                          : `Flat ${fmt(num(master.value))}`
                        : t("Ad-hoc")}
                      {row.is_overridden && (
                        <span className="ms-1 badge bg-warning text-dark">
                          {t("Override")}
                        </span>
                      )}
                    </td>
                    <td className="text-end fw-bold">{fmt(derived)}</td>
                    <td>
                      <div className="d-flex justify-content-center align-items-center" style={{ gap: "2px" }}>
                        <Edit
                          size={16}
                          className={
                            readOnly
                              ? "text-muted opacity-50"
                              : "cursor-pointer text-primary"
                          }
                          onClick={() => !readOnly && openEdit(idx)}
                        />
                        <Trash2
                          size={16}
                          className={
                            readOnly
                              ? "text-muted opacity-50"
                              : "cursor-pointer text-danger"
                          }
                          onClick={() => !readOnly && confirmAndRemove(idx)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </CardBody>

      <Modal isOpen={modal.open} toggle={closeModal} backdrop="static">
        <ModalHeader toggle={closeModal}>
          {modal.isNew
            ? t("Add Expense")
            : `${t("Edit Expense")} #${(editingIdx ?? 0) + 1}`}
        </ModalHeader>
        <ModalBody>
          {editingIdx != null && (
            <Row>
              <Col md="12" className="mb-2">
                <Label className="form-label">{t("Pick from Master")}</Label>
                <Controller
                  name={`expenses.${editingIdx}.expense_id`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      classNamePrefix="select"
                      isClearable
                      options={expenseOptions}
                      value={
                        expenseOptions.find((o) => o.value === f.value) || null
                      }
                      onChange={(opt) => onPickExpense(editingIdx, opt)}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-2">
                <Label className="form-label">{t("Name")}</Label>
                <Controller
                  name={`expenses.${editingIdx}.name`}
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      {...f}
                      value={f.value || ""}
                      disabled={editingIsMaster}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-2">
                <Label className="form-label">{t("Rule")}</Label>
                <div className="form-control bg-light">
                  {editingMaster
                    ? editingMaster.type === "percent"
                      ? `${num(editingMaster.value)}% of subtotal`
                      : `Flat ${fmt(num(editingMaster.value))}`
                    : t("Ad-hoc — type the amount below")}
                </div>
              </Col>
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Amount")}</Label>
                {editingIsMaster && !editingOverridden ? (
                  <div className="d-flex align-items-center gap-1">
                    <div
                      className="form-control bg-light fw-bold text-end"
                      style={{ pointerEvents: "none" }}
                    >
                      {fmt(editingDerived)}
                    </div>
                    <Edit2
                      size={16}
                      className="cursor-pointer text-primary"
                      onClick={() =>
                        toggleOverride(editingIdx, editingDerived)
                      }
                      title={t("Override with manual amount")}
                    />
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-1">
                    <Controller
                      name={`expenses.${editingIdx}.amount`}
                      control={control}
                      render={({ field: f }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...f}
                          value={f.value ?? ""}
                        />
                      )}
                    />
                    {editingIsMaster && (
                      <RotateCcw
                        size={16}
                        className="cursor-pointer text-secondary"
                        onClick={() => resetOverride(editingIdx)}
                        title={t("Use master rule")}
                      />
                    )}
                  </div>
                )}
              </Col>
            </Row>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={closeModal}>
            {t("Done")}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default SalesDocExpenses;
