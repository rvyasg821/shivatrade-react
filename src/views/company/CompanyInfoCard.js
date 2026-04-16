// ** React Imports
import { Fragment, useEffect, useState } from "react";

// ** Reactstrap Imports
import { Card, CardBody, Button, Spinner, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { Slash } from "react-feather";

// ** Custom Components
import Avatar from "@components/avatar";
import Notification from "@components/toast/notification";
import { startLoading, stopLoading } from "../loadingstore";

// ** Icons
import { Phone, Mail, User, Globe, DollarSign, Clock } from "react-feather";
import { FaRegAddressCard } from "react-icons/fa";

// ** Utils
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { useTranslation } from "react-i18next";
import { appsRoot } from "@constant/defaultValues";

// ** Redux
import { useDispatch, useSelector } from "react-redux";
import {
  getCompany,
  suspendCompany,
  reactivateCompany
} from "@src/views/auth/profile/editCompany/store/";

import { useLocation, useNavigate, useParams } from "react-router-dom";

const CompanyInfoCard = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { companyItem } = useSelector((state) => state.company);

  // Local states
  const [isLoading, setIsLoading] = useState(false);
  const [localSuspended, setLocalSuspended] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);  // Modal state for confirmation

  const profile = companyItem || {};

  // ✅ Detect if this company is suspended
  const isSuspended =
    localSuspended ||
    profile?.is_suspended ||
    profile?.status?.toLowerCase() === "suspended" ||
    profile?.status?.toLowerCase() === "inactive";

  // ✅ Get company info initially
  useEffect(() => {
    if (id) dispatch(getCompany({ id }));
  }, [id, dispatch]);

  // ✅ Keep local state synced with Redux data
  useEffect(() => {
    setLocalSuspended(
      profile?.is_suspended ||
      profile?.status?.toLowerCase() === "suspended" ||
      profile?.status?.toLowerCase() === "inactive"
    );
  }, [profile]);

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

  // ✅ Toggle suspend/reactivate company
  const handleSuspendToggle = () => {
    // Show confirmation modal before suspending/reactivating
    setCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      if (isSuspended) {
        console.log("▶ Reactivating company:", id);
        const res = await dispatch(
          reactivateCompany({ companyId: id })
        ).unwrap();
        Notification(res?.message || "Company reactivated successfully");
        setLocalSuspended(false);
      } else {
        console.log("⏸ Suspending company:", id);
        const res = await dispatch(suspendCompany({ companyId: id })).unwrap();
        Notification(res?.message || "Company suspended successfully");
        setLocalSuspended(true);
      }

      // Refresh company data
      await dispatch(getCompany({ id }));
    } catch (err) {
      console.error("❗Error in handleSuspendToggle:", err);
      Notification(
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong while updating status"
      );
    } finally {
      setIsLoading(false);
      setCancelModal(false);  // Close modal after operation
    }
  };

  const handleCancelModalClose = () => {
    setCancelModal(false);
  };
  
  // loadding management
  useEffect(() => {
    if (companyItem?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [companyItem?.loading]);

  // ✅ Render avatar
  const renderCompanyImg = () => (
    <Avatar
      initials
      color="light-primary"
      className="rounded"
      content={profile?.company_name || ""}
      contentStyles={{
        borderRadius: 0,
        fontSize: "calc(48px)",
        width: "100%",
        height: "100%"
      }}
      style={{ height: "100%", width: "100%", borderRadius: "50%" }}
    />
  );

  // ✅ Component UI
  return (
    <Fragment>
      <Card>
        <CardBody>
          {/* Company Avatar and Name */}
          <div className="user-avatar-section text-center mb-2">
            <div
              className="profile-image-uploader mb-2"
              style={{ width: "110px", height: "110px", margin: "0 auto" }}
            >
              {renderCompanyImg()}
            </div>
            <h4 className="text-capitalize">{profile?.company_name || ""}</h4>
          </div>

          {/* User Details */}
          {profile?.user && (
            <div className="mb-3 user-main">
              <ul className="list-unstyled mb-0">
                {profile.contact_name && (
                  <li className="d-flex align-items-center mb-1">
                    <User size={18} className="me-1" /> {profile.contact_name}
                  </li>
                )}
                {profile.user.email && (
                  <li className="d-flex align-items-center mb-1">
                    <Mail size={18} className="me-1" /> {profile.user.email}
                  </li>
                )}
                {profile.user.mobile && (
                  <li className="d-flex align-items-center mb-1">
                    <Phone size={18} className="me-1" />
                    {formatPhoneNumber(
                      profile.user.mobile,
                      profile.user?.country_code?.format || "+.. .....-.....",
                      (
                        profile.user?.country_code?.code ||
                        profile.user?.country_code?.dialCode ||
                        "+1"
                      ).replace("+", "")
                    )}
                  </li>
                )}
                {(profile.address_1 ||
                  profile.address_2 ||
                  profile.city ||
                  profile.state ||
                  profile.country ||
                  profile.zipcode) && (
                    <li className="d-flex align-items-center mb-1">
                      <FaRegAddressCard size={18} className="me-1" />{" "}
                      {[
                        profile.address_1,
                        profile.address_2,
                        profile.city,
                        profile.state,
                        profile.country,
                        profile.zipcode
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </li>
                  )}
                {profile.selected_country && (
                  <li className="d-flex align-items-center mb-1">
                    <Globe size={18} className="me-1" /> {profile.selected_country}
                  </li>
                )}
                {profile.timezone && (
                  <li className="d-flex align-items-center mb-1">
                    <Clock size={18} className="me-1" /> {profile.timezone}
                  </li>
                )}
                {profile.currency && (
                  <li className="d-flex align-items-center mb-1">
                    <DollarSign size={18} className="me-1" /> {profile.currency}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex mt-2 align-items-center justify-content-center gap-1">
            <Button
              color="primary"
              onClick={() => navigate(`${appsRoot}/company/edit/${id}`)}
            >
              {t("Edit")}
            </Button>

            <Button
              color={isSuspended ? "success" : "danger"}
              onClick={handleSuspendToggle}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="sm" color="light" />
              ) : (
                <Slash size={18} className="me-50" />
              )}
              {isLoading
                ? t("Processing...")
                : t(isSuspended ? "Reactivate" : "Suspend")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      <Modal isOpen={cancelModal} toggle={handleCancelModalClose} centered>
        <ModalHeader toggle={handleCancelModalClose}>
          <h4 className="text-center">
            {isSuspended ? t("Reactivate Company") : t("Suspend Company")}

          </h4>
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            {/* <div className="mb-3">
              <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            </div> */}
            <h5 className="mb-2 mt-2">
              {isSuspended ? t("Are you sure you want to reactivate?") : t("Are you sure?")}
            </h5>
            <p className="text">
              {isSuspended
                ? t("This will reactivate your company and restore full access.")
                : t("You are about to suspend your company.")
              }

              <br />
              {t("This action cannot be undone and will affect the company status.")}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={handleCancelModalClose}
            disabled={isLoading}
          >
            {t("No")}
          </Button>
          <Button
            color="secondary"
            onClick={handleCancelConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="me-1" />
                {t("Processing...")}
              </>
            ) : (
              t(isSuspended ? "Yes" : "Yes")
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  );
};

export default CompanyInfoCard;
