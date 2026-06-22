// ── Step 2: Line Items ───────────────────────────────────────────────
// Line items table/modal. The Product picker (search + browse-all) lives
// inside the modal - no step-level category filter.

import { useFormContext } from "react-hook-form";
import { Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";

import CostingWorksheet from "@src/views/_shared/sales-doc/CostingWorksheet";

const Step2Items = ({
  isLocked,
  pricingLoading,
  productOptions,
  allProductOptions,
  expenseOptions,
  rebateOptions,
  selectedCurrencyCode,
  baseCurrencyCode,
  exchangeRate,
}) => {
  const { t } = useTranslation();
  const { control, setValue, getValues } = useFormContext();

  return (
    <>
      {pricingLoading && (
        <div className="d-flex align-items-center gap-1 mb-1 text-muted small">
          <Spinner size="sm" />{" "}
          {t("Auto-filling the best current price per line…")}
        </div>
      )}
    <CostingWorksheet
      control={control}
      setValue={setValue}
      getValues={getValues}
      productOptions={allProductOptions || productOptions}
      expenseOptions={expenseOptions}
      rebateOptions={rebateOptions}
      exchangeRate={exchangeRate}
      docCurrencyCode={selectedCurrencyCode}
      baseCurrencyCode={baseCurrencyCode}
      readOnly={isLocked}
    />
    </>
  );
};

export default Step2Items;
