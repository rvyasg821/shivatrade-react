// Shipping detail page - composes the shared detail-page kit.
// Workflow controls (Book / Dispatch / Arrived / Cleared / Delivered / Cancel)
// live in the header. Read-only sections below.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  Row,
  Col,
  Spinner,
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
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  getShipping,
  transitionShipping,
  cancelShipping,
  cleanShippingMessage,
} from "@src/views/shipping/store";
import Notification from "@components/toast/notification";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import {
  SHIPPING_PIPELINE_STEPS as PIPELINE_STEPS,
  SHIPPING_TERMINAL_STEPS as TERMINAL_STEPS,
  SHIPPING_STATUS_BADGE_COLOR as STATUS_COLORS,
  SHIPPING_NEXT_STEP as NEXT_STEP,
} from "@constant/options";
import { formatDate } from "@src/utility/dateFormat";

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

  const handleTransition = () => {
    if (!next) return;
    mySwal
      .fire({
        title: t(next.label) + "?",
        input: "date",
        inputLabel: t(next.dateLabel),
        showCancelButton: true,
        confirmButtonText: t("Confirm"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
        inputValidator: (v) => (!v ? t("Date is required") : null),
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        const body = { to: next.to };
        body[next.dateField] = res.value;
        setBusy(true);
        dispatch(transitionShipping({ id, data: body }))
          .unwrap()
          .catch(() => {})
          .finally(() => setBusy(false));
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
        onClick: handleTransition,
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
            <Fragment>
              {/* Invoices */}
              <Card className="mb-2">
                <CardHeader className="border-bottom py-1">
                  <CardTitle tag="h5" className="mb-0">
                    {t("Attached Invoices")}
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-2">
                  {invoices.length === 0 ? (
                    <div className="text-muted text-center py-2 small">
                      {t("No invoices attached")}
                    </div>
                  ) : (
                    <Table responsive bordered size="sm" className="align-middle mb-0">
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
                                {inv.invoice_voucher_no || inv.invoice_id?.slice(-8)}
                              </a>
                            </td>
                            <td className="text-end">
                              {Number(inv.invoice_grand_total || 0).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                              )}
                            </td>
                            <td>{inv.invoice_currency_code}</td>
                            <td />
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>

              {/* Costs */}
              <Card className="mb-2">
                <CardHeader className="border-bottom py-1">
                  <CardTitle tag="h5" className="mb-0">
                    {t("Costs (INR)")}
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-2">
                  <Row className="small">
                    <Col md="6">
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Freight")}</span>
                        <span>₹{Number(ship.freight_charges_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Insurance")}</span>
                        <span>₹{Number(ship.insurance_charges_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("CHA")}</span>
                        <span>₹{Number(ship.cha_charges_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Forwarder")}</span>
                        <span>₹{Number(ship.forwarder_charges_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                      <div className="d-flex justify-content-between py-25">
                        <span className="text-muted">{t("Other")}</span>
                        <span>₹{Number(ship.other_charges_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                    </Col>
                    <Col md="6" className="d-flex align-items-center justify-content-end">
                      <div className="border-top border-bottom py-1 text-end" style={{ minWidth: 220 }}>
                        <div className="text-muted small">{t("Total Cost")}</div>
                        <div className="fw-bold" style={{ fontSize: "1.1rem" }}>
                          ₹{Number(ship.total_cost_inr || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Timeline */}
              <Card className="mb-2">
                <CardHeader className="border-bottom py-1">
                  <CardTitle tag="h5" className="mb-0">
                    {t("Timeline")}
                  </CardTitle>
                </CardHeader>
                <CardBody className="pt-2">
                  {events.length === 0 ? (
                    <div className="text-muted text-center py-2 small">
                      {t("No events yet")}
                    </div>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {events.map((e) => (
                        <li key={e._id} className="d-flex mb-1 small">
                          <div
                            className="me-1"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: e.is_system ? "#0d6efd" : "#6c757d",
                              marginTop: 5,
                              flexShrink: 0,
                            }}
                          />
                          <div className="flex-grow-1">
                            <div className="fw-semibold text-capitalize">
                              {(e.type || "").replace(/_/g, " ")}
                              {e.is_system && (
                                <span className="badge bg-light text-muted ms-1">
                                  {t("system")}
                                </span>
                              )}
                            </div>
                            <div className="text-muted">
                              {e.occurred_at ? formatDate(e.occurred_at) : ""}
                              {e.location ? " · " + e.location : ""}
                            </div>
                            {e.notes && <div>{e.notes}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </Fragment>
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
    </Fragment>
  );
};

export default ViewShipping;
