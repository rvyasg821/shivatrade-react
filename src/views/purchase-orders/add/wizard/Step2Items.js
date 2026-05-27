// ── Step 2: Line Items (PO) ─────────────────────────────────────────
// Uses the same SalesDocLineItems component as PFI/Quotation — the line
// items table, add/edit popup (with rebate/expense/margin fields) and
// costing breakdown all match PFI's flow.

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initPurchaseOrderLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  productOptions,
  rebateOptions,
  expenseOptions,
  selectedCurrencyCode,
  baseCurrencyCode,
  exchangeRate,
  hasExistingPovs,
}) => {
  const { control, setValue, getValues } = useFormContext();
  const { t } = useTranslation();
  const docNumber = getValues?.("po_no") || "";

  return (
    <>
      {hasExistingPovs && (
        <div className="alert alert-warning small mb-2">
          {t(
            "Active POV(s) reference this PO's lines — line items cannot be changed. Cancel the POV(s) to edit."
          )}
        </div>
      )}
      <SalesDocLineItems
        control={control}
        setValue={setValue}
        productOptions={productOptions}
        allProductOptions={productOptions}
        initLineItem={initPurchaseOrderLineItem}
        rebateOptions={rebateOptions}
        expenseOptions={expenseOptions}
        currencyCode={selectedCurrencyCode}
        baseCurrencyCode={baseCurrencyCode}
        exchangeRate={exchangeRate}
        readOnly={isLocked || hasExistingPovs}
        tableLayout="detailed"
        displayInBase
        docType="po"
        docNumber={docNumber}
      />
    </>
  );
};

export default Step2Items;
