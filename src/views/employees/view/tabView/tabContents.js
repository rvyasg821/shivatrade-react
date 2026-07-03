// ** React Imports
import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Reactstrap Imports
import {
  TabPane,
  TabContent,
  Card,
  CardBody,
  CardTitle,
  Spinner,
  Badge,
  Button,
  Col,
  Row,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  Input,
  Progress,
  FormGroup,
} from "reactstrap";
import Select from "react-select";
import { Plus, Minus } from "react-feather";

// ** Third Party
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";

// ** Store Actions
import { getAnnualReport, clearAttendanceActionFlag } from "@src/views/attendance/store";
import { getLeaveRequestList, getLeaveTypeList } from "@src/views/leave/store";
import { getDocumentList, uploadDocument, approveDocument, rejectDocument, deleteDocument, getDocumentCategoryList } from "@src/views/documents/store";
import { Download, Upload, Eye, CheckCircle, XCircle, Trash2, Edit, FileText, Send } from "react-feather";
import { Link } from "react-router-dom";
import { appsRoot } from "@constant/defaultValues";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const DocMySwal = withReactContent(Swal);
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { storageTokenKeyName, hostRestApiUrl, hostRestApiPrefix } from "@constant/defaultValues";
import Notification from "@components/toast/notification";
import { getContractList, getContractTemplateList, issueContract, clearContractMessages } from "@src/views/contracts/store";
// ** Custom Components
import DatatablePagination from "@components/datatable/DatatablePagination";
import DateInput from "@components/date-input";

// ==================== ATTENDANCE TAB ====================
const AttendanceTab = ({ userId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const store = useSelector((state) => state.attendance);

  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!userId) return;
    dispatch(getAnnualReport({ year: reportYear, userId }));
  }, [dispatch, userId, reportYear]);

  const formatHours = (h) => {
    if (!h && h !== 0) return "-";
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const handleMonthClick = (monthNum) => {
    navigate(`${appsRoot}/attendance/admin?tab=monthly&view=monthly&year=${reportYear}&month=${monthNum}&userId=${userId}`);
  };

  const columns = [
    {
      name: t("Month"),
      minWidth: "100px",
      cell: (r) => (
        <span
          className="fw-semibold text-primary"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleMonthClick(r.month)}
        >
          {r.month_name}
        </span>
      ),
    },
    { name: t("Present"), minWidth: "70px", center: true, cell: (r) => <span className="fw-semibold" style={{ color: "#28c76f" }}>{r.present_days ?? 0}</span> },
    { name: t("Absent"), minWidth: "70px", center: true, cell: (r) => <span className="fw-semibold" style={{ color: "#ea5455" }}>{r.absent_days ?? 0}</span> },
    {
      name: t("Late / Early"),
      minWidth: "90px",
      center: true,
      cell: (r) => (
        <span className="fw-semibold">
          <span style={{ color: "#ff9f43" }}>{r.late_days ?? 0}</span>
          {" / "}
          <span style={{ color: "#00cfe8" }}>{r.early_leave_days ?? 0}</span>
        </span>
      ),
    },
    {
      name: t("Half / Leave / Holiday"),
      minWidth: "130px",
      center: true,
      cell: (r) => (
        <span className="fw-semibold">
          <span style={{ color: "#ff9f43" }}>{r.half_day_days ?? 0}</span>
          {" / "}
          <span style={{ color: "#7367f0" }}>{r.on_leave_days ?? 0}</span>
          {" / "}
          <span style={{ color: "#82868b" }}>{r.holiday_days ?? 0}</span>
        </span>
      ),
    },
    {
      name: t("Hours / OT"),
      minWidth: "120px",
      center: true,
      cell: (r) => (
        <span className="fw-semibold" style={{ color: "#09418b" }}>
          {formatHours(r.total_hours ?? 0)}{" / "}{formatHours(r.overtime_hours ?? 0)}
        </span>
      ),
    },
  ];

  const data = store?.annualReport || [];

  return (
    <Fragment>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <CardTitle tag="h5" className="mb-0">{t("Attendance")}</CardTitle>
        <div className="d-flex align-items-center gap-50">
          <Label className="form-label small mb-0">{t("Year")}</Label>
          <Input type="number" bsSize="sm" style={{ width: "90px" }} value={reportYear} onChange={(e) => setReportYear(+e.target.value)} />
        </div>
      </div>
      {store?.loading === false ? (
        <div className="text-center my-4">
          <Spinner color="primary" />
        </div>
      ) : (
        <DatatablePagination
          columns={columns}
          data={data}
          loading={store?.loading}
          disablePagination
        />
      )}
    </Fragment>
  );
};

