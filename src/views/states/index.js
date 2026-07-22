// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deleteState, getStateList, cleanStateMessage } from "./store";
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

import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportExportButtons from "@src/views/_shared/import/ImportExportButtons";
import ImportModal from "./components/ImportModal";

// ** Constants
import {
  appsRoot,
  defaultPerPageRow,
  isAdminUser,
  statesModuleSlug,
} from "@constant/defaultValues";

const StateList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.states);
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
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleStateLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
      countryId = countryFilter?.value
    ) => {
      dispatch(
        getStateList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
          country_id: countryId || undefined,
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
      dispatch,
    ]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleStateLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleStateLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleStateLists(sort, sortColumn, 1, value, searchInput);
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getCountryDropdown());
  }, []);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleStateLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleStateLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter, countryFilter]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanStateMessage(null));
    }
    if (store?.actionFlag === "STATE_DLT") {
      handleStateLists();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t("States with cities under them cannot be deleted."),
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
        if (result.isConfirmed) dispatch(deleteState(id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.[statesModuleSlug];
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const countryOptions = (countryStore?.countryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const columns = [
    {
      name: t("State Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link to={`${appsRoot}/states/edit/${row?._id || ""}`} className="text-wrap">
              {row?.name || ""}
            </Link>
          );
        }
        return <span className="text-wrap">{row?.name || ""}</span>;
      },
    },
    {
      name: t("State Code"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-uppercase">{row?.state_code || "—"}</span>
      ),
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
              id={`state-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/states/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`state-edit-tooltip-${row?._id || ""}`}
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
                id={`state-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`state-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content states">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("States")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              {/* 8/4 (was 9/3): the toolbar now carries Export + Import + Add.
                  8 rather than the UOM screen's 7, because there are three
                  filters here and 7 squeezed them. */}
              <Col sm="8" md="8">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-state"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search States")}
                      onChange={(e) => setSearchInput(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={countryFilter}
                      onChange={(selected) => setCountryFilter(selected)}
                      options={countryOptions}
                      isClearable
                      placeholder={t("All Countries")}
                      classNamePrefix="select"
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
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
              <Col sm="4" md="4">
                <div className="d-flex gap-1 justify-content-end flex-nowrap listing-toolbar-actions">
                  <ImportExportButtons
                    exportUrl={API_ENDPOINTS.states.export}
                    filenamePrefix="states"
                    exportErrorMessage={t("Failed to export states")}
                    canImport={canAdd || canEdit}
                    onImportClick={() => setImportModalOpen(true)}
                  />
                  {canAdd && (
                    <Button
                      color="primary"
                      onClick={() => navigate(`${appsRoot}/states/add`)}
                    >
                      <PlusCircle size={14} className="me-50" /> {t("Add")}
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="state-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.stateItems || []}
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

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen((prev) => !prev)}
        onSuccess={() => handleStateLists()}
      />
    </Fragment>
  );
};

export default StateList;
