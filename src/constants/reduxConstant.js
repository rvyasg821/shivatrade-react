const initUserItem = {
  _id: "",
  first_name: "",
  last_name: "",
  firstName: "",
  middleName: "",
  lastName: "",
  name: "",
  email: "",
  password: "",
  role: null,
  mobile: "",
  country_code: null,
  gender: "MALE",
  dob: "",
  timezone: "",
  photo: "",
  profile_picture: "",
  status: "ACTIVE",
  // Employee fields
  employee_code: "",
  designation: "",
  department: "",
  employment_type: "",
  date_of_joining: "",
  date_of_birth: "",
  reporting_to: "",
  location_id: "",
  // Address fields
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
};

const initRoleItem = {
  _id: "",
  company_id: null,
  name: "",
  is_super: false,
  is_default: false,
  status: true,
};

const initSmsTempItem = { _id: "", name: "", slug: "", content: "", status: "Active", };

const initEmailTempItem = {
  _id: "",
  name: "",
  slug: "",
  subject: "",
  content: "",
  status: "Active",
};

const initServiceItem = {
  _id: "",
  name: "",
  slug: "",
  description: "",
  // total_minutes: {},
  isHavefrequancy: false,
  isHaveBedroom: false,
  isHaveArea: false,
  addOnServiceIds: [],
  image: null,
  icon: null,
  hourly_price: false,
  fixed_price: false,
  status: "Active",
  total_minutes: { hours: 0, minutes: 0 },
  isMembershipPlan: false,
  isMultipleLocation: false,
  isHaveBedroom: false,
  min_persons: 0,
};

const initCountryItem = {
  _id: "",
  name: "",
  currency_code: "",
  country_code: "",
  status: "Active",
};

const initStateItem = { _id: "", name: "", country_id: null, state_code: "", status: "Active", };
const initCityItem = {
  _id: "",
  name: "",
  country_id: null,
  state_id: null,
  city_code: "",
  status: "Active",
};
const initPlanItem = {
  _id: "",
  name: "",
  description: "",
  duration_type: "",
  duration: 1,
  recurring: false,
  status: 1,
  location_pricing: [
    {
      locations: 1,
      price: 0,
      special_price: null,
      special_price_duration: 0,
      platform_fee: 0
    }
  ],
  tools: [],
  features: [""],
  displayOrder: 1,
  metadata: {}
};

const initAddOnServiceItem = {
  _id: "",
  service_id: null,
  service_ids: [],
  name: "",
  slug: "",
  estimated_duration_minutes: "",
  description: "",
  duration: "",
  status: "Active",
  image: null,
  icon: null,
  fixed_price: false,
  hourly_price: false,
};

const initLocationItem = {
  _id: "",
  location_name: "",
  location_code: "",
  description: "",
  contact_name: "",
  email: "",
  mobile: "",
  country_code: null,
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
  timezone: "",
  currency: "",
  latitude: "",
  longitude: "",
  notification_email: "",
  cc_company_admin: false,
  notification_email_cc: "",
  is_active: true,
  is_default: false,
};

const initCategoryItem = {
  _id: "",
  name: "",
  description: "",
  parent_id: "",
  is_active: true,
  status: "active",
};

const initProductItem = {
  _id: "",
  code: "",
  name: "",
  category_id: "",
  description: "",
  specifications: "",
  packaging_details: "",
  quality_parameters: "",
  hsn_code: "",
  unit_of_measure: "",
  // Pricing
  selling_price: "",
  currency_id: "",
  // Identification (extra)
  part_no: "",
  // Logistics
  pack_size: "",
  net_weight_per_unit: "",
  gross_weight_per_unit: "",
  country_of_origin: "India",
  // Links
  rebates: [], // [{ rebate_id, pct? }]
  expenses: [], // [{ expense_id, value? }]
  is_active: true,
  status: "active",
};

const initVendorContactItem = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  country_code: null,
  is_primary: false,
};

const initVendorAddressItem = {
  type: "bill_from",
  label: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  postcode: "",
  gstin: "",
  is_default: false,
};

const initVendorBankAccountItem = {
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  ifsc: "",
  swift_code: "",
  iban: "",
  currency_id: "",
  branch_name: "",
  branch_address: "",
  account_type: "current",
  is_default: false,
  notes: "",
  is_active: true,
};

