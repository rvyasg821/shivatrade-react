// ── Step 2: Line Items (Sales Order) ─────────────────────────────────
// Identical line-item editor to the Quotation Step-2: the shared
// CostingWorksheet (spreadsheet-style grid with vendor picker, inline
// expense/rebate/margin popovers and a sticky totals footer).

import { useFormContext } from "react-hook-form";

import CostingWorksheet from "@src/views/_shared/sales-doc/CostingWorksheet";

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
  const { control, setValue, getValues } = useFormContext();

  return (
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
      docType="po"
    />
  );
};

export default Step2Items;
