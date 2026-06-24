import { Fragment, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Row, Col, Label, Input, Button, FormGroup, ButtonGroup } from "reactstrap";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

// Pay type drives a one-way calculator: in HOURLY mode, Hourly Rate is the source
// of truth and Annual Salary is computed read-only. In SALARIED mode, Annual Salary
// is the source of truth and Hourly Rate is computed. Weekly Hours is always
// editable. The user-entered field is NEVER overwritten by the calculator —
// only the computed display updates.
const PAY_TYPE = { HOURLY: 'hourly', SALARIED: 'salaried' };

// Resolve the initial pay type for an employee. Defaults to 'hourly' for new
// records and uses existing salary fields as a fallback for legacy rows.
const resolveInitialPayType = (employeeData) => {
  if (!employeeData) return PAY_TYPE.SALARIED;
  if (employeeData.pay_type === PAY_TYPE.HOURLY || employeeData.pay_type === PAY_TYPE.SALARIED) {
    return employeeData.pay_type;
  }
  // Legacy fallback: if only hourly_rate is set and no annual_salary, treat as hourly
  const hasRate = employeeData.hourly_rate != null && Number(employeeData.hourly_rate) > 0;
  const hasSalary = employeeData.annual_salary != null && Number(employeeData.annual_salary) > 0;
  if (hasRate && !hasSalary) return PAY_TYPE.HOURLY;
  return PAY_TYPE.SALARIED;
};

