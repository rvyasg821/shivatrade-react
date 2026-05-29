import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Table,
  Row,
  Col,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Label,
  Input,
  FormGroup,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Badge,
} from "reactstrap";
import {
  Calendar,
  DollarSign,
  Edit,
  ArrowLeft,
  Anchor,
  Wind,
  CheckCircle,
  XCircle,
  Hash,
  Globe,
  Truck,
  Package,
  FileText,
  Activity,
  Paperclip,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getShipping,
  transitionShipping,
  cancelShipping,
  cleanShippingMessage,
  retractShippingEvent,
} from "@src/views/shipping/store";
import AddShippingEventModal from "@src/views/shipping/components/AddShippingEventModal";
import Notification from "@components/toast/notification";
import {
  appsRoot,
  assessmentReportPdfUrl,
  isAdminUser,
} from "@constant/defaultValues";
import {
  SHIPPING_PIPELINE_STEPS as PIPELINE_STEPS,
  SHIPPING_TERMINAL_STEPS as TERMINAL_STEPS,
  SHIPPING_STATUS_BADGE_COLOR as STATUS_COLORS,
  SHIPPING_NEXT_STEP as NEXT_STEP,
  SHIPPING_EVENT_TYPE_LABEL,
} from "@constant/options";
import { formatDate, formatDateTime } from "@src/utility/dateFormat";
import DateInput from "@components/date-input";

import {
  DetailHeader,
  DetailPipeline,
  DetailKpiStrip,
  DetailFieldList,
  DetailPanel,
  DetailTwoPanel,
} from "@src/views/_shared/detail-page";

