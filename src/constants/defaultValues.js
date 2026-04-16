import { SubscriptIcon } from "lucide-react";

const root = "/";
const appsRoot = "/apps";

/* Local storage variables */
const storageUserKeyName = "userData";
const storageTokenKeyName = "accessToken";
const storageRefreshTokenKeyName = "refreshToken";
const storageCustomerToken = "customerToken";
const storageContractorToken = "contractorToken";
/* /Local storage variables */

const appBaseName = process.env?.REACT_APP_BASENAME || "";
const hostRestApiPrefix = process.env?.REACT_APP_REST_API_URL_PREFIX || "";
const hostRestApiUrl = process.env?.REACT_APP_REST_API_URL_ENDPOINT || "";
const assessmentReportPdfUrl = process.env?.REACT_APP_BACKEND_REST_API_URL_PDF || ""

// Tax Configuration
const taxLabel = process.env?.REACT_APP_TAX_LABEL || "VAT";
const taxValue = parseFloat(process.env?.REACT_APP_TAX_VALUE || "10");

const ADMIN_ROLE_TYPE = "admin";
const EMPLOYEE_ROLE_TYPE = "employee";
const CLIENT_ROLE_TYPE = "client";
const SALES_ROLE_TYPE = "sales";
const PROJECT_ROLE_TYPE = "project";

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

const ENUM_TENANT_TOOLS_STATUS = {
  1: 'Active',
  2: 'Inactive',
}

