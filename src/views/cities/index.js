// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deleteCity, getCityList, cleanCityMessage } from "./store";
import { getStateDropdown } from "../states/store";
import { getCountryDropdown } from "../countries/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap
import {
  Col,
  Badge,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

// ** Custom
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Constants
import {
  appsRoot,
  defaultPerPageRow,
  isAdminUser,
  citiesModuleSlug,
} from "@constant/defaultValues";

const CityList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.city);
  const stateStore = useSelector((state) => state.states);
  const countryStore = useSelector((state) => state.country);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [countryFilter, setCountryFilter] = useState(null);
  const [stateFilter, setStateFilter] = useState(null);

  const handleCityLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      dispatch(
        getCityList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status: statusFilter,
          country_id: countryFilter?.value || undefined,
          state_id: stateFilter?.value || undefined,
        })
      );
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      statusFilter,
      countryFilter,
      stateFilter,
      dispatch,
    ]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleCityLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleCityLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleCityLists(sort, sortColumn, 1, value, searchInput);
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getCountryDropdown());
    dispatch(getStateDropdown({}));
  }, []);

  // Narrowing the country narrows the state list under it, and any state
  // already picked from a different country has to go — otherwise the two
  // filters contradict each other and the list comes back empty.
  useEffect(() => {
    dispatch(
      getStateDropdown(
        countryFilter?.value ? { country_id: countryFilter.value } : {}
      )
    );
    setStateFilter(null);
  }, [countryFilter?.value]);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCityLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleCityLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter, countryFilter, stateFilter]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCityMessage(null));
    }
    if (store?.actionFlag === "CITY_DLT") {
      handleCityLists();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
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
      .then((result) => {
        if (result.isConfirmed) dispatch(deleteCity(id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.[citiesModuleSlug];
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const countryOptions = (countryStore?.countryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));
  const stateOptions = (stateStore?.stateDropdown || []).map((s) => ({
    value: s._id,
    label: s.name,
  }));

  const columns = [
    {
      name: t("City Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link to={`${appsRoot}/cities/edit/${row?._id || ""}`} className="text-wrap">
              {row?.name || ""}
            </Link>
          );
        }
        return <span className="text-wrap">{row?.name || ""}</span>;
      },
    },
    {
      name: t("City Code"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-uppercase">{row?.city_code || "—"}</span>
      ),
    },
    {
      name: t("State"),
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.state_name || "—"}</span>,
    },
    {
      name: t("Country"),
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.country_name || "—"}</span>,
    },
    {
      name: t("Status"),
      sortable: false,
      selector: (row) => (
        <Badge color={row?.status === "ACTIVE" ? "light-success" : "light-warning"}>
          {row?.status === "ACTIVE" ? t("Active") : t("Inactive")}
        </Badge>
      ),
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          {canEdit && (
            <Link
              className="me-50"
              id={`city-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/cities/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`city-edit-tooltip-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`city-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`city-delete-tooltip-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    });
  }

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content cities">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Cities")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-city"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Cities")}
                      onChange={(e) => setSearchInput(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      value={countryFilter}
                      onChange={(selected) => setCountryFilter(selected)}
                      options={countryOptions}
                      isClearable
                      placeholder={t("All Countries")}
                      classNamePrefix="select"
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      value={stateFilter}
                      onChange={(selected) => setStateFilter(selected)}
                      options={stateOptions}
                      isClearable
                      placeholder={t("All States")}
                      classNamePrefix="select"
                    />
                  </Col>
                  <Col sm="6" md="3" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter
                          ? {
                              value: statusFilter,
                              label:
                                statusFilter === "ACTIVE"
                                  ? t("Active")
                                  : t("Inactive"),
                            }
                          : null
                      }
                      onChange={(selected) =>
                        setStatusFilter(selected ? selected.value : "")
                      }
                      options={[
                        { value: "ACTIVE", label: t("Active") },
                        { value: "INACTIVE", label: t("Inactive") },
                      ]}
                      isClearable
                      placeholder={t("Select Status")}
                      classNamePrefix="select"
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="3" md="3" className="text-end listing-toolbar-actions">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/cities/add`)}
                  >
                    <PlusCircle size={14} className="me-50" /> {t("Add")}
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="city-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.cityItems || []}
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

export default CityList;
