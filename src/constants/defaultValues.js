const root = "/";
const appsRoot = "/apps";

/* Local storage variables */
const storageUserKeyName = "userData";
const storageTokenKeyName = "accessToken";
const storageRefreshTokenKeyName = "refreshToken";
/* /Local storage variables */

const appBaseName = process.env?.REACT_APP_BASENAME || "";
const hostRestApiPrefix = process.env?.REACT_APP_REST_API_URL_PREFIX || "";
const hostRestApiUrl = process.env?.REACT_APP_REST_API_URL_ENDPOINT || "";
const backendFilesBaseUrl = process.env?.REACT_APP_BACKEND_REST_API_URL_PDF || ""

// Tax Configuration
const taxLabel = process.env?.REACT_APP_TAX_LABEL || "VAT";
const taxValue = parseFloat(process.env?.REACT_APP_TAX_VALUE || "10");

const ADMIN_ROLE_TYPE = "admin";

const ENUM_USER_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'InActive',
  BLOCKED: 'Blocked',
}

const ENUM_USER_STATUS_COLOR = {
  ACTIVE: 'light-success',
  INACTIVE: 'light-warning',
  BLOCKED: 'light-danger',
}

const ENUM_PLAN_STATUS = {
  1: 'Active',
  0: 'Inactive',
}

const ENUM_PLAN_STATUS_COLOR = {
  1: 'light-success',
  0: 'light-warning',
}

const ENUM_TOOLS_STATUS_COLOR = {
  1: 'light-success',
  2: 'light-warning',
}

const ENUM_DURATION_TYPE = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  TRIAL: 'Trial',
  LIFETIME: 'Lifetime',
}

const ENUM_TOOLS_STATUS = {
  1: 'Active',
  2: 'Inactive',
}

const ENUM_TOOL_SCHEDULE_STATUS = {
  1: 'Active',
  2: 'Inactive',
}

const ENUM_TOOL_SCHEDULE_STATUS_COLOR = {
  1: 'light-success',
  2: 'light-warning',
}

const DURATION_TYPE_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'LIFETIME', label: 'Lifetime' },
]

/* Loader color */
const loaderColor = "primary";

/* Used for datatable display entries */
const defaultPerPageRow = 10;
const perPageRowItems = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

// Phone Input country wise
const onlyCountries = ["gb", "us", "fr"];
const defaultCountry = "in";
const countryCodeEditable = false;
const disableCountryDropdown = false;

const roleBypassType = ["superadmin"];

const masterGroupSlug = "master";
const subscriptionsModuleSlug = "subscriptions"

const rolesModuleSlug = "roles";
const usersModuleSlug = "users";
const currenciesModuleSlug = "currencies";
// Must match the backend permission slug in `modules.permissions.ts`.
const uomModuleSlug = "uom";

// Catalogue
const catalogueGroupSlug = "catalogue";
const categoriesModuleSlug = "categories";
const productsModuleSlug = "products";
const priceListModuleSlug = "price-list";

// Parties
const vendorsModuleSlug = "vendors";
const customersModuleSlug = "customers";
const leadsModuleSlug = "leads";

// Sales
const salesGroupSlug = "sales";
const rfqModuleSlug = "rfq";
const quotationsModuleSlug = "quotations";
const pfiModuleSlug = "pfi";

// Purchase
const purchaseGroupSlug = "purchase";
const purchaseOrdersModuleSlug = "purchase-orders";
const poVendorsModuleSlug = "po-vendors";
const trackingModuleSlug = "tracking";
// SaaS platform-owner activity log (ERP tracking system). Distinct from
// `trackingModuleSlug`, which is the POV shipment event timeline.
const trackingLogsModuleSlug = "tracking-logs";
const inventoryModuleSlug = "inventory";

// Warehouse
const warehouseGroupSlug = "warehouse";
const grnModuleSlug = "grn";
const nonComplianceModuleSlug = "non-compliance";
const containerStuffingModuleSlug = "container-stuffing";

// Finance
const financeGroupSlug = "finance";
const invoicesModuleSlug = "invoices";
const shippingModuleSlug = "shipping";
const expensesModuleSlug = "expenses";
const rebatesModuleSlug = "rebates";
const agentModuleSlug = "agents"; // System-level sales agents
const locationsModuleSlug = "location"; // Company locations
const employeesModuleSlug = "employee"; // Location employees

const countriesModuleSlug = "countries";
// Must match the backend permission slug in `modules.permissions.ts` — the nav
// and the route both look the role's permissions up by this exact key. It used
// to read "counties/states", which matched nothing on the backend.
const statesModuleSlug = "states";
const citiesModuleSlug = "cities";
const companyModuleSlug = "company"

const toolsModuleSlug = "tools";

// Subscription slugs (used under subscriptionsModuleSlug group)
const plansModuleSlug = "plan";
const subscriptionModuleSlug = "subscription"
const discountModuleSlug = "discounts"
const paymentModuleSlug = "module"

