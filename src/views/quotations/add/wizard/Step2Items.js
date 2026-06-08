// ── Step 2: Line Items ───────────────────────────────────────────────
// Line items table/modal. The Product picker (search + browse-all) lives
// inside the modal - no step-level category filter.

import { useFormContext } from "react-hook-form";
import { Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";

import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initQuotationLineItem } from "@constant/reduxConstant";

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
  const docNumber = getValues?.("quotation_no") || "";

  return (
    <>
      {pricingLoading && (
        <div className="d-flex align-items-center gap-1 mb-1 text-muted small">
          <Spinner size="sm" />{" "}
          {t("Auto-filling the best current price per line…")}
        </div>
      )}
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
      displayInBase
      docType="quotation"
      docNumber={docNumber}
      hideGst
      showExportFields
    />
    </>
  );
};

export default Step2Items;
