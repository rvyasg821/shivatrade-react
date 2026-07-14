// ** React Imports
import { Fragment, useEffect, useState } from "react";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import { updateCompanyProfile, getCompanyDetails } from "./store";
import { authUpdateMe } from "@src/views/auth/store";
import useFormLoading from "@src/hooks/useFormLoading";

// ** Reactstrap Imports
import {
  Row,
  Col,
  Card,
  Form,
  Label,
  Input,
  Button,
  Spinner,
  CardBody,
  FormFeedback,
} from "reactstrap";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import PortSelect from "@src/views/_shared/port-master/PortSelect";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { Upload } from "react-feather";

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import AddressGeoFields from "@src/views/_shared/geo/AddressGeoFields";
import { useTranslation } from "react-i18next";

// ** Constant
import { countryCodeEditable, disableCountryDropdown, hostRestApiUrl } from "@constant/defaultValues";
import {
  initCompanyAddressItem,
  initCompanyBankAccountItem,
} from "@constant/reduxConstant";
import { getCurrencyDropdown } from "@src/views/currencies/store";

// ** Utilities
import {
  getCountryList,
  getTimezoneList,
  getPrimaryTimezoneByCountry,
  selectStyles
} from "@src/views/auth/register/utils/countryTimezoneUtils";
import {
  getCurrencyList,
  autoDetectCurrency,
  getCurrencyByCode
} from "@src/views/auth/register/utils/currencyUtils";

// ** Styles
import "react-phone-input-2/lib/style.css";

