// ** Reducers Imports
import navbar from "./navbar";
import layout from "./layout";
import authentication from "./authentication";
import todo from "@src/views/apps/todo/store";
import chat from "@src/views/apps/chat/store";
import users from "@src/views/apps/user/store";
import email from "@src/views/apps/email/store";
import calendar from "@src/views/apps/calendar/store";
import dataTables from "@src/views/tables/data-tables/store";
import permissions from "@src/views/apps/roles-permissions/store";

import auth from "@src/views/auth/store";
import register from "@src/views/auth/register/store/"
import company from "@src/views/auth/profile/editCompany/store"
import user from "@src/views/users/store";
import role from "@src/views/roles/store";

import location from "@src/views/locations/store";
import category from "@src/views/categories/store";
import product from "@src/views/products/store";
import vendor from "@src/views/vendors/store";
import customer from "@src/views/customers/store";
import lead from "@src/views/leads/store";
import rfq from "@src/views/rfq/store";
import leadActivity from "@src/views/leads/activityStore";
import rebate from "@src/views/rebates/store";
import expense from "@src/views/expenses/store";
import currency from "@src/views/currencies/store";
import uom from "@src/views/uom/store";
import country from "@src/views/countries/store";
// `states`, not `state` — `state` is the conventional name for the whole redux
// tree in every selector in this app, and shadowing it invites bugs.
import states from "@src/views/states/store";
import city from "@src/views/cities/store";
import priceList from "@src/views/price-list/store";
import quotation from "@src/views/quotations/store";
import pfi from "@src/views/pfi/store";
import purchaseOrder from "@src/views/purchase-orders/store";
import poVendor from "@src/views/po-vendors/store";
import grn from "@src/views/grn/store";
import debitNote from "@src/views/debit-notes/store";
import inventory from "@src/views/inventory/store";
import invoice from "@src/views/invoices/store";
import trackingEvent from "@src/views/tracking/store";
import employee from "@src/views/employees/store";

import setting from "@src/views/settings/store";
import deleteImage from "@src/views/deleteImageStore";
import globalloading from "@src/views/loadingstore"
import plan from "@src/views/plans/store";
import tools from "@src/views/tools/store";
// import tenantTools from "@src/views/tenant-tools/store"; // Multi-tenant removed
import toolSchedules from "@src/views/tool-schedule/store";
import subscription from "@src/views/subscription/store/";
import payment from "@src/views/payment/store/";
import locationContext from "./locationContext"
import creatorContext from "./creatorContext"
import DashboardWidgets from '../views/dashboard/store/index'

import holidayCalendar from "../views/holiday-calendar/store"
import document from "../views/documents/store"
import contract from "../views/contracts/store"
import leave from "../views/leave/store"
import attendance from "../views/attendance/store"
import shift from "../views/shift/store"
import companyLookup from "../views/company-lookups/store"
import companySettings from "../views/company-settings/store"
import notificationSettings from "../views/company-settings/notificationStore"
import messageLog from "../views/message-logs/store"
import payroll from "../views/payroll/store"
import trackingLogs from '@src/views/tracking-logs/store'
import productProfitability from "@src/views/reports/product-profitability/store"
import hsnSummary from "@src/views/reports/hsn-summary/store"
import adjustmentNote from "@src/views/adjustment-notes/store"
// import complianceBuilder from "../views/governance/compliancebuilder/store/index"
// import frameWorkStore from "../views/governance/compliancebuilder/frameWorkStore/index"
// import projects from "../views/governance/resilienceIndex/projects/store/index"
// import history from "../views/governance/resilienceIndex/projects/projectHistoryStore/index"
// import comments from "../views/governance/resilienceIndex/projects/commentStore/index"
// import attachments from "../views/governance/resilienceIndex/projects/attachmentStore/index"
// import helpdesk from "../views/governance/helpdeskticket/store/index"
// import netswitchThreatIntel from "../views/dashboard/netswitchThreatIntels/store/index"
// import configurationAssessment from "../views/dashboard/configurationAssessments/store/index"
// import eventLogs from "../views/event/store"


const rootReducer = {
  authentication,
  auth,
  register,
  user,
  company,
  trackingLogs,
  role,
  todo,
  chat,
  email,
  users,
  navbar,
  layout,
  payment,
  subscription,
  calendar,
  dataTables,
  permissions,
  location,
  category,
  product,
  vendor,
  customer,
  lead,
  rfq,
  leadActivity,
  rebate,
  expense,
  currency,
  uom,
  country,
  states,
  city,
  priceList,
  quotation,
  pfi,
  purchaseOrder,
  poVendor,
  grn,
  debitNote,
  inventory,
  invoice,
  trackingEvent,
  locationContext,
  creatorContext,
  employee,
  setting,
  deleteImage,
  globalloading,
  plan,
  tools,
  // tenantTools, // Multi-tenant removed
  toolSchedules,
  DashboardWidgets,
  holidayCalendar,
  document,
  contract,
  leave,
  attendance,
  shift,
  companyLookup,
  companySettings,
  notificationSettings,
  messageLog,
  payroll,
  productProfitability,
  hsnSummary,
  adjustmentNote,
};

export default rootReducer;
