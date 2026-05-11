// ── Step 2: Line Items (PFI) ─────────────────────────────────────────
import { useFormContext } from "react-hook-form";

import SalesDocLineItems from "@src/views/_shared/sales-doc/SalesDocLineItems";
import { initPfiLineItem } from "@constant/reduxConstant";

const Step2Items = ({
  isLocked,
  productOptions,
  expenseOptions,
  rebateOptions,
}) => {
  const { control, setValue } = useFormContext();
  return (
    <SalesDocLineItems
      control={control}
      setValue={setValue}
      productOptions={productOptions}
      initLineItem={initPfiLineItem}
      rebateOptions={rebateOptions}
      expenseOptions={expenseOptions}
      readOnly={isLocked}
    />
  );
};

export default Step2Items;
