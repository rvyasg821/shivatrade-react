// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteCategory, getCategoryList, cleanCategoryMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
import { Col, Badge, Row, Card, Input, Button, CardBody, UncontrolledTooltip } from "reactstrap";
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
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

// ** Import/Export
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportModal from "./components/ImportModal";

const CategoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.category);
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

  const handleCategoryLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getCategoryList({
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
    handleCategoryLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleCategoryLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleCategoryLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);
  const handleStatusFilter = (value) => setStatusFilter(value);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.categories.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `categories-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export categories"), "warning");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCategoryLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleCategoryLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCategoryMessage(null));
    }
    if (store?.actionFlag === "CAT_DLT") {
      handleCategoryLists();
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
          dispatch(deleteCategory(id));
        }
      });
  };

  // Permission gating
  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.categories;
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/categories/edit/${row?._id || ""}`}
              className="text-capitalize text-wrap"
            >
              {row?.name || ""}
            </Link>
          );
        }
        return <span className="text-wrap text-capitalize">{row?.name || ""}</span>;
      },
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      selector: (row) => (
        <Badge color={row?.is_active ? "light-success" : "light-warning"}>
          {row?.is_active ? t("Active") : t("Inactive")}
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
              id={`category-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/categories/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`category-edit-tooltip-${row?._id || ""}`}
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
                id={`category-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`category-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content categories">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Categories")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="7" md="7">
                <Row>
                  <Col sm="6" md="4">
                    <div className="d-flex align-items-center mb-sm-0 mb-1">
                      <Input
                        type="text"
                        id="search-category"
                        value={searchInput}
                        className="w-100 select"
                        placeholder={t("Search Categories")}
                        onChange={(e) => handleSearch(e?.target?.value)}
                      />
                    </div>
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
              </Col>
              <Col sm="5" md="5">
                <div className="d-flex gap-1 justify-content-end flex-wrap">
                  <Button
                    color="secondary"
                    outline
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {t("Export")} <Download size={16} />
                  </Button>
                  {(canAdd || canEdit) && (
                    <Button
                      color="secondary"
                      outline
                      onClick={() => setImportModalOpen(true)}
                    >
                      {t("Import")} <Upload size={16} />
                    </Button>
                  )}
                  {canAdd && (
                    <Button
                      color="primary"
                      onClick={() => navigate(`${appsRoot}/categories/add`)}
                    >
                      {t("Add Category")} <PlusCircle size={16} />
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="category-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.categoryItems || []}
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
        onSuccess={() => handleCategoryLists()}
      />
    </Fragment>
  );
};

export default CategoryList;
