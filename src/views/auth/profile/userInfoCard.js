// ** React Imports
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ** Reactstrap Imports
import { Badge, Button, Card, CardBody } from "reactstrap";

// ** Custom Components
import Avatar from "@components/avatar";

// ** Icons
import { Phone, Mail, Globe, DollarSign, Clock, Briefcase, MapPin, User } from "react-feather";
import { FaRegAddressCard } from "react-icons/fa";
import avatar from "@src/assets/images/avatars/avatar.jpeg";
import {handleImgSrcError}from "@src/utility/Utils";
// ** Utils
import { formatPhoneNumber } from "./formatPhoneNumber";
import { useTranslation } from "react-i18next";
import { appsRoot ,hostRestApiUrl} from "@constant/defaultValues"; // adjust path if needed
import { useSelector,useDispatch } from "react-redux";
import { startLoading, stopLoading } from "../../loadingstore";

const UserInfoCard = ({ user }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch=useDispatch();
  const company = useSelector((state) => state.company.companyItem || {});
  const locationCtx = useSelector((state) => state.locationContext);


  // Normalize user object
  const normalizeProfile = (u) => {
    if (!u) return null;
    if (u.data && typeof u.data === "object") return u.data;
    if (u.user && typeof u.user === "object") return u.user;
    return u;
  };

  const profile = normalizeProfile(user);
  const userId = profile?._id || profile?.id;

  // Mobile number
  const mobile =
    profile?.mobile ?? profile?.phone ?? profile?.contact_number ?? null;

  const countryObj =
    profile?.country_code || { dialCode: "1", format: "+.. .....-....." };
  const countryCode = countryObj.code || countryObj.dialCode || "+1";
  const mobileFormat = countryObj.format || "+.. .....-.....";
  const dialCode = countryCode.replace("+", "") || "1";

  const formattedMobile = mobile
    ? formatPhoneNumber(mobile, mobileFormat, dialCode)
    : null;

  const handleEditClick = () => {
    if (userId) {
      navigate(`${appsRoot}/profile/edit/${userId}`);
    } else {
      console.error("User ID not found");
    }
  };
  // loadding mangement
 useEffect(() => {
    if (!company?.loading) {

      dispatch(startLoading())
    } else {

      dispatch(stopLoading())
    }
  }, [company?.loading])

  const photo = profile?.photo;

const imageUrl =
  typeof photo === "string" && photo.trim() !== ""
    ? photo.startsWith("http")
      ? photo
      : `${hostRestApiUrl}/${photo.replace(/^\/+/, "")}`
    : null;


  const renderUserImg = () => (
    <Avatar
      initials
      color={"light-primary"}
      className="rounded"
      content={profile?.photo || profile?.name}
      contentStyles={{
        borderRadius: 0,
        fontSize: "calc(48px)",
        width: "100%",
        height: "100%",
      }}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "50%",
      }}
    />
  );

  return (
    <Fragment>
      <Card>
        <CardBody>
          <div className="user-avatar-section">
            <div className="d-flex align-items-center flex-column">
              <div className="profile-image-uploader">
                <div
                  className="image-preview-container mb-2"
                  style={{ position: "relative", width: "110px", height: "110px" }}
                >
                   {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                                onError={(e) => handleImgSrcError(e, avatar)}

                    />
                  ) : (
                    renderUserImg()
                  )}
                </div>
              </div>

              <div className="d-flex flex-column align-items-center text-center">
                <div className="user-info">
                  <h4 className="text-capitalize">{profile?.name || ""}</h4>
                  {profile?.role && (
                    <Badge color="light-primary" className="text-capitalize">
                      {profile.role?.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1"></h4>
          <div className="info-container">
            {profile && (
              <ul className="list-unstyled mb-0">
                <li className="d-flex align-items-center mb-1">
                  <span className="fw-bolder me-1"><Mail size={18} /></span>
                  <span>{profile?.email || ""}</span>
                </li>
                {mobile && (
                  <li className="d-flex align-items-center mb-1">
                    <span className="fw-bolder me-1"><Phone size={18} /></span>
                    <span>{formattedMobile}</span>
                  </li>
                )}
                {profile?.employee_code && (
                  <li className="d-flex align-items-center mb-1">
                    <span className="fw-bolder me-1"><FaRegAddressCard size={18} /></span>
                    <span>{profile.employee_code}</span>
                  </li>
                )}
                {profile?.department && (
                  <li className="d-flex align-items-center mb-1">
                    <span className="fw-bolder me-1"><User size={18} /></span>
                    <span>{profile.department}</span>
                  </li>
                )}
                {profile?.designation && (
                  <li className="d-flex align-items-center mb-1">
                    <span className="fw-bolder me-1"><Briefcase size={18} /></span>
                    <span>{profile.designation}</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Company Details for Company Admin */}
          {profile?.role?.name?.toLowerCase() === "company admin" && (
            <>
              <h4 className="fw-bolder border-bottom pb-50 mb-1 mt-2"></h4>
              <div className="info-container">
                <ul className="list-unstyled mb-0">
                  {company.company_name && (
                    <li className="d-flex align-items-center mb-1">
                      <span className="fw-bolder me-1">
                        <Briefcase size={18} />
                      </span>
                      <span>{company.company_name}</span>
                    </li>
                  )}
                  {company.selected_country && (
                    <li className="d-flex align-items-center mb-1">
                      <span className="fw-bolder me-1">
                        <Globe size={18} />
                      </span>
                      <span>{company.selected_country}</span>
                    </li>
                  )}
                  {company.timezone && (
                    <li className="d-flex align-items-center mb-1">
                      <span className="fw-bolder me-1">
                        <Clock size={18} />
                      </span>
                      <span>{company.timezone}</span>
                    </li>
                  )}
                  {company.currency && (
                    <li className="d-flex align-items-center">
                      <span className="fw-bolder me-1">
                        <DollarSign size={18} />
                      </span>
                      <span>{company.currency}</span>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {/* Company & Location for Location Admin, Employee, and custom roles */}
          {profile?.role?.name !== "Company Admin" && profile?.role?.name !== "Super Admin" && profile?.role?.name !== "Admin" && (() => {
            const locDetails = locationCtx?.selectedLocationDetails;
            return (company.company_name || locationCtx?.selectedLocationName) ? (
              <>
                <h4 className="fw-bolder border-bottom pb-50 mb-1 mt-2">{t("Company & Location")}</h4>
                <div className="info-container">
                  <ul className="list-unstyled mb-0">
                    {company.company_name && (
                      <li className="d-flex align-items-center mb-1">
                        <span className="fw-bolder me-1"><Briefcase size={18} /></span>
                        <span>{company.company_name}</span>
                      </li>
                    )}
                    {locationCtx?.selectedLocationName && (
                      <li className="d-flex align-items-center mb-1">
                        <span className="fw-bolder me-1"><MapPin size={18} /></span>
                        <span>{locationCtx.selectedLocationName}</span>
                      </li>
                    )}
                    {locDetails?.contact_name && (
                      <li className="d-flex align-items-center mb-1">
                        <span className="fw-bolder me-1"><User size={18} /></span>
                        <span>{locDetails.contact_name}</span>
                      </li>
                    )}
                    {locDetails?.email && (
                      <li className="d-flex align-items-center mb-1">
                        <span className="fw-bolder me-1"><Mail size={18} /></span>
                        <span>{locDetails.email}</span>
                      </li>
                    )}
                    {locDetails?.mobile && (
                      <li className="d-flex align-items-center mb-1">
                        <span className="fw-bolder me-1"><Phone size={18} /></span>
                        <span>{locDetails.country_code?.dialCode ? `${locDetails.country_code.dialCode} ` : ""}{locDetails.mobile}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </>
            ) : null;
          })()}

          {/* edit */}
          {profile?.role?.name?.toLowerCase() === "company admin" && (
            <div className="d-flex align-items-center justify-content-center flex-wrap mt-2 profile-btn">
              <Button color="primary" onClick={handleEditClick}>
                {t("Edit")}
              </Button>
            </div>
          )}

        </CardBody>
      </Card>
    </Fragment>
  );
};

export default UserInfoCard;
