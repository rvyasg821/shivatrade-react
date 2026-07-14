// ** React Imports
import { formatDate } from "@src/utility/dateFormat";
import { Fragment, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getMessageLogList,
  getMessageLog,
  cleanMessageLogMessage,
  cleanMessageLogState,
} from "./store";

// ** Reactstrap Imports
import {
  Col,
  Row,
  Card,
  Input,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Label,
} from "reactstrap";

// ** Custom Components
import Notification from "@components/toast/notification";
import DatatablePagination from "@components/datatable/DatatablePagination";

// ** Third Party Components
import { useTranslation } from "react-i18next";
import { Eye, Mail, MessageSquare, MessageCircle } from "react-feather";

// ** Constant
import { defaultPerPageRow } from "@constant/defaultValues";

const CHANNEL_META = {
  email: {
    title: "Email Logs",
    icon: <Mail size={20} />,
    addressLabel: "Recipient Email",
    bodyLabel: "Subject / Preview",
  },
  sms: {
    title: "SMS Logs",
    icon: <MessageSquare size={20} />,
    addressLabel: "Recipient Number",
    bodyLabel: "Message Preview",
  },
  whatsapp: {
    title: "WhatsApp Logs",
    icon: <MessageCircle size={20} />,
    addressLabel: "Recipient Number",
    bodyLabel: "Message Preview",
  },
};

const STATUS_BADGE = {
  sent: "doc-badge-green",
  queued: "doc-badge-gray",
  failed: "doc-badge-red",
  skipped: "doc-badge-gray",
};

const RECIPIENT_TYPE_LABEL = {
  company_admin: "Company Admin",
  location_admin: "Location Admin",
  employee: "Employee",
  external: "External",
  system: "System",
};

