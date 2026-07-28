// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getVendorCategory,
  createVendorCategory,
  updateVendorCategory,
  cleanVendorCategoryMessage,
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
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// ** Custom
import Notification from "@components/toast/notification";

// ** Third Party
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initVendorCategoryItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS } from "@constant/options";

const VendorCategoryForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.vendorCategory);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        code: yup
          .string()
          .trim()
          .required(t("Code is required"))
          .max(50, t("Code must be at most 50 characters")),
        name: yup
          .string()
          .trim()
          .required(t("Name is required"))
          .min(2, t("Name must be at least 2 characters"))
          .max(150, t("Name must be at most 150 characters")),
        description: yup.string().trim().nullable().notRequired(),
        status: yup
          .string()
          .oneOf(["active", "inactive"])
          .required(t("Status is required")),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initVendorCategoryItem,
  });

  // Load (in edit mode) the existing vendor category
  useLayoutEffect(() => {
    if (isEditMode) {
      dispatch(getVendorCategory(id));
    } else {
      reset(initVendorCategoryItem);
    }
  }, [id]);

  // Hydrate form when vendor category loads (edit mode)
  useEffect(() => {
    if (
      isEditMode &&
      store?.vendorCategoryItem &&
      store.vendorCategoryItem._id
    ) {
      const c = store.vendorCategoryItem;
      reset({
        _id: c._id,
        code: c.code || "",
        name: c.name || "",
        description: c.description || "",
        status: c.status || (c.is_active ? "active" : "inactive"),
        is_active: c.is_active,
      });
    }
  }, [store?.vendorCategoryItem?._id]);

  // Toast messages + redirect on success
  useEffect(() => {
    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
    if (
      store?.actionFlag === "VCAT_CRTD" ||
      store?.actionFlag === "VCAT_UPDT"
    ) {
      dispatch(cleanVendorCategoryMessage(null));
      navigate(`${appsRoot}/vendor-categories`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      status: data.status,
      is_active: data.status === "active",
    };

    if (isEditMode) {
      dispatch(updateVendorCategory({ id, data: payload }));
    } else {
      dispatch(createVendorCategory(payload));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content vendor-categories">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode
              ? t("Edit Vendor Category")
              : t("Add Vendor Category")}
          </h3>
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
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="code">
                    {t("Code")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="code"
                        placeholder={t("Vendor category code")}
                        invalid={!!errors.code}
                        {...field}
                      />
                    )}
                  />
                  {errors.code && (
                    <FormFeedback className="d-block">
                      {errors.code.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="6" className="mb-2">
                  <Label className="form-label" for="name">
                    {t("Name")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="name"
                        placeholder={t("Vendor category name")}
                        invalid={!!errors.name}
                        {...field}
                      />
                    )}
                  />
                  {errors.name && (
                    <FormFeedback className="d-block">
                      {errors.name.message}
                    </FormFeedback>
                  )}
                </Col>

                <Col md="12" className="mb-2">
                  <Label className="form-label" for="description">
                    {t("Description")}
                  </Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="description"
                        type="textarea"
                        rows="3"
                        placeholder={t("Optional description")}
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
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
                              id={`status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label
                              className="form-check-label"
                              for={`status-${opt.value}`}
                            >
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.status && (
                    <FormFeedback className="d-block">
                      {errors.status.message}
                    </FormFeedback>
                  )}
                </Col>
              </Row>

              <div className="d-flex justify-content-end mt-2">
                <Button
                  type="button"
                  color="secondary"
                  outline
                  className="me-1"
                  onClick={() => navigate(`${appsRoot}/vendor-categories`)}
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

export default VendorCategoryForm;