const initVendorItem = {
  _id: "",
  company_name: "",
  website: "",
  social_media: {
    linkedin: "",
    facebook: "",
    instagram: "",
    twitter: "",
    other: "",
  },
  category_ids: [],
  // Tax & Compliance
  gstin: "",
  pan: "",
  vendor_code: "",
  payment_terms: "",
  incoterms: "",
  is_active: true,
  status: "active",
  contacts: [{ ...initVendorContactItem, is_primary: true }],
  addresses: [{ ...initVendorAddressItem, type: "bill_from", is_default: true }],
  bank_accounts: [],
};

const initEmployeeItem = {
  _id: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  mobile: "",
  country_code: null,
  employee_code: "",
  location_id: "",
  designation: "",
  department: "",
  employment_type: "",
  date_of_joining: "",
  date_of_birth: "",
  gender: "MALE",
  status: "ACTIVE",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
  is_active: true,
  // Extended personal
  middle_name: "",
  marital_status: "",
  home_telephone: "",
  ni_number: "",
  nationality: "",
  // Salary & working hours
  annual_salary: null,
  hourly_rate: null,
  weekly_working_hours: null,
  working_hours_pattern: "",
  payroll_frequency: "",
  mode_of_transfer: "",
  sick_leaves_allowed: null,
  annual_leaves_allowed: null,
  // Bank
  bank_name: "",
  account_holder_name: "",
  sort_code: "",
  account_number: "",
  pension_opt_in: false,
  // Emergency contact
  kin_name: "",
  kin_relationship: "",
  kin_address: "",
  kin_postcode: "",
  kin_phone: "",
  kin_email: "",
  // Immigration
  passport_number: "",
  passport_country_of_issue: "",
  passport_expiry: "",
  visa_category: "",
  visa_valid_from: "",
  visa_valid_to: "",
  brp_number: "",
  cos_number: "",
  visa_restriction: "",
  share_code: "",
  // Right to work
  rtw_check_date: "",
  rtw_end_date: "",
  rtw_check_conducted: "",
  rtw_date_received: "",
  ecs_expiry_date: "",
  reporting_to: "",
};

const initCurrencyItem = {
  _id: "",
  code: "",
  name: "",
  symbol: "",
  is_active: true,
  is_default: false,
  status: "active",
};

const initPriceListItem = {
  _id: "",
  vendor_id: "",
  product_id: "",
  currency_id: "",
  unit_price: "",
  moq: 1,
  tax_pct: "",
  discount_pct: "",
  lead_time_days: "",
  effective_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  is_primary: false,
  notes: "",
};

const initQuotationLineItem = {
  product_id: "",
  vendor_id: "",
  description: "",
  qty: "",
  unit: "",
  unit_price: "",
  discount_pct: "0",
  tax_pct: "0",
};

const initQuotationExpenseItem = {
  expense_id: "",
  name: "",
  amount: "",
  is_overridden: false,
};

const initQuotationRebateItem = {
  rebate_id: "",
  name: "",
  amount: "",
  is_overridden: false,
};

const initQuotationItem = {
  _id: "",
  voucher_no: "",
  lead_id: "",
  customer_id: "",
  customer_address_id: "",
  quotation_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  currency_id: "",
  exchange_rate: "1",
  payment_terms: "",
  delivery_terms: "",
  delivery_location: "",
  notes_to_client: "",
  internal_notes: "",
  margin_pct: "0",
  status: "draft",
  // Server-side recomputed
  subtotal: "0",
  expenses_total: "0",
  rebates_total: "0",
  margin_amount: "0",
  tax_total: "0",
  grand_total: "0",
  lines: [],
  expenses: [],
  rebates: [],
};

// PFI shares the same line/expense/rebate row shapes as Quotation — the
// shared SalesDoc components accept these as props.
const initPfiLineItem = { ...initQuotationLineItem };
const initPfiExpenseItem = { ...initQuotationExpenseItem };
const initPfiRebateItem = { ...initQuotationRebateItem };