const formatDateTime = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return `${formatDate(d)} ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
};

const MessageLogList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.messageLog);
  const location = useLocation();

  // Derive channel from URL path: /apps/logs/email | /sms | /whatsapp
  const channel = location.pathname.endsWith("/sms")
    ? "sms"
    : location.pathname.endsWith("/whatsapp")
      ? "whatsapp"
      : "email";

  const meta = CHANNEL_META[channel] || CHANNEL_META.email;

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [recipientFilter, setRecipientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);

  const handleList = useCallback(
    (
      page = currentPage,
      perPage = rowsPerPage,
      recipient = recipientFilter,
      status = statusFilter,
      eventKey = eventFilter,
      from = dateFrom,
      to = dateTo
    ) => {
      dispatch(
        getMessageLogList({
          channel,
          _limit: perPage,
          _offset: (page - 1) * perPage,
          recipient: recipient || undefined,
          status: status || undefined,
          event_key: eventKey || undefined,
          date_from: from || undefined,
          date_to: to || undefined,
        })
      );
    },
    [
      currentPage,
      rowsPerPage,
      recipientFilter,
      statusFilter,
      eventFilter,
      dateFrom,
      dateTo,
      channel,
    ]
  );

  // Refetch when channel changes (route navigation between Email/SMS/WhatsApp pages)
  useEffect(() => {
    setCurrentPage(1);
    setRecipientFilter("");
    setStatusFilter("");
    setEventFilter("");
    setDateFrom("");
    setDateTo("");
    dispatch(
      getMessageLogList({
        channel,
        _limit: rowsPerPage,
        _offset: 0,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // Handle messages
  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanMessageLogMessage());
  }, [store?.success, store?.error]);

  const handlePagination = (page) => {
    setCurrentPage(page + 1);
    handleList(page + 1);
  };

  const handleRowPerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleList(1, value);
  };

  const openDetail = (id) => {
    dispatch(getMessageLog(id));
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    dispatch(cleanMessageLogState());
  };

  const columns = [
    {
      name: t("Sent At"),
      hide: "md",
      width: "150px",
      cell: (row) => (
        <span className="small">{formatDateTime(row.sent_at || row.createdAt)}</span>
      ),
    },
    {
      name: t("Recipient"),
      minWidth: "240px",
      wrap: true,
      cell: (row) => (
        <div className="d-flex flex-column py-1">
          <span className="fw-semibold">{row.recipient_name || "—"}</span>
          <span className="text-muted small">{row.recipient_address}</span>
          <span className="text-muted" style={{ fontSize: "0.7rem" }}>
            {RECIPIENT_TYPE_LABEL[row.recipient_type] || row.recipient_type || ""}
          </span>
        </div>
      ),
    },
    {
      name: t("Event"),
      width: "180px",
      wrap: true,
      cell: (row) => (
        <span className="text-muted small">{row.event_key || "—"}</span>
      ),
    },
    ...(channel === "email"
      ? [
          {
            name: t("Subject"),
            minWidth: "260px",
            wrap: true,
            cell: (row) => (
              <span className="small">{row.subject || "—"}</span>
            ),
          },
        ]
      : [
          {
            name: t("Preview"),
            minWidth: "260px",
            wrap: true,
            cell: (row) => (
              <span className="small">{row.body_preview || "—"}</span>
            ),
          },
        ]),
    {
      name: t("Status"),
      width: "120px",
      cell: (row) => (
        <span className={`doc-badge ${STATUS_BADGE[row.status] || "doc-badge-gray"}`}>
          {t(row.status || "—")}
        </span>
      ),
    },
    {
      name: t("Actions"),
      width: "120px",
      center: true,
      cell: (row) => (
        <span
          className="cursor-pointer"
          id={`view-${row._id}`}
          onClick={() => openDetail(row._id)}
        >
          <Eye size={16} className="text-primary" />
        </span>
      ),
    },
  ];

  const detail = store?.messageLogItem;

  return (
    <Fragment>
      <Card>
        <CardBody>
          {/* ── Title Row ── */}
          <Row className="mb-2 align-items-center">
            <Col xs={12}>
              <h4 className="mb-0 d-flex align-items-center gap-2">
                <span className="text-primary">{meta.icon}</span>
                {t(meta.title)}
              </h4>
            </Col>
          </Row>

          {/* ── Filter Row ── */}
          <Row className="mb-1 g-2">
            <Col md={3} sm={6}>
              <Label className="small fw-semibold mb-50">{t("Recipient")}</Label>
              <Input
                type="search"
                placeholder={t("Search by email or phone...")}
                value={recipientFilter}
                onChange={(e) => {
                  setRecipientFilter(e.target.value);
                  setCurrentPage(1);
                  handleList(
                    1,
                    rowsPerPage,
                    e.target.value,
                    statusFilter,
                    eventFilter,
                    dateFrom,
                    dateTo
                  );
                }}
                bsSize="sm"
              />
            </Col>
            <Col md={3} sm={6}>
              <Label className="small fw-semibold mb-50">{t("Event")}</Label>
              <Input
                type="text"
                placeholder={t("e.g. LEAVE_REQUESTED")}
                value={eventFilter}
                onChange={(e) => {
                  setEventFilter(e.target.value);
                  setCurrentPage(1);
                  handleList(
                    1,
                    rowsPerPage,
                    recipientFilter,
                    statusFilter,
                    e.target.value,
                    dateFrom,
                    dateTo
                  );
                }}
                bsSize="sm"
              />
            </Col>
            <Col md={2} sm={4}>
              <Label className="small fw-semibold mb-50">{t("Status")}</Label>
              <Input
                type="select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                  handleList(
                    1,
                    rowsPerPage,
                    recipientFilter,
                    e.target.value,
                    eventFilter,
                    dateFrom,
                    dateTo
                  );
                }}
                bsSize="sm"
              >
                <option value="">{t("All")}</option>
                <option value="sent">{t("Sent")}</option>
                <option value="failed">{t("Failed")}</option>
                <option value="queued">{t("Queued")}</option>
                <option value="skipped">{t("Skipped")}</option>
              </Input>
            </Col>
            <Col md={2} sm={4}>
              <Label className="small fw-semibold mb-50">{t("From")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                  handleList(
                    1,
                    rowsPerPage,
                    recipientFilter,
                    statusFilter,
                    eventFilter,
                    e.target.value,
                    dateTo
                  );
                }}
                bsSize="sm"
              />
            </Col>
            <Col md={2} sm={4}>
              <Label className="small fw-semibold mb-50">{t("To")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                  handleList(
                    1,
                    rowsPerPage,
                    recipientFilter,
                    statusFilter,
                    eventFilter,
                    dateFrom,
                    e.target.value
                  );
                }}
                bsSize="sm"
              />
            </Col>
          </Row>

          <DatatablePagination
            columns={columns}
            data={store?.messageLogItems || []}
            pagination={{
              total: store?.pagination?.total || 0,
              perPage: rowsPerPage,
            }}
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            handlePagination={handlePagination}
            handleRowPerPage={handleRowPerPage}
            loading={store?.loading}
          />
        </CardBody>
      </Card>

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={detailOpen}
        toggle={closeDetail}
        centered
        size="lg"
        backdrop="static"
        keyboard={false}
      >
        <ModalHeader
          toggle={closeDetail}
          style={{ backgroundColor: "#09418B", padding: "1.25rem 1.5rem" }}
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={closeDetail}
            />
          }
        >
          <span style={{ color: "#ffffff" }}>{t("Message Log Detail")}</span>
        </ModalHeader>
        <ModalBody>
          {!detail && <div className="text-center py-3">{t("Loading...")}</div>}
          {detail && (
            <Row className="g-3">
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Sent At")}</Label>
                <div>{formatDateTime(detail.sent_at || detail.createdAt)}</div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Status")}</Label>
                <div>
                  <span
                    className={`doc-badge ${
                      STATUS_BADGE[detail.status] || "doc-badge-gray"
                    }`}
                  >
                    {t(detail.status || "—")}
                  </span>
                </div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Channel")}</Label>
                <div className="text-capitalize">{detail.channel}</div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Provider")}</Label>
                <div>{detail.provider || "—"}</div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Recipient")}</Label>
                <div>{detail.recipient_name || "—"}</div>
                <div className="text-muted small">{detail.recipient_address}</div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Recipient Type")}</Label>
                <div>
                  {RECIPIENT_TYPE_LABEL[detail.recipient_type] ||
                    detail.recipient_type ||
                    "—"}
                </div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Event")}</Label>
                <div>{detail.event_key || "—"}</div>
              </Col>
              <Col md={6}>
                <Label className="fw-semibold mb-1">{t("Provider Message ID")}</Label>
                <div className="small text-truncate">
                  {detail.provider_message_id || "—"}
                </div>
              </Col>
              {detail.subject && (
                <Col md={12}>
                  <Label className="fw-semibold mb-1">{t("Subject")}</Label>
                  <div>{detail.subject}</div>
                </Col>
              )}
              {detail.body_preview && (
                <Col md={12}>
                  <Label className="fw-semibold mb-1">{t("Body Preview")}</Label>
                  <div
                    className="p-2 rounded small"
                    style={{
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #e5e7eb",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {detail.body_preview}
                  </div>
                </Col>
              )}
              {detail.error_message && (
                <Col md={12}>
                  <Label className="fw-semibold mb-1 text-danger">
                    {t("Error")}
                  </Label>
                  <div
                    className="p-2 rounded small text-danger"
                    style={{
                      backgroundColor: "#fff5f5",
                      border: "1px solid #fed7d7",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {detail.error_message}
                  </div>
                </Col>
              )}
              {(detail.related_entity_type || detail.related_entity_id) && (
                <Col md={12}>
                  <Label className="fw-semibold mb-1">{t("Related Entity")}</Label>
                  <div className="small text-muted">
                    {detail.related_entity_type || "—"}
                    {detail.related_entity_id ? ` · ${detail.related_entity_id}` : ""}
                  </div>
                </Col>
              )}
            </Row>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={closeDetail}>
            {t("Close")}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default MessageLogList;
