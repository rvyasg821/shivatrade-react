// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getEmployee, createEmployee, updateEmployee, cleanEmployeeMessage, getLocationAssignments, addLocationAssignment, removeLocationAssignment } from "../store";
import { getLocationList } from "../../locations/store";
import { getLookups, createLookup } from "../../company-lookups/store";
import { getCodeSettings } from "@src/views/company-settings/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Form,
  Card,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Button,
  CardBody,
  FormFeedback,
  Spinner,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** React Dropdown Import
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

// ** Custom Components
import Notification from "@components/toast/notification";
import InputPasswordToggle from "@components/input-password-toggle";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { useTranslation } from "react-i18next";
import DateInput from "@components/date-input";

// ** Country List
import { getCountryList } from "@src/views/auth/register/utils/countryTimezoneUtils";

// ** Axios Import
import instance from "@src/utility/AxiosConfig";

// ** Icons Import
import { ArrowLeft, Camera, CheckCircle } from "react-feather";

// ** Face Capture
import FaceCaptureModal from "@src/views/attendance/components/FaceCaptureModal";

// ** Constant
import { appsRoot, hostRestApiUrl } from "@constant/defaultValues";
import { initEmployeeItem } from "@constant/reduxConstant";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Styles
import "react-phone-input-2/lib/style.css";

