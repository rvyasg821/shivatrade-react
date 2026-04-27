// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
import {
  getCategory,
  getCategoryDropdown,
  createCategory,
  updateCategory,
  cleanCategoryMessage,
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
import Select from "react-select";
import { useTranslation } from "react-i18next";

// ** Icons
import { ArrowLeft } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initCategoryItem } from "@constant/reduxConstant";
import { STATUS_OPTIONS } from "@constant/options";

const CategoryForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.category);
  const isEditMode = !!id;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup
          .string()
          .trim()
          .required(t("Name is required"))
          .min(2, t("Name must be at least 2 characters"))
          .max(150, t("Name must be at most 150 characters")),
        description: yup.string().trim().nullable().notRequired(),
        parent_id: yup.string().nullable().notRequired(),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "all",
    resolver: yupResolver(schema),
    defaultValues: initCategoryItem,
  });

  // Load dropdown + (in edit mode) the existing category
  useLayoutEffect(() => {
    dispatch(getCategoryDropdown());
    if (isEditMode) {
      dispatch(getCategory(id));
    } else {
      reset(initCategoryItem);
    }
  }, [id]);

  // Hydrate form when category loads (edit mode)
  useEffect(() => {
    if (isEditMode && store?.categoryItem && store.categoryItem._id) {
      const c = store.categoryItem;
      reset({
        _id: c._id,
        name: c.name || "",
        description: c.description || "",
        parent_id: c.parent_id || "",
        status: c.status || (c.is_active ? "active" : "inactive"),
        is_active: c.is_active,
      });
    }
  }, [store?.categoryItem?._id]);

  // Toast messages + redirect on success
  useEffect(() => {
    if (store?.success) {
      Notification("Success", store.success, "success");
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
    }
    if (
      store?.actionFlag === "CAT_CRTD" ||
      store?.actionFlag === "CAT_UPDT"
    ) {
      dispatch(cleanCategoryMessage(null));
      navigate(`${appsRoot}/categories`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  // Build parent options (exclude self in edit mode)
  const parentOptions = useMemo(() => {
    const list = store?.categoryDropdown || [];
    return list
      .filter((c) => c._id !== id)
      .map((c) => ({ value: c._id, label: c.name }));
  }, [store?.categoryDropdown, id]);

  // Parent select helper kept for when the dropdown is re-enabled
  // eslint-disable-next-line no-unused-vars
  const selectedParent = useMemo(() => {
    const v = watch("parent_id");
    return parentOptions.find((o) => o.value === v) || null;
  }, [parentOptions, watch("parent_id")]);

  const onSubmit = (data) => {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      parent_id: data.parent_id || undefined,
      status: data.status,
      is_active: data.status === "active",
    };

    if (isEditMode) {
      dispatch(updateCategory({ id, data: payload }));
    } else {
      dispatch(createCategory(payload));
    }
  };

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading());
    else dispatch(stopLoading());
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content categories">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">
            {isEditMode ? t("Edit Category") : t("Add Category")}
          </h3>
          <Button
            type="button"
            className="ms-2 btn-primary"
            onClick={() => navigate(`${appsRoot}/categories`)}
          >
            <ArrowLeft size={17} />
          </Button>
        </div>

        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
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
                        placeholder={t("Category name")}
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

                {/* Parent Category — hidden for now, schema/backend kept intact
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="parent_id">
                    {t("Parent Category")}
                  </Label>
                  <Controller
                    name="parent_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        inputId="parent_id"
                        isClearable
                        classNamePrefix="select"
                        options={parentOptions}
                        value={selectedParent}
                        placeholder={t("Leave empty for top-level")}
                        onChange={(opt) =>
                          field.onChange(opt ? opt.value : "")
                        }
                      />
                    )}
                  />
                </Col>
                */}

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
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label className="form-check-label" for={`status-${opt.value}`}>
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
                  onClick={() => navigate(`${appsRoot}/categories`)}
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

export default CategoryForm;
