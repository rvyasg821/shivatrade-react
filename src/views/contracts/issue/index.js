// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import useFormLoading from "@src/hooks/useFormLoading";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getContractTemplateList,
  issueContract,
  clearContractMessages,
} from "../store";
import { getEmployeeList } from "@src/views/employees/store";

// ** Reactstrap Imports
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle,
  Form, Label, Input, Button,
} from "reactstrap";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Notification
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";

// ** Icons
import { ArrowLeft, Send } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

const IssueContract = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.contract);
  const employeeStore = useSelector((state) => state.employee);
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["contract"] || {};
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add);
  const locationCtx = useSelector((state) => state.locationContext);
  const { selectedLocationId } = locationCtx || {};

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getContractTemplateList({ _limit: 100, _offset: 0 }));
    const empParams = { _limit: 200, _offset: 0 };
    if (selectedLocationId) empParams.location_id = selectedLocationId;
    dispatch(getEmployeeList(empParams));
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "EC_ISS_SCS") {
      Notification("Success", store.success || t("Contract issued successfully"), "success");
      navigate(`${appsRoot}/contracts`);
      dispatch(clearContractMessages());
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(clearContractMessages());
    }
  }, [store?.actionFlag, store?.error]);

  const templateOptions = (store?.templateItems || [])
    .filter((tmpl) => tmpl.status === "active")
    .map((tmpl) => ({ value: tmpl._id, label: tmpl.name }));

  const employeeOptions = (employeeStore?.employeeItems || []).map((emp) => ({
    value: emp._id,
    label: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email,
    email: emp.email,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedTemplate) {
      Notification("Warning", t("Please select an employee and a template"), "warning");
      return;
    }
    setSubmitting(true);
    try {
      dispatch(issueContract({
        user_id: selectedEmployee.value,
        template_id: selectedTemplate.value,
        effective_date: effectiveDate || undefined,
        end_date: endDate || undefined,
        notes: notes || undefined,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitting = !store?.loading;

  return (
    <Fragment>
      <div className="main-content contracts">
        {/* ── Page Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Issue Contract to Employee")}</h3>
          <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Form autoComplete="off" onSubmit={handleSubmit}>
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t("Contract Details")}</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              {!canWrite ? (
                <div className="alert alert-warning mb-0">
                  {t("You do not have permission to issue contracts.")}
                </div>
              ) : (
                <Row>
                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">
                      {t("Employee")} <span className="text-danger">*</span>
                    </Label>
                    <Select
                      classNamePrefix="select"
                      options={employeeOptions}
                      value={selectedEmployee}
                      onChange={setSelectedEmployee}
                      placeholder={t("Select employee...")}
                      formatOptionLabel={(opt) => (
                        <div>
                          <div className="fw-semibold">{opt.label}</div>
                          {opt.email && opt.label !== opt.email && (
                            <div className="text-muted small">{opt.email}</div>
                          )}
                        </div>
                      )}
                    />
                  </Col>

                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">
                      {t("Contract Template")} <span className="text-danger">*</span>
                    </Label>
                    <Select
                      classNamePrefix="select"
                      options={templateOptions}
                      value={selectedTemplate}
                      onChange={setSelectedTemplate}
                      placeholder={t("Select active template...")}
                    />
                  </Col>

                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">{t("Effective Date")}</Label>
                    <DateInput
                      value={effectiveDate}
                      id="effective_date"
                      onChange={(dates, str, iso) => setEffectiveDate(iso)}
                    />
                  </Col>

                  <Col md={6} sm={12} className="mb-2">
                    <Label className="form-label">
                      {t("End Date")}{" "}
                      <span className="text-muted small">({t("leave blank for permanent")})</span>
                    </Label>
                    <DateInput
                      value={endDate}
                      id="end_date"
                      onChange={(dates, str, iso) => setEndDate(iso)}
                    />
                  </Col>

                  <Col sm={12} className="mb-1">
                    <Label className="form-label">{t("Notes")}</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("Optional notes for this contract...")}
                    />
                  </Col>

                  {selectedTemplate && (
                    <Col sm={12} className="mt-1">
                      <div className="alert alert-info mb-0 py-1">
                        <strong>{t("Note:")}</strong>{" "}
                        {t("The contract will be pre-populated with the employee's profile data based on the template's auto-populate settings. The employee will be notified to review and sign.")}
                      </div>
                    </Col>
                  )}
                </Row>
              )}
            </CardBody>
          </Card>

          {canWrite && (
            <div className="main-form-btn">
              <div className="form-btn mt-2">
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting || !selectedEmployee || !selectedTemplate}
                >
                  <Send size={14} className="me-1" />
                  {isSubmitting ? t("Issuing...") : t("Issue Contract")}
                </Button>
              </div>
              <div className="form-btn mt-2">
                <Button
                  type="button"
                  color="secondary"
                  disabled={isSubmitting}
                  onClick={() => navigate(`${appsRoot}/contracts`)}
                >
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          )}
        </Form>
      </div>
    </Fragment>
  );
};

export default IssueContract;
