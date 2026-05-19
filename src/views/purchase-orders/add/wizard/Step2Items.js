// ── Step 2: Line Items (PO) ─────────────────────────────────────────
// Thin wrapper around the shared `PoLineItems` component. The actual
// table + Add/Edit/Delete modal lives in
// `views/_shared/sales-doc/PoLineItems.js` — single source of truth
// for PO line-item UX.

import PoLineItems from "@src/views/_shared/sales-doc/PoLineItems";
import { initPurchaseOrderLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  vendorProductOptions,
  productById,
  priceByProduct,
  intraState,
}) => {
  return (
    <PoLineItems
      isLocked={isLocked}
      vendorProductOptions={vendorProductOptions}
      productById={productById}
      priceByProduct={priceByProduct}
      intraState={intraState}
      initLineItem={initPurchaseOrderLineItem}
    />
  );
};

export default Step2Items;
