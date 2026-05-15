import { Users, Package, CheckCircle } from "react-feather";

import Step1Customer from "./Step1Customer";
import Step2Items from "./Step2Items";
import Step3Review from "./Step3Review";

export const STEPS = [
  {
    key: "customer",
    label: "Customer & Reference",
    icon: Users,
    fields: [
      "customer_id",
      "customer_address_id",
      "pfi_date",
      "valid_until",
      "currency_code",
      "exchange_rate",
      "payment_terms",
      "delivery_terms",
      "delivery_location",
    ],
    Component: Step1Customer,
    canEnter: () => true,
  },
  {
    key: "items",
    label: "Line Items",
    icon: Package,
    fields: ["lines"],
    Component: Step2Items,
    canEnter: (form) => !!form.getValues("customer_id"),
  },
  {
    key: "review",
    label: "Review & Save",
    icon: CheckCircle,
    fields: ["status", "notes_to_client", "internal_notes"],
    Component: Step3Review,
    canEnter: (form) => (form.getValues("lines") || []).length > 0,
  },
];
