// GRN (Goods Receipt Note) — list page. Mirrors the RFQ/leads listing:
// KPI tiles + server-side DataTable pagination + search/status + delete,
// plus a "New GRN" picker (closed Vendor POs without a GRN yet).
import { Fragment, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import {
  getGrnList,
  deleteGrn,
  cleanGrnMessage,
  getGrnSourcePovs,
  createGrnFromPov,
} from "./store";
import { startLoading, stopLoading } from "../loadingstore";

import {
  Col,
  Row,
  Card,
  Input,
  Badge,
  Button,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Spinner,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";

import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";
import VoucherStatsTiles from "@src/views/_shared/voucher-stats/VoucherStatsTiles";

import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { Eye, Trash2, PlusCircle } from "react-feather";
import { formatDate } from "@src/utility/dateFormat";

import { appsRoot, defaultPerPageRow } from "@constant/defaultValues";

const GRN_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLOR = {
  draft: "secondary",
  confirmed: "success",
  cancelled: "danger",
};

const GrnList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.grn);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingPovId, setCreatingPovId] = useState("");

  const handleGrnLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      status = statusFilter
    ) => {
      dispatch(
        getGrnList({
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
    handleGrnLists(sortDirection, column.sortField, 1, rowsPerPage, searchInput);
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setCurrentPage(page + 1);
    handleGrnLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleGrnLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => setSearchInput(value);

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleGrnLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
      }, 500);
    } else {
      handleGrnLists(sort, sortColumn, 1, rowsPerPage, searchInput, statusFilter);
    }
    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "GRN_DLTD" || store?.actionFlag === "GRN_CRTD") {
      handleGrnLists();
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanGrnMessage(null));
    }
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

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
        if (result.isConfirmed) dispatch(deleteGrn(id));
      });
  };

  const openPicker = () => {
    dispatch(getGrnSourcePovs());
    setPickerOpen(true);
  };

  const handleCreateFromPov = async (povId) => {
    setCreatingPovId(povId);
    const res = await dispatch(createGrnFromPov({ povId, data: {} }));
    setCreatingPovId("");
    const created = res?.payload?.grnItem;
    if (created?._id) {
      setPickerOpen(false);
      navigate(`${appsRoot}/grn/view/${created._id}`);
    }
  };

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" ||
    authUserItem?.role?.name === "Admin";
  const isCompanyAdmin = authUserItem?.role?.name === "Company Admin";
  // Reuse the po-vendors permission (purchase-side), like RFQ reuses leads.
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canAdd = isSystemAdmin || isCompanyAdmin || perms?.can_add;
  const canDelete = isSystemAdmin || isCompanyAdmin || perms?.can_delete;

  const columns = [
    {
      name: t("GRN No"),
      sortField: "voucher_no",
      sortable: true,
      grow: 2,
      selector: (row) => (
        <div className="py-1">
          <Link
            to={`${appsRoot}/grn/view/${row?._id || ""}`}
            style={{ textDecoration: "none" }}
          >
            <span
              className="fw-bold"
              ref={(el) => {
                if (el) el.style.setProperty("color", "#0d6efd", "important");
              }}
            >
              {row?.voucher_no || "-"}
            </span>
          </Link>
          {row?.po_vendor_voucher_no && (
            <div className="small text-muted">
              {t("VPO")}: {row.po_vendor_voucher_no}
            </div>
          )}
          {row?.purchase_order_voucher_no && (
            <div className="small text-muted">
              {t("SO")}: {row.purchase_order_voucher_no}
            </div>
          )}
        </div>
      ),
    },
    {
      name: t("Vendor"),
      sortable: false,
      selector: (row) => (
        <span className="text-capitalize">{row?.vendor_name || "-"}</span>
      ),
    },
    {
      name: t("Date"),
      sortField: "grn_date",
      sortable: true,
      selector: (row) => {
        if (!row?.grn_date) return <span className="text-muted">-</span>;
        return formatDate(row.grn_date);
      },
    },
    {
      name: t("Items"),
      center: true,
      selector: (row) => row?.line_count ?? 0,
    },
    {
      name: t("Status"),
      sortable: false,
      selector: (row) => (
        <Badge
          color={`light-${STATUS_COLOR[row?.status] || "secondary"}`}
          className="text-capitalize"
        >
          {row?.status || "-"}
        </Badge>
      ),
    },
    {
      name: t("Action"),
      center: true,
      cell: (row) => (
        <div className="d-flex column-action align-items-center table-icon">
          <Link
            className="me-50"
            id={`grn-view-tooltip-${row?._id || ""}`}
            to={`${appsRoot}/grn/view/${row?._id || ""}`}
          >
            <UncontrolledTooltip
              placement="top"
              target={`grn-view-tooltip-${row?._id || ""}`}
            >
              {t("View")}
            </UncontrolledTooltip>
            <Eye size={20} />
          </Link>
          {canDelete && (
            <>
              <Trash2
                size={20}
                className="cursor-pointer"
                id={`grn-delete-tooltip-${row?._id || ""}`}
                onClick={() => handleDelete(row?._id)}
              />
              <UncontrolledTooltip
                placement="top"
                target={`grn-delete-tooltip-${row?._id || ""}`}
              >
                {t("Delete")}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  const sourcePovs = store?.sourcePovs || [];

  return (
    <Fragment>
      <div className="main-content grn">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Goods Receipt Notes")}</h3>
        </div>

        <VoucherStatsTiles
          module="grn"
          filters={{
            status: statusFilter || undefined,
            search: searchInput || undefined,
          }}
          activeStatuses={statusFilter || ""}
          onStatusClick={(csv) => {
            setStatusFilter((prev) => (prev === csv ? "" : csv));
            setCurrentPage(1);
          }}
        />

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="9" md="9">
                <Row>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Input
                      type="text"
                      id="search-grn"
                      value={searchInput}
                      className="w-100 select"
                      placeholder={t("Search GRN / VPO / SO")}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </Col>
                  <Col sm="6" md="4" className="mb-2 mb-md-0">
                    <Select
                      value={
                        statusFilter && !statusFilter.includes(",")
                          ? GRN_STATUS_OPTIONS.find(
                              (s) => s.value === statusFilter
                            )
                          : null
                      }
                      onChange={(selected) =>
                        setStatusFilter(selected ? selected.value : "")
                      }
                      options={GRN_STATUS_OPTIONS}
                      isClearable
                      placeholder={
                        statusFilter && statusFilter.includes(",")
                          ? t("Multiple statuses (tile filter)")
                          : t("Filter by Status")
                      }
                      classNamePrefix="select"
                    />
                  </Col>
                </Row>
              </Col>
              <Col sm="3" md="3" className="text-end">
                {canAdd && (
                  <Button color="primary" onClick={openPicker}>
                    {t("New GRN")} <PlusCircle size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            <Row className="mt-2">
              <Col md="12" className="grn-tables">
                <DatatablePagination
                  columns={columns}
                  data={store?.grnItems || []}
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

      {/* New GRN picker — closed Vendor POs without a GRN yet. */}
      <Modal
        isOpen={pickerOpen}
        toggle={() => setPickerOpen((s) => !s)}
        size="lg"
        backdrop="static"
      >
        <ModalHeader toggle={() => setPickerOpen((s) => !s)}>
          {t("New GRN — pick a received Vendor PO")}
        </ModalHeader>
        <ModalBody>
          {sourcePovs.length === 0 ? (
            <div className="text-center text-muted py-3">
              {t(
                "No received Vendor POs awaiting a GRN. Receive a Vendor PO first."
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table bordered size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t("VPO No")}</th>
                    <th>{t("Vendor")}</th>
                    <th>{t("SO")}</th>
                    <th>{t("Arrival")}</th>
                    <th className="text-center">{t("Items")}</th>
                    <th className="text-center">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePovs.map((p) => (
                    <tr key={p._id}>
                      <td className="fw-bold">{p.voucher_no || "-"}</td>
                      <td className="text-capitalize">{p.vendor_name || "-"}</td>
                      <td>{p.purchase_order_voucher_no || "-"}</td>
                      <td>
                        {p.actual_arrival_date
                          ? formatDate(p.actual_arrival_date)
                          : "-"}
                      </td>
                      <td className="text-center">{p.line_count ?? 0}</td>
                      <td className="text-center">
                        <Button
                          color="primary"
                          size="sm"
                          disabled={!!creatingPovId}
                          onClick={() => handleCreateFromPov(p._id)}
                        >
                          {creatingPovId === p._id ? (
                            <Spinner size="sm" />
                          ) : (
                            t("Create GRN")
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </ModalBody>
      </Modal>
    </Fragment>
  );
};

export default GrnList;
