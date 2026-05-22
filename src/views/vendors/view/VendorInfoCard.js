// ── VendorInfoCard ───────────────────────────────────────────────────
// Left column on the Vendor view page. Mirrors the EmployeeInfoCard look
// (avatar / name / status badge / quick-fact list / action button).

import { Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Badge,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import {
  User,
  Phone,
  Mail,
  Hash,
  MapPin,
  Tag,
  Globe,
  Edit,
} from "react-feather";

import Avatar from "@components/avatar";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { useTranslation } from "react-i18next";

const InfoRow = ({ icon: Icon, value }) => {
  if (!value) return null;
  return (
    <li className="d-flex align-items-start mb-50">
      <Icon size={14} className="me-50 mt-25 text-muted flex-shrink-0" />
      <span
        className="flex-grow-1 text-break"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </li>
  );
};

const VendorInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { vendorItem } = useSelector((s) => s.vendor);
  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.vendors;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;
  const v = vendorItem || {};

  const initials = (v.company_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const phone =
    v?.primary_contact_country_code?.formatted ||
    (v?.primary_contact_country_code?.dial_code && v?.primary_contact_phone
      ? `${v.primary_contact_country_code.dial_code} ${v.primary_contact_phone}`
      : v?.primary_contact_phone) ||
    null;

  const billFrom =
    (v?.addresses || []).find(
      (a) => a.is_default && a.type === "bill_from"
    ) ||
    (v?.addresses || []).find((a) => a.type === "bill_from") ||
    (v?.addresses || [])[0];
  const billLine = billFrom
    ? [billFrom.city, billFrom.state, billFrom.country].filter(Boolean).join(", ")
    : null;

  const categoriesLabel = (v?.categories || [])
    .map((c) => c.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Fragment>
      <Card>
        <CardBody>
          <div className="user-avatar-section">
            <div className="d-flex align-items-center flex-column">
              <Avatar
                initials
                color="light-primary"
                className="rounded mt-3 mb-2"
                content={initials || "V"}
                contentStyles={{
                  borderRadius: 0,
                  fontSize: "calc(36px)",
                  width: "100%",
                  height: "100%",
                }}
                style={{ height: "90px", width: "90px" }}
              />
              <div className="d-flex flex-column align-items-center text-center">
                <div className="user-info text-center">
                  <h4
                    className="text-capitalize text-break mb-0"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {v?.company_name || "—"}
                  </h4>
                  {v?.vendor_code && (
                    <span className="card-text text-muted">
                      [{v.vendor_code}]
                    </span>
                  )}
                </div>
                <Badge
                  color={v?.is_active ? "light-success" : "light-warning"}
                  className="mt-1"
                >
                  {v?.is_active ? t("Active") : t("Inactive")}
                </Badge>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1">
            {t("Details")}
          </h4>
          <ul className="list-unstyled mb-2">
            <InfoRow icon={Hash} value={v?.vendor_code} />
            <InfoRow icon={User} value={v?.primary_contact_name} />
            <InfoRow icon={Mail} value={v?.primary_contact_email} />
            <InfoRow icon={Phone} value={phone} />
            <InfoRow icon={MapPin} value={billLine} />
            <InfoRow icon={Globe} value={billFrom?.country} />
            <InfoRow icon={Tag} value={categoriesLabel} />
          </ul>

          {canEdit && (
            <div className="d-flex justify-content-center">
              <Button
                color="primary"
                outline
                onClick={() => navigate(`${appsRoot}/vendors/edit/${id}`)}
                id="vendor-edit-from-view"
              >
                <Edit size={14} className="me-50" /> {t("Edit")}
              </Button>
              <UncontrolledTooltip target="vendor-edit-from-view" placement="top">
                {t("Edit vendor")}
              </UncontrolledTooltip>
            </div>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default VendorInfoCard;
