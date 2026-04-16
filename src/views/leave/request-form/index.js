// ** React Imports
import { Fragment, useState, useEffect } from "react";
import useFormLoading from "@src/hooks/useFormLoading";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getLeaveTypeList,
  getMyLeaveBalance,
  submitLeaveRequest,
  calculateLeaveDays,
  clearLeaveMessages,
} from "../store";

// ** Reactstrap
import {
  Row, Col, Card, CardBody, CardHeader, Form, FormGroup, Label, Input, Button, Badge,
} from "reactstrap";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

const LeaveRequestForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.leave);

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  const [leaveType, setLeaveType] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHalf, setStartHalf] = useState("full");
  const [endHalf, setEndHalf] = useState("full");
  const [reason, setReason] = useState("");

  useEffect(() => {
    dispatch(getLeaveTypeList());
    dispatch(getMyLeaveBalance(new Date().getFullYear()));
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "MY_REQ_CRT_SCS") {
      Notification("Success", store.success || "Leave request submitted", "success");
      navigate(`${appsRoot}/leave`);
      dispatch(clearLeaveMessages());
    }
    if (store?.actionFlag === "ERROR") {
      Notification("Error", store.error || "Failed to submit", "warning");
      dispatch(clearLeaveMessages());
    }
  }, [store?.actionFlag]);

  // Auto-calculate days when dates change
  useEffect(() => {
    if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
      dispatch(calculateLeaveDays({ start: startDate, end: endDate, startHalf, endHalf }));
    }
  }, [startDate, endDate, startHalf, endHalf]);

  const typeOptions = (store?.leaveTypeItems || []).map((lt) => ({
    value: lt._id,
    label: lt.name,
    color: lt.color,
    balance: store?.myBalance?.find((b) => b.leave_type_id === lt._id)?.balance,
  }));

  const selectedBalance = store?.myBalance?.find((b) => b.leave_type_id === leaveType?.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!leaveType || !startDate || !endDate) {
      Notification("Warning", "Please fill all required fields", "warning");
      return;
    }
    setSubmitting(true);
    try {
      dispatch(submitLeaveRequest({
        leave_type_id: leaveType.value,
        start_date: startDate,
        end_date: endDate,
        start_half: startHalf,
        end_half: endHalf,
        reason,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const halfOptions = [
    { value: "full", label: t("Full Day") },
    { value: "am", label: t("AM (Morning)") },
    { value: "pm", label: t("PM (Afternoon)") },
  ];

  return (
    <Fragment>
      <Card>
        <CardHeader>
          <h4 className="mb-0">{t("Request Leave")}</h4>
        </CardHeader>
        <CardBody>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>{t("Leave Type")} *</Label>
                  <Select
                    options={typeOptions}
                    value={leaveType}
                    onChange={setLeaveType}
                    placeholder={t("Select leave type...")}
                    formatOptionLabel={(opt) => (
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: 12, height: 12, borderRadius: "50%",
                            background: opt.color || "#ccc", display: "inline-block",
                          }}
                        />
                        <span>{opt.label}</span>
                        {opt.balance !== undefined && (
                          <Badge color="light-info" pill className="ms-auto" style={{ fontSize: "0.7rem" }}>
                            {opt.balance} days
                          </Badge>
                        )}
                      </div>
                    )}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                {selectedBalance && (
                  <div className="alert alert-info mt-2">
                    <strong>{t("Available Balance:")}</strong> {selectedBalance.balance} days
                    <span className="ms-2 text-muted">({selectedBalance.used} used, {selectedBalance.pending} pending)</span>
                  </div>
                )}
              </Col>

              <Col md={6}>
                <FormGroup>
                  <Label>{t("Start Date")} *</Label>
                  <DateInput value={startDate} id="start_date" onChange={(dates, str, iso) => {
                    const val = iso
                    setStartDate(val)
                    if (!endDate || endDate < val) setEndDate(val)
                  }} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>{t("Start Day")}</Label>
                  <Input type="select" value={startHalf} onChange={(e) => setStartHalf(e.target.value)}>
                    {halfOptions.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </Input>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <Label>{t("End Date")} *</Label>
                  <DateInput
                    value={endDate}
                    id="end_date"
                    minDate={startDate || undefined}
                    disabled={!startDate}
                    onChange={(dates, str, iso) => {
                      const val = iso
                      if (startDate && val < startDate) return
                      setEndDate(val)
                    }}
                  />
                  {startDate && endDate && endDate < startDate && (
                    <small className="text-danger">{t("End date must be on or after start date")}</small>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>{t("End Day")}</Label>
                  <Input type="select" value={endHalf} onChange={(e) => setEndHalf(e.target.value)}>
                    {halfOptions.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </Input>
                </FormGroup>
              </Col>

              {store?.calculatedDays > 0 && (
                <Col md={12}>
                  <div className="alert alert-success">
                    <strong>{t("Working days requested:")}</strong> {store.calculatedDays} day(s)
                    {selectedBalance && store.calculatedDays > selectedBalance.balance && (
                      <span className="ms-2 text-danger fw-bold">
                        ⚠ {t("Exceeds available balance")}
                      </span>
                    )}
                  </div>
                </Col>
              )}

              <Col md={12}>
                <FormGroup>
                  <Label>{t("Reason")}</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("Optional reason for leave...")}
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-2">
              <Button type="button" color="secondary" outline onClick={() => navigate(-1)}>
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={!store?.loading || !leaveType || !startDate || !endDate}
              >
                {!store?.loading ? t("Submitting...") : t("Submit Request")}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default LeaveRequestForm;
