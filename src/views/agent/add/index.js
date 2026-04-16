// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getUser, getAgentList, createAgent, updateUser, cleanUserMessage } from "@src/views/users/store/";
import { startLoading, stopLoading } from "../../loadingstore";
import Avatar from "@src/assets/images/avatars/avatar.jpeg";
import { handleImgSrcError } from "@src/utility/Utils";
// ** Reactstrap Imports
import {
  Row,
  Form,
  Card,
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

// ** React Dropdown Import
import Select from "react-select";

// ** Custom Components
import Notification from "@components/toast/notification";
import InputPasswordToggle from "@components/input-password-toggle";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import {
  appsRoot,
  hostRestApiUrl
} from "@constant/defaultValues";
import { initUserItem } from "@constant/reduxConstant";

// ** Styles
import "react-phone-input-2/lib/style.css";

const UserForm = () => {
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);
  const roleStore = useSelector((state) => state.role);
  console.log(store)

  // ** States
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const [roleOptions, setRoleOptions] = useState([]);
  const [resetValue, setResetValue] = useState(false);
  const [phonePlaceholder, setPhonePlaceholder] = useState("+.. (..) .........");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // ** Constants
  const isEditMode = !!id;

  /* Yup validation schema */
  const UserSchema = yup.object().shape({
    first_name: yup.string().required(`${t("First Name is required")}.`),
    last_name: yup.string().required(`${t("Last Name is required")}.`),
    email: yup.string().required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    password: yup
      .string()
      .nullable()
      .when([], {
        is: () => !isEditMode, // if not edit mode → required
        then: (schema) =>
          schema
            .required(`${t("Password is required")}.`)
            .min(8, `${t("Password must be at least 8 characters")}.`)
            .matches(
              /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
              t("Min. 8 characters, At least one uppercase letter, One lowercase letter, One number and one special character."),
            ),
        otherwise: (schema) =>
          schema
            .test(
              "password-strength",
              t("Min. 8 characters, At least one uppercase letter, One lowercase letter, One number and one special character."),
              (value) => {
                if (!value) return true; // allow empty in edit mode
                return /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(
                  value
                );
              }
            ),
      }),

    commission: yup
      .number()
      .typeError(`${t("Commission must be a number")}.`)
      .required(`${t("Commission is required")}.`)
      .min(0, `${t("Commission cannot be negative")}.`)
      .nullable(),

    mobile: yup
      .string()
      .nullable()
      .notRequired()
      .test("valid-mobile", `${t("Minimum 8 digits required")}.`, (value) => {
        // allow empty mobile
        if (value || value.trim() === "") return true;
        const phoneNumber = parsePhoneNumberFromString(`+${value}`);
        return phoneNumber && phoneNumber.nationalNumber.length >= 8;
      }),

    gender: yup.string().required(`${t("Gender is required")}.`),
  });

  const {
    reset,
    control,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "all",
    defaultValues: initUserItem,
    resolver: yupResolver(UserSchema),
    shouldFocusError: false,
  });

  useLayoutEffect(() => {
    const query = {
      sort: { level: 1 },
      dropdown: "yes",
    };

    if (isEditMode) {
      dispatch(getUser(id));
    }
  }, [id]);

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanUserMessage(null));
    }


    if (
      roleStore?.actionFlag === "ROLE_LST_SCS" ||
      roleStore?.actionFlag === "ROLE_LST_ERR"
    ) {
      let roleOpts = [];
      if (roleStore?.roleItems?.length) {
        roleOpts = roleStore.roleItems.map((item) => {
          return {
            ...item,
            value: item?._id,
            label: item?.name,
          };
        });
      }

      setRoleOptions(roleOpts);
    }
    // check update and create success
    if (store?.actionFlag === "AGE_CRTD" || store?.actionFlag === "USR_UPDT") {
      dispatch(cleanUserMessage());
      navigate(`${appsRoot}/agents`);
    }
    if ((store?.actionFlag === "USR_SCS" && store?.userItem) || resetValue) {
      let usrItem = { ...store.userItem, password: "" };

      if (usrItem?.role) {
        const role = {
          ...usrItem.role,
          value: usrItem.role?._id || "",
          label: usrItem.role?.name || "",
        };

        usrItem = { ...usrItem, role };
      }

      reset({ ...usrItem });
      setResetValue(() => false);
    }
  }, [roleStore.actionFlag, store.actionFlag]);

  // mobile 
  const handleChangeMobile = (name, value, country) => {
    const dialCode = country?.dialCode || "";
    const digits = String(value || "").replace(/\D/g, "");

    // If no digits, just clear mobile but preserve country code
    if (!digits || digits === dialCode) {
      // setValue(name, ""); // mobile becomes empty
      // Only update country code if country data is provided and different from current
      const currentCountryCode = watch("country_code");
      if (country && country?.dialCode !== currentCountryCode?.dialCode?.replace("+", "")) {
        setValue("country_code", {
          number: "",
          name: country?.name || "",
          internationalNumber: `+${dialCode}`,
          nationalNumber: "",
          countryCode: (country?.countryCode || "").toUpperCase(),
          dialCode: `+${dialCode}`,
          country_flag: country?.countryCode
            ? country.countryCode
              .toUpperCase()
              .split("")
              .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
              .join("")
            : "",
          format: country?.format,
        });
        if (country?.format) setPhonePlaceholder(country.format);
      }
      return;
    }

    const pureNumber = digits.startsWith(dialCode)
      ? digits.slice(dialCode.length)
      : digits;
    const fullDigits = `${dialCode}${pureNumber}`;
    const phoneNumber = parsePhoneNumberFromString(`+${fullDigits}`);
    const nationalNumber = phoneNumber?.nationalNumber || pureNumber;
    const countryCode = (country?.countryCode || "").toUpperCase();

    const flagEmoji = countryCode
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");

    const country_code = {
      number: nationalNumber,
      name: country?.name || "",
      internationalNumber: phoneNumber?.formatInternational() || `+${fullDigits}`,
      nationalNumber: phoneNumber?.formatNational() || pureNumber,
      countryCode,
      dialCode: `+${dialCode}`,
      country_flag: flagEmoji,
      format: country?.format,
    };

    setValue(name, fullDigits);
    setValue("country_code", country_code);

    if (country?.format) setPhonePlaceholder(country.format);
  };

  const watchedMobile = watch("mobile");
  const watchedCountry = watch("country_code");
  const watchedDial = (watchedCountry?.dialCode || "+").replace("+", "");
  const liveFormattedMobile = watchedMobile
    ? formatPhoneNumber(
      watchedMobile,
      watchedCountry?.format || "+.. (..) .........",
      watchedDial
    )
    : "";


  const preventCountryEditKeydown = (e) => {
    const inputEl = e.target;
    const currentValue = inputEl.value;

    // If field is empty or doesn't start with +, allow normal editing
    if (!currentValue || !currentValue.startsWith('+')) {
      return;
    }

    // Extract country code from current value (everything before first space or number)
    const countryCodeMatch = currentValue.match(/^\+\d+/);
    if (!countryCodeMatch) {
      return;
    }

    const countryCode = countryCodeMatch[0];
    const dialEnd = countryCode.length;

    // Prevent backspace or delete if caret is at the beginning or inside country code
    if (
      (e.key === "Backspace" && inputEl.selectionStart <= dialEnd) ||
      (e.key === "Delete" && inputEl.selectionStart < dialEnd)
    ) {
      e.preventDefault();
      // If trying to delete at the beginning, move cursor to end of country code
      if (inputEl.selectionStart <= dialEnd) {
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }
      return;
    }

    // Prevent typing inside country code area
    if (inputEl.selectionStart < dialEnd) {
      if (!["ArrowRight", "ArrowLeft", "Tab", "Shift", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }
    }

    // Prevent selecting inside country code area with left arrow
    if (inputEl.selectionStart < dialEnd && e.key === "ArrowLeft") {
      e.preventDefault();
      inputEl.setSelectionRange(dialEnd, dialEnd);
    }
  };

  // Enhanced protection against cutting or pasting inside dial code
  const preventCountryEditCutPaste = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;

    // If selection includes any part of dial code, prevent the action
    if (start < dialEnd || end < dialEnd) {
      e.preventDefault();
      inputEl.setSelectionRange(dialEnd, dialEnd);
    }
  };

  // Additional protection for mouse events and context menu
  const preventCountryEditContextMenu = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    if (inputEl.selectionStart < dialEnd) {
      e.preventDefault();
      inputEl.setSelectionRange(dialEnd, dialEnd);
    }
  };

  // Prevent focus and cursor positioning inside dial code
  const handlePhoneInputFocus = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    // If cursor is positioned before dial code end, move it
    if (inputEl.selectionStart < dialEnd) {
      setTimeout(() => {
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }, 0);
    }
  };

  // Enhanced click handler to prevent selecting dial code
  const handlePhoneInputClick = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    setTimeout(() => {
      if (inputEl.selectionStart < dialEnd) {
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }
    }, 0);
  };

  const handleCancel = () => {
    // Reset the form to its initial values
    reset(initUserItem);
    navigate(`${appsRoot}/agents`);
  };

  const handleEmailBlur = async (e) => {
    const email = e.target.value?.trim();

    // Don't check if email is empty or invalid format
    if (!email || errors.email) {
      setEmailExists(false);
      return;
    }

    // Don't check email in edit mode if it hasn't changed
    if (isEditMode && email === store?.userItem?.email) {
      setEmailExists(false);
      return;
    }

    setEmailCheckLoading(true);
    setEmailExists(false);

    try {
      const response = await fetch(`${hostRestApiUrl}/api/v1/admin/user/isuserexists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          email,
          userId: isEditMode ? id : undefined
        })
      });

      const data = await response.json();

      if (data?.data?.userExists) {
        setEmailExists(true);
        setValue('email', email, {
          shouldValidate: true,
          shouldDirty: true
        });
      } else {
        setEmailExists(false);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(false);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  // submit data handler
  const onSubmit = async (values) => {
    if (values) {
      setSubmitting(true);
      try {
        const dialCode = (values?.country_code?.dialCode || "").replace("+", "");
        let mobileValue = values?.mobile || "";
        if (dialCode && mobileValue.startsWith(dialCode)) {
          mobileValue = mobileValue.slice(dialCode.length);
        }
        let photoValue = values.photo;

        if (photoValue instanceof File) {
          photoValue = await fileToBase64(photoValue);
        }
        mobileValue = mobileValue.trim();

        const usrData = {
          first_name: values?.first_name || "",
          last_name: values?.last_name || "",
          email: values?.email || "",
          gender: values?.gender || "",
          mobile: mobileValue || "",
          commission: values?.commission,
          status: values?.status || "",
          photo: photoValue
        };

        if (mobileValue) {
          usrData.country_code = values?.country_code;
        }

        if (values?.role) {
          usrData.role = values?.role?.value || values?.role || "";
        }

        if (isEditMode && values?._id) {
          if (values?.password) {
            usrData.password = values.password;
          }
          await dispatch(updateUser({ id: values._id, data: usrData })).unwrap();
          Notification("Success", t("Agent updated successfully"), "success");
        } else {
          if (values?.password) {
            usrData.password = values.password;
          }
          await dispatch(createAgent(usrData)).unwrap();
          Notification("Success", t("Agent created successfully"), "success");
        }
      } catch (error) {
        Notification("Error", error || t("Operation failed"), "warning");
      } finally {
        setSubmitting(false);
      }
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  const getBackendImageUrl = (photo) => {

    // If photo is not a valid string -> stop
    if (typeof photo !== "string" || !photo.trim()) return null;

    // If full URL -> return as is
    if (photo.startsWith("http")) return photo;

    // Safe replace (photo is guaranteed string now)
    const cleanPath = photo.replace(/^\/+/, "");

    return `${hostRestApiUrl}/${cleanPath}`;
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Notification("Error", "Only JPG, JPEG, or PNG files are allowed.", "warning");
      e.target.value = null; // resets file input
      return;
    }

    field.onChange(file); // pass valid file
  };
  return (
    <Fragment>
      <div className="main-content agents">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Agent") : t("Add Agent")}</h3>

          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/agents`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Row>
              <Form
                className=""
                autoComplete="off"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Row>
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                    <Label className="form-label" for="first_name">
                      {t("First Name")}
                    </Label>
                    <Controller
                      id="first_name"
                      name="first_name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                          invalid={errors.first_name && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.first_name?.message}</FormFeedback>
                  </div>
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                    <Label className="form-label" for="last_name">
                      {t("Last Name")}
                    </Label>
                    <Controller
                      id="last_name"
                      name="last_name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                          invalid={errors.last_name && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.last_name?.message}</FormFeedback>
                  </div>


                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6   " >
                    <Label className="form-label" for="email">
                      {t("Email")}
                    </Label>
                    <Controller
                      id="email"
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                          invalid={(errors.email || emailExists) && true}
                          onBlur={(e) => {
                            field.onBlur(e);
                            handleEmailBlur(e);
                          }}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clear email exists error when user types
                            if (emailExists) {
                              setEmailExists(false);
                            }
                          }}
                        />
                      )}
                    />
                    {emailCheckLoading && (
                      <div className="text-muted mt-1">
                        <Spinner size="sm" /> {t("Checking email...")}
                      </div>
                    )}
                    {emailExists && (
                      <FormFeedback className="d-block">
                        {t("This email already exists")}
                      </FormFeedback>
                    )}
                    {!emailExists && <FormFeedback>{errors.email?.message}</FormFeedback>}
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                    <Label className="form-label" for="password">
                      {t("Password")}
                    </Label>
                    <Controller
                      id="password"
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <InputPasswordToggle
                          {...field}
                          className=""
                          invalid={errors.password && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.password?.message}</FormFeedback>
                  </div>


                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                    <Label className="form-label" for="mobile">
                      {t("Mobile")}
                    </Label>
                    <Controller
                      id="mobile"
                      name="mobile"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          {...field}
                          autoComplete="off"
                          inputClass="w-100"
                          country={"us"}
                          inputProps={{ name: "mobile", ref: field.ref }}
                          placeholder={phonePlaceholder}
                          disableDropdown={false}
                          countryCodeEditable={false}
                          value={liveFormattedMobile}
                          onKeyDown={preventCountryEditKeydown}
                          onCut={preventCountryEditCutPaste}
                          onPaste={preventCountryEditCutPaste}
                          onContextMenu={preventCountryEditContextMenu}
                          onFocus={handlePhoneInputFocus}
                          onClick={handlePhoneInputClick}
                          onChange={(val, country) => {
                            field.onChange(val);
                            handleChangeMobile("mobile", val, country);
                          }}
                        />
                      )}
                    />
                    {errors.mobile && (
                      <FormFeedback className="d-block">
                        {errors.mobile?.message}
                      </FormFeedback>
                    )}
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="photo">{t("Photo")}</Label>

                    <Controller
                      name="photo"
                      control={control}
                      render={({ field }) => {
                        const value = field.value;
                        const imageUrl = getBackendImageUrl(typeof value === "string" ? value : null);
                        const previewUrl = value instanceof File ? URL.createObjectURL(value) : null;

                        return (
                          <>
                            <div className="file-wrapper d-flex">
                              <Input
                                type="file"
                                id="photo"
                                accept=".jpg,.jpeg,.png"
                                className="form-control"
                                onChange={(e) => handleFileChange(e, field)} // ✅ must call your handler
                              />

                              {imageUrl && !previewUrl && (
                                <img
                                  src={imageUrl}
                                  className="file-preview-icon fileicon"
                                  alt=""
                                  onError={(e) => handleImgSrcError(e, Avatar)}

                                />
                              )}

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

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="commission">
                      {t("Commission (%)")}
                    </Label>
                    <Controller
                      id="commission"
                      name="commission"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          autoComplete="off"
                          invalid={!!errors.commission}
                        />
                      )}
                    />
                    <FormFeedback>{errors.commission?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6  ">
                    <Label className="form-label " style={{ marginLeft: "5px" }} for="gender">
                      {t("Gender")}
                    </Label>
                    <Controller

                      id="gender"
                      name="gender"
                      defaultValue=""
                      control={control}
                      render={({ field }) => (
                        <Row className="px-1 gender">
                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              style={{ marginLeft: "-18px" }}
                              {...field}
                              id="male"
                              type="radio"
                              value="MALE"
                              checked={field?.value === "MALE"}
                            />
                            <Label className="form-check-label" style={{ marginLeft: "5px" }} for="male">

                              {t("Male")}
                            </Label>
                          </div>

                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="female"
                              type="radio"
                              value="FEMALE"
                              checked={field?.value === "FEMALE"}
                            />
                            <Label className="form-check-label" for="female">
                              {t("Female")}
                            </Label>
                          </div>
                        </Row>
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.gender?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 ">
                    <Label className="form-label" for="status">
                      {t("Status")}
                    </Label>
                    <Controller
                      id="status"
                      name="status"
                      defaultValue=""
                      control={control}
                      render={({ field }) => (
                        <Row className="px-1 status">
                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="Active"
                              type="radio"
                              value="ACTIVE"
                              checked={field?.value === "ACTIVE"}
                            />
                            <Label className="form-check-label" for="Active">
                              {t("Active")}
                            </Label>
                          </div>

                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="Inactive"
                              type="radio"
                              value="INACTIVE"
                              checked={field?.value === "INACTIVE"}
                            />
                            <Label className="form-check-label" for="Inactive">
                              {t("InActive")}
                            </Label>
                          </div>
                        </Row>
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.status?.message}
                    </FormFeedback>
                  </div>
                </Row>

                <div className="main-form-btn">
                  <div className="form-btn mt-2">
                    <Button
                      type="submit"
                      color="primary"
                      disabled={!store.loading || emailExists || emailCheckLoading}
                    >
                      {store?.loading ? t("Save") : (<Spinner className="spinner-border-login" size="sm" />)}
                    </Button>
                  </div>

                  <div className="form-btn mt-2">
                    <Button
                      type="button"
                      color="secondary"
                      disabled={!store.loading}
                      onClick={handleCancel}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              </Form>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  )
}

export default UserForm;
