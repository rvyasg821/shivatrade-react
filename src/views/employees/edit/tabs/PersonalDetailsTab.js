import { Fragment, useState, useEffect } from "react";
import { Row, Col, Label, Input, Button, FormFeedback, Spinner, Card, CardBody, CardHeader, CardTitle, InputGroup, InputGroupText } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-input-2";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import DateInput from "@components/date-input";
import Select from "react-select";
import { useSelector, useDispatch } from "react-redux";
import { getRoleList } from "@src/views/roles/store";
import InputPasswordToggle from "@components/input-password-toggle";
import { Camera, CheckCircle } from "react-feather";
import FaceCaptureModal from "@src/views/attendance/components/FaceCaptureModal";

import instance from "@src/utility/AxiosConfig";
import useFormLoading from "@src/hooks/useFormLoading";

import "react-phone-input-2/lib/style.css";


const PersonalDetailsTab = ({ employeeData, onSave, loading, getBackendImageUrl, isCreateMode = false, locations = [], codeSettings }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const dispatch = useDispatch();
  const companyItem = useSelector((state) => state.company?.companyItem);
  const authStore = useSelector((state) => state.auth);
  const locationCtx = useSelector((state) => state.locationContext);
  const roleStore = useSelector((state) => state.role);

  useEffect(() => {
    if (isCreateMode) {
      dispatch(getRoleList({ purpose: "user-form" }));
    }
  }, [isCreateMode]);

  // Resolve phone country: location > company > auth user company > "us"
  const resolvePhoneCountry = () => {
    // Try selected location country from context
    const locDetails = locationCtx?.selectedLocationDetails;
    if (locDetails?.country) {
      const c = locDetails.country.toLowerCase();
      if (c.length === 2) return c;
    }
    // Try company item (from company store)
    if (companyItem?.selected_country) return companyItem.selected_country.toLowerCase();
    // Try auth user's company
    const authCompany = authStore?.authUserItem?.company;
    if (authCompany?.selected_country) return authCompany.selected_country.toLowerCase();
    // Try auth user's country_code
    const authCC = authStore?.authUserItem?.country_code?.countryCode;
    if (authCC) return authCC.toLowerCase();
    return "us";
  };

  const [phonePlaceholder, setPhonePlaceholder] = useState("+.. (..) .........");
  const [phoneCountry, setPhoneCountry] = useState("us");

  // Update phone country when data loads
  useEffect(() => {
    if (!employeeData?.mobile) {
      const resolved = resolvePhoneCountry();
      setPhoneCountry(resolved);
    }
  }, [companyItem, authStore?.authUserItem, locationCtx]);

  // Email duplicate check
  const [emailExists, setEmailExists] = useState(false);
  const handleEmailBlur = async (e) => {
    const email = e.target.value?.trim();
    if (!email || errors.email) { setEmailExists(false); return; }
    // If editing and email unchanged, skip
    if (!isCreateMode && email === employeeData?.email) { setEmailExists(false); return; }
    try {
      const res = await instance.post('/admin/employee/check-email', { email, employeeId: isCreateMode ? undefined : employeeData?._id });
      setEmailExists(!!res.data?.data?.exists);
    } catch { setEmailExists(false); }
  };

  // Default location from header selector in create mode
  useEffect(() => {
    if (isCreateMode && locationCtx?.selectedLocationId) {
      setValue('location_id', locationCtx.selectedLocationId);
    }
  }, [isCreateMode, locationCtx?.selectedLocationId]);

  // Face ID state
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);

  const hasFaceDescriptor =
    employeeData?.face_descriptor &&
    Array.isArray(employeeData.face_descriptor) &&
    employeeData.face_descriptor.length > 0;

  const existingFaceImage = employeeData?.face_reference_photo && getBackendImageUrl
    ? getBackendImageUrl(employeeData.face_reference_photo)
    : null;

  // Build schema: hardcoded required fields
  const schemaShape = {
    first_name: yup.string().required(t("First Name is required")),
    last_name: yup.string().required(t("Last Name is required")),
    email: yup.string().required(t("Email is required")).email(t("Invalid email")),
    password: yup.string().nullable().test("password-strength", t("Min. 8 chars, uppercase, lowercase, number and special character."), (value) => {
      if (!value) return true;
      return /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(value);
    }),
    mobile: yup.string().nullable().notRequired().test("valid-mobile", t("Minimum 8 digits required"), (value) => {
        if (!value || value.trim() === "") return true;
        const phoneNumber = parsePhoneNumberFromString(`+${value}`);
        return phoneNumber && phoneNumber.nationalNumber.length >= 8;
      }),
    gender: yup.string().required(t("Gender is required")),
    date_of_birth: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
    middle_name: yup.string().nullable(),
    marital_status: yup.string().nullable(),
    nationality: yup.string().nullable(),
    ni_number: yup.string().nullable(),
    // Create mode fields
    ...(isCreateMode ? {
      location_id: yup.string().required(t("Location is required")),
      role_id: yup.string().required(t("Role is required")),
    } : {}),
  };
  const schema = yup.object().shape(schemaShape);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "all",
    shouldFocusError: false,
    resolver: yupResolver(schema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      password: "",
      mobile: "",
      country_code: null,
      gender: "MALE",
      date_of_birth: "",
      marital_status: "",
      nationality: "",
      ni_number: "",
      ...(isCreateMode ? { location_id: "", role_id: "" } : {}),
    },
  });

  useEffect(() => {
    if (employeeData) {
      let mobile = employeeData.mobile || "";
      if (mobile && employeeData.country_code?.dialCode) {
        const dialCode = employeeData.country_code.dialCode.replace("+", "");
        if (!mobile.startsWith(dialCode)) {
          mobile = dialCode + mobile;
        }
      }
      // Set phone country from employee's stored country_code
      const empCountryCode = (
        employeeData.country_code?.countryCode ||
        employeeData.country_code?.code ||
        ""
      ).toLowerCase();
      if (empCountryCode) {
        setPhoneCountry(empCountryCode);
      }

      reset({
        first_name: employeeData.first_name || "",
        middle_name: employeeData.middle_name || "",
        last_name: employeeData.last_name || "",
        email: employeeData.email || "",
        password: "",
        mobile,
        country_code: employeeData.country_code || null,
        gender: employeeData.gender || "MALE",
        date_of_birth: employeeData.date_of_birth || "",
        marital_status: employeeData.marital_status || "",
        nationality: employeeData.nationality || "",
        ni_number: employeeData.ni_number || "",
      });
    }
  }, [employeeData]);

  const watchedCountry = watch("country_code");
  const watchedMobile = watch("mobile");
  const watchedDial = (watchedCountry?.dialCode || "+").replace("+", "");
  const liveFormattedMobile = watchedMobile
    ? formatPhoneNumber(watchedMobile, watchedCountry?.format || "+.. (..) .........", watchedDial)
    : "";

  const handleChangeMobile = (name, value, country) => {
    const dialCode = country?.dialCode || "";
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits || digits === dialCode) return;
    const pureNumber = digits.startsWith(dialCode) ? digits.slice(dialCode.length) : digits;
    const fullDigits = `${dialCode}${pureNumber}`;
    const phoneNumber = parsePhoneNumberFromString(`+${fullDigits}`);
    const countryCode = (country?.countryCode || "").toUpperCase();
    const flagEmoji = countryCode.split("").map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
    setValue(name, fullDigits);
    setValue("country_code", {
      number: phoneNumber?.nationalNumber || pureNumber,
      name: country?.name || "",
      internationalNumber: phoneNumber?.formatInternational() || `+${fullDigits}`,
      nationalNumber: phoneNumber?.formatNational() || pureNumber,
      countryCode,
      dialCode: `+${dialCode}`,
      country_flag: flagEmoji,
      format: country?.format,
    });
    if (country?.format) setPhonePlaceholder(country.format);
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const dialCode = (values?.country_code?.dialCode || "").replace("+", "");
      let mobileValue = values?.mobile || "";
      if (dialCode && mobileValue.startsWith(dialCode)) {
        mobileValue = mobileValue.slice(dialCode.length);
      }

      const data = {
        first_name: values.first_name,
        middle_name: values.middle_name || null,
        last_name: values.last_name,
        email: values.email,
        mobile: mobileValue.trim(),
        gender: values.gender,
        date_of_birth: values.date_of_birth || null,
        marital_status: values.marital_status || null,
        nationality: values.nationality || null,
        ni_number: values.ni_number || null,
      };
      if (mobileValue) data.country_code = values.country_code;
      if (values.password) data.password = values.password;
      if (capturedFaceImage) data.face_image = capturedFaceImage;
      // Add create-mode fields
      if (isCreateMode) {
        data.location_id = values.location_id;
        data.role_id = values.role_id;
      }
      if (emailExists) return;
      await onSave(data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaceCapture = (base64) => {
    setCapturedFaceImage(base64);
    setFaceModalOpen(false);
  };

  return (
    <Fragment>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <Row>
          {/* Row 1: First Name, Middle Name, Last Name */}
          <Col md="4" className="mb-2">
            <Label>{t("First Name")} <span className="text-danger">*</span></Label>
            <Controller name="first_name" control={control} render={({ field }) => (
              <Input {...field} invalid={!!errors.first_name} />
            )} />
            <FormFeedback>{errors.first_name?.message}</FormFeedback>
          </Col>
          <Col md="4" className="mb-2">
            <Label>{t("Middle Name")}</Label>
            <Controller name="middle_name" control={control} render={({ field }) => (
              <Input {...field} />
            )} />
          </Col>
          <Col md="4" className="mb-2">
            <Label>{t("Last Name")} <span className="text-danger">*</span></Label>
            <Controller name="last_name" control={control} render={({ field }) => (
              <Input {...field} invalid={!!errors.last_name} />
            )} />
            <FormFeedback>{errors.last_name?.message}</FormFeedback>
          </Col>

          {/* Row 2: Employee Code, Location (create mode) / Email, Password (edit mode) */}
          {isCreateMode && (
            <>
              <Col md="6" className="mb-2">
                <Label>{t("Location")} <span className="text-danger">*</span></Label>
                <Controller
                  name="location_id"
                  control={control}
                  render={({ field }) => {
                    const options = locations.map(loc => ({
                      value: loc._id,
                      label: loc.location_name,
                    }));
                    const selected =
                      options.find(o => o.value === field.value) || null;
                    return (
                      <Select
                        classNamePrefix="select"
                        className="react-select"
                        isClearable={false}
                        options={options}
                        value={selected}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        placeholder={t("Select Location")}
                      />
                    );
                  }}
                />
                <FormFeedback className="d-block">{errors.location_id?.message}</FormFeedback>
              </Col>
              <Col md="6" className="mb-2">
                <Label>{t("Role")} <span className="text-danger">*</span></Label>
                <Controller
                  name="role_id"
                  control={control}
                  render={({ field }) => {
                    const opts = (roleStore?.roleItems || [])
                      .filter((r) => (r?.category || "") === "custom" && r?.isActive !== false)
                      .map((r) => ({ value: r._id, label: r.name }));
                    const selected =
                      opts.find((o) => o.value === field.value) || null;
                    return (
                      <Select
                        classNamePrefix="select"
                        className="react-select"
                        isClearable={false}
                        options={opts}
                        value={selected}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        placeholder={t("Select a role...")}
                        noOptionsMessage={() => t("No custom roles. Create one in Master → Roles.")}
                      />
                    );
                  }}
                />
                <FormFeedback className="d-block">{errors.role_id?.message}</FormFeedback>
              </Col>
              <Col md="6" className="mb-2">
                <Label>{t("Employee Code")}</Label>
                {codeSettings?.employee_code_mode === 'auto' ? (
                  <InputGroup>
                    {codeSettings?.employee_code_prefix && (
                      <InputGroupText>{codeSettings.employee_code_prefix}</InputGroupText>
                    )}
                    <Input
                      readOnly
                      value={codeSettings?.employee_code_preview
                        ? codeSettings.employee_code_preview.replace(codeSettings.employee_code_prefix || '', '')
                        : t('Auto')}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </InputGroup>
                ) : (
                  <Input disabled value={t("Auto-generated on save")} className="bg-light" />
                )}
                <small className="text-muted">{t("Code will be auto-generated on save")}</small>
              </Col>
            </>
          )}

          <Col md="6" className="mb-2">
            <Label>{t("Email")} <span className="text-danger">*</span></Label>
            <Controller name="email" control={control} render={({ field }) => (
              <Input {...field} type="email"
                invalid={!!errors.email || emailExists}
                disabled={!isCreateMode && !!employeeData}
                onBlur={(e) => { field.onBlur(e); handleEmailBlur(e); }}
              />
            )} />
            {emailExists && <div className="text-danger small mt-25">{t("This email already exists. Please use a different email.")}</div>}
            <FormFeedback>{errors.email?.message}</FormFeedback>
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Password")}</Label>
            <Controller name="password" control={control} render={({ field }) => (
              <InputPasswordToggle {...field} autoComplete="new-password" invalid={!!errors.password} />
            )} />
            <FormFeedback>{errors.password?.message}</FormFeedback>
            <small className="text-muted">{isCreateMode ? t("Leave blank to use default (Welcome@123)") : t("Leave blank to keep current password")}</small>
          </Col>

          {/* Row 3: Mobile, Gender */}
          <Col md="6" className="mb-2">
            <Label>{t("Mobile")}</Label>
            <Controller name="mobile" control={control} render={({ field }) => (
              <PhoneInput
                key={`phone-${phoneCountry}`}
                inputClass="w-100"
                country={phoneCountry}
                inputProps={{ name: "mobile", ref: field.ref }}
                placeholder={phonePlaceholder}
                disableDropdown={false}
                countryCodeEditable={false}
                value={field.value || ""}
                onChange={(val, country) => {
                  field.onChange(val);
                  handleChangeMobile("mobile", val, country);
                }}
              />
            )} />
            {errors.mobile && <FormFeedback className="d-block">{errors.mobile?.message}</FormFeedback>}
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Gender")} <span className="text-danger">*</span></Label>
            <Controller name="gender" control={control} render={({ field }) => (
              <Row className="px-1 mt-50">
                {["MALE", "FEMALE", "OTHER"].map((g) => (
                  <div key={g} className="form-check" style={{ width: "max-content" }}>
                    <Input {...field} id={`gender-${g}`} type="radio" value={g} checked={field.value === g} />
                    <Label className="form-check-label" htmlFor={`gender-${g}`}>{t(g.charAt(0) + g.slice(1).toLowerCase())}</Label>
                  </div>
                ))}
              </Row>
            )} />
            <FormFeedback className="d-block">{errors.gender?.message}</FormFeedback>
          </Col>

          {/* Row 4: Date of Birth, Marital Status */}
          <Col md="6" className="mb-2">
            <Label>{t("Date of Birth")}</Label>
            <Controller name="date_of_birth" control={control} render={({ field }) => (
              <DateInput field={field} id="date_of_birth" maxDate="today" invalid={!!errors.date_of_birth} />
            )} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Marital Status")}</Label>
            <Controller name="marital_status" control={control} render={({ field }) => (
              <Input type="select" {...field}>
                <option value="">{t("Select")}</option>
                <option value="SINGLE">{t("Single")}</option>
                <option value="MARRIED">{t("Married")}</option>
                <option value="DIVORCED">{t("Divorced")}</option>
                <option value="WIDOWED">{t("Widowed")}</option>
                <option value="OTHER">{t("Other")}</option>
              </Input>
            )} />
          </Col>

          {/* Row 5: Nationality, NI/Tax ID Number */}
          {/* <Col md="6" className="mb-2">
            <Label>{t("Nationality")}</Label>
            <Controller name="nationality" control={control} render={({ field }) => (
              <Input {...field} />
            )} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("NI / Tax ID Number")}</Label>
            <Controller name="ni_number" control={control} render={({ field }) => (
              <Input {...field} />
            )} />
          </Col> */}
        </Row>

        <div className="mt-2">
          <Button type="submit" color="primary" disabled={loading}>
            {loading ? <Spinner size="sm" /> : isCreateMode ? t("Create Employee & Continue") : t("Save Personal Details")}
          </Button>
        </div>
      </form>

      <FaceCaptureModal
        isOpen={faceModalOpen}
        toggle={() => setFaceModalOpen(false)}
        actionLabel={t("Register")}
        onCapture={handleFaceCapture}
      />
    </Fragment>
  );
};

export default PersonalDetailsTab;
