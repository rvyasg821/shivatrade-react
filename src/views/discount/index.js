// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { deleteDiscount, deleteManyDiscounts, getDiscountList } from "@src/views/subscription/store/";
import { startLoading, stopLoading } from "../loadingstore";

// ** Reactstrap Imports
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
import { momentFormatDate } from "@src/utility/Utils";
// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";


// ** Icons Import
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Constant
import {
  appsRoot, defaultPerPageRow, ENUM_PLAN_STATUS, ENUM_PLAN_STATUS_COLOR
} from "@constant/defaultValues";

// Duration type labels
const getDurationLabel = (discount) => {
  if (!discount?.duration_type) return 'Forever';
  switch (discount.duration_type) {
    case 'forever':
      return 'Forever';
    case 'first_payment':
      return 'First Payment Only';
    case 'limited_months':
      return `${discount.duration_months || 0} Month(s)`;
    default:
      return 'Forever';
  }
};

// Location rules label
const getLocationRulesLabel = (discount) => {
  if (!discount?.location_rules || discount.location_rules.length === 0) {
    return 'Any';
  }
  return discount.location_rules.map(rule => {
    switch (rule.type) {
      case 'any':
        return 'Any';
      case 'exact':
        return `Exactly ${rule.value}`;
      case 'minimum':
        return `Min ${rule.value}`;
      case 'maximum':
        return `Max ${rule.value}`;
      case 'range':
        return `${rule.min}-${rule.max}`;
      default:
        return '';
    }
  }).join(' OR ');
};

