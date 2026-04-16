// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getSubscriptionList } from "./store/index.js";
import { startLoading, stopLoading } from "../loadingstore/index.js";

// ** API Imports
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Reactstrap Imports
import { Col, Row, Card, CardBody, UncontrolledTooltip, Input } from "reactstrap";
// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import moment from "moment";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
// import {getUserList} from "@src/"
// ** Icons
import { Edit, Repeat } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

// ** Utils
import { formatPrice } from "@src/utility/Utils";

// ** Select
import AsyncSelect from "react-select/async";
import Select from "react-select";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  // ** Store
  const store = useSelector((state) => state.subscription);
  const authStore = useSelector((state) => state.auth)
  console.log(store)

  // ** Pagination & Search - Initialize from URL params
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  // ** Filters - Initialize from URL params (default to "active" for status)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "active");
  const [selectedCustomer, setSelectedCustomer] = useState(searchParams.get("company_id") || "");
  const [selectedCustomerName, setSelectedCustomerName] = useState(searchParams.get("companyName") || "");

  // ** Toast
  const [shownSuccess, setShownSuccess] = useState(false);
  const [shownError, setShownError] = useState(false);

  // ** Update URL parameters
  const updateURLParams = useCallback((params) => {
    const newSearchParams = new URLSearchParams(searchParams);

    // Update or remove parameters
    Object.keys(params).forEach(key => {
      if (params[key]) {
        newSearchParams.set(key, params[key]);
      } else {
        newSearchParams.delete(key);
      }
    });

    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // ** API function to get company list
  const getCompanyListAPI = async (params) => {
    try {
      const response = await instance.get(`${API_ENDPOINTS.company.getList}`, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching companies:", error);
      return { statusCode: 500, data: [] };
    }
  };

  // ** Fetch subscription list
  const fetchSubscriptions = useCallback(() => {
    const params = {
      page: currentPage,
      perPage: rowsPerPage,
      search: searchInput,
      orderBy: sortColumn,
      orderDirection: sort,
    };

    // Add company filter if selected
    if (selectedCustomer) {
      params.company_id = selectedCustomer;
    }

    // Add status filter if selected
    if (statusFilter === "active") {
      params.status = true;
    } else if (statusFilter === "inactive") {
      params.status = false;
    }

    dispatch(getSubscriptionList(params));
  }, [
    dispatch,
    currentPage,
    rowsPerPage,
    searchInput,
    sortColumn,
    sort,
    selectedCustomer,
    statusFilter,
  ]);

  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, rowsPerPage, searchInput, sortColumn, sort, selectedCustomer, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ** Clear filters when coming from non-subscription pages
  useEffect(() => {
    const currentPath = location.pathname;
    const isSubscriptionPage = currentPath.includes('/subscription');

    // Check if we're coming from a non-subscription page
    const referrer = document.referrer;
    const isFromNonSubscriptionPage = referrer &&
      !referrer.includes('/subscription') &&
      referrer.includes(window.location.origin);

    // Clear URL params if coming from non-subscription page
    if (isSubscriptionPage && isFromNonSubscriptionPage) {
      setSearchParams(new URLSearchParams());
      setStatusFilter("active"); // Default to active subscriptions
      setSelectedCustomer("");
      setSelectedCustomerName("");
      setSearchInput("");
    }
  }, [location.pathname, setSearchParams]);

  // ** Effect for filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCustomer, statusFilter, searchInput]);

  // ** Initialize filters from URL params on component mount
  useEffect(() => {
    const companyId = searchParams.get("company_id");
    const companyName = searchParams.get("companyName");
    const search = searchParams.get("search");

    if (companyId && companyName && !selectedCustomerName) {
      setSelectedCustomer(companyId);
      setSelectedCustomerName(companyName);
    }

    if (search && !searchInput) {
      setSearchInput(search);
    }
  }, [searchParams, selectedCustomerName, searchInput]);

  // Use store data directly since filtering is handled by API
  const filteredData = store?.subscriptionItems || [];

  // ** Sorting
  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField || column.selector);
    setCurrentPage(1);
  };

  // ** Pagination
  const handlePagination = (page) => setCurrentPage(page + 1);
  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  // ** Filters
  const handleStatusFilter = (selected) => {
    const value = selected ? selected.value : "";
    setStatusFilter(value);
    setCurrentPage(1);

    // Update URL parameters
    updateURLParams({ status: value });
  };

  const handleCustomerFilter = (selected) => {
    if (selected) {
      setSelectedCustomer(selected.value);
      setSelectedCustomerName(selected.label);

      // Update URL parameters
      updateURLParams({
        company_id: selected.value,
        companyName: selected.label
      });
    } else {
      setSelectedCustomer("");
      setSelectedCustomerName("");

      // Remove URL parameters
      updateURLParams({
        company_id: "",
        companyName: ""
      });
    }
    setCurrentPage(1);
  };

  // ** Search handler with debounce
  const handleSearch = useCallback((value) => {
    setSearchInput(value);
    setCurrentPage(1);

    // Update URL parameters
    updateURLParams({ search: value });
  }, [updateURLParams]);

  // ** Notifications
  useEffect(() => {
    if (store?.success && !shownSuccess) {
      // Notification("Success", store.success, "success");
      setShownSuccess(true);
    }
    if (store?.error && !shownError) {
      // Notification("Error", store.error, "warning");
      setShownError(true);
    }
  }, [store.success, store.error]);

  // ** Loading spinner
  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store.loading]);



  // ** Load company options with search functionality
  const loadCustomerOptions = useCallback((inputValue, callback) => {
    if (!inputValue || inputValue.length < 2) {
      callback([]);
      return;
    }

    // Use setTimeout to debounce the API call
    const handler = setTimeout(async () => {
      try {
        // Call company list API with search parameter
        const response = await getCompanyListAPI({
          search: inputValue,
          page: 1,
          perPage: 50 // Limit results for dropdown
        });

        if (response?.statusCode === 200 && response?.data) {
          // Create company options from API response
          const companyOptions = response.data.map(company => ({
            value: company._id,
            label: company.company_name,
            company: company
          }));

          callback(companyOptions);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error("Error loading companies:", error);
        callback([]);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, []);

  // check permission
  const canEditUserGlobal = authStore?.authUserItem?.role?.permissions?.user?.can_update;
  const companyPermission = authStore?.authUserItem?.role?.permissions?.company;

  // check isAgent
  const isAgent = authStore?.authUserItem?.role?.name === 'Agent' && authStore?.authUserItem?.role?.type === 'system';

  // ** Table Columns
  const columns = [
    {
      name: t("Contact"),
      sortable: true,
      sortField: "company.company_name",
      minWidth: "250px",
      selector: (row) => (
        <div className="text-capitalize text-wrap">
          <Link
            to={`${appsRoot}/company/view/${row?.company?._id}`}
            className="fw-bold d-block text-primary"
          >
            {row?.company?.company_name || "NA"}
          </Link>
          <small>{row?.company?.email || "NA"}</small>
        </div>
      ),
    },
    {
      name: t("Plan"),
      selector: (row) => (
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center">
            <span className="me-1">{row?.plan?.name || "NA"}</span>
            {row?.recurring && (
              <Repeat size={14} className="text-success text-white" title={t("Recurring")} />
            )}
          </div>
          {row?.next_date && (
            <small className="text-muted mt-1">
              {t("Next")}: {moment(row.next_date).format("MMM DD, YYYY")}
            </small>
          )}
        </div>
      ),
      sortable: false,
      minWidth: "200px",
    },
    {
      name: t("Start"),
      selector: (row) =>
        row?.start_date
          ? moment(row.start_date).format("YYYY-MM-DD")
          : "NA",
      sortable: true,
      sortField: "start_date",
      minWidth: "120px",
    },
    {
      name: t("End"),
      selector: (row) =>
        row?.end_date ? moment(row.end_date).format("YYYY-MM-DD") : "NA",
      sortable: true,
      sortField: "end_date",
      minWidth: "120px",
    },
    ...(isAgent
      ? [
        {
          name: t("Earnings"),
          sortField: "commission",
          sortable: true,
          minWidth: "120px",
          selector: (row) => {
            if (!row?.commission || !row?.final_price) return "0";

            const earning = (row.commission / 100) * row.final_price;
            return formatPrice(earning);
          },
        },

      ]
      : []),

    ...(isAgent
      ? [] : [
        {
          name: t("Total"),
          selector: (row) => <span>{formatPrice(row?.final_price || row?.total_price)}</span>,
          sortable: true,
          sortField: "final_price",
          sortFunction: (a, b) => ((a.final_price || a.total_price) || 0) - ((b.final_price || b.total_price) || 0),
          minWidth: "120px",
        },
      ]),

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
      minWidth: "100px",
    },

  ];
  if (canEditUserGlobal) {
    columns.push({
      name: t("Actions"),
      center: true,
      minWidth: "100px",
      cell: (row) => {
        const canEditUser =
          authStore?.authUserItem?.role?.permissions?.subscription?.can_update;

        return (
          <div className="d-flex align-items-center column-action table-icon">
            {canEditUser && (
              <Link
                id={`subscription-edit-tooltip-${row?._id || ""}`}
                to={`${appsRoot}/subscription/edit/${row?._id || ""}`}
                className="me-50"
              >
                <Edit size={18} className="text-primary cursor-pointer" />
                <UncontrolledTooltip
                  placement="top"
                  target={`subscription-edit-tooltip-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
              </Link>
            )}
          </div>
        );
      },
    });
  }


  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Subscription")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row className="mb-2">
              {/* <Col sm="6" md="3" className="mb-2 mb-md-0">
                <Input
                  type="text"
                  placeholder={t("Search subscriptions...")}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-control"
                />
              </Col> */}
              {companyPermission && (
                <Col sm="6" md="3" className="">
                  <AsyncSelect
                    cacheOptions
                    loadOptions={loadCustomerOptions}
                    onChange={handleCustomerFilter}
                    value={
                      selectedCustomer
                        ? {
                          value: selectedCustomer,
                          label: selectedCustomerName,
                        }
                        : null
                    }
                    isClearable
                    placeholder={t("Select Company")}
                    classNamePrefix="select"
                  />
                </Col>
              )}
              <Col sm="6" md="3" className="mb-2 mb-md-0">
                <Select
                  value={
                    statusFilter
                      ? {
                        value: statusFilter,
                        label:
                          statusFilter === "active"
                            ? t("Active")
                            : t("Inactive"),
                      }
                      : null
                  }
                  onChange={handleStatusFilter}
                  options={[
                    { value: "active", label: t("Active") },
                    { value: "inactive", label: t("Inactive") },
                  ]}
                  isClearable
                  placeholder={t("Select Status")}
                  classNamePrefix="select"
                />
              </Col>


            </Row>

            <Row className="mt-2">
              <Col md="12" className=" company-table five-row-table">
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
    </Fragment>
  );
};

export default Index;