// HRM Module Slugs (used for role permissions)
const hrmGroupSlug = "hrm";
const holidayCalendarModuleSlug = "holiday_calendar";
const documentModuleSlug = "document";
const contractModuleSlug = "contract";
const leaveModuleSlug = "leave";
const attendanceModuleSlug = "attendance";
const shiftModuleSlug = "shift";
const complianceHrmModuleSlug = "compliance";

// Message Logs (under Master)
const logsGroupSlug = "logs";
const emailLogsModuleSlug = "email-logs";
const smsLogsModuleSlug = "sms-logs";
const whatsappLogsModuleSlug = "whatsapp-logs";

// Payroll
const payrollGroupSlug = "payroll";
const paySchedulesModuleSlug = "pay-schedules";
const payElementsModuleSlug = "pay-elements";
const payRunsModuleSlug = "pay-runs";
const myPayslipsModuleSlug = "my-payslips";
const hrmPayrollToolSlug = "hrm-payroll";

// HRM Tool Slugs (used for subscription plan gating - must match seeded tool slugs)
const hrmLeaveToolSlug = "hrm-leave";
const hrmAttendanceToolSlug = "hrm-attendance";
const hrmShiftToolSlug = "hrm-shift-rota";
const hrmContractsToolSlug = "hrm-contracts";
const hrmDocumentsToolSlug = "hrm-documents";
const hrmHolidayCalendarToolSlug = "hrm-holiday-calendar";
const hrmComplianceToolSlug = "hrm-compliance";

const rolePermissionName = {
  [companyModuleSlug]: "Company",

  [plansModuleSlug]: "Plan",
  [subscriptionModuleSlug]: "Subscription",
  [discountModuleSlug]: "Discount",
  [paymentModuleSlug]: "Payment",

  [rolesModuleSlug]: "Roles",
  [usersModuleSlug]: "Users",
  [currenciesModuleSlug]: "Exchange Rates",
  [uomModuleSlug]: "UOM",

  // Catalogue
  [categoriesModuleSlug]: "Categories",
  [productsModuleSlug]: "Products",
  [priceListModuleSlug]: "Price List",

  // Parties
  [vendorsModuleSlug]: "Vendors",
  [customersModuleSlug]: "Customers",
  [leadsModuleSlug]: "Leads",
  [rfqModuleSlug]: "RFQ",

  // Sales
  [quotationsModuleSlug]: "Quotations",
  [pfiModuleSlug]: "PFI",

  // Purchase
  [purchaseOrdersModuleSlug]: "Sales Orders",
  [poVendorsModuleSlug]: "PO Vendors",
  [trackingModuleSlug]: "Tracking",
  [trackingLogsModuleSlug]: "Activity Log",
  [inventoryModuleSlug]: "Inventory",

  // Warehouse
  [grnModuleSlug]: "GRN",
  [nonComplianceModuleSlug]: "Non-Compliance",
  [containerStuffingModuleSlug]: "Container Stuffing",

  // Finance
  [invoicesModuleSlug]: "Invoices",
  [shippingModuleSlug]: "Shipping",
  [expensesModuleSlug]: "Expenses",
  [rebatesModuleSlug]: "Rebates",

  [agentModuleSlug]: "Agents",
  [locationsModuleSlug]: "Locations",
  [employeesModuleSlug]: "Employees",
  [countriesModuleSlug]: "Countries",
  [statesModuleSlug]: "States",
  [citiesModuleSlug]: "Cities",

  [toolsModuleSlug]: "Tools",

  // HRM Modules
  [holidayCalendarModuleSlug]: "Holiday Calendar",
  [documentModuleSlug]: "Document Management",
  [contractModuleSlug]: "Contract Management",
  [leaveModuleSlug]: "Leave Management",
  [attendanceModuleSlug]: "Attendance Management",
  [shiftModuleSlug]: "Shift Management",
  [complianceHrmModuleSlug]: "Compliance Management",

  // Message Logs
  [logsGroupSlug]: "Logs",
  [emailLogsModuleSlug]: "Email Logs",
  [smsLogsModuleSlug]: "SMS Logs",
  [whatsappLogsModuleSlug]: "WhatsApp Logs",

  // Payroll
  [payrollGroupSlug]: "Payroll",
  [paySchedulesModuleSlug]: "Pay Schedules",
  [payElementsModuleSlug]: "Pay Elements",
  [payRunsModuleSlug]: "Pay Runs",
  [myPayslipsModuleSlug]: "My Payslips",
};