const ENUM_TENANT_TOOLS_STATUS_COLOR = {
  1: 'light-success',
  2: 'light-warning',
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
  // { label: "1", value: 1 },
  // { label: "2", value: 2 },
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

// const roleBypassType = ["super", "portal"];
const roleBypassType = ["superadmin"];

const customerManagementGroupSlug = "subscription management";
const customersModuleSlug = "customers";
const contractorsModuleSlug = "contractors";
const companiesModuleSlug = "companies";

const catalogGroupSlug = "catalog";
const servicesModuleSlug = "services";
const addOnServicesModuleSlug = "add-on-services";
const priceListsModuleSlug = "price-list";
const questionFormModuleSlug = "booking-forms";
const AreasModuleSlug = "areas";
const plansModuleSlug = "plan";
const subscriptionModuleSlug = "subscription"
const discountModuleSlug = "discounts"
const paymentModuleSlug = "module"
const systemGroupSlug = "system";
const smsTemplatesModuleSlug = "sms-templates";
const emailTemplatesModuleSlug = "email-templates";

const masterGroupSlug = "master";
const subscriptionsModuleSlug = "subscriptions"
const assessmentFormsSlug = "assessment";

const rolesModuleSlug = "roles";
const usersModuleSlug = "users";
const agentModuleSlug = "agents"; // System-level sales agents
const locationsModuleSlug = "location"; // Company locations
const employeesModuleSlug = "employee"; // Location employees

const countriesModuleSlug = "countries";
const statesModuleSlug = "counties/states";
const citiesModuleSlug = "cities";
const productsGroupSlug = "products";
const productsModuleSlug = "products";
const companyModuleSlug = "company"

const toolsModuleSlug = "tools";
const governanceSlug = "governance";
const compliancebuilderSlug = "compliance-builder";
const resilienceIndexSlug = "resilience-index";
const helpdeskTicketSlug = "helpdesk-ticket";
const riskAssessmentSlug = "risk-assessment";
// const tenantToolsModuleSlug = "tenant_tools";
// const toolScheduleModuleSlug = "tools_schedule";

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

// HRM Tool Slugs (used for subscription plan gating — must match seeded tool slugs)
const hrmLeaveToolSlug = "hrm-leave";
const hrmAttendanceToolSlug = "hrm-attendance";
const hrmShiftToolSlug = "hrm-shift-rota";
const hrmContractsToolSlug = "hrm-contracts";
const hrmDocumentsToolSlug = "hrm-documents";
const hrmHolidayCalendarToolSlug = "hrm-holiday-calendar";
const hrmComplianceToolSlug = "hrm-compliance";

const customerBookingListingFrontSlug = "customer-booking-listing-front"
const perticularcontractorbooking = "perticular-contractor-booking"

const rolePermissionName = {
  [customersModuleSlug]: "Customers",
  [contractorsModuleSlug]: "Contractors",
  [companiesModuleSlug]: "Companies",
  [companyModuleSlug]: "Company",


  [servicesModuleSlug]: "Services",
  [addOnServicesModuleSlug]: "Add On Services",
  [priceListsModuleSlug]: "Price Lists",
  [questionFormModuleSlug]: "Booking Forms",
  [plansModuleSlug]: "Plan",
  [subscriptionModuleSlug]: "Subscription",
  [discountModuleSlug]: "Discount",
  [paymentModuleSlug]: "Payment",

  [AreasModuleSlug]: "Areas",

  [smsTemplatesModuleSlug]: "Sms Templates",
  [emailTemplatesModuleSlug]: "Email Templates",

  [rolesModuleSlug]: "Roles",
  [usersModuleSlug]: "Users",
  [agentModuleSlug]: "Agents",
  [locationsModuleSlug]: "Locations",
  [employeesModuleSlug]: "Employees",
  [countriesModuleSlug]: "Countries",
  [statesModuleSlug]: "Counties / States",
  [citiesModuleSlug]: "Cities",

  [customerBookingListingFrontSlug]: "Customer Booking",
  [perticularcontractorbooking]: "Contractor Booking",

  [productsModuleSlug]: "Products",
  [toolsModuleSlug]: "Tools",
  [assessmentFormsSlug]: "Assessment Forms",
  [governanceSlug]: "Governance",
  [compliancebuilderSlug]: "Compliance Builder",
  [resilienceIndexSlug]: "Resilience Index",
  [riskAssessmentSlug]: "Risk Assessment",
  [helpdeskTicketSlug]: "Helpdesk Ticket",

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

  // [tenantToolsModuleSlug]: "Tenant Tools",
  // [toolScheduleModuleSlug]: "Tool Schedule"
};

const rolePermissionJson = [
  {
    group: customersModuleSlug,
    module_slug: customersModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  // {
  //   group: customerSubscriptionModuleSlug,
  //   module_slug: customerSubscriptionModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },
  // {
  //   group: subscriptionModuleSlug,
  //   module_slug: subscriptionModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },
  {
    group: contractorsModuleSlug,
    module_slug: contractorsModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: companiesModuleSlug,
    module_slug: companiesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
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
    group: catalogGroupSlug,
    module_slug: servicesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: catalogGroupSlug,
    module_slug: addOnServicesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: catalogGroupSlug,
    module_slug: priceListsModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: catalogGroupSlug,
    module_slug: questionFormModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: catalogGroupSlug,
    module_slug: AreasModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  // {
  //   group: catalogGroupSlug,
  //   module_slug: plansModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },
  //  {
  //   group: catalogGroupSlug,
  //   module_slug: subscriptionModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },
  //   {
  //   group: catalogGroupSlug,
  //   module_slug: paymentModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },

  {
    group: systemGroupSlug,
    module_slug: smsTemplatesModuleSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: systemGroupSlug,
    module_slug: emailTemplatesModuleSlug,
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
  {
    group: assessmentFormsSlug,
    module_slug: assessmentFormsSlug,
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
  // {
  //   group: masterGroupSlug,
  //   module_slug: zipcodesModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },

  {
    group: customerBookingListingFrontSlug,
    module_slug: customerBookingListingFrontSlug,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: perticularcontractorbooking,
    module_slug: perticularcontractorbooking,
    can_all: false,
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  },
  {
    group: productsGroupSlug,
    module_slug: productsModuleSlug,
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
  // {
  //   group: toolsModuleSlug,
  //   module_slug: tenantToolsModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // },
  // {
  //   group: toolsModuleSlug,
  //   module_slug: toolScheduleModuleSlug,
  //   can_all: false,
  //   can_read: false,
  //   can_create: false,
  //   can_update: false,
  //   can_delete: false,
  // }
];

export {
  root,
  appsRoot,
  storageUserKeyName,
  storageTokenKeyName,

  appBaseName,
  hostRestApiUrl,
  hostRestApiPrefix,
  taxLabel,
  taxValue,

  ADMIN_ROLE_TYPE,
  EMPLOYEE_ROLE_TYPE,
  CLIENT_ROLE_TYPE,
  SALES_ROLE_TYPE,
  PROJECT_ROLE_TYPE,

  ENUM_USER_STATUS,
  ENUM_USER_STATUS_COLOR,
  ENUM_PLAN_STATUS,
  ENUM_PLAN_STATUS_COLOR,
  ENUM_TOOLS_STATUS,
  ENUM_TOOLS_STATUS_COLOR,
  ENUM_TENANT_TOOLS_STATUS,
  ENUM_TENANT_TOOLS_STATUS_COLOR,
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
  systemGroupSlug,
  catalogGroupSlug,
  paymentModuleSlug,
  companyModuleSlug,
  rolesModuleSlug,
  usersModuleSlug,
  agentModuleSlug,
  locationsModuleSlug,
  employeesModuleSlug,
  customersModuleSlug,
  countriesModuleSlug,
  statesModuleSlug,
  citiesModuleSlug,
  companiesModuleSlug,
  smsTemplatesModuleSlug,
  emailTemplatesModuleSlug,
  servicesModuleSlug,
  addOnServicesModuleSlug,
  priceListsModuleSlug,
  rolePermissionName,
  rolePermissionJson,
  plansModuleSlug,
  discountModuleSlug,
  subscriptionModuleSlug,
  AreasModuleSlug,
  customerManagementGroupSlug,
  contractorsModuleSlug,
  questionFormModuleSlug,
  storageCustomerToken,
  storageContractorToken,
  customerBookingListingFrontSlug,
  perticularcontractorbooking,
  storageRefreshTokenKeyName,
  productsGroupSlug,
  productsModuleSlug,
  toolsModuleSlug,
  governanceSlug,
  compliancebuilderSlug,
  resilienceIndexSlug,
  helpdeskTicketSlug,
  riskAssessmentSlug,
  // tenantToolsModuleSlug,
  // toolScheduleModuleSlug
  assessmentFormsSlug,
  assessmentReportPdfUrl,
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
};
