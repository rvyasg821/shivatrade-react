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
  Globe,
  Edit,
  Calendar,
  DollarSign,
} from "react-feather";

import Avatar from "@components/avatar";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { useTranslation } from "react-i18next";
import {
  LEAD_STATUS_OPTIONS,
  LEAD_STATUS_BADGE_COLOR,
  LEAD_SOURCE_OPTIONS,
} from "@constant/options";

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

const LeadInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { leadItem } = useSelector((s) => s.lead);
  const l = leadItem || {};
  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.leads;
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  const initials = (l.company_name || l.contact_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const phone =
    l?.country_code?.formatted ||
    (l?.country_code?.dial_code && l?.contact_phone
      ? `${l.country_code.dial_code} ${l.contact_phone}`
      : l?.contact_phone) ||
    null;

  const cityLine = [l?.city, l?.state, l?.country].filter(Boolean).join(", ");

  const statusLabel =
    LEAD_STATUS_OPTIONS.find((s) => s.value === l?.status)?.label || l?.status;

  const sourceLabel =
    LEAD_SOURCE_OPTIONS.find((s) => s.value === l?.source)?.label || l?.source;

  const budget = l?.expected_value
    ? `${l?.currency || ""} ${Number(l.expected_value).toLocaleString()}`.trim()
    : null;

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
                content={initials || "L"}
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
                    {l?.company_name || l?.contact_name || "-"}
                  </h4>
                  {sourceLabel && (
                    <span className="card-text text-muted text-capitalize">
                      {sourceLabel}
                    </span>
                  )}
                </div>
                <Badge
                  color={`light-${
                    LEAD_STATUS_BADGE_COLOR[l?.status] || "secondary"
                  }`}
                  className="mt-1 text-capitalize"
                >
                  {statusLabel || t("Unknown")}
                </Badge>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1">
            {t("Details")}
          </h4>
          <ul className="list-unstyled mb-2">
            <InfoRow icon={User} value={l?.contact_name} />
            <InfoRow icon={Mail} value={l?.contact_email} />
            <InfoRow icon={Phone} value={phone} />
            <InfoRow icon={MapPin} value={cityLine || null} />
            <InfoRow icon={Globe} value={l?.website_url} />
            <InfoRow icon={DollarSign} value={budget} />
            <InfoRow
              icon={Calendar}
              value={
                l?.follow_up_date
                  ? `${t("Follow-up")}: ${l.follow_up_date.slice(0, 10)}`
                  : null
              }
            />
            <InfoRow icon={Hash} value={l?._id ? `#${l._id.slice(-6)}` : null} />
          </ul>

          {canEdit && (
            <div className="d-flex justify-content-center">
              <Button
                color="primary"
                outline
                onClick={() => navigate(`${appsRoot}/leads/edit/${id}`)}
                id="lead-edit-from-view"
              >
                <Edit size={14} className="me-50" /> {t("Edit")}
              </Button>
              <UncontrolledTooltip target="lead-edit-from-view" placement="top">
                {t("Edit lead")}
              </UncontrolledTooltip>
            </div>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default LeadInfoCard;
