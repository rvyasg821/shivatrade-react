// ** React Imports
import { Fragment, useEffect } from "react";

// ** Reactstrap Imports
import { Card, CardBody, Badge, Button } from "reactstrap";

// ** Custom Components
import Avatar from "@components/avatar";

// ** Icons
import {
  Phone,
  Mail,
  User,
  MapPin,
  Briefcase,
  Calendar,
  Hash,
  Shield,
  Users,
} from "react-feather";

// ** Utils
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { useTranslation } from "react-i18next";
import {
  appsRoot,
  hostRestApiUrl,
} from "@constant/defaultValues";

// ** Redux
import { useDispatch, useSelector } from "react-redux";
import { getEmployee } from "@src/views/employees/store";

import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";

const EmployeeInfoCard = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { employeeItem } = useSelector((state) => state.employee);

  useEffect(() => {
    if (id) dispatch(getEmployee(id));
  }, [id, dispatch]);

  const profile = employeeItem || {};

  // Phone formatting
  const mobile = profile?.mobile ?? null;
  const countryObj = profile?.country_code || {
    dialCode: "1",
    format: "+.. .....-.....",
  };
  const countryCode = countryObj.code || countryObj.dialCode || "+1";
  const mobileFormat = countryObj.format || "+.. .....-.....";
  const dialCode = countryCode.replace("+", "") || "1";
  const formattedMobile = mobile
    ? formatPhoneNumber(mobile, mobileFormat, dialCode)
    : null;

  // Role name
  const roleName =
    typeof profile?.role === "object"
      ? profile?.role?.name
      : profile?.roleName || "";

  // Status
  const isActive = profile?.is_active !== false;
  const statusLabel = profile?.status || (isActive ? "ACTIVE" : "INACTIVE");

  // Photo
  const photoUrl = profile?.photo
    ? `${hostRestApiUrl}/${profile.photo}`
    : null;

  // Render avatar
  const renderEmployeeImg = () => {
    if (photoUrl) {
      return (
        <img
          src={photoUrl}
          alt={profile?.name || "Employee"}
          className="rounded-circle"
          style={{ width: "110px", height: "110px", objectFit: "cover" }}
        />
      );
    }
    return (
      <Avatar
        initials
        color="light-primary"
        className="rounded-circle"
        content={
          profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.name || ""
        }
        contentStyles={{
          borderRadius: 0,
          fontSize: "calc(48px)",
          width: "100%",
          height: "100%",
        }}
        style={{ height: "110px", width: "110px", borderRadius: "50%" }}
      />
    );
  };

  // Full name
  const fullName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.name || "";

  // Location name
  const locationName =
    typeof profile?.location_id === "object"
      ? profile?.location_id?.location_name
      : "";

  // Address
  const addressParts = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.city,
    profile?.state,
    profile?.country,
    profile?.postcode,
  ].filter(Boolean);

  return (
    <Fragment>
      <Card>
        <CardBody>
          {/* Employee Avatar and Name */}
          <div className="user-avatar-section text-center mb-2">
            <div
              className="profile-image-uploader mb-1"
              style={{ width: "110px", height: "110px", margin: "0 auto" }}
            >
              {renderEmployeeImg()}
            </div>
            <h4 className="text-capitalize">{fullName}</h4>
            {roleName && (
              <Badge color="light-primary" pill className="mb-50">
                {roleName}
              </Badge>
            )}
            <div className="mt-50">
              <Badge color={isActive ? "light-success" : "light-warning"} pill>
                {isActive ? t("Active") : t("Inactive")}
              </Badge>
            </div>
          </div>

          {/* Contact Details */}
          <div className="mb-2 user-main">
            <h5 className="fw-bolder border-bottom pb-50 mb-1">
              {t("Details")}
            </h5>
            <ul className="list-unstyled mb-0">
              {profile?.email && (
                <li className="d-flex align-items-center mb-75">
                  <Mail size={16} className="me-75 text-primary" />
                  <span>{profile.email}</span>
                </li>
              )}
              {formattedMobile && (
                <li className="d-flex align-items-center mb-75">
                  <Phone size={16} className="me-75 text-primary" />
                  <span>{formattedMobile}</span>
                </li>
              )}
              {profile?.gender && (
                <li className="d-flex align-items-center mb-75">
                  <User size={16} className="me-75 text-primary" />
                  <span>{t(profile.gender)}</span>
                </li>
              )}
              {locationName && (
                <li className="d-flex align-items-center mb-75">
                  <MapPin size={16} className="me-75 text-primary" />
                  <span>{locationName}</span>
                </li>
              )}
              {addressParts.length > 0 && (
                <li className="d-flex align-items-start mb-75">
                  <MapPin
                    size={16}
                    className="me-75 text-primary"
                    style={{ marginTop: "3px", flexShrink: 0 }}
                  />
                  <span>{addressParts.join(", ")}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Employment Details */}
          {(profile?.employee_code ||
            profile?.designation ||
            profile?.department ||
            profile?.employment_type ||
            profile?.date_of_joining ||
            profile?.date_of_birth) && (
            <div className="mb-2 user-main">
              <h5 className="fw-bolder border-bottom pb-50 mb-1">
                {t("Employment")}
              </h5>
              <ul className="list-unstyled mb-0">
                {profile?.employee_code && (
                  <li className="d-flex align-items-center mb-75">
                    <Hash size={16} className="me-75 text-primary" />
                    <span>
                      {t("Code")}: <span className="text-uppercase">{profile.employee_code}</span>
                    </span>
                  </li>
                )}
                {profile?.designation && (
                  <li className="d-flex align-items-center mb-75">
                    <Briefcase size={16} className="me-75 text-primary" />
                    <span>{profile.designation}</span>
                  </li>
                )}
                {profile?.department && (
                  <li className="d-flex align-items-center mb-75">
                    <Users size={16} className="me-75 text-primary" />
                    <span>{profile.department}</span>
                  </li>
                )}
                {profile?.employment_type && (
                  <li className="d-flex align-items-center mb-75">
                    <Shield size={16} className="me-75 text-primary" />
                    <span>{t(profile.employment_type)}</span>
                  </li>
                )}
                {profile?.date_of_joining && (
                  <li className="d-flex align-items-center mb-75">
                    <Calendar size={16} className="me-75 text-primary" />
                    <span>
                      {t("Joined")}:{" "}
                      {moment(profile.date_of_joining).format("DD MMM YYYY")}
                    </span>
                  </li>
                )}
                {profile?.date_of_birth && (
                  <li className="d-flex align-items-center mb-75">
                    <Calendar size={16} className="me-75 text-primary" />
                    <span>
                      {t("DOB")}:{" "}
                      {moment(profile.date_of_birth).format("DD MMM YYYY")}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex mt-2 align-items-center justify-content-center gap-1">
            <Button
              color="primary"
              onClick={() => navigate(`${appsRoot}/employees/edit/${id}`)}
            >
              {t("Edit")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default EmployeeInfoCard;
