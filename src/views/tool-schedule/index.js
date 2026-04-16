// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteToolSchedule, getToolSchedulesList, cleanToolSchedulesMessage, updateToolScheduleStatus } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Badge,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle, MoreVertical, Settings } from "react-feather";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
  ENUM_TOOL_SCHEDULE_STATUS,
  ENUM_TOOL_SCHEDULE_STATUS_COLOR,
} from "@constant/defaultValues";

const ToolSchedulesList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.toolSchedules);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  const handleToolSchedulesLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      dispatch(
        getToolSchedulesList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleToolSchedulesLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleToolSchedulesLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleToolSchedulesLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleToolSchedulesLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleToolSchedulesLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initial data load
  useEffect(() => {
    handleToolSchedulesLists();
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanToolSchedulesMessage(null));
    }

    if (store?.actionFlag === "TOOL_SCHEDULE_DLT") {
      handleToolSchedulesLists();
    }

    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("You won't be able to revert this!"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete it!"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteToolSchedule(id));
        }
      });
  };

  const handleStatusChange = (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 2 : 1;
    dispatch(updateToolScheduleStatus({ id, status: newStatus }));
  };

  // ✅ Permission Checks - Company Admin Access
  const isCompanyAdmin =
    authUserItem?.role?.name === "Company Admin" &&
    authUserItem?.role?.type === "system";

  const canAddToolSchedule = isCompanyAdmin;
  const canEditToolSchedule = isCompanyAdmin;
  const canDeleteToolSchedule = isCompanyAdmin;

  // ✅ Columns
  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (
        <span
          onClick={() => navigate(`${appsRoot}/tool-schedule/edit/${row?._id || ""}`)}
          className="text-capitalize text-wrap cursor-pointer text-primary"
        >
          {row?.name || ""}
        </span>
      ),
    },
    {
      name: t("Cron Expression"),
      sortField: "cronString",
      sortable: true,
      selector: (row) => (
        <span className="text-monospace text-wrap" style={{ fontSize: '0.875rem' }}>
          {row?.cronString || ""}
        </span>
      ),
    },
    {
      name: t("Description"),
      sortField: "description",
      sortable: false,
      selector: (row) => (
        <span className="text-wrap" title={row?.description || ""}>
          {row?.description ? (row.description.length > 50 ? `${row.description.substring(0, 50)}...` : row.description) : ""}
        </span>
      ),
    },
    {
      name: t("Tenant Tool"),
      sortField: "tenantToolId",
      sortable: true,
      selector: (row) => (
        <span className="text-wrap">
          {row?.tenantToolId === "68ef4965ec9df9353b8140d6" ? "Wazuh Security Tool" : row?.tenantToolId || ""}
        </span>
      ),
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      selector: (row) => (
        <Badge color={ENUM_TOOL_SCHEDULE_STATUS_COLOR?.[row?.status]}>
          {t(ENUM_TOOL_SCHEDULE_STATUS?.[row?.status]) || ""}
        </Badge>
      ),
    },
  ];

  // ✅ Add Action column only if allowed
  if (canEditToolSchedule || canDeleteToolSchedule) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        return (
          <div className="d-flex column-action align-items-center table-icon">
            {canEditToolSchedule && (
              <span
                className="me-50 cursor-pointer"
                id={`tool-schedule-edit-tooltip-${row?._id || ""}`}
                onClick={() => navigate(`${appsRoot}/tool-schedule/edit/${row?._id || ""}`)}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-schedule-edit-tooltip-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </span>
            )}

            {canDeleteToolSchedule && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`tool-schedule-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-schedule-delete-tooltip-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
              </>
            )}
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
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Tool Schedules")}</h3>

          {/* {canAddToolSchedule && (
            <Button
              color="primary"
              className="ms-2"
              onClick={() => navigate(`${appsRoot}/tool-schedule/add`)}
            >
              {t("Add Tool Schedule")} <PlusCircle size={16} />
            </Button>
          )} */}
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="4" className="">
                <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                  <Input
                    type="text"
                    id="search-tool-schedule"
                    value={searchInput}
                    className="w-100 select"
                    placeholder={t("Search Tool Schedules")}
                    onChange={(event) => handleSearch(event?.target?.value)}
                  />
                </div>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12 " className="user-table five-row-table">
                <DatatablePagination
                  columns={columns}
                  data={store?.toolScheduleItems || []}
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

export default ToolSchedulesList;