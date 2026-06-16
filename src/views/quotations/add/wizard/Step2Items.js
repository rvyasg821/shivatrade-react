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

  const isForeign =
    !!selectedCurrencyCode &&
    !!baseCurrencyCode &&
    selectedCurrencyCode.toUpperCase() !== baseCurrencyCode.toUpperCase();

  return (
    <>
      {/* Costs are captured in the home currency (vendor/price-list data is
          INR); the customer-facing total converts to the quote currency. */}
      {isForeign && (
        <div className="alert alert-light border d-flex align-items-center gap-1 py-50 px-1 mb-1 small">
          <span className="badge bg-light-secondary">{baseCurrencyCode}</span>
          <span className="text-muted">
            {t("Costs are entered in")} {baseCurrencyCode} ({t("home currency")}).{" "}
            {t("Customer total converts to")}{" "}
            <span className="fw-semibold">{selectedCurrencyCode}</span>{" "}
            {t("at")} {exchangeRate} {t("(shown on the quotation & PDF).")}
          </span>
        </div>
      )}
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
