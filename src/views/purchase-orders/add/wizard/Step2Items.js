// ── Step 2: Line Items (PO) ─────────────────────────────────────────
// PO is multi-vendor at line level. Vendor is chosen per line inside
// the line-item modal: product first → vendor list populated from
// price-list/by-product (cheapest pre-selected) → save.

import { useTranslation } from "react-i18next";

import PoLineItems from "@src/views/_shared/sales-doc/PoLineItems";
import { initPurchaseOrderLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  vendorOptions = [],
  vendorProductOptions,
  productById,
  priceByProduct,
  intraState,
  hasExistingPovs,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {hasExistingPovs && (
        <div className="alert alert-warning small mb-2">
          {t(
            "POVs have been dispatched against this PO — line items cannot be changed."
          )}
        </div>
      )}
      <PoLineItems
        isLocked={isLocked || hasExistingPovs}
        vendorProductOptions={vendorProductOptions}
        productById={productById}
        priceByProduct={priceByProduct}
        intraState={intraState}
        initLineItem={initPurchaseOrderLineItem}
        vendorOptions={vendorOptions}
      />
    </>
  );
};

export default Step2Items;
