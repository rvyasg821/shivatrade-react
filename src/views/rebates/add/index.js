import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getRebate, createRebate, updateRebate, cleanRebateMessage,
} from "../store";
import { startLoading, stopLoading } from "../../loadingstore";
import {
  Row, Col, Form, Card, CardBody, Label, Input, Button, FormFeedback,
} from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";
import Notification from "@components/toast/notification";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "react-feather";
import { appsRoot } from "@constant/defaultValues";
import { initRebateItem } from "@constant/reduxConstant";

const APPLIES_ON_OPTIONS = [
  { value: "value", label: "Line Value" },
  { value: "total_after_expenses", label: "Total after Expenses (DBK pattern)" },
  { value: "fob", label: "FOB (RODTEP pattern)" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const RebateForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.rebate);
  const isEditMode = !!id;
  const required = <span className="text-danger">*</span>;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup.string().trim().required(t("Name is required")).max(150),
        code: yup.string().trim().required(t("Code is required")).max(30),
        pct: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0, t("Must be ≥ 0"))
          .required(t("Percentage is required")),
        applies_on: yup.string().required(t("Required")),
        status: yup.string().required(t("Required")),
      }),
    [t]
  );

  const {
    control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "all", resolver: yupResolver(schema), defaultValues: initRebateItem });

  useLayoutEffect(() => {
    if (isEditMode) dispatch(getRebate(id));
    else reset(initRebateItem);
    window.scrollTo(0, 0);
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode && store?.rebateItem && store.rebateItem._id) {
      reset({
        ...initRebateItem,
        ...store.rebateItem,
        pct: store.rebateItem.pct ?? "",
      });
    }
  }, [store?.rebateItem?._id]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanRebateMessage(null));
    }
    if (store?.actionFlag === "REB_CRTD" || store?.actionFlag === "REB_UPDT") {
      navigate(`${appsRoot}/rebates`);
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading()); else dispatch(stopLoading());
  }, [store?.loading]);

  const onSubmit = (data) => {
    const { _id: _ignored, ...rest } = data;
    const payload = {
      ...rest,
      pct: Number(rest.pct),
      is_active: rest.status === "active",
    };
    if (isEditMode) dispatch(updateRebate({ id, data: payload }));
    else dispatch(createRebate(payload));
  };

  return (
    <Fragment>
      <div className="main-content rebate-form">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Rebate") : t("Add Rebate")}</h3>
          <Button color="secondary" outline onClick={() => navigate(`${appsRoot}/rebates`)}>
            <ArrowLeft size={14} /> {t("Back")}
          </Button>
        </div>
        <Card>
          <CardBody>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="name">{t("Name")} {required}</Label>
                  <Controller name="name" control={control}
                    render={({ field }) => <Input id="name" invalid={!!errors.name} {...field} />} />
                  {errors.name && <FormFeedback>{errors.name.message}</FormFeedback>}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="code">{t("Code")} {required}</Label>
                  <Controller name="code" control={control}
                    render={({ field }) => <Input id="code" placeholder="DBK / RODTEP" invalid={!!errors.code} {...field} />} />
                  {errors.code && <FormFeedback>{errors.code.message}</FormFeedback>}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="pct">{t("Percentage")} {required}</Label>
                  <Controller name="pct" control={control}
                    render={({ field }) => (
                      <Input id="pct" type="number" step="0.0001" min="0"
                        invalid={!!errors.pct} {...field} />
                    )} />
                  {errors.pct && <FormFeedback>{errors.pct.message}</FormFeedback>}
                  <small className="text-muted">{t("E.g. 1.43 for DBK, 0.142 for RODTEP")}</small>
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label" for="applies_on">{t("Applies On")} {required}</Label>
                  <Controller name="applies_on" control={control}
                    render={({ field }) => (
                      <Select inputId="applies_on" options={APPLIES_ON_OPTIONS}
                        value={APPLIES_ON_OPTIONS.find((o) => o.value === field.value) || null}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        classNamePrefix="select" />
                    )} />
                  {errors.applies_on && <FormFeedback className="d-block">{errors.applies_on.message}</FormFeedback>}
                </Col>
                <Col md="6" className="mb-2">
                  <Label className="form-label d-block">{t("Status")} {required}</Label>
                  <Controller name="status" control={control}
                    render={({ field }) => (
                      <div className="d-flex align-items-center gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`reb-status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label className="form-check-label" for={`reb-status-${opt.value}`}>
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )} />
                </Col>
                <Col md="12" className="mb-2">
                  <Label className="form-label" for="description">{t("Description")}</Label>
                  <Controller name="description" control={control}
                    render={({ field }) => <Input id="description" type="textarea" rows="2" {...field} />} />
                </Col>
              </Row>
              <div className="d-flex justify-content-end mt-3">
                <Button type="button" color="secondary" outline className="me-1"
                  onClick={() => navigate(`${appsRoot}/rebates`)}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isEditMode ? t("Update Rebate") : t("Create Rebate")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default RebateForm;
