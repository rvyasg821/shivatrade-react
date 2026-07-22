// ** React Imports
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { deleteUom, getUomList, cleanUomMessage } from "./store";
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
import { Edit, Trash2, PlusCircle } from "react-feather";

import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import ImportExportButtons from "@src/views/_shared/import/ImportExportButtons";
import ImportModal from "./components/ImportModal";

// ** Constants
import {
  appsRoot,
  defaultPerPageRow,
  isAdminUser,
  uomModuleSlug,
} from "@constant/defaultValues";

const UomList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.uom);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleUomLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getUomList({
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
    handleUomLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleUomLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleUomLists(sort, sortColumn, 1, value, searchInput);
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleUomLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleUomLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanUomMessage(null));
    }
    if (store?.actionFlag === "UOM_DLT") {
      handleUomLists();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (row) => {
    const inUse = Number(row?.in_use_count || 0);
    mySwal
      .fire({
        title: t("Are you sure?"),
        // Say it up front rather than letting them hit a 400. The unit is loose
        // text on every product — deleting one that is in use would leave those
        // products showing a blank unit.
        text: inUse
          ? t(
              "{{count}} product(s) use this unit. The delete will be refused — set it Inactive instead to hide it from new documents.",
              { count: inUse }
            )
          : t("You won't be able to revert this!"),
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
        if (result.isConfirmed) dispatch(deleteUom(row?._id));
      });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.[uomModuleSlug];
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  const columns = [
    {
      name: t("Unit"),
      sortField: "code",
      sortable: true,
      selector: (row) => {
        if (canEdit) {
          return (
            <Link to={`${appsRoot}/uom/edit/${row?._id || ""}`} className="text-wrap">
              {row?.code || ""}
            </Link>
          );
        }
        return <span className="text-wrap">{row?.code || ""}</span>;
      },
    },
    {
      name: t("Name"),
      sortable: false,
      selector: (row) => <span className="text-wrap">{row?.name || "—"}</span>,
    },
    {
      name: t("GST UQC"),
      sortable: false,
      selector: (row) => (
        <span className="text-wrap text-uppercase">{row?.uqc_code || "—"}</span>
      ),
    },
    {
      name: t("Decimals"),
      sortable: false,
      selector: (row) => (
        // doc-badge, not color="light-info": the theme renders the light-*
        // variants with a dark background here, leaving dark text on dark.
        // The doc-badge classes force white text on a solid colour.
        <Badge
          className={`doc-badge ${
            row?.allow_decimal ? "doc-badge-green" : "doc-badge-gray"
          }`}
        >
          {row?.allow_decimal ? t("Allowed") : t("Whole numbers only")}
        </Badge>
      ),
    },
    {
      name: t("Used By"),
      sortable: false,
      selector: (row) => {
        const n = Number(row?.in_use_count || 0);
        return (
          <span className={n ? "text-wrap" : "text-muted"}>
            {n ? t("{{count}} product(s)", { count: n }) : t("Not used")}
          </span>
        );
      },
    },
    {
      name: t("Status"),
      sortable: false,
      selector: (row) => (
        <Badge
          className={`doc-badge ${
            row?.status === "ACTIVE" ? "doc-badge-green" : "doc-badge-orange"
          }`}
        >
          {row?.status === "ACTIVE" ? t("Active") : t("Inactive")}
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
              id={`uom-edit-tooltip-${row?._id || ""}`}
              to={`${appsRoot}/uom/edit/${row?._id || ""}`}
            >
              <UncontrolledTooltip
                placement="top"
                target={`uom-edit-tooltip-${row?._id || ""}`}
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
                id={`uom-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`uom-delete-tooltip-${row?._id || ""}`}
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
      <div className="main-content uom">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h3 className="mb-25">{t("Units of Measure")}</h3>
            <small className="text-muted">
              {t(
                "Used by every product and line item. The GST UQC code prints on GSTR-1 and the Shipping Bill."
              )}
            </small>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              {/* 7/5 (was 9/3): the toolbar now carries Export + Import + Add,
                  and 3 columns forced them to wrap. */}
              <Col sm="7" md="7">
                <Row>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-uom"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search Units")}
                      onChange={(e) => setSearchInput(e?.target?.value)}
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
                  <ImportExportButtons
                    exportUrl={API_ENDPOINTS.uom.export}
                    filenamePrefix="uom"
                    exportErrorMessage={t("Failed to export units")}
                    canImport={canAdd || canEdit}
                    onImportClick={() => setImportModalOpen(true)}
                  />
                  {canAdd && (
                    <Button
                      color="primary"
                      onClick={() => navigate(`${appsRoot}/uom/add`)}
                    >
                      <PlusCircle size={14} className="me-50" /> {t("Add")}
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="uom-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.uomItems || []}
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
        onSuccess={() => handleUomLists()}
      />
    </Fragment>
  );
};

export default UomList;
