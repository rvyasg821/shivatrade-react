// ── Step 4: Review & Save ────────────────────────────────────────────
// Read-only summary + Status select + final notes (client + internal).

import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { QUOTATION_STATUS_OPTIONS } from "@constant/options";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import CustomerCostingView from "./CustomerCostingView";

const Step4Review = ({
  totals,
  selectedCurrencyCode,
  baseCurrencyCode,
  productOptions,
  allProductOptions,
  exchangeRate,
}) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Row>
      <Col md="8">
        {/* Customer-facing summary in the quote currency (read-only). */}
        <CustomerCostingView
          control={control}
          productOptions={allProductOptions || productOptions}
          exchangeRate={exchangeRate}
          docCurrencyCode={selectedCurrencyCode}
          baseCurrencyCode={baseCurrencyCode}
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
                  menuPlacement="auto"
                  menuPosition="fixed"
                  maxMenuHeight={120}
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : undefined
                  }
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
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
          hideGst
          sticky
        />
      </Col>
    </Row>
  );
};

export default Step4Review;
