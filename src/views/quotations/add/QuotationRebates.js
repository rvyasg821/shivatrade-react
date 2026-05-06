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

import { initQuotationRebateItem } from "@constant/reduxConstant";
import { num, round2, fmt, deriveRebateAmount } from "./_helpers";

const QuotationRebates = ({
  control,
  setValue,
  rebateOptions,
  rebateMasterMap,
  subtotal,
}) => {
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const rebateFA = useFieldArray({ control, name: "rebates" });
  const liveRebates = useWatch({ control, name: "rebates" }) || [];

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
        if (r.isConfirmed) rebateFA.remove(idx);
      });

  const [modal, setModal] = useState({ open: false, idx: null, isNew: false });

  const onPickRebate = (idx, opt) => {
    setValue(`rebates.${idx}.rebate_id`, opt?.value || "");
    setValue(`rebates.${idx}.is_overridden`, false);
    if (opt?.raw) setValue(`rebates.${idx}.name`, opt.raw.name || "");
  };

  const toggleOverride = (idx, currentDerived) => {
    setValue(`rebates.${idx}.amount`, String(round2(currentDerived)));
    setValue(`rebates.${idx}.is_overridden`, true);
  };
  const resetOverride = (idx) => {
    setValue(`rebates.${idx}.is_overridden`, false);
  };

  const openAdd = () => {
    rebateFA.append({ ...initQuotationRebateItem });
    setModal({ open: true, idx: rebateFA.fields.length, isNew: true });
  };
  const openEdit = (idx) => setModal({ open: true, idx, isNew: false });
  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveRebates[idx];
      if (!row?.name && !row?.rebate_id) {
        rebateFA.remove(idx);
      }
    }
    setModal({ open: false, idx: null, isNew: false });
  };

  const editingIdx = modal.idx;
  const editingRow = editingIdx != null ? liveRebates[editingIdx] || {} : {};
  const editingMaster =
    editingRow?.rebate_id && rebateMasterMap.get(editingRow.rebate_id);
  const editingDerived = deriveRebateAmount(
    editingRow,
    subtotal,
    rebateMasterMap
  );
  const editingIsMaster = !!editingRow?.rebate_id;
  const editingOverridden = !!editingRow?.is_overridden;

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0 fw-bold text-uppercase text-muted">
            {t("Rebates")}
          </h5>
          <Button size="sm" color="primary" type="button" onClick={openAdd}>
            <Plus size={14} /> {t("Add Rebate")}
          </Button>
        </div>

        {rebateFA.fields.length === 0 ? (
          <div className="border rounded p-3 text-center text-muted">
            {t("No rebates (e.g. drawback, RoDTEP).")}
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
              {rebateFA.fields.map((field, idx) => {
                const row = liveRebates[idx] || {};
                const master = row.rebate_id
                  ? rebateMasterMap.get(row.rebate_id)
                  : null;
                const derived = deriveRebateAmount(
                  row,
                  subtotal,
                  rebateMasterMap
                );
                return (
                  <tr key={field.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>{row.name || t("(not set)")}</td>
                    <td className="text-muted small">
                      {master ? `${num(master.pct)}% of subtotal` : t("Ad-hoc")}
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
                          className="cursor-pointer text-primary"
                          onClick={() => openEdit(idx)}
                        />
                        <Trash2
                          size={16}
                          className="cursor-pointer text-danger"
                          onClick={() => confirmAndRemove(idx)}
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
            ? t("Add Rebate")
            : `${t("Edit Rebate")} #${(editingIdx ?? 0) + 1}`}
        </ModalHeader>
        <ModalBody>
          {editingIdx != null && (
            <Row>
              <Col md="12" className="mb-2">
                <Label className="form-label">{t("Pick from Master")}</Label>
                <Controller
                  name={`rebates.${editingIdx}.rebate_id`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      classNamePrefix="select"
                      isClearable
                      options={rebateOptions}
                      value={
                        rebateOptions.find((o) => o.value === f.value) || null
                      }
                      onChange={(opt) => onPickRebate(editingIdx, opt)}
                    />
                  )}
                />
              </Col>
              <Col md="12" className="mb-2">
                <Label className="form-label">{t("Name")}</Label>
                <Controller
                  name={`rebates.${editingIdx}.name`}
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
                    ? `${num(editingMaster.pct)}% of subtotal`
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
                      name={`rebates.${editingIdx}.amount`}
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

export default QuotationRebates;
