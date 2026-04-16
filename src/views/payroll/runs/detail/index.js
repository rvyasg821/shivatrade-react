import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, CardBody, CardHeader, Row, Col, Button, Badge, Spinner, Alert,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Cpu, CheckCircle, DollarSign, RotateCcw, Download, FileText } from "react-feather";

import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import {
  getPayRun,
  calculatePayRun,
  approvePayRun,
  markPayRunPaid,
  revertPayRun,
  cleanPayrollMessage,
} from "../../store";
import PayslipDetailModal from "../../components/PayslipDetailModal";

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

const PayRunDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.payroll);

  const run = store?.runItem;
  const [busy, setBusy] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState(null);

  useEffect(() => {
    if (id) dispatch(getPayRun(id));
  }, [id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (
      ["PR_CALC_SCS", "PR_APR_SCS", "PR_PAID_SCS", "PR_REV_SCS", "SLIP_ADD_LI_SCS", "SLIP_DEL_LI_SCS"].includes(
        store?.actionFlag
      )
    ) {
      dispatch(getPayRun(id));
    }
    if (store?.success || store?.error) dispatch(cleanPayrollMessage());
  }, [store?.success, store?.error, store?.actionFlag]);

  const handleCalculate = async () => {
    if (!window.confirm(t("Calculate this pay run? This will create or refresh payslips for all eligible employees."))) return;
    setBusy(true);
    try {
      await dispatch(calculatePayRun(id));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(t("Approve this pay run? You won't be able to edit line items after approval without reverting."))) return;
    setBusy(true);
    try {
      await dispatch(approvePayRun(id));
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!window.confirm(t("Mark this pay run as paid? This is the final state and cannot be undone."))) return;
    setBusy(true);
    try {
      await dispatch(markPayRunPaid(id));
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (!window.confirm(t("Revert this pay run to draft? You'll be able to recalculate and edit it again."))) return;
    setBusy(true);
    try {
      await dispatch(revertPayRun(id));
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.runs}/${id}/bank-csv`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll-${id.slice(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      const included = res.headers["x-payroll-included"];
      const skipped = res.headers["x-payroll-skipped"];
      Notification("Success", `Bank CSV downloaded — ${included} included, ${skipped} skipped`, "success");
    } catch (err) {
      Notification("Error", err?.response?.data?.message || "Failed to download CSV", "warning");
    }
  };

  const handleDownloadPayslipPdf = async (payslipId, employeeName) => {
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.payslip}/${payslipId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payslip-${(employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Notification("Error", "Failed to download payslip PDF", "warning");
    }
  };

  if (!run) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  const status = run.status;
  const canCalculate = status === "draft" || status === "calculated";
  const canApprove = status === "calculated";
  const canMarkPaid = status === "approved";
  const canRevert = status === "calculated" || status === "approved";
  const canExportCsv = status === "approved" || status === "paid";

  return (
    <Fragment>
      <Card className="mb-2">
        <CardBody>
          <Row className="align-items-center">
            <Col md={1}>
              <Button color="link" onClick={() => navigate(`${appsRoot}/payroll/runs`)} className="p-0">
                <ArrowLeft size={20} />
              </Button>
            </Col>
            <Col md={6}>
              <h4 className="mb-25">{run.name}</h4>
              <div className="text-muted small">
                {formatDate(run.period_start)} → {formatDate(run.period_end)} &nbsp; · &nbsp;
                {t("Pay date")}: <strong>{formatDate(run.pay_date)}</strong>
              </div>
            </Col>
            <Col md={5} className="text-end">
              <span className={`doc-badge ${STATUS_BADGE[status] || "doc-badge-gray"}`}>{t(status || "—")}</span>
            </Col>
          </Row>

          <hr />

          <Row className="text-center">
            <Col md={3}>
              <div className="text-muted small">{t("Employees")}</div>
              <div className="h4 mb-0">{run.employee_count || 0}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">{t("Gross")}</div>
              <div className="h4 mb-0">{formatMoney(run.total_gross, run.currency)}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">{t("Deductions")}</div>
              <div className="h4 mb-0">{formatMoney(run.total_deductions, run.currency)}</div>
            </Col>
            <Col md={3}>
              <div className="text-muted small">{t("Net")}</div>
              <div className="h4 mb-0 text-primary fw-bold">{formatMoney(run.total_net, run.currency)}</div>
            </Col>
          </Row>

          <hr />

          <div className="d-flex gap-1 flex-wrap">
            {canCalculate && (
              <Button color="primary" onClick={handleCalculate} disabled={busy}>
                <Cpu size={14} className="me-50" />
                {status === "calculated" ? t("Recalculate") : t("Calculate")}
              </Button>
            )}
            {canApprove && (
              <Button color="success" onClick={handleApprove} disabled={busy}>
                <CheckCircle size={14} className="me-50" />
                {t("Approve")}
              </Button>
            )}
            {canMarkPaid && (
              <Button color="success" onClick={handleMarkPaid} disabled={busy}>
                <DollarSign size={14} className="me-50" />
                {t("Mark as Paid")}
              </Button>
            )}
            {canRevert && (
              <Button color="warning" outline onClick={handleRevert} disabled={busy}>
                <RotateCcw size={14} className="me-50" />
                {t("Revert to Draft")}
              </Button>
            )}
            {canExportCsv && (
              <Button color="info" outline onClick={handleDownloadCsv}>
                <Download size={14} className="me-50" />
                {t("Export Bank CSV")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h5 className="mb-0">{t("Payslips")}</h5>
        </CardHeader>
        <CardBody className="p-0">
          {(!run.payslips || run.payslips.length === 0) ? (
            <Alert color="secondary" className="m-2">
              {t("No payslips yet. Click Calculate above to generate payslips for eligible employees.")}
            </Alert>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>{t("Employee")}</th>
                    <th className="text-center">{t("Hours")}</th>
                    <th className="text-end">{t("Gross")}</th>
                    <th className="text-end">{t("Deductions")}</th>
                    <th className="text-end">{t("Net")}</th>
                    <th className="text-center">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {run.payslips.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="fw-semibold">{p.employee_name}</div>
                        {p.employee_code && <small className="text-muted">{p.employee_code}</small>}
                      </td>
                      <td className="text-center">{Number(p.hours_worked).toFixed(2)}</td>
                      <td className="text-end">{formatMoney(p.gross_pay, p.currency)}</td>
                      <td className="text-end">{formatMoney(p.total_deductions, p.currency)}</td>
                      <td className="text-end fw-semibold">{formatMoney(p.net_pay, p.currency)}</td>
                      <td className="text-center">
                        <Button color="link" size="sm" className="p-0 me-1" onClick={() => setSelectedPayslipId(p._id)}>
                          <FileText size={16} className="text-primary" />
                        </Button>
                        <Button color="link" size="sm" className="p-0" onClick={() => handleDownloadPayslipPdf(p._id, p.employee_name)}>
                          <Download size={16} className="text-info" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <PayslipDetailModal
        payslipId={selectedPayslipId}
        readOnly={status === "paid"}
        onClose={() => setSelectedPayslipId(null)}
      />
    </Fragment>
  );
};

export default PayRunDetail;
