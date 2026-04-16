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
import { deletePlan, getPlanList, cleanPlanMessage } from "./store";
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

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ** Icons Import
import { Edit, Trash2, PlusCircle } from "react-feather";
import Select from "react-select";

// ** Constant
import {
    appsRoot,
    defaultPerPageRow,
    ENUM_PLAN_STATUS,
    ENUM_PLAN_STATUS_COLOR,
    ENUM_DURATION_TYPE,
} from "@constant/defaultValues";

// ** Currency Context
import { useCurrency } from "@src/utility/context/CurrencyContext";


const PlanList = () => {
    // ** Hooks
    const { t } = useTranslation();
    const navigate = useNavigate();
    const mySwal = withReactContent(Swal);
    const { getCurrencySymbol } = useCurrency();

    // ** Store vars
    const dispatch = useDispatch();
    const store = useSelector((state) => state.plan);
    const authStore = useSelector((state) => state.auth);
    const authUserItem = authStore?.authUserItem || null;

    /* Pagination */
    const [sort, setSort] = useState("desc");
    const [sortColumn, setSortColumn] = useState("_id");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("");


    const handlePlanLists = useCallback(
        (
            sorting = sort,
            sortCol = sortColumn,
            page = currentPage,
            perPage = rowsPerPage,
            search = searchInput,
            status = statusFilter
        ) => {
            dispatch(
                getPlanList({
                    orderBy: sortCol,
                    orderDirection: sorting,
                    page,
                    perPage,
                    search,
                    status, // ✅ added
                })
            );
        },
        [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
    );


    const handleSort = (column, sortDirection) => {
        setSort(sortDirection);
        setSortColumn(column.sortField);
        setCurrentPage(1);

        handlePlanLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput, statusFilter);
    };

    const handlePagination = (page) => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setCurrentPage(page + 1);
        handlePlanLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
    };

    const handlePerPage = (value) => {
        setRowsPerPage(value);
        setCurrentPage(1);
        handlePlanLists(sort, sortColumn, 1, value, searchInput);
    };

    const handleSearch = (value) => {
        setSearchInput(value);
    };

    useEffect(() => {
        let handler;
        if (searchInput) {
            handler = setTimeout(() => {
                setCurrentPage(1);
                handlePlanLists(sort, sortColumn, 1, rowsPerPage, searchInput);
            }, 500);
        } else {
            handlePlanLists(sort, sortColumn, 1, rowsPerPage, searchInput);
        }

        return () => {
            clearTimeout(handler);
        };
    }, [searchInput, statusFilter]);

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (store?.actionFlag || store?.success || store?.error) {
            dispatch(cleanPlanMessage(null));
        }

        if (store?.actionFlag === "PLAN_DLT") {
            handlePlanLists();
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
                    dispatch(deletePlan(id));
                }
            });
    };

    const canAddPlan = authUserItem?.role?.permissions?.plans?.can_add;
    const canEditPlan = authUserItem?.role?.permissions?.plans?.can_update;
    const canDeletePlan = authUserItem?.role?.permissions?.plans?.can_delete;

    // ✅ Columns
    const columns = [
        {
            name: t("Name"),
            sortField: "name",
            sortable: true,
            selector: (row) => (
                <span
                    onClick={() => navigate(`${appsRoot}/plans/edit/${row?._id || ""}`)}
                    className="text-capitalize text-wrap cursor-pointer text-primary"
                >
                    {row?.name || ""}
                </span>
            ),
        },
        {
            name: t("Type"),
            sortField: "duration_type",
            sortable: true,
            selector: (row) => (
                <span className="text-wrap">
                    {(() => {
                        const text = t(ENUM_DURATION_TYPE?.[row?.duration_type]) || row?.duration_type || "";
                        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                    })()}
                </span>

            ),
        },
        {
            name: t("Duration"),
            sortField: "duration",
            sortable: true,
            selector: (row) => (
                <span className="text-wrap">
                    {row?.duration || 0}
                </span>
            ),
        },
        {
            name: t("Pricing"),
            sortField: "location_pricing",
            sortable: false,
            selector: (row) => {
                const locationPricing = row?.location_pricing;
                if (locationPricing && locationPricing.length > 0) {
                    return (
                        <div className="text-wrap">
                            {locationPricing.map((tier, index) => {
                                const displayPrice = tier.special_price || tier.price || 0;
                                const hasSpecial = tier.special_price && tier.special_price > 0;
                                return (
                                    <div key={index} className="mb-25">
                                        <small>
                                            {tier.locations} {t("loc")}: {getCurrencySymbol()}{displayPrice}
                                            {hasSpecial && (
                                                <span className="text-muted ms-50" style={{textDecoration: 'line-through'}}>
                                                    {getCurrencySymbol()}{tier.price}
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
                // Fallback to platform_price for backward compatibility
                return <span className="text-wrap">{getCurrencySymbol()}{row?.platform_price || 0}</span>;
            },
        },

        {
            name: t("Recurring"),
            sortField: "recurring",
            sortable: false,
            selector: (row) => (
                <Badge color={row?.recurring ? "light-success" : "light-secondary"}>
                    {t(row?.recurring ? "Yes" : "No")}
                </Badge>
            ),
        },

        {
            name: t("Status"),
            sortField: "status",
            sortable: false,
            selector: (row) => (
                <Badge color={ENUM_PLAN_STATUS_COLOR?.[row?.status]}>
                    {t(ENUM_PLAN_STATUS?.[row?.status]) || ""}
                </Badge>
            ),
        },
    ];

    // ✅ Add Action column only if allowed
    if (canEditPlan || canDeletePlan) {
        columns.push({
            name: t("Action"),
            center: true,
            cell: (row) => {
                return (
                    <div className="d-flex column-action align-items-center table-icon">
                        {canEditPlan ? (
                            <span
                                className="me-50 cursor-pointer"
                                id={`plan-edit-tooltip-${row?._id || ""}`}
                                onClick={() => navigate(`${appsRoot}/plans/edit/${row?._id || ""}`)}
                            >
                                <UncontrolledTooltip
                                    placement="top"
                                    target={`plan-edit-tooltip-${row?._id || ""}`}
                                >
                                    {t("Edit")}
                                </UncontrolledTooltip>
                                <Edit size={20} />
                            </span>
                        ): null}

                        {canDeletePlan && !row?.isDefault ? (<>
                            <Trash2
                                size={20}
                                className="cursor-pointer"
                                id={`plan-delete-tooltip-${row?._id || ""}`}
                                onClick={() => handleDelete(row?._id)}
                            />
                            <UncontrolledTooltip
                                placement="top"
                                target={`plan-delete-tooltip-${row?._id || ""}`}
                            >
                                {t("Delete")}
                            </UncontrolledTooltip>
                        </>): null}
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
    const handleStatusFilter = (value) => setStatusFilter(value);

    return (
        <Fragment>
            <div className="main-content">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h3 className="mb-0">{t("Plans")}</h3>
                </div>

                <Card className="overflow-hidden">
                    <CardBody>
                        <Row>
                            <Col sm="8" md="9">
                                <Row>
                                    <Col sm="6" md="4">
                                        <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                                            <Input
                                                type="text"
                                                id="search-plan"
                                                value={searchInput}
                                                className="w-100 select"
                                                placeholder={t("Search Plans")}
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
                                                                : t("INACTIVE")
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
                                {canAddPlan && (
                                    <Button
                                        color="primary"
                                        onClick={() => navigate(`${appsRoot}/plans/add`)}
                                    >
                                        {t("Add Plan")} <PlusCircle size={16} />
                                    </Button>
                                )}
                            </Col>
                        </Row>

                        <Row className="mt-2">
                            <Col md="12" className="main-servicetable">
                                <DatatablePagination
                                    columns={columns}
                                    data={store?.planItems || []}
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

export default PlanList;