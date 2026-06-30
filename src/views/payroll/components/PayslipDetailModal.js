import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Spinner, Row, Col, FormGroup, Label, Input, Alert,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, X } from "react-feather";

import Notification from "@components/toast/notification";
import {
  getPayslip,
  addPayslipLineItem,
  deletePayslipLineItem,
  cleanPayrollMessage,
} from "../store";

const formatMoney = (n, currency = "GBP") => {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${symbol}${(Number(n) || 0).toFixed(2)}`;
};

const DEDUCTION_QUICK_OPTIONS = [
  { category: "tax", label: "Income Tax (PAYE)" },
  { category: "ni", label: "National Insurance" },
  { category: "student_loan", label: "Student Loan" },
  { category: "court_order", label: "Court Order" },
  { category: "other_deduction", label: "Other Deduction" },
];

const EARNING_QUICK_OPTIONS = [
  { category: "bonus", label: "Bonus" },
  { category: "allowance", label: "Allowance" },
  { category: "commission", label: "Commission" },
  { category: "other_earning", label: "Other Earning" },
];

const PayslipDetailModal = ({ payslipId, onClose, readOnly = false }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.payroll);
  const slip = store?.payslipItem;

  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    type: "deduction",
    category: "tax",
    label: "Income Tax (PAYE)",
    amount: 0,
    is_pre_tax: false,
    is_taxable: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payslipId) dispatch(getPayslip(payslipId));
  }, [payslipId]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (["SLIP_ADD_LI_SCS", "SLIP_DEL_LI_SCS"].includes(store?.actionFlag) && payslipId) {
      dispatch(getPayslip(payslipId));
      setAddOpen(false);
    }
    if (store?.success || store?.error) dispatch(cleanPayrollMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const handleAddLineItem = async () => {
    if (!newItem.label || !newItem.amount) {
      Notification("Warning", t("Label and amount are required"), "warning");
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(addPayslipLineItem({ payslipId, data: { ...newItem, amount: Number(newItem.amount) } }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm(t("Delete this line item?"))) return;
    await dispatch(deletePayslipLineItem(itemId));
  };

  const handleQuickPick = (opt) => {
    setNewItem({
      ...newItem,
      type: "deduction",
      category: opt.category,
      label: opt.label,
    });
  };

  const handleEarningPick = (opt) => {
    setNewItem({
      ...newItem,
      type: "earning",
      category: opt.category,
      label: opt.label,
      is_taxable: true,
    });
  };

  if (!payslipId) return null;

  const earnings = (slip?.line_items || []).filter((i) => i.type === "earning");
  const deductions = (slip?.line_items || []).filter((i) => i.type === "deduction");

  return (
    <Modal isOpen={!!payslipId} toggle={onClose} centered size="lg" backdrop="static" keyboard={false}>
      <ModalHeader
        toggle={onClose}
        style={{ backgroundColor: "#09418B", padding: "1.25rem 1.5rem" }}
        close={
          <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose} />
        }
      >
        <span style={{ color: "#fff" }}>{t("Payslip Detail")}</span>
      </ModalHeader>
      <ModalBody>
        {!slip ? (
          <div className="text-center py-3"><Spinner /></div>
        ) : (
          <>
            <Row className="mb-2">
              <Col md={6}>
                <div className="text-muted small">{t("Employee")}</div>
                <div className="fw-semibold">{slip.employee_name}</div>
                {slip.employee_code && <div className="text-muted small">{slip.employee_code}</div>}
              </Col>
              <Col md={3}>
                <div className="text-muted small">{t("Tax Code")}</div>
                <div>{slip.tax_code || "—"}</div>
              </Col>
              <Col md={3}>
                <div className="text-muted small">{t("NI Cat")}</div>
                <div>{slip.ni_category || "—"}</div>
              </Col>
            </Row>

            <Row className="mb-2">
              <Col md={4}>
                <div className="text-muted small">{t("Hours Worked")}</div>
                <div className="fw-semibold">{Number(slip.hours_worked).toFixed(2)} h</div>
              </Col>
              <Col md={4}>
                <div className="text-muted small">{t("Overtime")}</div>
                <div className="fw-semibold">{Number(slip.overtime_hours).toFixed(2)} h</div>
              </Col>
              <Col md={4}>
                <div className="text-muted small">{t("Unpaid Leave")}</div>
                <div className="fw-semibold">{Number(slip.unpaid_leave_days).toFixed(2)} days</div>
              </Col>
            </Row>

            <h6 className="fw-bold text-uppercase text-success mt-2 mb-1">{t("Earnings")}</h6>
            <div className="table-responsive">
            <table className="table table-sm">
              <tbody>
                {earnings.length === 0 ? (
                  <tr><td className="text-muted text-center" colSpan={3}>{t("No earnings")}</td></tr>
                ) : (
                  earnings.map((i) => (
                    <tr key={i._id}>
                      <td>{i.label} {i.is_auto && <small className="text-muted">(auto)</small>}</td>
                      <td className="text-end">{formatMoney(i.amount, slip.currency)}</td>
                      <td style={{ width: 30 }}>
                        {!readOnly && !i.is_auto && (
                          <Button color="link" size="sm" className="p-0" onClick={() => handleDelete(i._id)}>
                            <X size={14} className="text-danger" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="fw-bold border-top">
                  <td>{t("Gross Pay")}</td>
                  <td className="text-end">{formatMoney(slip.gross_pay, slip.currency)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            </div>

            <h6 className="fw-bold text-uppercase text-danger mt-2 mb-1">{t("Deductions")}</h6>
            <div className="table-responsive">
            <table className="table table-sm">
              <tbody>
                {deductions.length === 0 ? (
                  <tr><td className="text-muted text-center" colSpan={3}>{t("No deductions")}</td></tr>
                ) : (
                  deductions.map((i) => (
                    <tr key={i._id}>
                      <td>{i.label} {i.is_auto && <small className="text-muted">(auto)</small>}</td>
                      <td className="text-end">{formatMoney(i.amount, slip.currency)}</td>
                      <td style={{ width: 30 }}>
                        {!readOnly && !i.is_auto && (
                          <Button color="link" size="sm" className="p-0" onClick={() => handleDelete(i._id)}>
                            <X size={14} className="text-danger" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="fw-bold border-top">
                  <td>{t("Total Deductions")}</td>
                  <td className="text-end">{formatMoney(slip.total_deductions, slip.currency)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            </div>

            <Alert color="info" className="mb-2">
              <div className="d-flex justify-content-between align-items-center">
                <strong>{t("Net Pay")}</strong>
                <h4 className="mb-0 text-primary">{formatMoney(slip.net_pay, slip.currency)}</h4>
              </div>
            </Alert>

            {!readOnly && !addOpen && (
              <div className="d-flex gap-1 flex-wrap mb-2">
                <small className="text-muted me-2">{t("Quick add deduction:")}</small>
                {DEDUCTION_QUICK_OPTIONS.map((opt) => (
                  <Button
                    key={opt.category}
                    size="sm"
                    color="outline-secondary"
                    onClick={() => { handleQuickPick(opt); setAddOpen(true); }}
                  >
                    + {opt.label}
                  </Button>
                ))}
              </div>
            )}
            {!readOnly && !addOpen && (
              <div className="d-flex gap-1 flex-wrap mb-2">
                <small className="text-muted me-2">{t("Quick add earning:")}</small>
                {EARNING_QUICK_OPTIONS.map((opt) => (
                  <Button
                    key={opt.category}
                    size="sm"
                    color="outline-secondary"
                    onClick={() => { handleEarningPick(opt); setAddOpen(true); }}
                  >
                    + {opt.label}
                  </Button>
                ))}
              </div>
            )}

            {addOpen && (
              <div className="border rounded p-2 mb-2" style={{ background: "#f8f9fa" }}>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label className="small">{t("Label")}</Label>
                      <Input
                        bsSize="sm"
                        value={newItem.label}
                        onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup>
                      <Label className="small">{t("Amount")}</Label>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="0.01"
                        value={newItem.amount}
                        onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={2} className="d-flex align-items-end mb-1">
                    <Button color="primary" size="sm" onClick={handleAddLineItem} disabled={submitting}>
                      {submitting ? <Spinner size="sm" /> : <Plus size={14} />}
                    </Button>
                    <Button color="secondary" size="sm" outline onClick={() => setAddOpen(false)} className="ms-1">
                      <X size={14} />
                    </Button>
                  </Col>
                </Row>
              </div>
            )}

            <Row className="g-2 small text-muted mt-1">
              <Col xs={6}>{t("YTD Gross")}: <strong>{formatMoney(slip.ytd_gross, slip.currency)}</strong></Col>
              <Col xs={6}>{t("YTD Net")}: <strong>{formatMoney(slip.ytd_net, slip.currency)}</strong></Col>
              <Col xs={6}>{t("YTD Tax")}: <strong>{formatMoney(slip.ytd_tax, slip.currency)}</strong></Col>
              <Col xs={6}>{t("YTD NI")}: <strong>{formatMoney(slip.ytd_ni, slip.currency)}</strong></Col>
            </Row>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onClose}>{t("Close")}</Button>
      </ModalFooter>
    </Modal>
  );
};

export default PayslipDetailModal;
