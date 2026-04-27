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
import { deleteLocation, getLocationList, cleanLocationMessage, getLocationCapacity } from "./store";
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
  Alert,
} from "reactstrap";
import Select from "react-select";
import SetupReturnBanner from '@src/components/SetupReturnBanner'

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle } from "react-feather";

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
} from "@constant/defaultValues";

const LocationList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.location);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  // Capacity from subscription
  const locationCapacity = store?.locationCapacity || null;

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  // status filter
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const handleLocationLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getLocationList({
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

    handleLocationLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleLocationLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleLocationLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  // ** Filters
  const handleStatusFilter = (value) => setStatusFilter(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleLocationLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleLocationLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    dispatch(getLocationCapacity());
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLocationMessage(null));
    }

    if (store?.actionFlag === "LOC_DLT") {
      handleLocationLists();
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
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteLocation(id));
        }
      });
  };

  // Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";

  const canAddLocation =
    isSystemAdmin || authUserItem?.role?.permissions?.location?.can_add;

  // Subscription capacity: System admins are unrestricted; company admins check capacity
  const canCreateBySubscription = isSystemAdmin || (locationCapacity?.canCreateMore !== false);

  const canEditLocationGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.location?.can_update;

  const canDeleteLocationGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.location?.can_delete;

  // Columns
  const columns = [
    {
      name: t("Location Name"),
      sortField: "location_name",
      sortable: true,
      selector: (row) => (
        <div className="d-flex align-items-center gap-50 flex-wrap">
          {canEditLocationGlobal ? (
            <Link
              to={`${appsRoot}/locations/edit/${row?._id || ""}`}
              className="text-capitalize text-wrap"
            >
              {row?.location_name || ""}
            </Link>
          ) : (
            <span className="text-wrap">{row?.location_name || ""}</span>
          )}
          {row?.is_default && (
            <Badge
              className="rounded-pill"
              style={{ backgroundColor: "rgba(40, 199, 111, 0.12)", color: "#28c76f" }}
            >
              {t("Default")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      name: t("Location Code"),
      sortField: "location_code",
      sortable: true,
      selector: (row) => <span className="text-wrap text-uppercase">{row?.location_code || ""}</span>,
    },
    {
      name: t("Contact Person"),
      sortField: "contact_name",
      sortable: true,
      selector: (row) => (
        <span className="text-wrap text-capitalize">
          {row?.contact_name || ""}
        </span>
      ),
    },
    {
      name: t("Email"),
      sortField: "email",
      sortable: true,
      selector: (row) => <span className="text-wrap">{row?.email || ""}</span>,
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

  // Add Action column only if allowed
  if (canEditLocationGlobal || canDeleteLocationGlobal) {
    columns.push({
      name: t("Action"),
      center: true,
      cell: (row) => {
        const canEditLocation =
          isSystemAdmin || authUserItem?.role?.permissions?.location?.can_update;

        const canDeleteLocation =
          isSystemAdmin || authUserItem?.role?.permissions?.location?.can_delete;

        return (
          <div className="d-flex column-action align-items-center table-icon">
            {canEditLocation && (
              <Link
                className="me-50"
                id={`location-edit-tooltip-${row?._id || ""}`}
                to={`${appsRoot}/locations/edit/${row?._id || ""}`}
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`location-edit-tooltip-${row?._id || ""}`}
                >
                  {t("Edit")}
                </UncontrolledTooltip>
                <Edit size={20} />
              </Link>
            )}

            {canDeleteLocation && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`location-delete-tooltip-${row?._id || ""}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`location-delete-tooltip-${row?._id || ""}`}
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

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <SetupReturnBanner />
      <div className="main-content locations">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Locations")}</h3>
          {/* Subscription capacity badge for company admins */}
          {!isSystemAdmin && locationCapacity && (
            <Badge
              color={locationCapacity.remaining === 0 ? "light-danger" : "light-primary"}
              className="fs-6 px-2 py-1 d-none"
            >
              {t("Locations")}: {locationCapacity.current} / {locationCapacity.allowed}
              {locationCapacity.remaining > 0
                ? ` (${locationCapacity.remaining} ${t("remaining")})`
                : ` – ${t("Limit reached")}`}
            </Badge>
          )}
        </div>

        {/* No active subscription warning */}
        {!isSystemAdmin && locationCapacity && !locationCapacity.hasActiveSubscription && (
          <Alert color="warning" className="mb-2">
            {t("No active subscription found. Please purchase a subscription to manage locations.")}
          </Alert>
        )}

        {/* Limit reached warning */}
        {!isSystemAdmin && locationCapacity && locationCapacity.hasActiveSubscription && locationCapacity.remaining === 0 && (
          <Alert color="danger" className="mb-2">
            {t("You have reached your location limit")} ({locationCapacity.allowed} {t("location(s)")}). {t("Please upgrade your subscription to add more locations.")}
          </Alert>
        )}

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="8" md="9">
                <Row>
                  <Col sm="6" md="4">
                    <div className="d-flex align-items-center mb-sm-0 mb-1">
                      <Input
                        type="text"
                        id="search-location"
                        value={searchInput}
                        className="w-100 select"
                        placeholder={t("Search Locations")}
                        onChange={(event) => handleSearch(event?.target?.value)}
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
                                  ? t("ACTIVE")
                                  : t("INACTIVE"),
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
              <Col sm="4" md="3" className="text-end">
                {canAddLocation && (
                  <span id="add-location-btn-wrapper">
                    <Button
                      color="primary"
                      disabled={!canCreateBySubscription}
                      onClick={() => {
                        if (canCreateBySubscription) {
                          navigate(`${appsRoot}/locations/add`);
                        }
                      }}
                    >
                      {t("Add Location")} <PlusCircle size={16} />
                    </Button>
                    {!canCreateBySubscription && (
                      <UncontrolledTooltip target="add-location-btn-wrapper">
                        {locationCapacity?.hasActiveSubscription
                          ? t("Location limit reached. Upgrade your subscription to add more.")
                          : t("No active subscription. Please purchase a plan.")}
                      </UncontrolledTooltip>
                    )}
                  </span>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="location-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.locationItems || []}
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

export default LocationList;
