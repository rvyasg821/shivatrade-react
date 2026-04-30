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

// ** Third Party
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft, Plus, Trash2 } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initCustomerItem, initCustomerContactItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS } from "@constant/options";

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
        address_line1: c.address_line1 || "",
        address_line2: c.address_line2 || "",
        city: c.city || "",
        state: c.state || "",
        country: c.country || "",
        postcode: c.postcode || "",
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
      address_line1: data.address_line1?.trim() || undefined,
      address_line2: data.address_line2?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      country: data.country?.trim() || undefined,
      postcode: data.postcode?.trim() || undefined,
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
                      <Label className="form-label" for={`contacts.${idx}.phone`}>
                        {t("Phone")}
                      </Label>
                      <Controller
                        name={`contacts.${idx}.phone`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`contacts.${idx}.phone`}
                            {...field}
                            value={field.value || ""}
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

              {/* ── Address ── */}
              <h4 className="mt-3 mb-2">{t("Address Information")}</h4>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="address_line1">{t("Address Line 1")}</Label>
                  <Controller
                    name="address_line1"
                    control={control}
                    render={({ field }) => (
                      <Input id="address_line1" {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="address_line2">{t("Address Line 2")}</Label>
                  <Controller
                    name="address_line2"
                    control={control}
                    render={({ field }) => (
                      <Input id="address_line2" {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="city">{t("City")}</Label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <Input id="city" {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="state">{t("State")}</Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Input id="state" {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="country">{t("Country")}</Label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Input id="country" {...field} value={field.value || ""} />
                    )}
                  />
                </Col>
                <Col md="3" className="mb-2">
                  <Label className="form-label" for="postcode">{t("Zipcode / PIN Code")}</Label>
                  <Controller
                    name="postcode"
                    control={control}
                    render={({ field }) => (
                      <Input id="postcode" {...field} value={field.value || ""} />
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
