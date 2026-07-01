// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getUser, createUser, updateUser, cleanUserMessage, getUserList } from "../store";
import { cleanRoleMessage, getRoleList } from "@src/views/roles/store";
import { getLocationList } from "@src/views/locations/store";
import { getLookups, createLookup } from "@src/views/company-lookups/store";
import { getCodeSettings } from "@src/views/company-settings/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
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
  InputGroup,
  InputGroupText,
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
import CreatableSelect from "react-select/creatable";
import DateInput from "@components/date-input";

// ** Custom Components
import Notification from "@components/toast/notification";
import InputPasswordToggle from "@components/input-password-toggle";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft, Camera, CheckCircle } from "react-feather";

// ** Face Capture
import FaceCaptureModal from "@src/views/attendance/components/FaceCaptureModal";

// ** Constant
import {
  appsRoot,
  countryCodeEditable,
  disableCountryDropdown,
  hostRestApiUrl
} from "@constant/defaultValues";
import { initUserItem } from "@constant/reduxConstant";

// ** Styles
import "react-phone-input-2/lib/style.css";

const UserForm = (props) => {
  const { redirectPath = `${appsRoot}/users` } = props;
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedRoleType = location.state?.roleType;

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.user);
  const roleStore = useSelector((state) => state.role);
  const locationStore = useSelector((state) => state.location);
  const authStore = useSelector((state) => state.auth);
  const companyItem = useSelector((state) => state.company?.companyItem);
  const lookupStore = useSelector((state) => state.companyLookup);
  const selectedLocationId = useSelector((state) => state.locationContext?.selectedLocationId);
  const selectedLocationName = useSelector((state) => state.locationContext?.selectedLocationName);
  const authUserItem = authStore?.authUserItem || null;
  const isLocationAdmin = authUserItem?.role?.name === 'Location Admin';
  // Super Admin (Admin) and their custom-role users are system-level — no location needed
  const isSystemAdmin = authUserItem?.role?.name === 'Admin' || authUserItem?.role?.name === 'Super Admin';
  // Lowercase ISO country code for PhoneInput default (e.g. "gb", "us")
  // NOTE: country_code.countryCode is the ISO code (e.g. "gb"), NOT country_code.code which is the dial code (e.g. "+44")
  const companyPhoneCountry = (
    companyItem?.selected_country ||
    companyItem?.country_code?.countryCode ||
    "us"
  ).toLowerCase();

  // ** States
  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);
  const [roleOptions, setRoleOptions] = useState([]);
  const [resetValue, setResetValue] = useState(false);
  const [phonePlaceholder, setPhonePlaceholder] = useState("+.. (..) .........");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // Employee-related states
  const [showEmployeeFields, setShowEmployeeFields] = useState(false);
  const [employeeCodeAuto, setEmployeeCodeAuto] = useState(false);
  const [employeeCodePrefix, setEmployeeCodePrefix] = useState('');
  const [employeeCodePreview, setEmployeeCodePreview] = useState('');
  const codeSettingsStore = useSelector((state) => state.companySettings?.codeSettings);

  // Face registration states
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);
  const [existingFaceImage, setExistingFaceImage] = useState(null);
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [reportingToOptions, setReportingToOptions] = useState([]);

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
    role: yup.object().required(`${t("Role is required")}.`).nullable(),
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

    // Employee-specific fields (conditional)
    employee_code: yup.string().when('role', {
      is: (val) => {
        if (employeeCodeAuto) return false;
        if (!val) return false;
        const role = roleStore?.roleItems?.find(r => r._id === val.value);
        return role?.name === 'Employee';
      },
      then: (schema) => schema.required(`${t("Employee code is required")}.`),
      otherwise: (schema) => schema.nullable()
    }),

    designation: yup.string().when('role', {
      is: (val) => {
        if (!val) return false;
        const role = roleStore?.roleItems?.find(r => r._id === val.value);
        return role?.name === 'Employee';
      },
      then: (schema) => schema.required(`${t("Designation is required")}.`),
      otherwise: (schema) => schema.nullable()
    }),

    location_id: yup.string().nullable().when([], {
      is: () => !isSystemAdmin,
      then: (schema) => schema.required(`${t("Location is required")}.`),
      otherwise: (schema) => schema.nullable(),
    }),

    department: yup.string().nullable(),
    employment_type: yup.string().nullable(),
    date_of_joining: yup.string().nullable(),
    date_of_birth: yup.string().nullable(),
    reporting_to: yup.string().nullable(),
    address_line1: yup.string().nullable(),
    address_line2: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    postcode: yup.string().nullable(),
    country: yup.string().nullable(),
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

    dispatch(getRoleList(query));
    if (isEditMode) {
      dispatch(getUser(id));
    } else {
      // Load company defaults for pre-filling country code
      dispatch(getCompanyDetails());
    }

    // Fetch locations for dropdown — only needed for company-level users
    if (!isSystemAdmin) {
      dispatch(getLocationList({ status: 'ACTIVE', dropdown: 'yes' }));
    }

    // Fetch users for reporting_to dropdown
    dispatch(getUserList({ status: 'ACTIVE' }));

    // Fetch code generation settings
    dispatch(getCodeSettings());
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

  // Load designation/department lookups when employee fields are shown
  useEffect(() => {
    if (showEmployeeFields) {
      dispatch(getLookups("designation"));
      dispatch(getLookups("department"));
    }
  }, [showEmployeeFields]);

  useEffect(() => {
    /* For blank message api called inside */
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanUserMessage(null));
    }

    if (roleStore?.actionFlag || roleStore?.success || roleStore?.error) {
      dispatch(cleanRoleMessage(null));
    }

    if (
      roleStore?.actionFlag === "ROLE_LST_SCS" ||
      roleStore?.actionFlag === "ROLE_LST_ERR"
    ) {
      let roleOpts = [];
      if (roleStore?.roleItems?.length) {
        let items = roleStore.roleItems;
        // Users screen manages ADMINS only — staff (Employee + any custom
        // company role) are created on the Employees screen. Built-in admin
        // roles (e.g. Location Admin) have companyId = null; custom company
        // roles carry a companyId. So drop the Employee role and anything
        // company-scoped.
        const currentRoleName = authUserItem?.role?.name;
        if (currentRoleName === 'Company Admin' || currentRoleName === 'Location Admin') {
          items = items.filter(
            (item) => item?.name !== 'Employee' && !item?.companyId
          );
        }
        roleOpts = items.map((item) => {
          return {
            ...item,
            value: item?._id,
            label: item?.name,
          };
        });
      }

      setRoleOptions(roleOpts);

      // Pre-select role if roleType is provided and in add mode
      if (!isEditMode && preSelectedRoleType && roleOpts?.length) {
        const foundRole = roleOpts.find(r => r.name === preSelectedRoleType);
        if (foundRole) {
          setValue("role", foundRole);
        }
      }
    }

    if (store?.actionFlag === "USR_CRTD" || store?.actionFlag === "USR_UPDT") {
      dispatch(cleanUserMessage());
      navigate(redirectPath);
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

      // Convert location_id to just the ID string (the Select component handles object conversion)
      if (usrItem?.location_id) {
        if (typeof usrItem.location_id === 'object' && usrItem.location_id._id) {
          usrItem.location_id = usrItem.location_id._id;
        }
      }

      // Populate accessible_locations for Location Admin multi-location (exclude primary)
      if (usrItem?.accessible_locations && Array.isArray(usrItem.accessible_locations)) {
        const primaryId = usrItem.location_id;
        const opts = usrItem.accessible_locations
          .filter((locId) => locId !== primaryId)
          .map((locId) => locationOptions.find((o) => o.value === locId))
          .filter(Boolean);
        setSelectedAccessibleLocations(opts);
      }

      // Convert reporting_to to just the ID string (the Select component handles object conversion)
      if (usrItem?.reporting_to) {
        // Extract just the ID string
        if (typeof usrItem.reporting_to === 'object' && usrItem.reporting_to._id) {
          usrItem.reporting_to = usrItem.reporting_to._id;
        }
        // If it's already a string, keep it as is
      }

      // Remove undefined values and convert null to "" for text inputs
      const textFields = new Set([
        'first_name', 'last_name', 'name', 'email', 'password', 'mobile',
        'gender', 'dob', 'timezone', 'photo', 'profile_picture', 'status',
        'employee_code', 'designation', 'department', 'employment_type',
        'date_of_joining', 'date_of_birth', 'reporting_to', 'location_id',
        'address_line1', 'address_line2', 'city', 'state', 'postcode', 'country',
      ]);
      const cleanedUsrItem = Object.fromEntries(
        Object.entries(usrItem)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, v === null && textFields.has(k) ? '' : v])
      );

      // Strip prefix from employee_code for display in edit mode
      if (cleanedUsrItem.employee_code && employeeCodePrefix) {
        const code = cleanedUsrItem.employee_code;
        if (code.toUpperCase().startsWith(employeeCodePrefix.toUpperCase())) {
          cleanedUsrItem.employee_code = code.slice(employeeCodePrefix.length);
        }
      }

      // Merge with initUserItem to ensure all fields have default values
      // This prevents controlled/uncontrolled input warnings
      reset({ ...initUserItem, ...cleanedUsrItem });
      setResetValue(() => false);

      // Detect existing face registration and show saved reference image if available
      const hasFaceDescriptor = usrItem?.face_descriptor && Array.isArray(usrItem.face_descriptor) && usrItem.face_descriptor.length > 0;
      setHasRegisteredFace(!!hasFaceDescriptor);
      setCapturedFaceImage(null);
      setExistingFaceImage(usrItem?.face_reference_photo ? getBackendImageUrl(usrItem.face_reference_photo) : null);

      // Location Admin: force their location even in edit mode
      if (isLocationAdmin && selectedLocationId) {
        setTimeout(() => setValue('location_id', selectedLocationId), 0);
      }
    }
  }, [roleStore.actionFlag, store.actionFlag]);

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

  // Filter roles based on current user's manageable_roles
  useEffect(() => {
    if (roleStore?.roleItems && authUserItem?.role) {
      const manageable = authUserItem.role.manageable_roles || [];

      // Super Admin can see all roles
      if (authUserItem.role.name === 'Admin' || authUserItem.role.name === 'Super Admin') {
        setFilteredRoles(roleStore.roleItems);
      } else {
        // Filter roles based on manageable_roles
        const filtered = roleStore.roleItems.filter(role =>
          manageable.includes(role.name)
        );
        setFilteredRoles(filtered);
      }
    }
  }, [roleStore?.roleItems, authUserItem]);

  // Location Admin: always force their location immediately
  useEffect(() => {
    if (isLocationAdmin && selectedLocationId) {
      setValue('location_id', selectedLocationId);
    }
  }, [isLocationAdmin, selectedLocationId]);

  // Process location options and set default from global header selection
  useEffect(() => {
    if (isSystemAdmin) return; // Super Admin users have no location
    if (locationStore?.locationItems) {
      const options = locationStore.locationItems.map((loc) => ({
        value: loc._id,
        label: loc.location_name,
      }));
      setLocationOptions(options);

      if (!isLocationAdmin && !isEditMode && !watch('location_id')) {
        // Company Admin: pre-select global header location, or fall back to first available location
        const locationToSelect = selectedLocationId || options[0]?.value;
        if (locationToSelect) {
          setValue('location_id', locationToSelect);
        }
      }
    }
  }, [locationStore?.locationItems, selectedLocationId, isLocationAdmin]);

  // Process reporting_to options (only non-Employee users)
  useEffect(() => {
    if (store?.userItems) {
      const options = store.userItems
        .filter(u => u.role?.name !== 'Employee')
        .map((user) => ({
          value: user._id,
          label: user.name,
        }));
      setReportingToOptions(options);
    }
  }, [store?.userItems]);

  // Watch form values
  const watchedMobile = watch("mobile");
  const watchedCountry = watch("country_code");
  const watchedRole = watch("role");
  const watchedDial = (watchedCountry?.dialCode || "+").replace("+", "");
  const liveFormattedMobile = watchedMobile
    ? formatPhoneNumber(
      watchedMobile,
      watchedCountry?.format || "+.. (..) .........",
      watchedDial
    )
    : "";

  const [isSelectedRoleLocationAdmin, setIsSelectedRoleLocationAdmin] = useState(false);
  const [selectedAccessibleLocations, setSelectedAccessibleLocations] = useState([]);

  // Watch selected role to show/hide employee fields and location admin multi-location
  useEffect(() => {
    if (watchedRole) {
      const role = roleStore?.roleItems?.find(r => r._id === watchedRole.value);
      setShowEmployeeFields(role?.name === 'Employee');
      setIsSelectedRoleLocationAdmin(role?.name === 'Location Admin');
    } else {
      setShowEmployeeFields(false);
      setIsSelectedRoleLocationAdmin(false);
    }
  }, [watchedRole, roleStore?.roleItems]);

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
    navigate(`${appsRoot}/users`);
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
  const onSubmit = async (values) => {
    if (!values) {
      return;
    }
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
        role: values?.role || "",
        status: values?.status || "",
        photo: photoValue
      };
      if (mobileValue) {
        usrData.country_code = values?.country_code;
      }

      if (values?.role) {
        usrData.role = values?.role?.value || values?.role || "";
      }

      // Add employee fields if present
      if (showEmployeeFields || values?.employee_code) {
        usrData.employee_code = (employeeCodeAuto && !isEditMode)
          ? ""
          : `${employeeCodePrefix}${values?.employee_code?.toUpperCase() || ""}`;
        usrData.designation = values?.designation || "";
        usrData.department = values?.department || "";
        usrData.employment_type = values?.employment_type || "";
        usrData.date_of_joining = values?.date_of_joining || "";
        usrData.date_of_birth = values?.date_of_birth || "";
        // Extract value from Select component
        usrData.reporting_to = values?.reporting_to?.value || values?.reporting_to || "";
        usrData.address_line1 = values?.address_line1 || "";
        usrData.address_line2 = values?.address_line2 || "";
        usrData.city = values?.city || "";
        usrData.state = values?.state || "";
        usrData.postcode = values?.postcode || "";
        usrData.country = values?.country || "";
      }

      // Add face image only for newly captured base64 image
      if (capturedFaceImage) {
        usrData.face_image = capturedFaceImage;
      }

      // Location is only applicable for company-level users, not Super Admin context
      if (!isSystemAdmin) {
        if (isLocationAdmin && selectedLocationId) {
          usrData.location_id = selectedLocationId;
        } else {
          usrData.location_id = values.location_id?.value || values.location_id || "";
        }
      }

      // Multi-location for Location Admin role
      if (isSelectedRoleLocationAdmin) {
        usrData.accessible_locations = selectedAccessibleLocations.map((o) => o.value);
      }

      if (isEditMode && values?._id) {
        // Edit mode: only include password if the user entered it
        if (values?.password) {
          usrData.password = values.password;
        }
        await dispatch(updateUser({ id: values._id, data: usrData })).unwrap();
        Notification("Success", t("User updated successfully"), "success");
      } else {
        // Create mode: password is required
        if (!values?.password) {
          Notification("Error", t("Password is required"), "warning");
          return;
        }
        usrData.password = values.password;
        await dispatch(createUser(usrData)).unwrap();
        Notification("Success", t("User created successfully"), "success");
      }
    } catch (error) {
      const errorMessage = error?.message || error || t("Operation failed");
      Notification("Error", errorMessage, "warning");
    } finally {
      setSubmitting(false);
    }
  };
  // Loading state is managed by Redux actions (createUser, updateUser)

  function getBackendImageUrl(photo) {

    // If photo is not a valid string -> stop
    if (typeof photo !== "string" || !photo.trim()) return null;

    // If full URL -> return as is
    if (photo.startsWith("http")) return photo;

    // Safe replace (photo is guaranteed string now)
    const cleanPath = photo.replace(/^\/+/, "");

    return `${hostRestApiUrl}/${cleanPath}`;
  }


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
      <div className="main-content users">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit User") : t("Add User")}</h3>

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
                onSubmit={handleSubmit(onSubmit, (errs) => console.log('User form validation errors:', errs))}
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
                        const displayImage = previewUrl || imageUrl || Avatar;

                        return (
                          <>
                            <div className="file-wrapper d-flex">
                              <Input
                                type="file"
                                id="photo"
                                accept="image/*"
                                className="form-control"
                                onChange={(e) => handleFileChange(e, field)}
                              />

                              {/* 📌 Show backend image WHEN value is string */}
                              {imageUrl && !previewUrl && (
                                <img
                                  src={imageUrl}
                                  className="file-preview-icon fileicon"
                                  alt=""
                                  accept=".jpg,.jpeg,.png"
                                  onError={(e) => handleImgSrcError(e, Avatar)}

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

                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6 " >
                    <Label className="form-label" for="role">
                      {t("Role")}
                    </Label>
                    <Controller
                      id="role"
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          isClearable={false}
                          options={roleOptions}
                          className="react-select"
                          classNamePrefix="select"
                          placeholder={t("Select role...")}
                        />
                      )}
                    />
                    <FormFeedback className="d-block">
                      {errors.role?.message}
                    </FormFeedback>
                  </div>

                  {/* Primary Location - hidden for Super Admin context (system-level users) */}
                  {!isSystemAdmin && (
                  <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                    <Label className="form-label" for="location_id">
                      {t("Primary Location")} <span className="text-danger">*</span>
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
                        name="location_id"
                        control={control}
                        render={({ field }) => {
                          const selectedLocation = locationOptions.find(opt => opt.value === field.value);
                          return (
                            <Select
                              {...field}
                              options={locationOptions}
                              placeholder={t("Select Location")}
                              classNamePrefix="select"
                              value={selectedLocation || null}
                              onChange={(selected) => field.onChange(selected?.value || null)}
                            />
                          );
                        }}
                      />
                    )}
                    {errors.location_id && (
                      <FormFeedback className="d-block">{errors.location_id.message}</FormFeedback>
                    )}
                  </div>
                  )}

                  {/* Additional Locations - only for Location Admin role */}
                  {!isSystemAdmin && isSelectedRoleLocationAdmin && (
                    <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                      <Label className="form-label">
                        {t("Additional Locations")}
                      </Label>
                      {(() => {
                        const primaryLocId = watch('location_id')?.value || watch('location_id') || '';
                        const filteredOptions = locationOptions.filter((o) => o.value !== primaryLocId);
                        return (
                          <Select
                            isMulti
                            options={filteredOptions}
                            classNamePrefix="select"
                            className="accessible-locations-select"
                            placeholder={t("Select additional locations")}
                            value={selectedAccessibleLocations}
                            onChange={(selected) => setSelectedAccessibleLocations(selected || [])}
                          />
                        );
                      })()}
                      <small className="text-muted">{t("Location Admin will manage these locations")}</small>
                    </div>
                  )}
                </Row>

                {/* Employee Information Section */}
                {showEmployeeFields && (
                  <Fragment>
                    <h4 className="mt-4 mb-3 col-12">{t("Employee Information")}</h4>

                    <Row>
                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="employee_code">
                          {t("Employee Code")} {!employeeCodeAuto && <span className="text-danger">*</span>}
                        </Label>
                        {employeeCodeAuto && !isEditMode ? (
                          <div>
                            <Input
                              disabled
                              value={employeeCodePreview || t('Auto-generated')}
                              className="bg-light"
                            />
                            <small className="text-muted">{t("Code will be auto-generated on save")}</small>
                          </div>
                        ) : (
                          <Controller
                            name="employee_code"
                            control={control}
                            render={({ field }) => (
                              employeeCodePrefix ? (
                                <InputGroup>
                                  <InputGroupText>{employeeCodePrefix}</InputGroupText>
                                  <Input
                                    {...field}
                                    id="employee_code"
                                    className=""
                                    autoComplete="off"
                                    placeholder={t("Enter employee code")}
                                    invalid={errors.employee_code && true}
                                    style={{ textTransform: 'uppercase' }}
                                    onChange={(e) => {
                                      field.onChange(e.target.value.toUpperCase());
                                    }}
                                  />
                                </InputGroup>
                              ) : (
                                <Input
                                  {...field}
                                  id="employee_code"
                                  className=""
                                  autoComplete="off"
                                  placeholder={t("Enter employee code")}
                                  invalid={errors.employee_code && true}
                                  style={{ textTransform: 'uppercase' }}
                                  onChange={(e) => {
                                    field.onChange(e.target.value.toUpperCase());
                                  }}
                                />
                              )
                            )}
                          />
                        )}
                        {errors.employee_code && (
                          <FormFeedback className="d-block">{errors.employee_code.message}</FormFeedback>
                        )}
                      </div>

                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="designation">
                          {t("Designation")} <span className="text-danger">*</span>
                        </Label>
                        <Controller
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
                        {errors.designation && (
                          <FormFeedback className="d-block">{errors.designation.message}</FormFeedback>
                        )}
                      </div>
                    </Row>

                    <Row>
                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="department">
                          {t("Department")}
                        </Label>
                        <Controller
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
                            />
                          )}
                        />
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
                            />
                          )}
                        />
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
                            />
                          )}
                        />
                      </div>
                    </Row>

                    <h4 className="mt-3 mb-2 col-12">{t("Address Information")}</h4>

                    <Row>
                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="address_line1">
                          {t("Address Line 1")}
                        </Label>
                        <Controller
                          name="address_line1"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="address_line1"
                              placeholder={t("Street address")}
                            />
                          )}
                        />
                      </div>

                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="address_line2">
                          {t("Address Line 2")}
                        </Label>
                        <Controller
                          name="address_line2"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="address_line2"
                              placeholder={t("Apartment, suite, etc.")}
                            />
                          )}
                        />
                      </div>
                    </Row>

                    <Row>
                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="city">
                          {t("City")}
                        </Label>
                        <Controller
                          name="city"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="city"
                              placeholder={t("City")}
                            />
                          )}
                        />
                      </div>

                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="state">
                          {t("State/Province")}
                        </Label>
                        <Controller
                          name="state"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="state"
                              placeholder={t("State/Province")}
                            />
                          )}
                        />
                      </div>
                    </Row>

                    <Row>
                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="postcode">
                          {t("Postal Code")}
                        </Label>
                        <Controller
                          name="postcode"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="postcode"
                              placeholder={t("Postal code")}
                            />
                          )}
                        />
                      </div>

                      <div className="mb-2 col-lg-6 col-md-6 col-sm-6">
                        <Label className="form-label" for="country">
                          {t("Country")}
                        </Label>
                        <Controller
                          name="country"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="country"
                              placeholder={t("Country")}
                            />
                          )}
                        />
                      </div>
                    </Row>

                    {/* Face Registration Section */}
                    <h4 className="mt-3 mb-2 col-12">{t("Face Registration")}</h4>
                    <Row>
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
                    </Row>
                  </Fragment>
                )}

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