const FinancialDetailsTab = forwardRef(({ employeeData }, ref) => {
  const { t } = useTranslation();

  const [payType, setPayType] = useState(PAY_TYPE.SALARIED);

  const { control, handleSubmit, reset, watch, setValue } = useForm({
    shouldFocusError: false,
    defaultValues: {
      weekly_working_hours: "",
      hourly_rate: "",
      annual_salary: "",
      payroll_frequency: "",
      mode_of_transfer: "",
      bank_name: "",
      account_holder_name: "",
      sort_code: "",
      account_number: "",
      tax_code: "",
      ni_category: "",
      pension_opt_in: false,
      pension_provider: "",
      pension_employee_contribution: "",
      pension_employer_contribution: "",
    },
  });

  useEffect(() => {
    if (employeeData) {
      setPayType(resolveInitialPayType(employeeData));
      reset({
        weekly_working_hours: employeeData.weekly_working_hours ?? "",
        hourly_rate: employeeData.hourly_rate ?? "",
        annual_salary: employeeData.annual_salary ?? "",
        payroll_frequency: employeeData.payroll_frequency || "",
        mode_of_transfer: employeeData.mode_of_transfer || "",
        bank_name: employeeData.bank_name || "",
        account_holder_name: employeeData.account_holder_name || "",
        sort_code: employeeData.sort_code || "",
        account_number: employeeData.account_number || "",
        tax_code: employeeData.tax_code || "",
        ni_category: employeeData.ni_category || "",
        pension_opt_in: employeeData.pension_opt_in || false,
        pension_provider: employeeData.pension_provider || "",
        pension_employee_contribution: employeeData.pension_employee_contribution ?? "",
        pension_employer_contribution: employeeData.pension_employer_contribution ?? "",
      });
    }
  }, [employeeData]);

  // ── One-way salary calculator (no feedback loops) ──
  // Watch Hours + the user-entered money field; recompute the OTHER money
  // field whenever either changes. The user-entered field is never overwritten.
  const watchedHours = watch("weekly_working_hours");
  const watchedRate = watch("hourly_rate");
  const watchedSalary = watch("annual_salary");

  useEffect(() => {
    const hours = parseFloat(watchedHours) || 0;
    const annualWeeks = 52;

    if (payType === PAY_TYPE.HOURLY) {
      // Hourly mode: rate is the truth → compute annual_salary from rate × hours × 52
      const rate = parseFloat(watchedRate) || 0;
      if (hours > 0 && rate > 0) {
        const computed = (hours * rate * annualWeeks).toFixed(2);
        if (computed !== watchedSalary) setValue("annual_salary", computed);
      } else {
        if (watchedSalary !== "") setValue("annual_salary", "");
      }
    } else {
      // Salaried mode: annual_salary is the truth → compute hourly_rate from salary / (hours × 52)
      const salary = parseFloat(watchedSalary) || 0;
      if (hours > 0 && salary > 0) {
        const computed = (salary / (hours * annualWeeks)).toFixed(2);
        if (computed !== watchedRate) setValue("hourly_rate", computed);
      } else {
        if (watchedRate !== "") setValue("hourly_rate", "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payType, watchedHours, watchedRate, watchedSalary]);

  // When the user toggles the pay type, the previously computed value is kept
  // as the new editable value (no data loss). The other field becomes computed.
  const handlePayTypeChange = (newType) => {
    if (newType === payType) return;
    setPayType(newType);
  };

  const buildPayload = (values) => ({
    weekly_working_hours: values.weekly_working_hours ? Number(values.weekly_working_hours) : null,
      hourly_rate: values.hourly_rate ? Number(values.hourly_rate) : null,
      annual_salary: values.annual_salary ? Number(values.annual_salary) : null,
      pay_type: payType,
      payroll_frequency: values.payroll_frequency || null,
      mode_of_transfer: values.mode_of_transfer || null,
      bank_name: values.bank_name || null,
      account_holder_name: values.account_holder_name || null,
      sort_code: values.sort_code || null,
      account_number: values.account_number || null,
      tax_code: values.tax_code || null,
      ni_category: values.ni_category || null,
      pension_opt_in: values.pension_opt_in,
      pension_provider: values.pension_provider || null,
      pension_employee_contribution: values.pension_employee_contribution ? Number(values.pension_employee_contribution) : null,
      pension_employer_contribution: values.pension_employer_contribution ? Number(values.pension_employer_contribution) : null,
  });

  useImperativeHandle(ref, () => ({
    getData: () =>
      new Promise((resolve) => {
        handleSubmit(
          (values) => resolve(buildPayload(values)),
          () => resolve(undefined)
        )();
      }),
  }));

  return (
    <Fragment>
      <form onSubmit={(e) => e.preventDefault()}>

        {/* ── Salary & Working Hours ── */}
        <h5 className="mb-2 fw-bold">{t("Salary & Working Hours")}</h5>

        {/* Pay Type toggle — drives which money field is editable vs computed */}
        <Row className="mb-2">
          <Col md="12">
            <Label className="d-block mb-1">
              {t("Pay Type")} <span className="text-muted small">— {t("how compensation is calculated")}</span>
            </Label>
            <ButtonGroup>
              <Button
                color={payType === PAY_TYPE.HOURLY ? "primary" : "outline-primary"}
                size="sm"
                type="button"
                onClick={() => handlePayTypeChange(PAY_TYPE.HOURLY)}
              >
                {t("Hourly")}
              </Button>
              <Button
                color={payType === PAY_TYPE.SALARIED ? "primary" : "outline-primary"}
                size="sm"
                type="button"
                onClick={() => handlePayTypeChange(PAY_TYPE.SALARIED)}
              >
                {t("Salaried")}
              </Button>
            </ButtonGroup>
            <div className="text-muted small mt-50">
              {payType === PAY_TYPE.HOURLY
                ? t("Enter Hourly Rate. Annual Salary is calculated as Rate × Hours × 52.")
                : t("Enter Annual Salary. Hourly Rate is calculated as Salary ÷ (Hours × 52).")}
            </div>
          </Col>
        </Row>

        <Row>
          <Col md="4" className="mb-2">
            <Label>{t("Weekly Working Hours")}</Label>
            <Controller name="weekly_working_hours" control={control} render={({ field }) => (
              <Input {...field} type="number" step="0.5" placeholder="e.g. 37.5" />
            )} />
          </Col>
          <Col md="4" className="mb-2">
            <Label>
              {t("Hourly Rate")}
              {payType === PAY_TYPE.SALARIED && (
                <span className="ms-1 text-muted small">({t("calculated")})</span>
              )}
            </Label>
            <Controller name="hourly_rate" control={control} render={({ field }) => (
              <Input
                {...field}
                type="number"
                step="0.01"
                placeholder="e.g. 15.00"
                readOnly={payType === PAY_TYPE.SALARIED}
                style={payType === PAY_TYPE.SALARIED ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
              />
            )} />
          </Col>
          <Col md="4" className="mb-2">
            <Label>
              {t("Annual Salary")}
              {payType === PAY_TYPE.HOURLY && (
                <span className="ms-1 text-muted small">({t("calculated")})</span>
              )}
            </Label>
            <Controller name="annual_salary" control={control} render={({ field }) => (
              <Input
                {...field}
                type="number"
                step="0.01"
                placeholder="e.g. 35000"
                readOnly={payType === PAY_TYPE.HOURLY}
                style={payType === PAY_TYPE.HOURLY ? { backgroundColor: '#f8f9fa', cursor: 'not-allowed' } : {}}
              />
            )} />
          </Col>
        </Row>

        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Payroll Frequency")}</Label>
            <Controller name="payroll_frequency" control={control} render={({ field }) => (
              <Input type="select" {...field}>
                <option value="">{t("Select")}</option>
                <option value="WEEKLY">{t("Weekly")}</option>
                <option value="BI_WEEKLY">{t("Bi-Weekly")}</option>
                <option value="MONTHLY">{t("Monthly")}</option>
              </Input>
            )} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Mode of Transfer")}</Label>
            <Controller name="mode_of_transfer" control={control} render={({ field }) => (
              <Input type="select" {...field}>
                <option value="">{t("Select")}</option>
                <option value="BANK">{t("Bank Transfer (BACS)")}</option>
                <option value="CASH">{t("Cash")}</option>
                <option value="CHEQUE">{t("Cheque")}</option>
              </Input>
            )} />
          </Col>
        </Row>

        {/* ── Bank Details ── */}
        <h5 className="mt-3 mb-2 fw-bold">{t("Bank Details")}</h5>
        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Bank Name")}</Label>
            <Controller name="bank_name" control={control} render={({ field }) => <Input {...field} />} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Account Holder Name")}</Label>
            <Controller name="account_holder_name" control={control} render={({ field }) => <Input {...field} />} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("IFSC Code")}</Label>
            <Controller name="sort_code" control={control} render={({ field }) => (
              <Input {...field} placeholder="e.g. 12-34-56" />
            )} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("Account Number")}</Label>
            <Controller name="account_number" control={control} render={({ field }) => (
              <Input {...field} placeholder="e.g. 12345678" />
            )} />
          </Col>
        </Row>

        {/* ── Tax & NI ── */}
        {/* <h5 className="mt-3 mb-2 fw-bold">{t("Tax & National Insurance")}</h5>
        <Row>
          <Col md="6" className="mb-2">
            <Label>{t("Tax Code")}</Label>
            <Controller name="tax_code" control={control} render={({ field }) => (
              <Input {...field} placeholder="e.g. 1257L" />
            )} />
          </Col>
          <Col md="6" className="mb-2">
            <Label>{t("NI Category")}</Label>
            <Controller name="ni_category" control={control} render={({ field }) => (
              <Input type="select" {...field}>
                <option value="">{t("Select")}</option>
                <option value="A">{t("A — Standard")}</option>
                <option value="B">{t("B — Married women reduced")}</option>
                <option value="C">{t("C — Over state pension age")}</option>
                <option value="H">{t("H — Apprentice under 25")}</option>
                <option value="M">{t("M — Under 21")}</option>
                <option value="Z">{t("Z — Under 21, deferment")}</option>
              </Input>
            )} />
          </Col>
        </Row> */}

        {/* ── Pension ── */}
        {/* <h5 className="mt-3 mb-2 fw-bold">{t("Pension")}</h5>
        <Row>
          <Col md="3" className="mb-2">
            <FormGroup check className="mt-2">
              <Controller name="pension_opt_in" control={control} render={({ field }) => (
                <Input type="checkbox" id="pension_opt_in" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              )} />
              <Label check htmlFor="pension_opt_in" className="fw-semibold">{t("Pension Opt-In")}</Label>
            </FormGroup>
          </Col>
          <Col md="3" className="mb-2">
            <Label>{t("Pension Provider")}</Label>
            <Controller name="pension_provider" control={control} render={({ field }) => (
              <Input {...field} placeholder="e.g. NEST" />
            )} />
          </Col>
          <Col md="3" className="mb-2">
            <Label>{t("Employee Contribution %")}</Label>
            <Controller name="pension_employee_contribution" control={control} render={({ field }) => (
              <Input {...field} type="number" step="0.1" min="0" max="100" placeholder="e.g. 5" />
            )} />
          </Col>
          <Col md="3" className="mb-2">
            <Label>{t("Employer Contribution %")}</Label>
            <Controller name="pension_employer_contribution" control={control} render={({ field }) => (
              <Input {...field} type="number" step="0.1" min="0" max="100" placeholder="e.g. 3" />
            )} />
          </Col>
        </Row> */}

      </form>
    </Fragment>
  );
});

export default FinancialDetailsTab;
