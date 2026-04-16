import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card, CardBody, Row, Col, Spinner, Alert, Button, Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Download, FileText, DollarSign } from "react-feather";

import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { getMyPayslips, cleanPayrollMessage } from "../store";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const formatMoney = (n, currency = "GBP") => {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${symbol}${(Number(n) || 0).toFixed(2)}`;
};

const STATUS_BADGE = {
  approved: "doc-badge-orange",
  paid: "doc-badge-green",
};

const MyPayslips = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.payroll);

  useEffect(() => {
    dispatch(getMyPayslips());
  }, []);

  useEffect(() => {
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.error) dispatch(cleanPayrollMessage());
  }, [store?.error]);

  const handleDownload = async (id) => {
    try {
      const res = await instance.get(`${API_ENDPOINTS.payroll.myPayslips}/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payslip-${id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to download payslip"), "warning");
    }
  };

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row className="mb-2 align-items-center">
            <Col md={12}>
              <h4 className="mb-0 d-flex align-items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                {t("My Payslips")}
              </h4>
              <small className="text-muted">{t("View and download your payslips")}</small>
            </Col>
          </Row>

          {!store?.loading && (!store?.myPayslipItems || store.myPayslipItems.length === 0) ? (
            <Alert color="secondary">
              {t("You don't have any payslips yet. They'll appear here once your employer approves them.")}
            </Alert>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t("Pay Date")}</th>
                    <th>{t("Hours")}</th>
                    <th className="text-end">{t("Gross")}</th>
                    <th className="text-end">{t("Deductions")}</th>
                    <th className="text-end">{t("Net Pay")}</th>
                    <th className="text-center">{t("Status")}</th>
                    <th className="text-center">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(store?.myPayslipItems || []).map((p) => (
                    <tr key={p._id}>
                      <td className="fw-semibold">{formatDate(p.pay_date)}</td>
                      <td>{Number(p.hours_worked).toFixed(2)} h</td>
                      <td className="text-end">{formatMoney(p.gross_pay, p.currency)}</td>
                      <td className="text-end">{formatMoney(p.total_deductions, p.currency)}</td>
                      <td className="text-end fw-semibold text-primary">{formatMoney(p.net_pay, p.currency)}</td>
                      <td className="text-center">
                        <span className={`doc-badge ${STATUS_BADGE[p.pay_run_status] || "doc-badge-gray"}`}>
                          {t(p.pay_run_status || "—")}
                        </span>
                      </td>
                      <td className="text-center">
                        <Button color="link" size="sm" className="p-0" onClick={() => handleDownload(p._id)}>
                          <Download size={16} className="text-primary" />
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
    </Fragment>
  );
};

export default MyPayslips;
