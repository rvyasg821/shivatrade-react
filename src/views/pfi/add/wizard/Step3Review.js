// ── Step 3: Review & Save (PFI) ──────────────────────────────────────
// Read-only summary + Status select + final notes (client + internal).
// Uses the shared SalesDocLineItems in compact, read-only mode so the
// editable detail view stays on Step 2 — same pattern as the Quotation
// wizard's review step.

import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { QUOTATION_STATUS_OPTIONS } from "@constant/options";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initPfiLineItem } from "@constant/reduxConstant";

const Step3Review = ({
  totals,
  selectedCurrencyCode,
  baseCurrencyCode,
  productOptions,
  rebateOptions,
  expenseOptions,
  exchangeRate,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  return (
    <Row>
      <Col md="8">
        <SalesDocLineItems
          control={control}
          setValue={setValue}
          productOptions={productOptions}
          initLineItem={initPfiLineItem}
          rebateOptions={rebateOptions}
          expenseOptions={expenseOptions}
          currencyCode={selectedCurrencyCode}
          baseCurrencyCode={baseCurrencyCode}
          exchangeRate={exchangeRate}
          readOnly
          tableLayout="compact"
        />

        <Row className="mt-2">
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Notes to Client")}</Label>
            <Controller
              name="notes_to_client"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Internal Notes")}</Label>
            <Controller
              name="internal_notes"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        <Row>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Status")}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  classNamePrefix="select"
                  options={QUOTATION_STATUS_OPTIONS}
                  value={
                    QUOTATION_STATUS_OPTIONS.find(
                      (o) => o.value === field.value
                    ) || null
                  }
                  onChange={(opt) =>
                    field.onChange(opt ? opt.value : "draft")
                  }
                />
              )}
            />
            {errors.status && (
              <FormFeedback className="d-block">
                {errors.status.message}
              </FormFeedback>
            )}
          </Col>
        </Row>
      </Col>

      <Col md="4">
        <SalesDocCostingCard
          totals={totals}
          currencyCode={selectedCurrencyCode}
        />
      </Col>
    </Row>
  );
};

export default Step3Review;
