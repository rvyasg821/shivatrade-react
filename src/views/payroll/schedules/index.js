import { Fragment, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card, CardBody, Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter,
  FormGroup, Label, Input, Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Calendar } from "react-feather";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import {
  getPayScheduleList,
  createPaySchedule,
  updatePaySchedule,
  deletePaySchedule,
  cleanPayrollMessage,
} from "../store";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "semi_monthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const blankForm = () => ({
  name: "",
  frequency: "monthly",
  period_start_day: 1,
  pay_date_offset_days: 0,
  currency: "GBP",
  is_default: false,
  is_active: true,
});

const PayScheduleList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.payroll);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(getPayScheduleList());
  }, []);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "PS_CRT_SCS" || store?.actionFlag === "PS_UPD_SCS" || store?.actionFlag === "PS_DEL_SCS") {
      setModalOpen(false);
      dispatch(getPayScheduleList());
    }
    if (store?.success || store?.error) dispatch(cleanPayrollMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const openCreate = () => {
    setEditingId(null);
    setForm(blankForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || "",
      frequency: row.frequency || "monthly",
      period_start_day: row.period_start_day ?? 1,
      pay_date_offset_days: row.pay_date_offset_days ?? 0,
      currency: row.currency || "GBP",
      is_default: !!row.is_default,
      is_active: row.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      Notification("Warning", t("Name is required"), "warning");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await dispatch(updatePaySchedule({ id: editingId, data: form }));
      } else {
        await dispatch(createPaySchedule(form));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t("Delete this pay schedule?"))) {
      dispatch(deletePaySchedule(id));
    }
  };

  const columns = [
    {
      name: t("Name"),
      cell: (row) => <span className="fw-semibold">{row.name}</span>,
    },
    {
      name: t("Frequency"),
      cell: (row) => <span className="text-capitalize">{(row.frequency || "").replace("_", "-")}</span>,
    },
    {
      name: t("Pay Offset"),
      cell: (row) => <span>{row.pay_date_offset_days} {t("days after period end")}</span>,
    },
    {
      name: t("Currency"),
      cell: (row) => <span>{row.currency}</span>,
    },
    {
      name: t("Default"),
      cell: (row) => (
        <span className={`doc-badge ${row.is_default ? "doc-badge-green" : "doc-badge-gray"}`}>
          {row.is_default ? t("Yes") : t("No")}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "120px",
      center: true,
      cell: (row) => (
        <div className="d-flex gap-1">
          <span className="cursor-pointer" onClick={() => openEdit(row)}>
            <Edit size={16} className="text-primary" />
          </span>
          <span className="cursor-pointer" onClick={() => handleDelete(row._id)}>
            <Trash2 size={16} className="text-danger" />
          </span>
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row className="mb-2 align-items-center">
            <Col md={6}>
              <h4 className="mb-0 d-flex align-items-center gap-2">
                <Calendar size={20} className="text-primary" />
                {t("Pay Schedules")}
              </h4>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Button color="primary" size="sm" onClick={openCreate}>
                <Plus size={14} className="me-50" />
                {t("Add Schedule")}
              </Button>
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.scheduleItems || []}
            pagination={{ total: store?.scheduleItems?.length || 0, perPage: 25 }}
            rowsPerPage={25}
            currentPage={1}
            handlePagination={() => {}}
            handleRowPerPage={() => {}}
            loading={store?.loading}
          />
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered backdrop="static" keyboard={false}>
        <ModalHeader
          toggle={() => setModalOpen(false)}
          style={{ backgroundColor: "#09418B", padding: "1.25rem 1.5rem" }}
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setModalOpen(false)}
            />
          }
        >
          <span style={{ color: "#fff" }}>{editingId ? t("Edit Pay Schedule") : t("Add Pay Schedule")}</span>
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("Name")} <span className="text-danger">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monthly Payroll"
            />
          </FormGroup>
          <FormGroup>
            <Label>{t("Frequency")}</Label>
            <Input
              type="select"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{t(f.label)}</option>
              ))}
            </Input>
          </FormGroup>
          {(form.frequency === "weekly" || form.frequency === "biweekly") && (
            <FormGroup>
              <Label>{t("Period Start Day")}</Label>
              <Input
                type="select"
                value={form.period_start_day}
                onChange={(e) => setForm({ ...form, period_start_day: parseInt(e.target.value, 10) })}
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{t(d.label)}</option>
                ))}
              </Input>
            </FormGroup>
          )}
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t("Pay Date Offset (days after period end)")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.pay_date_offset_days}
                  onChange={(e) => setForm({ ...form, pay_date_offset_days: parseInt(e.target.value, 10) || 0 })}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t("Currency")}</Label>
                <Input
                  type="select"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <FormGroup check>
            <Input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            <Label check for="is_default">{t("Set as default schedule")}</Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setModalOpen(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleSubmit} disabled={submitting || !form.name}>
            {submitting ? <Spinner size="sm" /> : (editingId ? t("Save") : t("Create"))}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default PayScheduleList;
