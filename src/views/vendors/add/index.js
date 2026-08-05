// ** React Imports
import { Fragment, useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import {
  getVendor,
  createVendor,
  updateVendor,
  cleanVendorMessage,
} from "../store";
import { getCurrencyDropdown } from "@src/views/currencies/store";
import { startLoading, stopLoading } from "../../loadingstore";

// ** Axios + Endpoints (live vendor_code uniqueness check)
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

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
import DateInput from "@components/date-input";
import PhoneInputField from "@src/components/phone-input/PhoneInputField";

// ** Third Party
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Icons
import {
  ArrowLeft,
  Plus,
  Trash2,
  Briefcase,
  MapPin,
  CreditCard,
  Users,
} from "react-feather";

// ** Wizard scaffolding (shared with Customer / Quotation / PFI / PO wizards)
import WizardHeader from "@src/views/_shared/wizard/WizardHeader";
import WizardFooter from "@src/views/_shared/wizard/WizardFooter";
import "@src/views/_shared/wizard/wizard.scss";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import {
  initVendorItem,
  initVendorContactItem,
  initVendorAddressItem,
  initVendorBankAccountItem,
} from "@constant/reduxConstant";
import {
  STATUS_OPTIONS,
  VENDOR_PAYMENT_TERMS_OPTIONS,
  VENDOR_INCOTERMS_OPTIONS,
} from "@constant/options";
// Countries/states/cities come from the masters via the API — no static list.
import AddressGeoFields from "@src/views/_shared/geo/AddressGeoFields";
import { useCountryOptions } from "@src/views/_shared/geo/useGeoOptions";

const STEPS = [
  {
    key: "company",
    label: "Company & Contacts",
    icon: Briefcase,
    fields: ["company_name", "vendor_code", "gstin", "category_ids", "product_category_ids", "status", "contacts"],
  },
  {
    key: "addresses",
    label: "Addresses",
    icon: MapPin,
    fields: ["addresses"],
  },
  {
    key: "banks",
    label: "Bank Accounts",
    icon: CreditCard,
    fields: ["bank_accounts"],
  },
  {
    key: "tax",
    label: "Tax & Social",
    icon: Users,
    fields: [],
  },
];

const VendorForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.vendor);
  const currencyStore = useSelector((state) => state.currency);

  // Vendor categories come from the dedicated Vendor Category master (NOT the
  // product category master). Fetched directly off its dropdown endpoint.
  const [vendorCategoryOptions, setVendorCategoryOptions] = useState([]);
  // Product categories come from the PRODUCT Category master — a second,
  // parallel association alongside the vendor categories above.
  const [productCategoryOptions, setProductCategoryOptions] = useState([]);
  const isEditMode = !!id;

  // Vendor addresses store the country NAME ("India"), so ask for name-valued
  // options. Straight from the country master — no static package.
  const countryOptions = useCountryOptions("name");

  // Live vendor_code uniqueness check on blur.
  const [codeExists, setCodeExists] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);

  const handleVendorCodeBlur = async (e) => {
    const code = (e.target.value || "").trim();
    if (!code) {
      setCodeExists(false);
      return;
    }
    if (
      isEditMode &&
      store?.vendorItem?.vendor_code &&
      code.toLowerCase() ===
        store.vendorItem.vendor_code.trim().toLowerCase()
    ) {
      setCodeExists(false);
      return;
    }
    setCodeChecking(true);
    setCodeExists(false);
    try {
      const res = await instance.post(API_ENDPOINTS.vendors.checkCode, {
        code,
        vendorId: isEditMode ? id : undefined,
      });
      setCodeExists(!!res?.data?.data?.exists);
    } catch (_e) {
      setCodeExists(false);
    } finally {
      setCodeChecking(false);
    }
  };

  const schema = useMemo(
    () =>
      yup.object().shape({
        company_name: yup
          .string()
          .trim()
          .required(t("Company name is required"))
          .max(200, t("Company name must be at most 200 characters")),
        // Auto-generated (VND-0001) — optional/read-only in the form.
        vendor_code: yup
          .string()
          .trim()
          .max(50, t("Vendor code must be at most 50 characters")),
        website: yup.string().trim().nullable().notRequired(),
        gstin: yup
          .string()
          .trim()
          .nullable()
          .notRequired()
          .max(15, t("GSTIN must be at most 15 characters")),
        category_ids: yup
          .array()
          .of(yup.string())
          .max(1, t("A vendor can have only one vendor category"))
          .nullable()
          .notRequired(),
        product_category_ids: yup
          .array()
          .of(yup.string())
          .nullable()
          .notRequired(),
        payment_terms: yup.string().nullable().notRequired(),
        incoterms: yup.string().nullable().notRequired(),
        currency_code: yup
          .string()
          .required(t("Currency is required"))
          .typeError(t("Currency is required")),
        status: yup
          .string()
          .oneOf(["active", "inactive"])
          .notRequired(),
        contacts: yup
          .array()
          .of(
            yup.object().shape({
              // Contact name and email are optional — only company_name is
              // required. Email is format-checked only when provided.
              name: yup.string().trim().nullable().notRequired().max(150),
              designation: yup.string().trim().nullable().notRequired(),
              email: yup
                .string()
                .trim()
                .nullable()
                .notRequired()
                .email(t("Invalid email")),
              phone: yup.string().trim().nullable().notRequired(),
              is_primary: yup.boolean(),
            })
          )
          .test(
            "at-most-one-primary",
            t("Only one contact can be marked as primary"),
            (arr) =>
              !Array.isArray(arr) ||
              arr.filter((c) => c.is_primary).length <= 1
          ),
      }),
    [t]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initVendorItem,
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

  const banksField = useFieldArray({
    control,
    name: "bank_accounts",
    keyName: "_key",
  });

  useLayoutEffect(() => {
    dispatch(getCurrencyDropdown());
    if (isEditMode) {
      dispatch(getVendor(id));
    } else {
      reset(initVendorItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.vendorItem && store.vendorItem._id) {
      const v = store.vendorItem;
      reset({
        _id: v._id,
        company_name: v.company_name || "",
        website: v.website || "",
        social_media: {
          linkedin: v.social_media?.linkedin || "",
          facebook: v.social_media?.facebook || "",
          instagram: v.social_media?.instagram || "",
          twitter: v.social_media?.twitter || "",
          other: v.social_media?.other || "",
        },
        // One vendor category only — collapse any legacy multi-value to the first.
        category_ids: (v.categories || []).slice(0, 1).map((c) => c._id),
        product_category_ids: (v.product_categories || []).map((c) => c._id),
        gstin: v.gstin || "",
        pan: v.pan || "",
        vendor_code: v.vendor_code || "",
        payment_terms: v.payment_terms || "",
        incoterms: v.incoterms || "",
        currency_code: v.currency_code || "",
        opening_balance:
          v.opening_balance != null ? String(v.opening_balance) : "",
        opening_balance_type: v.opening_balance_type || "credit",
        opening_balance_date: v.opening_balance_date || "",
        status: v.status || (v.is_active ? "active" : "inactive"),
        is_active: v.is_active,
        contacts:
          v.contacts && v.contacts.length > 0
            ? v.contacts.map((c) => ({
                name: c.name || "",
                designation: c.designation || "",
                email: c.email || "",
                phone: c.phone || "",
                country_code: c.country_code || null,
                is_primary: !!c.is_primary,
              }))
            : [{ ...initVendorContactItem, is_primary: true }],
        addresses:
          v.addresses && v.addresses.length > 0
            ? v.addresses.map((a) => ({
                type: a.type || "bill_from",
                label: a.label || "",
                address_line1: a.address_line1 || "",
                address_line2: a.address_line2 || "",
                city: a.city || "",
                state: a.state || "",
                country: a.country || "",
                postcode: a.postcode || "",
                gstin: a.gstin || "",
                is_default: !!a.is_default,
              }))
            : [{ ...initVendorAddressItem, type: "bill_from", is_default: true }],
        bank_accounts:
          v.bank_accounts && v.bank_accounts.length > 0
            ? v.bank_accounts.map((b) => ({
                bank_name: b.bank_name || "",
                account_holder_name: b.account_holder_name || "",
                account_number: b.account_number || "",
                ifsc: b.ifsc || "",
                swift_code: b.swift_code || "",
                iban: b.iban || "",
                currency_id: b.currency_id || "",
                branch_name: b.branch_name || "",
                branch_address: b.branch_address || "",
                account_type: b.account_type || "current",
                is_default: !!b.is_default,
                notes: b.notes || "",
                is_active: b.is_active !== false,
              }))
            : [],
      });
      // Mark every step as visited so the user can click any of them.
      setVisited(new Set(STEPS.map((_, i) => i)));
    }
  }, [store?.vendorItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "VEN_CRTD" || store?.actionFlag === "VEN_UPDT") {
      dispatch(cleanVendorMessage(null));
      navigate(`${appsRoot}/vendors`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  // Load the Vendor Category master dropdown once on mount.
  useEffect(() => {
    instance
      .get(API_ENDPOINTS.vendorCategories.dropdown)
      .then((r) =>
        setVendorCategoryOptions(
          (r?.data?.data || []).map((c) => ({
            value: c._id,
            label: c.code ? `${c.code} - ${c.name}` : c.name,
          }))
        )
      )
      .catch(() => setVendorCategoryOptions([]));
  }, []);

  // Load the (product) Category master dropdown once on mount.
  useEffect(() => {
    instance
      .get(API_ENDPOINTS.categories.dropdown)
      .then((r) =>
        setProductCategoryOptions(
          (r?.data?.data || []).map((c) => ({
            value: c._id,
            label: c.code ? `${c.code} - ${c.name}` : c.name,
          }))
        )
      )
      .catch(() => setProductCategoryOptions([]));
  }, []);

  // A vendor has exactly ONE vendor category — single-select. category_ids is
  // kept as an array (0 or 1 id) so the backend contract stays unchanged.
  const selectedCategory = useMemo(() => {
    const ids = watch("category_ids") || [];
    return vendorCategoryOptions.find((o) => ids.includes(o.value)) || null;
  }, [vendorCategoryOptions, watch("category_ids")]);

  const selectedProductCategories = useMemo(() => {
    const ids = watch("product_category_ids") || [];
    return productCategoryOptions.filter((o) => ids.includes(o.value));
  }, [productCategoryOptions, watch("product_category_ids")]);

  const selectedPaymentTerms = useMemo(
    () =>
      VENDOR_PAYMENT_TERMS_OPTIONS.find(
        (o) => o.value === watch("payment_terms")
      ) || null,
    [watch("payment_terms")]
  );

  const selectedIncoterms = useMemo(
    () =>
      VENDOR_INCOTERMS_OPTIONS.find((o) => o.value === watch("incoterms")) ||
      null,
    [watch("incoterms")]
  );

  // Preferred currency (stored as ISO code). Same master list the bank-account
  // rows use, keyed by code so it seeds the Vendor-PO currency directly.
  const currencyCodeOptions = useMemo(
    () =>
      (currencyStore?.currencyDropdown || []).map((c) => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
      })),
    [currencyStore?.currencyDropdown]
  );
  const selectedCurrency = useMemo(
    () =>
      currencyCodeOptions.find((o) => o.value === watch("currency_code")) ||
      null,
    [currencyCodeOptions, watch("currency_code")]
  );

  const handleSetPrimary = (idx) => {
    const current = watch("contacts") || [];
    current.forEach((_, i) => {
      setValue(`contacts.${i}.is_primary`, i === idx, { shouldValidate: true });
    });
  };

  const onSubmit = (data) => {
    // Send "" for cleared optional fields instead of dropping them — backend
    // Object.assign overwrites the column value, so omitting a field on edit
    // leaves the old value intact. Empty string passes validation and clears.
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
      category_ids: data.category_ids || [],
      product_category_ids: data.product_category_ids || [],
      gstin: optStr(data.gstin),
      pan: optStr(data.pan),
      vendor_code: optStr(data.vendor_code),
      payment_terms: optStr(data.payment_terms),
      incoterms: optStr(data.incoterms),
      currency_code: optStr(data.currency_code),
      // Migration opening balance (ledger).
      opening_balance: optStr(data.opening_balance),
      opening_balance_type: optStr(data.opening_balance_type) || "credit",
      opening_balance_date: optStr(data.opening_balance_date),
      status: data.status,
      is_active: data.status === "active",
      contacts: (data.contacts || []).map((c) => ({
        // Name and email are optional now — guard against undefined.
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
          type: a.type || "bill_from",
          label: optStr(a.label),
          address_line1: optStr(a.address_line1),
          address_line2: optStr(a.address_line2),
          city: optStr(a.city),
          state: optStr(a.state),
          country: optStr(a.country),
          postcode: optStr(a.postcode),
          gstin: optStr(a.gstin),
          is_default: !!a.is_default,
        })),
      bank_accounts: (data.bank_accounts || [])
        .filter(
          (b) => b.bank_name?.trim() && b.account_number?.trim() && b.currency_id
        )
        .map((b) => ({
          bank_name: b.bank_name.trim(),
          account_holder_name: optStr(b.account_holder_name),
          account_number: b.account_number.trim(),
          ifsc: optStr(b.ifsc),
          swift_code: optStr(b.swift_code),
          iban: optStr(b.iban),
          currency_id: b.currency_id,
          branch_name: optStr(b.branch_name),
          branch_address: optStr(b.branch_address),
          account_type: b.account_type || "current",
          is_default: !!b.is_default,
          notes: optStr(b.notes),
          is_active: b.is_active !== false,
        })),
    };

    if (isEditMode) {
      dispatch(updateVendor({ id, data: payload }));
    } else {
      dispatch(createVendor(payload));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

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
    if (!ok || codeExists) {
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

  const ADDRESS_TYPE_OPTIONS = [
    { value: "bill_from", label: t("Bill From") },
    { value: "ship_from", label: t("Ship From") },
    { value: "other", label: t("Other") },
  ];
  const ACC_TYPE_OPTIONS = [
    { value: "current", label: t("Current") },
    { value: "savings", label: t("Savings") },
    { value: "other", label: t("Other") },
  ];

  return (
    <Fragment>
      <div className="main-content vendors quotation-wizard">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Vendor") : t("Add Vendor")}
          </h3>
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
              {/* ── STEP 1: Company & Contacts ── */}
              {activeStep === 0 && (
                <Fragment>
                  <h4 className="mt-1 mb-2">{t("Company Information")}</h4>
                  <Row>
                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="company_name">
                        {t("Company Name")}{" "}
                        <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name="company_name"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="company_name"
                            invalid={!!errors.company_name}
                            {...field}
                          />
                        )}
                      />
                      {errors.company_name && (
                        <FormFeedback className="d-block">
                          {errors.company_name.message}
                        </FormFeedback>
                      )}
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="vendor_code">
                        {t("Vendor Code")}
                      </Label>
                      <Controller
                        name="vendor_code"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="vendor_code"
                            disabled
                            placeholder={t("Auto-generated (e.g. VND-0001)")}
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                      <small className="text-muted">
                        {t("Generated automatically on save.")}
                      </small>
                    </Col>

                    <Col md="6" className="mb-2">
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
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="gstin">
                        {t("GST Number (GSTIN)")}
                      </Label>
                      <Controller
                        name="gstin"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="gstin"
                            maxLength={15}
                            placeholder="22AAAAA0000A1Z5"
                            invalid={!!errors.gstin}
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                      {errors.gstin && (
                        <FormFeedback className="d-block">
                          {errors.gstin.message}
                        </FormFeedback>
                      )}
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="category_ids">
                        {t("Vendor Category")}
                      </Label>
                      <Controller
                        name="category_ids"
                        control={control}
                        render={({ field }) => (
                          <Select
                            inputId="category_ids"
                            isClearable
                            classNamePrefix="select"
                            options={vendorCategoryOptions}
                            value={selectedCategory}
                            placeholder={t("Select a vendor category")}
                            onChange={(opt) =>
                              field.onChange(opt ? [opt.value] : [])
                            }
                          />
                        )}
                      />
                      {errors.category_ids && (
                        <FormFeedback className="d-block">
                          {errors.category_ids.message}
                        </FormFeedback>
                      )}
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="product_category_ids">
                        {t("Product Categories")}
                      </Label>
                      <Controller
                        name="product_category_ids"
                        control={control}
                        render={({ field }) => (
                          <Select
                            inputId="product_category_ids"
                            isMulti
                            isClearable
                            classNamePrefix="select"
                            options={productCategoryOptions}
                            value={selectedProductCategories}
                            placeholder={t(
                              "Select one or more product categories"
                            )}
                            onChange={(opts) =>
                              field.onChange((opts || []).map((o) => o.value))
                            }
                          />
                        )}
                      />
                      {errors.product_category_ids && (
                        <FormFeedback className="d-block">
                          {errors.product_category_ids.message}
                        </FormFeedback>
                      )}
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label d-block">
                        {t("Status")} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <div className="d-flex align-items-center gap-2">
                            {STATUS_OPTIONS.map((opt) => (
                              <div
                                className="form-check form-check-inline"
                                key={opt.value}
                              >
                                <Input
                                  type="radio"
                                  id={`vendor-status-${opt.value}`}
                                  name={field.name}
                                  value={opt.value}
                                  checked={field.value === opt.value}
                                  onChange={() => field.onChange(opt.value)}
                                />
                                <Label
                                  className="form-check-label"
                                  for={`vendor-status-${opt.value}`}
                                >
                                  {t(opt.label)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="payment_terms">
                        {t("Payment Terms")}
                      </Label>
                      <Controller
                        name="payment_terms"
                        control={control}
                        render={({ field }) => (
                          <Select
                            inputId="payment_terms"
                            isClearable
                            classNamePrefix="select"
                            options={VENDOR_PAYMENT_TERMS_OPTIONS}
                            value={selectedPaymentTerms}
                            placeholder={t("Select payment terms")}
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "")
                            }
                          />
                        )}
                      />
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="incoterms">
                        {t("Incoterms (International Commercial Terms)")}
                      </Label>
                      <Controller
                        name="incoterms"
                        control={control}
                        render={({ field }) => (
                          <Select
                            inputId="incoterms"
                            isClearable
                            classNamePrefix="select"
                            options={VENDOR_INCOTERMS_OPTIONS}
                            value={selectedIncoterms}
                            placeholder={t("Select incoterms")}
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "")
                            }
                          />
                        )}
                      />
                    </Col>

                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="currency_code">
                        {t("Currency")} <span className="text-danger">*</span>
                      </Label>
                      <Controller
                        name="currency_code"
                        control={control}
                        render={({ field }) => (
                          <Select
                            inputId="currency_code"
                            classNamePrefix="select"
                            options={currencyCodeOptions}
                            value={selectedCurrency}
                            placeholder={t("Select currency")}
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "")
                            }
                          />
                        )}
                      />
                      {errors.currency_code && (
                        <FormFeedback className="d-block">
                          {errors.currency_code.message}
                        </FormFeedback>
                      )}
                      <small className="text-muted">
                        {t(
                          "Used for this vendor's price list & Vendor POs."
                        )}
                      </small>
                    </Col>
                  </Row>

                  {/* ── Opening Balance (ledger migration) ── */}
                  <Row>
                    <Col md="4" className="mb-2">
                      <Label className="form-label" for="opening_balance">
                        {t("Opening Balance")}
                      </Label>
                      <Controller
                        name="opening_balance"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="opening_balance"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                          />
                        )}
                      />
                      <small className="text-muted">
                        {t("Balance carried over at migration.")}
                      </small>
                    </Col>
                    <Col md="4" className="mb-2">
                      <Label className="form-label" for="opening_balance_type">
                        {t("Balance Type")}
                      </Label>
                      <Controller
                        name="opening_balance_type"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="opening_balance_type"
                            type="select"
                            {...field}
                            value={field.value || "credit"}
                          >
                            <option value="credit">
                              {t("Credit — we owe the vendor")}
                            </option>
                            <option value="debit">
                              {t("Debit — advance with the vendor")}
                            </option>
                          </Input>
                        )}
                      />
                    </Col>
                    <Col md="4" className="mb-2">
                      <Label className="form-label" for="opening_balance_date">
                        {t("As of Date")}
                      </Label>
                      <Controller
                        name="opening_balance_date"
                        control={control}
                        render={({ field }) => (
                          <DateInput id="opening_balance_date" field={field} />
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
                      onClick={() => append({ ...initVendorContactItem })}
                    >
                      <Plus size={14} /> {t("Add Contact")}
                    </Button>
                  </div>

                  {fields.map((f, idx) => (
                    <div key={f._key} className="border rounded p-2 mb-2">
                      <Row>
                        <Col md="6" className="mb-2">
                          <Label
                            className="form-label"
                            for={`contacts.${idx}.name`}
                          >
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
                          <Label
                            className="form-label"
                            for={`contacts.${idx}.designation`}
                          >
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
                          <Label
                            className="form-label"
                            for={`contacts.${idx}.email`}
                          >
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
                                onChange={(nx) => {
                                  ccField.onChange(nx);
                                  setValue(
                                    `contacts.${idx}.phone`,
                                    nx.phone || ""
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
                            <Label
                              className="form-check-label"
                              for={`primary-${idx}`}
                            >
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
                                const wasPrimary = watch(
                                  `contacts.${idx}.is_primary`
                                );
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

              {/* ── STEP 2: Addresses ── */}
              {activeStep === 1 && (
                <Fragment>
                  <div className="d-flex justify-content-between align-items-center mt-1 mb-2">
                    <h4 className="mb-0">{t("Addresses")}</h4>
                    <Button
                      type="button"
                      size="sm"
                      color="primary"
                      outline
                      onClick={() =>
                        addressesField.append({ ...initVendorAddressItem })
                      }
                    >
                      + {t("Add Address")}
                    </Button>
                  </div>
                  {addressesField.fields.length === 0 && (
                    <small className="text-muted d-block mb-2">
                      {t("No addresses. Add at least one Bill From address.")}
                    </small>
                  )}
                  {addressesField.fields.map((row, idx) => (
                    <Row
                      key={row._key}
                      className="border rounded p-2 mb-2 mx-0"
                    >
                      <Col md="3" className="mb-2">
                        <Label className="form-label">{t("Type")}</Label>
                        <Controller
                          name={`addresses.${idx}.type`}
                          control={control}
                          render={({ field }) => (
                            <Select
                              classNamePrefix="select"
                              options={ADDRESS_TYPE_OPTIONS}
                              value={
                                ADDRESS_TYPE_OPTIONS.find(
                                  (o) => o.value === field.value
                                ) || null
                              }
                              onChange={(opt) =>
                                field.onChange(opt ? opt.value : "bill_from")
                              }
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
                            <Input
                              placeholder={t("e.g. HQ, Rajkot factory")}
                              {...field}
                              value={field.value || ""}
                            />
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
                                id={`vaddr-default-${idx}`}
                                checked={!!field.value}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  field.onChange(checked);
                                  if (!checked) return;
                                  const myType = watch(
                                    `addresses.${idx}.type`
                                  );
                                  (addressesField.fields || []).forEach(
                                    (_a, i) => {
                                      if (i === idx) return;
                                      const tp = watch(
                                        `addresses.${i}.type`
                                      );
                                      if (tp === myType) {
                                        setValue(
                                          `addresses.${i}.is_default`,
                                          false,
                                          { shouldDirty: true }
                                        );
                                      }
                                    }
                                  );
                                }}
                              />
                            )}
                          />
                          <Label
                            className="form-check-label"
                            for={`vaddr-default-${idx}`}
                          >
                            {t("Default for this type")}
                          </Label>
                        </div>
                      </Col>

                      <Col md="6" className="mb-2">
                        <Label className="form-label">
                          {t("Address Line 1")}
                        </Label>
                        <Controller
                          name={`addresses.${idx}.address_line1`}
                          control={control}
                          render={({ field }) => (
                            <Input {...field} value={field.value || ""} />
                          )}
                        />
                      </Col>
                      <Col md="6" className="mb-2">
                        <Label className="form-label">
                          {t("Address Line 2")}
                        </Label>
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
                      {/* State + City suggest from the geo masters but still
                          take a typed value — free text on the vendor record. */}
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

                      <Col md="12" className="mb-2">
                        <Label className="form-label">
                          {t("GSTIN (this address)")}
                        </Label>
                        <Controller
                          name={`addresses.${idx}.gstin`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              maxLength={15}
                              {...field}
                              value={field.value || ""}
                            />
                          )}
                        />
                      </Col>
                      <Col md="12" className="text-end">
                        <Button
                          type="button"
                          size="sm"
                          color="danger"
                          outline
                          onClick={() => addressesField.remove(idx)}
                        >
                          {t("Remove address")}
                        </Button>
                      </Col>
                    </Row>
                  ))}
                </Fragment>
              )}

              {/* ── STEP 3: Bank Accounts ── */}
              {activeStep === 2 && (
                <Fragment>
                  <div className="d-flex justify-content-between align-items-center mt-1 mb-2">
                    <h4 className="mb-0">{t("Bank Accounts")}</h4>
                    <Button
                      type="button"
                      size="sm"
                      color="primary"
                      outline
                      onClick={() => {
                        const list = currencyStore?.currencyDropdown || [];
                        const def =
                          list.find((c) => c.is_default) ||
                          list.find((c) => c.code === "INR") ||
                          list[0];
                        const currencyId = def?._id || "";
                        const existing = banksField.fields || [];
                        const hasDefaultForCurrency = existing.some((b, i) => {
                          const cid = watch(
                            `bank_accounts.${i}.currency_id`
                          );
                          const dflt = watch(`bank_accounts.${i}.is_default`);
                          return cid === currencyId && !!dflt;
                        });
                        banksField.append({
                          ...initVendorBankAccountItem,
                          currency_id: currencyId,
                          is_default: !hasDefaultForCurrency,
                        });
                      }}
                    >
                      + {t("Add Bank Account")}
                    </Button>
                  </div>
                  {banksField.fields.length === 0 && (
                    <small className="text-muted d-block mb-2">
                      {t("No bank accounts. Add one for outward payments.")}
                    </small>
                  )}
                  {banksField.fields.map((row, idx) => {
                    const currencyOptions = (
                      currencyStore?.currencyDropdown || []
                    ).map((c) => ({
                      value: c._id,
                      label: `${c.code} - ${c.name}`,
                    }));
                    return (
                      <Row
                        key={row._key}
                        className="border rounded p-2 mb-2 mx-0"
                      >
                        <Col md="6" className="mb-2">
                          <Label className="form-label">
                            {t("Bank Name")}{" "}
                            <span className="text-danger">*</span>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.bank_name`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} value={field.value || ""} />
                            )}
                          />
                        </Col>
                        <Col md="6" className="mb-2">
                          <Label className="form-label">
                            {t("Account Holder Name")}
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.account_holder_name`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} value={field.value || ""} />
                            )}
                          />
                        </Col>
                        <Col md="6" className="mb-2">
                          <Label className="form-label">
                            {t("Account Number")}{" "}
                            <span className="text-danger">*</span>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.account_number`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} value={field.value || ""} />
                            )}
                          />
                        </Col>
                        <Col md="3" className="mb-2">
                          <Label className="form-label">
                            {t("Currency")}{" "}
                            <span className="text-danger">*</span>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.currency_id`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                classNamePrefix="select"
                                options={currencyOptions}
                                value={
                                  currencyOptions.find(
                                    (o) => o.value === field.value
                                  ) || null
                                }
                                onChange={(opt) =>
                                  field.onChange(opt ? opt.value : "")
                                }
                              />
                            )}
                          />
                        </Col>
                        <Col md="3" className="mb-2">
                          <Label className="form-label">
                            {t("Account Type")}
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.account_type`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                classNamePrefix="select"
                                options={ACC_TYPE_OPTIONS}
                                value={
                                  ACC_TYPE_OPTIONS.find(
                                    (o) => o.value === field.value
                                  ) || null
                                }
                                onChange={(opt) =>
                                  field.onChange(opt ? opt.value : "current")
                                }
                              />
                            )}
                          />
                        </Col>

                        <Col md="4" className="mb-2">
                          <Label className="form-label">
                            {t("IFSC")}{" "}
                            <small className="text-muted">
                              ({t("India domestic")})
                            </small>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.ifsc`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                maxLength={11}
                                {...field}
                                value={field.value || ""}
                              />
                            )}
                          />
                        </Col>
                        <Col md="4" className="mb-2">
                          <Label className="form-label">
                            {t("SWIFT Code")}{" "}
                            <small className="text-muted">
                              ({t("International")})
                            </small>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.swift_code`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                maxLength={11}
                                {...field}
                                value={field.value || ""}
                              />
                            )}
                          />
                        </Col>
                        <Col md="4" className="mb-2">
                          <Label className="form-label">
                            {t("IBAN")}{" "}
                            <small className="text-muted">
                              ({t("EU / Middle-East")})
                            </small>
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.iban`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                maxLength={34}
                                {...field}
                                value={field.value || ""}
                              />
                            )}
                          />
                        </Col>

                        <Col md="6" className="mb-2">
                          <Label className="form-label">
                            {t("Branch Name")}
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.branch_name`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} value={field.value || ""} />
                            )}
                          />
                        </Col>
                        <Col md="6" className="mb-2">
                          <Label className="form-label">
                            {t("Branch Address")}
                          </Label>
                          <Controller
                            name={`bank_accounts.${idx}.branch_address`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} value={field.value || ""} />
                            )}
                          />
                        </Col>
                        <Col md="9" className="mb-2">
                          <Label className="form-label">{t("Notes")}</Label>
                          <Controller
                            name={`bank_accounts.${idx}.notes`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="textarea"
                                rows="1"
                                {...field}
                                value={field.value || ""}
                              />
                            )}
                          />
                        </Col>
                        <Col md="3" className="mb-2 d-flex align-items-end">
                          <div className="form-check">
                            <Controller
                              name={`bank_accounts.${idx}.is_default`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  type="checkbox"
                                  id={`vbank-default-${idx}`}
                                  checked={!!field.value}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    field.onChange(checked);
                                    if (!checked) return;
                                    const myCurrency = watch(
                                      `bank_accounts.${idx}.currency_id`
                                    );
                                    (banksField.fields || []).forEach(
                                      (_b, i) => {
                                        if (i === idx) return;
                                        const cid = watch(
                                          `bank_accounts.${i}.currency_id`
                                        );
                                        if (cid === myCurrency) {
                                          setValue(
                                            `bank_accounts.${i}.is_default`,
                                            false,
                                            { shouldDirty: true }
                                          );
                                        }
                                      }
                                    );
                                  }}
                                />
                              )}
                            />
                            <Label
                              className="form-check-label"
                              for={`vbank-default-${idx}`}
                            >
                              {t("Default for currency")}
                            </Label>
                          </div>
                        </Col>
                        <Col md="12" className="text-end">
                          <Button
                            type="button"
                            size="sm"
                            color="danger"
                            outline
                            onClick={() => banksField.remove(idx)}
                          >
                            {t("Remove bank account")}
                          </Button>
                        </Col>
                      </Row>
                    );
                  })}
                </Fragment>
              )}

              {/* ── STEP 4: Tax & Social ── */}
              {activeStep === 3 && (
                <Fragment>
                  <h4 className="mt-1 mb-2">{t("Tax & Compliance")}</h4>
                  <Row>
                    <Col md="6" className="mb-2">
                      <Label className="form-label" for="pan">
                        {t("PAN")}
                      </Label>
                      <Controller
                        name="pan"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="pan"
                            maxLength={10}
                            placeholder="AAAAA0000A"
                            {...field}
                            value={field.value || ""}
                          />
                        )}
                      />
                    </Col>
                  </Row>

                  {/* ── Social Media ── */}
                  <h4 className="mt-3 mb-2">{t("Social Media URLs")}</h4>
                  <Row>
                    {[
                      "linkedin",
                      "facebook",
                      "instagram",
                      "twitter",
                      "other",
                    ].map((platform) => (
                      <Col md="6" className="mb-2" key={platform}>
                        <Label
                          className="form-label text-capitalize"
                          for={`sm_${platform}`}
                        >
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
                    ))}
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
                onCancel={() => navigate(`${appsRoot}/vendors`)}
                submitting={isSubmitting || codeChecking}
              />
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default VendorForm;
