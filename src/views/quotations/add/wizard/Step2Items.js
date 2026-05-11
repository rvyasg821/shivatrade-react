// ── Step 2: Line Items ───────────────────────────────────────────────
// Category filter (narrows product picker) + line items table/modal.

import { useFormContext } from "react-hook-form";
import { Row, Col, Label } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initQuotationLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  productOptions,
  allProductOptions,
  categoryOptions,
  allCategoryOptions,
  expenseOptions,
  rebateOptions,
  categoryFilter,
  setCategoryFilter,
  showAllCategories,
  setShowAllCategories,
}) => {
  const { t } = useTranslation();
  const { control, setValue, watch } = useFormContext();
  const watchedLeadId = watch("lead_id");

  return (
    <>
      <Row>
        <Col md="12" className="mb-3">
          <Label className="form-label d-flex justify-content-between align-items-center">
            <span>{t("Interested Categories")}</span>
            {categoryFilter.length > 0 && (
              <small>
                <a
                  href="#"
                  className="text-decoration-none"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAllCategories((s) => !s);
                  }}
                >
                  {showAllCategories
                    ? t("Re-apply category filter")
                    : t("Show all categories")}
                </a>
              </small>
            )}
          </Label>
          <Select
            classNamePrefix="select"
            isMulti
            isClearable
            isDisabled={isLocked}
            options={categoryOptions}
            value={categoryOptions.filter((o) =>
              categoryFilter.includes(o.value)
            )}
            onChange={(opts) => {
              setCategoryFilter((opts || []).map((o) => o.value));
              setShowAllCategories(false);
            }}
            placeholder={t(
              "All categories (pick to narrow Product dropdown in line items)"
            )}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
          />
          {watchedLeadId &&
            categoryFilter.length > 0 &&
            !showAllCategories && (
              <small className="text-muted d-block mt-1">
                {t("Pre-filled from lead's interested categories.")}
              </small>
            )}
          {showAllCategories && (
            <small className="text-warning d-block mt-1">
              {t("Showing all products — category filter is bypassed.")}
            </small>
          )}
        </Col>
      </Row>

      <SalesDocLineItems
        control={control}
        setValue={setValue}
        productOptions={productOptions}
        allProductOptions={allProductOptions}
        categoryOptions={categoryOptions}
        allCategoryOptions={allCategoryOptions}
        defaultCategoryIds={showAllCategories ? [] : categoryFilter}
        initLineItem={initQuotationLineItem}
        rebateOptions={rebateOptions}
        expenseOptions={expenseOptions}
        readOnly={isLocked}
      />
    </>
  );
};

export default Step2Items;