const rolePermissionJson = [
  {
    group: companyModuleSlug,
    module_slug: companyModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: subscriptionsModuleSlug,
    module_slug: plansModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: subscriptionsModuleSlug,
    module_slug: discountModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: subscriptionsModuleSlug,
    module_slug: subscriptionModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: subscriptionsModuleSlug,
    module_slug: paymentModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: rolesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: usersModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: agentModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: locationsModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: employeesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: countriesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: statesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: masterGroupSlug,
    module_slug: citiesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  // HRM Modules
  {
    group: hrmGroupSlug,
    module_slug: holidayCalendarModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: documentModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: contractModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: leaveModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: attendanceModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: shiftModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: hrmGroupSlug,
    module_slug: complianceHrmModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: toolsModuleSlug,
    module_slug: toolsModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
];

// ── System role names (must match BE ENUM_SYSTEM_ROLE values exactly) ──
const SYSTEM_ROLE = {
  ADMIN: "Admin",                // Platform owner (DB stores name "Admin")
  SUPER_ADMIN: "Super Admin",    // Display alias sometimes seen in UI
  COMPANY_ADMIN: "Company Admin",
  LOCATION_ADMIN: "Location Admin",
  EMPLOYEE: "Employee",
  AGENT: "Agent",
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
};

/**
 * Returns true when the current auth user is Admin / Super Admin /
 * Company Admin - roles that bypass per-module permission checks
 * across the app. Pass `authUserItem` (state.auth.authUserItem).
 * Safe for nullish input.
 */
const isAdminUser = (authUserItem) => {
  const name = authUserItem?.role?.name;
  return (
    name === SYSTEM_ROLE.ADMIN ||
    name === SYSTEM_ROLE.SUPER_ADMIN ||
    name === SYSTEM_ROLE.COMPANY_ADMIN ||
    !!authUserItem?.isSystemUser
  );
};

export {
  root,
  appsRoot,
  storageUserKeyName,
  storageTokenKeyName,

  appBaseName,
  hostRestApiUrl,
  hostRestApiPrefix,
  backendFilesBaseUrl,
  taxLabel,
  taxValue,

  ADMIN_ROLE_TYPE,

  ENUM_USER_STATUS,
  ENUM_USER_STATUS_COLOR,
  ENUM_PLAN_STATUS,
  ENUM_PLAN_STATUS_COLOR,
  ENUM_TOOLS_STATUS,
  ENUM_TOOLS_STATUS_COLOR,
  ENUM_TOOL_SCHEDULE_STATUS,
  ENUM_TOOL_SCHEDULE_STATUS_COLOR,
  ENUM_DURATION_TYPE,
  DURATION_TYPE_OPTIONS,

  loaderColor,
  defaultPerPageRow,
  perPageRowItems,
  onlyCountries,
  defaultCountry,
  countryCodeEditable,
  disableCountryDropdown,
  roleBypassType,
  masterGroupSlug,
  subscriptionsModuleSlug,
  paymentModuleSlug,
  companyModuleSlug,
  rolesModuleSlug,
  usersModuleSlug,
  currenciesModuleSlug,
  uomModuleSlug,
  // Catalogue
  catalogueGroupSlug,
  categoriesModuleSlug,
  productsModuleSlug,
  priceListModuleSlug,
  // Parties
  vendorsModuleSlug,
  customersModuleSlug,
  leadsModuleSlug,
  rfqModuleSlug,
  // Sales
  salesGroupSlug,
  quotationsModuleSlug,
  pfiModuleSlug,
  // Purchase
  purchaseGroupSlug,
  purchaseOrdersModuleSlug,
  poVendorsModuleSlug,
  trackingModuleSlug,
  trackingLogsModuleSlug,
  inventoryModuleSlug,
  // Warehouse
  warehouseGroupSlug,
  grnModuleSlug,
  nonComplianceModuleSlug,
  containerStuffingModuleSlug,
  // Finance
  financeGroupSlug,
  invoicesModuleSlug,
  shippingModuleSlug,
  expensesModuleSlug,
  rebatesModuleSlug,
  
  agentModuleSlug,
  locationsModuleSlug,
  employeesModuleSlug,
  countriesModuleSlug,
  statesModuleSlug,
  citiesModuleSlug,
  rolePermissionName,
  rolePermissionJson,
  plansModuleSlug,
  discountModuleSlug,
  subscriptionModuleSlug,
  storageRefreshTokenKeyName,
  toolsModuleSlug,
  // HRM Module Slugs
  hrmGroupSlug,
  holidayCalendarModuleSlug,
  documentModuleSlug,
  contractModuleSlug,
  leaveModuleSlug,
  attendanceModuleSlug,
  shiftModuleSlug,
  complianceHrmModuleSlug,
  // HRM Tool Slugs (subscription plan gating)
  hrmLeaveToolSlug,
  hrmAttendanceToolSlug,
  hrmShiftToolSlug,
  hrmContractsToolSlug,
  hrmDocumentsToolSlug,
  hrmHolidayCalendarToolSlug,
  hrmComplianceToolSlug,
  // Message Logs
  logsGroupSlug,
  emailLogsModuleSlug,
  smsLogsModuleSlug,
  whatsappLogsModuleSlug,
  // Payroll
  payrollGroupSlug,
  paySchedulesModuleSlug,
  payElementsModuleSlug,
  payRunsModuleSlug,
  myPayslipsModuleSlug,
  hrmPayrollToolSlug,
  // System role helpers
  SYSTEM_ROLE,
  isAdminUser,
};
