// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPaymentList, getPaymentDetail, cleanPaymentMessage } from "./store";
import { getCompanyList, cleanCompanyMessage } from "../auth/profile/editCompany/store";
import { startLoading, stopLoading } from "../loadingstore";
import { Col, Row, Card, CardBody, Modal, ModalHeader, ModalBody, Badge, Table, Button } from "reactstrap";
import { Eye, Download, Send } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import { useTranslation } from "react-i18next";
import AsyncSelect from "react-select/async";
import moment from "moment";
import { defaultPerPageRow } from "@constant/defaultValues";
import { getSubscriptionByIds } from "@src/views/subscription/store"
import Select from "react-select";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const PaymentList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { getCurrencySymbol } = useCurrency();

  // ** Store
  const store = useSelector((state) => state.payment);
  const companyStore = useSelector((state) => state.company);

  // ** Pagination & Sorting
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [subscriptionOptions, setSubscriptionOptions] = useState([]);


  // ** Filters
  const [selectedCompany, setSelectedCompany] = useState(""); // company ID for API
  const [selectedCompanyName, setSelectedCompanyName] = useState(""); // company name for display
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null); // Store selected subscription

  // ** Detail Modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const [sendingInvoice, setSendingInvoice] = useState(false);

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

  // ** Toast
  const [shownSuccess, setShownSuccess] = useState(false);
  const [shownError, setShownError] = useState(false);
  // useEffect(() => {
  //   if (selectedCompany) {
  //     loadSubscriptionOptions().then(options => {
  //       setSubscriptionOptions(options);
  //     });
  //   } else {
  //     setSubscriptionOptions([]);
  //     setSelectedSubscription(null);
  //   }
  // }, [selectedCompany]);
  // -------------------- FETCH PAYMENT LIST --------------------
  const fetchPayments = useCallback(() => {
    dispatch(
      getPaymentList({
        page: currentPage,
        perPage: rowsPerPage,
        orderBy: sortColumn,
        orderDirection: sort,
        company_id: selectedCompany || undefined, // filter by company_id
        subscription_id: selectedSubscription?._id || undefined

      })
    );
  }, [dispatch, currentPage, rowsPerPage, sortColumn, sort, selectedCompany, selectedSubscription]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, currentPage, rowsPerPage, sort, sortColumn, selectedCompany, selectedSubscription]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --------------------  FILTERING --------------------
  const allPayments = store?.paymentItems || [];
  const filteredData = useMemo(() => {
    let result = allPayments;

    if (selectedCompany) {
      result = result.filter(item => {
        return item.company_id && item.company_id._id && String(item.company_id._id) === String(selectedCompany);
      });
    }

    return result;
  }, [allPayments, selectedCompany]);

  // -------------------- SORTING --------------------
  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField || column.selector);
    setCurrentPage(1);
  };

  // -------------------- PAGINATION --------------------
  const handlePagination = (page) => setCurrentPage(page + 1);
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  // -------------------- FILTERS --------------------
  const handleCompanyFilter = (selected) => {
    if (selected) {
      setSelectedCompany(selected.value);
      setSelectedCompanyName(selected.label);
    } else {
      setSelectedCompany("");
      setSelectedCompanyName("");
    }
  };
  const handleSubscriptionFilter = (selected) => {
    if (selected) {
      setSubscriptionId(selected.value); // Set subscriptionId
      setSelectedSubscription(selected.subscription); // Set the full subscription object
    } else {
      setSubscriptionId(null); // Clear subscription ID
      setSelectedSubscription(null); // Clear selected subscription
    }
  };

  console.log("planed", selectedSubscription?.plan?.name)
  // -------------------- NOTIFICATIONS --------------------
  useEffect(() => {
    if (store?.success && !shownSuccess) setShownSuccess(true);
    if (store?.error && !shownError) setShownError(true);
  }, [store.success, store.error]);

  // -------------------- LOADING --------------------
  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store.loading]);

  // -------------------- CLEAN MESSAGES --------------------
  useEffect(() => {
    dispatch(cleanPaymentMessage(null));
    dispatch(cleanCompanyMessage(null));
  }, [dispatch]);

  // -------------------- LOAD COMPANY OPTIONS --------------------
  const loadCompanyOptions = useCallback(async (inputValue) => {
    if (!inputValue) return []; // Return empty array if input is empty

    try {
      const result = await dispatch(
        getCompanyList({
          page: 1,
          perPage: 50,
          search: inputValue,
          orderBy: "name",
          orderDirection: "asc",
        })
      ).unwrap();

      const companies = result?.companyItems || [];

      return companies.map((company) => ({
        value: company._id,
        label: company.company_name,
        company, // Store the full company object 
      }));
    } catch (err) {
      console.error("Error loading companies:", err);
      return []; // Return empty array on error
    } finally {
      dispatch(cleanCompanyMessage(null)); // Clear any error messages
    }
  }, [dispatch]);

  // -------------------- LOAD SUBSCRIPTION OPTIONS --------------------
  const loadSubscriptionOptions = useCallback(async () => {
    if (!selectedCompany) return [];

    const params = {
      page: 1,
      perPage: 50,
      orderBy: "plan.name",
      orderDirection: "asc",
      companyId: selectedCompany,
    };

    try {
      const result = await dispatch(getSubscriptionByIds(params)).unwrap();
      const subscriptions = result?.subscriptionItem || [];

      return subscriptions.map((subscription) => ({
        value: subscription._id,
        label: `${subscription.plan?.name || "NA"}, ${getCurrencySymbol()}${subscription.final_price?.toFixed(2) || "0.00"}, ${subscription.plan?.plan_type || "NA"}`,
        subscription,
      }));
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      return [];
    }
  }, [dispatch, selectedCompany]);

