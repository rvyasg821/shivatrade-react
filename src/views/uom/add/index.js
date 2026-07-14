// ** React Imports
import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ** Store
import { useDispatch, useSelector } from "react-redux";
import { getUom, createUom, updateUom, cleanUomMessage } from "../store";

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
import { ArrowLeft, AlertTriangle } from "react-feather";

// ** Constants
import { appsRoot } from "@constant/defaultValues";
import { initUomItem } from "@constant/reduxConstant";

const UOM_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const UomForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const store = useSelector((state) => state.uom);
  const isEditMode = !!id;

  const inUse = Number(store?.uomItem?.in_use_count || 0);

  const schema = useMemo(
    () =>
      yup.object().shape({
        code: yup
          .string()
          .trim()
          .max(30)
          .required(t("Unit code is required")),
        name: yup.string().trim().max(100).nullable(),
        uqc_code: yup.string().trim().max(10).nullable(),
        allow_decimal: yup.boolean(),
        sort_order: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? 0 : v))
          .typeError(t("Must be a number"))
          .min(0)
          .nullable(),
        status: yup
          .string()
          .oneOf(["ACTIVE", "INACTIVE"])
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
    defaultValues: initUomItem,
  });

  useLayoutEffect(() => {
    if (isEditMode) {
      dispatch(getUom(id));
    } else {
      reset(initUomItem);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode && store?.uomItem?._id) {
      const u = store.uomItem;
      reset({
        _id: u._id,
        code: u.code || "",
        name: u.name || "",
        uqc_code: u.uqc_code || "",
        allow_decimal: u.allow_decimal !== false,
        sort_order: u.sort_order ?? 0,
        status: u.status || "ACTIVE",
      });
    }
  }, [store?.uomItem?._id]);

  useEffect(() => {
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
    if (store?.actionFlag === "UOM_CRTD" || store?.actionFlag === "UOM_UPDT") {
      dispatch(cleanUomMessage(null));
      navigate(`${appsRoot}/uom`);
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const onSubmit = (data) => {
    const payload = {
      code: data.code.trim(),
      name: data.name?.trim() || undefined,
      uqc_code: data.uqc_code?.trim().toUpperCase() || undefined,
      allow_decimal: !!data.allow_decimal,
      // Not editable in the UI — echo back whatever the row already has so an
      // edit does not silently reset a curated order to 0.
      sort_order: Number(data.sort_order) || 0,
      status: data.status,
    };

    if (isEditMode) {
      dispatch(updateUom({ id, data: payload }));
    } else {
      dispatch(createUom(payload));
    }
  };

  return (
    <Fragment>
      <div className="main-content uom">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Unit") : t("Add Unit")}</h3>
          <Button color="secondary" outline onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="me-50" />
            {t("Back")}
          </Button>
        </div>

        <Card>
          <CardBody>
            {isEditMode && inUse > 0 && (
              <div className="d-flex align-items-start mb-2 p-1 border border-warning rounded">
                <AlertTriangle size={18} className="text-warning me-1 mt-25 flex-shrink-0" />
                <div className="small">
                  <strong>
                    {t("{{count}} product(s) use this unit.", { count: inUse })}
                  </strong>{" "}
                  {t(
                    "The code cannot be changed — products store it as plain text, so renaming it would leave them with an unknown unit. Create a new unit instead."
                  )}
                </div>
              </div>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="6" className="mb-1">
                  <Label className="form-label" for="code">
                    {t("Unit Code")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="code"
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("KG")}
                        // Locked once products depend on it — see the banner.
                        disabled={isEditMode && inUse > 0}
                        invalid={!!errors.code}
                      />
                    )}
                  />
                  {errors.code && <FormFeedback>{errors.code.message}</FormFeedback>}
                  <small className="text-muted">
                    {t("Stored on products and line items exactly as typed.")}
                  </small>
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="name">
                    {t("Name")}
                  </Label>
                  <Controller
                    id="name"
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("Kilogram")}
                        invalid={!!errors.name}
                      />
                    )}
                  />
                  {errors.name && <FormFeedback>{errors.name.message}</FormFeedback>}
                </Col>

                <Col md="6" className="mb-1">
                  <Label className="form-label" for="uqc_code">
                    {t("GST UQC Code")}
                  </Label>
                  <Controller
                    id="uqc_code"
                    name="uqc_code"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("KGS")}
                        className="text-uppercase"
                        invalid={!!errors.uqc_code}
                      />
                    )}
                  />
                  {errors.uqc_code && (
                    <FormFeedback>{errors.uqc_code.message}</FormFeedback>
                  )}
                  <small className="text-muted">
                    {t("Prints on GSTR-1 and the Shipping Bill. Blank falls back to 'OTH'.")}
                  </small>
                </Col>

                {/* Sort Order is deliberately NOT shown. It only controls where a
                    unit sits in the dropdown, which is cosmetic and confusing to
                    explain. New units default to 0 and sort alphabetically among
                    the other 0s. The column and the seeded 0-13 ordering stay in
                    the database, so the field can be brought back with no
                    migration — just re-add this Col. The payload below still
                    sends the existing value on edit, so the seeded order is
                    preserved rather than being reset to 0 on every save. */}
                <Col md="6" className="mb-1">
                  <Label className="form-label" for="status">
                    {t("Status")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    id="status"
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={UOM_STATUS_OPTIONS.map((o) => ({
                          ...o,
                          label: t(o.label),
                        }))}
                        value={
                          UOM_STATUS_OPTIONS.filter(
                            (o) => o.value === field.value
                          ).map((o) => ({ ...o, label: t(o.label) }))[0] || null
                        }
                        onChange={(selected) =>
                          field.onChange(selected ? selected.value : "")
                        }
                        classNamePrefix="select"
                        placeholder={t("Select Status")}
                      />
                    )}
                  />
                </Col>

                <Col md="12" className="mb-1">
                  <div className="form-check form-switch">
                    <Controller
                      name="allow_decimal"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="switch"
                          id="allow_decimal"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                    <Label className="form-check-label" for="allow_decimal">
                      {t("Allow decimal quantities")}
                    </Label>
                  </div>
                  <small className="text-muted">
                    {t(
                      "Turn off for countable units — you cannot ship 2.5 boxes. Quantity fields will reject decimals."
                    )}
                  </small>
                </Col>
              </Row>

              <Row className="mt-2">
                <Col className="d-flex">
                  <Button
                    type="submit"
                    color="primary"
                    className="me-1"
                    disabled={isSubmitting}
                  >
                    {isEditMode ? t("Update") : t("Save")}
                  </Button>
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={() => navigate(-1)}
                  >
                    {t("Cancel")}
                  </Button>
                </Col>
              </Row>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default UomForm;
