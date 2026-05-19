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
  FileText,
  Briefcase,
} from "react-feather";

import Avatar from "@components/avatar";
import { appsRoot } from "@constant/defaultValues";
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

const CustomerInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { customerItem } = useSelector((s) => s.customer);
  const c = customerItem || {};

  const initials = (c.company_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const phone =
    c?.primary_contact_country_code?.formatted ||
    (c?.primary_contact_country_code?.dial_code && c?.primary_contact_phone
      ? `${c.primary_contact_country_code.dial_code} ${c.primary_contact_phone}`
      : c?.primary_contact_phone) ||
    null;

  const billTo =
    (c?.addresses || []).find(
      (a) => a.is_default && a.type === "bill_to"
    ) ||
    (c?.addresses || []).find((a) => a.type === "bill_to") ||
    (c?.addresses || [])[0];
  const billLine = billTo
    ? [billTo.city, billTo.state, billTo.country].filter(Boolean).join(", ")
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
                content={initials || "C"}
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
                    {c?.company_name || "—"}
                  </h4>
                  {c?.customer_code && (
                    <span className="card-text text-muted">
                      [{c.customer_code}]
                    </span>
                  )}
                </div>
                <Badge
                  color={c?.is_active ? "light-success" : "light-warning"}
                  className="mt-1"
                >
                  {c?.is_active ? t("Active") : t("Inactive")}
                </Badge>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1">
            {t("Details")}
          </h4>
          <ul className="list-unstyled mb-2">
            <InfoRow icon={Hash} value={c?.customer_code} />
            <InfoRow icon={User} value={c?.primary_contact_name} />
            <InfoRow icon={Mail} value={c?.primary_contact_email} />
            <InfoRow icon={Phone} value={phone} />
            <InfoRow icon={MapPin} value={billLine} />
            <InfoRow icon={Globe} value={billTo?.country || c?.country} />
            <InfoRow icon={FileText} value={c?.gstin} />
            <InfoRow icon={Briefcase} value={c?.pan} />
          </ul>

          <div className="d-flex justify-content-center">
            <Button
              color="primary"
              outline
              onClick={() => navigate(`${appsRoot}/customers/edit/${id}`)}
              id="customer-edit-from-view"
            >
              <Edit size={14} className="me-50" /> {t("Edit")}
            </Button>
            <UncontrolledTooltip target="customer-edit-from-view" placement="top">
              {t("Edit customer")}
            </UncontrolledTooltip>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default CustomerInfoCard;
