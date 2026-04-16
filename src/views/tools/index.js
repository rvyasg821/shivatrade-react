/* eslint-disable no-confusing-arrow */
// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getToolsList, cleanToolsMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Badge,
  Row,
  Card,
  Input,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";

// ** Third Party Components
import Select from "react-select";
import classnames from 'classnames'

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import ToolsContextIndicator from "./components/ToolsContextIndicator";
import ToolsErrorBoundary from "./components/ToolsErrorBoundary";
import ToolsErrorAlert from "./components/ToolsErrorAlert";

// ** Third Party Components
import { useTranslation } from "react-i18next";

// ** Constant
import {
  defaultPerPageRow,
  ENUM_TOOLS_STATUS,
  ENUM_TOOLS_STATUS_COLOR,
} from "@constant/defaultValues";

// ** Role-based utilities
import {
  getUserRole,
  isSuperAdmin,
  hasToolsPermission,
} from "./utils/roleUtils";

// ** Error utilities
import { getErrorMessage } from "./errors/ToolsErrors";

// ** Performance optimizations
import { cleanup } from "./utils/performanceOptimizations";

// ** Navigation utilities
import { navigateToToolEdit } from "./utils/navigationUtils";
import { Eye } from "lucide-react";

const ToolsList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const [searchParams] = useSearchParams();
  // const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.tools);
  const authStore = useSelector((state) => state.auth);
  // const authUserItem = authStore?.userData || authStore?.authUserItem || null;

  // ** Role-based variables
  const userRole = getUserRole(authStore);
  const isUserSuperAdmin = isSuperAdmin(userRole);
  // const showCompanyFilter = shouldShowCompanyFilter(userRole);
  // ** Error state
  const [currentError, setCurrentError] = useState(null);

  // ** Company filter state (now using Redux for persistence)
  const selectedCompany = store?.selectedCompany || "";
  // const [companySearch, setCompanySearch] = useState("");

  // const searchCompany = store?.companiesItems || [];
  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  // const [searchInput, setSearchInput] = useState("");

  // if (searchCompany.length > 0 && selectedCompany === "") {
  //   dispatch(setSelectedCompany(searchCompany[0]?.tenantId));
  // }

  const handleToolsLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      // search = searchInput,
      company = selectedCompany
    ) => {
      dispatch(
        getToolsList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          // search,
          company: company || undefined,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, selectedCompany, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleToolsLists(sortDirection, column.sortField, 1, rowsPerPage, selectedCompany);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleToolsLists(sort, sortColumn, page + 1, rowsPerPage, selectedCompany);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleToolsLists(sort, sortColumn, 1, value, selectedCompany);
  };

  // const handleSearch = (value) => {
  //   setSearchInput(value);
  // };

  // const handleCompanyFilter = (companyId) => {
  //   dispatch(setSelectedCompany(companyId));
  // };

  // const handleCompanySearch = (value) => {
  //   setCompanySearch(value);
  // };

  // Debounced search function
  // const debouncedSearch = useCallback(
  //   debounce((searchTerm) => {
  //     setCurrentPage(1);
  //     handleToolsLists(sort, sortColumn, 1, rowsPerPage, searchTerm, selectedCompany);
  //   }, 500, 'tools-search'),
  //   [sort, sortColumn, rowsPerPage, selectedCompany, handleToolsLists]
  // );

  // Debounced company search function
  // const debouncedCompanySearch = useCallback(
  //   debounce((searchTerm) => {
  //     dispatch(getCompaniesList({ search: searchTerm }));
  //   }, 500, 'company-search'),
  //   [dispatch]
  // );

  // Debounced company search effect
  // useEffect(() => {
  //   if (companySearch) {
  //     debouncedCompanySearch(companySearch);
  //   } else if (showCompanyFilter) {
  //     dispatch(getCompaniesList({}));
  //   }
  // }, [companySearch, debouncedCompanySearch, dispatch]);

  // useEffect(() => {
  //   if (searchInput) {
  //     debouncedSearch(searchInput);
  //   } else {
  //     handleToolsLists(sort, sortColumn, 1, rowsPerPage, searchInput, selectedCompany);
  //   }
  // }, [searchInput, selectedCompany, debouncedSearch, handleToolsLists]);

  // useLayoutEffect(() => {
  //   window.scrollTo(0, 0);

  //   // Initialize company context from URL if present
  //   const companyFromURL = getCompanyFromURL(searchParams);
  //   if (companyFromURL && companyFromURL !== selectedCompany) {
  //     dispatch(setSelectedCompany(companyFromURL));
  //   }
  // }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Fetch companies on component mount (only for super admin)
  // useEffect(() => {
  //   if (showCompanyFilter) {
  //     dispatch(getCompaniesList({}));
  //   }
  // }, [dispatch, showCompanyFilter]);

  // Handle company filter changes
  useEffect(() => {
    setCurrentPage(1);
    handleToolsLists(sort, sortColumn, 1, rowsPerPage, selectedCompany);
  }, [selectedCompany]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanToolsMessage(null));
    }

    if (store?.actionFlag === "TOOL_DLT") {
      handleToolsLists();
    }

    if (store?.success) {
      // Notification("Success", store.success, "success");
      setCurrentError(null); // Clear any existing errors on success
    }

    if (store?.error) {
      // Handle different types of errors
      if (typeof store.error === 'object' && store.error.name) {
        // Custom error object
        setCurrentError(store.error);
        const userFriendlyMessage = getErrorMessage(store.error, t);
        Notification("Error", userFriendlyMessage, "warning");
      } else {
        // String error message
        setCurrentError({ message: store.error, name: 'ToolsError' });
        Notification("Error", store.error, "warning");
      }
    }
  }, [store.actionFlag, store.success, store.error, t]);

  // const handleDelete = (id = "") => {
  //   mySwal
  //     .fire({
  //       title: t("Are you sure?"),
  //       text: t("You won't be able to revert this!"),
  //       icon: "warning",
  //       showCancelButton: true,
  //       confirmButtonText: t("Yes, delete it!"),
  //       customClass: {
  //         confirmButton: "btn btn-primary",
  //         cancelButton: "btn btn-outline-danger ms-1",
  //       },
  //       buttonsStyling: false,
  //     })
  //     .then(function (result) {
  //       if (result.isConfirmed) {
  //         dispatch(deleteTool({ id, selectedCompany }));
  //       }
  //     });
  // };

  // const handleStatusChange = (id, currentStatus, newStatus, company = selectedCompany) => {
  //   dispatch(updateToolStatus({ id, status: newStatus, selectedCompany: company }));
  // };

  // ✅ Permission Checks using role utilities
  // const canAddTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_add');
  const canEditToolGlobal = isUserSuperAdmin || hasToolsPermission(userRole, 'can_update');
  const canDeleteToolGlobal = isUserSuperAdmin || hasToolsPermission(userRole, 'can_delete');

  // ✅ Columns
  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (
        <span
          onClick={() => canEditToolGlobal ? navigateToToolEdit(navigate, row?._id || "", selectedCompany) : null}
          className={classnames("text-capitalize text-wrap text-primary", {
            "cursor-pointer": canEditToolGlobal
          })}
        >
          {row?.name || ""}
        </span>
      ),
    },
    {
      name: t("Description"),
      sortField: "description",
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.description || ""}</span>,
    },
    (isUserSuperAdmin
      ? {
        name: t("Status"),
        sortField: "status",
        sortable: false,
        selector: (row) => (
          <Badge color={ENUM_TOOLS_STATUS_COLOR?.[row?.status]}>
            {t(ENUM_TOOLS_STATUS?.[row?.status]) || ""}
          </Badge>
        ),
      } : null),
  ].filter(Boolean);

  // ✅ Add Action column only if allowed
  if (canEditToolGlobal || canDeleteToolGlobal) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const canEditTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_update');
        // const canDeleteTool = isUserSuperAdmin || hasToolsPermission(userRole, 'can_delete');

        return (
          <div className="d-flex column-action align-items-center table-icon">
            {(canEditTool || isUserSuperAdmin) && (
              <span
                className="me-50 cursor-pointer"
                id={`tool-edit-tooltip-${row?._id || ""}`}
                onClick={() => navigateToToolEdit(navigate, row?._id || "", selectedCompany)}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-edit-tooltip-${row?._id || ""}`}
                >
                  {t("View")}
                </UncontrolledTooltip>
                <Eye size={20} />
              </span>
            )}
            {/* 
            {canDeleteTool && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`tool-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-delete-tooltip-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )} */}

          </div>
        );
      },
    });
  }

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <ToolsErrorBoundary
        userRole={userRole}
        onRetry={() => handleToolsLists()}
      >
        <div className="main-content">

          <div className="d-flex align-items-center justify-content-between mb-2">
            <h3 className="mb-0">{t("Tools")}</h3>
          </div>

          {/* Error Alert */}
          {currentError && (
            <ToolsErrorAlert
              error={currentError}
              userRole={userRole}
              onDismiss={() => setCurrentError(null)}
              onRetry={() => {
                setCurrentError(null);
                handleToolsLists();
              }}
            />
          )}

          <Card className="overflow-hidden">
            <CardBody>
              <Row>
                {/* <Col sm="4" className="ps-3 pe-3">

                <Col sm="4" className="">

                  <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                    <Input
                      type="text"
                      id="search-tool"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Tools")}
                      onChange={(event) => handleSearch(event?.target?.value)}
                    />
                  </div>
                </Col> */}
                {/* Company filter - only show for Super Admin */}
                {/* {showCompanyFilter && (
                  <Col sm="4" className="">
                    <div className="d-flex align-items-center mb-sm-0 mb-1">
                      <Select
                        id="company-filter"
                        value={
                          selectedCompany
                            ? {
                              value: selectedCompany,
                              label: store.companiesItems.find(
                                (company) => company.tenantId === selectedCompany
                              )?.company_name || "",
                            }
                            : null
                        }
                        options={[
                          ...searchCompany?.map((company) => ({
                            value: company?.tenantId,
                            label: company?.company_name,
                          })),
                        ]}
                        className="w-100"
                        classNamePrefix="select"
                        placeholder={t("Filter by Company")}
                        onChange={(selectedOption) =>
                          handleCompanyFilter(selectedOption ? selectedOption.value : "")
                        }
                        isSearchable={true}
                        onInputChange={handleCompanySearch}
                        filterOption={(option, inputValue) =>
                          option?.label?.toLowerCase()?.includes(inputValue?.toLowerCase())
                        }
                        isClearable={false}
                      />
                    </div>
                  </Col>
                )} */}
              </Row>

              <Row className="mt-2">
                <Col md="12 " className="user-table main-usertable">
                  <DatatablePagination
                    columns={columns}
                    data={[...(store?.toolsItems || [])].sort((a, b) => a.name.localeCompare(b.name))}
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
      </ToolsErrorBoundary>
    </Fragment>
  );
};

export default ToolsList;