// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  deleteCountry,
  deleteManyCountries,
  getCountryList,
  cleanCountryMessage,
} from "./store";
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
import useBulkDelete from "@src/utility/hooks/useBulkDelete";
import ImportModal from "./components/ImportModal";

// ** Constants
import {
  appsRoot,
  defaultPerPageRow,
  isAdminUser,
  countriesModuleSlug,
} from "@constant/defaultValues";

const CountryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.country);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  // A → Z by name. The old default was `_id` descending, which on a uuid key
  // is not an order anyone can read — it just looked shuffled.
  const [sort, setSort] = useState("asc");
  const [sortColumn, setSortColumn] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleCountryLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getCountryList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleCountryLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleCountryLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleCountryLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCountryLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleCountryLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCountryMessage(null));
    }
    if (store?.actionFlag === "CNTRY_DLT") {
      handleCountryLists();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        // Deliberately not "you won't be able to revert this": the backend
        // refuses the delete outright while any state or city still points here.
        text: t("Countries with states or cities under them cannot be deleted."),
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
        if (result.isConfirmed) dispatch(deleteCountry(id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.[countriesModuleSlug];
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const bulk = useBulkDelete({
    entityLabel: "countries",
    deleteFn: (ids) => dispatch(deleteManyCountries(ids)).unwrap(),
    onDone: () => handleCountryLists(),
  });

  const columns = [
    {
      name: t("Country Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/countries/edit/${row?._id || ""}`}
              className="text-wrap"
            >
              {row?.name || ""}
            </Link>
          );
        }
        return <span className="text-wrap">{row?.name || ""}</span>;
      },
    },
    {
      name: t("Country Code"),
      sortField: "country_code",
      sortable: true,
      selector: (row) => (
        <span className="text-wrap text-uppercase">{row?.country_code || "—"}</span>
      ),
    },
    {
      name: t("Currency"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-uppercase">{row?.currency_code || "—"}</span>
      ),
    },
    {
      name: t("Time Zone"),
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.time_zone || "—"}</span>,
    },
    {
      name: t("Status"),
      sortable: false,
      selector: (row) => (
        <Badge
          color={row?.status === "ACTIVE" ? "light-success" : "light-warning"}
        >
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
              id={`country-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/countries/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`country-edit-tooltip-${row?._id || ""}`}
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
                id={`country-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`country-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content countries">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Countries")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <div className="d-flex align-items-center flex-nowrap gap-2">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <Row>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-country"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Countries")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
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
              </div>
              <div className="d-flex align-items-center justify-content-end gap-1 flex-shrink-0">
                  {canDelete && bulk.selectedRows.length > 0 && (
                    <Button
                      color="danger"
                      outline
                      size="sm"
                      className="text-nowrap"
                      onClick={bulk.confirmBulkDelete}
                      disabled={bulk.deleting}
                    >
                      {t("Delete Selected")} ({bulk.selectedRows.length})
                    </Button>
                  )}
                  <ImportExportButtons
                    exportUrl={API_ENDPOINTS.countries.export}
                    filenamePrefix="countries"
                    exportErrorMessage={t("Failed to export countries")}
                    canImport={canAdd || canEdit}
                    onImportClick={() => setImportModalOpen(true)}
                  />
                  {canAdd && (
                    <Button
                      color="primary"
                      onClick={() => navigate(`${appsRoot}/countries/add`)}
                    >
                      <PlusCircle size={14} className="me-50" /> {t("Add")}
                    </Button>
                  )}
              </div>
            </div>

            <Row className="mt-2">
              <Col md="12" className="country-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.countryItems || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={store?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                  selectableRows={canDelete}
                  onSelectedRowsChange={bulk.onSelectedRowsChange}
                  clearSelectedRows={bulk.toggleCleared}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen((prev) => !prev)}
        onSuccess={() => handleCountryLists()}
      />
    </Fragment>
  );
};

export default CountryList;
