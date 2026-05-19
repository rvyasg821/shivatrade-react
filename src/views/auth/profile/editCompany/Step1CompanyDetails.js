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

// ** Third Party Components
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Constant
import { countryCodeEditable, disableCountryDropdown } from "@constant/defaultValues";
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
import { startLoading, stopLoading } from "../../../loadingstore";

const Step1CompanyDetails = () => {
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

  useEffect(() => {
    if (user?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [user.loading]);

  const ProfileSchema = yup.object().shape({
    fname: yup.string().required(`${t("First Name is required")}.`),
    lname: yup.string().required(`${t("Last Name is required")}.`),
    company_name: yup.string().required(`${t("Company Name is required")}.`),
    email: yup.string().required(`${t("Email is required")}.`).email(`${t("Invalid email address")}.`),
    mobile: yup.string().nullable(),
    website: yup.string().url(t("Please enter a valid URL")).nullable(),
    license_number: yup.string().max(50, t("License number is too long")).nullable(),
    tax_number: yup.string().max(50, t("Tax number is too long")).nullable(),
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
      default_declaration_text: "",
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
        default_declaration_text: company.default_declaration_text || "",
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
      default_declaration_text:
        values.default_declaration_text?.trim() || undefined,
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
                <Label>{t("Tax / VAT Number")}</Label>
                <Controller name="tax_number" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("PAYE Reference Number")}</Label>
                <Controller name="paye_reference" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Pension Provider")}</Label>
                <Controller name="pension_provider" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} />} />
              </div>

              <div className="mb-2 col-lg-6 col-md-6 d-flex align-items-center pt-2">
                <Controller name="is_sponsor_licence" control={control}
                  render={({ field }) => (
                    <Input type="checkbox" id="is_sponsor_licence" checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)} className="me-1" disabled={isReadOnly} />
                  )} />
                <Label for="is_sponsor_licence" className="mb-0">{t("Does business hold a sponsor licence?")}</Label>
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Website")}</Label>
                <Controller name="website" control={control}
                  render={({ field }) => <Input {...field} disabled={isReadOnly} invalid={!!errors.website} />} />
                <FormFeedback>{errors.website?.message}</FormFeedback>
              </div>
            </Row>

            {/* ── Timezone & Currency ── */}
            <h6 className="fw-bold text-uppercase text-muted mb-1 mt-2">{t("Timezone & Currency")}</h6>
            <hr className="mt-0 mb-2" />
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Timezone")}</Label>
                <Controller name="timezone" control={control}
                  render={({ field }) => (
                    <Select options={timezoneList} value={selectedTimezone} isDisabled={isReadOnly}
                      onChange={(o) => { setSelectedTimezone(o); const v = o?.value || ''; setValue('timezone', v); field.onChange(v); }}
                      onBlur={field.onBlur} placeholder={t("Select timezone")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Currency")}</Label>
                <Controller name="currency" control={control}
                  render={({ field }) => (
                    <Select options={currencyList} value={selectedCurrency} isDisabled={isReadOnly}
                      onChange={(o) => { setSelectedCurrency(o); const v = o?.value || ''; setValue('currency', v); field.onChange(v); }}
                      onBlur={field.onBlur} placeholder={t("Select currency")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
            </Row>

            {/* ── Country (drives timezone + currency cascading) ── */}
            <Row>
              <div className="mb-2 col-lg-6 col-md-6">
                <Label>{t("Country")}</Label>
                <Controller name="selected_country" control={control}
                  render={({ field }) => (
                    <Select options={countryList} value={selectedCountry} isDisabled={isReadOnly}
                      onChange={(o) => {
                        setSelectedCountry(o); const v = o?.value || '';
                        setValue('selected_country', v); setValue('country', o?.label || ''); field.onChange(v);
                        if (o) {
                          const tz = getPrimaryTimezoneByCountry(o.value);
                          if (tz) { const tzObj = timezoneList.find(t => t.value === tz); if (tzObj) { setSelectedTimezone(tzObj); setValue('timezone', tzObj.value); } }
                          const cur = autoDetectCurrency(o.value);
                          if (cur) { setSelectedCurrency(cur); setValue('currency', cur.value); }
                        }
                      }}
                      onBlur={field.onBlur} placeholder={t("Select country")} isClearable isSearchable styles={selectStyles} />
                  )} />
              </div>
            </Row>

            {/* ── Tax & Compliance (India export) ── */}
            <h4 className="mt-4 mb-2">{t("Tax & Compliance")}</h4>
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
                  {t("LUT Number")} <small className="text-muted">({t("Letter of Undertaking")})</small>
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
                <Controller name="default_port_of_loading" control={control}
                  render={({ field }) => (
                    <Input
                      id="default_port_of_loading"
                      maxLength={150}
                      placeholder="e.g. Mundra Port, India"
                      disabled={isReadOnly}
                      {...field}
                      value={field.value || ""}
                    />
                  )} />
                <small className="text-muted">
                  {t("Pre-fills the PFI's Port of Loading on Quotation → PFI conversion. Editable per PFI.")}
                </small>
              </Col>
              <Col md="12" className="mb-2">
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
                <small className="text-muted">
                  {t("Pre-fills the declaration block on every PFI / Commercial Invoice. Editable per document.")}
                </small>
              </Col>
            </Row>

            {/* ── Addresses (multi) ── */}
            <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
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
                <Row key={row._key} className="border rounded p-2 mb-2 mx-0">
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
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("City")}</Label>
                    <Controller name={`addresses.${idx}.city`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("State")}</Label>
                    <Controller name={`addresses.${idx}.state`} control={control}
                      render={({ field }) => (
                        <Input disabled={isReadOnly} {...field} value={field.value || ""} />
                      )} />
                  </Col>
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

            {/* ── Bank Accounts (multi) ── */}
            <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
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
                <Row key={row._key} className="border rounded p-2 mb-2 mx-0">
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

            <div className="d-flex justify-content-end mt-3 gap-2 pt-2 pb-2">
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