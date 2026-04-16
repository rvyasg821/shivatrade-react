import React, { Fragment, useEffect, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

// ** Store & Actions
import { getCompanyPaymentList } from "@src/views/payment/store/";
import { startLoading, stopLoading } from "@src/views/loadingstore";

// ** Reactstrap Imports
import { Card, CardBody, Row, Col, Spinner } from "reactstrap";
import { Download } from "react-feather";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Custom Components
import DatatablePagination from "@components/datatable/DatatablePagination";
import Notification from "@components/toast/notification";
import moment from "moment";
import { useTranslation } from "react-i18next";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";

const Payment = ({ activeTab, paymentKey, rowsPerPages, currentPages, setCurrentPages,setSortdirec,setSortcolumn, setRowsPerPages }) => {

  // custom hooks
  const { t } = useTranslation();
  const { getCurrencySymbol } = useCurrency();

  // ** Redux Store
  const dispatch = useDispatch();
  const paymentStore = useSelector((state) => state.payment);
  const authStore = useSelector((state) => state.auth);
const paymentItems = paymentStore?.paymentItems || [];
  const totalRows = paymentStore?.pagination?.total || paymentItems.length;

  const customerId = authStore?._id;

  // ** Loading spinner
  useEffect(() => {
    if (paymentStore.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [paymentStore.loading, dispatch]);

  // ** Cleanup messages
  // useEffect(() => {
  //   if (paymentStore.success) Notification("Success", paymentStore.success, "success");
  //   if (paymentStore.error) Notification("Error", paymentStore.error, "warning");
  // }, [paymentStore.success, paymentStore.error]);

  

  // ** Scroll top on mount
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);


// const handleSort = (column, sortDirection) => {
//     setSort(sortDirection);
//     setSortColumn(column.sortField || column.selector);
//     setCurrentPage(1);
//   };


  const handleDownloadInvoice = async (row) => {
    try {
      const response = await instance.get(`${API_ENDPOINTS.payments.myDownloadInvoice}/${row._id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${row?.full_inv_number || row._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading invoice:", err);
    }
  };

  // ** Table Columns
  const columns = [
    {
      name: t("Date"),
      selector: (row) => (
        <span>
          {row?.createdAt ? moment(row.createdAt).format("YYYY-MM-DD") : "NA"}
        </span>
      ),
     sortable: true,
      sortField: "createdAt",
    },
    {
      name: t("Plan"),
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
          className={`badge rounded-pill ${
            row?.status?.toLowerCase() === "completed"
              ? "badge-light-success"
              : row?.status?.toLowerCase() === "declined"
              ? "badge-light-danger"
              : "badge-light-warning"
          }`}
        >
          {row?.status || "-"}
        </span>
      ),
      sortable: false,
    },
    {
      name: t("Invoice"),
      cell: (row) =>
        row?.inv_path ? (
          <Download
            size={16}
            className="cursor-pointer text-primary"
            onClick={() => handleDownloadInvoice(row)}
          />
        ) : (
          <span className="text-muted">—</span>
        ),
      width: "80px",
      center: true,
    },
  ];

  // ** Fetch Payments
  useEffect(() => {
    if (activeTab === paymentKey) {
      dispatch(
        getCompanyPaymentList({
          customer: customerId,
          page: currentPages,
          perPage: rowsPerPages,
        })
      );
    }
  }, [dispatch, activeTab, paymentKey, currentPages, rowsPerPages, customerId]);

  // ** Pagination Change Handlers
  const handlePagination = (page) => {
    setCurrentPages(page + 1); // Ensure the page starts from 1
  };

  const handlePerPage = (value) => {
    setRowsPerPages(value);
    setCurrentPages(1); // Reset to page 1 when items per page change
  };

  // ** Sort handler 
const handleSort = (column, sortDirection) => {
  setSortcolumn(column.sortField || column.selector);
  setSortdirec(sortDirection);
  setCurrentPages(1);
};

  // ** Search Handler 
  const handleSearch = (e) => {
    const value = e.target.value;
    setCurrentPages(1); // Reset to page 1 on search
  };

  return (
    <Fragment>
      <Card className="shadow-sm border-0 rounded-3">
        <CardBody>
          {/* Search Box (Optional) */}
          {/* <Row className="mb-2 align-items-center">
            <Col md="6" className="text-end">
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ maxWidth: "250px", display: "inline-block" }}
              />
            </Col>
          </Row> */}

           { paymentItems.length > 0 ? ( //checking payments data available or not
            <Row className="mt-1">
              <Col md="12" className="company-table five-row-table">
                {/* ✅ Pagination  */}
                <DatatablePagination
                  columns={columns}
                  data={paymentItems}
                  currentPage={currentPages}  // Use currentPages from props
                  rowsPerPage={rowsPerPages}  // Use rowsPerPages from props
                  pagination={paymentStore?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination} // Ensure this is being called correctly
                />
              </Col>
            </Row>
          ) : (
            <div className="text-center fw-semibold text-muted no-data">
              No payment data available.
            </div>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default Payment;