useEffect(() => {
  if (selectedCompany) {
    loadSubscriptionOptions().then(options => {
      setSubscriptionOptions(options);
    });
  } else {
    setSubscriptionOptions([]);
    setSelectedSubscription(null);
  }
}, [selectedCompany, loadSubscriptionOptions]);
  // -------------------- TABLE COLUMNS --------------------
  const columns = [
    {
      name: t("Date"),
      hide: "md",
      selector: (row) => <span>{moment(row.createdAt).format("YYYY-MM-DD")}</span>,
      sortable: true,
      sortField: "createdAt",
    },
    {
      name: t("Company"),
      selector: (row) => <span>{row?.company_id?.company_name || "NA"}</span>,
      sortable: true,
      sortField: "company.company_id.company_name",
    },
    {
      name: t("Plan"),
      hide: "md",
      selector: (row) => <span>{row?.plan?.name || "NA"}</span>,
      sortable: false,
    },
    {
      name: t("Price"),
      selector: (row) => <span>{getCurrencySymbol()}{row?.final_price?.toFixed(2) || "0.00"}</span>,
      sortable: true,
      sortField: "final_price",
    },
    {
      name: t("Status"),
      selector: (row) => (
        <span
          className={`badge rounded-pill ${row?.status?.toLowerCase() === "completed"
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

  // -------------------- RENDER --------------------
  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Payments")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            {/* Filters */}
            <Row className="mb-2">
              <Col sm="6" md="4" className="">
                <AsyncSelect
                  cacheOptions
                  loadOptions={loadCompanyOptions}
                  onChange={handleCompanyFilter}
                  value={
                    selectedCompany
                      ? {
                        value: selectedCompany,
                        label: selectedCompanyName,
                      }
                      : null
                  }
                  isClearable
                  placeholder={t("Search Companies")}
                  classNamePrefix="select"
                />
              </Col>

              <Col sm="6" md="4">
                <Select
                  options={subscriptionOptions}
                  onChange={handleSubscriptionFilter}
                  value={
                    selectedCompany && selectedSubscription
                      ? {
                        value: selectedSubscription._id,
                        label: `${selectedSubscription.plan?.name || "NA"}, ${getCurrencySymbol()}${selectedSubscription.final_price?.toFixed(2) || "0.00"}, ${selectedSubscription.plan?.plan_type || "NA"}`,
                      }
                      : null
                  }
                  isClearable
                  placeholder={t("Search Subscriptions")}
                  classNamePrefix="select"
                  isDisabled={!selectedCompany}
                  noOptionsMessage={() => t("No subscriptions available")}
                  onBlur={() => {
                    if (!selectedCompany) {
                      // Clear the selected subscription if no company is selected
                      setSelectedSubscription(null);
                    }
                  }}
                />

              </Col>

            </Row>

            {/* Table */}
            <Row className="mt-2">
              <Col md="12" className="company-table">
                <DatatablePagination
                  columns={columns}
                  data={filteredData}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={store?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                />
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

export default PaymentList;

