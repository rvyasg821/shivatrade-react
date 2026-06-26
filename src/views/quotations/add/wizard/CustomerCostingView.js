// Step-3 customer-facing summary — wraps the shared CustomerCostingTable,
// feeding it the live form lines.

import { useWatch } from "react-hook-form";

import CustomerCostingTable from "@src/views/_shared/sales-doc/CustomerCostingTable";

const CustomerCostingView = ({
  control,
  productOptions = [],
  exchangeRate = 1,
  docCurrencyCode = "INR",
  baseCurrencyCode = "INR",
}) => {
  const lines = useWatch({ control, name: "lines" }) || [];
  return (
    <CustomerCostingTable
      lines={lines}
      productOptions={productOptions}
      exchangeRate={exchangeRate}
      docCurrencyCode={docCurrencyCode}
      baseCurrencyCode={baseCurrencyCode}
      showHsn
    />
  );
};

export default CustomerCostingView;
