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
import { deleteState, getStateList, cleanStateMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";
// ** Reactstrap Imports
import { Col, Badge, Row, Card, Input, Button, CardBody, UncontrolledTooltip } from "reactstrap";

// ** Utils
import { getModulePermissionData } from "@utils";

// ** Custom Components
import Notification from "@components/toast/notification";
import SimpleSpinner from "@components/spinner/Simple-spinner";
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
  statesModuleSlug,
  defaultPerPageRow,
} from "@constant/defaultValues";

const StateList = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.states);
  const authStore = useSelector((state) => state.auth);

  // ** Const
  const authUserItem = authStore?.userItem || null;
  const permission = getModulePermissionData(
    authUserItem?.role,
    statesModuleSlug
  );

  /* Pagination */
  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");

  const handleStateLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput
    ) => {
      let sortFld = "";
      if (sortCol) {
        sortFld = `${sortCol}:${sorting === "desc" ? -1 : 1}`;
      }

      dispatch(
        getStateList({
          sort: sortFld,
          page,
          limit: perPage,
          search,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleStateLists(
      sortDirection,
      column.sortField,
      1,
      rowsPerPage,
      searchInput
    );
  };

  const handlePagination = (page) => {
    // Smooth scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page + 1);
    handleStateLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleStateLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleStateLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleStateLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }

    return () => {
      clearTimeout(handler)
    }
  }, [searchInput])

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // handleStateLists();
  }, []);

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanStateMessage(null));
    }

    if (store?.actionFlag === "STT_DELETED") {
      handleStateLists();
    }

    /* Success toast notification */
    if (store?.success) {
      Notification("Success", store.success, "success");
    }

    /* Error toast notification */
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
          dispatch(deleteState(id));
        }
      });
  };

  const columns = [
    {
      name: t("Name"),
      sortField: "name",
      sortable: true,
      selector: (row) => {
        return permission?.can_update ? (
          <Link
            id={`pw-edit-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/states/edit/${row?._id || ""}`}
            className="text-capitalize text-wrap"
          >
            {row?.name || ""}
          </Link>
        ) : (
          <span className="text-capitalize text-wrap">{row?.name || ""}</span>
        );
      },
    },
    {
      name: t("Country"),
      sortField: "country_id",
      sortable: true,
      selector: (row) => (
        <span className="text-capitalize text-wrap">
          {row?.country_id?.name || ""}
        </span>
      ),
    },
    {
      name: t("County / State Code"),
      sortField: "state_code",
      sortable: true,
      selector: (row) => (
        <span className="text-capitalize text-center">
          {row?.state_code || ""}
        </span>
      ),
    },
    {
      name: t("Status"),
      sortField: "status",
      sortable: false,
      selector: (row) => (
        <Badge color={row.status ? "light-success" : "light-danger"}>
          {row.status ? t("Active") : t("Inactive")}
        </Badge>
      ),
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          {permission?.can_update ? (
            <Link
              className="me-50"
              id={`state-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/states/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`state-edit-tooltip-${row?._id || ""}`}
              >
                {t("Edit")}
              </UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          ) : null}

          {permission?.can_delete ? (
            <>
            <Trash2
              size={20}
              className="cursor-pointer"
              id={`pw-delete-tooltip-${row?._id || ""}`}
              onClick={() => handleDelete(row?._id)}
            />
            <UncontrolledTooltip
                placement="top"
                target={`pw-delete-tooltip-${row?._id || ""}`}
            >
                Delete
            </UncontrolledTooltip>      
            </>
            ) : null}
        </div>
      ),
    },
  ];
  useEffect(() => {
    if (!store?.loading) {
      // document.body.classList.add("loader-body");
      dispatch(startLoading())
    } else {
      // document.body.classList.remove("loader-body");
      dispatch(stopLoading())
    }
  }), [store?.loading]
  return (
    <Fragment>
      {/* {!store?.loading ? <SimpleSpinner /> : null} */}

      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Counties / States")}</h3>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="4">
                <div className="d-flex align-items-center mb-sm-0 mb-1">
                  <Input
                    type="text"
                    id="search-states"
                    value={searchInput}
                    className="w-100 select"
                    placeholder={t("Search Counties / States")}
                    onChange={(event) => handleSearch(event?.target?.value)}
                  />
                </div>
              </Col>

              <Col sm="8" className="text-right">
                {permission?.can_create ? (
                  <Button
                    color="primary"
                    className="ms-2 float-end"
                    onClick={() => navigate(`${appsRoot}/states/add`)}
                  >
                    {t("Add County / State")} <PlusCircle size={16} />
                  </Button>
                ) : null}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="state-table five-row-table">
                <DatatablePagination
                  columns={columns}
                  data={store?.stateItems || []}
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

export default StateList;
