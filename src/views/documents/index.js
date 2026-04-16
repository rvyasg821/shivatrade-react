// ** React Imports
import { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getDocumentList,
  deleteDocument,
  approveDocument,
  rejectDocument,
  getDocumentCategoryList,
  cleanDocumentMessage,
} from "./store";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  Badge,
  UncontrolledTooltip,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import Select from "react-select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Edit, Trash2, PlusCircle, Download, Eye, CheckCircle, XCircle } from "react-feather";

// ** Constant
import { appsRoot, defaultPerPageRow, storageTokenKeyName, hostRestApiUrl, hostRestApiPrefix } from "@constant/defaultValues";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import instance from "@src/utility/AxiosConfig";

const statusBadgeClass = {
  active: "doc-badge-green",
  archived: "doc-badge-gray",
  expired: "doc-badge-red",
  pending_review: "doc-badge-orange",
};

const approvalBadgeClass = {
  pending: "doc-badge-orange",
  approved: "doc-badge-green",
  rejected: "doc-badge-red",
};

const DocumentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  const dispatch = useDispatch();
  const store = useSelector((state) => state.document);
  const locationCtx = useSelector((state) => state.locationContext);
  const { selectedLocationId } = locationCtx || {};
  const authStore = useSelector((state) => state.auth);
  const modulePerms = authStore?.authUserItem?.role?.permissions?.["document"] || {};
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add);
  const roleName = authStore?.authUserItem?.role?.name;
  const isEmployee = roleName === "Employee";
  const isLocationAdmin = roleName === "Location Admin";
  const authUserLocationId = authStore?.authUserItem?.location_id;

  const [sort, setSort] = useState("desc");
  const [sortColumn, setSortColumn] = useState("_id");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const categoryItems = store?.categoryItems || [];
  const categoryOptions = categoryItems.map((c) => ({
    value: c.slug || c._id,
    label: c.name,
    requires_expiry: c.requires_expiry || false,
  }));

  const statusOptions = [
    { value: "active", label: t("Active") },
    { value: "archived", label: t("Archived") },
    { value: "expired", label: t("Expired") },
    { value: "pending_review", label: t("Pending Review") },
  ];

  const approvalStatusOptions = [
    { value: "pending", label: t("Pending") },
    { value: "approved", label: t("Approved") },
    { value: "rejected", label: t("Rejected") },
  ];

  const handleList = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
      catId = selectedCategory?.value,
      status = selectedStatus?.value,
      locId = selectedLocationId,
      approvalSt = selectedApprovalStatus?.value,
      empId = selectedEmployee?.value
    ) => {
      const effectiveLocId = isEmployee
        ? undefined
        : locId || undefined;

      dispatch(
        getDocumentList({
          _sort: sortCol,
          _order: sorting,
          _limit: perPage,
          _offset: (page - 1) * perPage,
          _search: search || undefined,
          category_id: catId || undefined,
          status: status || undefined,
          approved_status: approvalSt || undefined,
          location_id: effectiveLocId,
          user_id: empId || undefined,
        })
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, selectedCategory, selectedStatus, selectedApprovalStatus, selectedLocationId, isEmployee, isLocationAdmin, authUserLocationId]
  );

  // Fetch categories + employees on mount
  useEffect(() => {
    dispatch(getDocumentCategoryList());
    if (!isEmployee) {
      instance.get(API_ENDPOINTS.employees.list, { params: { perPage: 500, page: 1 } })
        .then(res => {
          const list = res.data?.data || [];
          setEmployeeOptions(list.map(e => ({
            value: e._id,
            label: `${e.first_name || ''} ${e.last_name || ''}`.trim() + (e.employee_code ? ` (${e.employee_code})` : ''),
          })));
        })
        .catch(() => {});
    }
  }, []);

  // Fetch on mount and when global location changes
  useEffect(() => {
    setCurrentPage(1);
    handleList(sort, sortColumn, 1, rowsPerPage, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value);
  }, [selectedLocationId]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanDocumentMessage());
  }, [store?.success, store?.error]);

  useEffect(() => {
    if (store?.actionFlag === "DOC_DEL_SCS" || store?.actionFlag === "DOC_APR_SCS" || store?.actionFlag === "DOC_REJ_SCS") handleList();
  }, [store?.actionFlag]);

  const handleDelete = (id, title) => {
    mySwal
      .fire({
        title: t("Are you sure?"),
        text: t(`Delete "${title}"? The file will be permanently removed.`),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: t("Yes, delete it!"),
        cancelButtonText: t("Cancel"),
      })
      .then((result) => {
        if (result.isConfirmed) dispatch(deleteDocument(id));
      });
  };

  const handleApprove = (id, title) => {
    mySwal
      .fire({
        title: t("Approve Document"),
        text: `${t("Approve")} "${title}"?`,
        icon: "question",
        input: "textarea",
        inputPlaceholder: t("Add a note (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Approve"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-success",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(approveDocument({ id, approval_note: result.value || "" }));
        }
      });
  };

  const handleReject = (id, title) => {
    mySwal
      .fire({
        title: t("Reject Document"),
        text: `${t("Reject")} "${title}"?`,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: t("Reason for rejection (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Reject"),
        cancelButtonText: t("Cancel"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(rejectDocument({ id, approval_note: result.value || "" }));
        }
      });
  };

  const handleDownload = async (docId, fileName) => {
    try {
      const raw = localStorage.getItem(storageTokenKeyName);
      const token = raw ? JSON.parse(raw) : null;
      const res = await fetch(`${hostRestApiUrl}${hostRestApiPrefix}${API_ENDPOINTS.document.download}/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        Notification("Error", t("Download failed"), "warning");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      Notification("Error", t("Download failed"), "warning");
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = [
    {
      name: t("Date"),
      sortable: true,
      sortField: "createdAt",
      width: "120px",
      cell: (row) => (
        <span className="small">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
    {
      name: t("Employee"),
      minWidth: "200px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1 gap-1">
          {row.employee ? (
            <>
              <span className="fw-semibold text-body">{row.employee.name}</span>
              <span className="text-muted small">{row.employee.email}</span>
            </>
          ) : (
            <span className="text-muted small">—</span>
          )}
        </div>
      ),
    },
    {
      name: t("Title / Category"),
      sortable: true,
      sortField: "title",
      selector: (row) => row.title,
      minWidth: "200px",
      wrap: true,
      cell: (row) => {
        const cat = categoryOptions.find((c) => c.value === row.category_id);
        return (
          <div className="d-flex flex-column py-1 gap-1">
            <Link to={`${appsRoot}/documents/edit/${row._id}`} className="fw-semibold">
              {row.title}
            </Link>
            <span className="text-muted small">{cat?.label || "—"}</span>
          </div>
        );
      },
    },
    {
      name: t("File / Expiry"),
      minWidth: "170px",
      wrap: true,
      cell: (row) => {
        const d = row.expiry_date ? new Date(row.expiry_date) : null;
        const daysLeft = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const expiryColor = row.is_expired
          ? "text-danger"
          : daysLeft !== null && daysLeft <= 30
          ? "text-warning"
          : "text-muted";
        return (
          <div className="d-flex flex-column py-1 gap-1">
            <span className="small">
              {row.file_name}{" "}
              <span className="text-muted">({formatBytes(row.file_size)})</span>
            </span>
            <span className={`small ${expiryColor}`}>
              {d ? (
                <>
                  {d.toLocaleDateString("en-GB")}
                  {!row.is_expired && daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
                    <small className="ms-1">({daysLeft}d left)</small>
                  )}
                  {row.is_expired && <small className="ms-1">(Expired)</small>}
                </>
              ) : (
                "No expiry"
              )}
            </span>
          </div>
        );
      },
    },
    {
      name: t("Status"),
      width: "120px",
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row.status] || "doc-badge-gray"}`}>
          {(row.status?.replace(/_/g, " ") || "—").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Approval"),
      width: "120px",
      cell: (row) => (
        <span className={`doc-badge ${approvalBadgeClass[row.approved_status] || "doc-badge-gray"}`}>
          {(row.approved_status || "—").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Actions"),
      cell: (row) => (
        <div className="d-flex gap-1 align-items-center">
          {/* Approve/Reject for admins on pending documents */}
          {canWrite && !isEmployee && row.approved_status === "pending" && (
            <>
              <span
                id={`apr-${row._id}`}
                className="cursor-pointer"
                onClick={() => handleApprove(row._id, row.title)}
              >
                <CheckCircle size={16} className="text-success" />
              </span>
              <UncontrolledTooltip target={`apr-${row._id}`}>{t("Approve")}</UncontrolledTooltip>

              <span
                id={`rej-${row._id}`}
                className="cursor-pointer"
                onClick={() => handleReject(row._id, row.title)}
              >
                <XCircle size={16} className="text-danger" />
              </span>
              <UncontrolledTooltip target={`rej-${row._id}`}>{t("Reject")}</UncontrolledTooltip>
            </>
          )}

          <Link
            to={`${appsRoot}/documents/edit/${row._id}`}
            id={`view-${row._id}`}
          >
            <Eye size={16} className="text-info" />
          </Link>
          <UncontrolledTooltip target={`view-${row._id}`}>{t("View")}</UncontrolledTooltip>

          <span
            id={`dl-${row._id}`}
            className="cursor-pointer"
            onClick={() => handleDownload(row._id, row.file_name)}
          >
            <Download size={16} className="text-primary" />
          </span>
          <UncontrolledTooltip target={`dl-${row._id}`}>{t("Download")}</UncontrolledTooltip>

          {canWrite && (
            <>
              {/* Employees cannot edit approved documents */}
              {!(isEmployee && row.approved_status === "approved") && (
                <>
                  <Link
                    to={`${appsRoot}/documents/edit/${row._id}`}
                    id={`edit-${row._id}`}
                  >
                    <Edit size={16} className="text-success" />
                  </Link>
                  <UncontrolledTooltip target={`edit-${row._id}`}>{t("Edit")}</UncontrolledTooltip>
                </>
              )}

              {/* Employees cannot delete approved documents */}
              {!(isEmployee && row.approved_status === "approved") && (
                <>
                  <span
                    id={`del-${row._id}`}
                    className="cursor-pointer"
                    onClick={() => handleDelete(row._id, row.title)}
                  >
                    <Trash2 size={16} className="text-danger" />
                  </span>
                  <UncontrolledTooltip target={`del-${row._id}`}>{t("Delete")}</UncontrolledTooltip>
                </>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Row className="mb-2 align-items-center g-1">
            <Col lg={2}>
              <h4 className="mb-0">{t("Documents")}</h4>
            </Col>
            <Col lg={10} className="d-flex justify-content-end gap-1 flex-wrap align-items-center">
              {!isEmployee && (
                <div style={{ width: 200 }}>
                  <Select
                    classNamePrefix="select"
                    options={employeeOptions}
                    value={selectedEmployee}
                    onChange={(opt) => {
                      setSelectedEmployee(opt);
                      handleList(sort, sortColumn, 1, rowsPerPage, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value, opt?.value);
                    }}
                    placeholder={t("All employees")}
                    isClearable isSearchable
                  />
                </div>
              )}
              <div style={{ width: 180 }}>
                <Select
                  classNamePrefix="select"
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(opt) => {
                    setSelectedCategory(opt);
                    handleList(sort, sortColumn, 1, rowsPerPage, searchInput, opt?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value);
                  }}
                  placeholder={t("All categories")}
                  isClearable
                />
              </div>
              <div style={{ width: 160 }}>
                <Select
                  classNamePrefix="select"
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(opt) => {
                    setSelectedStatus(opt);
                    handleList(sort, sortColumn, 1, rowsPerPage, searchInput, selectedCategory?.value, opt?.value, selectedLocationId, selectedApprovalStatus?.value);
                  }}
                  placeholder={t("All statuses")}
                  isClearable
                />
              </div>
              <div style={{ width: 160 }}>
                <Select
                  classNamePrefix="select"
                  options={approvalStatusOptions}
                  value={selectedApprovalStatus}
                  onChange={(opt) => {
                    setSelectedApprovalStatus(opt);
                    handleList(sort, sortColumn, 1, rowsPerPage, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, opt?.value);
                  }}
                  placeholder={t("All approvals")}
                  isClearable
                />
              </div>
              {canWrite && (
                <Button
                  color="primary"
                  tag={Link}
                  to={`${appsRoot}/documents/upload`}
                >
                  <PlusCircle size={14} className="me-50" />
                  {t("Upload")}
                </Button>
              )}
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.documentItems || []}
            pagination={{ total: store?.pagination?.total || 0, perPage: rowsPerPage }}
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            handlePagination={(page) => {
              setCurrentPage(page + 1);
              handleList(sort, sortColumn, page + 1, rowsPerPage, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value);
            }}
            handleRowPerPage={(value) => {
              setRowsPerPage(value);
              setCurrentPage(1);
              handleList(sort, sortColumn, 1, value, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value);
            }}
            handleSort={(column, sortDirection) => {
              setSortColumn(column.sortField);
              setSort(sortDirection);
              handleList(sortDirection, column.sortField, currentPage, rowsPerPage, searchInput, selectedCategory?.value, selectedStatus?.value, selectedLocationId, selectedApprovalStatus?.value);
            }}
            loading={store?.loading}
          />
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default DocumentList;
