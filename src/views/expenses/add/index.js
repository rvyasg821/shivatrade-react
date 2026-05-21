import { Fragment, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getExpense, createExpense, updateExpense, cleanExpenseMessage,
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
import { initExpenseItem } from "@constant/reduxConstant";
import {
  REBATE_EXPENSE_TYPE_OPTIONS as TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "@constant/options";

const ExpenseForm = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useSelector((state) => state.expense);
  const isEditMode = !!id;
  const required = <span className="text-danger">*</span>;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup.string().trim().required(t("Name is required")).max(150),
        code: yup.string().trim().required(t("Code is required")).max(30),
        type: yup.string().required(t("Type is required")),
        value: yup
          .number()
          .transform((v, o) => (o === "" || o === null ? undefined : v))
          .typeError(t("Must be a number"))
          .min(0)
          .test(
            "max-2-decimals",
            t("Up to 2 decimal places only"),
            (v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v))
          )
          .required(t("Value is required")),
        status: yup.string().required(t("Required")),
      }),
    [t]
  );

  const {
    control, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "all", resolver: yupResolver(schema), defaultValues: initExpenseItem });

  useLayoutEffect(() => {
    if (isEditMode) dispatch(getExpense(id));
    else reset(initExpenseItem);
    window.scrollTo(0, 0);
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode && store?.expenseItem && store.expenseItem._id) {
      reset({
        ...initExpenseItem,
        ...store.expenseItem,
        value: store.expenseItem.value ?? "",
      });
    }
  }, [store?.expenseItem?._id]);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanExpenseMessage(null));
    }
    if (store?.actionFlag === "EXP_CRTD" || store?.actionFlag === "EXP_UPDT") {
      navigate(`${appsRoot}/expenses`);
    }
    if (store?.success) Notification("Success", store.success, "success");
    if (store?.error) Notification("Error", store.error, "warning");
  }, [store.actionFlag, store.success, store.error]);

  useEffect(() => {
    if (!store?.loading) dispatch(startLoading()); else dispatch(stopLoading());
  }, [store?.loading]);

  const watchType = watch("type");

  const onSubmit = (data) => {
    const { _id: _ignored, ...rest } = data;
    const payload = {
      ...rest,
      value: Number(rest.value),
      is_active: rest.status === "active",
    };
    if (isEditMode) dispatch(updateExpense({ id, data: payload }));
    else dispatch(createExpense(payload));
  };

  return (
    <Fragment>
      <div className="main-content expense-form">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{isEditMode ? t("Edit Expense") : t("Add Expense")}</h3>
          <Button color="secondary" outline onClick={() => navigate(-1)}>
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
                    render={({ field }) => <Input id="code" placeholder="PKG / TRN / CHA" invalid={!!errors.code} {...field} />} />
                  {errors.code && <FormFeedback>{errors.code.message}</FormFeedback>}
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="type">{t("Type")} {required}</Label>
                  <Controller name="type" control={control}
                    render={({ field }) => (
                      <Select inputId="type" options={TYPE_OPTIONS}
                        value={TYPE_OPTIONS.find((o) => o.value === field.value) || null}
                        onChange={(opt) => field.onChange(opt ? opt.value : "")}
                        classNamePrefix="select" />
                    )} />
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label" for="value">
                    {watchType === "fixed" ? t("Amount") : t("Percentage")} {required}
                  </Label>
                  <Controller name="value" control={control}
                    render={({ field }) => (
                      <Input id="value" type="number" step="0.01" min="0"
                        invalid={!!errors.value} {...field} />
                    )} />
                  {errors.value && <FormFeedback>{errors.value.message}</FormFeedback>}
                </Col>
                <Col md="4" className="mb-2">
                  <Label className="form-label d-block">{t("Status")} {required}</Label>
                  <Controller name="status" control={control}
                    render={({ field }) => (
                      <div className="d-flex align-items-center gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <div className="form-check form-check-inline" key={opt.value}>
                            <Input
                              type="radio"
                              id={`exp-status-${opt.value}`}
                              name={field.name}
                              value={opt.value}
                              checked={field.value === opt.value}
                              onChange={() => field.onChange(opt.value)}
                            />
                            <Label className="form-check-label" for={`exp-status-${opt.value}`}>
                              {t(opt.label)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )} />
                </Col>
              </Row>
              <div className="d-flex justify-content-end mt-3">
                <Button type="button" color="secondary" outline className="me-1"
                  onClick={() => navigate(-1)}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {isEditMode ? t("Update Expense") : t("Create Expense")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ExpenseForm;