const DiscountList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const location = useLocation();

  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);
  const subscriptionStore = useSelector((state) => state.subscription)
  const authStore = useSelector((state) => state.auth);

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  /* Multi-select */
  const [selectedRows, setSelectedRows] = useState([]);
  const [toggleCleared, setToggleCleared] = useState(false);

  // Fetch list
  const handleDiscountList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getDiscountList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
          status
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
  );

  // sorting 
  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);
    handleDiscountList(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  // pagination
  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleDiscountList(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleDiscountList(sort, sortColumn, 1, value, searchInput);
  };

  // search
  const handleSearch = (value) => {
    setSearchInput(value);
  };
  const handleStatusFilter = (value) => setStatusFilter(value);


  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleDiscountList(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleDiscountList(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (subscriptionStore?.actionFlag === "DIS_DLT") {
      handleDiscountList();
    }

    if (subscriptionStore?.success) {
      Notification("Success", subscriptionStore.success, "success");
    }

    if (subscriptionStore?.error) {
      Notification("Error", subscriptionStore.error, "warning");
    }
  }, [subscriptionStore.actionFlag, subscriptionStore.success, subscriptionStore.error]);

  // delete
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
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteDiscount(id));
        }
      });
  };

  // Multi-select handler
  const handleRowSelected = useCallback((state) => {
    setSelectedRows(state.selectedRows || []);
  }, []);

  // Bulk delete
  const handleBulkDelete = () => {
    if (!selectedRows.length) return;
    const count = selectedRows.length;

    mySwal
      .fire({
        title: t("Delete Selected Discounts?"),
        html: `<p>${t("You are about to delete")} <strong>${count}</strong> ${t("discount(s)")}. ${t("This action cannot be undone")}.</p>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, delete them"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
        focusCancel: true,
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            const ids = selectedRows.map((row) => row._id);
            await dispatch(deleteManyDiscounts(ids)).unwrap();
            setToggleCleared((prev) => !prev);
            setSelectedRows([]);
            handleDiscountList();
          } catch (error) {
            Notification("Error", error?.error || t("Bulk delete failed"), "warning");
          }
        }
      });
  };

  // loading
  useEffect(() => {
    if (subscriptionStore?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [subscriptionStore?.loading]);



  // Columns (DISCOUNT FIELDS)
  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      width: "250px",
      grow: 2,
      selector: (row) => (<>
        {canEditDiscount ? (
          <Link
            to={`${appsRoot}/discounts/edit/${row?._id || ""}`}
            className="text-capitalize text-wrap"
          >
            {row?.name || ""}
          </Link>
        ) : (
          <span className="text-wrap">{row?.name || ""}</span>
        )}
      </>),
    },

    {
      name: t("Code"),
      hide: "md",
      sortField: "discount_code",
      sortable: true,
      width: "150px",
      grow: 0,
      selector: (row) => <span>{row?.discount_code || "-"}</span>,
    },
    {
      name: t("Rules"),
      hide: "md",
      sortField: "discount_value",
      sortable: true,
      minWidth: "300px",
      grow: 2,
      selector: (row) => (
        <span>
          {t("Discount")}: {row?.discount_type === "percentage" ? `${row?.discount_value}%` : row?.discount_value}<br/>
          {t("Duration")}: {getDurationLabel(row)} <br/>
          {t("Location")}: {getLocationRulesLabel(row)}
        </span>
      ),
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      width: "120px",
      grow: 0,
      selector: (row) => (
        <Badge color={ENUM_PLAN_STATUS_COLOR?.[row?.status]}>
          {t(ENUM_PLAN_STATUS?.[row?.status]) || ""}
        </Badge>
      ),
    }

  ];

  const canEditDiscount = authStore?.authUserItem?.role?.permissions?.discount?.can_update;
  const canDeleteDiscount = authStore?.authUserItem?.role?.permissions?.discount?.can_delete;
  const canAdd=authStore?.authUserItem?.role?.permissions?.discount?.can_add;

  // Action column
  if (canEditDiscount || canDeleteDiscount) {
  columns.push({
    name: t("Action"),
    center: true,
    cell: (row) => {
      return (
        <div className="d-flex column-action align-items-center">
          
          {/* EDIT */}
          {canEditDiscount && (
            <Link
              id={`discount-edit-tooltip-${row?._id}`}
              className="me-50"
              to={`${appsRoot}/discounts/edit/${row?._id || ""}`}
            >
              <Edit size={20} className="text-primary cursor-pointer" />
              <UncontrolledTooltip
                placement="top"
                target={`discount-edit-tooltip-${row?._id}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
            </Link>
          )}

          {/* DELETE */}
          {canDeleteDiscount && (
            <>
              <Trash2
                  size={20}
                  className="cursor-pointer me-50"
                  id={`user-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`user-delete-tooltip-${row?._id || ""}`}
                >
                  {t("Delete")}
                </UncontrolledTooltip>
            </>
          )}
        </div>
      );
    },
  });
}

  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Discounts")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row >
              <Col sm="5" md="5">
                <Row>
                  <Col sm="6" md="6">
                    <Input
                      type="text"
                      id="search-discount"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Discounts")}
                      onChange={(event) => handleSearch(event?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter
                          ? {
                            value: statusFilter,
                            label: statusFilter === "ACTIVE" ? t("Active") : t("Inactive")
                          }
                          : null
                      }
                      onChange={(selected) =>
                        handleStatusFilter(selected ? selected.value : "")
                      }
                      options={[
                        { value: "ACTIVE", label: t("Active") },
                        { value: "INACTIVE", label: t("Inactive") }
                      ]}
                      isClearable
                      placeholder={t("Select Status")}
                      classNamePrefix="select"
                    />

                  </Col>
                </Row>
              </Col>

              <Col sm="7" md="7" className="text-end d-flex gap-2 justify-content-end align-items-start flex-wrap">
                {canDeleteDiscount && selectedRows.length > 0 && (
                  <Button color="danger" outline onClick={handleBulkDelete}>
                    {t("Delete Selected")} ({selectedRows.length})
                  </Button>
                )}
                {canAdd && (
                  <>
                    <Button
                      color="info"
                      outline
                      onClick={() => navigate(`${appsRoot}/discounts/bulk-generate`)}
                    >
                      {t("Bulk Generate")}
                    </Button>
                    <Button
                      color="primary"
                      onClick={() => navigate(`${appsRoot}/discounts/add`)}
                    >
                      {t("Add Discount")} <PlusCircle size={16} />
                    </Button>
                  </>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="user-table five-row-table">
                <DatatablePagination
                  columns={columns}
                  data={subscriptionStore?.discountItems || []}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  pagination={subscriptionStore?.pagination}
                  handleSort={handleSort}
                  handleRowPerPage={handlePerPage}
                  handlePagination={handlePagination}
                  selectableRows={!!canDeleteDiscount}
                  onSelectedRowsChange={handleRowSelected}
                  clearSelectedRows={toggleCleared}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default DiscountList;
