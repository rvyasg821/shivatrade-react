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
import {
  deleteVendorCategory,
  deleteManyVendorCategories,
  getVendorCategoryList,
  cleanVendorCategoryMessage,
} from "./store";
import useBulkDelete from "@src/utility/hooks/useBulkDelete";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle, Upload, Download } from "react-feather";

// ** Constants
import {
  appsRoot,
  defaultPerPageRow,
  isAdminUser,
} from "@constant/defaultValues";

// ** Import/Export
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportModal from "./components/ImportModal";
import StatusPill from "@src/views/_shared/StatusPill";

const VendorCategoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.vendorCategory);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleVendorCategoryLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
    ) => {
      dispatch(
        getVendorCategoryList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
        }),
      );
    },
    [
      sort,
      sortColumn,
      currentPage,
      rowsPerPage,
      searchInput,
      statusFilter,
      dispatch,
    ],
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleVendorCategoryLists(
      sortDirection,
      column.sortField,
      1,
      rowsPerPage,
      searchInput,
    );
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleVendorCategoryLists(
      sort,
      sortColumn,
      page + 1,
      rowsPerPage,
      searchInput,
    );
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleVendorCategoryLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);
  const handleStatusFilter = (value) => setStatusFilter(value);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.vendorCategories.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendor-categories-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export vendor categories"), "warning");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleVendorCategoryLists(
          sort,
          sortColumn,
          1,
          rowsPerPage,
          searchInput,
          statusFilter,
        );
      }, 500);
    } else {
      handleVendorCategoryLists(
        sort,
        sortColumn,
        1,
        rowsPerPage,
        searchInput,
        statusFilter,
      );
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanVendorCategoryMessage(null));
    }
    if (store?.actionFlag === "VCAT_DLT") {
      handleVendorCategoryLists();
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
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(deleteVendorCategory(id));
        }
      });
  };

  // Permission gating
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["vendor-categories"];
  const canRead = isAdmin || perms?.can_all || perms?.can_read;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  // Multi-select bulk delete (server respects the dependency guard).
  const bulk = useBulkDelete({
    entityLabel: "vendor categories",
    deleteFn: (ids) => dispatch(deleteManyVendorCategories(ids)).unwrap(),
    onDone: () => handleVendorCategoryLists(),
  });

  const columns = [
    {
      name: t("Code"),
      sortField: "code",
      sortable: true,
      width: "160px",
      selector: (row) => {
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/vendor-categories/edit/${row?._id || ""}`}
              className="text-wrap fw-bold"
            >
              {row?.code || ""}
            </Link>
          );
        }
        return (
          <span className="text-wrap fw-bold">{row?.code || ""}</span>
        );
      },
    },
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/vendor-categories/edit/${row?._id || ""}`}
              className="text-capitalize text-wrap fw-bold"
            >
              {row?.name || ""}
            </Link>
          );
        }
        return (
          <span className="text-wrap text-capitalize fw-bold">
            {row?.name || ""}
          </span>
        );
      },
    },
    {
      name: t("Description"),
      sortField: "description",
      sortable: false,
      selector: (row) => (
        <span className="text-wrap">{row?.description || ""}</span>
      ),
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      center: true,
      width: "120px",
      selector: (row) => {
        const c = row?.is_active ? "#198754" : "#fd7e14";
        return (
          <StatusPill
            label={row?.is_active ? t("Active") : t("Inactive")}
            hex={c}
          />
        );
      },
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
              id={`vendor-category-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/vendor-categories/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`vendor-category-edit-tooltip-${row?._id || ""}`}
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
                id={`vendor-category-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`vendor-category-delete-tooltip-${row?._id || ""}`}
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
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content vendor-categories">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Vendor Categories")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <div className="d-flex align-items-center flex-nowrap gap-2 mb-1">
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <Row>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-vendor-category"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Vendor Categories")}
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
                        handleStatusFilter(selected ? selected.value : "")
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
                  {canRead && (
                    <Button
                      color="outline-secondary"
                      size="sm"
                      className="text-nowrap"
                      onClick={handleExport}
                      disabled={exporting}
                    >
                      {t("Export")} <Download size={14} />
                    </Button>
                  )}
                  {(canAdd || canEdit) && (
                    <Button
                      color="outline-secondary"
                      size="sm"
                      className="text-nowrap"
                      onClick={() => setImportModalOpen(true)}
                    >
                      {t("Import")} <Upload size={14} />
                    </Button>
                  )}
                  {canAdd && (
                    <Button
                      color="primary"
                      onClick={() =>
                        navigate(`${appsRoot}/vendor-categories/add`)
                      }
                    >
                      <PlusCircle size={14} className="me-50" /> {t("Add")}
                    </Button>
                  )}
              </div>
            </div>

            <Row className="mt-2">
              <Col md="12" className="vendor-category-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.vendorCategoryItems || []}
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
        onSuccess={() => handleVendorCategoryLists()}
      />
    </Fragment>
  );
};

export default VendorCategoryList;
