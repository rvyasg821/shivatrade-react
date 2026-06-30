// ** React Imports
import { Fragment, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getLeaveRequestList, approveLeaveRequest, rejectLeaveRequest, clearLeaveMessages,
} from "../store";
import { formatDate, formatDateTime } from '@src/utility/dateFormat'

// ** Reactstrap
import {
  Col, Row, Card, Button, CardBody, Badge, Modal, ModalHeader, ModalBody,
  ModalFooter, FormGroup, Label, Input, UncontrolledTooltip,
} from "reactstrap";

// ** Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Select from "react-select";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { CheckCircle, XCircle, Eye } from "react-feather";

// ** Constant
import { defaultPerPageRow } from "@constant/defaultValues";

const MySwal = withReactContent(Swal);

const statusColors = {
  pending: "light-warning",
  approved: "light-success",
  rejected: "light-danger",
  cancelled: "light-secondary",
};

const statusOptions = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const LeaveRequestList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.leave);

  const [currentPage, setCurrentPage] = useState(0);
  const [perPage, setPerPage] = useState(defaultPerPageRow);
  const [statusFilter, setStatusFilter] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadData(0, perPage, "");
  }, []);

  useEffect(() => {
    if (store?.actionFlag) {
      if (["LR_APV_SCS", "LR_REJ_SCS"].includes(store.actionFlag)) {
        Notification("Success", store.success || "Done", "success");
        loadData(currentPage, perPage, statusFilter?.value || "");
        setRejectModal(false);
        setRejectReason("");
      }
      if (store.actionFlag === "ERROR") {
        Notification("Error", store.error || "Error", "warning");
      }
      dispatch(clearLeaveMessages());
    }
  }, [store?.actionFlag]);

  const loadData = (page, limit, status) => {
    const params = { _limit: limit, _offset: page * limit };
    if (status) params._status = status;
    dispatch(getLeaveRequestList(params));
  };

  const handleApprove = (id) => {
    MySwal.fire({
      title: t("Approve this request?"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("Yes, approve"),
    }).then((result) => {
      if (result.isConfirmed) dispatch(approveLeaveRequest(id));
    });
  };

  const openReject = (id) => {
    setRejectId(id);
    setRejectReason("");
    setRejectModal(true);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    dispatch(rejectLeaveRequest({ id: rejectId, reason: rejectReason }));
  };

  const columns = [
    {
      name: t("Employee"),
      cell: (row) => <span>{row.user_id?.substring(0, 8)}...</span>,
    },
    {
      name: t("Leave Type"),
      cell: (row) => <span>{row.leave_type_id?.substring(0, 8)}...</span>,
    },
    {
      name: t("Start"),
      hide: "md",
      selector: (row) => row.start_date,
      cell: (row) => formatDate(row.start_date),
    },
    {
      name: t("End"),
      hide: "md",
      selector: (row) => row.end_date,
      cell: (row) => formatDate(row.end_date),
    },
    {
      name: t("Days"),
      selector: (row) => row.total_days,
      cell: (row) => <strong>{row.total_days}</strong>,
    },
    {
      name: t("Status"),
      cell: (row) => (
        <Badge color={statusColors[row.status] || "light-secondary"} pill>
          {row.status}
        </Badge>
      ),
    },
    {
      name: t("Submitted"),
      hide: "md",
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      name: t("Actions"),
      allowOverflow: true,
      cell: (row) => (
        <div className="d-flex">
          {row.status === "pending" && (
            <>
              <Button
                id={`apv-${row._id}`}
                size="sm"
                color="flat-success"
                className="btn-icon"
                onClick={() => handleApprove(row._id)}
              >
                <CheckCircle size={14} />
              </Button>
              <UncontrolledTooltip target={`apv-${row._id}`}>{t("Approve")}</UncontrolledTooltip>

              <Button
                id={`rej-${row._id}`}
                size="sm"
                color="flat-danger"
                className="btn-icon"
                onClick={() => openReject(row._id)}
              >
                <XCircle size={14} />
              </Button>
              <UncontrolledTooltip target={`rej-${row._id}`}>{t("Reject")}</UncontrolledTooltip>
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
          <Row className="mb-1 align-items-center">
            <Col md={6}>
              <h4 className="mb-0">{t("Leave Requests")}</h4>
            </Col>
            <Col md={6}>
              <Select
                isClearable
                placeholder={t("Filter by status...")}
                options={statusOptions}
                value={statusFilter}
                onChange={(opt) => {
                  setStatusFilter(opt);
                  setCurrentPage(0);
                  loadData(0, perPage, opt?.value || "");
                }}
              />
            </Col>
          </Row>

          <DatatablePagination
            data={store?.requestItems || []}
            columns={columns}
            pagination
            paginationServer
            paginationTotalRows={store?.requestTotal || 0}
            paginationPerPage={perPage}
            onChangePage={(page) => { setCurrentPage(page); loadData(page, perPage, statusFilter?.value || ""); }}
            onChangeRowsPerPage={(rows) => { setPerPage(rows); setCurrentPage(0); loadData(0, rows, statusFilter?.value || ""); }}
            loading={store?.loading}
          />
        </CardBody>
      </Card>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal} toggle={() => setRejectModal(false)}>
        <ModalHeader toggle={() => setRejectModal(false)}>{t("Reject Leave Request")}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t("Reason for rejection")} *</Label>
            <Input
              type="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("Enter reason...")}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setRejectModal(false)}>{t("Cancel")}</Button>
          <Button color="danger" onClick={handleReject} disabled={!rejectReason.trim()}>{t("Reject")}</Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default LeaveRequestList;
