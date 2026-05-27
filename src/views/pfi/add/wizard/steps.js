import { Users, Package, Truck, CheckCircle } from "react-feather";

import Step1Customer from "./Step1Customer";
import Step2Items from "./Step2Items";
import StepShipping from "./StepShipping";
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
    key: "shipping",
    label: "Shipping & Packing",
    icon: Truck,
    fields: [
      "consignee_name",
      "consignee_address",
      "port_of_loading",
      "port_of_discharge",
      "final_destination",
      "country_of_origin",
      "country_of_final_destination",
      "mode_of_shipment",
      "container_details",
      "est_shipment_date",
      "est_delivery_date",
      "packing_marks",
      "packing_type",
      "container_used",
      "container_no",
      "seal_no",
      "container_load_type",
      "validity_days",
      "payment_terms_text",
      "declaration_text",
      "bank_account_id",
    ],
    Component: StepShipping,
    canEnter: (form) => (form.getValues("lines") || []).length > 0,
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