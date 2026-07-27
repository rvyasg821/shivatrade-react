// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  cleanCustomerMessage,
} from "../store";
import { startLoading, stopLoading } from "../../loadingstore";
import { getExchangeRateOptions } from "../../currencies/store";

// ** Reactstrap
import {
  Row,
  Col,
  Form,
  Card,
  CardBody,
  Label,
  Input,
  Button,
  FormFeedback,
} from "reactstrap";

// ** Form
import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom
import Notification from "@components/toast/notification";
import PhoneInputField from "@src/components/phone-input/PhoneInputField";

// ** Third Party
import { useTranslation } from "react-i18next";
import Select from "react-select";

// ** Icons
import {
  ArrowLeft,
  Plus,
  Trash2,
  Briefcase,
  Users,
  MapPin,
} from "react-feather";

// ** Wizard scaffolding (shared with Quotation / PFI / PO wizards)
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import {
  initCustomerItem,
  initCustomerContactItem,
  initCustomerAddressItem,
} from "@constant/reduxConstant";
import {
  STATUS_OPTIONS,
  EXCHANGE_TO_CURRENCY_OPTIONS,
} from "@constant/options";
// Countries/states/cities come from the masters via the API — no static list.
import AddressGeoFields from "@src/views/_shared/geo/AddressGeoFields";
import { useCountryOptions } from "@src/views/_shared/geo/useGeoOptions";

const STEPS = [
  {
    key: "company",
    label: "Company & Contacts",
    icon: Briefcase,
    fields: ["company_name", "status", "contacts"],
  },
  {
    key: "addresses",
    label: "Addresses",
    icon: MapPin,
    fields: ["addresses"],
  },
  {
    key: "tax",
    label: "Tax & Social",
    icon: Users,
    fields: [],
  },
];

const CustomerForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.customer);
  const currencyStore = useSelector((state) => state.currency);

  // Exchange-rate options carry only the code; pull symbol + name from the
  // shared currency constant so the picker reads "$ USD - US Dollar".
  const currencyOptions = useMemo(() => {
    const metaByCode = {};
    for (const o of EXCHANGE_TO_CURRENCY_OPTIONS) metaByCode[o.value] = o;
    return (currencyStore?.exchangeOptions || []).map((c) => {
      const code = c.code || c.value;
      const meta = metaByCode[code] || {};
      const symbol = c.symbol || meta.symbol || "";
      const label = meta.label || (c.name ? `${code} - ${c.name}` : code);
      return {
        value: code,
        label: `${symbol} ${label}`.trim(),
      };
    });
  }, [currencyStore?.exchangeOptions]);
  const isEditMode = !!id;

  // Customer addresses store the country NAME ("India"), so ask for name-valued
  // options. Straight from the country master — no static package.
  const countryOptions = useCountryOptions("name");

  const schema = useMemo(
    () =>
      yup.object().shape({
        company_name: yup
          .string()
          .trim()
          .required(t("Company name is required"))
          .max(200, t("Company name must be at most 200 characters")),
        website: yup.string().trim().nullable().notRequired(),
        status: yup
          .string()
          .oneOf(["active", "inactive"])
          .required(t("Status is required")),
        contacts: yup
          .array()
          .of(
            yup.object().shape({
              // Contact name & email are optional — company_name is the only
              // required field on a customer.
              name: yup
                .string()
                .trim()
                .max(150)
                .nullable()
                .notRequired(),
              designation: yup.string().trim().nullable().notRequired(),
              // Format-checked only when a value is present (yup's .email()
              // excludes empty strings).
              email: yup
                .string()
                .trim()
                .email(t("Invalid email"))
                .nullable()
                .notRequired(),
              phone: yup.string().trim().nullable().notRequired(),
              is_primary: yup.boolean(),
            })
          )
          .min(1, t("At least one contact is required"))
          .test(
            "exactly-one-primary",
            t("Exactly one contact must be marked as primary"),
            (arr) => Array.isArray(arr) && arr.filter((c) => c.is_primary).length === 1
          ),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCustomerItem,
  });

  // ── Wizard navigation state ─────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));

  const goTo = async (idx, { validate = true } = {}) => {
    if (idx === activeStep) return;
    if (idx < 0 || idx >= STEPS.length) return;
    if (idx > activeStep && validate) {
      const fields = STEPS[activeStep].fields || [];
      const ok = fields.length === 0 ? true : await trigger(fields);
      if (!ok) {
        Notification(
          "Validation",
          t("Please complete the highlighted fields first."),
          "warning"
        );
        return;
      }
    }
    setVisited((prev) => {
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
    setActiveStep(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => goTo(activeStep + 1);
  const back = () => goTo(activeStep - 1, { validate: false });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
    keyName: "_key",
  });

  const addressesField = useFieldArray({
    control,
    name: "addresses",
    keyName: "_key",
  });

  useLayoutEffect(() => {
    dispatch(getExchangeRateOptions());
    if (isEditMode) {
      dispatch(getCustomer(id));
    } else {
      reset(initCustomerItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.customerItem && store.customerItem._id) {
      const c = store.customerItem;
      reset({
        _id: c._id,
        company_name: c.company_name || "",
        website: c.website || "",
        social_media: {
          linkedin: c.social_media?.linkedin || "",
          facebook: c.social_media?.facebook || "",
          instagram: c.social_media?.instagram || "",
          twitter: c.social_media?.twitter || "",
          other: c.social_media?.other || "",
        },
        gstin: c.gstin || "",
        pan: c.pan || "",
        iec: c.iec || "",
        currency: c.currency || "",
        status: c.status || (c.is_active ? "active" : "inactive"),
        is_active: c.is_active,
        contacts:
          c.contacts && c.contacts.length > 0
            ? c.contacts.map((co) => ({
                name: co.name || "",
                designation: co.designation || "",
                email: co.email || "",
                phone: co.phone || "",
                country_code: co.country_code || null,
                is_primary: !!co.is_primary,
              }))
            : [{ ...initCustomerContactItem, is_primary: true }],
        addresses:
          c.addresses && c.addresses.length > 0
            ? c.addresses.map((a) => ({
                type: a.type || "bill_to",
                label: a.label || "",
                address_line1: a.address_line1 || "",
                address_line2: a.address_line2 || "",
                city: a.city || "",
                state: a.state || "",
                country: a.country || "",
                postcode: a.postcode || "",
                gstin: a.gstin || "",
                iec: a.iec || "",
                is_default: !!a.is_default,
              }))
            : [{ ...initCustomerAddressItem, type: "bill_to", is_default: true }],
      });
      // Mark every step as visited so the user can click any of them.
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
  }, [store?.customerItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "CUST_CRTD" || store?.actionFlag === "CUST_UPDT") {
      dispatch(cleanCustomerMessage(null));
      navigate(`${appsRoot}/customers`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const handleSetPrimary = (idx) => {
    const current = watch("contacts") || [];
    current.forEach((_, i) => {
      setValue(`contacts.${i}.is_primary`, i === idx, { shouldValidate: true });
    });
  };

  const onSubmit = (data) => {
    // Send "" (empty string) for cleared optional fields instead of dropping
    // them — the backend's Object.assign overwrites the existing column value,
    // so omitting a field on edit leaves the old value in place. Empty strings
    // pass `@IsString() @IsOptional()` validation and explicitly clear it.
    const optStr = (v) => (v == null ? "" : String(v).trim());
    const payload = {
      company_name: data.company_name.trim(),
      website: optStr(data.website),
      social_media: {
        linkedin: optStr(data.social_media?.linkedin),
        facebook: optStr(data.social_media?.facebook),
        instagram: optStr(data.social_media?.instagram),
        twitter: optStr(data.social_media?.twitter),
        other: optStr(data.social_media?.other),
      },
      gstin: optStr(data.gstin),
      pan: optStr(data.pan),
      iec: optStr(data.iec),
      currency: optStr(data.currency),
      status: data.status,
      is_active: data.status === "active",
      contacts: (data.contacts || []).map((c) => ({
        name: optStr(c.name),
        designation: optStr(c.designation),
        email: optStr(c.email),
        phone: optStr(c.phone),
        country_code: c.country_code || null,
        is_primary: !!c.is_primary,
      })),
      addresses: (data.addresses || [])
        .filter(
          (a) =>
            a.address_line1?.trim() ||
            a.city?.trim() ||
            a.country?.trim() ||
            a.postcode?.trim() ||
            a.label?.trim()
        )
        .map((a) => ({
          type: a.type || "bill_to",
          label: optStr(a.label),
          address_line1: optStr(a.address_line1),
          address_line2: optStr(a.address_line2),
          city: optStr(a.city),
          state: optStr(a.state),
          country: optStr(a.country),
          postcode: optStr(a.postcode),
          gstin: optStr(a.gstin),
          iec: optStr(a.iec),
          is_default: !!a.is_default,
        })),
    };

    if (isEditMode) {
      dispatch(updateCustomer({ id, data: payload }));
    } else {
      dispatch(createCustomer(payload));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  // Re-route Save → run full validation, jump to the first step containing
  // errors if any, otherwise submit through react-hook-form's normal flow.
  const findFirstErrorStep = () => {
    const errs = errors || {};
    const hasErr = (path) => !!errs[path.split(".")[0]];
    for (let i = 0; i < STEPS.length; i++) {
      if ((STEPS[i].fields || []).some(hasErr)) return i;
    }
    return activeStep;
  };

  const onSave = async () => {
    const ok = await trigger();
    if (!ok) {
      const firstBad = findFirstErrorStep();
      if (firstBad !== activeStep) {
        setVisited((prev) => {
          const n = new Set(prev);
          n.add(firstBad);
          return n;
        });
        setActiveStep(firstBad);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      Notification(
        "Validation",
        t("Please fix the highlighted fields."),
        "warning"
      );
      return;
    }
    handleSubmit(onSubmit)();
  };

  return (
    <Fragment>
      <div className="main-content customers quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Customer") : t("Add Customer")}</h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <WizardHeader
          steps={STEPS}
          activeStep={activeStep}
          visited={visited}
          onStepClick={(i) => goTo(i)}
          isEdit={isEditMode}
        />

        <Card>
          <CardBody>
            <Form onSubmit={(e) => e.preventDefault()}>
              {activeStep === 0 && (
                <Fragment>
              {/* ── Company Info ── */}
              <h4 className="mt-1 mb-2">{t("Company Information")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="company_name">
                    {t("Company Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="company_name"
                    control={control}
                    render={({ field }) => (
                      <Input id="company_name" invalid={!!errors.company_name} {...field} />
                    )}
                  />
                  {errors.company_name && (
                    <FormFeedback className="d-block">
                      {errors.company_name.message}
                    </FormFeedback>
                  )}
                </Col>

                {/* <Col md="6" className="mb-2">
                  <Label className="form-label" for="website">
                    {t("Website URL")}
                  </Label>
                  <Controller
                    name="website"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="website"
                        placeholder="https://"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </Col> */}

                <Col md="3" className="mb-2">
                  <Label className="form-label" for="currency">
                    {t("Currency")}
                  </Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="currency"
                        isClearable
                        options={currencyOptions}
                        value={
                          currencyOptions.find(
                            (o) => o.value === field.value
                          ) || null
                        }
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                        placeholder={t("Select currency")}
                        classNamePrefix="select"
                      />
                    )}
                  />
                </Col>

                <Col md="3" className="mb-2">
                  <Label className="form-label d-block">
                    {t("Status")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="d-flex align-items-center gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`customer-status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label
                              className="form-check-label"
                              for={`customer-status-${opt.value}`}
                            >
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </Col>
              </Row>


              {/* ── Contact Persons ── */}
              <div className="d-flex align-items-center justify-content-between mt-1 mb-2">
                <h4 className="mb-0">{t("Contact Persons")}</h4>
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  onClick={() => append({ ...initCustomerContactItem })}
                >
                  <Plus size={14} /> {t("Add Contact")}
                </Button>
              </div>

              {fields.map((f, idx) => (
                <div key={f._key} className="border rounded p-2 mb-2">
                  <Row>
                    <Col md="6" className="mb-2">
                      <Label className="form-label" for={`contacts.${idx}.name`}>
                        {t("Name")}
                      </Label>
                      <Controller
                        name={`contacts.${idx}.name`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`contacts.${idx}.name`}
                            invalid={!!errors?.contacts?.[idx]?.name}
                            {...field}
                          />
                        )}
                      />
                      {errors?.contacts?.[idx]?.name && (
                        <FormFeedback className="d-block">
                          {errors.contacts[idx].name.message}
                        </FormFeedback>
                      )}
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label" for={`contacts.${idx}.designation`}>
                        {t("Designation")}
                      </Label>
                      <Controller
                        name={`contacts.${idx}.designation`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`contacts.${idx}.designation`}
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label" for={`contacts.${idx}.email`}>
                        {t("Email")}
                      </Label>
                      <Controller
                        name={`contacts.${idx}.email`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`contacts.${idx}.email`}
                            type="email"
                            invalid={!!errors?.contacts?.[idx]?.email}
                            {...field}
                          />
                        )}
                      />
                      {errors?.contacts?.[idx]?.email && (
                        <FormFeedback className="d-block">
                          {errors.contacts[idx].email.message}
                        </FormFeedback>
                      )}
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label">{t("Phone")}</Label>
                      <Controller
                        name={`contacts.${idx}.country_code`}
                        control={control}
                        render={({ field: ccField }) => (
                          <PhoneInputField
                            value={ccField.value}
                            phone={watch(`contacts.${idx}.phone`)}
                            onChange={(next) => {
                              ccField.onChange(next);
                              setValue(
                                `contacts.${idx}.phone`,
                                next.phone || ""
                              );
                            }}
                          />
                        )}
                      />
                    </Col>

                    <Col md="6" className="d-flex align-items-center">
                      <div className="form-check">
                        <Controller
                          name={`contacts.${idx}.is_primary`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="radio"
                              id={`primary-${idx}`}
                              name="primary_contact"
                              checked={!!field.value}
                              onChange={() => handleSetPrimary(idx)}
                            />
                          )}
                        />
                        <Label className="form-check-label" for={`primary-${idx}`}>
                          {t("Primary contact")}
                        </Label>
                      </div>
                    </Col>
                    <Col md="6" className="text-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          color="danger"
                          outline
                          size="sm"
                          onClick={() => {
                            const wasPrimary = watch(`contacts.${idx}.is_primary`);
                            remove(idx);
                            if (wasPrimary) {
                              setTimeout(() => handleSetPrimary(0), 0);
                            }
                          }}
                        >
                          <Trash2 size={14} /> {t("Remove")}
                        </Button>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}

              {errors?.contacts &&
                typeof errors.contacts.message === "string" && (
                  <FormFeedback className="d-block">
                    {errors.contacts.message}
                  </FormFeedback>
                )}
                
                </Fragment>
              )}

              {activeStep === 1 && (
                <Fragment>
              {/* ── Addresses (multi) ── */}
              <div className="d-flex justify-content-between align-items-center mt-1 mb-2">
                <h4 className="mb-0">{t("Addresses")}</h4>
                <Button
                  type="button" size="sm" color="primary" outline
                  onClick={() => addressesField.append({ ...initCustomerAddressItem })}
                >
                  + {t("Add Address")}
                </Button>
              </div>
              {addressesField.fields.length === 0 && (
                <small className="text-muted d-block mb-2">
                  {t("No addresses. Add at least one Bill-To address.")}
                </small>
              )}
              {addressesField.fields.map((row, idx) => {
                const TYPE_OPTIONS = [
                  { value: "bill_to", label: t("Bill To") },
                  { value: "ship_to", label: t("Ship To") },
                  { value: "notify", label: t("Notify Party") },
                  { value: "other", label: t("Other") },
                ];
                return (
                  <Row key={row._key} className="border rounded p-2 mb-2 mx-0">
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("Type")}</Label>
                      <Controller
                        name={`addresses.${idx}.type`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            classNamePrefix="select"
                            options={TYPE_OPTIONS}
                            value={TYPE_OPTIONS.find((o) => o.value === field.value) || null}
                            onChange={(opt) => field.onChange(opt ? opt.value : "bill_to")}
                          />
                        )}
                      />
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label">{t("Label")}</Label>
                      <Controller
                        name={`addresses.${idx}.label`}
                        control={control}
                        render={({ field }) => (
                          <Input placeholder={t("e.g. HQ, Conakry warehouse")}
                            {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2 d-flex align-items-end">
                      <div className="form-check">
                        <Controller
                          name={`addresses.${idx}.is_default`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="checkbox"
                              id={`addr-default-${idx}`}
                              checked={!!field.value}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                field.onChange(checked);
                                if (!checked) return;
                                // Only one default allowed per type.
                                // Uncheck other rows with the same type.
                                const myType = watch(
                                  `addresses.${idx}.type`
                                );
                                (addressesField.fields || []).forEach((_a, i) => {
                                  if (i === idx) return;
                                  const t = watch(`addresses.${i}.type`);
                                  if (t === myType) {
                                    setValue(
                                      `addresses.${i}.is_default`,
                                      false,
                                      { shouldDirty: true }
                                    );
                                  }
                                });
                              }}
                            />
                          )}
                        />
                        <Label className="form-check-label" for={`addr-default-${idx}`}>
                          {t("Default for this type")}
                        </Label>
                      </div>
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label">{t("Address Line 1")}</Label>
                      <Controller
                        name={`addresses.${idx}.address_line1`}
                        control={control}
                        render={({ field }) => (
                          <Input {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label">{t("Address Line 2")}</Label>
                      <Controller
                        name={`addresses.${idx}.address_line2`}
                        control={control}
                        render={({ field }) => (
                          <Input {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("Country")}</Label>
                      <Controller
                        name={`addresses.${idx}.country`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            classNamePrefix="select"
                            isClearable
                            options={countryOptions}
                            value={
                              countryOptions.find(
                                (o) => o.value === field.value
                              ) || null
                            }
                            onChange={(opt) => {
                              field.onChange(opt ? opt.value : "");
                              // A state/city from the old country is now wrong.
                              setValue(`addresses.${idx}.state`, "");
                              setValue(`addresses.${idx}.city`, "");
                            }}
                            placeholder={t("Select country")}
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                            }}
                          />
                        )}
                      />
                    </Col>
                    {/* State + City suggest from the geo masters but still take
                        a typed value — free text on the customer record. */}
                    <AddressGeoFields
                      control={control}
                      setValue={setValue}
                      namePrefix={`addresses.${idx}`}
                      countryField={`addresses.${idx}.country`}
                      countryList={countryOptions}
                      colProps={{ md: "3" }}
                    />
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("Postcode")}</Label>
                      <Controller
                        name={`addresses.${idx}.postcode`}
                        control={control}
                        render={({ field }) => (
                          <Input {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label">
                        {t("Tax / VAT Number (this address)")}
                      </Label>
                      <Controller
                        name={`addresses.${idx}.gstin`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            maxLength={30}
                            placeholder={t("GSTIN for India, VAT / TRN for overseas")}
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="6" className="mb-2">
                      <Label className="form-label">{t("IEC (this address)")}</Label>
                      <Controller
                        name={`addresses.${idx}.iec`}
                        control={control}
                        render={({ field }) => (
                          <Input maxLength={20} {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>
                    <Col md="12" className="text-end">
                      <Button
                        type="button" size="sm" color="danger" outline
                        onClick={() => addressesField.remove(idx)}
                      >
                        {t("Remove address")}
                      </Button>
                    </Col>
                  </Row>
                );
              })}

                
                </Fragment>
              )}

              {activeStep === 2 && (
                <Fragment>              {/* ── Tax & Compliance ── */}
              <h4 className="mt-3 mb-2">{t("Tax & Compliance")}</h4>
              <Row>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="gstin">
                    {t("Tax / VAT Number")}
                  </Label>
                  <Controller
                    name="gstin"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="gstin"
                        maxLength={30}
                        placeholder={t("GSTIN, VAT, TRN, etc.")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("GSTIN for India; VAT / TRN / Tax ID for overseas customers.")}
                  </small>
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="pan">
                    {t("Business Registration #")}
                  </Label>
                  <Controller
                    name="pan"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="pan"
                        maxLength={30}
                        placeholder={t("PAN, Trade License, CR, EIN, etc.")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                  <small className="text-muted">
                    {t("PAN for India; Trade License / CR / company registration for overseas.")}
                  </small>
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="iec">
                    {t("IEC")} <small className="text-muted">({t("Importer Exporter Code")})</small>
                  </Label>
                  <Controller
                    name="iec"
                    control={control}
                    render={({ field }) => (
                      <Input id="iec" maxLength={20}
                        {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
              </Row>

              {/* ── Social Media ── */}
              <h4 className="mt-3 mb-2">{t("Social Media URLs")}</h4>
              <Row>
                {["linkedin", "facebook", "instagram", "twitter", "other"].map(
                  (platform) => (
                    <Col md="6" className="mb-2" key={platform}>
                      <Label className="form-label text-capitalize" for={`sm_${platform}`}>
                        {platform === "other" ? t("Other") : t(platform)}
                      </Label>
                      <Controller
                        name={`social_media.${platform}`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`sm_${platform}`}
                            placeholder="https://"
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                    </Col>
                  )
                )}
              </Row>
                
                </Fragment>
              )}

              <WizardFooter
                isFirst={activeStep === 0}
                isLast={activeStep === STEPS.length - 1}
                isEdit={isEditMode}
                onBack={back}
                onNext={next}
                onSubmit={onSave}
                onCancel={() => navigate(`${appsRoot}/customers`)}
                submitting={isSubmitting}
              />
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default CustomerForm;