const Step1CompanyDetails = ({ section = "all" }) => {
  // Which form sections to render. The whole company (company details +
  // addresses + bank accounts) is always loaded into the form, so saving from
  // any tab persists everything — only the visible section differs.
  const showCompany = section === "all" || section === "company";
  const showAddress = section === "all" || section === "address";
  const showBank = section === "all" || section === "bank";
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const companyStore = useSelector((state) => state.company);
  const user = useSelector((state) => state.auth);
  const roleName = user?.authUserItem?.role?.name;
  const isSystemUser = user?.authUserItem?.isSystemUser;

  // Company Admins and System Admins should be able to edit company details
  const isReadOnly = !(
    roleName === "Company Admin" ||
    roleName === "Admin" ||
    isSystemUser
  );

  const [submitting, setSubmitting] = useState(false);
  useFormLoading(submitting);

  // State for dropdowns
  const [countryList] = useState(getCountryList());
  const [timezoneList] = useState(getTimezoneList());
  const [currencyList] = useState(getCurrencyList());
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  // ── Company logo (stored on company-settings; uploaded inline here, beside
  // the Website field). The upload endpoint persists logo_url immediately, so
  // it does not depend on this form's Save button. ──
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  // Load the current logo once (read-only fetch from company-settings).
  useEffect(() => {
    instance
      .get(API_ENDPOINTS.companySettings.settings)
      .then((res) => setLogoUrl(res?.data?.data?.logo_url || ""))
      .catch(() => {});
  }, []);

  const resolvedLogoUrl = (() => {
    if (!logoUrl) return "";
    if (logoUrl.startsWith("http")) return logoUrl;
    return `${hostRestApiUrl}${logoUrl}`;
  })();

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      Notification("Error", t("Only PNG, JPG, SVG, and WebP files are allowed"), "warning");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Notification("Error", t("File size must be under 5MB"), "warning");
      e.target.value = "";
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await instance.post(API_ENDPOINTS.companySettings.uploadLogo, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.statusCode === 200 && res?.data?.data?.logo_url) {
        setLogoUrl(res.data.data.logo_url);
        Notification("Success", t("Logo uploaded successfully"), "success");
      } else {
        Notification("Error", res?.data?.message || t("Upload failed"), "warning");
      }
    } catch (err) {
      Notification("Error", err?.response?.data?.message || t("Upload failed"), "warning");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    company_name: yup.string().required(`${t("Company Name is required")}.`),
    email: yup.string().required(`${t("Email is required")}.`).email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    website: yup.string().url(t("Please enter a valid URL")).nullable(),
    license_number: yup.string().max(50, t("License number is too long")).nullable(),
    tax_number: yup.string().max(50, t("Tax number is too long")).nullable(),
    pan: yup
      .string()
      .nullable()
      .transform((v) => (v ? v.toUpperCase() : v))
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
        message: t("PAN must match the format AAAAA0000A"),
        excludeEmptyString: true,
      }),
    company_code: yup.string().nullable(),
    paye_reference: yup.string().nullable(),
    mname: yup.string().nullable(),
    pension_provider: yup.string().nullable(),
    is_sponsor_licence: yup.boolean().nullable(),
    // For update/edit, make these optional since old records won't have them
    selected_country: yup.string().nullable(),
    timezone: yup.string().nullable(),
    currency: yup.string().nullable(),
    // Address
    address_1: yup.string().nullable(),
    address_2: yup.string().nullable(),
    state: yup.string().nullable(),
    city: yup.string().nullable(),
    zipcode: yup.string().nullable(),
  });

  const { reset, control, setValue, getValues, handleSubmit, formState: { errors } } = useForm({
    mode: "all",
    shouldFocusError: false,
    resolver: yupResolver(ProfileSchema),
    defaultValues: {
      fname: "",
      lname: "",
      company_name: "",
      email: "",
      // Default to empty mobile (no digits). Country defaults to US below
      mobile: "",
      country_code: { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
      website: "",
      company_code: "",
      license_number: "",
      tax_number: "",
      pan: "",
      paye_reference: "",
      mname: "",
      pension_provider: "",
      is_sponsor_licence: false,
      selected_country: "",
      timezone: "",
      currency: "",
      address_1: "",
      address_2: "",
      state: "",
      city: "",
      zipcode: "",
      // ── India export compliance ──
      iec: "",
      lut_no: "",
      lut_date: "",
      cin: "",
      // ── PFI / export-document defaults ──
      default_port_of_loading: "",
      default_port_of_loading_id: "",
      default_port_of_loading_snapshot: null,
      default_declaration_text: "",
      default_remarks: "",
      pov_default_remarks: "",
      pov_default_dispatched_through: "",
      pov_default_payment_terms: "",
      pov_default_delivery_terms: "",
      // ── PO defaults ──
      default_terms: "",
      authorised_signatory_name: "",
      // Single-line address printed in the PDF document footer.
      footer_address: "",
      // ── Multi-address & multi-bank ──
      addresses: [],
      bank_accounts: [],
    },
  });

  const addressesField = useFieldArray({
    control,
    name: "addresses",
    keyName: "_key",
  });
  const banksField = useFieldArray({
    control,
    name: "bank_accounts",
    keyName: "_key",
  });

  const currencyStore = useSelector((state) => state.currency);
  useEffect(() => {
    dispatch(getCurrencyDropdown());
  }, [dispatch]);

  // Fetch company details on mount
  useEffect(() => {
    dispatch(getCompanyDetails());
  }, [dispatch]);

  // Reset form when company details are loaded
  useEffect(() => {
    if (companyStore.actionFlag === "GET_COMPANY_SCS" && companyStore.companyItem) {
      const company = companyStore.companyItem;
      // Notification("Success", companyStore.success, "success");

      // Set selected values for dropdowns first
      if (company.selected_country) {
        const country = countryList.find(c => c.value === company.selected_country);
        if (country) {
          setSelectedCountry(country);
          setValue('selected_country', country.value);
        }
      }
      if (company.timezone) {
        const tz = timezoneList.find(t => t.value === company.timezone);
        if (tz) {
          setSelectedTimezone(tz);
          setValue('timezone', tz.value);
        }
      }
      if (company.currency) {
        const curr = getCurrencyByCode(company.currency);
        if (curr) {
          setSelectedCurrency(curr);
          setValue('currency', curr.value);
        }
      }

      // Then reset the form
      reset({
        fname: company.contact_first_name || "",
        mname: company.contact_middle_name || "",
        lname: company.contact_last_name || "",
        company_name: company.company_name || "",
        email: company.email || "",
        mobile: company.mobile ? `${company.country_code?.dialCode || ""}${company.mobile}` : "",
        country_code: company.country_code || { dialCode: "44", countryCode: "gb", name: "United Kingdom" },
        website: company.website || "",
        company_code: company.company_code || "",
        license_number: company.license_number || "",
        tax_number: company.tax_number || "",
        pan: company.pan || "",
        paye_reference: company.paye_reference || "",
        pension_provider: company.pension_provider || "",
        is_sponsor_licence: company.is_sponsor_licence || false,
        selected_country: company.selected_country || "",
        timezone: company.timezone || "",
        currency: company.currency || "",
        address_1: company.address_1 || "",
        address_2: company.address_2 || "",
        state: company.state || "",
        city: company.city || "",
        zipcode: company.zipcode || "",
        iec: company.iec || "",
        lut_no: company.lut_no || "",
        lut_date: company.lut_date ? String(company.lut_date).slice(0, 10) : "",
        cin: company.cin || "",
        default_port_of_loading: company.default_port_of_loading || "",
        default_port_of_loading_id: company.default_port_of_loading_id || "",
        default_port_of_loading_snapshot:
          company.default_port_of_loading_snapshot || null,
        default_declaration_text: company.default_declaration_text || "",
        default_terms: company.default_terms || "",
        default_remarks: company.default_remarks || "",
        pov_default_remarks: company.pov_default_remarks || "",
        pov_default_dispatched_through:
          company.pov_default_dispatched_through || "",
        pov_default_payment_terms: company.pov_default_payment_terms || "",
        pov_default_delivery_terms: company.pov_default_delivery_terms || "",
        authorised_signatory_name: company.authorised_signatory_name || "",
        footer_address: company.footer_address || "",
        addresses: (company.addresses || []).map((a) => ({
          type: a.type || "corporate",
          label: a.label || "",
          address_line1: a.address_line1 || "",
          address_line2: a.address_line2 || "",
          city: a.city || "",
          state: a.state || "",
          country: a.country || "",
          postcode: a.postcode || "",
          gstin: a.gstin || "",
          is_default: !!a.is_default,
        })),
        bank_accounts: (company.bank_accounts || []).map((b) => ({
          bank_name: b.bank_name || "",
          account_holder_name: b.account_holder_name || "",
          account_number: b.account_number || "",
          ifsc: b.ifsc || "",
          swift_code: b.swift_code || "",
          iban: b.iban || "",
          ad_code: b.ad_code || "",
          currency_id: b.currency_id || "",
          branch_name: b.branch_name || "",
          branch_address: b.branch_address || "",
          account_type: b.account_type || "current",
          is_default: !!b.is_default,
          notes: b.notes || "",
          is_active: b.is_active !== false,
        })),
      });
    }
  }, [companyStore, reset, countryList, timezoneList, setValue]);


  const handleChangeMobile = (name, value, data) => {
    setValue(name, value);
    setValue("country_code", data);
  };
  const onSubmit = (values) => {
    const dialCode = values.country_code?.dialCode || "";
    let mobileValue = values.mobile || "";

    // Remove dial code from start if user typed number
    if (mobileValue.startsWith(dialCode)) {
      mobileValue = mobileValue.slice(dialCode.length);
    }

    mobileValue = mobileValue.trim();

    const payload = {
      contact_first_name: values.fname,
      contact_middle_name: values.mname,
      contact_last_name: values.lname,
      company_name: values.company_name,
      email: values.email,
      mobile: mobileValue,
      website: values.website,
      company_code: values.company_code,
      license_number: values.license_number,
      tax_number: values.tax_number,
      pan: values.pan || undefined,
      paye_reference: values.paye_reference,
      pension_provider: values.pension_provider,
      is_sponsor_licence: values.is_sponsor_licence || false,
      selected_country: values.selected_country,
      timezone: values.timezone,
      currency: values.currency,
      address_1: values.address_1,
      address_2: values.address_2,
      state: values.state,
      city: values.city,
      zipcode: values.zipcode,
      iec: values.iec || undefined,
      lut_no: values.lut_no || undefined,
      // Truncate any ISO timestamp (DateInput / Flatpickr emits a full ISO)
      // to YYYY-MM-DD so it matches the `date` column shape on the BE.
      lut_date: values.lut_date
        ? String(values.lut_date).slice(0, 10)
        : undefined,
      cin: values.cin || undefined,
      default_port_of_loading:
        values.default_port_of_loading?.trim() || undefined,
      default_port_of_loading_id:
        values.default_port_of_loading_id || undefined,
      default_port_of_loading_snapshot:
        values.default_port_of_loading_snapshot || undefined,
      default_declaration_text:
        values.default_declaration_text?.trim() || undefined,
      default_terms:
        values.default_terms != null
          ? values.default_terms.trim()
          : undefined,
      default_remarks:
        values.default_remarks != null
          ? values.default_remarks.trim()
          : undefined,
      pov_default_remarks:
        values.pov_default_remarks != null
          ? values.pov_default_remarks.trim()
          : undefined,
      pov_default_dispatched_through:
        values.pov_default_dispatched_through != null
          ? values.pov_default_dispatched_through.trim()
          : undefined,
      pov_default_payment_terms:
        values.pov_default_payment_terms != null
          ? values.pov_default_payment_terms.trim()
          : undefined,
      pov_default_delivery_terms:
        values.pov_default_delivery_terms != null
          ? values.pov_default_delivery_terms.trim()
          : undefined,
      authorised_signatory_name:
        values.authorised_signatory_name != null
          ? values.authorised_signatory_name.trim()
          : undefined,
      footer_address:
        values.footer_address != null ? values.footer_address.trim() : undefined,
      addresses: (values.addresses || [])
        .filter((a) =>
          a.address_line1?.trim() ||
          a.city?.trim() ||
          a.country?.trim() ||
          a.label?.trim()
        )
        .map((a) => ({
          type: a.type || "corporate",
          label: a.label?.trim() || undefined,
          address_line1: a.address_line1?.trim() || undefined,
          address_line2: a.address_line2?.trim() || undefined,
          city: a.city?.trim() || undefined,
          state: a.state?.trim() || undefined,
          country: a.country?.trim() || undefined,
          postcode: a.postcode?.trim() || undefined,
          gstin: a.gstin?.trim() || undefined,
          is_default: !!a.is_default,
        })),
      bank_accounts: (values.bank_accounts || [])
        .filter((b) => b.bank_name?.trim() && b.account_number?.trim() && b.currency_id)
        .map((b) => ({
          bank_name: b.bank_name.trim(),
          account_holder_name: b.account_holder_name?.trim() || undefined,
          account_number: b.account_number.trim(),
          ifsc: b.ifsc?.trim() || undefined,
          swift_code: b.swift_code?.trim() || undefined,
          iban: b.iban?.trim() || undefined,
          ad_code: b.ad_code?.trim() || undefined,
          currency_id: b.currency_id,
          branch_name: b.branch_name?.trim() || undefined,
          branch_address: b.branch_address?.trim() || undefined,
          account_type: b.account_type || "current",
          is_default: !!b.is_default,
          notes: b.notes?.trim() || undefined,
          is_active: b.is_active !== false,
        })),
    };

    // Only include country_code when mobile is provided
    if (mobileValue) {
      payload.country_code = values.country_code;
    }

    // Dispatch the action to update company profile
    setSubmitting(true);
    dispatch(updateCompanyProfile(payload))
      .unwrap()
      .then(() => {
        dispatch(getCompanyDetails());
        Notification("Success", t("Company profile updated successfully!"), "success");
      })
      .catch((error) => {
        Notification("Error", error?.message || t("Failed to update company profile"), "warning");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };



  const isAdmin = companyStore?.companyItem?.name?.trim().toLowerCase() === "admin";

  return (
    <Fragment>
      <Card>
        <CardBody>
          <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>

            {showCompany && (<>
            {/* ── Company Information ── */}
            <h6 className="fw-bold text-uppercase text-muted mb-1 mt-1">{t("Company Information")}</h6>
            <hr className="mt-0 mb-2" />
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Name")} <span className="text-danger">*</span></Label>
                <Controller name="company_name" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.company_name} disabled={isReadOnly} />} />
                <FormFeedback>{errors.company_name?.message}</FormFeedback>
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Code")}</Label>
                <Controller name="company_code" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact First Name")} <span className="text-danger">*</span></Label>
                <Controller name="fname" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.fname} disabled={isReadOnly} />} />
                <FormFeedback>{errors.fname?.message}</FormFeedback>
              </div>
              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact Middle Name")}</Label>
                <Controller name="mname" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-4 col-md-4">
                <Label>{t("Contact Last Name")} <span className="text-danger">*</span></Label>
                <Controller name="lname" control={control}
                  render={({ field }) => <Input {...field} invalid={!!errors.lname} disabled={isReadOnly} />} />
                <FormFeedback>{errors.lname?.message}</FormFeedback>
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Email")}</Label>
                <Controller name="email" control={control}
                  render={({ field }) => <Input {...field} type="email" disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Mobile")}</Label>
                <Controller name="mobile" control={control}
                  render={({ field }) => (
                    <PhoneInput {...field} disabled={isReadOnly} autoComplete="off" inputClass="w-100"
                      country={companyStore.companyItem?.country_code?.countryCode?.toLowerCase() || 'gb'}
                      value={field.value || ""} disableDropdown={disableCountryDropdown || isReadOnly}
                      countryCodeEditable={countryCodeEditable && !isReadOnly}
                      onChange={(val, data) => handleChangeMobile("mobile", val, data)} />
                  )} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Registration Number")}</Label>
                <Controller name="license_number" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("PAN")}</Label>
                <Controller
                  name="pan"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={(field.value || "").toUpperCase()}
                      onChange={(e) =>
                        field.onChange((e.target.value || "").toUpperCase())
                      }
                      maxLength={10}
                      placeholder="AAAAA0000A"
                      disabled={isReadOnly}
                      invalid={!!errors.pan}
                    />
                  )}
                />
                <FormFeedback>{errors.pan?.message}</FormFeedback>
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Website")}</Label>
                <Controller name="website" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} invalid={!!errors.website} />} />
                <FormFeedback>{errors.website?.message}</FormFeedback>
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Company Logo")}</Label>
                <Label className="btn btn-outline-primary mb-0 w-100 d-flex align-items-center justify-content-center gap-50"
                  style={{ cursor: isReadOnly ? "not-allowed" : "pointer" }}>
                  {resolvedLogoUrl && (
                    <img src={resolvedLogoUrl} alt="Logo preview"
                      style={{ maxHeight: "24px", maxWidth: "80px" }}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  )}
                  <Upload size={14} />
                  {logoUploading ? t("Uploading...") : t("Upload Logo")}
                  <Input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload} hidden disabled={isReadOnly || logoUploading} />
                </Label>
                <small className="text-muted d-block mt-25">{t("PNG, JPG, SVG or WebP. Max 5MB.")}</small>
              </div>

              {/* Footer Address field hidden per request. Data plumbing kept
                  (defaultValues + submit still carry footer_address) so any
                  existing value persists and still prints in PDF footers.
              <div className="mb-2 col-12">
                <Label>{t("Footer Address")}</Label>
                <Controller name="footer_address" control={control}
                  render={({ field }) => (
                    <Input {...field} disabled={isReadOnly} maxLength={255}
                      placeholder={t("Single-line address shown in document PDF footers")} />
                  )} />
                <small className="text-muted">
                  {t("Printed as one line at the bottom of Quotation / Invoice PDFs.")}
                </small>
              </div>
              */}
            </Row>

            {/* Timezone & Currency hidden (2026-05-22) — kept in form
                state for backwards-compat with downstream consumers but
                no longer surfaced in the Company Info UI. */}

            {/* Country picker hidden (2026-05-22) — value stays in form
                state for backwards-compat. */}

            {/* ── Tax & Compliance (India export) ── */}
            {/* mt-1: the theme rescales Bootstrap's spacers, so mt-4 here is
                3.5rem, not 1.5rem — it left a large gap under the row above. */}
            <h4 className="mt-1 mb-2">{t("Tax & Compliance")}</h4>
            <Row>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="cin">
                  {t("CIN")} <small className="text-muted">({t("Corporate Identification Number")})</small>
                </Label>
                <Controller name="cin" control={control}
                  render={({ field }) => (
                    <Input id="cin" maxLength={21} placeholder="L17110MH1973PLC019786"
                      disabled={isReadOnly} {...field} value={field.value || ""} />
                  )} />
                <small className="text-muted">
                  {t("21-character ID issued by MCA on company registration. Appears on every PO / Invoice header.")}
                </small>
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="iec">
                  {t("IEC")} <small className="text-muted">({t("Importer Exporter Code")})</small>
                </Label>
                <Controller name="iec" control={control}
                  render={({ field }) => (
                    <Input id="iec" maxLength={20}
                      disabled={isReadOnly} {...field} value={field.value || ""} />
                  )} />
                <small className="text-muted">
                  {t("DGFT-issued code mandatory for cross-border shipments. Required on Commercial / Export Invoices.")}
                </small>
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="lut_no">
                  {t("LUT No")} <small className="text-muted">({t("Letter of Undertaking")})</small>
                </Label>
                <Controller name="lut_no" control={control}
                  render={({ field }) => (
                    <Input id="lut_no" maxLength={50}
                      disabled={isReadOnly} {...field} value={field.value || ""} />
                  )} />
                <small className="text-muted">
                  {t("Lets you export without paying IGST upfront. Filed annually with GST portal; valid for one financial year.")}
                </small>
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="lut_date">{t("LUT Date")}</Label>
                <Controller name="lut_date" control={control}
                  render={({ field }) => (
                    <DateInput
                      id="lut_date"
                      disabled={isReadOnly}
                      value={field.value || ""}
                      onChange={(dates, str, iso) => field.onChange(iso)}
                    />
                  )} />
                <small className="text-muted">
                  {t("Issue date of the LUT. Re-file every 1 April for the new financial year.")}
                </small>
              </Col>

              {/* ── PFI / export-document defaults ───────────────────── */}
              <Col md="6" className="mb-2">
                <Label className="form-label" for="default_port_of_loading">
                  {t("Default Port of Loading")}
                </Label>
                <Controller
                  name="default_port_of_loading_snapshot"
                  control={control}
                  render={({ field }) => (
                    <PortSelect
                      value={field.value}
                      countryCode="IN"
                      types={["sea", "icd", "sez"]}
                      placeholder={t("Search Indian port by code or name…")}
                      disabled={isReadOnly}
                      onChange={(port) => {
                        field.onChange(port || null);
                        setValue(
                          "default_port_of_loading_id",
                          port?._id || ""
                        );
                        setValue(
                          "default_port_of_loading",
                          port
                            ? `${port.name}${port.code ? ` (${port.code})` : ""}`
                            : ""
                        );
                      }}
                    />
                  )}
                />
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="authorised_signatory_name">
                  {t("Authorised Signatory Name")}
                </Label>
                <Controller name="authorised_signatory_name" control={control}
                  render={({ field }) => (
                    <Input
                      id="authorised_signatory_name"
                      maxLength={150}
                      placeholder="e.g. Rakesh"
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>

              {/* Long-form defaults — paired so neither leaves a dead half-row. */}
              <Col md="6" className="mb-2">
                <Label className="form-label" for="default_declaration_text">
                  {t("Default Declaration Text")}
                </Label>
                <Controller name="default_declaration_text" control={control}
                  render={({ field }) => (
                    <Input
                      id="default_declaration_text"
                      type="textarea"
                      rows="3"
                      maxLength={4000}
                      placeholder="e.g. We declare that this PFI shows the actual price of the goods..."
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="default_terms">
                  {t("Default Terms & Conditions")}
                </Label>
                <Controller name="default_terms" control={control}
                  render={({ field }) => (
                    <Input
                      id="default_terms"
                      type="textarea"
                      rows="3"
                      maxLength={4000}
                      placeholder="e.g. Goods must conform to agreed specifications..."
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="default_remarks">
                  {t("Default Remarks (Sales Order)")}
                </Label>
                <Controller name="default_remarks" control={control}
                  render={({ field }) => (
                    <Input
                      id="default_remarks"
                      type="textarea"
                      rows="4"
                      maxLength={4000}
                      placeholder="e.g. 1. 100% Advance along with Purchase order. 2. Partial shipment allowed..."
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="pov_default_remarks">
                  {t("Default Remarks (Vendor Purchase Order)")}
                </Label>
                <Controller name="pov_default_remarks" control={control}
                  render={({ field }) => (
                    <Input
                      id="pov_default_remarks"
                      type="textarea"
                      rows="4"
                      maxLength={4000}
                      placeholder="e.g. 1. WE NEED PROPER PACKING LIST WITH GROSS AND NET WEIGHT. 2. PROPER DIMENSION & DETAIL OF PRODUCT BEFORE DISPATCH..."
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>

              {/* Vendor PO terms — copied onto a new POV, editable per POV.
                  The POV PDF falls back to these when a POV carries none. */}
              <Col md="6" className="mb-2">
                <Label className="form-label" for="pov_default_dispatched_through">
                  {t("Default Dispatched Through (Vendor PO)")}
                </Label>
                <Controller name="pov_default_dispatched_through" control={control}
                  render={({ field }) => (
                    <Input
                      id="pov_default_dispatched_through"
                      maxLength={150}
                      placeholder="e.g. By Sea"
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
              <Col md="6" className="mb-2">
                <Label className="form-label" for="pov_default_payment_terms">
                  {t("Default Mode/Terms of Payment (Vendor PO)")}
                </Label>
                <Controller name="pov_default_payment_terms" control={control}
                  render={({ field }) => (
                    <Input
                      id="pov_default_payment_terms"
                      maxLength={500}
                      placeholder="e.g. 50% ADVANCE & 50% AT DISPATCH TIME"
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
              <Col md="12" className="mb-2">
                <Label className="form-label" for="pov_default_delivery_terms">
                  {t("Default Terms of Delivery (Vendor PO)")}
                </Label>
                <Controller name="pov_default_delivery_terms" control={control}
                  render={({ field }) => (
                    <Input
                      id="pov_default_delivery_terms"
                      type="textarea"
                      rows="3"
                      maxLength={1000}
                      placeholder="e.g. OUR PFI NO:STIPL/PI0344/2025-26, DELIVERY TERM: 4 TO 5 WEEKS"
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
              </Col>
            </Row>

            </>)}

            {showAddress && (<>
            {/* ── Addresses (multi) ── */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0">{t("Addresses")}</h4>
              <Button
                type="button" size="sm" color="primary" outline disabled={isReadOnly}
                onClick={() => addressesField.append({ ...initCompanyAddressItem })}
              >
                + {t("Add Address")}
              </Button>
            </div>
            {addressesField.fields.length === 0 && (
              <small className="text-muted d-block mb-2">
                {t("No addresses. Add your Corporate Office and any Warehouses or Branches with their own GSTINs.")}
              </small>
            )}
            {addressesField.fields.map((row, idx) => {
              const TYPE_OPTIONS = [
                { value: "corporate", label: t("Corporate Office") },
                { value: "warehouse", label: t("Warehouse") },
                { value: "branch", label: t("Branch") },
                { value: "other", label: t("Other") },
              ];
              return (
                <Row key={row._key} className="mb-2">
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Type")}</Label>
                    <Controller name={`addresses.${idx}.type`} control={control}
                      render={({ field }) => (
                        <Select isDisabled={isReadOnly} classNamePrefix="select"
                          options={TYPE_OPTIONS}
                          value={TYPE_OPTIONS.find((o) => o.value === field.value) || null}
                          onChange={(opt) => field.onChange(opt ? opt.value : "corporate")}
                          styles={selectStyles} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Label")}</Label>
                    <Controller name={`addresses.${idx}.label`} control={control}
                      render={({ field }) => (
                        <Input placeholder={t("e.g. HQ Vadodara, Brushellz warehouse")}
                          disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>

                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Address Line 1")}</Label>
                    <Controller name={`addresses.${idx}.address_line1`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Address Line 2")}</Label>
                    <Controller name={`addresses.${idx}.address_line2`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  {/* State + City suggest from the geo masters but still take a
                      typed value — these rows are free text in the database. */}
                  <AddressGeoFields
                    control={control}
                    setValue={setValue}
                    namePrefix={`addresses.${idx}`}
                    countryField={`addresses.${idx}.country`}
                    countryList={countryList}
                    countryAsName
                    isReadOnly={isReadOnly}
                  />
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Country")}</Label>
                    <Controller name={`addresses.${idx}.country`} control={control}
                      render={({ field }) => {
                        // Match the saved value (free-text from legacy data)
                        // against the country list by label (case-insensitive).
                        const raw = field.value || "";
                        const selected =
                          countryList.find(
                            (c) =>
                              c.label?.toLowerCase() === raw.toLowerCase() ||
                              c.value?.toLowerCase() === raw.toLowerCase()
                          ) || null;
                        return (
                          <Select
                            classNamePrefix="select"
                            isClearable
                            isDisabled={isReadOnly}
                            options={countryList}
                            value={selected}
                            // Save the country NAME ("India") to match
                            // existing free-text data shape on the BE.
                            onChange={(opt) => field.onChange(opt ? opt.label : "")}
                            placeholder={t("Select country")}
                          />
                        );
                      }} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Postcode")}</Label>
                    <Controller name={`addresses.${idx}.postcode`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("GSTIN (this address)")}</Label>
                    <Controller name={`addresses.${idx}.gstin`} control={control}
                      render={({ field }) => (
                        <Input maxLength={15} disabled={isReadOnly}
                          {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2 d-flex align-items-end">
                    <div className="form-check">
                      <Controller name={`addresses.${idx}.is_default`} control={control}
                        render={({ field }) => (
                          <Input type="checkbox" id={`caddr-default-${idx}`}
                            disabled={isReadOnly}
                            checked={!!field.value}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              field.onChange(checked);
                              if (checked) {
                                const myType = getValues(`addresses.${idx}.type`) || "corporate";
                                const all = getValues("addresses") || [];
                                all.forEach((row, j) => {
                                  if (j !== idx && (row?.type || "corporate") === myType && row?.is_default) {
                                    setValue(`addresses.${j}.is_default`, false, { shouldDirty: true });
                                  }
                                });
                              }
                            }} />
                        )} />
                      <Label className="form-check-label" for={`caddr-default-${idx}`}>
                        {t("Default for this type")}
                      </Label>
                    </div>
                  </Col>
                  <Col md="12" className="text-end">
                    <Button type="button" size="sm" color="danger" outline
                      disabled={isReadOnly}
                      onClick={() => addressesField.remove(idx)}>
                      {t("Remove address")}
                    </Button>
                  </Col>
                </Row>
              );
            })}

            </>)}

            {showBank && (<>
            {/* ── Bank Accounts (multi) ── */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0">{t("Bank Accounts")}</h4>
              <Button
                type="button" size="sm" color="primary" outline disabled={isReadOnly}
                onClick={() => {
                  const inr = (currencyStore?.currencyDropdown || []).find(c => c.code === "INR")
                    || (currencyStore?.currencyDropdown || [])[0];
                  banksField.append({ ...initCompanyBankAccountItem, currency_id: inr?._id || "" });
                }}
              >
                + {t("Add Bank Account")}
              </Button>
            </div>
            {banksField.fields.length === 0 && (
              <small className="text-muted d-block mb-2">
                {t("No bank accounts. Add INR account for domestic and USD/EUR for export proceeds.")}
              </small>
            )}
            {banksField.fields.map((row, idx) => {
              const ACC_TYPE_OPTIONS = [
                { value: "current", label: t("Current") },
                { value: "savings", label: t("Savings") },
                { value: "other", label: t("Other") },
              ];
              const currencyOptions = (currencyStore?.currencyDropdown || []).map(c => ({
                value: c._id, label: `${c.code} - ${c.name}`,
              }));
              return (
                <Row key={row._key} className="mb-2">
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Bank Name")} <span className="text-danger">*</span></Label>
                    <Controller name={`bank_accounts.${idx}.bank_name`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Account Holder Name")}</Label>
                    <Controller name={`bank_accounts.${idx}.account_holder_name`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Account Number")} <span className="text-danger">*</span></Label>
                    <Controller name={`bank_accounts.${idx}.account_number`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Currency")} <span className="text-danger">*</span></Label>
                    <Controller name={`bank_accounts.${idx}.currency_id`} control={control}
                      render={({ field }) => (
                        <Select isDisabled={isReadOnly} classNamePrefix="select"
                          options={currencyOptions}
                          value={currencyOptions.find(o => o.value === field.value) || null}
                          onChange={(opt) => field.onChange(opt ? opt.value : "")}
                          styles={selectStyles} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Account Type")}</Label>
                    <Controller name={`bank_accounts.${idx}.account_type`} control={control}
                      render={({ field }) => (
                        <Select isDisabled={isReadOnly} classNamePrefix="select"
                          options={ACC_TYPE_OPTIONS}
                          value={ACC_TYPE_OPTIONS.find(o => o.value === field.value) || null}
                          onChange={(opt) => field.onChange(opt ? opt.value : "current")}
                          styles={selectStyles} />
                      )} />
                  </Col>

                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("AD Code")} <small className="text-muted">({t("for forex")})</small></Label>
                    <Controller name={`bank_accounts.${idx}.ad_code`} control={control}
                      render={({ field }) => (
                        <Input maxLength={30} disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("IFSC")} <small className="text-muted">({t("India")})</small></Label>
                    <Controller name={`bank_accounts.${idx}.ifsc`} control={control}
                      render={({ field }) => (
                        <Input maxLength={11} disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("SWIFT Code")} <small className="text-muted">({t("International")})</small></Label>
                    <Controller name={`bank_accounts.${idx}.swift_code`} control={control}
                      render={({ field }) => (
                        <Input maxLength={11} disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("IBAN")} <small className="text-muted">({t("EU/Middle-East")})</small></Label>
                    <Controller name={`bank_accounts.${idx}.iban`} control={control}
                      render={({ field }) => (
                        <Input maxLength={34} disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>

                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Branch Name")}</Label>
                    <Controller name={`bank_accounts.${idx}.branch_name`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Branch Address")}</Label>
                    <Controller name={`bank_accounts.${idx}.branch_address`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("Notes")}</Label>
                    <Controller name={`bank_accounts.${idx}.notes`} control={control}
                      render={({ field }) => (
                        <Input type="textarea" rows="1" disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2 d-flex align-items-end">
                    <div className="form-check">
                      <Controller name={`bank_accounts.${idx}.is_default`} control={control}
                        render={({ field }) => (
                          <Input type="checkbox" id={`cbank-default-${idx}`}
                            disabled={isReadOnly}
                            checked={!!field.value}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              field.onChange(checked);
                              if (checked) {
                                const myCurr = getValues(`bank_accounts.${idx}.currency_id`);
                                if (!myCurr) return;
                                const all = getValues("bank_accounts") || [];
                                all.forEach((row, j) => {
                                  if (j !== idx && row?.currency_id === myCurr && row?.is_default) {
                                    setValue(`bank_accounts.${j}.is_default`, false, { shouldDirty: true });
                                  }
                                });
                              }
                            }} />
                        )} />
                      <Label className="form-check-label" for={`cbank-default-${idx}`}>
                        {t("Default for currency")}
                      </Label>
                    </div>
                  </Col>
                  <Col md="12" className="text-end">
                    <Button type="button" size="sm" color="danger" outline
                      disabled={isReadOnly}
                      onClick={() => banksField.remove(idx)}>
                      {t("Remove bank account")}
                    </Button>
                  </Col>
                </Row>
              );
            })}

            </>)}

            <div className="d-flex justify-content-end mt-2 gap-2">
              <Button type="submit" color="primary" disabled={isReadOnly || submitting}>
                {submitting ? <Spinner size="sm" /> : t("Save")}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default Step1CompanyDetails;