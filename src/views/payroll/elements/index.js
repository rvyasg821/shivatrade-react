import { Fragment, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card, CardBody, Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter,
  FormGroup, Label, Input, Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Sliders } from "react-feather";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import {
  getPayElementList,
  createPayElement,
  updatePayElement,
  deletePayElement,
  cleanPayrollMessage,
} from "../store";

const TYPE_OPTIONS = [
  { value: "earning", label: "Earning" },
  { value: "deduction", label: "Deduction" },
];

const EARNING_CATEGORIES = [
  { value: "bonus", label: "Bonus" },
  { value: "allowance", label: "Allowance" },
  { value: "commission", label: "Commission" },
  { value: "holiday_pay", label: "Holiday Pay" },
  { value: "other_earning", label: "Other Earning" },
];

const DEDUCTION_CATEGORIES = [
  { value: "court_order", label: "Court Order" },
  { value: "other_deduction", label: "Other Deduction" },
];

const blankForm = () => ({
  name: "",
  type: "earning",
  category: "bonus",
  calculation_method: "fixed",
  default_amount: 0,
  is_taxable: true,
  is_pre_tax: false,
  is_active: true,
});

const PayElementList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.payroll);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(getPayElementList());
  }, []);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (["PE_CRT_SCS", "PE_UPD_SCS", "PE_DEL_SCS"].includes(store?.actionFlag)) {
      setModalOpen(false);
      dispatch(getPayElementList());
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
      type: row.type || "earning",
      category: row.category || "bonus",
      calculation_method: row.calculation_method || "fixed",
      default_amount: row.default_amount ?? 0,
      is_taxable: row.is_taxable !== false,
      is_pre_tax: !!row.is_pre_tax,
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
        await dispatch(updatePayElement({ id: editingId, data: form }));
      } else {
        await dispatch(createPayElement(form));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t("Delete this pay element?"))) {
      dispatch(deletePayElement(id));
    }
  };

  const categoriesForType = form.type === "earning" ? EARNING_CATEGORIES : DEDUCTION_CATEGORIES;

  const columns = [
    {
      name: t("Name"),
      cell: (row) => <span className="fw-semibold">{row.name}</span>,
    },
    {
      name: t("Type"),
      cell: (row) => (
        <span className={`doc-badge ${row.type === "earning" ? "doc-badge-green" : "doc-badge-red"}`}>
          {t(row.type === "earning" ? "Earning" : "Deduction")}
        </span>
      ),
    },
    {
      name: t("Category"),
      hide: "md",
      cell: (row) => <span className="text-capitalize">{(row.category || "").replace(/_/g, " ")}</span>,
    },
    {
      name: t("Default Amount"),
      cell: (row) => <span>{Number(row.default_amount || 0).toFixed(2)}</span>,
    },
    {
      name: t("Taxable"),
      hide: "md",
      cell: (row) => (
        <span className={`doc-badge ${row.is_taxable ? "doc-badge-green" : "doc-badge-gray"}`}>
          {row.is_taxable ? t("Yes") : t("No")}
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
                <Sliders size={20} className="text-primary" />
                {t("Pay Elements")}
              </h4>
              <small className="text-muted">{t("Reusable earning / deduction templates")}</small>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Button color="primary" size="sm" onClick={openCreate}>
                <Plus size={14} className="me-50" />
                {t("Add Element")}
              </Button>
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.elementItems || []}
            pagination={{ total: store?.elementItems?.length || 0, perPage: 25 }}
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
          <span style={{ color: "#fff" }}>{editingId ? t("Edit Pay Element") : t("Add Pay Element")}</span>
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("Name")} <span className="text-danger">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Christmas Bonus"
            />
          </FormGroup>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t("Type")}</Label>
                <Input
                  type="select"
                  value={form.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const cats = newType === "earning" ? EARNING_CATEGORIES : DEDUCTION_CATEGORIES;
                    setForm({ ...form, type: newType, category: cats[0].value });
                  }}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t("Category")}</Label>
                <Input
                  type="select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categoriesForType.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label>{t("Default Amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.default_amount}
              onChange={(e) => setForm({ ...form, default_amount: parseFloat(e.target.value) || 0 })}
            />
          </FormGroup>
          {form.type === "earning" && (
            <FormGroup check>
              <Input
                type="checkbox"
                id="is_taxable"
                checked={form.is_taxable}
                onChange={(e) => setForm({ ...form, is_taxable: e.target.checked })}
              />
              <Label check for="is_taxable">{t("Taxable earning")}</Label>
            </FormGroup>
          )}
          {form.type === "deduction" && (
            <FormGroup check>
              <Input
                type="checkbox"
                id="is_pre_tax"
                checked={form.is_pre_tax}
                onChange={(e) => setForm({ ...form, is_pre_tax: e.target.checked })}
              />
              <Label check for="is_pre_tax">{t("Pre-tax deduction (reduces taxable gross)")}</Label>
            </FormGroup>
          )}
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

export default PayElementList;
