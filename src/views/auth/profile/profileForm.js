// ** React Imports
import { Fragment, useEffect } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { authUpdateMe } from "../store";
import {handleImgSrcError}from "@src/utility/Utils";

// ** Reactstrap Imports
import {
  Row,
  Card,
  Form,
  Label,
  Input,
  Button,
  Spinner,
  CardBody,
  FormFeedback,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import { useTranslation } from "react-i18next";

// ** Constant
import { countryCodeEditable, disableCountryDropdown,hostRestApiUrl } from "@constant/defaultValues";
import Avatar from "@src/assets/images/avatars/avatar.jpeg";

// ** Styles
import "react-phone-input-2/lib/style.css";
import UserProfileForm from "./userProfileForm";
import LocationAdminProfileForm from "./locationAdminProfileForm";
import { startLoading, stopLoading } from "../../loadingstore";
const ProfileForm = ({ toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.auth);
  const companyStore = useSelector((state) => state.company);
  // Validation schema
  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    email: yup
      .string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    gender: yup.string().required(`${t("Gender is required")}.`),
  });

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "all",
    shouldFocusError: false,
    defaultValues: {
      fname: "",
      lname: "",
      email: "",
      mobile: "",
      gender: "",
      country_code: { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
    },
    resolver: yupResolver(ProfileSchema),
  });

  // convert url into base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };


  // Derive phone default country from: user's country_code > company's country_code > GB
  const phoneDefaultCountry = (
    store?.authUserItem?.country_code?.countryCode ||
    companyStore?.companyItem?.country_code?.countryCode ||
    companyStore?.companyItem?.selected_country ||
    'gb'
  ).toLowerCase();

  // Derive default country_code object from company if user doesn't have one
  const defaultCountryCode = store?.authUserItem?.country_code
    || companyStore?.companyItem?.country_code
    || { dialCode: "44", countryCode: "gb", name: "United Kingdom" };

  // Reset form with user data
  useEffect(() => {
    const user = store?.authUserItem;
    if (!user) return;

    const firstName = user.first_name || user.name?.split(" ")[0] || "";
    const lastName = user.last_name || user.name?.split(" ").slice(1).join(" ") || "";

    const userCC = user.country_code || companyStore?.companyItem?.country_code || { dialCode: "44", countryCode: "gb", name: "United Kingdom" };
    const dialCode = (userCC.dialCode || "").replace("+", "");

    reset({
      fname: firstName,
      lname: lastName,
      email: user.email || "",
      mobile: user.mobile ? `${dialCode}${user.mobile}` : "",
      gender: user.gender || "",
      country_code: userCC,
      photo: user.photo || null
    });

  }, [store?.authUserItem, companyStore?.companyItem, reset]);

  // Mobile change handler
  const handleChangeMobile = (name, value, data) => {
    setValue(name, value);
    setValue("country_code", data);
  };

  // Submit handler with correct API mapping
  const onSubmit = async (values) => {
    const dialCode = values.country_code?.dialCode || "";
    let mobileValue = values.mobile || "";
    if (mobileValue.startsWith(dialCode)) {
      mobileValue = mobileValue.slice(dialCode.length);
    }
    mobileValue = mobileValue.trim();
    let photoValue = values.photo;


    if (photoValue instanceof File) {
      photoValue = await fileToBase64(photoValue);
    }

    const usrData = {
      first_name: values.fname,
      last_name: values.lname,
      email: values.email,
      mobile: mobileValue,
      gender: values.gender,
      photo: photoValue
    };
    if (mobileValue) {
      usrData.country_code = values.country_code;
    }
    dispatch(authUpdateMe(usrData));
  };


  // Check role for conditional rendering
  const userRoleName = store?.authUserItem?.role?.name?.trim().toLowerCase() || "";
  const isAdmin = userRoleName === "admin" || userRoleName === "super admin";
  const isCompanyAdmin = userRoleName === "company admin";
  // Location Admin, Employee, and any custom role use the personal info + address form
  const isLocationLevelUser = !isAdmin && !isCompanyAdmin;

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [store?.loading])

  const handleProfileChange = (e, onChange) => {
    const file = e.target.files[0];
    if (file) {
      onChange(file);
    }
  };
  const getBackendImageUrl = (photo) => {

    // If photo is not a valid string -> stop
    if (typeof photo !== "string" || !photo.trim()) return null;

    // If full URL -> return as is
    if (photo.startsWith("http")) return photo;

    // Safe replace (photo is guaranteed string now)
    const cleanPath = photo.replace(/^\/+/, "");

    return `${hostRestApiUrl}/${cleanPath}`;
  };



  return (
    <Fragment>
      {isLocationLevelUser ? (
        <LocationAdminProfileForm toggle={toggle} />
      ) : (isAdmin || isCompanyAdmin) ? (
        <Card>
          <CardBody>
            <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
              <Row>
                {/* First Name */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="fname">{t("First Name")}</Label>
                  <Controller
                    id="fname"
                    name="fname"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.fname} />
                    )}
                  />
                  <FormFeedback>{errors.fname?.message}</FormFeedback>
                </div>

                {/* Last Name */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="lname">{t("Last Name")}</Label>
                  <Controller
                    id="lname"
                    name="lname"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.lname} />
                    )}
                  />
                  <FormFeedback>{errors.lname?.message}</FormFeedback>
                </div>

                {/* Email */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="email">{t("Email")}</Label>
                  <Controller
                    id="email"
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} style={{ borderRadius: "8px" }} invalid={!!errors.email} disabled />
                    )}
                  />
                  <FormFeedback>{errors.email?.message}</FormFeedback>
                </div>

                {/* Mobile */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="mobile">{t("Mobile")}</Label>
                  <Controller
                    id="mobile"
                    name="mobile"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        autoComplete="off"
                        inputClass="w-100"
                        country={phoneDefaultCountry}
                        inputProps={{ name: "mobile" }}
                        disableDropdown={disableCountryDropdown}
                        countryCodeEditable={countryCodeEditable}
                        onChange={(val, data) => handleChangeMobile("mobile", val, data)}
                      />
                    )}
                  />
                  <FormFeedback>{errors.mobile?.message}</FormFeedback>
                </div>


                {/* Photo */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label" for="photo">{t("Photo")}</Label>

                  <Controller
                    name="photo"
                    control={control}
                    render={({ field }) => {
                      const value = field.value;

                      // Use your existing helper function
                      const imageUrl = getBackendImageUrl(
                        typeof value === "string" ? value : null
                      );

                      const previewUrl =
                        value instanceof File ? URL.createObjectURL(value) : null;

                      return (
                        <>
                          <div className="file-wrapper d-flex">
                            <Input
                              type="file"
                              id="photo"
                              accept="image/*"
                              className="form-control"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) field.onChange(file);
                              }}

                            />

                            {/* 📌 Show backend image WHEN value is string */}
                            {imageUrl && !previewUrl && (
                              <img
                                src={imageUrl}
                                className="file-preview-icon fileicon"
                                alt=""
                                onError={(e) => handleImgSrcError(e, Avatar)}
                                accept=".jpg,.jpeg,.png"
                              />
                            )}

                            {/* 📌 Show preview when file is selected */}
                            {previewUrl && (
                              <img
                                src={previewUrl}
                                className="file-preview-icon fileicon"
                                alt=""
                                onError={(e) => handleImgSrcError(e, Avatar)}

                              />
                            )}

                          </div>

                          <FormFeedback>{errors.photo?.message}</FormFeedback>
                        </>
                      );
                    }}
                  />


                </div>


                {/* Gender */}
                <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                  <Label className="form-label mb-0">{t("Gender")}:</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <>
                        <div className="d-flex gap-2 mt-1">
                          <div className="form-check">
                            <Input
                              type="radio"
                              id="male"
                              value="MALE"
                              checked={field.value === "MALE"}
                              onChange={() => field.onChange("MALE")}
                            />
                            <Label className="form-check-label" for="male">{t("Male")}</Label>
                          </div>
                          <div className="form-check">
                            <Input
                              type="radio"
                              id="female"
                              value="FEMALE"
                              checked={field.value === "FEMALE"}
                              onChange={() => field.onChange("FEMALE")}
                            />
                            <Label className="form-check-label" for="female">{t("Female")}</Label>
                          </div>
                        </div>
                      </>
                    )}
                  />
                  <FormFeedback className="d-block">{errors.gender?.message}</FormFeedback>
                </div>

              </Row>

              <div className="d-flex justify-content-end mt-2 profile-btn gap-2">
                <Button type="submit" color="primary" disabled={!store.loading}>
                  {store?.loading ? t("Save") : <Spinner size="sm" />}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      ) : (
        <UserProfileForm toggle={toggle} />
      )}
    </Fragment>
  );
};

export default ProfileForm;