// PO Vendor — info card (left column of detail page).
// Action buttons (Mark Dispatched / Mark Received / Cancel) are
// contextual to status. Modal flows for dispatch/receive ship in
// Phase 8; cancel uses an inline SweetAlert now.

import { Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Badge,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import {
  Hash,
  User,
  Calendar,
  Truck,
  FileText,
  ExternalLink,
  Send,
  Inbox,
  X as XIcon,
  Phone,
  Mail,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import { cancelPoVendor } from "@src/views/po-vendors/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PO_VENDOR_STATUS_BADGE_COLOR } from "@constant/options";

const InfoRow = ({ icon: Icon, value }) => {
  if (!value) return null;
  return (
    <li className="d-flex align-items-start mb-50">
      <Icon size={14} className="me-50 mt-25 text-muted flex-shrink-0" />
      <span
        className="flex-grow-1 text-break small"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </li>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="text-muted text-uppercase fw-bold mb-50"
    style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
  >
    {children}
  </div>
);

const PoVendorInfoCard = ({ onOpenDispatch, onOpenReceive }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};

  const status = (p?.status || "").toLowerCase();
  const statusColor = PO_VENDOR_STATUS_BADGE_COLOR[status] || "secondary";

  // Permission gating — all action buttons require po-vendors.can_update
  // (or can_all). Admin / Company Admin always pass.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canUpdate = isAdmin || perms?.can_all || perms?.can_update;

  const canDispatch = canUpdate && status === "draft";
  const canReceive = canUpdate && status === "dispatched";
  const canCancel =
    canUpdate && (status === "draft" || status === "dispatched");
  const canEditTracking =
    canUpdate && (status === "draft" || status === "dispatched");

  const handleCancel = () => {
    mySwal
      .fire({
        title: t("Cancel this POV?"),
        text: t(
          "Its ordered quantities will be released back to PO pending and can be re-issued on a new POV."
        ),
        icon: "warning",
        input: "text",
        inputPlaceholder: t("Reason (optional)"),
        showCancelButton: true,
        confirmButtonText: t("Yes, cancel POV"),
        cancelButtonText: t("Keep open"),
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-outline-secondary ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(cancelPoVendor({ id, reason: result.value }));
        }
      });
  };

  const dateRange = p?.dispatch_date
    ? `${(p.dispatch_date || "").slice(0, 10)}${
        p?.expected_arrival_date
          ? ` → ${p.expected_arrival_date.slice(0, 10)}`
          : ""
      }`
    : null;

  return (
    <Fragment>
      <Card>
        <CardBody>
          {/* Hero */}
          <div className="d-flex flex-column align-items-center text-center mt-2 mb-2">
            <div
              className={`d-flex align-items-center justify-content-center rounded mb-1 bg-light-${statusColor}`}
              style={{ width: 88, height: 88 }}
            >
              <Truck
                size={44}
                className={`text-${statusColor}`}
                strokeWidth={1.5}
              />
            </div>
            <h4 className="text-break mb-25">{p?.voucher_no || "-"}</h4>
            <Badge
              color={`light-${statusColor}`}
              className={`badge-light-${statusColor} text-capitalize`}
            >
              {p?.status || "-"}
            </Badge>
          </div>

          {/* Source PO */}
          {p?.purchase_order_id && (
            <Fragment>
              <SectionLabel>{t("Source PO")}</SectionLabel>
              <ul className="list-unstyled mb-1">
                <InfoRow
                  icon={FileText}
                  value={
                    <span className="d-inline-flex align-items-center">
                      {p?.purchase_order_voucher_no || p.purchase_order_id}
                      <a
                        href={`${appsRoot}/purchase-orders/view/${p.purchase_order_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("Open PO in new tab")}
                        className="text-decoration-none ms-1"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </span>
                  }
                />
              </ul>
            </Fragment>
          )}

          {/* Vendor */}
          <SectionLabel>{t("Vendor")}</SectionLabel>
          <ul className="list-unstyled mb-1">
            <InfoRow icon={User} value={p?.vendor_name} />
            <InfoRow icon={User} value={p?.vendor_contact_name} />
            <InfoRow icon={Mail} value={p?.vendor_contact_email} />
            <InfoRow icon={Phone} value={p?.vendor_contact_phone} />
          </ul>

          {/* Dates */}
          <SectionLabel>{t("Dates")}</SectionLabel>
          <ul className="list-unstyled mb-1">
            <InfoRow icon={Calendar} value={dateRange} />
            {p?.actual_arrival_date && (
              <InfoRow
                icon={Inbox}
                value={`${t("Arrived")} · ${p.actual_arrival_date.slice(
                  0,
                  10
                )}`}
              />
            )}
          </ul>

          {/* Transport snapshot */}
          {(p?.lr_no || p?.eway_bill_no || p?.vehicle_no) && (
            <Fragment>
              <SectionLabel>{t("Transport")}</SectionLabel>
              <ul className="list-unstyled mb-1">
                {p?.lr_no && (
                  <InfoRow
                    icon={Hash}
                    value={`${t("LR")} · ${p.lr_no}${
                      p?.lr_date ? ` (${p.lr_date.slice(0, 10)})` : ""
                    }`}
                  />
                )}
                {p?.eway_bill_no && (
                  <InfoRow
                    icon={Hash}
                    value={`${t("E-way")} · ${p.eway_bill_no}${
                      p?.eway_bill_date
                        ? ` (${p.eway_bill_date.slice(0, 10)})`
                        : ""
                    }`}
                  />
                )}
                <InfoRow icon={Truck} value={p?.vehicle_no} />
                <InfoRow icon={User} value={p?.transporter_name} />
              </ul>
            </Fragment>
          )}

          {/* Delivery address */}
          {p?.delivery_address && (
            <Fragment>
              <SectionLabel>{t("Deliver To")}</SectionLabel>
              <ul className="list-unstyled mb-2">
                <InfoRow
                  icon={Truck}
                  value={
                    <pre
                      className="mb-0 small"
                      style={{
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                      }}
                    >
                      {p.delivery_address}
                    </pre>
                  }
                />
              </ul>
            </Fragment>
          )}

          {/* Actions (contextual to status) */}
          <div className="d-grid gap-1 mt-2">
            {canDispatch && (
              <Fragment>
                <Button
                  color="primary"
                  onClick={onOpenDispatch}
                  id="pov-dispatch"
                >
                  <Send size={14} className="me-50" /> {t("Mark Dispatched")}
                </Button>
                <UncontrolledTooltip target="pov-dispatch" placement="top">
                  {t("Record dispatched quantities + transport details")}
                </UncontrolledTooltip>
              </Fragment>
            )}
            {canReceive && (
              <Fragment>
                <Button
                  color="success"
                  onClick={onOpenReceive}
                  id="pov-receive"
                >
                  <Inbox size={14} className="me-50" /> {t("Mark Received")}
                </Button>
                <UncontrolledTooltip target="pov-receive" placement="top">
                  {t("Record received quantities and close this POV")}
                </UncontrolledTooltip>
              </Fragment>
            )}
            {canCancel && (
              <Fragment>
                <Button color="danger" outline onClick={handleCancel} id="pov-cancel">
                  <XIcon size={14} className="me-50" /> {t("Cancel POV")}
                </Button>
                <UncontrolledTooltip target="pov-cancel" placement="top">
                  {t(
                    "Releases ordered quantities back to PO pending. No undo."
                  )}
                </UncontrolledTooltip>
              </Fragment>
            )}
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default PoVendorInfoCard;
