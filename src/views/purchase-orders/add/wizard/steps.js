import { Users, Package, CheckCircle } from "react-feather";

import Step1Vendor from "./Step1Vendor";
import Step2Items from "./Step2Items";
import Step3Review from "./Step3Review";

export const STEPS = [
  {
    key: "customer",
    label: "Customer & Reference",
    icon: Users,
    fields: [
      "customer_id",
      "po_date",
      "expected_delivery_date",
      "delivery_address",
      "delivery_address_id",
      "payment_terms",
      "delivery_terms",
    ],
    Component: Step1Vendor,
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
    fields: ["status", "notes_to_vendor", "internal_notes"],
    Component: Step3Review,
    canEnter: (form) => (form.getValues("lines") || []).length > 0,
  },
];
