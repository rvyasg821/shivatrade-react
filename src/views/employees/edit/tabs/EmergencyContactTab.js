import { Fragment, useEffect, forwardRef, useImperativeHandle } from "react";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
const FIELDS = ['kin_name', 'kin_relationship', 'kin_address', 'kin_postcode', 'kin_phone', 'kin_email'];

const EmergencyContactTab = forwardRef(({ employeeData }, ref) => {
  const { t } = useTranslation();

  const schema = yup.object().shape({
    kin_name: yup.string().nullable(),
    kin_relationship: yup.string().nullable(),
    kin_address: yup.string().nullable(),
    kin_postcode: yup.string().nullable(),
    kin_phone: yup.string().nullable(),
    kin_email: yup.string().nullable(),
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    shouldFocusError: false,
    defaultValues: Object.fromEntries(FIELDS.map(f => [f, ""])),
  });

  useEffect(() => {
    if (employeeData) {
      reset(Object.fromEntries(FIELDS.map(f => [f, employeeData[f] || ""])));
    }
  }, [employeeData]);

  // Footer-driven save: the wizard collects each step's validated payload via
  // getData() and persists once (resolves undefined when validation fails).
  useImperativeHandle(ref, () => ({
    getData: () =>
      new Promise((resolve) => {
        handleSubmit(
          (values) => resolve(values),
          () => resolve(undefined)
        )();
      }),
  }));

  return (
    <Fragment>
      <form onSubmit={(e) => e.preventDefault()}>
        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Name")}</Label>
            <Controller name="kin_name" control={control} render={({ field }) => <Input {...field} invalid={!!errors.kin_name} />} />
            <FormFeedback>{errors.kin_name?.message}</FormFeedback>
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Relationship")}</Label>
            <Controller name="kin_relationship" control={control} render={({ field }) => (
              <Input type="select" {...field} invalid={!!errors.kin_relationship}>
                <option value="">{t("Select")}</option>
                <option value="Spouse">{t("Spouse")}</option>
                <option value="Parent">{t("Parent")}</option>
                <option value="Sibling">{t("Sibling")}</option>
                <option value="Child">{t("Child")}</option>
                <option value="Friend">{t("Friend")}</option>
                <option value="Other">{t("Other")}</option>
              </Input>
            )} />
            <FormFeedback>{errors.kin_relationship?.message}</FormFeedback>
          </Col>
          <Col md="12" className="mb-2">
            <Label>{t("Address")}</Label>
            <Controller name="kin_address" control={control} render={({ field }) => <Input type="textarea" rows={2} {...field} invalid={!!errors.kin_address} />} />
            <FormFeedback>{errors.kin_address?.message}</FormFeedback>
          </Col>
          <Col md="4" className="mb-2">
            <Label>{t("Postcode")}</Label>
            <Controller name="kin_postcode" control={control} render={({ field }) => <Input {...field} invalid={!!errors.kin_postcode} />} />
            <FormFeedback>{errors.kin_postcode?.message}</FormFeedback>
          </Col>
          <Col md="4" className="mb-2">
            <Label>{t("Phone")}</Label>
            <Controller name="kin_phone" control={control} render={({ field }) => <Input {...field} invalid={!!errors.kin_phone} />} />
            <FormFeedback>{errors.kin_phone?.message}</FormFeedback>
          </Col>
          <Col md="4" className="mb-2">
            <Label>{t("Email")}</Label>
            <Controller name="kin_email" control={control} render={({ field }) => <Input type="email" {...field} invalid={!!errors.kin_email} />} />
            <FormFeedback>{errors.kin_email?.message}</FormFeedback>
          </Col>
        </Row>
      </form>
    </Fragment>
  );
});

export default EmergencyContactTab;
