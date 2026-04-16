// ** React Imports
import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getContractList, getMyContracts, deleteContract, clearContractMessages } from "./store";

// ** Reactstrap Imports
import {
  Col, Row, Card, Input, Button, CardBody, Badge, UncontrolledTooltip,
  Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Spinner,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Select from "react-select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Eye, Trash2, PlusCircle, Edit3, Settings } from "react-feather";

// ** Utility & Hooks
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Constant
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const statusColors = {
  draft: "light-secondary",
  issued: "light-info",
  pending_signature: "light-warning",
  signed: "light-success",
  expired: "light-danger",
  terminated: "light-dark",
};

const statusBadgeClass = {
  draft: "doc-badge-gray",
  issued: "doc-badge-orange",
  pending_signature: "doc-badge-orange",
  signed: "doc-badge-green",
  expired: "doc-badge-red",
  terminated: "doc-badge-red",
};

// ─── Contract Notification Events ────────────────────────────────────────────
const CONTRACT_EVENTS = [
  { key: "CONTRACT_ISSUED", label: "Contract Issued" },
  { key: "CONTRACT_SIGNED", label: "Contract Signed" },
];

// ─── Contract Notification Settings Component ────────────────────────────────
import NotificationSettingsPanel from '@components/notification-settings'

const ContractNotificationSettings = () => (
  <NotificationSettingsPanel events={CONTRACT_EVENTS} />
);

const _ContractNotificationSettings_OLD = ({ onClose }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  useFormLoading(saving);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({});

  // Template editor state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [editTemplate, setEditTemplate] = useState({
    channel: "email",
    subject: "",
    body: "",
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  useFormLoading(savingTemplate);

  // Load notification preferences on mount
  useEffect(() => {
    instance
      .get("/admin/notification/preferences")
      .then((res) => {
        const prefs = {};
        const list = res.data?.data || [];
        list.forEach((p) => {
          prefs[p.event_key] = p;
        });
        setNotifPrefs(prefs);
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handleNotifToggle = (eventKey, channel, value) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {
          email_enabled: true,
          sms_enabled: false,
          whatsapp_enabled: false,
        }),
        [channel]: value,
      },
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const preferences = CONTRACT_EVENTS.map((evt) => ({
        event_key: evt.key,
        email_enabled: notifPrefs[evt.key]?.email_enabled ?? true,
        sms_enabled: notifPrefs[evt.key]?.sms_enabled ?? false,
        whatsapp_enabled: notifPrefs[evt.key]?.whatsapp_enabled ?? false,
      }));
      await instance.put("/admin/notification/preferences", { preferences });
      Notification("Success", t("Notification preferences saved"), "success");
    } catch (err) {
      Notification(
        "Error",
        err?.message || t("Failed to save preferences"),
        "warning"
      );
    } finally {
      setSaving(false);
    }
  };

  // Load template when event selection changes
  const handleEventSelect = useCallback(
    (opt) => {
      setSelectedEvent(opt);
      if (!opt) {
        setSystemTemplates([]);
        setEditTemplate({ channel: "email", subject: "", body: "" });
        return;
      }
      setLoadingTemplate(true);
      instance
        .get(`/admin/notification/templates/${opt.value}`)
        .then((res) => {
          const data = res.data?.data;
          const templates = Array.isArray(data) ? data : data ? [data] : [];
          setSystemTemplates(templates);
          // Pre-fill editable fields from the first template if available
          const first = templates[0];
          setEditTemplate({
            channel: first?.channel || "email",
            subject: first?.subject || "",
            body: first?.body || "",
          });
        })
        .catch(() => {
          setSystemTemplates([]);
          setEditTemplate({ channel: "email", subject: "", body: "" });
        })
        .finally(() => setLoadingTemplate(false));
    },
    []
  );

  const handleSaveTemplate = async () => {
    if (!selectedEvent) return;
    setSavingTemplate(true);
    try {
      await instance.put(
        `/admin/notification/templates/${selectedEvent.value}`,
        {
          channel: editTemplate.channel,
          subject: editTemplate.subject,
          body: editTemplate.body,
        }
      );
      Notification("Success", t("Template saved"), "success");
    } catch (err) {
      Notification(
        "Error",
        err?.message || t("Failed to save template"),
        "warning"
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const eventOptions = CONTRACT_EVENTS.map((e) => ({
    value: e.key,
    label: t(e.label),
  }));

  return (
    <>
      {/* ── Notification Preferences ── */}
      <h6 className="fw-bold text-uppercase text-muted mb-1">
        {t("Notification Preferences")}
      </h6>
      <hr className="mt-0 mb-2" />
      {loadingPrefs ? (
        <div className="text-center py-2">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="table-responsive">
          <table
            className="table table-bordered mb-0"
            style={{ fontSize: "0.85rem" }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ width: "40%" }}>{t("Event")}</th>
                <th className="text-center" style={{ width: "20%" }}>
                  {t("Email")}
                </th>
                <th className="text-center" style={{ width: "20%" }}>
                  {t("SMS")}
                </th>
                <th className="text-center" style={{ width: "20%" }}>
                  {t("WhatsApp")}
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_EVENTS.map((evt) => {
                const pref = notifPrefs[evt.key] || {
                  email_enabled: true,
                  sms_enabled: false,
                  whatsapp_enabled: false,
                };
                return (
                  <tr key={evt.key}>
                    <td>{t(evt.label)}</td>
                    <td className="text-center">
                      <Input
                        type="checkbox"
                        checked={pref.email_enabled !== false}
                        onChange={(e) =>
                          handleNotifToggle(
                            evt.key,
                            "email_enabled",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td className="text-center">
                      <Input
                        type="checkbox"
                        checked={!!pref.sms_enabled}
                        onChange={(e) =>
                          handleNotifToggle(
                            evt.key,
                            "sms_enabled",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                    <td className="text-center">
                      <Input
                        type="checkbox"
                        checked={!!pref.whatsapp_enabled}
                        onChange={(e) =>
                          handleNotifToggle(
                            evt.key,
                            "whatsapp_enabled",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="d-flex justify-content-end mt-2 mb-3">
        <Button
          color="primary"
          size="sm"
          onClick={handleSavePreferences}
          disabled={saving}
        >
          {saving ? <Spinner size="sm" /> : t("Save Preferences")}
        </Button>
      </div>

      {/* ── Email / SMS Templates ── */}
      <h6 className="fw-bold text-uppercase text-muted mb-1">
        {t("Email / SMS Templates")}
      </h6>
      <hr className="mt-0 mb-2" />
      <FormGroup>
        <Label>{t("Select Event")}</Label>
        <Select
          classNamePrefix="select"
          options={eventOptions}
          value={selectedEvent}
          onChange={handleEventSelect}
          placeholder={t("Choose a contract event...")}
          isClearable
        />
      </FormGroup>

      {loadingTemplate && (
        <div className="text-center py-2">
          <Spinner size="sm" />
        </div>
      )}

      {!loadingTemplate && selectedEvent && (
        <>
          {/* System template reference */}
          {systemTemplates.length > 0 && (
            <>
              <Label className="form-label small text-muted">
                {t("System Template Reference")}
              </Label>
              {systemTemplates.map((tpl, idx) => (
                <Card key={idx} className="border mb-1">
                  <CardBody className="py-1">
                    {tpl.subject && (
                      <FormGroup className="mb-50">
                        <Label className="form-label small text-muted mb-0">
                          {t("Subject")}
                        </Label>
                        <Input
                          type="text"
                          value={tpl.subject}
                          disabled
                          className="bg-light"
                        />
                      </FormGroup>
                    )}
                    <FormGroup className="mb-0">
                      <Label className="form-label small text-muted mb-0">
                        {t("Body")}
                      </Label>
                      <Input
                        type="textarea"
                        rows={3}
                        value={tpl.body || ""}
                        disabled
                        className="bg-light"
                      />
                    </FormGroup>
                  </CardBody>
                </Card>
              ))}
            </>
          )}

          {/* Editable template */}
          <Card className="border mb-1">
            <CardBody className="py-1">
              <FormGroup>
                <Label className="form-label">{t("Channel")}</Label>
                <Input
                  type="select"
                  value={editTemplate.channel}
                  onChange={(e) =>
                    setEditTemplate((prev) => ({
                      ...prev,
                      channel: e.target.value,
                    }))
                  }
                >
                  <option value="email">{t("Email")}</option>
                  <option value="sms">{t("SMS")}</option>
                  <option value="whatsapp">{t("WhatsApp")}</option>
                </Input>
              </FormGroup>
              {editTemplate.channel === "email" && (
                <FormGroup>
                  <Label className="form-label">{t("Subject")}</Label>
                  <Input
                    type="text"
                    value={editTemplate.subject}
                    onChange={(e) =>
                      setEditTemplate((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder={t("Email subject line...")}
                  />
                </FormGroup>
              )}
              <FormGroup>
                <Label className="form-label">
                  {t("Body")}{" "}
                  {editTemplate.channel === "email" ? "(HTML)" : ""}
                </Label>
                <Input
                  type="textarea"
                  rows={6}
                  value={editTemplate.body}
                  onChange={(e) =>
                    setEditTemplate((prev) => ({
                      ...prev,
                      body: e.target.value,
                    }))
                  }
                  placeholder={
                    editTemplate.channel === "email"
                      ? t("HTML template body...")
                      : t("Message body...")
                  }
                />
              </FormGroup>
              <small className="text-muted d-block mb-1">
                {t("Available placeholders")}:{" "}
                {"{{employeeName}}, {{companyName}}, {{contractName}}, {{effectiveDate}}, {{endDate}}, {{status}}"}
              </small>
              <Button
                color="primary"
                size="sm"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? <Spinner size="sm" /> : t("Save Template")}
              </Button>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
};

const ContractList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const dispatch = useDispatch();

  const store = useSelector((state) => state.contract);
  const locationCtx = useSelector((state) => state.locationContext);
  const { selectedLocationId } = locationCtx || {};
  const authStore = useSelector((state) => state.auth);
  const roleName = authStore?.authUserItem?.role?.name;
  const isEmployee = roleName === "Employee";
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["contract"] || {};
  const canWrite = !isEmployee && !!(modulePerms.can_update || modulePerms.can_add);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPageRow);
  const [statusFilter, setStatusFilter] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [settingsModal, setSettingsModal] = useState(false);

  const prevLocationRef = useRef(selectedLocationId);

  const statusOptions = [
    { value: "draft", label: t("Draft") },
    { value: "issued", label: t("Issued") },
    { value: "pending_signature", label: t("Pending Signature") },
    { value: "signed", label: t("Signed") },
    { value: "expired", label: t("Expired") },
    { value: "terminated", label: t("Terminated") },
  ];

  const loadData = (page, limit, status, locId, userId) => {
    if (isEmployee) {
      dispatch(getMyContracts());
    } else {
      const params = { _limit: limit, _offset: (page - 1) * limit };
      if (status) params._status = status;
      if (locId) params._locationId = locId;
      if (userId) params._userId = userId;
      dispatch(getContractList(params));
    }
  };

  useEffect(() => {
    loadData(1, perPage, statusFilter?.value || "", selectedLocationId, employeeFilter?.value || "");
    // Load employees for filter dropdown
    if (!isEmployee && employeeOptions.length === 0) {
      instance.get(API_ENDPOINTS.employees.list, { params: { perPage: 500, page: 1 } })
        .then(res => {
          const list = res.data?.data || [];
          setEmployeeOptions(list.map(e => ({
            value: e._id,
            label: `${e.first_name || ''} ${e.last_name || ''}`.trim() + (e.employee_code ? ` (${e.employee_code})` : ''),
          })));
        })
        .catch(() => {});
    }
  }, [isEmployee]);

  useEffect(() => {
    if (prevLocationRef.current !== selectedLocationId) {
      prevLocationRef.current = selectedLocationId;
      setCurrentPage(1);
      loadData(1, perPage, statusFilter?.value || "", selectedLocationId, employeeFilter?.value || "");
    }
  }, [selectedLocationId]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(clearContractMessages());
  }, [store?.success, store?.error]);

  useEffect(() => {
    if (store?.actionFlag === "EC_DEL_SCS") {
      loadData(currentPage, perPage, statusFilter?.value || "", selectedLocationId, employeeFilter?.value || "");
    }
  }, [store?.actionFlag]);

  const handleDelete = (id, label) => {
    mySwal.fire({
      title: t("Are you sure?"),
      text: t(`Delete this contract? This action cannot be undone.`),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("Yes, delete it!"),
      cancelButtonText: t("Cancel"),
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteContract(id));
    });
  };

  const columns = [
    ...(!isEmployee ? [{
      name: t("Employee"),
      minWidth: "190px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1 gap-1">
          {row.employee ? (
            <>
              <span className="fw-semibold text-body">{row.employee.name}</span>
              <span className="text-muted small">{row.employee.email}</span>
            </>
          ) : (
            <span className="text-muted small">—</span>
          )}
        </div>
      ),
    }] : []),
    {
      name: t("Template / Dates"),
      minWidth: "200px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1 gap-1">
          <span className="fw-semibold text-body">
            {row.template_name || <span className="text-muted">—</span>}
          </span>
          <span className="text-muted small">
            {row.effective_date
              ? `${t("Effective")}: ${new Date(row.effective_date).toLocaleDateString("en-GB")}`
              : t("No effective date")}
            {row.end_date && ` · ${t("Ends")}: ${new Date(row.end_date).toLocaleDateString("en-GB")}`}
          </span>
        </div>
      ),
    },
    {
      name: t("Issued / Signed"),
      minWidth: "160px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1 gap-1">
          <span className="small">
            {row.issued_at
              ? new Date(row.issued_at).toLocaleDateString("en-GB")
              : <span className="text-muted">—</span>}
          </span>
          <span className={`small ${row.signed_at ? "text-success" : "text-muted"}`}>
            {row.signed_at
              ? new Date(row.signed_at).toLocaleDateString("en-GB")
              : t("Not signed")}
          </span>
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "150px",
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row.status] || "doc-badge-gray"}`}>
          {t(row.status?.replace(/_/g, " ") || "—")}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "110px",
      cell: (row) => (
        <div className="d-flex gap-1">
          <Link
            to={`${appsRoot}/contracts/view/${row._id}`}
            id={`view-${row._id}`}
          >
            <Eye size={16} className="text-info" />
          </Link>
          <UncontrolledTooltip target={`view-${row._id}`}>{t("View")}</UncontrolledTooltip>

          {isEmployee && ["issued", "pending_signature"].includes(row.status) && (
            <>
              <span
                id={`sign-${row._id}`}
                className="cursor-pointer"
                onClick={() => navigate(`${appsRoot}/contracts/sign/${row._id}`)}
              >
                <Edit3 size={16} className="text-warning" />
              </span>
              <UncontrolledTooltip target={`sign-${row._id}`}>{t("Sign")}</UncontrolledTooltip>
            </>
          )}

          {canWrite && (
            <>
              <span
                id={`del-${row._id}`}
                className="cursor-pointer"
                onClick={() => handleDelete(row._id)}
              >
                <Trash2 size={16} className="text-danger" />
              </span>
              <UncontrolledTooltip target={`del-${row._id}`}>{t("Delete")}</UncontrolledTooltip>
            </>
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
            <Col md={3}>
              <h4 className="mb-0">{t("Employee Contracts")}</h4>
            </Col>
            <Col md={9} className="d-flex justify-content-end gap-1 flex-wrap align-items-center">
              {!isEmployee && (
                <div style={{ width: 200 }}>
                  <Select
                    classNamePrefix="select"
                    options={employeeOptions}
                    value={employeeFilter}
                    onChange={(opt) => {
                      setEmployeeFilter(opt);
                      setCurrentPage(1);
                      loadData(1, perPage, statusFilter?.value || "", selectedLocationId, opt?.value || "");
                    }}
                    placeholder={t("All employees")}
                    isClearable isSearchable
                  />
                </div>
              )}
              {!isEmployee && (
                <div style={{ width: 180 }}>
                  <Select
                    classNamePrefix="select"
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(opt) => {
                      setStatusFilter(opt);
                      setCurrentPage(1);
                      loadData(1, perPage, opt?.value || "", selectedLocationId, employeeFilter?.value || "");
                    }}
                    placeholder={t("All statuses")}
                    isClearable
                  />
                </div>
              )}
              {!isEmployee && canWrite && (
                <Button
                  color="flat-secondary"
                  className="btn-icon"
                  id="contract-settings-btn"
                  onClick={() => setSettingsModal(true)}
                >
                  <Settings size={18} />
                </Button>
              )}
              {!isEmployee && canWrite && (
                <UncontrolledTooltip target="contract-settings-btn">
                  {t("Notification Settings")}
                </UncontrolledTooltip>
              )}
              {!isEmployee && canWrite && (
                <Button color="primary" tag={Link} to={`${appsRoot}/contracts/issue`}>
                  <PlusCircle size={14} className="me-1" />
                  {t("Issue Contract")}
                </Button>
              )}
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={isEmployee ? (store?.myContractItems || []) : (store?.contractItems || [])}
            pagination={{ total: isEmployee ? (store?.myContractItems?.length || 0) : (store?.contractTotal || 0), perPage }}
            rowsPerPage={perPage}
            currentPage={currentPage}
            handlePagination={(page) => {
              setCurrentPage(page + 1);
              loadData(page + 1, perPage, statusFilter?.value || "", selectedLocationId, employeeFilter?.value || "");
            }}
            handleRowPerPage={(rows) => {
              setPerPage(rows);
              setCurrentPage(1);
              loadData(1, rows, statusFilter?.value || "", selectedLocationId, employeeFilter?.value || "");
            }}
            loading={store?.loading}
          />
        </CardBody>
      </Card>
      {/* ── Notification Settings Modal ── */}
      <Modal
        isOpen={settingsModal}
        toggle={() => setSettingsModal(false)}
        size="lg"
        scrollable
      >
        <ModalHeader toggle={() => setSettingsModal(false)}>
          {t("Contract Notification Settings")}
        </ModalHeader>
        <ModalBody>
          <ContractNotificationSettings
            onClose={() => setSettingsModal(false)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setSettingsModal(false)}>
            {t("Close")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default ContractList;
