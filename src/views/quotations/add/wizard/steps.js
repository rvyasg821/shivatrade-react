import { Users, Package, CheckCircle } from "react-feather";

import Step1Customer from "./Step1Customer";
import Step2Items from "./Step2Items";
import Step4Review from "./Step4Review";

/**
 * Step registry - fully data-driven.
 *
 * Each entry:
 *   key       - stable identifier (used in URL hash / analytics)
 *   label     - header text
 *   icon      - react-feather component
 *   fields    - RHF field paths to validate before allowing forward nav
 *   Component - step body
 *   isVisible - (form) => boolean   conditional steps (always-on if omitted)
 *   canEnter  - (form) => boolean   guard for jumping into this step
 */
export const STEPS = [
  {
    key: "customer",
    label: "Customer & Reference",
    icon: Users,
    fields: [
      "customer_id",
      "customer_address_id",
      "quotation_date",
      "valid_until",
      "currency_code",
      "exchange_rate",
      "payment_terms",
      "delivery_terms",
      "delivery_location",
      "lead_id",
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
    canEnter: (form) => {
      const v = form.getValues();
      return !!v.customer_id || !!v.lead_id;
    },
  },
  {
    key: "review",
    label: "Review & Save",
    icon: CheckCircle,
    fields: ["status", "notes_to_client", "internal_notes"],
    Component: Step4Review,
    canEnter: (form) => (form.getValues("lines") || []).length > 0,
  },
];