const initPfiItem = {
  _id: "",
  voucher_no: "",
  quotation_id: "",
  quotation_voucher_no: "",
  lead_id: "",
  customer_id: "",
  customer_address_id: "",
  pfi_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  currency_id: "",
  exchange_rate: "1",
  payment_terms: "",
  delivery_terms: "",
  delivery_location: "",
  notes_to_client: "",
  internal_notes: "",
  margin_pct: "0",
  status: "draft",
  subtotal: "0",
  expenses_total: "0",
  rebates_total: "0",
  margin_amount: "0",
  tax_total: "0",
  grand_total: "0",
  lines: [],
  expenses: [],
  rebates: [],
};

const initCustomerContactItem = {
  name: "",
  designation: "",
  email: "",
  phone: "",
  country_code: null,
  is_primary: false,
};

const initCustomerAddressItem = {
  type: "bill_to",
  label: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  postcode: "",
  gstin: "",
  iec: "",
  is_default: false,
};

const initCustomerItem = {
  _id: "",
  company_name: "",
  website: "",
  social_media: {
    linkedin: "",
    facebook: "",
    instagram: "",
    twitter: "",
    other: "",
  },
  // Tax & Compliance
  gstin: "",
  pan: "",
  iec: "",
  is_active: true,
  status: "active",
  contacts: [{ ...initCustomerContactItem, is_primary: true }],
  addresses: [{ ...initCustomerAddressItem, type: "bill_to", is_default: true }],
};

const initRebateItem = {
  _id: "",
  name: "",
  code: "",
  pct: "",
  applies_on: "total_after_expenses",
  description: "",
  is_active: true,
  status: "active",
};

const initExpenseItem = {
  _id: "",
  name: "",
  code: "",
  type: "percent",
  value: "",
  base: "value",
  description: "",
  is_active: true,
  status: "active",
};

const initLeadItem = {
  _id: "",
  customer_id: "",
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  country_code: null,
  source: "web",
  interested_categories: [],
  interested_products: [],
  expected_value: "",
  currency: "",
  assigned_to: "",
  notes: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  postcode: "",
  status: "new",
  is_active: true,
};

const initSettingSchedulesItem = {
  _id: "",
  name: "",
  slug: "",
  group_name: "",
  value: "",
  status: "",
};

const initSettingItem = {
  setting: "",
  schedules: [initSettingSchedulesItem],
};

const initCompanyItem = {
  _id: "",
  firstName: "",
  lastName: "",
  name: "",
  email: "",
  password: "",
  role: null,
  mobile: "",
  country_code: null,
  gender: "",
  dob: null,
  timezone: "",
  profile_picture: "",
  status: "Active",
  companyData: {
    name: "",
    email: "",
    password: "",
    logo: "",
    description: "",
    address: "",
  },
};

const initCompanyAddressItem = {
  type: "corporate",
  label: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "",
  postcode: "",
  gstin: "",
  is_default: false,
};

const initCompanyBankAccountItem = {
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  ifsc: "",
  swift_code: "",
  iban: "",
  ad_code: "",
  currency_id: "",
  branch_name: "",
  branch_address: "",
  account_type: "current",
  is_default: false,
  notes: "",
  is_active: true,
};
const initCompanyDataUpdate = {
  name: "",
  // email: "",
  // password: "",
  logo: "",
  description: "",
  address: "",
};
const initAreaItem = {
  _id: "",
  status: true,
  from: null,
  to: null,
};
const initPriceItem = {
  _id: "",
  fixed_price: 0,
  hourly_price: 0,
  addOnServiceId: "",
  locationId: "",
};

const initContractorItem = {
  _id: "",
  firstName: "",
  middleName: "",
  lastName: "",
  name: "",
  email: "",
  // password: "",
  role: null,
  mobile: "",
  country_code: null,
  gender: "",
  dob: null,
  timezone: "",
  profile_picture: "",
  countryId: null,
  locationIds: [],
  service_ids: [],
  add_on_service_ids: [],
  zipcode_ids: [],
  experience_years: 0,
  service_area_radius_km: 0,
  is_available: true,
  available_days: [],
  // average_rating
  address1: "",
  address2: "",
  status: true,
  stateId: null,
  cityId: null,
  status: "Active",
  // confirmPassword: ''
};

