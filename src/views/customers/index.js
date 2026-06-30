// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deleteCustomer, getCustomerList, cleanCustomerMessage } from "./store";
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
import { Edit, Eye, Trash2, PlusCircle, Mail, Phone } from "react-feather";

// ** Constants
import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const CustomerList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.customer);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const handleCustomerLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getCustomerList({
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
    handleCustomerLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleCustomerLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleCustomerLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleCustomerLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleCustomerLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanCustomerMessage(null));
    }
    if (store?.actionFlag === "CUST_DLT") {
      handleCustomerLists();
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
        if (result.isConfirmed) dispatch(deleteCustomer(id));
      });
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  const perms = authUserItem?.role?.permissions?.customers;
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canEdit = isSystemAdmin || isCompanyAdmin || perms?.can_update;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const columns = [
    {
      name: t("Company"),
      sortField: "company_name",
      sortable: true,
      grow: 2,
      selector: (row) => {
        const nameNode = (
          <span
            className="fw-bold text-capitalize text-break"
            style={{ overflowWrap: "anywhere" }}
            ref={(el) => {
              if (el && canEdit)
                el.style.setProperty("color", "#0d6efd", "important");
            }}
          >
            {row?.company_name || "-"}
          </span>
        );
        return (
          <div className="py-1" style={{ minWidth: 0 }}>
            <Link
              to={`${appsRoot}/customers/view/${row?._id || ""}`}
              style={{ textDecoration: "none" }}
            >
              {nameNode}
            </Link>
            {row?.primary_contact_name && (
              <div
                className="text-capitalize small text-break"
                style={{ overflowWrap: "anywhere" }}
              >
                {row.primary_contact_name}
              </div>
            )}
          </div>
        );
      },
    },
    {
      name: t("Contact"),
      sortable: false,
      grow: 2,
      selector: (row) => {
        const phone =
          row?.primary_contact_country_code?.formatted ||
          (row?.primary_contact_country_code?.dial_code &&
          row?.primary_contact_phone
            ? `${row.primary_contact_country_code.dial_code} ${row.primary_contact_phone}`
            : row?.primary_contact_phone) ||
          "";
        if (!row?.primary_contact_email && !phone) {
          return <span className="text-muted">-</span>;
        }
        return (
          <div className="py-75" style={{ minWidth: 0 }}>
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
      name: t("Country"),
      hide: "md", // hidden on small screens (≤ md ≈ 959px)
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-capitalize">{row?.country || "-"}</span>
      ),
    },
    {
      name: t("Status"),
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
          <Link
            className="me-50"
            id={`customer-view-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/customers/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`customer-view-tooltip-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {canEdit && (
            <Link
              className="me-50"
              id={`customer-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/customers/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`customer-edit-tooltip-${row?._id || ""}`}
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
                id={`customer-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`customer-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content customers">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Customers")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-customer"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Customers")}
                      onChange={(e) => handleSearch(e?.target?.value)}
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
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button
                    color="primary"
                    onClick={() => navigate(`${appsRoot}/customers/add`)}
                  >
                    {t("Add Customer")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="customer-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.customerItems || []}
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

export default CustomerList;
