// ** React Imports
import { Fragment, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { getLocation, createLocation, updateLocation, cleanLocationMessage, getLocationCapacity } from "../store";
import { initLocationContext } from "@src/redux/locationContext";
import { getCodeSettings } from "@src/views/company-settings/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Form,
  Card,
  CardHeader,
  CardTitle,
  Badge,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Button,
  CardBody,
  FormFeedback,
} from "reactstrap";

import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom Components
import Notification from "@components/toast/notification";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  useCountryOptions,
  useStateOptions,
  useCityOptions,
  toGeoOption,
} from "@src/views/_shared/geo/useGeoOptions";
import parsePhoneNumberFromString from "libphonenumber-js";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";
import { getTimezoneList } from "@src/views/auth/register/utils/countryTimezoneUtils";
import { useTranslation } from "react-i18next";

// ** Icons Import
import { ArrowLeft } from "react-feather";

// ** Constant
import { appsRoot } from "@constant/defaultValues";
import { initLocationItem } from "@constant/reduxConstant";

// ** Styles
import "react-phone-input-2/lib/style.css";

const LocationForm = () => {
  // ** Hooks
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.location);
  const authStore = useSelector((state) => state.auth);
  const companyItem = useSelector((state) => state.company?.companyItem);
  const authUserItem = authStore?.authUserItem || null;

  const isSystemAdmin =
    authUserItem?.role?.name === "Super Admin" || authUserItem?.role?.name === "Admin";

  // ** Lists
  const timezoneList = getTimezoneList();
  // Countries now come from the Country master (static list as fallback if it
  // is empty). State and city suggest from the masters but stay free text —
  // they are plain strings on the record and every existing location typed them.
  const countryList = useCountryOptions();

  // ** Constants
  const isEditMode = !!id;
  // Derive company's default phone country (lowercase ISO, e.g. "gb", "us")
  // NOTE: country_code.countryCode is the ISO code (e.g. "gb"), NOT country_code.code which is the dial code (e.g. "+44")
  const companyPhoneCountry = (
    companyItem?.selected_country ||
    companyItem?.country_code?.countryCode ||
    "us"
  ).toLowerCase();

  // ** Code settings state
  const [locationCodeAuto, setLocationCodeAuto] = useState(false);
  const [locationCodePrefix, setLocationCodePrefix] = useState('');
  const [locationCodePreview, setLocationCodePreview] = useState('');
  const codeSettingsStore = useSelector((state) => state.companySettings?.codeSettings);

  // ** States
  const [phonePlaceholder, setPhonePlaceholder] = useState("+.. (..) .........");
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  // In add mode, initialize selectedCountry from company data if already available in Redux
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (id) return null; // edit mode: will be set from location data in LOC_SCS
    const code = companyItem?.selected_country || companyItem?.country_code?.countryCode;
    if (!code) return null;
    return countryList.find((c) => c.value.toUpperCase() === code.toUpperCase()) || null;
  });
  // phoneCountry drives PhoneInput flag — updated on edit-load and on country-change
  const [phoneCountry, setPhoneCountry] = useState(companyPhoneCountry);

  /* Yup validation schema */
  const LocationSchema = yup.object().shape({
    // Section 1: Location Information (required)
    location_name: yup.string().required(`${t("Location Name is required")}.`),
    location_code: yup.string().when([], {
      is: () => !locationCodeAuto,
      then: (schema) => schema
        .required(`${t("Location Code is required")}.`)
        .matches(/^[A-Z0-9_-]+$/, `${t("Location Code must be uppercase alphanumeric")}.`),
      otherwise: (schema) => schema.nullable(),
    }),
    // Section 2: Contact Information (required)
    contact_name: yup.string().required(`${t("Contact Name is required")}.`),
    email: yup.string()
      .required(`${t("Email is required")}.`)
      .email(`${t("Invalid email address")}.`),
    mobile: yup
      .string()
      .nullable()
      .notRequired()
      .test("valid-mobile", `${t("Minimum 8 digits required")}.`, (value) => {
        if (!value || value.trim() === "") return true;
        // Tolerate both formats: "+447123456789" (new E.164) and
        // "447123456789" (legacy / from PhoneInput's raw digits).
        const trimmed = value.trim();
        const e164 = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
        const phoneNumber = parsePhoneNumberFromString(e164);
        return phoneNumber && phoneNumber.nationalNumber.length >= 8;
      }),
    // Section 3: Address Information (all optional)
    address_line1: yup.string().nullable().notRequired(),
    address_line2: yup.string().nullable().notRequired(),
    city: yup.string().nullable().notRequired(),
    state: yup.string().nullable().notRequired(),
    country: yup.string().nullable().notRequired(),
    postcode: yup.string().nullable().notRequired(),
    latitude: yup.number().nullable().notRequired().transform((value, original) => (original === '' ? null : value)),
    longitude: yup.number().nullable().notRequired().transform((value, original) => (original === '' ? null : value)),
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
    defaultValues: initLocationItem,
    resolver: yupResolver(LocationSchema),
    shouldFocusError: false,
  });

  // Suggestion lists for the address block, narrowed by what is picked above.
  const watchedAddressCountry = watch("country");
  const watchedState = watch("state");
  const stateOptions = useStateOptions(watchedAddressCountry);
  const cityOptions = useCityOptions(watchedState, stateOptions);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // Always fetch company details (needed for phone country default in both add and edit)
    dispatch(getCompanyDetails());
    // Fetch code generation settings
    dispatch(getCodeSettings());

    if (isEditMode) {
      dispatch(getLocation(id));
    } else {
      if (!isSystemAdmin) {
        // Verify subscription capacity before allowing form access
        dispatch(getLocationCapacity()).then((result) => {
          const capacity = result?.payload?.locationCapacity;
          if (capacity && !capacity.canCreateMore) {
            navigate(`${appsRoot}/locations`);
          }
        });
      }
    }
  }, [id]);

  // Update auto-code state when code settings load
  useEffect(() => {
    if (codeSettingsStore) {
      const isAuto = codeSettingsStore.location_code_mode === 'auto';
      const prefix = codeSettingsStore.location_code_prefix || '';
      setLocationCodeAuto(isAuto);
      setLocationCodePrefix(prefix);
      setLocationCodePreview(codeSettingsStore.location_code_preview || '');

      // In edit mode, strip prefix from loaded location_code for display
      if (isEditMode && prefix) {
        const currentCode = watch('location_code');
        if (currentCode && currentCode.toUpperCase().startsWith(prefix.toUpperCase())) {
          setValue('location_code', currentCode.slice(prefix.length));
        }
      }
    }
  }, [codeSettingsStore]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanLocationMessage(null));
    }

    if (store?.actionFlag === "LOC_CRTD" || store?.actionFlag === "LOC_UPDT") {
      dispatch(cleanLocationMessage());
      navigate(`${appsRoot}/locations`);
    }

    if (store?.actionFlag === "LOC_SCS" && store?.locationItem) {
      let locItem = { ...store.locationItem };

      // Strip prefix from location_code for display in edit mode
      if (locItem.location_code && locationCodePrefix) {
        const code = locItem.location_code;
        if (code.toUpperCase().startsWith(locationCodePrefix.toUpperCase())) {
          locItem.location_code = code.slice(locationCodePrefix.length);
        }
      }

      // Convert null/undefined to "" for text input fields
      const textFields = new Set([
        'location_name', 'location_code', 'description', 'contact_name',
        'email', 'mobile', 'address_line1', 'address_line2', 'city', 'state',
        'country', 'postcode', 'timezone', 'currency', 'latitude', 'longitude',
        'notification_email', 'notification_email_cc',
      ]);
      const cleanedLocItem = Object.fromEntries(
        Object.entries(locItem)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, v === null && textFields.has(k) ? '' : v])
      );

      reset({ ...initLocationItem, ...cleanedLocItem });

      // Restore timezone Select state
      if (locItem.timezone) {
        const tzOption = timezoneList.find((tz) => tz.value === locItem.timezone);
        setSelectedTimezone(tzOption || { value: locItem.timezone, label: locItem.timezone });
      }

      // Restore country Select state — match by ISO code (value) or by label
      if (locItem.country) {
        const cOption =
          countryList.find((c) => c.value === locItem.country) ||
          countryList.find((c) => c.label.toLowerCase() === locItem.country.toLowerCase());
        if (cOption) {
          setSelectedCountry(cOption);
          setValue("country", cOption.value);
        } else {
          setSelectedCountry({ value: locItem.country, label: locItem.country });
        }
      } else {
        // Fallback: use company country if location has no country stored yet
        const companyCode = companyItem?.selected_country || companyItem?.country_code?.countryCode;
        if (companyCode) {
          const cOption = countryList.find((c) => c.value.toUpperCase() === companyCode.toUpperCase());
          if (cOption) {
            setSelectedCountry(cOption);
            setValue("country", cOption.value);
          }
        }
      }

      // Restore PhoneInput flag — use stored country_code, fall back to company
      if (locItem.country_code?.countryCode) {
        setPhoneCountry(locItem.country_code.countryCode.toLowerCase());
      } else if (companyPhoneCountry && companyPhoneCountry !== "us") {
        setPhoneCountry(companyPhoneCountry);
      }
    }
  }, [store.actionFlag]);

  // Pre-fill timezone, currency, country and mobile country_code from company defaults
  useEffect(() => {
    if (!companyItem?._id) return;

    if (!isEditMode) {
      // ADD MODE: pre-fill all fields from company defaults
      if (companyItem.currency) setValue("currency", companyItem.currency);

      if (companyItem.timezone) {
        setValue("timezone", companyItem.timezone);
        const tzOption = timezoneList.find((tz) => tz.value === companyItem.timezone);
        setSelectedTimezone(tzOption || { value: companyItem.timezone, label: companyItem.timezone });
      }

      // Pre-fill country Select from company's selected_country (ISO code) or country name
      const companyCountryCode = companyItem.selected_country || companyItem.country_code?.countryCode;
      if (companyCountryCode) {
        const cOption = countryList.find((c) => c.value.toUpperCase() === companyCountryCode.toUpperCase());
        if (cOption) {
          setSelectedCountry(cOption);
          setValue("country", cOption.value);
          setPhoneCountry(cOption.value.toLowerCase());
        }
      } else if (companyItem.country) {
        const cOption = countryList.find(
          (c) => c.label.toLowerCase() === companyItem.country.toLowerCase()
        );
        if (cOption) {
          setSelectedCountry(cOption);
          setValue("country", cOption.value);
          setPhoneCountry(cOption.value.toLowerCase());
        }
      }

      // Pre-fill mobile country code from company
      if (companyItem.country_code && typeof companyItem.country_code === "object") {
        const cc = companyItem.country_code;
        setValue("country_code", {
          countryCode: (cc.countryCode || cc.code || "").toUpperCase(),
          dialCode: cc.dialCode || cc.code || "",
          name: cc.name || "",
          format: cc.format || "",
        });
      }
    } else {
      // EDIT MODE: apply company data as fallback for fields not set by location data
      const companyCode = companyItem.selected_country || companyItem.country_code?.countryCode;
      if (!selectedCountry && companyCode) {
        const cOption = countryList.find((c) => c.value.toUpperCase() === companyCode.toUpperCase());
        if (cOption) {
          setSelectedCountry(cOption);
          setValue("country", cOption.value);
        }
      }
      if (phoneCountry === "us" && companyPhoneCountry && companyPhoneCountry !== "us") {
        setPhoneCountry(companyPhoneCountry);
      }
    }
  }, [companyItem?._id, isEditMode]);

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
    if (country?.countryCode) setPhoneCountry(country.countryCode.toLowerCase());

    if (country?.format) setPhonePlaceholder(country.format);
  };

  const watchedMobile = watch("mobile");
  const watchedCountry = watch("country_code");
  const watchedDial = (watchedCountry?.dialCode || "+").replace("+", "");
  // `mobile` is now stored E.164-prefixed (e.g. "+447…") but the
  // formatter + PhoneInput expect raw digits (no leading "+").
  const watchedMobileDigits = (watchedMobile || "").replace(/^\+/, "");
  const liveFormattedMobile = watchedMobileDigits
    ? formatPhoneNumber(
        watchedMobileDigits,
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
    reset(initLocationItem);
    navigate(`${appsRoot}/locations`);
  };

  const onSubmit = async (values) => {
    if (values) {
      // Store the full international number (E.164 with leading "+") so
      // the DB value is unambiguous. The formatted human-readable string
      // lives inside `country_code.internationalNumber` / nationalNumber.
      const dialCode = (values?.country_code?.dialCode || "").replace("+", "");
      const rawDigits = (values?.mobile || "").replace(/\D/g, "");
      let mobileValue = rawDigits;
      if (rawDigits && dialCode) {
        mobileValue = rawDigits.startsWith(dialCode)
          ? `+${rawDigits}`
          : `+${dialCode}${rawDigits}`;
      } else if (rawDigits) {
        mobileValue = rawDigits.startsWith("+") ? rawDigits : `+${rawDigits}`;
      }

      const locData = {
        location_name: values?.location_name || "",
        location_code: (locationCodeAuto && !isEditMode)
          ? ""
          : (() => {
              const raw = (values?.location_code || "").toUpperCase();
              const pfx = locationCodePrefix.toUpperCase();
              // Don't double-prepend prefix if already present
              if (pfx && raw.startsWith(pfx)) return raw;
              return `${locationCodePrefix}${raw}`;
            })(),
        description: values?.description || "",
        contact_name: values?.contact_name || "",
        email: values?.email || "",
        mobile: mobileValue || "",
        address_line1: values?.address_line1 || "",
        address_line2: values?.address_line2 || "",
        city: values?.city || "",
        state: values?.state || "",
        country: values?.country || "",
        postcode: values?.postcode || "",
        timezone: values?.timezone || "",
        currency: values?.currency || "",
        latitude: values?.latitude || null,
        longitude: values?.longitude || null,
        notification_email: values?.notification_email || "",
        cc_company_admin: values?.cc_company_admin ?? false,
        notification_email_cc: values?.notification_email_cc || "",
        is_active: values?.is_active ?? true,
        is_default: values?.is_default ?? false,
      };

      if (mobileValue) {
        locData.country_code = values?.country_code;
      }

      try {
        if (isEditMode && values?._id) {
          await dispatch(updateLocation({ id: values._id, data: locData })).unwrap();
          Notification("Success", t("Location updated successfully"), "success");
          // Refresh header location dropdown so renamed location appears immediately
          dispatch(initLocationContext(authUserItem));
        } else {
          await dispatch(createLocation(locData)).unwrap();
          Notification("Success", t("Location created successfully"), "success");
          dispatch(initLocationContext(authUserItem));
        }
      } catch (error) {
        Notification("Error", error || t("Operation failed"), "warning");
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

  return (
    <Fragment>
      <div className="main-content locations">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Location") : t("Add Location")}</h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Form autoComplete="off" onSubmit={handleSubmit(onSubmit, (errs) => console.log('Form validation errors:', errs))}>

          {/* ── Section 1: Location Information ── */}
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t("Location Information")}</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="location_name">
                    {t("Location Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="location_name"
                    name="location_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        autoComplete="off"
                        invalid={!!errors.location_name}
                      />
                    )}
                  />
                  <FormFeedback>{errors.location_name?.message}</FormFeedback>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="location_code">
                    {t("Location Code")} {!locationCodeAuto && <span className="text-danger">*</span>}
                  </Label>
                  {locationCodeAuto && !isEditMode ? (
                    <div>
                      <Input
                        disabled
                        value={locationCodePreview || t('Auto-generated')}
                        className="bg-light"
                      />
                      <small className="text-muted">{t("Code will be auto-generated on save")}</small>
                    </div>
                  ) : (
                    <Controller
                      id="location_code"
                      name="location_code"
                      control={control}
                      render={({ field }) => (
                        locationCodePrefix ? (
                          <InputGroup>
                            <InputGroupText>{locationCodePrefix}</InputGroupText>
                            <Input
                              {...field}
                              autoComplete="off"
                              style={{ textTransform: "uppercase" }}
                              invalid={!!errors.location_code}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </InputGroup>
                        ) : (
                          <Input
                            {...field}
                            autoComplete="off"
                            style={{ textTransform: "uppercase" }}
                            invalid={!!errors.location_code}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        )
                      )}
                    />
                  )}
                  {errors.location_code && (
                    <FormFeedback className="d-block">{errors.location_code.message}</FormFeedback>
                  )}
                </Col>

                <Col lg={12} className="mb-2">
                  <Label className="form-label" for="description">
                    {t("Description")}
                  </Label>
                  <Controller
                    id="description"
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="textarea"
                        rows="3"
                        autoComplete="off"
                      />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-1">
                  <Label className="form-label d-block">{t("Status")}</Label>
                  <Controller
                    id="is_active"
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Row className="px-1">
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="is_active_yes"
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                          />
                          <Label className="form-check-label" for="is_active_yes">
                            {t("Active")}
                          </Label>
                        </div>
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="is_active_no"
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                          />
                          <Label className="form-check-label" for="is_active_no">
                            {t("Inactive")}
                          </Label>
                        </div>
                      </Row>
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-1">
                  <Label className="form-label d-block">{t("Default Location")}</Label>
                  <Controller
                    id="is_default"
                    name="is_default"
                    control={control}
                    render={({ field }) => (
                      <Row className="px-1">
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="is_default_yes"
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                          />
                          <Label className="form-check-label" for="is_default_yes">
                            {t("Yes")}
                          </Label>
                        </div>
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="is_default_no"
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                          />
                          <Label className="form-check-label" for="is_default_no">
                            {t("No")}
                          </Label>
                        </div>
                      </Row>
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Section 2: Contact Information ── */}
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t("Contact Information")}</CardTitle>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="contact_name">
                    {t("Contact Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="contact_name"
                    name="contact_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        autoComplete="off"
                        invalid={!!errors.contact_name}
                      />
                    )}
                  />
                  <FormFeedback>{errors.contact_name?.message}</FormFeedback>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="email">
                    {t("Email")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="email"
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        autoComplete="off"
                        invalid={!!errors.email}
                      />
                    )}
                  />
                  <FormFeedback>{errors.email?.message}</FormFeedback>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
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
                        country={phoneCountry}
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
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Section 3: Address Information (Optional) ── */}
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1 d-flex align-items-center gap-1">
              <CardTitle tag="h5" className="mb-0">{t("Address Information")}</CardTitle>
              <Badge color="secondary" pill className="ms-1">{t("Optional")}</Badge>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="address_line1">
                    {t("Address Line 1")}
                  </Label>
                  <Controller
                    id="address_line1"
                    name="address_line1"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} autoComplete="off" />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="address_line2">
                    {t("Address Line 2")}
                  </Label>
                  <Controller
                    id="address_line2"
                    name="address_line2"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} autoComplete="off" />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="state">
                    {t("State")}
                  </Label>
                  <Controller
                    id="state"
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <CreatableSelect
                        inputId="state"
                        classNamePrefix="select"
                        options={stateOptions}
                        value={toGeoOption(field.value)}
                        onChange={(option) => {
                          field.onChange(option?.value || "");
                          setValue("city", "");
                        }}
                        onCreateOption={(input) => field.onChange(input)}
                        formatCreateLabel={(input) => `${t("Use")} "${input}"`}
                        placeholder={t("Select or type a state")}
                        isClearable
                      />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="city">
                    {t("City")}
                  </Label>
                  <Controller
                    id="city"
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <CreatableSelect
                        inputId="city"
                        classNamePrefix="select"
                        options={cityOptions}
                        value={toGeoOption(field.value)}
                        onChange={(option) => field.onChange(option?.value || "")}
                        onCreateOption={(input) => field.onChange(input)}
                        formatCreateLabel={(input) => `${t("Use")} "${input}"`}
                        placeholder={t("Select or type a city")}
                        noOptionsMessage={() => t("Type to enter a city")}
                        isClearable
                      />
                    )}
                  />
                </Col>



                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="postcode">
                    {t("Postcode")}
                  </Label>
                  <Controller
                    id="postcode"
                    name="postcode"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} autoComplete="off" />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
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
                          // Also update PhoneInput flag to match chosen country
                          if (option?.value) setPhoneCountry(option.value.toLowerCase());
                          // A state/city chosen under the old country no longer
                          // belongs to this one.
                          setValue("state", "");
                          setValue("city", "");
                        }}
                        placeholder={t("Select country")}
                        isClearable
                        isSearchable
                      />
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Section 4: Location Settings ── HIDDEN per ops request 2026-05-26.
              Restore by removing the `false && (` wrapper + closing `)}`. */}
          {false && (
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1 d-flex align-items-center gap-1">
              <CardTitle tag="h5" className="mb-0">{t("Location Settings")}</CardTitle>
              <Badge color="secondary" pill className="ms-1">{t("Optional")}</Badge>
            </CardHeader>
            <CardBody className="pt-2">
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="timezone">
                    {t("Timezone")}
                  </Label>
                  <Controller
                    id="timezone"
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="timezone"
                        classNamePrefix="select"
                        options={timezoneList}
                        value={selectedTimezone}
                        onChange={(option) => {
                          setSelectedTimezone(option);
                          field.onChange(option?.value || "");
                        }}
                        placeholder={t("Select timezone")}
                        isClearable
                        isSearchable
                      />
                    )}
                  />
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="currency">
                    {t("Currency")}
                  </Label>
                  <Controller
                    id="currency"
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder={t("e.g. GBP, USD")}
                        maxLength={3}
                        style={{ textTransform: "uppercase" }}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>
          )}

          {/* ── Section 5: Notification Settings (Optional) ── */}
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1 d-flex align-items-center gap-1">
              <CardTitle tag="h5" className="mb-0">{t("Notification Settings")}</CardTitle>
              <Badge color="secondary" pill className="ms-1">{t("Optional")}</Badge>
            </CardHeader>
            <CardBody className="pt-2">
              <p className="text-muted small mb-2">
                {t("Configure where notification emails (leave requests, approvals, etc.) are sent for this location.")}
              </p>
              <Row>
                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="notification_email">
                    {t("Notification Email")}
                  </Label>
                  <Controller
                    id="notification_email"
                    name="notification_email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        autoComplete="off"
                        placeholder={t("e.g. hr@company.com")}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("If empty, the location contact email above will be used.")}
                  </small>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="notification_email_cc">
                    {t("CC Email")}
                  </Label>
                  <Controller
                    id="notification_email_cc"
                    name="notification_email_cc"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        autoComplete="off"
                        placeholder={t("e.g. manager@company.com")}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("Additional email to CC on all notifications.")}
                  </small>
                </Col>

                <Col lg={6} md={6} sm={12} className="mb-1">
                  <Label className="form-label d-block">{t("CC Company Admin")}</Label>
                  <Controller
                    id="cc_company_admin"
                    name="cc_company_admin"
                    control={control}
                    render={({ field }) => (
                      <Row className="px-1">
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="cc_company_admin_yes"
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                          />
                          <Label className="form-check-label" for="cc_company_admin_yes">
                            {t("Yes")}
                          </Label>
                        </div>
                        <div className="form-check" style={{ width: "max-content" }}>
                          <Input
                            {...field}
                            id="cc_company_admin_no"
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                          />
                          <Label className="form-check-label" for="cc_company_admin_no">
                            {t("No")}
                          </Label>
                        </div>
                      </Row>
                    )}
                  />
                  <small className="text-muted">
                    {t("Also send notification copies to the company admin.")}
                  </small>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ── Section 6: GPS Coordinates (Optional) ── HIDDEN per ops request 2026-05-26.
              Restore by removing the `false && (` wrapper + closing `)}`. */}
          {false && (
          <Card className="mb-2">
            <CardHeader className="border-bottom py-1 d-flex align-items-center gap-1">
              <CardTitle tag="h5" className="mb-0">{t("GPS Coordinates")}</CardTitle>
              <Badge color="secondary" pill className="ms-1">{t("Optional")}</Badge>
            </CardHeader>
            <CardBody className="pt-2">
              <p className="text-muted small mb-2">
                {t("Used for attendance geofencing. Employees must be within the geofence radius of this location to clock in/out.")}
              </p>
              <Row>
                <Col lg={4} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="latitude">
                    {t("Latitude")}
                  </Label>
                  <Controller
                    id="latitude"
                    name="latitude"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        autoComplete="off"
                        placeholder={t("e.g. 28.6139")}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? +e.target.value : null)}
                      />
                    )}
                  />
                </Col>
                <Col lg={4} md={6} sm={12} className="mb-2">
                  <Label className="form-label" for="longitude">
                    {t("Longitude")}
                  </Label>
                  <Controller
                    id="longitude"
                    name="longitude"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        autoComplete="off"
                        placeholder={t("e.g. 77.2090")}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? +e.target.value : null)}
                      />
                    )}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>
          )}

          {/* ── Action Buttons ── pinned as a sticky bar so they stay with the
              form instead of stranded on the page background at the bottom. */}
          <div className="main-form-btn location-form-actions">
            <div className="form-btn">
              <Button type="submit" color="primary">
                {t("Save")}
              </Button>
            </div>
            <div className="form-btn">
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
      </div>
    </Fragment>
  );
};

export default LocationForm;
