import { Fragment, useState, useEffect, useCallback } from "react";
import useFormLoading from "@src/hooks/useFormLoading";
import {
  Row, Col, Nav, NavItem, NavLink, TabContent, TabPane,
  Button, Badge, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Label, Input, FormGroup,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Trash2, Edit2, CheckCircle, AlertTriangle } from "react-feather";
import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  getImmigrationByUser,
  createImmigration,
  updateImmigration,
  deleteImmigration,
  getRtwList,
  createRtwCheck,
  deleteRtwCheck,
  getEventList,
  createEvent,
  reportEvent,
  markEventNotApplicable,
  deleteEvent,
  clearComplianceActionFlag,
} from "@src/views/compliance/store";



// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active: "light-success",
  expiring: "light-warning",
  expired: "light-danger",
  action_required: "light-danger",
  pending: "light-warning",
  reported: "light-success",
  overdue: "light-danger",
  not_applicable: "light-secondary",
  passed: "light-success",
  failed: "light-danger",
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr) - new Date()) / 86400000);
};

const DaysChip = ({ date }) => {
  if (!date) return <span className="text-muted">-</span>;
  const days = daysUntil(date);
  const color = days < 0 ? "light-danger" : days <= 30 ? "light-danger" : days <= 90 ? "light-warning" : "light-success";
  return <Badge color={color}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</Badge>;
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

// ── Main Component ───────────────────────────────────────────────────────────

const ImmigrationTab = ({ employeeData, onSave, loading }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const dispatch = useDispatch();
  const store = useSelector((s) => s.compliance);
  const userId = employeeData?._id;

  const [subTab, setSubTab] = useState("immigration");

  // ── Immigration Records ──────────────────────────────────────────────────

  const [immigModal, setImmigModal] = useState(false);
  const [editImmig, setEditImmig] = useState(null);
  const initImmigForm = {
    visa_type: "", immigration_status: "visa_holder", brp_number: "",
    share_code: "", visa_start_date: "", visa_expiry_date: "", work_restriction: "",
    is_sponsored: false, cos_number: "", cos_start_date: "", cos_expiry_date: "",
    sponsor_license_number: "", notes: "",
  };
  const [immigForm, setImmigForm] = useState(initImmigForm);

  const fetchImmigration = useCallback(() => {
    if (userId) dispatch(getImmigrationByUser(userId));
  }, [dispatch, userId]);

  useEffect(() => { fetchImmigration(); }, [fetchImmigration]);

  const openImmigCreate = () => {
    setEditImmig(null);
    setImmigForm(initImmigForm);
    setImmigModal(true);
  };

  const openImmigEdit = (row) => {
    setEditImmig(row);
    setImmigForm({
      visa_type: row.visa_type || "",
      immigration_status: row.immigration_status || "visa_holder",
      brp_number: row.brp_number || "",
      share_code: row.share_code || "",
      visa_start_date: row.visa_start_date || "",
      visa_expiry_date: row.visa_expiry_date || "",
      work_restriction: row.work_restriction || "",
      is_sponsored: row.is_sponsored || false,
      cos_number: row.cos_number || "",
      cos_start_date: row.cos_start_date || "",
      cos_expiry_date: row.cos_expiry_date || "",
      sponsor_license_number: row.sponsor_license_number || "",
      notes: row.notes || "",
    });
    setImmigModal(true);
  };

  const handleImmigSave = async () => {
    try {
      if (editImmig) {
        await dispatch(updateImmigration({ id: editImmig._id, data: immigForm })).unwrap();
        Notification("Success", t("Immigration record updated"), "success");
      } else {
        await dispatch(createImmigration({ ...immigForm, user_id: userId })).unwrap();
        Notification("Success", t("Immigration record created"), "success");
      }
      setImmigModal(false);
      fetchImmigration();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const handleImmigDelete = async (id) => {
    if (!window.confirm(t("Delete this record?"))) return;
    try {
      await dispatch(deleteImmigration(id)).unwrap();
      Notification("Success", t("Deleted"), "success");
      fetchImmigration();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const immigColumns = [
    {
      name: t("Visa Type"),
      minWidth: "140px",
      cell: (r) => (
        <div>
          <div className="fw-bold">{r.visa_type || "-"}</div>
          <small className="text-capitalize text-muted">{(r.immigration_status || "").replace(/_/g, " ")}</small>
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "120px",
      center: true,
      cell: (r) => <Badge color={STATUS_COLORS[r.status] || "light-secondary"} pill className="text-capitalize">{(r.status || "-").replace(/_/g, " ")}</Badge>,
    },
    {
      name: t("Expiry"),
      minWidth: "130px",
      center: true,
      cell: (r) => (
        <div className="text-center">
          <div>{fmtDate(r.visa_expiry_date)}</div>
          <DaysChip date={r.visa_expiry_date} />
        </div>
      ),
    },
    {
      name: t("BRP"),
      minWidth: "110px",
      cell: (r) => r.brp_number || "-",
    },
    {
      name: t("Sponsored"),
      width: "100px",
      center: true,
      cell: (r) => r.is_sponsored ? <CheckCircle size={16} className="text-success" /> : <span className="text-muted">-</span>,
    },
    {
      name: t("Action"),
      width: "100px",
      center: true,
      cell: (r) => (
        <div className="d-flex gap-75">
          <Edit2 size={16} className="cursor-pointer text-primary" onClick={() => openImmigEdit(r)} />
          <Trash2 size={16} className="cursor-pointer text-danger" onClick={() => handleImmigDelete(r._id)} />
        </div>
      ),
    },
  ];

  // ── RTW Checks ─────────────────────────────────────────────────────────────

  const [rtwModal, setRtwModal] = useState(false);
  const initRtwForm = {
    check_type: "manual", check_date: "", result: "pending",
    valid_until: "", share_code_used: "", follow_up_required: false,
    follow_up_date: "", notes: "",
  };
  const [rtwForm, setRtwForm] = useState(initRtwForm);

  const fetchRtw = useCallback(() => {
    if (userId) dispatch(getRtwList({ user_id: userId }));
  }, [dispatch, userId]);

  useEffect(() => {
    if (subTab === "rtw") fetchRtw();
  }, [subTab, fetchRtw]);

  const handleRtwSave = async () => {
    try {
      await dispatch(createRtwCheck({ ...rtwForm, user_id: userId })).unwrap();
      Notification("Success", t("RTW check recorded"), "success");
      setRtwModal(false);
      fetchRtw();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const handleRtwDelete = async (id) => {
    if (!window.confirm(t("Delete this check?"))) return;
    try {
      await dispatch(deleteRtwCheck(id)).unwrap();
      Notification("Success", t("Deleted"), "success");
      fetchRtw();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const rtwColumns = [
    {
      name: t("Check Type"),
      minWidth: "160px",
      cell: (r) => <Badge color="light-info" className="text-capitalize">{(r.check_type || "manual").replace(/_/g, " ")}</Badge>,
    },
    { name: t("Check Date"), minWidth: "120px", center: true, cell: (r) => fmtDate(r.check_date) },
    {
      name: t("Result"),
      width: "110px",
      center: true,
      cell: (r) => <Badge color={STATUS_COLORS[r.result] || "light-secondary"} pill className="text-capitalize">{r.result || "-"}</Badge>,
    },
    {
      name: t("Valid Until"),
      minWidth: "130px",
      center: true,
      cell: (r) => r.valid_until ? (
        <div className="text-center">
          <div>{fmtDate(r.valid_until)}</div>
          <DaysChip date={r.valid_until} />
        </div>
      ) : t("Indefinite"),
    },
    {
      name: t("Follow-up"),
      minWidth: "120px",
      center: true,
      cell: (r) => r.follow_up_required ? (
        <div className="text-center">
          <div>{fmtDate(r.follow_up_date)}</div>
          {r.follow_up_date && <DaysChip date={r.follow_up_date} />}
        </div>
      ) : <span className="text-muted">-</span>,
    },
    {
      name: t("Action"),
      width: "70px",
      center: true,
      cell: (r) => <Trash2 size={16} className="cursor-pointer text-danger" onClick={() => handleRtwDelete(r._id)} />,
    },
  ];

  // ── UKVI Events ────────────────────────────────────────────────────────────

  const [eventModal, setEventModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportingEventId, setReportingEventId] = useState(null);
  const [reportRef, setReportRef] = useState("");
  const initEventForm = { event_type: "custom", event_date: "", description: "" };
  const [eventForm, setEventForm] = useState(initEventForm);

  const fetchEvents = useCallback(() => {
    if (userId) dispatch(getEventList({ user_id: userId }));
  }, [dispatch, userId]);

  useEffect(() => {
    if (subTab === "events") fetchEvents();
  }, [subTab, fetchEvents]);

  const handleEventSave = async () => {
    try {
      await dispatch(createEvent({ ...eventForm, user_id: userId })).unwrap();
      Notification("Success", t("Event created"), "success");
      setEventModal(false);
      fetchEvents();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const handleReport = async () => {
    try {
      await dispatch(reportEvent({ id: reportingEventId, data: { reference_number: reportRef } })).unwrap();
      Notification("Success", t("Event reported"), "success");
      setReportModal(false);
      setReportRef("");
      fetchEvents();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const handleMarkNA = async (id) => {
    try {
      await dispatch(markEventNotApplicable(id)).unwrap();
      Notification("Success", t("Marked as N/A"), "success");
      fetchEvents();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const handleEventDelete = async (id) => {
    if (!window.confirm(t("Delete this event?"))) return;
    try {
      await dispatch(deleteEvent(id)).unwrap();
      Notification("Success", t("Deleted"), "success");
      fetchEvents();
    } catch (err) {
      Notification("Error", err?.message || t("Failed"), "warning");
    }
  };

  const EVENT_TYPES = [
    "absence_10_days", "role_change", "salary_change", "resignation",
    "termination", "working_hours_breach", "visa_expiry", "failed_rtw_check",
    "address_change", "custom",
  ];

  const eventColumns = [
    {
      name: t("Event Type"),
      minWidth: "180px",
      cell: (r) => <Badge color="light-info" className="text-capitalize">{(r.event_type || "").replace(/_/g, " ")}</Badge>,
    },
    { name: t("Event Date"), minWidth: "120px", center: true, cell: (r) => fmtDate(r.event_date) },
    {
      name: t("Deadline"),
      minWidth: "130px",
      center: true,
      cell: (r) => (
        <div className="text-center">
          <div>{fmtDate(r.reporting_deadline)}</div>
          <DaysChip date={r.reporting_deadline} />
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "130px",
      center: true,
      cell: (r) => <Badge color={STATUS_COLORS[r.status] || "light-secondary"} pill className="text-capitalize">{(r.status || "-").replace(/_/g, " ")}</Badge>,
    },
    {
      name: t("Ref"),
      minWidth: "120px",
      cell: (r) => r.reference_number ? <small>{r.reference_number}</small> : <span className="text-muted">-</span>,
    },
    {
      name: t("Action"),
      minWidth: "150px",
      center: true,
      cell: (r) => (
        <div className="d-flex gap-50 align-items-center">
          {r.status === "pending" && (
            <>
              <Button color="success" size="sm" className="py-25 px-50" onClick={() => { setReportingEventId(r._id); setReportRef(""); setReportModal(true); }}>
                {t("Report")}
              </Button>
              <Button color="secondary" outline size="sm" className="py-25 px-50" onClick={() => handleMarkNA(r._id)}>
                {t("N/A")}
              </Button>
            </>
          )}
          <Trash2 size={16} className="cursor-pointer text-danger" onClick={() => handleEventDelete(r._id)} />
        </div>
      ),
    },
  ];

  // ── Audit Log ──────────────────────────────────────────────────────────────

  const [auditData, setAuditData] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    if (!userId) return;
    setAuditLoading(true);
    try {
      const res = await instance.get(`${API_ENDPOINTS.compliance.auditUser}/${userId}`);
      setAuditData(res.data?.data || []);
    } catch {
      setAuditData([]);
    }
    setAuditLoading(false);
  }, [userId]);

  useEffect(() => {
    if (subTab === "audit") fetchAudit();
  }, [subTab, fetchAudit]);

  const auditColumns = [
    {
      name: t("Action"),
      minWidth: "200px",
      cell: (r) => <Badge color="light-primary" className="text-capitalize">{(r.action || "").replace(/_/g, " ")}</Badge>,
    },
    {
      name: t("Performed By"),
      minWidth: "120px",
      cell: (r) => r.performed_by || t("System"),
    },
    {
      name: t("Entity"),
      minWidth: "150px",
      cell: (r) => <span className="text-capitalize">{(r.entity_type || "").replace(/_/g, " ")}</span>,
    },
    {
      name: t("Date"),
      minWidth: "160px",
      cell: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : "-",
    },
  ];

  // ── Passport Fields (saved on user entity) ─────────────────────────────────

  const [passportForm, setPassportForm] = useState({
    passport_number: "",
    passport_country_of_issue: "",
    passport_expiry: "",
  });

  useEffect(() => {
    if (employeeData) {
      setPassportForm({
        passport_number: employeeData.passport_number || "",
        passport_country_of_issue: employeeData.passport_country_of_issue || "",
        passport_expiry: employeeData.passport_expiry || "",
      });
    }
  }, [employeeData]);

  const handleSavePassport = async () => {
    setSubmitting(true);
    try {
      await onSave({
        passport_number: passportForm.passport_number || null,
        passport_country_of_issue: passportForm.passport_country_of_issue || null,
        passport_expiry: passportForm.passport_expiry || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Data from store ────────────────────────────────────────────────────────

  const immigrationData = store?.immigrationList || [];
  const rtwData = store?.rtwList || [];
  const eventData = store?.eventList || [];


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Fragment>
      {/* Passport - saved on user */}
      <h5 className="mb-2">{t("Passport Details")}</h5>
      <Row className="mb-3">
        <Col md="4">
          <Label>{t("Passport Number")}</Label>
          <Input value={passportForm.passport_number} onChange={(e) => setPassportForm({ ...passportForm, passport_number: e.target.value })} />
        </Col>
        <Col md="4">
          <Label>{t("Country of Issue")}</Label>
          <Input value={passportForm.passport_country_of_issue} onChange={(e) => setPassportForm({ ...passportForm, passport_country_of_issue: e.target.value })} />
        </Col>
        <Col md="4">
          <Label>{t("Passport Expiry")}</Label>
          <DateInput value={passportForm.passport_expiry} id="passport_expiry"
            onChange={(dates, str, iso) => setPassportForm({ ...passportForm, passport_expiry: iso })} />
        </Col>
        <Col md="12" className="mt-1">
          <Button color="primary" size="sm" disabled={loading} onClick={handleSavePassport}>
            {loading ? <Spinner size="sm" /> : t("Save Passport")}
          </Button>
        </Col>
      </Row>

      <hr />

      {/* Sub-tabs for compliance data */}
      <Nav tabs className="mb-2">
        {[
          { id: "immigration", label: t("Immigration Records") },
          { id: "rtw", label: t("RTW Checks") },
          { id: "events", label: t("UKVI Events") },
          { id: "audit", label: t("Audit Log") },
        ].map((st) => (
          <NavItem key={st.id}>
            <NavLink active={subTab === st.id} onClick={() => setSubTab(st.id)} className="cursor-pointer">
              {st.label}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      <TabContent activeTab={subTab}>
        {/* ── Immigration Records ─────────────────────────────────── */}
        <TabPane tabId="immigration">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">{t("Immigration Records")}</h6>
            <Button color="primary" size="sm" onClick={openImmigCreate}><Plus size={14} className="me-50" />{t("Add Record")}</Button>
          </div>
          {store?.loading ? (
            <div className="text-center my-3"><Spinner color="primary" /></div>
          ) : immigrationData.length > 0 ? (
            <DatatablePagination columns={immigColumns} data={immigrationData} />
          ) : (
            <div className="text-center text-muted py-3">{t("No immigration records found.")}</div>
          )}
        </TabPane>

        {/* ── RTW Checks ──────────────────────────────────────────── */}
        <TabPane tabId="rtw">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">{t("Right to Work Checks")}</h6>
            <Button color="primary" size="sm" onClick={() => { setRtwForm(initRtwForm); setRtwModal(true); }}><Plus size={14} className="me-50" />{t("Add Check")}</Button>
          </div>
          {store?.loading ? (
            <div className="text-center my-3"><Spinner color="primary" /></div>
          ) : rtwData.length > 0 ? (
            <DatatablePagination columns={rtwColumns} data={rtwData} />
          ) : (
            <div className="text-center text-muted py-3">{t("No RTW checks found.")}</div>
          )}
        </TabPane>

        {/* ── UKVI Events ─────────────────────────────────────────── */}
        <TabPane tabId="events">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">{t("UKVI Reportable Events")}</h6>
            <Button color="primary" size="sm" onClick={() => { setEventForm(initEventForm); setEventModal(true); }}><Plus size={14} className="me-50" />{t("Add Event")}</Button>
          </div>
          {store?.loading ? (
            <div className="text-center my-3"><Spinner color="primary" /></div>
          ) : eventData.length > 0 ? (
            <DatatablePagination columns={eventColumns} data={eventData} />
          ) : (
            <div className="text-center text-muted py-3">{t("No UKVI events found.")}</div>
          )}
        </TabPane>

        {/* ── Audit Log ───────────────────────────────────────────── */}
        <TabPane tabId="audit">
          <h6 className="mb-2">{t("Compliance Audit Log")}</h6>
          <small className="text-muted d-block mb-2">{t("Read-only record of all compliance actions for this employee.")}</small>
          {auditLoading ? (
            <div className="text-center my-3"><Spinner color="primary" /></div>
          ) : auditData.length > 0 ? (
            <DatatablePagination columns={auditColumns} data={auditData} />
          ) : (
            <div className="text-center text-muted py-3">{t("No audit records found.")}</div>
          )}
        </TabPane>
      </TabContent>

      {/* ── Immigration Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={immigModal} toggle={() => setImmigModal(false)} size="lg">
        <ModalHeader toggle={() => setImmigModal(false)}>
          {editImmig ? t("Edit Immigration Record") : t("Add Immigration Record")}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>{t("Visa Type")}</Label>
                <Input value={immigForm.visa_type} onChange={(e) => setImmigForm({ ...immigForm, visa_type: e.target.value })} placeholder={t("e.g. Skilled Worker")} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Immigration Status")}</Label>
                <Input type="select" value={immigForm.immigration_status} onChange={(e) => setImmigForm({ ...immigForm, immigration_status: e.target.value })}>
                  <option value="british_citizen">{t("British Citizen")}</option>
                  <option value="eu_settled">{t("EU Settled")}</option>
                  <option value="eu_pre_settled">{t("EU Pre-Settled")}</option>
                  <option value="visa_holder">{t("Visa Holder")}</option>
                  <option value="ilr">{t("ILR")}</option>
                  <option value="other">{t("Other")}</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("BRP Number")}</Label>
                <Input value={immigForm.brp_number} onChange={(e) => setImmigForm({ ...immigForm, brp_number: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Share Code")}</Label>
                <Input value={immigForm.share_code} onChange={(e) => setImmigForm({ ...immigForm, share_code: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Visa Start Date")}</Label>
                <DateInput value={immigForm.visa_start_date} id="visa_start_date"
                  onChange={(dates, str, iso) => setImmigForm({ ...immigForm, visa_start_date: iso })} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Visa Expiry Date")}</Label>
                <DateInput value={immigForm.visa_expiry_date} id="visa_expiry_date"
                  onChange={(dates, str, iso) => setImmigForm({ ...immigForm, visa_expiry_date: iso })} />
              </FormGroup>
            </Col>
            <Col md="12">
              <FormGroup>
                <Label>{t("Work Restriction")}</Label>
                <Input type="textarea" rows={2} value={immigForm.work_restriction} onChange={(e) => setImmigForm({ ...immigForm, work_restriction: e.target.value })} placeholder={t("e.g. 20 hrs/week during term")} />
              </FormGroup>
            </Col>
            <Col md="12">
              <FormGroup check className="mb-2">
                <Input type="checkbox" id="is_sponsored" checked={immigForm.is_sponsored} onChange={(e) => setImmigForm({ ...immigForm, is_sponsored: e.target.checked })} />
                <Label check htmlFor="is_sponsored">{t("Sponsored Employee")}</Label>
              </FormGroup>
            </Col>
            {immigForm.is_sponsored && (
              <>
                <Col md="4">
                  <FormGroup>
                    <Label>{t("CoS Number")}</Label>
                    <Input value={immigForm.cos_number} onChange={(e) => setImmigForm({ ...immigForm, cos_number: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <Label>{t("CoS Start Date")}</Label>
                    <DateInput value={immigForm.cos_start_date} id="cos_start_date"
                      onChange={(dates, str, iso) => setImmigForm({ ...immigForm, cos_start_date: iso })} />
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <Label>{t("CoS Expiry Date")}</Label>
                    <DateInput value={immigForm.cos_expiry_date} id="cos_expiry_date"
                      onChange={(dates, str, iso) => setImmigForm({ ...immigForm, cos_expiry_date: iso })} />
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label>{t("Sponsor Licence Number")}</Label>
                    <Input value={immigForm.sponsor_license_number} onChange={(e) => setImmigForm({ ...immigForm, sponsor_license_number: e.target.value })} />
                  </FormGroup>
                </Col>
              </>
            )}
            <Col md="12">
              <FormGroup>
                <Label>{t("Notes")}</Label>
                <Input type="textarea" rows={2} value={immigForm.notes} onChange={(e) => setImmigForm({ ...immigForm, notes: e.target.value })} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setImmigModal(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleImmigSave}>{editImmig ? t("Update") : t("Save")}</Button>
        </ModalFooter>
      </Modal>

      {/* ── RTW Check Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={rtwModal} toggle={() => setRtwModal(false)} size="lg">
        <ModalHeader toggle={() => setRtwModal(false)}>{t("Add RTW Check")}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>{t("Check Type")}</Label>
                <Input type="select" value={rtwForm.check_type} onChange={(e) => setRtwForm({ ...rtwForm, check_type: e.target.value })}>
                  <option value="manual">{t("Manual")}</option>
                  <option value="digital_share_code">{t("Digital Share Code")}</option>
                  <option value="employer_checking_service">{t("Employer Checking Service")}</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Check Date")} <span className="text-danger">*</span></Label>
                <DateInput value={rtwForm.check_date} id="check_date"
                  onChange={(dates, str, iso) => setRtwForm({ ...rtwForm, check_date: iso })} />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Result")}</Label>
                <Input type="select" value={rtwForm.result} onChange={(e) => setRtwForm({ ...rtwForm, result: e.target.value })}>
                  <option value="passed">{t("Passed")}</option>
                  <option value="failed">{t("Failed")}</option>
                  <option value="pending">{t("Pending")}</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>{t("Valid Until")}</Label>
                <DateInput value={rtwForm.valid_until} id="valid_until"
                  onChange={(dates, str, iso) => setRtwForm({ ...rtwForm, valid_until: iso })} />
                <small className="text-muted">{t("Leave blank for British citizens (indefinite)")}</small>
              </FormGroup>
            </Col>
            {rtwForm.check_type === "digital_share_code" && (
              <Col md="6">
                <FormGroup>
                  <Label>{t("Share Code Used")}</Label>
                  <Input value={rtwForm.share_code_used} onChange={(e) => setRtwForm({ ...rtwForm, share_code_used: e.target.value })} />
                </FormGroup>
              </Col>
            )}
            <Col md="12">
              <FormGroup check className="mb-2">
                <Input type="checkbox" id="rtw_followup" checked={rtwForm.follow_up_required} onChange={(e) => setRtwForm({ ...rtwForm, follow_up_required: e.target.checked })} />
                <Label check htmlFor="rtw_followup">{t("Follow-up Required")}</Label>
              </FormGroup>
            </Col>
            {rtwForm.follow_up_required && (
              <Col md="6">
                <FormGroup>
                  <Label>{t("Follow-up Date")}</Label>
                  <DateInput value={rtwForm.follow_up_date} id="follow_up_date"
                    onChange={(dates, str, iso) => setRtwForm({ ...rtwForm, follow_up_date: iso })} />
                </FormGroup>
              </Col>
            )}
            <Col md="12">
              <FormGroup>
                <Label>{t("Notes")}</Label>
                <Input type="textarea" rows={2} value={rtwForm.notes} onChange={(e) => setRtwForm({ ...rtwForm, notes: e.target.value })} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setRtwModal(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleRtwSave} disabled={!rtwForm.check_date}>{t("Save")}</Button>
        </ModalFooter>
      </Modal>

      {/* ── UKVI Event Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={eventModal} toggle={() => setEventModal(false)}>
        <ModalHeader toggle={() => setEventModal(false)}>{t("Add UKVI Event")}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("Event Type")} <span className="text-danger">*</span></Label>
            <Input type="select" value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}>
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{t(et.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))}</option>
              ))}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>{t("Event Date")} <span className="text-danger">*</span></Label>
            <DateInput value={eventForm.event_date} id="event_date"
              onChange={(dates, str, iso) => setEventForm({ ...eventForm, event_date: iso })} />
          </FormGroup>
          <FormGroup>
            <Label>{t("Description")}</Label>
            <Input type="textarea" rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setEventModal(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleEventSave} disabled={!eventForm.event_date}>{t("Save")}</Button>
        </ModalFooter>
      </Modal>

      {/* ── Report Event Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={reportModal} toggle={() => setReportModal(false)}>
        <ModalHeader toggle={() => setReportModal(false)}>{t("Report to UKVI")}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("UKVI Reference Number")}</Label>
            <Input value={reportRef} onChange={(e) => setReportRef(e.target.value)} placeholder={t("e.g. UKVI-2026-XXXXX")} />
            <small className="text-muted">{t("Optional - enter if you have a reference number")}</small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setReportModal(false)}>{t("Cancel")}</Button>
          <Button color="success" onClick={handleReport}>{t("Confirm Report")}</Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default ImmigrationTab;
