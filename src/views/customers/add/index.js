// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
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
import { ArrowLeft, Plus, Trash2 } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import {
  initCustomerItem,
  initCustomerContactItem,
  initCustomerAddressItem,
} from "@constant/reduxConstant";
import { STATUS_OPTIONS, COUNTRY_OPTIONS } from "@constant/options";

const CustomerForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.customer);
  const isEditMode = !!id;

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
              name: yup
                .string()
                .trim()
                .required(t("Contact name is required"))
                .max(150),
              designation: yup.string().trim().nullable().notRequired(),
              email: yup
                .string()
                .trim()
                .email(t("Invalid email"))
                .required(t("Email is required")),
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
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCustomerItem,
  });

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
    const payload = {
      company_name: data.company_name.trim(),
      website: data.website?.trim() || undefined,
      social_media: {
        linkedin: data.social_media?.linkedin?.trim() || undefined,
        facebook: data.social_media?.facebook?.trim() || undefined,
        instagram: data.social_media?.instagram?.trim() || undefined,
        twitter: data.social_media?.twitter?.trim() || undefined,
        other: data.social_media?.other?.trim() || undefined,
      },
      gstin: data.gstin?.trim() || undefined,
      pan: data.pan?.trim() || undefined,
      iec: data.iec?.trim() || undefined,
      status: data.status,
      is_active: data.status === "active",
      contacts: (data.contacts || []).map((c) => ({
        name: c.name.trim(),
        designation: c.designation?.trim() || undefined,
        email: c.email.trim(),
        phone: c.phone?.trim() || undefined,
        country_code: c.country_code || undefined,
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
          label: a.label?.trim() || undefined,
          address_line1: a.address_line1?.trim() || undefined,
          address_line2: a.address_line2?.trim() || undefined,
          city: a.city?.trim() || undefined,
          state: a.state?.trim() || undefined,
          country: a.country?.trim() || undefined,
          postcode: a.postcode?.trim() || undefined,
          gstin: a.gstin?.trim() || undefined,
          iec: a.iec?.trim() || undefined,
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

  return (
    <Fragment>
      <div className="main-content customers">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Customer") : t("Add Customer")}</h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/customers`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
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
              <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
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
                        {t("Name")} <span className="text-danger">*</span>
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
                        {t("Email")} <span className="text-danger">*</span>
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

              {/* ── Tax & Compliance ── */}
              <h4 className="mt-3 mb-2">{t("Tax & Compliance")}</h4>
              <Row>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="gstin">{t("GSTIN")}</Label>
                  <Controller
                    name="gstin"
                    control={control}
                    render={({ field }) => (
                      <Input id="gstin" maxLength={15} placeholder="22AAAAA0000A1Z5"
                        {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="pan">{t("PAN")}</Label>
                  <Controller
                    name="pan"
                    control={control}
                    render={({ field }) => (
                      <Input id="pan" maxLength={10} placeholder="AAAAA0000A"
                        {...field} value={field.value || ""} />
                    )}
                  />
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

              {/* ── Addresses (multi) ── */}
              <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
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
                              onChange={(e) => field.onChange(e.target.checked)}
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
                      <Label className="form-label">{t("City")}</Label>
                      <Controller
                        name={`addresses.${idx}.city`}
                        control={control}
                        render={({ field }) => (
                          <Input {...field} value={field.value || ""} />
                        )}
                      />
                    </Col>
                    <Col md="3" className="mb-2">
                      <Label className="form-label">{t("State")}</Label>
                      <Controller
                        name={`addresses.${idx}.state`}
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
                            options={COUNTRY_OPTIONS}
                            value={
                              COUNTRY_OPTIONS.find(
                                (o) => o.value === field.value
                              ) || null
                            }
                            onChange={(opt) =>
                              field.onChange(opt ? opt.value : "")
                            }
                            placeholder={t("Select country")}
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                            }}
                          />
                        )}
                      />
                    </Col>
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
                      <Label className="form-label">{t("GSTIN (this address)")}</Label>
                      <Controller
                        name={`addresses.${idx}.gstin`}
                        control={control}
                        render={({ field }) => (
                          <Input maxLength={15} {...field} value={field.value || ""} />
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

              <div className="d-flex justify-content-end mt-3">
                <Button
                  type="button"
                  color="secondary"
                  outline
                  className="me-1"
                  onClick={() => navigate(`${appsRoot}/customers`)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isEditMode ? t("Update") : t("Create")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default CustomerForm;
