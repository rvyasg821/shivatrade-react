// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  deleteProduct,
  deleteManyProducts,
  getProductList,
  cleanProductMessage,
} from "./store";
import { getCategoryDropdown } from "@src/views/categories/store";
import { startLoading, stopLoading } from "../loadingstore";

// ** Hooks
import useBulkDelete from "@src/utility/hooks/useBulkDelete";

// ** Reactstrap
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

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Trash2, PlusCircle, Upload, Download, DollarSign, Sliders } from "react-feather";

import VendorPricesOffcanvas from "./components/VendorPricesOffcanvas";

// ** Constants
import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";

// ** Import/Export
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { getCurrencySymbol } from "@src/utility/currency";
import ImportModal from "./components/ImportModal";

// Currency symbol for the price column. ₹ for INR (the base currency) or when
// no code is set; otherwise prefix the ISO code so non-INR prices stay clear.
const curSym = (code) => {
  const c = (code || "INR").toUpperCase();
  // Shared resolver (configured currencies + broad ISO fallback, e.g. CNY → ¥);
  // only a genuinely unknown code shows the ISO code prefix.
  return getCurrencySymbol(c) || `${c} `;
};

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Product whose vendor-pricing drawer is open (null = closed).
  const [pricesProduct, setPricesProduct] = useState(null);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.products.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export products"), "warning");
    } finally {
      setExporting(false);
    }
  };

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
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.products;
  const canRead = isAdmin || perms?.can_all || perms?.can_read;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const bulk = useBulkDelete({
    entityLabel: "products",
    deleteFn: (ids) => dispatch(deleteManyProducts(ids)).unwrap(),
    onDone: () => handleProductLists(),
  });

  const categoryOptions = (categoryStore?.categoryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const columns = [
    {
      name: t("Product"),
      sortField: "name",
      sortable: true,
      minWidth: "340px",
      grow: 2,
      wrap: true,
      selector: (row) => {
        const name = (
          <span
            className="text-wrap text-capitalize fw-bold"
            ref={(el) => {
              if (el) el.style.setProperty("color", "#09418B", "important");
            }}
          >
            {row?.name || ""}
          </span>
        );
        return (
          <div className="py-50">
            {canEdit ? (
              <Link to={`${appsRoot}/products/edit/${row?._id || ""}`}>
                {name}
              </Link>
            ) : (
              name
            )}
            <div className="d-flex align-items-center flex-wrap mt-25 gap-50">
              {row?.code ? (
                <span className="small text-muted text-uppercase">
                  {row.code}
                </span>
              ) : null}
              <span
                className="badge rounded-pill text-capitalize text-nowrap"
                ref={(el) => {
                  if (el) {
                    el.style.setProperty("background-color", "#09418B", "important");
                    el.style.setProperty("color", "#fff", "important");
                  }
                }}
              >
                {row?.category_name || t("Uncategorized")}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      name: t("HSN Code"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortField: "hsn_code",
      sortable: false,
      minWidth: "130px",
      selector: (row) => (
        <div className="py-50">
          <div className="fw-bold">{row?.hsn_code || "-"}</div>
          {row?.tax_pct != null && row?.tax_pct !== "" ? (
            <div className="small text-muted">
              {Number(row.tax_pct)}% {t("GST")}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      name: t("Part No"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortField: "part_no",
      sortable: false,
      minWidth: "120px",
      selector: (row) => (
        <span className="text-wrap">{row?.part_no || "-"}</span>
      ),
    },
    {
      name: t("UOM"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortField: "unit_of_measure",
      sortable: false,
      center: true,
      minWidth: "120px",
      selector: (row) => <span className="text-nowrap">{row?.unit_of_measure || "-"}</span>,
    },
    {
      name: t("Price"),
      sortField: "selling_price",
      sortable: false,
      right: true,
      minWidth: "130px",
      selector: (row) =>
        row?.selling_price != null && row?.selling_price !== "" ? (
          <div className="text-end py-50">
            <div className="fw-bold">
              {curSym(row?.currency_code)}
              {Number(row.selling_price).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {row?.margin_pct != null && row?.margin_pct !== "" ? (
              <div className="small text-muted">
                {Number(row.margin_pct)}% {t("mgn")}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted">-</span>
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
          <span
            className="badge rounded-pill text-capitalize text-nowrap"
            ref={(el) => {
              if (el) {
                el.style.setProperty("background-color", `${c}1f`, "important");
                el.style.setProperty("color", c, "important");
              }
            }}
          >
            {row?.is_active ? t("Active") : t("Inactive")}
          </span>
        );
      },
    },
  ];

  columns.push({
    name: t("Action"),
    center: true,
    cell: (row) => (
      <div className="d-flex column-action align-items-center table-icon">
        <span
          className="me-50 cursor-pointer"
          id={`product-prices-tooltip-${row?._id || ""}`}
          onClick={() =>
            setPricesProduct({
              _id: row?._id,
              name: row?.name,
              code: row?.code,
            })
          }
        >
          <UncontrolledTooltip
            placement="top"
            target={`product-prices-tooltip-${row?._id || ""}`}
          >
            {t("Vendor Prices")}
          </UncontrolledTooltip>
          <DollarSign size={20} />
        </span>
        <span
          className="me-50 cursor-pointer"
          id={`product-manage-price-tooltip-${row?._id || ""}`}
          onClick={() =>
            navigate(`${appsRoot}/price-list/manage/${row?._id || ""}`)
          }
        >
          <UncontrolledTooltip
            placement="top"
            target={`product-manage-price-tooltip-${row?._id || ""}`}
          >
            {t("Manage Pricing")}
          </UncontrolledTooltip>
          <Sliders size={20} />
        </span>
        {(canEdit || canDelete) && (
          <Fragment>
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
          </Fragment>
        )}
        </div>
      ),
    });

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
              <Col sm="7" md="7">
                <Row>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-product"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Products")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={selectedCategory}
                      onChange={(opt) => setCategoryFilter(opt ? opt.value : "")}
                      options={categoryOptions}
                      isClearable
                      placeholder={t("Select Category")}
                      classNamePrefix="select"
                      styles={{
                        placeholder: (base) => ({
                          ...base,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }),
                      }}
                    />
                  </Col>
                  <Col sm="4" md="4" className="mb-2 mb-md-0">
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
              <Col sm="5" md="5">
                <div className="d-flex gap-1 justify-content-end flex-nowrap listing-toolbar-actions">
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
                     
                      className="text-nowrap"
                      onClick={() => navigate(`${appsRoot}/products/add`)}
                    >
                      <PlusCircle size={14} className="me-50" />{t("Add")}
                    </Button>
                  )}
                </div>
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
        onSuccess={() => handleProductLists()}
      />

      <VendorPricesOffcanvas
        open={!!pricesProduct}
        toggle={() => setPricesProduct(null)}
        product={pricesProduct}
      />
    </Fragment>
  );
};

export default ProductList;
