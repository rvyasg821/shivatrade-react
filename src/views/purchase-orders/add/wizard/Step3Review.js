// ── Step 3: Review & Save (PO) ──────────────────────────────────────
// Reuses PFI's review building blocks: SalesDocLineItems in compact
// read-only mode for the line items table and SalesDocCostingCard for
// the breakdown. The Notes + Status form sits on the left.

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Row, Col, Label, Input } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { PURCHASE_ORDER_STATUS_OPTIONS } from "@constant/options";
import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initPurchaseOrderLineItem } from "@constant/reduxConstant";

const Step3Review = ({ isLocked, productOptions = [] }) => {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext();
  const lines = useWatch({ control, name: "lines" }) || [];
  const currencyCode = useWatch({ control, name: "currency_code" }) || "INR";
  const exchangeRate = useWatch({ control, name: "exchange_rate" });
  const rate = Number(exchangeRate) || 1;
  const totals = computeDocTotals(lines, rate, { excludeGst: true });

  return (
    <Row>
      <Col md="8">
        {/* Compact read-only line items — same component PFI's review
            uses, so the table design and figures match exactly. */}
        <SalesDocLineItems
          control={control}
          setValue={setValue}
          productOptions={productOptions}
          allProductOptions={productOptions}
          initLineItem={initPurchaseOrderLineItem}
          rebateOptions={[]}
          expenseOptions={[]}
          currencyCode={currencyCode}
          baseCurrencyCode="INR"
          exchangeRate={rate}
          readOnly
          tableLayout="compact"
          hideGst
        />

        <Row>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Notes to Vendor")}</Label>
            <Controller
              name="notes_to_vendor"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  placeholder={t("Visible on the PO PDF.")}
                  disabled={isLocked}
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
                  placeholder={t(
                    "Hidden from PDF. Editable even when status is locked."
                  )}
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        <Row>
          <Col md="6" className="mb-2" style={{ maxWidth: 320 }}>
            <Label className="form-label">{t("Status")}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  classNamePrefix="select"
                  options={PURCHASE_ORDER_STATUS_OPTIONS}
                  value={
                    PURCHASE_ORDER_STATUS_OPTIONS.find(
                      (o) => o.value === field.value
                    ) || PURCHASE_ORDER_STATUS_OPTIONS[0]
                  }
                  onChange={(opt) =>
                    field.onChange(opt ? opt.value : "draft")
                  }
                />
              )}
            />
          </Col>
        </Row>
      </Col>

      <Col md="4">
        <SalesDocCostingCard totals={totals} currencyCode={currencyCode} hideGst />
      </Col>
    </Row>
  );
};

export default Step3Review;
