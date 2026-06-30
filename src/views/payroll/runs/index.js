import { Fragment, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Card, CardBody, Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter,
  FormGroup, Label, Input, Spinner,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Plus, Eye, Trash2, PlayCircle } from "react-feather";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import {
  getPayRunList,
  getPayScheduleList,
  createPayRun,
  deletePayRun,
  cleanPayrollMessage,
} from "../store";

const STATUS_BADGE = {
  draft: "doc-badge-gray",
  calculated: "doc-badge-orange",
  approved: "doc-badge-green",
  paid: "doc-badge-green",
  cancelled: "doc-badge-red",
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const formatMoney = (n, currency = "GBP") => {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${symbol}${(Number(n) || 0).toFixed(2)}`;
};

const PayRunList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useSelector((s) => s.payroll);
  const selectedLocationId = useSelector((s) => s.locationContext?.selectedLocationId);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    schedule_id: "",
    name: "",
    period_start: "",
    period_end: "",
    pay_date: "",
  });

  useEffect(() => {
    const params = { _limit: 50 };
    if (selectedLocationId) params.location_id = selectedLocationId;
    dispatch(getPayRunList(params));
    dispatch(getPayScheduleList());
  }, [selectedLocationId]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "PR_CRT_SCS" || store?.actionFlag === "PR_DEL_SCS") {
      setModalOpen(false);
      const params = { _limit: 50 };
      if (selectedLocationId) params.location_id = selectedLocationId;
      dispatch(getPayRunList(params));
    }
    if (store?.success || store?.error) dispatch(cleanPayrollMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const openCreate = () => {
    const defaultSchedule = (store?.scheduleItems || []).find((s) => s.is_default) || (store?.scheduleItems || [])[0];
    setForm({
      schedule_id: defaultSchedule?._id || "",
      name: "",
      period_start: "",
      period_end: "",
      pay_date: "",
    });
    setModalOpen(true);
  };

  // When schedule changes, fetch the next-period defaults to pre-fill the form
  const handleScheduleChange = async (id) => {
    setForm({ ...form, schedule_id: id });
    if (!id) return;
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.schedules}/${id}/next-period`);
      const period = res.data?.data;
      if (period) {
        const schedule = (store?.scheduleItems || []).find((s) => s._id === id);
        const monthName = new Date(period.period_end).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        setForm((f) => ({
          ...f,
          schedule_id: id,
          name: `${monthName} ${(schedule?.frequency || "").replace("_", "-")}`.trim(),
          period_start: String(period.period_start).slice(0, 10),
          period_end: String(period.period_end).slice(0, 10),
          pay_date: String(period.pay_date).slice(0, 10),
        }));
      }
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    if (!form.schedule_id || !form.period_start || !form.period_end || !form.pay_date) {
      Notification("Warning", t("All fields are required"), "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (selectedLocationId) payload.location_id = selectedLocationId;
      await dispatch(createPayRun(payload));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t("Delete this draft pay run?"))) {
      dispatch(deletePayRun(id));
    }
  };

  const columns = [
    {
      name: t("Name"),
      cell: (row) => (
        <Link to={`${appsRoot}/payroll/runs/${row._id}`} className="fw-semibold">
          {row.name}
        </Link>
      ),
    },
    {
      name: t("Period"),
      hide: "md",
      cell: (row) => (
        <span className="small">{formatDate(row.period_start)} → {formatDate(row.period_end)}</span>
      ),
    },
    {
      name: t("Pay Date"),
      hide: "md",
      cell: (row) => <span className="small">{formatDate(row.pay_date)}</span>,
    },
    {
      name: t("Employees"),
      hide: "md",
      width: "100px",
      center: true,
      cell: (row) => <span>{row.employee_count || 0}</span>,
    },
    {
      name: t("Total Net"),
      width: "140px",
      cell: (row) => <span className="fw-semibold">{formatMoney(row.total_net, row.currency)}</span>,
    },
    {
      name: t("Status"),
      width: "120px",
      cell: (row) => (
        <span className={`doc-badge ${STATUS_BADGE[row.status] || "doc-badge-gray"}`}>
          {t(row.status || "—")}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "120px",
      center: true,
      cell: (row) => (
        <div className="d-flex gap-1">
          <span className="cursor-pointer" onClick={() => navigate(`${appsRoot}/payroll/runs/${row._id}`)}>
            <Eye size={16} className="text-primary" />
          </span>
          {(row.status === "draft" || row.status === "calculated") && (
            <span className="cursor-pointer" onClick={() => handleDelete(row._id)}>
              <Trash2 size={16} className="text-danger" />
            </span>
          )}
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
                <PlayCircle size={20} className="text-primary" />
                {t("Pay Runs")}
              </h4>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Button color="primary" size="sm" onClick={openCreate}>
                <Plus size={14} className="me-50" />
                {t("New Pay Run")}
              </Button>
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.runItems || []}
            pagination={{ total: store?.pagination?.total || 0, perPage: 50 }}
            rowsPerPage={50}
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
          <span style={{ color: "#fff" }}>{t("Create Pay Run")}</span>
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("Pay Schedule")} <span className="text-danger">*</span></Label>
            <Input
              type="select"
              value={form.schedule_id}
              onChange={(e) => handleScheduleChange(e.target.value)}
            >
              <option value="">{t("Select a schedule...")}</option>
              {(store?.scheduleItems || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.frequency})
                </option>
              ))}
            </Input>
            {(!store?.scheduleItems || store.scheduleItems.length === 0) && (
              <small className="text-muted">
                {t("No pay schedules yet. Create one in Pay Schedules first.")}
              </small>
            )}
          </FormGroup>
          <FormGroup>
            <Label>{t("Name")} <span className="text-danger">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. January 2026 Monthly"
            />
          </FormGroup>
          <Row>
            <Col md={4}>
              <FormGroup>
                <Label>{t("Period Start")} <span className="text-danger">*</span></Label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label>{t("Period End")} <span className="text-danger">*</span></Label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label>{t("Pay Date")} <span className="text-danger">*</span></Label>
                <Input
                  type="date"
                  value={form.pay_date}
                  onChange={(e) => setForm({ ...form, pay_date: e.target.value })}
                />
              </FormGroup>
            </Col>
          </Row>
          <small className="text-muted">
            {t("After creation, click Calculate on the run page to generate payslips for all eligible employees.")}
          </small>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setModalOpen(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : t("Create")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default PayRunList;
