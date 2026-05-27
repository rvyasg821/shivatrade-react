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

import country from "@src/views/countries/store";
import states from "@src/views/states/store";
import city from "@src/views/cities/store";
import location from "@src/views/locations/store";
import category from "@src/views/categories/store";
import product from "@src/views/products/store";
import vendor from "@src/views/vendors/store";
import customer from "@src/views/customers/store";
import lead from "@src/views/leads/store";
import leadActivity from "@src/views/leads/activityStore";
import rebate from "@src/views/rebates/store";
import expense from "@src/views/expenses/store";
import currency from "@src/views/currencies/store";
import priceList from "@src/views/price-list/store";
import quotation from "@src/views/quotations/store";
import pfi from "@src/views/pfi/store";
import purchaseOrder from "@src/views/purchase-orders/store";
import poVendor from "@src/views/po-vendors/store";
import invoice from "@src/views/invoices/store";
import shipping from "@src/views/shipping/store";
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
import DashboardWidgets from '../views/dashboard/store/index'

import AssessmentForms from "../views/assessmentforms/store/index";
import SectionAssessment from "../views/assessmentforms/add/questionStore/index"
import questionAssessment from "../views/assessmentforms/questions/store/index"
import assessmentReport from "../views/assessmentforms/userAssest/store/index"
import questionAnswer from "../views/assessmentforms/userAssest/step3/store/index"
import answerSlice from "../views/assessmentforms/userAssest/reportAnswerStore/index"
import holidayCalendar from "../views/holiday-calendar/store"
import document from "../views/documents/store"
import contract from "../views/contracts/store"
import leave from "../views/leave/store"
import attendance from "../views/attendance/store"
import shift from "../views/shift/store"
import compliance from "../views/compliance/store"
import companyLookup from "../views/company-lookups/store"
import companySettings from "../views/company-settings/store"
import notificationSettings from "../views/company-settings/notificationStore"
import messageLog from "../views/message-logs/store"
import payroll from "../views/payroll/store"
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
  country,
  states,
  city,
  location,
  category,
  product,
  vendor,
  customer,
  lead,
  leadActivity,
  rebate,
  expense,
  currency,
  priceList,
  quotation,
  pfi,
  purchaseOrder,
  poVendor,
  invoice,
  shipping,
  trackingEvent,
  locationContext,
  employee,
  setting,
  deleteImage,
  globalloading,
  plan,
  tools,
  // tenantTools, // Multi-tenant removed
  toolSchedules,
  DashboardWidgets,
  AssessmentForms,
  SectionAssessment,
  questionAssessment,
  assessmentReport,
  questionAnswer,
  answerSlice,
  holidayCalendar,
  document,
  contract,
  leave,
  attendance,
  shift,
  compliance,
  companyLookup,
  companySettings,
  notificationSettings,
  messageLog,
  payroll,
};

export default rootReducer;
