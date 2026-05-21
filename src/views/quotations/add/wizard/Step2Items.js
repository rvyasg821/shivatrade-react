// ── Step 2: Line Items ───────────────────────────────────────────────
// Line items table/modal. The Product picker (search + browse-all) lives
// inside the modal - no step-level category filter.

import { useFormContext } from "react-hook-form";

import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initQuotationLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  productOptions,
  allProductOptions,
  expenseOptions,
  rebateOptions,
  selectedCurrencyCode,
  baseCurrencyCode,
  exchangeRate,
}) => {
  const { control, setValue } = useFormContext();

  return (
    <SalesDocLineItems
      control={control}
      setValue={setValue}
      productOptions={productOptions}
      allProductOptions={allProductOptions}
      initLineItem={initQuotationLineItem}
      rebateOptions={rebateOptions}
      expenseOptions={expenseOptions}
      currencyCode={selectedCurrencyCode}
      baseCurrencyCode={baseCurrencyCode}
      exchangeRate={exchangeRate}
      readOnly={isLocked}
      tableLayout="detailed"
    />
  );
};

export default Step2Items;