// ==================== LEAVE TAB ====================
const LeaveTab = ({ userId }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.leave);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Build leave type map for name lookup
  const leaveTypeMap = useMemo(() => {
    const map = {};
    (store?.leaveTypeItems || []).forEach((lt) => { map[lt._id] = lt; });
    return map;
  }, [store?.leaveTypeItems]);

  const fetchData = useCallback(() => {
    if (!userId) return;
    dispatch(
      getLeaveRequestList({
        _userId: userId,
        _limit: rowsPerPage,
        _offset: (currentPage - 1) * rowsPerPage,
        _sort: "createdAt",
        _order: "desc",
      })
    );
  }, [dispatch, userId, currentPage, rowsPerPage]);

  useEffect(() => {
    dispatch(getLeaveTypeList());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusBadgeClass = {
    pending: "doc-badge-orange",
    approved: "doc-badge-green",
    rejected: "doc-badge-red",
    cancelled: "doc-badge-gray",
  };

  const columns = [
    {
      name: t("Leave Type"),
      minWidth: "150px",
      cell: (row) => {
        const lt = leaveTypeMap[row?.leave_type_id] || row?.leave_type;
        return (
          <div className="d-flex align-items-center gap-1">
            {lt?.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: lt.color, display: 'inline-block' }} />}
            <span className="text-capitalize">{lt?.name || row?.leaveTypeName || "-"}</span>
          </div>
        );
      },
    },
    {
      name: t("From"),
      minWidth: "130px",
      center: true,
      cell: (row) =>
        row?.start_date ? moment(row.start_date).format("DD MMM YYYY") : "-",
    },
    {
      name: t("To"),
      minWidth: "130px",
      center: true,
      cell: (row) =>
        row?.end_date ? moment(row.end_date).format("DD MMM YYYY") : "-",
    },
    {
      name: t("Days"),
      minWidth: "80px",
      center: true,
      cell: (row) => row?.total_days ?? "-",
    },
    {
      name: t("Status"),
      minWidth: "120px",
      center: true,
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row?.status] || "doc-badge-gray"}`}>
          {(row?.status || "-").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Submitted"),
      minWidth: "130px",
      center: true,
      cell: (row) =>
        row?.createdAt ? moment(row.createdAt).format("DD MMM YYYY") : "-",
    },
  ];

  const data = store?.requestItems || [];
  const total = store?.requestTotal || 0;

  return (
    <Fragment>
      <CardTitle tag="h5" className="mb-1">{t("Leave")}</CardTitle>
      {store?.loading === false ? (
        <div className="text-center my-4">
          <Spinner color="primary" />
        </div>
      ) : data.length > 0 ? (
        <Row>
          <Col md="12">
            <DatatablePagination
              columns={columns}
              data={data}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              pagination={{ total, totalPage: Math.ceil(total / rowsPerPage) }}
              handlePagination={(page) => setCurrentPage(page + 1)}
              handleRowPerPage={(val) => {
                setRowsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </Col>
        </Row>
      ) : (
        <div className="text-center fw-semibold text-muted py-3">
          {t("No leave requests found.")}
        </div>
      )}
    </Fragment>
  );
};

// ==================== DOCUMENTS TAB ====================
const EMPTY_DOC_ROW = { title: "", category_id: "", expiry_date: "", file: null, status: "idle" };

const DocumentsTab = ({ userId }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.document);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [uploadModal, setUploadModal] = useState(false);
  const [docRows, setDocRows] = useState([{ ...EMPTY_DOC_ROW }]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  // Load categories
  useEffect(() => {
    dispatch(getDocumentCategoryList());
  }, []);

  const categoryItems = store?.categoryItems || [];
  const categoryOptions = categoryItems.map((c) => ({
    value: c.slug || c._id,
    label: c.name,
    requires_expiry: c.requires_expiry || false,
  }));

  const fetchData = useCallback(() => {
    if (!userId) return;
    dispatch(
      getDocumentList({
        user_id: userId,
        _limit: rowsPerPage,
        _offset: (currentPage - 1) * rowsPerPage,
        _sort: "createdAt",
        _order: "desc",
      })
    );
  }, [dispatch, userId, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bulk upload modal handlers
  const addDocRow = () => setDocRows((prev) => [...prev, { ...EMPTY_DOC_ROW }]);
  const removeDocRow = (idx) => setDocRows((prev) => prev.filter((_, i) => i !== idx));
  const updateDocRow = (idx, field, value) => {
    setDocRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const openUploadModal = () => {
    setDocRows([{ ...EMPTY_DOC_ROW }]);
    setUploadProgress({ done: 0, total: 0 });
    setUploadModal(true);
  };

  const handleBulkSubmit = async () => {
    const validRows = docRows.filter((r) => r.file && r.title && r.category_id);
    if (validRows.length === 0) {
      Notification("Error", t("Please fill title, category and file for at least one document"), "warning");
      return;
    }
    setUploading(true);
    setUploadProgress({ done: 0, total: validRows.length });
    let uploaded = 0;

    for (let i = 0; i < docRows.length; i++) {
      const row = docRows[i];
      if (!row.file || !row.title || !row.category_id) {
        updateDocRow(i, "status", "skipped");
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", row.file);
        formData.append("title", row.title);
        formData.append("category_id", row.category_id);
        formData.append("user_id", userId);
        if (row.expiry_date) formData.append("expiry_date", row.expiry_date);
        await dispatch(uploadDocument(formData)).unwrap();
        updateDocRow(i, "status", "success");
        uploaded++;
      } catch {
        updateDocRow(i, "status", "error");
      }
      setUploadProgress({ done: i + 1, total: validRows.length });
    }

    setUploading(false);
    if (uploaded > 0) {
      Notification("Success", `${uploaded} document(s) uploaded`, "success");
      fetchData();
      // Auto-close modal after short delay
      setTimeout(() => setUploadModal(false), 1500);
    }
  };

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

  // Remove old bulk handler — replaced by modal

  const handleDownload = async (docId, fileName) => {
    try {
      const raw = localStorage.getItem(storageTokenKeyName);
      const token = raw ? JSON.parse(raw) : null;
      const res = await fetch(`${hostRestApiUrl}${hostRestApiPrefix}${API_ENDPOINTS.document.download}/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch { }
  };

  const handleApproveDoc = (id) => {
    dispatch(approveDocument({ id, approval_note: "" })).then(() => fetchData());
  };

  const handleRejectDoc = (id) => {
    dispatch(rejectDocument({ id, approval_note: "" })).then(() => fetchData());
  };

  const handleDeleteDoc = (id, title) => {
    DocMySwal.fire({
      title: t("Delete Document?"),
      text: `${t("Delete")} "${title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Delete"),
      cancelButtonText: t("Cancel"),
      customClass: { confirmButton: "btn btn-danger", cancelButton: "btn btn-outline-secondary ms-1" },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteDocument(id)).then(() => {
          Notification("Success", t("Document deleted"), "success");
          fetchData();
        });
      }
    });
  };

  const columns = [
    {
      name: t("Date"),
      width: "100px",
      cell: (row) => (
        <span className="small">{row?.createdAt ? moment(row.createdAt).format("DD/MM/YY") : "-"}</span>
      ),
    },
    {
      name: t("Title"),
      grow: 2,
      wrap: true,
      cell: (row) => (
        <div>
          <div className="fw-semibold">{row?.title || "-"}</div>
          {row?.expiry_date && (
            <small className={row?.is_expired ? "text-danger" : "text-muted"}>
              {t("Exp")}: {moment(row.expiry_date).format("DD/MM/YY")}
              {row?.is_expired && <span className="ms-1">({t("Expired")})</span>}
            </small>
          )}
        </div>
      ),
    },
    {
      name: t("Status"),
      width: "100px",
      center: true,
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row?.status] || "doc-badge-gray"}`}>
          {(row?.status?.replace(/_/g, " ") || "-").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Approval"),
      width: "100px",
      center: true,
      cell: (row) => (
        <span className={`doc-badge ${approvalBadgeClass[row?.approved_status] || "doc-badge-gray"}`}>
          {(row?.approved_status || "-").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "140px",
      center: true,
      cell: (row) => (
        <div className="d-flex gap-50 align-items-center">
          {row?.approved_status === "pending" && (
            <>
              <span className="cursor-pointer" onClick={() => handleApproveDoc(row._id)} title={t("Approve")}>
                <CheckCircle size={14} className="text-success" />
              </span>
              <span className="cursor-pointer" onClick={() => handleRejectDoc(row._id)} title={t("Reject")}>
                <XCircle size={14} className="text-danger" />
              </span>
            </>
          )}
          <span className="cursor-pointer" onClick={() => handleDownload(row._id, row.file_name)} title={t("Download")}>
            <Download size={14} className="text-primary" />
          </span>
          <Link to={`${appsRoot}/documents/edit/${row._id}`} title={t("Edit")}>
            <Edit size={14} className="text-info" />
          </Link>
          <span className="cursor-pointer" onClick={() => handleDeleteDoc(row._id, row.title)} title={t("Delete")}>
            <Trash2 size={14} className="text-danger" />
          </span>
        </div>
      ),
    },
  ];

  const data = store?.documentItems || [];
  const total = store?.pagination?.total || 0;

  return (
    <Fragment>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 border-bottom pb-1 mb-1">
        <CardTitle tag="h5" className="mb-0">{t("Documents")}</CardTitle>
        <Button color="primary" size="sm" className="text-nowrap" onClick={openUploadModal}>
          <Upload size={14} className="me-50" />{t("Upload Documents")}
        </Button>
      </div>
      {store?.loading === false ? (
        <div className="text-center my-4">
          <Spinner color="primary" />
        </div>
      ) : data.length > 0 ? (
        <DatatablePagination
          columns={columns}
          data={data}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          pagination={{ total, totalPage: Math.ceil(total / rowsPerPage) }}
          handlePagination={(page) => setCurrentPage(page + 1)}
          handleRowPerPage={(val) => {
            setRowsPerPage(val);
            setCurrentPage(1);
          }}
        />
      ) : (
        <div className="text-center fw-semibold text-muted py-3">
          {t("No documents found.")}
        </div>
      )}

      {/* Bulk Upload Modal */}
      <Modal isOpen={uploadModal} toggle={() => {}} backdrop="static" keyboard={false} size="lg" centered scrollable>
        <ModalHeader toggle={uploading ? undefined : () => setUploadModal(false)}>
          {t("Upload Documents")}
        </ModalHeader>
        <ModalBody>
          {docRows.map((row, idx) => {
            const selectedCat = categoryOptions.find((c) => c.value === row.category_id);
            return (
              <Card key={idx} className={`mb-2 border ${row.status === "success" ? "border-success" : row.status === "error" ? "border-danger" : ""}`}>
                <CardBody className="py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="fw-bold text-muted">{t("Document")} {idx + 1}</small>
                    <div className="d-flex align-items-center gap-50">
                      {row.status === "success" && <CheckCircle size={16} className="text-success" />}
                      {row.status === "error" && <XCircle size={16} className="text-danger" />}
                      {docRows.length > 1 && row.status === "idle" && (
                        <Button size="sm" color="flat-danger" className="btn-icon p-25" onClick={() => removeDocRow(idx)} disabled={uploading}>
                          <Minus size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Row>
                    <Col md="6" className="mb-1">
                      <Label className="small">{t("Title")} <span className="text-danger">*</span></Label>
                      <Input
                        bsSize="sm"
                        value={row.title}
                        onChange={(e) => updateDocRow(idx, "title", e.target.value)}
                        placeholder={t("Document title")}
                        disabled={uploading || row.status !== "idle"}
                      />
                    </Col>
                    <Col md="6" className="mb-1">
                      <Label className="small">{t("Category")} <span className="text-danger">*</span></Label>
                      <Select
                        options={categoryOptions}
                        value={selectedCat || null}
                        onChange={(opt) => updateDocRow(idx, "category_id", opt?.value || "")}
                        placeholder={t("Select category")}
                        classNamePrefix="select"
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                        isDisabled={uploading || row.status !== "idle"}
                      />
                    </Col>
                    <Col md="6" className="mb-1">
                      <Label className="small">{t("File")} <span className="text-danger">*</span></Label>
                      <Input
                        type="file"
                        bsSize="sm"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateDocRow(idx, "file", file);
                            if (!row.title) updateDocRow(idx, "title", file.name.replace(/\.[^/.]+$/, ""));
                          }
                        }}
                        disabled={uploading || row.status !== "idle"}
                      />
                      {row.file && <small className="text-muted">{row.file.name} ({(row.file.size / 1024).toFixed(0)} KB)</small>}
                    </Col>
                    <Col md="6" className="mb-1">
                      <Label className="small">
                        {t("Expiry Date")}
                        {selectedCat?.requires_expiry && <span className="text-danger"> *</span>}
                      </Label>
                      <DateInput
                        value={row.expiry_date}
                        onChange={(dates, str, iso) => updateDocRow(idx, "expiry_date", iso)}
                        id={`expiry_date_${idx}`}
                        disabled={uploading || row.status !== "idle"}
                      />
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            );
          })}

          {!uploading && (
            <Button color="outline-primary" size="sm" onClick={addDocRow} className="d-flex align-items-center gap-50">
              <Plus size={14} />{t("Add Another Document")}
            </Button>
          )}

          {uploading && (
            <div className="mt-2">
              <small className="fw-semibold">{t("Uploading")}: {uploadProgress.done}/{uploadProgress.total}</small>
              <Progress value={(uploadProgress.done / (uploadProgress.total || 1)) * 100} className="mt-50" />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setUploadModal(false)} disabled={uploading}>
            {t("Close")}
          </Button>
          {!docRows.every((r) => r.status !== "idle") ? (
            <Button color="primary" onClick={handleBulkSubmit} disabled={uploading || !docRows.some((r) => r.file && r.title && r.category_id)}>
              {uploading ? <Spinner size="sm" /> : `${t("Upload All")} (${docRows.filter((r) => r.file && r.title && r.category_id).length})`}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

// ==================== CONTRACTS TAB ====================
const ContractsTab = ({ userId }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((state) => state.contract);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [issueModal, setIssueModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(() => {
    if (!userId) return;
    dispatch(
      getContractList({
        _userId: userId,
        _limit: rowsPerPage,
        _offset: (currentPage - 1) * rowsPerPage,
      })
    );
  }, [dispatch, userId, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    dispatch(getContractTemplateList({ _limit: 100 }));
  }, []);

  useEffect(() => {
    if (store?.actionFlag === "EC_ISS_SCS") {
      Notification("Success", store.success || t("Contract issued"), "success");
      setIssueModal(false);
      setSelectedTemplate(null);
      setEffectiveDate("");
      setEndDate("");
      setNotes("");
      fetchData();
      dispatch(clearContractMessages());
    }
    if (store?.error && store?.actionFlag) {
      Notification("Error", store.error, "warning");
      dispatch(clearContractMessages());
    }
  }, [store?.actionFlag]);

  const templateOptions = (store?.templateItems || [])
    .filter((tmpl) => tmpl.status === "active")
    .map((tmpl) => ({ value: tmpl._id, label: tmpl.name }));

  const handleIssue = () => {
    if (!selectedTemplate) {
      Notification("Warning", t("Please select a contract template"), "warning");
      return;
    }
    dispatch(issueContract({
      user_id: userId,
      template_id: selectedTemplate.value,
      effective_date: effectiveDate || undefined,
      end_date: endDate || undefined,
      notes: notes || undefined,
    }));
  };

  const statusBadgeClass = {
    draft: "doc-badge-gray",
    issued: "doc-badge-orange",
    pending_signature: "doc-badge-orange",
    signed: "doc-badge-green",
    expired: "doc-badge-red",
    terminated: "doc-badge-red",
  };

  const columns = [
    {
      name: t("Contract"),
      grow: 2,
      wrap: true,
      cell: (row) => (
        <div>
          <div className="fw-semibold">{row?.template?.name || row?.template_name || "-"}</div>
          {row?.effective_date && (
            <small className="text-muted">
              {moment(row.effective_date).format("DD/MM/YY")}
              {row?.end_date && ` — ${moment(row.end_date).format("DD/MM/YY")}`}
            </small>
          )}
        </div>
      ),
    },
    {
      name: t("Issued"),
      width: "100px",
      center: true,
      cell: (row) => <span className="small">{row?.issued_at ? moment(row.issued_at).format("DD/MM/YY") : "-"}</span>,
    },
    {
      name: t("Signed"),
      width: "100px",
      center: true,
      cell: (row) => <span className="small">{row?.signed_at ? moment(row.signed_at).format("DD/MM/YY") : t("—")}</span>,
    },
    {
      name: t("Status"),
      width: "130px",
      center: true,
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row?.status] || "doc-badge-gray"}`}>
          {(row?.status?.replace(/_/g, " ") || "-").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "80px",
      center: true,
      cell: (row) => (
        <Link to={`${appsRoot}/contracts/view/${row._id}`} title={t("View")}>
          <Eye size={15} className="text-info" />
        </Link>
      ),
    },
  ];

  const data = store?.contractItems || [];
  const total = store?.contractTotal || 0;

  return (
    <Fragment>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 border-bottom pb-1 mb-1">
        <CardTitle tag="h5" className="mb-0">{t("Contracts")}</CardTitle>
        <Button color="primary" size="sm" className="text-nowrap" onClick={() => setIssueModal(true)}>
          <Send size={14} className="me-50" />{t("Assign Contract")}
        </Button>
      </div>
      {store?.loading === false ? (
        <div className="text-center my-4">
          <Spinner color="primary" />
        </div>
      ) : data.length > 0 ? (
        <DatatablePagination
          columns={columns}
          data={data}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          pagination={{ total, totalPage: Math.ceil(total / rowsPerPage) }}
          handlePagination={(page) => setCurrentPage(page + 1)}
          handleRowPerPage={(val) => {
            setRowsPerPage(val);
            setCurrentPage(1);
          }}
        />
      ) : (
        <div className="text-center fw-semibold text-muted py-3">
          {t("No contracts found.")}
        </div>
      )}

      {/* Assign Contract Modal */}
      <Modal isOpen={issueModal} toggle={() => setIssueModal(false)} centered>
        <ModalHeader toggle={() => setIssueModal(false)}>{t("Assign Contract")}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="12" className="mb-2">
              <Label>{t("Contract Template")} <span className="text-danger">*</span></Label>
              <Select
                options={templateOptions}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                placeholder={t("Select template...")}
                classNamePrefix="select"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </Col>
            <Col md="6" className="mb-2">
              <Label>{t("Effective Date")}</Label>
              <DateInput value={effectiveDate} onChange={(dates, str, iso) => setEffectiveDate(iso)} id="effectiveDate" />
            </Col>
            <Col md="6" className="mb-2">
              <Label>{t("End Date")}</Label>
              <DateInput value={endDate} onChange={(dates, str, iso) => setEndDate(iso)} id="contractEndDate" minDate={effectiveDate || undefined} />
            </Col>
            <Col md="12" className="mb-1">
              <Label>{t("Notes")}</Label>
              <Input type="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Optional notes...")} />
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setIssueModal(false)}>{t("Cancel")}</Button>
          <Button color="primary" onClick={handleIssue} disabled={!store?.loading || !selectedTemplate}>
            <Send size={14} className="me-50" />{t("Issue Contract")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

// ==================== MAIN TAB CONTENTS ====================
const TabContents = ({ active, toolFlags = {} }) => {
  const { id } = useParams();

  return (
    <Fragment>
      <TabContent activeTab={active}>
        {toolFlags.attendance && (
          <TabPane tabId="attendance">
            {active === "attendance" && <AttendanceTab userId={id} />}
          </TabPane>
        )}

        {toolFlags.leave && (
          <TabPane tabId="leave">
            {active === "leave" && <LeaveTab userId={id} />}
          </TabPane>
        )}

        {toolFlags.documents && (
          <TabPane tabId="documents">
            {active === "documents" && <DocumentsTab userId={id} />}
          </TabPane>
        )}

        {toolFlags.contracts && (
          <TabPane tabId="contracts">
            {active === "contracts" && <ContractsTab userId={id} />}
          </TabPane>
        )}

      </TabContent>
    </Fragment>
  );
};

export default TabContents;