const initSubscriptionPlanItem = {
  _id: "",
  name: "",
  price: null,
  currency: "",
  planDuration: null,
  description: "",
  features: "",
  status: "Active",
  discountPercent: null,
};

const initPayment = {
  date: "",             // Payment date
  customer: "",         // Customer name
  email: "",            // Customer email
  plan: "",             // Plan name or ID
  mode: "",             // Payment mode (e.g., UPI, Card, NetBanking)
  transaction_id: "",   // Unique transaction ID
  final_price: "",      // Total price or final amount
  status: "",  
   gateway: "",         // e.g., success, pending, failed
};



const initCustomerSubscriptionItem = {
  _id: "",
  customerId: null,
  customerName: "",
  customerEmail: "",
  customerMobile: "",
  subscriptionPlanId: null,
  subscriptionPlanName: "",
  subscriptionPlanDuration: null,
  currency: "",
  startDate: null,
  endDate: null,
  startDateString: "",
  endDateString: "",
  amount: null,
  status: "Active",
};

const initialAvailableDays = [
  {
    day_name: "monday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "tuesday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "wednesday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "thursday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "friday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "saturday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
  {
    day_name: "sunday",
    available_from: "00:00",
    available_to: "00:00",
    day_off: false,
  },
];

const Step1Question = {
  title: "",
  service_id: null,
  status: true,
};
const initImageDelete = {
  filepath: "",
  module: "",
  docId: null,
  variableName: "",
};

const initToolItem = {
  _id: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

const initialBookingOrderVal = {
  zipcode: "", // String
  unique_client_id: "", // String
  customer_id: null, // ObjectId
  service_id: null, // ObjectId
  add_on_service_ids: [], // Array of ObjectIds
  locationId: null, // ObjectId
  frequencyId: null, // ObjectId
  bookingPricetype: "", // String
  homeCleanlinessId: null, // ObjectId
  areaId: null, // ObjectId
  // area_size_sqft: null, // Uncomment if needed
  pricing_details: [], // Array
  total_amount: null, // Number
  stepDetails: [], // Array of objects
  stepCount: null, // Number
  booking_start_date: "", // Date
  booking_end_date: "", // Date
  booking_start_time: "", // String
  booking_end_time: "", // String
  booking_date: "", // String
  totalBathroom: 0,
  totalBedroom: 0,
  vacuumUsedOf: { value: '', text: '' },
  specialNote: "",
  wayToGetIn: { value: '', text: '' },
  homeCleanlinessPrice: 0
};

const initialBookingVal = {
  bookingOrderId: "",
  customer_id: "",
  serviceProviderIds: [],
  addressId: "",
  booking_start_date: "",
  booking_end_date: "",
  booking_start_time: "",
  booking_end_time: "",
  booking_date: "",
};
export {
  initUserItem,
  initRoleItem,
  initSmsTempItem,
  initEmailTempItem,
  initServiceItem,
  initCountryItem,
  initStateItem,
  initCityItem,
  initAddOnServiceItem,
  initLocationItem,
  initCategoryItem,
  initProductItem,
  initVendorItem,
  initVendorContactItem,
  initVendorAddressItem,
  initVendorBankAccountItem,
  initEmployeeItem,
  initCustomerItem,
  initCustomerContactItem,
  initCustomerAddressItem,
  initLeadItem,
  initRebateItem,
  initExpenseItem,
  initCurrencyItem,
  initPriceListItem,
  initQuotationItem,
  initQuotationLineItem,
  initQuotationExpenseItem,
  initQuotationRebateItem,
  initPfiItem,
  initPfiLineItem,
  initPfiExpenseItem,
  initPfiRebateItem,
  initCompanyItem,
  initCompanyAddressItem,
  initCompanyBankAccountItem,
  initCompanyDataUpdate,
  initPlanItem,
  initSettingSchedulesItem,
  initSettingItem,
  initAreaItem,
  initPriceItem,
  initContractorItem,
  initSubscriptionPlanItem,
  initPayment,
  initCustomerSubscriptionItem,
  initialAvailableDays,
  initialBookingOrderVal,
  initialBookingVal,
  Step1Question,
  initImageDelete,
  initToolItem,
};
