// ** React Imports
import React, { Fragment, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

// ** Store & Actions
import { getCompanySubscriptionList, cancelAllSubscriptions } from "@src/views/subscription/store/";
import { startLoading, stopLoading } from "@src/views/loadingstore";

// ** Reactstrap Imports
import { Card, CardBody, Row, Col, Spinner, Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

// ** Custom Components
import DatatablePagination from "@components/datatable/DatatablePagination";
import Notification from "@components/toast/notification";

// ** Third Party
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { appsRoot } from "@constant/defaultValues";
import { Edit, ExternalLink, Eye } from "react-feather";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

// ** Axios for cross-login
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const SubscriptionDetails = ({ activeTab, subscriptionKey }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getCurrencySymbol } = useCurrency();

  // ** Redux Store
  const store = useSelector((state) => state.subscription);

  // ** States
  const [shownSuccess, setShownSuccess] = useState(false);
  const [shownError, setShownError] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [accessingAppointmentApp, setAccessingAppointmentApp] = useState(false);

  // ** Pagination, Search, and Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // ** Fetch Subscription List
  const fetchSubscriptions = useCallback(() => {
    if (activeTab === subscriptionKey) {
      dispatch(
        getCompanySubscriptionList({
          page: currentPage,
          perPage: rowsPerPage,
          search: searchTerm,
          orderBy: sortColumn,
          orderDirection: sortDirection,
        })
      );
    }
  }, [dispatch, activeTab, subscriptionKey, currentPage, rowsPerPage, searchTerm, sortColumn, sortDirection]);

  // ✅ Re-fetch on sorting, pagination, or rowsPerPage change
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ** Loading Management
  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store.loading]);

  // ** Notifications
  useEffect(() => {
    if (store?.success && !shownSuccess) {
      // Notification("Success", store.success, "success");
      setShownSuccess(true);
    }
    if (store?.error && !shownError) {
      Notification("Error", store.error, "warning");
      setShownError(true);
    }
  }, [store.success, store.error]);

  // ** Data Normalization
  const planList = Array.isArray(store?.subscriptionItems)
    ? store.subscriptionItems
    : store?.subscriptionItems
      ? [store.subscriptionItems]
      : [];

  // ** Cancel Subscription Functions
  const handleCancelClick = () => {
    Swal.fire({
      title: t("Are you sure?"),
      text: t("You are about to cancel your subscription. This action cannot be undone and you will lose access to all features."),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, cancel it!"),
      cancelButtonText: t("No"),
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-danger ms-1",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        handleCancelConfirm();
      }
    });
  };

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      const result = await dispatch(cancelAllSubscriptions()).unwrap();
      if (result.actionFlag === "SUBS_CANCEL_SCS") {
        Notification("Success", t("Subscription cancelled successfully"), "success");
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          window.history.replaceState(null, null, "/login");
          navigate("/login", { replace: true });
          window.location.reload();
        }, 2000);
      } else {
        Notification("Error", result.error || t("Failed to cancel subscription"), "error");
      }
    } catch (error) {
      console.error("Cancel subscription error:", error);
      Notification("Error", t("Failed to cancel subscription"), "error");
    } finally {
      setCancelling(false);
      setCancelModal(false);
    }
  };

  const handleCancelModalClose = () => setCancelModal(false);

  // ** Access Appointment App Handler
  const handleAccessAppointmentApp = async () => {
    setAccessingAppointmentApp(true);
    try {
      const response = await instance.get(API_ENDPOINTS.auth.appointmentAppCrossLogin);

      // Handle both wrapped (statusCode) and unwrapped response formats
      const data = response?.data?.data || response?.data;
      const statusCode = response?.data?.statusCode || response?.status;

      if ((statusCode === 200 || response?.status === 200) && data?.url) {
        // Redirect to appointment app
        window.open(data.url, '_blank');
      } else if (data?.hasActiveSubscription === false) {
        Notification("Info", t("You need an active subscription to access the Appointment App"), "info");
      } else {
        Notification("Error", response?.data?.message || t("Failed to access Appointment App"), "warning");
      }
    } catch (error) {
      console.error("Access Appointment App error:", error);
      Notification("Error", error?.response?.data?.message || t("Failed to access Appointment App"), "warning");
    } finally {
      setAccessingAppointmentApp(false);
    }
  };

  // ✅ Fixed Sorting Handler
  const handleSort = (column, direction) => {
    setSortColumn(column.sortField || column.selector);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleClick = () => {
    navigate(`${appsRoot}/profile/subscription/upgrade`);
  }

  // ** Columns
  const columns = [
    {
      name: t("Plan"),
      selector: (row) => (
        <span className="plan-tools">
          <span className="plan d-block pb-25"><strong>{row?.plan?.name || "NA"}</strong></span>
          <span className="tools d-block pb-25">Tools : {row?.tools?.length ? row.tools.map((t) => t.name).join(", ") : "NA"}</span>
          <span className="locations d-block pb-25">Locations : <strong>{row?.locations}</strong></span>
        </span>

      ),
      sortField: "plan.name",
      // sortable: true,
    },
    // {
    //   name: t("Tools"),
    //   selector: (row) => (row?.tools?.length ? row.tools.map((t) => t.name).join(", ") : "NA"),
    //   sortable: false,
    //   wrap: true,
    // },
    {
      name: t("Start"),
      selector: (row) =>
        row?.start_date ? moment(row.start_date).format("YYYY-MM-DD") : "NA",
      sortField: "start_date",
      sortable: true,
    },
    {
      name: t("End"),
      selector: (row) =>
        row?.end_date ? moment(row.end_date).format("YYYY-MM-DD") : "NA",
      sortField: "end_date",
      sortable: true,
    },
    {
      name: t("Total"),
      selector: (row) => <span>{getCurrencySymbol()}{(row?.final_price || row?.total_price) ? (row?.final_price || row?.total_price).toFixed(2) : '0.00'}</span>,
      sortField: "final_price",
      sortable: true,
    },
    {
      name: t("Status"),
      selector: (row) => (
        <span
          className={`badge rounded-pill ${row?.status ? "badge-light-success" : "badge-light-danger"
            }`}
        >
          {row?.status ? t("Active") : t("Inactive")}
        </span>
      ),
      sortable: false,
    },
    {
      name: t("Actions"),
      center: true,
      minWidth: "100px",
      cell: (row) => {
        // Only show button for active subscriptions
        if (!row?.status) return null;

        // Check if subscription is trial, lifetime, or custom location (read-only for company admin)
        const isTrialOrLifetime = row?.trial === true || row?.is_lifetime === true;
        const isCustomLocation = row?.is_custom_location === true;
        const isReadOnly = isTrialOrLifetime || isCustomLocation;

        return (
          <div className="d-flex align-items-center">
            <Button
              color="link"
              size="sm"
              className="p-0"
              onClick={() => navigate(`${appsRoot}/profile/subscription/edit/${row._id}`)}
              title={isReadOnly ? t("View Subscription") : t("Edit Tools")}
            >
              {isReadOnly ? (
                <Eye size={18} className="text-info" />
              ) : (
                <Edit size={18} className="text-primary" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  // ** Pagination Handlers
  const handlePagination = (page) => setCurrentPage(page + 1);
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const filteredData = store?.subscriptionItems || [];



  // jj
  // const handleSearch = (e) => {
  //   const value = e.target.value;
  //   setSearchTerm(value);
  //   setCurrentPage(1);
  // };

  // // ** Pagination Change
  // const handlePagination = (page) => setCurrentPage(page + 1);

  // // ** Per Page Change
  // const handlePerPage = (value) => {
  //   setRowsPerPage(value);
  //   setCurrentPage(1);
  // };
  // ** Total Rows
  const totalRows = store?.totalRecords || planList.length;
  return (
    <Fragment>
      <Card className="shadow-sm border-0 rounded-3">
        <CardBody>
          {/* 🔍 Search Box */}
          {/* <Row className="mb-2 align-items-center">
            <Col md="6">
              <h4 className="mb-0">{t("Subscription List")}</h4>
            </Col>
            <Col md="6" className="text-end">
              <Input
                type="text"
                placeholder={t("Search...")}
                value={searchTerm}
                onChange={handleSearch}
                style={{ maxWidth: "250px", display: "inline-block" }}
              />
            </Col>
          </Row> */}
          <div className="d-flex justify-content-end gap-1">
           
            <Button
              className="btn-primary"
              size="sm"
              outline
              onClick={handleClick}
            >
              {t("Upgrade Subscription")}
            </Button>
            <Button
              color="danger"
              size="sm"
              outline
              onClick={handleCancelClick}
              disabled={cancelling}
            >
              {t("Cancel Subscription")}
            </Button>
          </div>



          {filteredData.length > 0 ? (
            <Row className="mt-1">
              <Col md="12" className="company-table five-row-table subscription-table">
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
          ) : (
            <div className="text-center fw-semibold text-muted no-data">
              {t("No subscription data available.")}
            </div>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default SubscriptionDetails;
