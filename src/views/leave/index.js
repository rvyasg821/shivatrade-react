// ** React Imports
import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getMyLeaveRequests, getMyLeaveBalance, getLeaveTypeList,
  cancelLeaveRequest, clearLeaveMessages,
} from "./store";
import { formatDate, formatDateTime } from '@src/utility/dateFormat'

// ** Reactstrap
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle, Button, Badge, Progress,
  UncontrolledTooltip, Input,
} from 'reactstrap';

// ** Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PlusCircle, XCircle } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";

const MySwal = withReactContent(Swal);

const statusBadgeClass = {
  pending: "doc-badge-orange",
  approved: "doc-badge-green",
  rejected: "doc-badge-red",
  cancelled: "doc-badge-gray",
};

const balanceProgressColor = (pct) => {
  if (pct >= 80) return "danger";
  if (pct >= 50) return "warning";
  return "success";
};

const LeaveHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.leave);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    dispatch(getLeaveTypeList());
    dispatch(getMyLeaveRequests(selectedYear));
    dispatch(getMyLeaveBalance(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    if (store?.actionFlag === "MY_REQ_CAN_SCS") {
      Notification("Success", "Request cancelled", "success");
      dispatch(getMyLeaveRequests(selectedYear));
      dispatch(getMyLeaveBalance(selectedYear));
    }
    if (store?.actionFlag === "ERROR") {
      Notification("Error", store.error || "Error", "warning");
    }
    if (store?.actionFlag) dispatch(clearLeaveMessages());
  }, [store?.actionFlag]);

  const handleCancel = (id) => {
    MySwal.fire({
      title: t("Cancel this leave request?"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, cancel it"),
    }).then((result) => {
      if (result.isConfirmed) dispatch(cancelLeaveRequest(id));
    });
  };

  // Build leave type lookup map
  const leaveTypeMap = {};
  (store?.leaveTypeItems || []).forEach((lt) => {
    leaveTypeMap[lt._id] = lt;
  });

  const getLeaveTypeName = (id) => leaveTypeMap[id]?.name || "—";
  const getLeaveTypeColor = (id) => leaveTypeMap[id]?.color || "#6c757d";

  const columns = [
    {
      name: t("Leave Type"),
      minWidth: '180px',
      cell: (row) => (
        <div className="d-flex align-items-center gap-1">
          <span
            style={{
              width: 10, height: 10, borderRadius: "50%",
              background: getLeaveTypeColor(row.leave_type_id),
              display: "inline-block", flexShrink: 0,
            }}
          />
          <span>{getLeaveTypeName(row.leave_type_id)}</span>
        </div>
      ),
    },
    {
      name: t("From"),
      hide: "md",
      minWidth: '180px',
      center: true,
      selector: (row) => row.start_date,
      cell: (row) => (
        <span>
          {formatDate(row.start_date)}
          {row.start_half !== "full" && (
            <Badge color="light-secondary" pill className="ms-1" style={{ fontSize: "0.65rem" }}>
              {row.start_half?.toUpperCase()}
            </Badge>
          )}
        </span>
      ),
    },
    {
      name: t("To"),
      hide: "md",
      minWidth: '180px',
      center: true,
      selector: (row) => row.end_date,
      cell: (row) => (
        <span>
          {formatDate(row.end_date)}
          {row.end_half !== "full" && (
            <Badge color="light-secondary" pill className="ms-1" style={{ fontSize: "0.65rem" }}>
              {row.end_half?.toUpperCase()}
            </Badge>
          )}
        </span>
      ),
    },
    { name: t("Days"), minWidth: '100px', center: true, cell: (row) => <strong>{row.total_days}</strong> },
    {
      name: t("Status"),
      minWidth: '120px',
      center: true,
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row.status] || "doc-badge-gray"}`}>
          {(row.status || "—").replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t("Submitted"),
      hide: "md",
      minWidth: '150px',
      center: true,
      cell: (row) => row.createdAt ? formatDate(row.createdAt.split('T')[0]) : '—',
    },
    {
      name: t("Actions"),
      minWidth: '100px',
      center: true,
      cell: (row) =>
        row.status === "pending" ? (
          <>
            <Button
              id={`can-${row._id}`}
              size="sm"
              color="flat-danger"
              className="btn-icon"
              onClick={() => handleCancel(row._id)}
            >
              <XCircle size={14} />
            </Button>
            <UncontrolledTooltip target={`can-${row._id}`}>{t("Cancel")}</UncontrolledTooltip>
          </>
        ) : null,
    },
  ];

  return (
    <Fragment>
      {/* Balance Cards */}
      {(store?.myBalance || []).length > 0 && (
        <Row className="mb-2">
          {store.myBalance.map((bal) => {
            const lt = leaveTypeMap[bal.leave_type_id];
            const usedPct = bal.total_entitlement > 0
              ? Math.round(((bal.used + bal.pending) / bal.total_entitlement) * 100)
              : 0;
            const progressColor = balanceProgressColor(usedPct);
            return (
              <Col md={3} sm={6} key={bal._id} className="mb-1">
                <Card className="shadow-none border">
                  <CardBody className="p-2">
                    <div className="d-flex align-items-center gap-1 mb-1">
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: lt?.color || "#6c757d",
                          display: "inline-block", flexShrink: 0,
                        }}
                      />
                      <small className="fw-bold text-truncate">{lt?.name || "—"}</small>
                    </div>
                    <div className="d-flex justify-content-between align-items-baseline">
                      <span className="fw-bold fs-5">{bal.balance}</span>
                      <small className="text-muted">/ {bal.total_entitlement} days</small>
                    </div>
                    <Progress
                      value={usedPct}
                      color={progressColor}
                      className="mt-1"
                      style={{ height: 4 }}
                    />
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-muted">{bal.used} used</small>
                      {bal.pending > 0 && (
                        <small className="text-warning">{bal.pending} pending</small>
                      )}
                      {bal.carried_over > 0 && (
                        <small className="text-info">{bal.carried_over} c/o</small>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
          <CardTitle tag='h5' className='mb-0'>{t('My Leave Requests')} — {selectedYear}</CardTitle>
          <div className='d-flex align-items-center gap-75'>
            <Input type='select' bsSize='sm' style={{ width: '90px' }} value={selectedYear} onChange={(e) => setSelectedYear(+e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </Input>
            <Button color='primary' size='sm' tag={Link} to={`${appsRoot}/leave/request`}>
              <PlusCircle size={14} className='me-1' />
              {t('Request Leave')}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <DatatablePagination
            data={store?.myRequests || []}
            columns={columns}
            loading={store?.loading}
            disablePagination
          />
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default LeaveHome;