const ViewShipping = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mySwal = withReactContent(Swal);

  const store = useSelector((s) => s.shipping);
  const ship = store?.shippingItem || {};

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.shipping;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;
  const canDelete = isAdmin || perms?.can_all || perms?.can_delete;

  const [busy, setBusy] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionDate, setTransitionDate] = useState("");
  const [transitionError, setTransitionError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [addEventOpen, setAddEventOpen] = useState(false);

  const resolveAttachmentHref = (rel) => {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    const base = (assessmentReportPdfUrl || "").replace(/\/$/, "");
    const path = rel.replace(/^\//, "").replace(/^assets\//, "");
    return `${base}/${path}`;
  };

  useEffect(() => {
    if (id) dispatch(getShipping(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.success || store?.error) dispatch(cleanShippingMessage());
  }, [store?.success, store?.error, dispatch]);

  const statusLower = (ship?.status || "").toLowerCase();
  const next = NEXT_STEP[statusLower];
  const ModeIcon = ship?.mode?.startsWith("air") ? Wind : Anchor;
  const isCancellable = statusLower !== "delivered" && statusLower !== "cancelled";

  const openTransitionModal = () => {
    if (!next) return;
    setTransitionDate("");
    setTransitionError("");
    setTransitionModalOpen(true);
  };

  const closeTransitionModal = () => {
    setTransitionModalOpen(false);
    setTransitionDate("");
    setTransitionError("");
  };

  const submitTransition = () => {
    if (!next) return;
    if (!transitionDate) {
      setTransitionError(t("Date is required"));
      return;
    }
    const body = { to: next.to };
    body[next.dateField] = transitionDate;
    setBusy(true);
    dispatch(transitionShipping({ id, data: body }))
      .unwrap()
      .then(() => closeTransitionModal())
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  const handleRetractEvent = (ev) => {
    mySwal
      .fire({
        title: t("Retract this event?"),
        text: t(
          "It stays in the audit log struck through. Provide a reason."
        ),
        icon: "warning",
        input: "textarea",
        inputPlaceholder: t("Reason (required)"),
        inputValidator: (v) =>
          !v || !v.trim() ? t("A reason is required.") : undefined,
        showCancelButton: true,
        confirmButtonText: t("Yes, retract"),
        cancelButtonText: t("Keep event"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        dispatch(
          retractShippingEvent({
            shippingId: id,
            eventId: ev._id,
            reason: res.value.trim(),
          })
        )
          .unwrap()
          .then(() => dispatch(getShipping(id)))
          .catch(() => {});
      });
  };

  const handleCancel = () => {
    mySwal
      .fire({
        title: t("Cancel Shipping?"),
        input: "text",
        inputLabel: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, cancel"),
        cancelButtonText: t("Back"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        setBusy(true);
        dispatch(cancelShipping({ id, reason: res.value || undefined }))
          .unwrap()
          .catch(() => {})
          .finally(() => setBusy(false));
      });
  };

  const headerActions = useMemo(() => {
    const a = [];
    if (canEdit && statusLower === "draft") {
      a.push({
        icon: Edit,
        label: t("Edit"),
        onClick: () => navigate(`${appsRoot}/shipping/edit/${id}`),
      });
    }
    if (canEdit && next) {
      a.push({
        icon: CheckCircle,
        label: t(next.label),
        onClick: openTransitionModal,
        color: "success",
      });
    }
    if (canDelete && isCancellable) {
      a.push({
        icon: XCircle,
        label: t("Cancel"),
        onClick: handleCancel,
        color: "danger",
        outline: true,
      });
    }
    a.push({
      icon: ArrowLeft,
      label: t("Back"),
      onClick: () => navigate(`${appsRoot}/shipping`),
    });
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, canDelete, statusLower, next, id, t]);

  const kpiItems = [
    {
      key: "mode",
      label: t("Mode"),
      value: (ship?.mode || "").replace(/_/g, " ").toUpperCase(),
      icon: ModeIcon,
      tone: "secondary",
    },
    {
      key: "dispatch",
      label: t("Dispatch"),
      value: ship?.actual_dispatch_date
        ? formatDate(ship.actual_dispatch_date)
        : ship?.etd
        ? `~ ${formatDate(ship.etd)}`
        : "-",
      icon: Truck,
      tone: ship?.actual_dispatch_date ? "success" : "secondary",
    },
    {
      key: "arrival",
      label: t("Arrival"),
      value: ship?.actual_arrival_date
        ? formatDate(ship.actual_arrival_date)
        : ship?.eta
        ? `~ ${formatDate(ship.eta)}`
        : "-",
      icon: Calendar,
      tone: ship?.actual_arrival_date ? "success" : "secondary",
    },
    {
      key: "cost",
      label: t("Total Cost"),
      value: ship?.total_cost_inr
        ? `₹${Number(ship.total_cost_inr).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`
        : "-",
      icon: DollarSign,
      tone: "secondary",
    },
  ];

  if (!ship?._id) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  const routeFields = [
    {
      icon: Globe,
      label: t("Loading"),
      value:
        ship.port_of_loading_snapshot?.code +
        " - " +
        ship.port_of_loading_snapshot?.name,
    },
    {
      icon: Globe,
      label: t("Discharge"),
      value: ship.port_of_discharge_snapshot?.name,
    },
    ship.place_of_receipt && {
      icon: Globe,
      label: t("Place of Receipt"),
      value: ship.place_of_receipt,
    },
    ship.place_of_delivery && {
      icon: Globe,
      label: t("Place of Delivery"),
      value: ship.place_of_delivery,
    },
    { icon: Globe, label: t("Country"), value: ship.country_of_destination },
  ].filter(Boolean);

  const transportFields = [
    ship.bl_awb_no && {
      icon: Hash,
      label: ship.bl_awb_type || "BL/AWB",
      value: `${ship.bl_awb_no}${ship.bl_awb_date ? " (" + formatDate(ship.bl_awb_date) + ")" : ""}`,
    },
    ship.container_no && {
      icon: Package,
      label: t("Container"),
      value: `${ship.container_no}${ship.seal_no ? " / Seal " + ship.seal_no : ""}${ship.container_type ? " · " + ship.container_type : ""}`,
    },
    ship.vessel_name && {
      icon: Anchor,
      label: t("Vessel"),
      value: `${ship.vessel_name}${ship.voyage_no ? " / " + ship.voyage_no : ""}`,
    },
    ship.flight_no && {
      icon: Wind,
      label: t("Flight"),
      value: ship.flight_no,
    },
  ].filter(Boolean);

  const customsFields = [
    ship.shipping_bill_no && {
      icon: Hash,
      label: t("Shipping Bill"),
      value: `${ship.shipping_bill_no}${ship.shipping_bill_date ? " (" + formatDate(ship.shipping_bill_date) + ")" : ""}${ship.shipping_bill_type ? " · " + ship.shipping_bill_type : ""}`,
    },
    ship.let_export_order_date && {
      icon: Calendar,
      label: t("LEO Date"),
      value: formatDate(ship.let_export_order_date),
    },
    ship.egm_no && {
      icon: Hash,
      label: t("EGM"),
      value: `${ship.egm_no}${ship.egm_date ? " (" + formatDate(ship.egm_date) + ")" : ""}`,
    },
    ship.iec_code && { icon: Hash, label: t("IEC"), value: ship.iec_code },
    ship.ad_code && { icon: Hash, label: t("AD Code"), value: ship.ad_code },
  ].filter(Boolean);

  const cargoFields = [
    ship.total_packages && {
      icon: Package,
      label: t("Packages"),
      value: `${ship.total_packages}${ship.package_type ? " " + ship.package_type : ""}`,
    },
    ship.net_weight_kg && {
      icon: Package,
      label: t("Net Weight"),
      value: `${ship.net_weight_kg} kg`,
    },
    ship.gross_weight_kg && {
      icon: Package,
      label: t("Gross Weight"),
      value: `${ship.gross_weight_kg} kg`,
    },
    ship.volume_cbm && {
      icon: Package,
      label: t("Volume"),
      value: `${ship.volume_cbm} CBM`,
    },
  ].filter(Boolean);

  const events = ship.events || [];
  const invoices = ship.invoices || [];

  return (
    <Fragment>
      <div className="app-user-view">
        <DetailHeader
          avatarText="S"
          title={ship?.voucher_no || t("(Draft)")}
          subtitle={
            [
              ship?.consignee_snapshot?.company_name,
              ship?.country_of_destination,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          meta={
            ship?._id ? (
              <span>
                <Hash size={12} className="me-25" />
                {ship._id.slice(-8).toUpperCase()}
              </span>
            ) : null
          }
          badge={{
            label: statusLower.replace("_", " "),
            color: STATUS_COLORS[statusLower] || "secondary",
          }}
          actions={headerActions}
          moreActions={[]}
          belowSlot={
            <DetailPipeline
              steps={PIPELINE_STEPS}
              current={statusLower}
              terminalSteps={TERMINAL_STEPS}
            />
          }
        />

        <DetailKpiStrip items={kpiItems} />

        <DetailTwoPanel
          ratio="9-3"
          left={
            <Card className="mb-1">
              <CardBody>
                <Nav pills className="mb-2">
                  <NavItem>
                    <NavLink
                      active={activeTab === "overview"}
                      onClick={() => setActiveTab("overview")}
                      style={{
                        color: activeTab === "overview" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <FileText size={16} className="me-50" />
                      {t("Overview")}
                      {invoices.length > 0 && (
                        <span
                          className="badge ms-1"
                          style={{
                            background:
                              activeTab === "overview"
                                ? "rgba(255,255,255,0.25)"
                                : "#eef0f3",
                            color:
                              activeTab === "overview" ? "#fff" : "#1a2238",
                          }}
                        >
                          {invoices.length}
                        </span>
                      )}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      active={activeTab === "tracking"}
                      onClick={() => setActiveTab("tracking")}
                      style={{
                        color: activeTab === "tracking" ? "#fff" : "#1a2238",
                        display: "inline-flex",
                        alignItems: "center",
                        height: 38,
                        padding: "0 14px",
                      }}
                    >
                      <Activity size={16} className="me-50" />
                      {t("Tracking")}
                      {events.length > 0 && (
                        <span
                          className="badge ms-1"
                          style={{
                            background:
                              activeTab === "tracking"
                                ? "rgba(255,255,255,0.25)"
                                : "#eef0f3",
                            color:
                              activeTab === "tracking" ? "#fff" : "#1a2238",
                          }}
                        >
                          {events.length}
                        </span>
                      )}
                    </NavLink>
                  </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                  <TabPane tabId="overview">
                    {/* Attached Invoices */}
                    <div className="mb-3">
                      <h5 className="mb-1">{t("Attached Invoices")}</h5>
                      {invoices.length === 0 ? (
                        <div className="text-muted text-center py-2 small">
                          {t("No invoices attached")}
                        </div>
                      ) : (
                        <Table
                          responsive
                          bordered
                          size="sm"
                          className="align-middle mb-0"
                        >
                          <thead className="table-light">
                            <tr>
                              <th>{t("Invoice #")}</th>
                              <th className="text-end">{t("Amount")}</th>
                              <th>{t("Currency")}</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv) => (
                              <tr key={inv._id}>
                                <td>
                                  <a
                                    href={`${appsRoot}/invoices/view/${inv.invoice_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fw-semibold"
                                  >
                                    {inv.invoice_voucher_no ||
                                      inv.invoice_id?.slice(-8)}
                                  </a>
                                </td>
                                <td className="text-end">
                                  {Number(
                                    inv.invoice_grand_total || 0
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td>{inv.invoice_currency_code}</td>
                                <td />
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </div>

                    {/* Costs */}
                    <div className="mb-3">
                      <h5 className="mb-1">{t("Costs")}</h5>
                      {(() => {
                        const inr = (v) =>
                          `₹${Number(v || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`;
                        const rows = [
                          [t("Freight"), ship.freight_charges_inr],
                          [t("Insurance"), ship.insurance_charges_inr],
                          [t("CHA"), ship.cha_charges_inr],
                          [t("Forwarder"), ship.forwarder_charges_inr],
                          [t("Other"), ship.other_charges_inr],
                        ];
                        return (
                          <div
                            className="small"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {rows.map(([label, value]) => (
                              <div
                                key={label}
                                className="d-flex justify-content-between py-25"
                              >
                                <span className="text-muted">{label}</span>
                                <span>{inr(value)}</span>
                              </div>
                            ))}
                            <div className="d-flex justify-content-between py-25 border-top pt-25 mt-1">
                              <span className="fw-semibold">{t("Total")}</span>
                              <span
                                className="fw-bold"
                                style={{ fontSize: "1.05rem" }}
                              >
                                {inr(ship.total_cost_inr)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </TabPane>

                  <TabPane tabId="tracking">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">{t("Event Timeline")}</h5>
                      {canEdit &&
                        statusLower !== "draft" &&
                        statusLower !== "cancelled" && (
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => setAddEventOpen(true)}
                          >
                            <FileText size={14} className="me-25" />
                            {t("Add Event")}
                          </Button>
                        )}
                    </div>
                    {events.length === 0 ? (
                      <div className="text-muted text-center py-3 small">
                        {t("No tracking events yet.")}
                      </div>
                    ) : (
                      <ul className="timeline ms-50">
                        {events.map((e) => {
                          const isSystem = !!e.is_system;
                          const retracted = !!e.soft_delete;
                          const bodyStyle = retracted
                            ? {
                                textDecoration: "line-through",
                                opacity: 0.6,
                              }
                            : undefined;
                          const label =
                            SHIPPING_EVENT_TYPE_LABEL[e.type] ||
                            e.type_other ||
                            (e.type || t("Event")).replace(/_/g, " ");
                          return (
                            <li key={e._id} className="timeline-item">
                              <span
                                className={`timeline-point timeline-point-indicator ${
                                  retracted
                                    ? "timeline-point-secondary"
                                    : isSystem
                                    ? "timeline-point-info"
                                    : ""
                                }`}
                              />
                              <div className="timeline-event">
                                <div className="d-flex justify-content-between flex-wrap mb-50">
                                  <h6
                                    className="mb-0 text-capitalize"
                                    style={bodyStyle}
                                  >
                                    {label}
                                    {isSystem && !retracted && (
                                      <Badge
                                        color="light-info"
                                        className="ms-50"
                                      >
                                        {t("System")}
                                      </Badge>
                                    )}
                                    {retracted && (
                                      <Badge
                                        color="light-secondary"
                                        className="ms-50"
                                      >
                                        {t("Retracted")}
                                      </Badge>
                                    )}
                                  </h6>
                                  <div className="d-flex align-items-center">
                                    <span
                                      className="text-muted small"
                                      style={bodyStyle}
                                    >
                                      {e.occurred_at
                                        ? formatDateTime(e.occurred_at)
                                        : "-"}
                                    </span>
                                    {!retracted &&
                                      !isSystem &&
                                      canEdit && (
                                        <XCircle
                                          size={14}
                                          className="cursor-pointer text-danger ms-1"
                                          onClick={() =>
                                            handleRetractEvent(e)
                                          }
                                        />
                                      )}
                                  </div>
                                </div>
                                {e.location && (
                                  <p
                                    className="mb-25 small"
                                    style={bodyStyle}
                                  >
                                    <strong>{t("Location:")}</strong>{" "}
                                    {e.location}
                                  </p>
                                )}
                                {e.notes && (
                                  <p
                                    className="mb-25 small"
                                    style={{
                                      whiteSpace: "pre-line",
                                      ...(bodyStyle || {}),
                                    }}
                                  >
                                    {e.notes}
                                  </p>
                                )}
                                <div
                                  className="d-flex align-items-center flex-wrap mt-50"
                                  style={bodyStyle}
                                >
                                  {e.created_by_name && (
                                    <span className="text-muted small">
                                      {t("— Logged by")} {e.created_by_name}
                                    </span>
                                  )}
                                  {e.attachment_url && (
                                    <a
                                      href={resolveAttachmentHref(
                                        e.attachment_url
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ms-1 small d-inline-flex align-items-center"
                                    >
                                      <Paperclip
                                        size={14}
                                        className="me-25"
                                      />
                                      {t("Attachment")}
                                    </a>
                                  )}
                                </div>
                                {retracted && (
                                  <div className="mt-50 small text-warning">
                                    <strong>{t("Retracted by")}</strong>{" "}
                                    {e.deleted_by_name || t("user")}
                                    {e.deleted_at
                                      ? ` · ${formatDateTime(e.deleted_at)}`
                                      : ""}
                                    {e.deleted_reason && (
                                      <div className="text-muted">
                                        <strong>{t("Reason:")}</strong>{" "}
                                        {e.deleted_reason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </TabPane>
                </TabContent>
              </CardBody>
            </Card>
          }
          right={
            <Fragment>
              {routeFields.length > 0 && (
                <DetailPanel title={t("Route")}>
                  <DetailFieldList items={routeFields} />
                </DetailPanel>
              )}
              {transportFields.length > 0 && (
                <DetailPanel title={t("Transport")}>
                  <DetailFieldList items={transportFields} />
                </DetailPanel>
              )}
              {customsFields.length > 0 && (
                <DetailPanel title={t("Customs / DGFT")}>
                  <DetailFieldList items={customsFields} />
                </DetailPanel>
              )}
              {cargoFields.length > 0 && (
                <DetailPanel title={t("Cargo")}>
                  <DetailFieldList items={cargoFields} />
                </DetailPanel>
              )}
              {(ship.notes || ship.internal_notes) && (
                <DetailPanel title={t("Notes")}>
                  {ship.notes && (
                    <div className="small mb-1">
                      <div className="text-muted mb-25">{t("Public")}</div>
                      <div className="text-break" style={{ whiteSpace: "pre-line" }}>
                        {ship.notes}
                      </div>
                    </div>
                  )}
                  {ship.internal_notes && (
                    <div className="small mt-1 pt-1 border-top">
                      <div className="text-muted mb-25">{t("Internal")}</div>
                      <div className="text-break" style={{ whiteSpace: "pre-line" }}>
                        {ship.internal_notes}
                      </div>
                    </div>
                  )}
                </DetailPanel>
              )}
              {ship.cancelled_reason && (
                <DetailPanel title={t("Cancellation")}>
                  <div className="small">
                    <div className="text-danger fw-semibold mb-25">
                      {t("Cancelled")}
                    </div>
                    {ship.cancelled_at && (
                      <div className="text-muted">{formatDate(ship.cancelled_at)}</div>
                    )}
                    <div className="mt-25">{ship.cancelled_reason}</div>
                  </div>
                </DetailPanel>
              )}
            </Fragment>
          }
        />
      </div>

      <Modal
        isOpen={transitionModalOpen}
        toggle={closeTransitionModal}
        centered
        backdrop="static"
      >
        <ModalHeader toggle={closeTransitionModal}>
          {next ? t(next.label) : ""}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label className="form-label">
              {next ? t(next.dateLabel) : t("Date")}
              <span className="text-danger"> *</span>
            </Label>
            <DateInput
              value={transitionDate}
              onChange={(_dates, _disp, iso) => {
                setTransitionDate(iso || "");
                if (iso) setTransitionError("");
              }}
              invalid={!!transitionError}
            />
            {transitionError && (
              <div className="text-danger small mt-25">{transitionError}</div>
            )}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            color="outline-secondary"
            onClick={closeTransitionModal}
            disabled={busy}
          >
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={submitTransition} disabled={busy}>
            {busy && <Spinner size="sm" className="me-50" />}
            {t("Confirm")}
          </Button>
        </ModalFooter>
      </Modal>

      <AddShippingEventModal
        open={addEventOpen}
        toggle={() => setAddEventOpen((v) => !v)}
        shippingId={id}
        onCreated={() => dispatch(getShipping(id))}
      />
    </Fragment>
  );
};

export default ViewShipping;
