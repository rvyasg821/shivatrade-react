// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deleteVendor, getVendorList, cleanVendorMessage } from "./store";
import { getCategoryDropdown } from "@src/views/categories/store";
import { startLoading, stopLoading } from "../loadingstore";

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

// ** Custom
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons
import { Edit, Eye, Trash2, PlusCircle, User, Mail, Phone, Upload } from "react-feather";
import VendorImportModal from "./components/VendorImportModal";

// ** Constants
import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";

const VendorList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.vendor);
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
  const [importOpen, setImportOpen] = useState(false);

  const handleVendorLists = useCallback(
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
        getVendorList({
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
    handleVendorLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleVendorLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleVendorLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleVendorLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, categoryFilter);
      }, 500);
    } else {
      handleVendorLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter, categoryFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter, categoryFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getCategoryDropdown());
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanVendorMessage(null));
    }
    if (store?.actionFlag === "VEN_DLT") {
      handleVendorLists();
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
        if (result.isConfirmed) dispatch(deleteVendor(id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.vendors;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const categoryOptions = (categoryStore?.categoryDropdown || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const columns = [
    {
      name: t("Company"),
      sortField: "company_name",
      sortable: true,
      grow: 1.6,
      wrap: true,
      selector: (row) => {
        const cats = row?.categories || [];
        return (
          <div className="py-75" style={{ minWidth: 0 }}>
            <Link
              to={`${appsRoot}/vendors/view/${row?._id || ""}`}
              style={{ textDecoration: "none" }}
            >
              <span
                className="fw-bold text-capitalize text-break"
                style={{ overflowWrap: "anywhere" }}
                ref={(el) => {
                  if (el) el.style.setProperty("color", "#09418B", "important");
                }}
              >
                {row?.company_name || "-"}
              </span>
            </Link>
            {row?.vendor_code ? (
              <div className="small text-muted text-break mt-50">
                {row.vendor_code}
              </div>
            ) : null}
            {cats.length > 0 && (
              <div className="d-flex flex-wrap gap-50 mt-50">
                {cats.map((c) => (
                  <span
                    key={c._id || c.name}
                    className="badge rounded-pill text-capitalize text-nowrap"
                    ref={(el) => {
                      if (el) {
                        el.style.setProperty("background-color", "#09418B", "important");
                        el.style.setProperty("color", "#fff", "important");
                      }
                    }}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Contact"),
      sortable: false,
      grow: 1.6,
      wrap: true,
      selector: (row) => {
        const phone =
          row?.primary_contact_country_code?.formatted ||
          (row?.primary_contact_country_code?.dial_code &&
          row?.primary_contact_phone
            ? `${row.primary_contact_country_code.dial_code} ${row.primary_contact_phone}`
            : row?.primary_contact_phone) ||
          "";
        if (!row?.primary_contact_name && !row?.primary_contact_email && !phone)
          return <span className="text-muted">-</span>;
        return (
          <div className="py-75" style={{ minWidth: 0 }}>
            {row?.primary_contact_name && (
              <div className="d-flex align-items-center text-capitalize text-break mb-25">
                <User size={13} className="text-muted me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.primary_contact_name}
                </span>
              </div>
            )}
            {row?.primary_contact_email && (
              <div className="d-flex align-items-center small text-muted text-break mb-25">
                <Mail size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>
                  {row.primary_contact_email}
                </span>
              </div>
            )}
            {phone && (
              <div className="d-flex align-items-center small text-muted text-break">
                <Phone size={13} className="me-50 flex-shrink-0" />
                <span style={{ overflowWrap: "anywhere" }}>{phone}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Status"),
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

  if (canEdit || canDelete) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <Link
            className="me-50"
            id={`vendor-view-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/vendors/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`vendor-view-tooltip-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {canEdit && (
            <Link
              className="me-50"
              id={`vendor-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/vendors/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`vendor-edit-tooltip-${row?._id || ""}`}
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
                id={`vendor-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`vendor-delete-tooltip-${row?._id || ""}`}
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

  const selectedCategory =
    categoryOptions.find((o) => o.value === categoryFilter) || null;

  return (
    <Fragment>
      <div className="main-content vendors">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Vendors")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-vendor"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Vendors")}
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
                                statusFilter === "ACTIVE" ? t("Active") : t("Inactive"),
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
              <Col
                sm="3"
                md="3"
                className="text-end d-flex justify-content-end align-items-start gap-1 flex-wrap"
              >
                {canAdd && (
                  <Button
                    color="outline-secondary"
                    className="text-nowrap"
                    onClick={() => setImportOpen(true)}
                  >
                    {t("Import")} <Upload size={14} />
                  </Button>
                )}
                {canAdd && (
                  <Button
                    color="primary"
                    className="text-nowrap"
                    onClick={() => navigate(`${appsRoot}/vendors/add`)}
                  >
                    <PlusCircle size={14} className="me-50" />{t("Add")}
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="vendor-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.vendorItems || []}
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

      <VendorImportModal
        isOpen={importOpen}
        toggle={() => setImportOpen((prev) => !prev)}
        onSuccess={() => handleVendorLists()}
      />
    </Fragment>
  );
};

export default VendorList;