const EmployeeForm = () => {
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.employee);
  const locationStore = useSelector((state) => state.location);
  const authStore = useSelector((state) => state.auth);
  const companyItem = useSelector((state) => state.company?.companyItem);
  const lookupStore = useSelector((state) => state.companyLookup);
  const selectedLocationId = useSelector((state) => state.locationContext?.selectedLocationId);
  const selectedLocationName = useSelector((state) => state.locationContext?.selectedLocationName);
  const authUserItem = authStore?.authUserItem || null;
  const isLocationAdmin = authUserItem?.role?.name === 'Location Admin';
  // Lowercase ISO country code for PhoneInput default (e.g. "gb", "us")
  // NOTE: country_code.countryCode is the ISO code (e.g. "gb"), NOT country_code.code which is the dial code (e.g. "+44")
  const companyPhoneCountry = (
    companyItem?.selected_country ||
    companyItem?.country_code?.countryCode ||
    "us"
  ).toLowerCase();

  // ** Country dropdown
  const countryList = getCountryList();
  const [selectedCountry, setSelectedCountry] = useState(null);

  // ** States
  const [locationOptions, setLocationOptions] = useState([]);
  const [phonePlaceholder, setPhonePlaceholder] = useState("+.. (..) .........");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [employeeCodeCheckLoading, setEmployeeCodeCheckLoading] = useState(false);
  const [employeeCodeExists, setEmployeeCodeExists] = useState(false);
  const [employeeCodeAuto, setEmployeeCodeAuto] = useState(false);
  const [employeeCodePrefix, setEmployeeCodePrefix] = useState('');
  const [employeeCodePreview, setEmployeeCodePreview] = useState('');
  const codeSettingsStore = useSelector((state) => state.companySettings?.codeSettings);

  // Additional location assignment states
  const locationAssignments = useSelector((state) => state.employee?.locationAssignments) || [];
  const [newAssignmentLocation, setNewAssignmentLocation] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Face registration states
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);
  const [existingFaceImage, setExistingFaceImage] = useState(null);
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false);

  // ** Constants
  const isEditMode = !!id;

  /* Yup validation schema */
  const EmployeeSchema = yup.object().shape({
    first_name: yup.string().required(`${t("First Name is required")}.`),
    last_name: yup.string().required(`${t("Last Name is required")}.`),
    email: yup
      .string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    password: yup
      .string()
      .nullable()
      .test("password-strength", t("Min. 8 chars, uppercase, lowercase, number and special character."), (value) => {
        if (!value) return true; // Optional in both add & edit — default password used server-side for add
        return /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(value);
      }),
    mobile: yup
      .string()
      .nullable()
      .notRequired()
      .test("valid-mobile", `${t("Minimum 8 digits required")}.`, (value) => {
        if (!value || value.trim() === "") return true;
        const phoneNumber = parsePhoneNumberFromString(`+${value}`);
        return phoneNumber && phoneNumber.nationalNumber.length >= 8;
      }),
    employee_code: yup
      .string()
      .when([], {
        is: () => !employeeCodeAuto,
        then: (schema) => schema
          .required(`${t("Employee Code is required")}.`)
          .matches(/^[A-Z0-9_-]+$/, `${t("Employee Code must be uppercase alphanumeric")}.`),
        otherwise: (schema) => schema.nullable(),
      }),
    location_id: yup.mixed().required(`${t("Location is required")}.`).nullable(),
    designation: yup.string().required(`${t("Designation is required")}.`),
    department: yup.string().required(`${t("Department is required")}.`),
    employment_type: yup.string().nullable(),
    date_of_joining: yup.string().required(`${t("Date of Joining is required")}.`).transform((v) => (v === "" ? null : v)).nullable(),
    date_of_birth: yup.string().transform((v) => (v === "" ? null : v)).nullable(),
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
    defaultValues: initEmployeeItem,
    resolver: yupResolver(EmployeeSchema),
    shouldFocusError: false,
  });

  useLayoutEffect(() => {
    // Fetch active locations for dropdown
    dispatch(getLocationList({ status: "ACTIVE", dropdown: "yes" }));
    // Fetch designation/department lookups
    dispatch(getLookups("designation"));
    dispatch(getLookups("department"));
    // Fetch code generation settings
    dispatch(getCodeSettings());
    if (isEditMode) {
      dispatch(getEmployee(id));
      dispatch(getLocationAssignments(id));
    } else {
      // Load company defaults for pre-filling country code
      dispatch(getCompanyDetails());
    }
  }, [id]);

  // Update auto-code state when code settings load
  useEffect(() => {
    if (codeSettingsStore) {
      const isAuto = codeSettingsStore.employee_code_mode === 'auto';
      const prefix = codeSettingsStore.employee_code_prefix || '';
      setEmployeeCodeAuto(isAuto);
      setEmployeeCodePrefix(prefix);
      setEmployeeCodePreview(codeSettingsStore.employee_code_preview || '');

      // In edit mode, strip prefix from loaded employee_code for display
      if (isEditMode && prefix) {
        const currentCode = watch('employee_code');
        if (currentCode && currentCode.toUpperCase().startsWith(prefix.toUpperCase())) {
          setValue('employee_code', currentCode.slice(prefix.length));
        }
      }
    }
  }, [codeSettingsStore]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanEmployeeMessage(null));
    }

    // Location Admin: force their location value for form validation
    if (isLocationAdmin && selectedLocationId) {
      setValue('location_id', selectedLocationId);
    }

    if (locationStore?.actionFlag === "LOC_LST_SCS" && locationStore?.locationItems) {
      const options = locationStore.locationItems.map((loc) => ({
        ...loc,
        value: loc._id,
        label: loc.location_name,
      }));
      setLocationOptions(options);

      // Location Admin: always force their location
      if (isLocationAdmin && selectedLocationId) {
        const locOption = options.find(opt => opt.value === selectedLocationId);
        if (locOption) {
          setValue('location_id', locOption);
        }
      } else if (!isEditMode && selectedLocationId) {
        // Company Admin: pre-select global header location for new employees
        const locOption = options.find(opt => opt.value === selectedLocationId);
        if (locOption && !watch('location_id')) {
          setValue('location_id', locOption);
        }
      }
    }

    if (store?.actionFlag === "EMP_UPDT") {
      dispatch(cleanEmployeeMessage());
      navigate(`${appsRoot}/employees`);
    }

    if (store?.actionFlag === "EMP_SCS" && store?.employeeItem) {
      let empItem = { ...store.employeeItem, password: "" };

      if (empItem?.location_id) {
        const location = {
          ...empItem.location_id,
          value: empItem.location_id?._id || "",
          label: empItem.location_id?.location_name || "",
        };
        empItem = { ...empItem, location_id: location };
      }

      // Fix mobile number - prepend dial code for validation
      if (empItem?.mobile && empItem?.country_code?.dialCode) {
        const dialCode = empItem.country_code.dialCode.replace('+', '');
        empItem.mobile = dialCode + empItem.mobile;
      }

      // Strip prefix from employee_code for display in edit mode
      if (empItem.employee_code && employeeCodePrefix) {
        const code = empItem.employee_code;
        if (code.toUpperCase().startsWith(employeeCodePrefix.toUpperCase())) {
          empItem.employee_code = code.slice(employeeCodePrefix.length);
        }
      }

      // Convert null/undefined to "" for text input fields to prevent controlled/uncontrolled warnings
      const textFields = new Set([
        'first_name', 'last_name', 'email', 'password', 'mobile',
        'employee_code', 'designation', 'department', 'employment_type',
        'date_of_joining', 'date_of_birth', 'gender', 'status',
        'address_1', 'address_2', 'city', 'state', 'country', 'zip_code',
      ]);
      // Exclude non-form fields from reset data
      const excludeFields = new Set(['additional_locations']);
      const cleanedEmpItem = Object.fromEntries(
        Object.entries(empItem)
          .filter(([k, v]) => v !== undefined && !excludeFields.has(k))
          .map(([k, v]) => [k, v === null && textFields.has(k) ? '' : v])
      );

      reset({ ...initEmployeeItem, ...cleanedEmpItem });

      // Restore country dropdown state from saved value
      if (empItem?.country) {
        const cOption =
          countryList.find((c) => c.value.toUpperCase() === empItem.country.toUpperCase()) ||
          countryList.find((c) => c.label.toLowerCase() === empItem.country.toLowerCase());
        if (cOption) {
          setSelectedCountry(cOption);
          setValue("country", cOption.value);
        }
      }

      // Detect existing face registration and show saved reference image if available
      const hasFaceDescriptor = empItem?.face_descriptor && Array.isArray(empItem.face_descriptor) && empItem.face_descriptor.length > 0;
      setHasRegisteredFace(!!hasFaceDescriptor);
      setCapturedFaceImage(null);
      setExistingFaceImage(empItem?.face_reference_photo ? getBackendImageUrl(empItem.face_reference_photo) : null);

      // Location Admin: force their location even in edit mode
      if (isLocationAdmin && selectedLocationId && locationOptions.length) {
        const locOption = locationOptions.find(opt => opt.value === selectedLocationId);
        if (locOption) {
          setTimeout(() => setValue('location_id', locOption), 0);
        }
      }
    }
  }, [store.actionFlag, locationStore.actionFlag]);

  // Pre-fill mobile country_code from company defaults (add mode only)
  useEffect(() => {
    if (!isEditMode && companyItem?._id && companyItem.country_code) {
      const cc = companyItem.country_code;
      setValue("country_code", {
        countryCode: (cc.countryCode || cc.code || "").toUpperCase(), // countryCode is ISO code (e.g. "GB"), code is dial code (e.g. "+44")
        dialCode: cc.dialCode || cc.code || "",
        name: cc.name || "",
        format: cc.format || "",
      });
    }
  }, [companyItem?._id, isEditMode]);

  // Default country from location → fallback to company country (add mode only)
  const watchedLocationId = watch("location_id");
  useEffect(() => {
    if (isEditMode) return; // edit mode handled in the EMP_SCS block

    let countryCode = null;

    // 1. Try location's country
    const loc = watchedLocationId;
    if (loc && typeof loc === 'object') {
      countryCode = loc.country || null;
    }

    // 2. Fallback to company country
    if (!countryCode && companyItem) {
      countryCode = companyItem.selected_country || companyItem.country_code?.countryCode || null;
    }

    if (countryCode) {
      const upper = countryCode.toUpperCase();
      const cOption =
        countryList.find((c) => c.value.toUpperCase() === upper) ||
        countryList.find((c) => c.label.toLowerCase() === countryCode.toLowerCase());
      if (cOption) {
        setSelectedCountry(cOption);
        setValue("country", cOption.value);
      }
    }
  }, [watchedLocationId?.value, watchedLocationId?.country, companyItem?._id, isEditMode, locationOptions]);

  function getBackendImageUrl(photo) {
    if (typeof photo !== "string" || !photo.trim()) return null;
    if (photo.startsWith("http")) return photo;
    const cleanPath = photo.replace(/^\/+/, "");
    return `${hostRestApiUrl}/${cleanPath}`;
  }

  const handleAddLocationAssignment = async () => {
    if (!newAssignmentLocation) return;
    setAssignmentLoading(true);
    try {
      await dispatch(addLocationAssignment({
        employeeId: id,
        data: { location_id: newAssignmentLocation.value },
      })).unwrap();
      setNewAssignmentLocation(null);
      // Refresh assignments
      dispatch(getLocationAssignments(id));
      Notification("Success", t("Location assigned successfully"), "success");
    } catch (error) {
      Notification("Error", error || t("Failed to assign location"), "warning");
    }
    setAssignmentLoading(false);
  };

  const handleRemoveLocationAssignment = async (assignmentId) => {
    try {
      await dispatch(removeLocationAssignment(assignmentId)).unwrap();
      Notification("Success", t("Location assignment removed"), "success");
    } catch (error) {
      Notification("Error", error || t("Failed to remove assignment"), "warning");
    }
  };

  const handleChangeMobile = (name, value, country) => {
    const dialCode = country?.dialCode || "";
    const digits = String(value || "").replace(/\D/g, "");

    if (!digits || digits === dialCode) {
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

    if (!currentValue || !currentValue.startsWith('+')) {
      return;
    }

    const countryCodeMatch = currentValue.match(/^\+\d+/);
    if (!countryCodeMatch) {
      return;
    }

    const countryCode = countryCodeMatch[0];
    const dialEnd = countryCode.length;

    if (
      (e.key === "Backspace" && inputEl.selectionStart <= dialEnd) ||
      (e.key === "Delete" && inputEl.selectionStart < dialEnd)
    ) {
      e.preventDefault();
      if (inputEl.selectionStart <= dialEnd) {
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }
      return;
    }

    if (inputEl.selectionStart < dialEnd) {
      if (!["ArrowRight", "ArrowLeft", "Tab", "Shift", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }
    }

    if (inputEl.selectionStart < dialEnd && e.key === "ArrowLeft") {
      e.preventDefault();
      inputEl.setSelectionRange(dialEnd, dialEnd);
    }
  };

  const preventCountryEditCutPaste = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;

    if (start < dialEnd || end < dialEnd) {
      e.preventDefault();
      inputEl.setSelectionRange(dialEnd, dialEnd);
    }
  };

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

  const handlePhoneInputFocus = (e) => {
    const inputEl = e.target;
    const watchedCountryLocal = watch("country_code");
    const dial = (watchedCountryLocal?.dialCode || "+1").replace("+", "");
    const dialCodePattern = new RegExp(`^\\+${dial}`);
    const match = inputEl.value.match(dialCodePattern);
    const dialEnd = match ? match[0].length : dial.length + 1;

    if (inputEl.selectionStart < dialEnd) {
      setTimeout(() => {
        inputEl.setSelectionRange(dialEnd, dialEnd);
      }, 0);
    }
  };

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
    reset(initEmployeeItem);
    navigate(`${appsRoot}/employees`);
  };

  const handleEmailBlur = async (e) => {
    const email = e.target.value?.trim();

    if (!email || errors.email) {
      setEmailExists(false);
      return;
    }

    if (isEditMode && email === store?.employeeItem?.email) {
      setEmailExists(false);
      return;
    }

    setEmailCheckLoading(true);
    setEmailExists(false);

    try {
      const response = await instance.post('/admin/employee/check-email', {
        email,
        employeeId: isEditMode ? id : undefined
      });

      const data = response.data;

      if (data?.data?.exists) {
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

  const handleEmployeeCodeBlur = async (e) => {
    const code = e.target.value?.trim();

    if (!code || errors.employee_code) {
      setEmployeeCodeExists(false);
      return;
    }

    const fullCode = `${employeeCodePrefix}${code.toUpperCase()}`;
    if (isEditMode && fullCode === store?.employeeItem?.employee_code?.toUpperCase()) {
      setEmployeeCodeExists(false);
      return;
    }

    setEmployeeCodeCheckLoading(true);
    setEmployeeCodeExists(false);

    try {
      const response = await instance.post('/admin/employee/check-code', {
        employee_code: `${employeeCodePrefix}${code.toUpperCase()}`,
        employeeId: isEditMode ? id : undefined
      });

      const data = response.data;

      if (data?.data?.exists) {
        setEmployeeCodeExists(true);
        setValue('employee_code', code.toUpperCase(), {
          shouldValidate: true,
          shouldDirty: true
        });
      } else {
        setEmployeeCodeExists(false);
      }
    } catch (error) {
      console.error('Error checking employee code:', error);
      setEmployeeCodeExists(false);
    } finally {
      setEmployeeCodeCheckLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (values) {
        const dialCode = (values?.country_code?.dialCode || "").replace("+", "");
        let mobileValue = values?.mobile || "";
        if (dialCode && mobileValue.startsWith(dialCode)) {
          mobileValue = mobileValue.slice(dialCode.length);
        }
        mobileValue = mobileValue.trim();

        const empData = {
          first_name: values?.first_name || "",
          last_name: values?.last_name || "",
          email: values?.email || "",
          mobile: mobileValue || "",
          employee_code: (employeeCodeAuto && !isEditMode)
            ? ""
            : (() => {
                const raw = (values?.employee_code || "").toUpperCase();
                const pfx = employeeCodePrefix.toUpperCase();
                if (pfx && raw.startsWith(pfx)) return raw;
                return `${employeeCodePrefix}${raw}`;
              })(),
          location_id: isLocationAdmin && selectedLocationId
            ? selectedLocationId
            : (values?.location_id?.value || values?.location_id || ""),
          designation: values?.designation || "",
          department: values?.department || "",
          employment_type: values?.employment_type || "",
          date_of_joining: values?.date_of_joining || null,
          date_of_birth: values?.date_of_birth || null,
          gender: values?.gender || "",
          address_1: values?.address_1 || "",
          address_2: values?.address_2 || "",
          city: values?.city || "",
          state: values?.state || "",
          country: values?.country || "",
          zip_code: values?.zip_code || "",
          is_active: values?.is_active ?? true,
        };

        if (mobileValue) {
          empData.country_code = values?.country_code;
        }

        // Add face image only for newly captured base64 image
        if (capturedFaceImage) {
          empData.face_image = capturedFaceImage;
        }

        // Include password: required on create, optional on edit
        if (!isEditMode) {
          empData.password = values?.password || "";
        } else if (values?.password) {
          empData.password = values.password;
        }

        try {
          if (isEditMode && values?._id) {
            await dispatch(updateEmployee({ id: values._id, data: empData })).unwrap();
            Notification("Success", t("Employee updated successfully"), "success");
          } else {
            const result = await dispatch(createEmployee(empData)).unwrap();
            Notification("Success", t("Employee created successfully"), "success");
            // Redirect to edit page so user can fill remaining details tab-by-tab
            const createdId = result?.employeeItem?._id;
            if (createdId) {
              navigate(`${appsRoot}/employees/edit/${createdId}`);
              return;
            }
          }
        } catch (error) {
          Notification("Error", error || t("Operation failed"), "warning");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content employees">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Employee") : t("Add Employee")}</h3>

          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
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
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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
                          type="email"
                          className=""
                          autoComplete="off"
                          invalid={(errors.email || emailExists) && true}
                          onBlur={(e) => {
                            field.onBlur(e);
                            handleEmailBlur(e);
                          }}
                          onChange={(e) => {
                            field.onChange(e);
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

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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
                          autoComplete="new-password"
                          invalid={errors.password && true}
                        />
                      )}
                    />
                    <FormFeedback>{errors.password?.message}</FormFeedback>
                    {isEditMode ? (
                      <small className="text-muted">{t("Leave blank to keep current password")}</small>
                    ) : (
                      <small className="text-muted">{t("Leave blank to use default password (Welcome@123)")}</small>
                    )}
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
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
                          country={companyPhoneCountry}
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

                  {/* Employee Information Section */}
                  <h4 className="mt-4 mb-3 col-12">{t("Employee Information")}</h4>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="employee_code">
                      {t("Employee Code")} {!employeeCodeAuto && <span className="text-danger">*</span>}
                    </Label>
                    {employeeCodeAuto && !isEditMode ? (
                      <div>
                        <InputGroup>
                          {employeeCodePrefix && <InputGroupText>{employeeCodePrefix}</InputGroupText>}
                          <Input
                            readOnly
                            value={employeeCodePreview ? employeeCodePreview.replace(employeeCodePrefix, '') : t('Auto')}
                            style={{ textTransform: 'uppercase' }}
                          />
                        </InputGroup>
                        <small className="text-muted">{t("Code will be auto-generated on save")}</small>
                      </div>
                    ) : (
                      <Fragment>
                        <Controller
                          id="employee_code"
                          name="employee_code"
                          control={control}
                          render={({ field }) => (
                            employeeCodePrefix ? (
                              <InputGroup>
                                <InputGroupText>{employeeCodePrefix}</InputGroupText>
                                <Input
                                  {...field}
                                  className=""
                                  autoComplete="off"
                                  style={{ textTransform: 'uppercase' }}
                                  invalid={(errors.employee_code || employeeCodeExists) && true}
                                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  onBlur={(e) => {
                                    field.onBlur(e);
                                    handleEmployeeCodeBlur(e);
                                  }}
                                />
                              </InputGroup>
                            ) : (
                              <Input
                                {...field}
                                className=""
                                autoComplete="off"
                                style={{ textTransform: 'uppercase' }}
                                invalid={(errors.employee_code || employeeCodeExists) && true}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                onBlur={(e) => {
                                  field.onBlur(e);
                                  handleEmployeeCodeBlur(e);
                                }}
                              />
                            )
                          )}
                        />
                        {employeeCodeCheckLoading && (
                          <div className="text-muted mt-1">
                            <Spinner size="sm" /> {t("Checking code...")}
                          </div>
                        )}
                        {employeeCodeExists && (
                          <FormFeedback className="d-block">
                            {t("This employee code already exists")}
                          </FormFeedback>
                        )}
                        {!employeeCodeExists && errors.employee_code && (
                          <FormFeedback className="d-block">{errors.employee_code.message}</FormFeedback>
                        )}
                      </Fragment>
                    )}
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="location_id">
                      {t("Location")} <span className="text-danger">*</span>
                    </Label>
                    {isLocationAdmin ? (
                      <>
                        <Input
                          type="text"
                          value={selectedLocationName || t("Your Location")}
                          disabled
                          className="form-control"
                        />
                        <Controller
                          name="location_id"
                          control={control}
                          render={({ field }) => (
                            <input type="hidden" {...field} value={field.value || selectedLocationId || ''} />
                          )}
                        />
                      </>
                    ) : (
                      <Controller
                        id="location_id"
                        name="location_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            isClearable={false}
                            options={locationOptions}
                            className="react-select"
                            classNamePrefix="select"
                            placeholder={t("Select location...")}
                          />
                        )}
                      />
                    )}
                    <FormFeedback className="d-block">
                      {errors.location_id?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="designation">
                      {t("Designation")}
                    </Label>
                    <Controller
                      id="designation"
                      name="designation"
                      control={control}
                      render={({ field }) => (
                        <CreatableSelect
                          isClearable
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select or type designation...")}
                          options={(lookupStore?.designations || []).map(d => ({ value: d.name, label: d.name }))}
                          value={field.value ? { value: field.value, label: field.value } : null}
                          onChange={(opt) => field.onChange(opt?.value || "")}
                          onCreateOption={(inputValue) => {
                            dispatch(createLookup({ type: "designation", name: inputValue })).unwrap().then(() => {
                              field.onChange(inputValue);
                            }).catch(() => {});
                          }}
                          formatCreateLabel={(inputValue) => `${t("Create")} "${inputValue}"`}
                          styles={errors.designation ? { control: (base) => ({ ...base, borderColor: '#ea5455' }) } : {}}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">{errors.designation?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="department">
                      {t("Department")}
                    </Label>
                    <Controller
                      id="department"
                      name="department"
                      control={control}
                      render={({ field }) => (
                        <CreatableSelect
                          isClearable
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select or type department...")}
                          options={(lookupStore?.departments || []).map(d => ({ value: d.name, label: d.name }))}
                          value={field.value ? { value: field.value, label: field.value } : null}
                          onChange={(opt) => field.onChange(opt?.value || "")}
                          onCreateOption={(inputValue) => {
                            dispatch(createLookup({ type: "department", name: inputValue })).unwrap().then(() => {
                              field.onChange(inputValue);
                            }).catch(() => {});
                          }}
                          formatCreateLabel={(inputValue) => `${t("Create")} "${inputValue}"`}
                          styles={errors.department ? { control: (base) => ({ ...base, borderColor: '#ea5455' }) } : {}}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">{errors.department?.message}</FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="employment_type">
                      {t("Employment Type")}
                    </Label>
                    <Controller
                      name="employment_type"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="select"
                          {...field}
                          id="employment_type"
                        >
                          <option value="">{t("Select Type")}</option>
                          <option value="full-time">{t("Full Time")}</option>
                          <option value="part-time">{t("Part Time")}</option>
                          <option value="contract">{t("Contract")}</option>
                          <option value="intern">{t("Intern")}</option>
                        </Input>
                      )}
                    />
                  </div>

                   <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" style={{ marginLeft: "5px" }} for="gender">
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

                          <div
                            className="form-check"
                            style={{ width: "max-content" }}
                          >
                            <Input
                              {...field}
                              id="other"
                              type="radio"
                              value="OTHER"
                              checked={field?.value === "OTHER"}
                            />
                            <Label className="form-check-label" for="other">
                              {t("Other")}
                            </Label>
                          </div>
                        </Row>
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.gender?.message}
                    </FormFeedback>
                  </div>
                </Row>

                <Row>
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="date_of_joining">
                      {t("Date of Joining")}
                    </Label>
                    <Controller
                      name="date_of_joining"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          field={field}
                          id="date_of_joining"
                          maxDate="today"
                          invalid={!!errors.date_of_joining}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.date_of_joining?.message}
                    </FormFeedback>
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="date_of_birth">
                      {t("Date of Birth")}
                    </Label>
                    <Controller
                      name="date_of_birth"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          field={field}
                          id="date_of_birth"
                          maxDate="today"
                          invalid={!!errors.date_of_birth}
                        />
                      )}
                    />
                  </div>
                </Row>

                {/* Additional Locations Section - Edit mode only */}
                {isEditMode && (
                  <Row>
                    <h4 className="mt-3 mb-2 col-12">{t("Additional Locations")}</h4>

                    <Col sm="12" className="mb-2">
                      <div className="d-flex align-items-end gap-2 mb-2">
                        <div style={{ minWidth: 250 }}>
                          <Label className="form-label">{t("Assign Location")}</Label>
                          <Select
                            isClearable
                            options={locationOptions.filter(opt => {
                              const primaryLocId = watch('location_id')?.value || watch('location_id');
                              const assignedIds = locationAssignments.map(a => a.location_id);
                              return opt.value !== primaryLocId && !assignedIds.includes(opt.value);
                            })}
                            className="react-select"
                            classNamePrefix="select"
                            placeholder={t("Select location...")}
                            value={newAssignmentLocation}
                            onChange={(val) => setNewAssignmentLocation(val)}
                          />
                        </div>
                        <Button
                          type="button"
                          color="primary"
                          size="sm"
                          className="mb-0"
                          disabled={!newAssignmentLocation || assignmentLoading}
                          onClick={handleAddLocationAssignment}
                        >
                          {assignmentLoading ? <Spinner size="sm" /> : t("Assign")}
                        </Button>
                      </div>

                      {locationAssignments.length > 0 && (
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm">
                            <thead>
                              <tr>
                                <th>{t("Location")}</th>
                                <th>{t("Status")}</th>
                                <th style={{ width: 80 }}>{t("Action")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {locationAssignments.map((assignment) => (
                                <tr key={assignment._id}>
                                  <td>{assignment.location?.location_name || assignment.location_id}</td>
                                  <td>
                                    <span className={`badge bg-${assignment.is_active ? 'success' : 'secondary'}`}>
                                      {assignment.is_active ? t("Active") : t("Inactive")}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <Button
                                      type="button"
                                      color="flat-danger"
                                      size="sm"
                                      className="p-25"
                                      onClick={() => handleRemoveLocationAssignment(assignment._id)}
                                    >
                                      ✕
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {locationAssignments.length === 0 && (
                        <p className="text-muted small">{t("No additional locations assigned.")}</p>
                      )}
                    </Col>
                  </Row>
                )}

                {isEditMode && <Row>

                  {/* Address Information Section */}
                  <h4 className="mt-3 mb-2 col-12">{t("Address Information")}</h4>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="address_1">
                      {t("Address Line 1")}
                    </Label>
                    <Controller
                      id="address_1"
                      name="address_1"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                        />
                      )}
                    />
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="address_2">
                      {t("Address Line 2")}
                    </Label>
                    <Controller
                      id="address_2"
                      name="address_2"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                        />
                      )}
                    />
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="city">
                      {t("City")}
                    </Label>
                    <Controller
                      id="city"
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                        />
                      )}
                    />
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="state">
                      {t("State")}
                    </Label>
                    <Controller
                      id="state"
                      name="state"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                        />
                      )}
                    />
                  </div>

                  

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="zip_code">
                      {t("Zip Code")}
                    </Label>
                    <Controller
                      id="zip_code"
                      name="zip_code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          className=""
                          autoComplete="off"
                        />
                      )}
                    />
                  </div>

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="country">
                      {t("Country")}
                    </Label>
                    <Controller
                      id="country"
                      name="country"
                      control={control}
                      render={({ field }) => (
                        <Select
                          inputId="country"
                          classNamePrefix="select"
                          options={countryList}
                          value={selectedCountry}
                          onChange={(option) => {
                            setSelectedCountry(option);
                            field.onChange(option?.value || "");
                          }}
                          placeholder={t("Select country")}
                          isClearable
                          isSearchable
                        />
                      )}
                    />
                  </div>


                </Row>}

                {/* Face Registration Section - Edit mode only */}
                {isEditMode && <Row>
                  <h4 className="mt-3 mb-2 col-12">{t("Face Registration")}</h4>
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <div className="d-flex align-items-center gap-1">
                      <Button
                        type="button"
                        color={(capturedFaceImage || hasRegisteredFace) ? "success" : "primary"}
                        outline
                        size="sm"
                        onClick={() => setFaceModalOpen(true)}
                      >
                        <Camera size={14} className="me-50" />
                        {(capturedFaceImage || hasRegisteredFace) ? t("Re-capture Face") : t("Capture Face")}
                      </Button>
                      {!capturedFaceImage && hasRegisteredFace && (
                        <span className="text-success d-flex align-items-center">
                          <CheckCircle size={14} className="me-50" />
                          {t("Face already registered")}
                        </span>
                      )}
                      {capturedFaceImage && (
                        <span className="text-success d-flex align-items-center">
                          <CheckCircle size={14} className="me-50" />
                          {t("Face captured")}
                        </span>
                      )}
                    </div>
                    {capturedFaceImage && (
                      <div className="mt-1">
                        <img
                          src={capturedFaceImage}
                          alt="Captured face"
                          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '2px solid #28c76f' }}
                        />
                      </div>
                    )}
                    {!capturedFaceImage && existingFaceImage && (
                      <div className="mt-1">
                        <img
                          src={existingFaceImage}
                          alt="Registered face"
                          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '2px solid #28c76f' }}
                        />
                      </div>
                    )}
                    <small className="text-muted d-block mt-50">
                      {t("Capture a clear face photo for attendance face verification.")}
                    </small>
                  </div>
                </Row>}

                <FaceCaptureModal
                  isOpen={faceModalOpen}
                  toggle={() => setFaceModalOpen(false)}
                  actionLabel={t("Register")}
                  onCapture={(base64) => {
                    setCapturedFaceImage(base64);
                    setExistingFaceImage(null);
                    setHasRegisteredFace(true);
                    setFaceModalOpen(false);
                  }}
                />

                <div className="main-form-btn">
                  <div className="form-btn mt-2">
                    <Button
                      type="submit"
                      color="primary"
                      disabled={!store.loading || emailExists || emailCheckLoading || employeeCodeExists || employeeCodeCheckLoading}
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
  );
};

export default EmployeeForm;
