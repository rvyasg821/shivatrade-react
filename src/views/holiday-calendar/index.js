// ** React Imports
import { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getHolidayCalendarList,
  deleteHolidayCalendar,
  cleanHolidayCalendarMessage,
} from "./store";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  Badge,
  UncontrolledTooltip,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Trash2, PlusCircle, Download } from "react-feather";

// ** Constant
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const HolidayCalendarList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.holidayCalendar);
  const locationCtx = useSelector((state) => state.locationContext);
  const { selectedLocationId, companyLocations } = locationCtx || {};
  const authStore = useSelector((state) => state.auth);
  const roleName = authStore?.authUserItem?.role?.name;
  const isEmployee = roleName === "Employee";

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  // Track previous location to detect changes

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      year = yearFilter,
      locId = selectedLocationId
    ) => {
      dispatch(
        getHolidayCalendarList({
          _sort: sortCol,
          _order: sorting,
          _limit: perPage,
          _offset: (page - 1) * perPage,
          _search: search || undefined,
          year: year || undefined,
          location_id: locId || undefined,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, yearFilter, selectedLocationId]
  );

  // Fetch on mount and when global location changes
  useEffect(() => {
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, rowsPerPage, searchInput, yearFilter, selectedLocationId);
  }, [selectedLocationId]);

  // Handle messages
  useEffect(() => {
    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
    if (store?.success || store?.error) {
      dispatch(cleanHolidayCalendarMessage());
    }
  }, [store?.success, store?.error]);

  // Refresh list after delete
  useEffect(() => {
    if (store?.actionFlag === "HC_DEL_SCS") {
      handleList();
    }
  }, [store?.actionFlag]);

  const handleDelete = (id, name) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t(`Delete "${name}"? All holidays in this calendar will also be deleted.`),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel"),
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteHolidayCalendar(id));
        }
      });
  };

  const handleSort = (column, sortDirection) => {
    setSortColumn(column.sortField);
    setSort(sortDirection);
    handleList(sortDirection, column.sortField, currentPage, rowsPerPage, searchInput, yearFilter);
  };

  const handlePagination = (page) => {
    setCurrentPage(page + 1);
    handleList(sort, sortColumn, page + 1, rowsPerPage, searchInput, yearFilter);
  };

  const handleRowPerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, value, searchInput, yearFilter);
  };

  const columns = [
    {
      name: t("Name"),
      sortable: true,
      sortField: "name",
      selector: (row) => row.name,
      cell: (row) => (
        <Link to={`${appsRoot}/holiday-calendar/edit/${row._id}`}>{row.name}</Link>
      ),
    },
    {
      name: t("Year"),
      hide: "md",
      sortable: true,
      sortField: "year",
      selector: (row) => row.year,
      cell: (row) => <span>{row.year}</span>,
    },
    {
      name: t("Scope"),
      hide: "md",
      cell: (row) => {
        if (row.location_id) {
          const loc = (companyLocations || []).find((l) => l._id === row.location_id);
          return (
            <Badge color="light-info">
              {loc ? loc.location_name : t("Location")}
            </Badge>
          );
        }
        return <Badge color="light-primary">{t("Company-wide")}</Badge>;
      },
    },
    {
      name: t("Type"),
      cell: (row) => (
        <span className={`doc-badge ${row.is_default ? 'doc-badge-green' : 'doc-badge-gray'}`}>
          {row.is_default ? t("UK Bank Holidays") : t("Custom")}
        </span>
      ),
    },
    {
      name: t("Status"),
      cell: (row) => (
        <span className={`doc-badge ${row.is_active ? 'doc-badge-green' : 'doc-badge-red'}`}>
          {row.is_active ? t("Active") : t("Inactive")}
        </span>
      ),
    },
    ...(!isEmployee ? [{
      name: t("Actions"),
      cell: (row) => (
        <div className="d-flex gap-1">
          <Link
            to={`${appsRoot}/holiday-calendar/edit/${row._id}`}
            id={`edit-${row._id}`}
          >
            <Edit size={16} className="text-primary" />
          </Link>
          <UncontrolledTooltip target={`edit-${row._id}`}>
            {t("Edit")}
          </UncontrolledTooltip>
          <span
            id={`del-${row._id}`}
            className="cursor-pointer"
            onClick={() => handleDelete(row._id, row.name)}
          >
            <Trash2 size={16} className="text-danger" />
          </span>
          <UncontrolledTooltip target={`del-${row._id}`}>
            {t("Delete")}
          </UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ];

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row className="mb-2 align-items-center">
            <Col md={4} className="mb-2 mb-md-0">
              <h4 className="mb-0">{t("Holiday Calendars")}</h4>
            </Col>
            <Col md={8} className="d-flex justify-content-end gap-1 flex-wrap listing-toolbar-actions listing-toolbar-filters">
              <Input
                type="number"
                placeholder={t("Filter by year...")}
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  handleList(sort, sortColumn, 1, rowsPerPage, searchInput, e.target.value);
                }}
                style={{ width: 130 }}
              />
              <Input
                type="search"
                placeholder={t("Search...")}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  handleList(sort, sortColumn, 1, rowsPerPage, e.target.value, yearFilter);
                }}
                style={{ width: 200 }}
              />
              {!isEmployee && (
                <Button
                  color="primary"
                  tag={Link}
                  to={`${appsRoot}/holiday-calendar/add`}
                >
                  <PlusCircle size={14} className="me-1" />
                  {t("Add Calendar")}
                </Button>
              )}
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.holidayCalendarItems || []}
            pagination={{ total: store?.pagination?.total || 0, perPage: rowsPerPage }}
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            handlePagination={handlePagination}
            handleRowPerPage={handleRowPerPage}
            handleSort={handleSort}
            loading={store?.loading}
          />
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default HolidayCalendarList;
