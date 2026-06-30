// ** React Imports
import React, { Fragment, useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

// ** Store & Actions
import { getPaymentList, getPaymentDetail } from "@src/views/payment/store/";
import { startLoading, stopLoading } from "@src/views/loadingstore";

// ** Components
import DatatablePagination from "@components/datatable/DatatablePagination";
import Notification from "@components/toast/notification";

// ** Reactstrap Imports
import { Card, CardBody, Row, Col, Spinner, Modal, ModalHeader, ModalBody, Badge, Table, Button } from "reactstrap";
import { Eye, Download, Send } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Utils
import moment from "moment";
import { useTranslation } from "react-i18next";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const Payment = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { getCurrencySymbol } = useCurrency();

  // ** Redux Store
  const paymentStore = useSelector((state) => state.payment);
  const { paymentItems = [], loading, error, pagination } = paymentStore || {};
  const companyId = useSelector(
    (state) => state.company?.companyItem?.user?._id
  );

  // ** Local States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");

  // ** Detail Modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const toggleDetailModal = () => setDetailModal(!detailModal);

  const openDetail = async (row) => {
    setDetailModal(true);
    setDetailLoading(true);
    setSelectedPayment(null);
    try {
      const result = await dispatch(getPaymentDetail(row._id)).unwrap();
      setSelectedPayment(result.paymentDetail);
    } catch (err) {
      console.error("Error fetching payment detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadInvoice = async (paymentId) => {
    try {
      const response = await instance.get(`${API_ENDPOINTS.payments.downloadInvoice}/${paymentId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${selectedPayment?.full_inv_number || paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading invoice:", err);
      Notification(t("Error"), t("Failed to download invoice"), "warning");
    }
  };

  const handleSendInvoice = async (paymentId) => {
    setSendingInvoice(true);
    try {
      await instance.post(`${API_ENDPOINTS.payments.sendInvoice}/${paymentId}`);
      Notification(t("Success"), t("Invoice sent successfully"), "success");
    } catch (err) {
      console.error("Error sending invoice:", err);
      Notification(t("Error"), t("Failed to send invoice"), "warning");
    } finally {
      setSendingInvoice(false);
    }
  };

  // ---------------- FETCH PAYMENTS ----------------
  const fetchPayments = useCallback(() => {
    if (!companyId) return;
    dispatch(
      getPaymentList({
        page: currentPage,
        perPage: rowsPerPage,
        orderBy: sortColumn,
        orderDirection: sort,
        user_id: companyId,
      })
    );
  }, [dispatch, companyId, currentPage, rowsPerPage, sortColumn, sort]);

  // ---------------- FETCH WHENEVER PAGE OR SORT CHANGES ----------------
  useEffect(() => {
    if (!companyId) return;
    fetchPayments();
  }, [currentPage, rowsPerPage, sort, sortColumn, companyId, fetchPayments]);

  // ---------------- LOADING HANDLER ----------------
  useEffect(() => {
    if (loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [loading, dispatch]);

  // ---------------- PAGINATION HANDLERS ----------------
  const handlePagination = (page) => setCurrentPage(page + 1);

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField || column.selector);
    setCurrentPage(1);
  };

  // ---------------- TABLE COLUMNS ----------------
  const columns = [
    {
      name: t("Plans"),
      selector: (row) => row?.plan?.name || "NA",
    },
    {
      name: t("Date"),
      selector: (row) => moment(row.createdAt).format("YYYY-MM-DD"),
      sortable: true,
      sortField: "createdAt",
    },
    {
      name: t("Total"),
      selector: (row) => `${getCurrencySymbol()}${row?.final_price?.toFixed(2) || "0.00"}`,
      sortable: true,
      sortField: "final_price",
    },
    {
      name: t("Status"),
      selector: (row) => (
        <span
          className={`badge rounded-pill ${
            row?.status?.toLowerCase() === "completed"
              ? "badge-light-success"
              : row?.status?.toLowerCase() === "declined"
              ? "badge-light-danger"
              : "badge-light-warning"
          }`}
        >
          {row?.status || "Unknown"}
        </span>
      ),
      sortable: true,
      sortField: "status",
    },
    {
      name: t("Details"),
      cell: (row) => (
        <Eye
          size={18}
          className="cursor-pointer text-primary"
          onClick={() => openDetail(row)}
        />
      ),
      width: "80px",
      center: true,
    },
  ];

  // ---------------- UI RENDER ----------------
  return (
    <Fragment>
      <div className="main-content">

        <Card
          className="overflow-hidden shadow-sm border-0"
        >
          <CardBody>
            {/* Table Section */}
            <Row className="">
              <Col md="12" className="main-addons">
                {!companyId ? (
                  <div className="text-center my-4 text-muted">
                    {t(" No payment data available. ")}
                  </div>
                ) : loading ? (
                  <div className="text-center my-4">
                    <Spinner color="primary" />
                  </div>
                ) : error ? (
                  <div className="text-center text-danger fw-semibold">
                    {error}
                  </div>
                ) : paymentItems?.length > 0 ? (
                  <DatatablePagination
                    columns={columns}
                    data={paymentItems}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    pagination={pagination}
                    handlePagination={handlePagination}
                    handleRowPerPage={handlePerPage}
                    handleSort={handleSort}
                  />
                ) : (
                  <div className="text-center fw-semibold text-muted no-data">
                    {t("No payment data available.")}
                  </div>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      {/* Payment Detail Modal */}
      <Modal isOpen={detailModal} toggle={toggleDetailModal} size="lg" centered>
        <ModalHeader toggle={toggleDetailModal}>{t("Payment Details")}</ModalHeader>
        <ModalBody>
          {detailLoading && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          {!detailLoading && selectedPayment && (
            <>
              {/* General Info */}
              <h6 className="fw-bold mb-1">{t("General Info")}</h6>
              <Table responsive bordered size="sm" className="mb-2">
                <tbody>
                  <tr>
                    <td className="fw-bold" width="40%">{t("Date")}</td>
                    <td>{moment(selectedPayment.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Company")}</td>
                    <td>{selectedPayment?.company?.company_name || "NA"}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Customer")}</td>
                    <td>
                      {selectedPayment?.user
                        ? `${selectedPayment.user.first_name || ""} ${selectedPayment.user.last_name || ""}`.trim() || selectedPayment.user.email || "NA"
                        : "NA"}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Plan")}</td>
                    <td>{selectedPayment?.plan?.name || "NA"}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Locations")}</td>
                    <td>{selectedPayment?.locations || 1}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Gateway")}</td>
                    <td>{(selectedPayment?.gateway || "NA").toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Method")}</td>
                    <td>{(selectedPayment?.method || "NA").toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Status")}</td>
                    <td>
                      <Badge color={
                        selectedPayment?.status?.toLowerCase() === "completed" ? "success"
                          : selectedPayment?.status?.toLowerCase() === "declined" ? "danger"
                          : "warning"
                      }>
                        {selectedPayment?.status || "Unknown"}
                      </Badge>
                    </td>
                  </tr>
                  {selectedPayment?.full_inv_number && (
                    <tr>
                      <td className="fw-bold">{t("Invoice Number")}</td>
                      <td>{selectedPayment.full_inv_number}</td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {/* Pricing Breakdown */}
              <h6 className="fw-bold mb-1">{t("Pricing Breakdown")}</h6>
              <Table responsive bordered size="sm" className="mb-2">
                <tbody>
                  <tr>
                    <td className="fw-bold" width="40%">{t("Plan Price")}</td>
                    <td>{getCurrencySymbol()}{(selectedPayment?.plan_price || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Tools Price")}</td>
                    <td>{getCurrencySymbol()}{(selectedPayment?.tools_price || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">{t("Subtotal")}</td>
                    <td>{getCurrencySymbol()}{(selectedPayment?.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  {selectedPayment?.discount_price > 0 && (
                    <tr>
                      <td className="fw-bold">{t("Discount")}</td>
                      <td className="text-danger">-{getCurrencySymbol()}{(selectedPayment.discount_price).toFixed(2)}</td>
                    </tr>
                  )}
                  {selectedPayment?.tax_price > 0 && (
                    <tr>
                      <td className="fw-bold">{t("Tax")} ({selectedPayment?.tax_rate || 0}%)</td>
                      <td>{getCurrencySymbol()}{(selectedPayment.tax_price).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="table-active">
                    <td className="fw-bold">{t("Final Price")}</td>
                    <td className="fw-bold">{getCurrencySymbol()}{(selectedPayment?.final_price || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </Table>

              {/* Transaction Info — only for Stripe with charge details */}
              {selectedPayment?.response?.charge_id && (
                <>
                  <h6 className="fw-bold mb-1">{t("Transaction Info")}</h6>
                  <Table responsive bordered size="sm" className="mb-2">
                    <tbody>
                      <tr>
                        <td className="fw-bold" width="40%">{t("Payment Intent ID")}</td>
                        <td><code>{selectedPayment.response.paymentIntent}</code></td>
                      </tr>
                      <tr>
                        <td className="fw-bold">{t("Charge ID")}</td>
                        <td><code>{selectedPayment.response.charge_id}</code></td>
                      </tr>
                      <tr>
                        <td className="fw-bold">{t("Currency")}</td>
                        <td>{(selectedPayment.response.currency || "").toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">{t("Amount Charged")}</td>
                        <td>{getCurrencySymbol()}{((selectedPayment.response.amount_captured || selectedPayment.response.amount || 0) / 100).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">{t("Stripe Fee")}</td>
                        <td className="text-danger">{getCurrencySymbol()}{((selectedPayment.response.stripe_fee || 0) / 100).toFixed(2)}</td>
                      </tr>
                      <tr className="table-active">
                        <td className="fw-bold">{t("Net Amount Received")}</td>
                        <td className="fw-bold">{getCurrencySymbol()}{((selectedPayment.response.net_amount || 0) / 100).toFixed(2)}</td>
                      </tr>
                      {selectedPayment.response.receipt_url && (
                        <tr>
                          <td className="fw-bold">{t("Receipt")}</td>
                          <td>
                            <a href={selectedPayment.response.receipt_url} target="_blank" rel="noopener noreferrer">
                              {t("View Stripe Receipt")}
                            </a>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </>
              )}

              {/* Invoice Actions */}
              {selectedPayment?.inv_path && (
                <div className="d-flex gap-1 mt-2">
                  <Button color="primary" size="sm" outline onClick={() => handleDownloadInvoice(selectedPayment._id)}>
                    <Download size={14} className="me-50" /> {t("Download Invoice")}
                  </Button>
                  <Button color="success" size="sm" outline onClick={() => handleSendInvoice(selectedPayment._id)} disabled={sendingInvoice}>
                    <Send size={14} className="me-50" /> {sendingInvoice ? t("Sending...") : t("Send Invoice to Company")}
                  </Button>
                </div>
              )}
            </>
          )}
        </ModalBody>
      </Modal>
    </Fragment>
  );
};

export default Payment;
