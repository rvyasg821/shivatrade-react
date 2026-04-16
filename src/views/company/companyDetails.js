// ** React Imports
import React, { Fragment, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

// ** Store & Actions
import { getSubscriptionList, cancelAdminSubscriptions } from "@src/views/subscription/store/";

// ** Reactstrap Imports
import { Card, CardBody, Spinner, Col, Row, UncontrolledTooltip, Button } from "reactstrap";

// ** i18n
import { useTranslation } from "react-i18next";
import { appsRoot } from "@constant/defaultValues";
import Notification from '@src/@core/components/toast/notification';

// ** Components
import DatatablePagination from "@components/datatable/DatatablePagination";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import { Edit } from "react-feather";
import Swal from "sweetalert2";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const SubscriptionDetails = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getCurrencySymbol } = useCurrency();

  // ** State
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ** Redux
  const companyId = useSelector((state) => state.company?.companyItem?.user?._id);
  const Id = useSelector((state) => state.company?.companyItem?._id)
  const { subscriptionItems, loading, error, pagination } = useSelector(
    (state) => state.subscription
  );
  const hasActive = subscriptionItems?.some(item => item.status === true);


  // ** Fetch data
  const fetchSubscriptions = useCallback(() => {
    if (!companyId) return;
    dispatch(
      getSubscriptionList({
        page: currentPage,
        perPage: rowsPerPage,
        orderBy: sortColumn,
        orderDirection: sort,
        search: "",
        user_id: companyId,
      })
    );
  }, [dispatch, companyId, currentPage, rowsPerPage, sort, sortColumn]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ** Table Columns
  const columns = [


    {
      name: t("Plans"),
      selector: (row) => <span>{row?.plan?.name || "NA"}</span>,
    },
    {
      name: t("Start Date"),
      selector: (row) =>
        row?.start_date ? moment(row.start_date).format("YYYY-MM-DD") : "NA",
      sortable: true,
      sortField: "start_date",
    },
    {
      name: t("End Date"),
      selector: (row) =>
        row?.end_date ? moment(row.end_date).format("YYYY-MM-DD") : "NA",
      sortable: true,
      sortField: "end_date",
    },
    {
      name: t("Total"),
      selector: (row) => <span>{getCurrencySymbol()}{((row?.final_price || row?.total_price) ? (row?.final_price || row?.total_price).toFixed(2) : '0.00')}</span>,
      sortable: true,
      sortField: "final_price",
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
      sortable: true,
      sortField: "status",
    },
    {
      name: t("Actions"),
      center: true,
      cell: (row) => (
        <div className="d-flex align-items-center">
          <Link
            id={`subscription-edit-tooltip-${row._id}`}
            to={`${appsRoot}/subscription/edit/${row._id}`}
            className="me-2"
          >
            <Edit size={18} className="text-primary cursor-pointer" />
            <UncontrolledTooltip
              placement="top"
              target={`subscription-edit-tooltip-${row._id}`}
            >
              {t("Edit")}
            </UncontrolledTooltip>
          </Link>
        </div>
      ),
    },
  ];

  // ** Pagination & Sorting
  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField || column.selector);
    setCurrentPage(1);
  };

  const handlePagination = (page) => setCurrentPage(page + 1);
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleClick = () => {
    navigate(`${appsRoot}/company/plan/upgrade/${Id}`);
  }

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
    const id = subscriptionItems?.find(item => item.status === true)?._id;

    setCancelling(true);
    try {
      const result = await dispatch(cancelAdminSubscriptions(id)).unwrap();

      if (result.actionFlag === "SUBS_CANCEL_SCS") {
        Notification("Success", t("Subscription cancelled successfully"), "success");

        // called getSubscriptionList API
        dispatch(
          getSubscriptionList({
            page: currentPage,
            perPage: rowsPerPage,
            orderBy: sortColumn,
            orderDirection: sort,
            search: "",
            user_id: companyId,
          })
        );

      } else {
        Notification("Error", result.error || t("Failed to cancel subscription"), "error");
      }
    } catch (error) {
      Notification("Error", t("Failed to cancel subscription"), "error");
    } finally {
      setCancelling(false);
      setCancelModal(false);
    }
  };


  return (
    <Fragment>
      <div className="main-content">
        <Card

          className="overflow-hidden shadow-sm border-0"
        >
          <CardBody>
            <div className="d-flex justify-content-end gap-1">

              <Button
                className="btn-primary"
                size="sm"
                onClick={handleClick}
              >
                {t("Assign Plan")}
              </Button>
              <Button
                color="danger"
                size="sm"
                onClick={handleCancelClick}
                disabled={!hasActive}
              >
                {t("Cancel Subscription")}
              </Button>
            </div>
            {loading ? (
              <div className="text-center my-4">
                <Spinner color="primary" />
              </div>
            ) : error ? (
              <div className="text-center text-danger fw-semibold">{error}</div>
            ) : subscriptionItems && subscriptionItems.length > 0 ? (
              <Row className="mt-1">
                <Col md="12" className="company-table five-row-table">
                  <DatatablePagination
                    columns={columns}
                    data={subscriptionItems}
                    currentPage={currentPage}
                    rowsPerPage={rowsPerPage}
                    pagination={pagination}
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
      </div>
    </Fragment>
  );
};

export default SubscriptionDetails;
