// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  deleteProduct,
  getProductList,
  cleanProductMessage,
} from "./store";
import { getCategoryDropdown } from "@src/views/categories/store";
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

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const ProductList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.product);
  const categoryStore = useSelector((state) => state.category);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("");

  const handleProductLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter,
      categoryId = categoryFilter
    ) => {
      dispatch(
        getProductList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status,
          category_id: categoryId || undefined,
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
      categoryFilter,
      dispatch,
    ]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleProductLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleProductLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleProductLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleProductLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, categoryFilter);
      }, 500);
    } else {
      handleProductLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, categoryFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter, categoryFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getCategoryDropdown());
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanProductMessage(null));
    }
    if (store?.actionFlag === "PROD_DLT") {
      handleProductLists();
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
          dispatch(deleteProduct(id));
        }
      });
  };

  // Permission gating
  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.products;
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const categoryOptions = (categoryStore?.categoryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const columns = [
    {
      name: t("Code / SKU"),
      sortField: "code",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link
              to={`${appsRoot}/products/edit/${row?._id || ""}`}
              className="text-uppercase text-wrap"
            >
              {row?.code || ""}
            </Link>
          );
        }
        return <span className="text-wrap text-uppercase">{row?.code || ""}</span>;
      },
    },
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => (
        <span className="text-wrap text-capitalize">{row?.name || ""}</span>
      ),
    },
    {
      name: t("Category"),
      sortField: "category_id",
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-capitalize">{row?.category_name || "—"}</span>
      ),
    },
    {
      name: t("Unit of Measure"),
      sortField: "unit_of_measure",
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.unit_of_measure || "—"}</span>,
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
              id={`product-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/products/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`product-edit-tooltip-${row?._id || ""}`}
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
                id={`product-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`product-delete-tooltip-${row?._id || ""}`}
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

  const selectedCategory = categoryOptions.find((o) => o.value === categoryFilter) || null;

  return (
    <Fragment>
      <div className="main-content products">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Products")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-product"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Products")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={selectedCategory}
                      onChange={(opt) => setCategoryFilter(opt ? opt.value : "")}
                      options={categoryOptions}
                      isClearable
                      placeholder={t("Filter by Category")}
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
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/products/add`)}
                  >
                    {t("Add Product")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="product-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.productItems || []}
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

export default ProductList;
