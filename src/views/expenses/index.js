import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { deleteExpense, deleteManyExpenses, getExpenseList, cleanExpenseMessage } from "./store";
import { startLoading, stopLoading } from "../loadingstore";
import {
  Col, Badge, Row, Card, Input, Button, CardBody, UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Trash2, PlusCircle, Upload, Download } from "react-feather";
import { appsRoot, defaultPerPageRow, isAdminUser } from "@constant/defaultValues";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import useBulkDelete from "@src/utility/hooks/useBulkDelete";
import ImportModal from "./components/ImportModal";

const TYPE_LABEL = { percent: "Percent", fixed: "Fixed" };

const ExpenseList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);
  const dispatch = useDispatch();
  const store = useSelector((state) => state.expense);
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

  const handleLists = useCallback(
    (sorting = sort, sortCol = sortColumn, page = currentPage, perPage = rowsPerPage, search = searchInput, status = statusFilter) => {
      dispatch(getExpenseList({ orderBy: sortCol, orderDirection: sorting, page, perPage, search, status }));
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, statusFilter, dispatch]
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection); setSortColumn(column.sortField); setCurrentPage(1);
    handleLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };
  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };
  const handlePerPage = (value) => {
    setRowsPerPage(value); setCurrentPage(1);
    handleLists(sort, sortColumn, 1, value, searchInput);
  };
  const handleSearch = (value) => setSearchInput(value);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await instance.get(API_ENDPOINTS.expenses.export, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Failed to export expenses"), "warning");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanExpenseMessage(null));
    }
    if (store?.actionFlag === "EXP_DLT") handleLists();
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = "") => {
    mySwal.fire({
      title: t("Are you sure?"),
      text: t("You won't be able to revert this!"),
      icon: "warning", showCancelButton: true,
      confirmButtonText: t("Yes, delete it!"),
      customClass: { confirmButton: "btn btn-primary", cancelButton: "btn btn-outline-danger ms-1" },
      buttonsStyling: false,
    }).then((result) => { if (result.isConfirmed) dispatch(deleteExpense(id)); });
  };

  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.expenses;
  const canAdd = isAdmin || perms?.can_add;
  const canEdit = isAdmin || perms?.can_update;
  const canDelete = isAdmin || perms?.can_delete;

  // Multi-select bulk delete (server respects the module's delete guard).
  const bulk = useBulkDelete({
    entityLabel: "expenses",
    deleteFn: (ids) => dispatch(deleteManyExpenses(ids)).unwrap(),
    onDone: () => handleLists(),
  });

  const columns = [
    {
      name: t("Name"), sortField: "name", sortable: true,
      selector: (row) => canEdit ? (
        <Link to={`${appsRoot}/expenses/edit/${row?._id || ""}`} className="text-capitalize text-wrap">
          {row?.name || ""}
        </Link>
      ) : <span className="text-wrap text-capitalize">{row?.name || ""}</span>,
    },
    { name: t("Code"), hide: "md", selector: (row) => row?.code || "-" },
    { name: t("HSN Code"), hide: "md", selector: (row) => row?.hsn_code || "-" },
    { name: t("Type"), hide: "md", selector: (row) => TYPE_LABEL[row?.type] || row?.type || "-" },
    {
      name: t("Value"),
      selector: (row) => {
        if (row?.value === null || row?.value === undefined || row?.value === "")
          return "-";
        return row?.type === "percent" ? `${row.value}%` : row.value;
      },
    },
    {
      name: t("Status"),
      selector: (row) => (
        <Badge color={row?.is_active ? "light-success" : "light-warning"}>
          {row?.is_active ? t("Active") : t("Inactive")}
        </Badge>
      ),
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
      name: t("Action"), center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          {canEdit && (
            <Link className="me-50" id={`exp-edit-${row?._id}`} to={`${appsRoot}/expenses/edit/${row?._id}`}>
              <UncontrolledTooltip placement="top" target={`exp-edit-${row?._id}`}>{t("Edit")}</UncontrolledTooltip>
              <Edit size={20} />
            </Link>
          )}
          {canDelete && (
            <>
              <Trash2 size={20} className="cursor-pointer" id={`exp-del-${row?._id}`} onClick={() => handleDelete(row?._id)} />
              <UncontrolledTooltip placement="top" target={`exp-del-${row?._id}`}>{t("Delete")}</UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    });
  }

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading()); else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content expenses">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Expenses")}</h3>
        </div>
        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="7" md="7">
                <Row>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Input type="text" value={searchInput} className="w-100 select"
                      placeholder={t("Search Expenses")} onChange={(e) => handleSearch(e?.target?.value)} />
                  </Col>
                  <Col sm="6" md="6" className="mb-2 mb-md-0">
                    <Select
                      value={statusFilter ? { value: statusFilter, label: statusFilter === "ACTIVE" ? t("Active") : t("Inactive") } : null}
                      onChange={(s) => setStatusFilter(s ? s.value : "")}
                      options={[{ value: "ACTIVE", label: t("Active") }, { value: "INACTIVE", label: t("Inactive") }]}
                      isClearable placeholder={t("Select Status")} classNamePrefix="select"
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
                  <Button color="outline-secondary" size="sm" className="text-nowrap" onClick={handleExport} disabled={exporting}>
                    {t("Export")} <Download size={14} />
                  </Button>
                  {canAdd && (
                    <Button color="outline-secondary" size="sm" className="text-nowrap" onClick={() => setImportModalOpen(true)}>
                      {t("Import")} <Upload size={14} />
                    </Button>
                  )}
                  {canAdd && (
                    <Button color="primary" className="text-nowrap" onClick={() => navigate(`${appsRoot}/expenses/add`)}>
                      <PlusCircle size={14} className="me-50" />{t("Add")}
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col md="12" className="expense-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.expenseItems || []}
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
        onSuccess={() => handleLists()}
      />
    </Fragment>
  );
};

export default ExpenseList;
