// ** React Imports
import { lazy } from 'react';

// ** Constant
import {
  appsRoot,
  holidayCalendarModuleSlug,
  categoriesModuleSlug,
  productsModuleSlug,
  vendorsModuleSlug,
  customersModuleSlug,
  leadsModuleSlug,
  rebatesModuleSlug,
  expensesModuleSlug,
  currenciesModuleSlug,
  priceListModuleSlug,
  quotationsModuleSlug,
  pfiModuleSlug,
  purchaseOrdersModuleSlug,
  poVendorsModuleSlug,
  invoicesModuleSlug,
  shippingModuleSlug,
  trackingModuleSlug,
  inventoryModuleSlug,
} from '@constant/defaultValues';

// **
const Dashboard = lazy(() => import('@src/views/dashboard'));
const Profile = lazy(() => import('@src/views/auth/profile'));
const Settings = lazy(() => import('@src/views/settings'));
const UserList = lazy(() => import('@src/views/users'));
const AgentList = lazy(() => import(`@src/views/agent`))
const AddUser = lazy(() => import('@src/views/users/add'));
const LocationList = lazy(() => import('@src/views/locations'));
const AddLocation = lazy(() => import('@src/views/locations/add'));
const EditLocation = lazy(() => import('@src/views/locations/add'));
const CategoryList = lazy(() => import('@src/views/categories'));
const AddCategory = lazy(() => import('@src/views/categories/add'));
const EditCategory = lazy(() => import('@src/views/categories/add'));
const ProductList = lazy(() => import('@src/views/products'));
const AddProduct = lazy(() => import('@src/views/products/add'));
const EditProduct = lazy(() => import('@src/views/products/add'));
const VendorList = lazy(() => import('@src/views/vendors'));
const AddVendor = lazy(() => import('@src/views/vendors/add'));
const EditVendor = lazy(() => import('@src/views/vendors/add'));
const ViewVendor = lazy(() => import('@src/views/vendors/view'));
const CustomerList = lazy(() => import('@src/views/customers'));
const AddCustomer = lazy(() => import('@src/views/customers/add'));
const EditCustomer = lazy(() => import('@src/views/customers/add'));
const ViewCustomer = lazy(() => import('@src/views/customers/view'));
const LeadList = lazy(() => import('@src/views/leads'));
const AddLead = lazy(() => import('@src/views/leads/add'));
const EditLead = lazy(() => import('@src/views/leads/add'));
const ViewLead = lazy(() => import('@src/views/leads/view'));
const RebateList = lazy(() => import('@src/views/rebates'));
const AddRebate = lazy(() => import('@src/views/rebates/add'));
const EditRebate = lazy(() => import('@src/views/rebates/add'));
const ExpenseList = lazy(() => import('@src/views/expenses'));
const AddExpense = lazy(() => import('@src/views/expenses/add'));
const EditExpense = lazy(() => import('@src/views/expenses/add'));
const CurrencyList = lazy(() => import('@src/views/currencies'));
const AddCurrency = lazy(() => import('@src/views/currencies/add'));
const EditCurrency = lazy(() => import('@src/views/currencies/add'));
const PriceList = lazy(() => import('@src/views/price-list'));
const AddPriceList = lazy(() => import('@src/views/price-list/add'));
const EditPriceList = lazy(() => import('@src/views/price-list/add'));
const QuotationList = lazy(() => import('@src/views/quotations'));
const AddQuotation = lazy(() => import('@src/views/quotations/add'));
const EditQuotation = lazy(() => import('@src/views/quotations/add'));
const ViewQuotation = lazy(() => import('@src/views/quotations/view'));
const QuotationPublicView = lazy(() => import('@src/views/quotations/public'));
const PfiList = lazy(() => import('@src/views/pfi'));
const AddPfi = lazy(() => import('@src/views/pfi/add'));
const EditPfi = lazy(() => import('@src/views/pfi/add'));
const ViewPfi = lazy(() => import('@src/views/pfi/view'));
const PfiPublicView = lazy(() => import('@src/views/pfi/public'));
const PurchaseOrderList = lazy(() => import('@src/views/purchase-orders'));
const AddPurchaseOrder = lazy(() => import('@src/views/purchase-orders/add'));
const EditPurchaseOrder = lazy(() => import('@src/views/purchase-orders/add'));
const ViewPurchaseOrder = lazy(() => import('@src/views/purchase-orders/view'));
const PurchaseOrderPublicView = lazy(() => import('@src/views/purchase-orders/public'));
const PoVendorList = lazy(() => import('@src/views/po-vendors'));
const ViewPoVendor = lazy(() => import('@src/views/po-vendors/view'));
const InventoryList = lazy(() => import('@src/views/inventory'));
const InvoiceList = lazy(() => import('@src/views/invoices'));
const ViewInvoice = lazy(() => import('@src/views/invoices/view'));
const AddInvoice = lazy(() => import('@src/views/invoices/add'));
const EditInvoice = lazy(() => import('@src/views/invoices/add'));
const ShippingList = lazy(() => import('@src/views/shipping'));
const ViewShipping = lazy(() => import('@src/views/shipping/view'));
const AddShipping = lazy(() => import('@src/views/shipping/add'));
const EditShipping = lazy(() => import('@src/views/shipping/add'));
const TrackingFeed = lazy(() => import('@src/views/tracking'));
const EmployeeList = lazy(() => import('@src/views/employees'));
const EditEmployee = lazy(() => import('@src/views/employees/edit'));
const ViewEmployee = lazy(() => import('@src/views/employees/view'));
const EditUser = lazy(() => import('@src/views/users/edit'));
const UpgradeSubscription = lazy(() => import('@src/views/auth/profile/editCompany/UpgradeSubscription'));
const UpgradePayment = lazy(() => import('@src/views/auth/profile/editCompany/UpgradePayment'));
const EditSubscriptionTools = lazy(() => import('@src/views/auth/profile/editCompany/EditSubscriptionTools'));
const EditAgent = lazy(() => import('@src/views/agent/add/'));
const UpgradeCompanyPlan = lazy(() => import('@src/views/company/upgradePlan'));
const UpgradeCompanyPayment = lazy(() => import('@src/views/company/upgradePayment'));

const AddAgent = lazy(() => import('@src/views/agent/add'));
const Company = lazy(() => import('@src/views/company/CompanyTable'));
const EditCompany = lazy(() => import('@src/views/company/add/tabView/'));
const ViewCompany = lazy(() => import('@src/views/company/index'));

const DiscountList = lazy(() => import('@src/views/discount'));
const AddDiscount = lazy(() => import('@src/views/discount/add'));
const EditDiscount = lazy(() => import('@src/views/discount/add'));
const BulkGenerateDiscount = lazy(() => import('@src/views/discount/bulk-generate'));

const RoleList = lazy(() => import('@src/views/roles'));
const ModulePermission = lazy(
  () => import('@src/views/roles/modulePermission'),
);

const PlanList = lazy(() => import('@src/views/plans'));
const AddPlan = lazy(() => import('@src/views/plans/add'));
const EditPlan = lazy(() => import('@src/views/plans/add'));

const ToolsList = lazy(() => import('@src/views/tools'));
const AddTool = lazy(() => import('@src/views/tools/add'));
const EditTool = lazy(() => import('@src/views/tools/edit'));

const Subscription = lazy(() => import('@src/views/subscription/'));
const EditSubscription = lazy(() => import('@src/views/subscription/add/'));
const EditCompanyProfile = lazy(() => import('@src/views/auth/profile/tabView/'))

const AssessmentForms = lazy(() => import('@src/views/assessmentforms'))
const AddAssessmentForm = lazy(() => import('@src/views/assessmentforms/add'))
const AddAssessmentFormDetail = lazy(() => import('@src/views/assessmentforms/detail'))
const EditAssessmentForm = lazy(() => import('@src/views/assessmentforms/edit'))
const AddQuestion = lazy(() => import('@src/views/assessmentforms/questions/AddQuestion'))
const AssessmentReport = lazy(() => import('@src/views/assessmentforms/AssessmentReport'))
const AssessmentReportDetail = lazy(() => import('@src/views/assessmentforms/AssessmentReport/detail'))

const Payment = lazy(() => import('@src/views/payment/'));

// HRM - Holiday Calendar
const HolidayCalendarList = lazy(() => import('@src/views/holiday-calendar'));
const AddHolidayCalendar = lazy(() => import('@src/views/holiday-calendar/add'));

// HRM - Documents
const DocumentList = lazy(() => import('@src/views/documents'));
const DocumentForm = lazy(() => import('@src/views/documents/add'));

// HRM - Leave Management
const LeaveHome = lazy(() => import('@src/views/leave'));
const LeaveAdminView = lazy(() => import('@src/views/leave/admin'));
const LeaveRequestForm = lazy(() => import('@src/views/leave/request-form'));

// HRM - Contracts
const ContractList = lazy(() => import('@src/views/contracts'));
const ContractTemplateList = lazy(() => import('@src/views/contracts/templates'));
const ContractTemplateBuilder = lazy(() => import('@src/views/contracts/templates/add'));
const IssueContract = lazy(() => import('@src/views/contracts/issue'));
const ContractView = lazy(() => import('@src/views/contracts/view'));
const ContractSign = lazy(() => import('@src/views/contracts/sign'));

// HRM - Attendance
const AttendancePage = lazy(() => import('@src/views/attendance'));
const AttendanceAdminPage = lazy(() => import('@src/views/attendance/admin'));

// HRM - Shift / Rota
const ShiftPage = lazy(() => import('@src/views/shift'));
const ShiftAdminPage = lazy(() => import('@src/views/shift/admin'));

// Company Settings
const CompanySettingsPage = lazy(() => import('@src/views/company-settings'));
const CompanySetupPage = lazy(() => import('@src/views/company-setup'));

// Home Office Compliance
const CompliancePage = lazy(() => import('@src/views/compliance'));

// Message Logs (Email / SMS / WhatsApp)
const MessageLogList = lazy(() => import('@src/views/message-logs'));

// Payroll
const PayScheduleList = lazy(() => import('@src/views/payroll/schedules'));
const PayElementList = lazy(() => import('@src/views/payroll/elements'));
const PayRunList = lazy(() => import('@src/views/payroll/runs'));
const PayRunDetail = lazy(() => import('@src/views/payroll/runs/detail'));
const MyPayslips = lazy(() => import('@src/views/payroll/my-payslips'));

// const EventLogList = lazy(() => import('@src/views/event'));
// const ViewEventLog = lazy(() => import('@src/views/event/details/'));

const AppRoutes = [
  // **
  {
    path: `${appsRoot}/dashboard`,
    element: <Dashboard />,
    meta: {
      className: '',
    },
  },
  {
    path: `${appsRoot}/company`,
    element: <Company />,
  },
  {
    path: `${appsRoot}/company/view/:id`,
    element: <ViewCompany />,
    meta: {
      permissionId: 'company',
      action: 'view',
    },
  },
  {
    path: `${appsRoot}/company/edit/:id`,
    element: <EditCompany />,
    meta: {
      permissionId: 'company',
      action: 'Edit',
    },
  },
  {
    path: `${appsRoot}/company/add`,
    element: <EditCompany />,
    meta: {
      permissionId: 'company',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/profile/edit/:id`,
    element: <EditCompanyProfile />,
    meta: {
      permissionId: '',
      action: 'Edit',
    },
  },
  {
    path: `${appsRoot}/profile`,
    element: <Profile />,
  },
  {
    path: `${appsRoot}/profile/subscription/upgrade`,
    element: <UpgradeSubscription />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/discount`,
    element: <DiscountList />,
    meta: {
      action: 'read',
    },
  },
  {
    path: `${appsRoot}/discounts/add`,
    element: <AddDiscount />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/discounts/bulk-generate`,
    element: <BulkGenerateDiscount />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/discounts/edit/:id`,
    element: <EditDiscount />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/profile/subscription/payment/upgrade`,
    element: <UpgradePayment />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/profile/subscription/edit/:subscriptionId`,
    element: <EditSubscriptionTools />,
    meta: {
      action: 'edit',
    },
  },

  {
    path: `${appsRoot}/company/plan/upgrade/:id`,
    element: <UpgradeCompanyPlan />,
    meta: {
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/company/payment/upgrade/:id`,
    element: <UpgradeCompanyPayment />,
    meta: {
      action: 'edit',
    },
  },

  {
    path: `${appsRoot}/settings`,
    element: <Settings />,
    meta: {
      permissionId: 'setting',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/users`,
    element: <UserList />,
    meta: {
      permissionId: 'user',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/users/add`,
    element: <AddUser />,
    meta: {
      permissionId: 'user',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/users/edit/:id`,
    element: <EditUser />,
    meta: {
      permissionId: 'user',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/agents`,
    element: <AgentList />,
    meta: {
      permissionId: 'agent',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/agents/edit/:id`,
    element: <EditAgent />,
    meta: {
      permissionId: 'agent',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/agents/add`,
    element: <AddAgent />,
    meta: {
      permissionId: 'user',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/locations`,
    element: <LocationList />,
    meta: {
      permissionId: 'location',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/locations/add`,
    element: <AddLocation />,
    meta: {
      permissionId: 'location',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/locations/edit/:id`,
    element: <EditLocation />,
    meta: {
      permissionId: 'location',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/categories`,
    element: <CategoryList />,
    meta: {
      permissionId: categoriesModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/categories/add`,
    element: <AddCategory />,
    meta: {
      permissionId: categoriesModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/categories/edit/:id`,
    element: <EditCategory />,
    meta: {
      permissionId: categoriesModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/products`,
    element: <ProductList />,
    meta: {
      permissionId: productsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/products/add`,
    element: <AddProduct />,
    meta: {
      permissionId: productsModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/products/edit/:id`,
    element: <EditProduct />,
    meta: {
      permissionId: productsModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/vendors`,
    element: <VendorList />,
    meta: {
      permissionId: vendorsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/vendors/add`,
    element: <AddVendor />,
    meta: {
      permissionId: vendorsModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/vendors/edit/:id`,
    element: <EditVendor />,
    meta: {
      permissionId: vendorsModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/vendors/view/:id`,
    element: <ViewVendor />,
    meta: {
      permissionId: vendorsModuleSlug,
      action: 'view',
    },
  },
  {
    path: `${appsRoot}/customers`,
    element: <CustomerList />,
    meta: {
      permissionId: customersModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/customers/add`,
    element: <AddCustomer />,
    meta: {
      permissionId: customersModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/customers/edit/:id`,
    element: <EditCustomer />,
    meta: {
      permissionId: customersModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/customers/view/:id`,
    element: <ViewCustomer />,
    meta: {
      permissionId: customersModuleSlug,
      action: 'view',
    },
  },
  {
    path: `${appsRoot}/leads`,
    element: <LeadList />,
    meta: {
      permissionId: leadsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/leads/add`,
    element: <AddLead />,
    meta: {
      permissionId: leadsModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/leads/edit/:id`,
    element: <EditLead />,
    meta: {
      permissionId: leadsModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/leads/view/:id`,
    element: <ViewLead />,
    meta: {
      permissionId: leadsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/rebates`,
    element: <RebateList />,
    meta: { permissionId: rebatesModuleSlug, action: 'list' },
  },
  {
    path: `${appsRoot}/rebates/add`,
    element: <AddRebate />,
    meta: { permissionId: rebatesModuleSlug, action: 'add' },
  },
  {
    path: `${appsRoot}/rebates/edit/:id`,
    element: <EditRebate />,
    meta: { permissionId: rebatesModuleSlug, action: 'edit' },
  },
  {
    path: `${appsRoot}/expenses`,
    element: <ExpenseList />,
    meta: { permissionId: expensesModuleSlug, action: 'list' },
  },
  {
    path: `${appsRoot}/expenses/add`,
    element: <AddExpense />,
    meta: { permissionId: expensesModuleSlug, action: 'add' },
  },
  {
    path: `${appsRoot}/expenses/edit/:id`,
    element: <EditExpense />,
    meta: { permissionId: expensesModuleSlug, action: 'edit' },
  },
  {
    path: `${appsRoot}/currencies`,
    element: <CurrencyList />,
    meta: {
      permissionId: currenciesModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/currencies/add`,
    element: <AddCurrency />,
    meta: {
      permissionId: currenciesModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/currencies/edit/:id`,
    element: <EditCurrency />,
    meta: {
      permissionId: currenciesModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/price-list`,
    element: <PriceList />,
    meta: {
      permissionId: priceListModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/price-list/add`,
    element: <AddPriceList />,
    meta: {
      permissionId: priceListModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/price-list/edit/:id`,
    element: <EditPriceList />,
    meta: {
      permissionId: priceListModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/quotations`,
    element: <QuotationList />,
    meta: {
      permissionId: quotationsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/quotations/add`,
    element: <AddQuotation />,
    meta: {
      permissionId: quotationsModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/quotations/edit/:id`,
    element: <EditQuotation />,
    meta: {
      permissionId: quotationsModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/quotations/view/:id`,
    element: <ViewQuotation />,
    meta: {
      permissionId: quotationsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/quotations/preview/:id`,
    element: <QuotationPublicView />,
    meta: {
      permissionId: quotationsModuleSlug,
      action: 'list',
      layout: 'blank',
    },
  },
  {
    path: '/q/:token',
    element: <QuotationPublicView />,
    meta: {
      publicRoute: true,
      layout: 'blank',
    },
  },
  {
    path: `${appsRoot}/pfi`,
    element: <PfiList />,
    meta: {
      permissionId: pfiModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/pfi/add`,
    element: <AddPfi />,
    meta: {
      permissionId: pfiModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/pfi/edit/:id`,
    element: <EditPfi />,
    meta: {
      permissionId: pfiModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/pfi/view/:id`,
    element: <ViewPfi />,
    meta: {
      permissionId: pfiModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/pfi/preview/:id`,
    element: <PfiPublicView />,
    meta: {
      permissionId: pfiModuleSlug,
      action: 'list',
      layout: 'blank',
    },
  },
  {
    path: '/p/:token',
    element: <PfiPublicView />,
    meta: {
      publicRoute: true,
      layout: 'blank',
    },
  },
  {
    path: '/po/:token',
    element: <PurchaseOrderPublicView />,
    meta: {
      publicRoute: true,
      layout: 'blank',
    },
  },
  {
    path: `${appsRoot}/purchase-orders`,
    element: <PurchaseOrderList />,
    meta: {
      permissionId: purchaseOrdersModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/purchase-orders/add`,
    element: <AddPurchaseOrder />,
    meta: {
      permissionId: purchaseOrdersModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/purchase-orders/edit/:id`,
    element: <EditPurchaseOrder />,
    meta: {
      permissionId: purchaseOrdersModuleSlug,
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/purchase-orders/view/:id`,
    element: <ViewPurchaseOrder />,
    meta: {
      permissionId: purchaseOrdersModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/purchase-orders/preview/:id`,
    element: <PurchaseOrderPublicView />,
    meta: {
      permissionId: purchaseOrdersModuleSlug,
      action: 'list',
      layout: 'blank',
    },
  },
  {
    path: `${appsRoot}/po-vendors`,
    element: <PoVendorList />,
    meta: {
      permissionId: poVendorsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/po-vendors/view/:id`,
    element: <ViewPoVendor />,
    meta: {
      permissionId: poVendorsModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/inventory`,
    element: <InventoryList />,
    meta: {
      permissionId: inventoryModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/invoices`,
    element: <InvoiceList />,
    meta: {
      permissionId: invoicesModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/invoices/view/:id`,
    element: <ViewInvoice />,
    meta: {
      permissionId: invoicesModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/invoices/add`,
    element: <AddInvoice />,
    meta: {
      permissionId: invoicesModuleSlug,
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/invoices/edit/:id`,
    element: <EditInvoice />,
    meta: {
      permissionId: invoicesModuleSlug,
      action: 'update',
    },
  },
  {
    path: `${appsRoot}/shipping`,
    element: <ShippingList />,
    meta: { permissionId: shippingModuleSlug, action: 'list' },
  },
  {
    path: `${appsRoot}/shipping/view/:id`,
    element: <ViewShipping />,
    meta: { permissionId: shippingModuleSlug, action: 'list' },
  },
  {
    path: `${appsRoot}/shipping/add`,
    element: <AddShipping />,
    meta: { permissionId: shippingModuleSlug, action: 'add' },
  },
  {
    path: `${appsRoot}/shipping/edit/:id`,
    element: <EditShipping />,
    meta: { permissionId: shippingModuleSlug, action: 'update' },
  },
  {
    path: `${appsRoot}/tracking`,
    element: <TrackingFeed />,
    meta: {
      permissionId: trackingModuleSlug,
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/employees`,
    element: <EmployeeList />,
    meta: {
      permissionId: 'employee',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/employees/add`,
    element: <EditEmployee />,
    meta: {
      permissionId: 'employee',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/employees/edit/:id`,
    element: <EditEmployee />,
    meta: {
      permissionId: 'employee',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/employees/view/:id`,
    element: <ViewEmployee />,
    meta: {
      permissionId: 'employee',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/roles`,
    element: <RoleList />,
    meta: {
      permissionId: 'role',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/roles/permission/:id`,
    element: <ModulePermission />,
    meta: {
      permissionId: 'role',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/subscription`,
    element: <Subscription />,
    meta: {
      permissionId: 'subscription',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/subscription/edit/:id`,
    element: <EditSubscription />,
    meta: {
      permissionId: 'subscription',
      action: 'edit',
    },
  },

  {
    path: `${appsRoot}/payment`,
    element: <Payment />,
    meta: {
      permissionId: 'payments',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/plans`,
    element: <PlanList />,
    meta: {
      permissionId: 'plans',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/plans/add`,
    element: <AddPlan />,
    meta: {
      permissionId: 'plans',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/plans/edit/:id`,
    element: <EditPlan />,
    meta: {
      permissionId: 'plans',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/tools`,
    element: <ToolsList />,
    meta: {
      permissionId: 'tools',
      action: 'list',
    },
  },
  {
    path: `${appsRoot}/tools/add`,
    element: <AddTool />,
    meta: {
      permissionId: 'tools',
      action: 'add',
    },
  },
  {
    path: `${appsRoot}/tools/edit/:id`,
    element: <EditTool />,
    meta: {
      permissionId: 'tools',
      action: 'edit',
    },
  },
  {
    path: `${appsRoot}/assessment-forms`,
    element: <AssessmentForms />,
    // meta: {
    //   permissionId: 'role',
    //   action: 'list',
    // },
  },
  {
    path: `${appsRoot}/assessment-forms/add`,
    element: <AddAssessmentForm />,
    // meta: {
    //   permissionId: 'role',
    //   action: 'list',
    // },
  },
  {
    path: `${appsRoot}/assessment-forms/edit/:id`,
    element: <EditAssessmentForm />,
  },
  {
    path: `${appsRoot}/assessment-forms/detail/:id`,
    element: <AddAssessmentFormDetail />,
    // meta: {
    //   permissionId: 'role',
    //   action: 'list',
    // },
  },
  // AddQuestion
  {
    path: `${appsRoot}/assessment-forms/questions/add`,
    element: <AddQuestion />,
  },
  {
    path: `${appsRoot}/assessment-forms/questions/edit/:questionId`,
    element: <AddQuestion />,
  },
  {
    path: `${appsRoot}/assessment-forms/assessment-reports/:id`,
    element: <AssessmentReport />,
    // meta: {
    //   permissionId: 'role',
    //   action: 'list',
    // },
  },
  {
    path: `${appsRoot}/assessment-forms/assessment-reports/detail/:id`,
    element: <AssessmentReportDetail />,
    // meta: {
    //   permissionId: 'role',
    //   action: 'list',
    // },
  },

  // HRM - Holiday Calendar
  {
    path: `${appsRoot}/holiday-calendar`,
    element: <HolidayCalendarList />,
    meta: {
      permissionId: holidayCalendarModuleSlug,
      action: 'list',
      toolSlug: 'hrm-holiday-calendar',
    },
  },
  {
    path: `${appsRoot}/holiday-calendar/add`,
    element: <AddHolidayCalendar />,
    meta: {
      permissionId: holidayCalendarModuleSlug,
      action: 'add',
      toolSlug: 'hrm-holiday-calendar',
    },
  },
  {
    path: `${appsRoot}/holiday-calendar/edit/:id`,
    element: <AddHolidayCalendar />,
    meta: {
      permissionId: holidayCalendarModuleSlug,
      action: 'view',
      toolSlug: 'hrm-holiday-calendar',
    },
  },

  // HRM - Leave Management
  {
    path: `${appsRoot}/leave`,
    element: <LeaveHome />,
    meta: { permissionId: 'leave', action: 'list', toolSlug: 'hrm-leave' },
  },
  {
    path: `${appsRoot}/leave/request`,
    element: <LeaveRequestForm />,
    meta: { permissionId: 'leave', action: 'add', toolSlug: 'hrm-leave' },
  },
  {
    path: `${appsRoot}/leave/admin`,
    element: <LeaveAdminView />,
    meta: { permissionId: 'leave', action: 'list', toolSlug: 'hrm-leave' },
  },

  // HRM - Contracts
  {
    path: `${appsRoot}/contracts`,
    element: <ContractList />,
    meta: { permissionId: 'contract', action: 'list', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/issue`,
    element: <IssueContract />,
    meta: { permissionId: 'contract', action: 'add', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/view/:id`,
    element: <ContractView />,
    meta: { permissionId: 'contract', action: 'read', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/sign/:id`,
    element: <ContractSign />,
    meta: { permissionId: 'contract', action: 'view', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/templates`,
    element: <ContractTemplateList />,
    meta: { permissionId: 'contract', action: 'list', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/templates/add`,
    element: <ContractTemplateBuilder />,
    meta: { permissionId: 'contract', action: 'add', toolSlug: 'hrm-contracts' },
  },
  {
    path: `${appsRoot}/contracts/templates/edit/:id`,
    element: <ContractTemplateBuilder />,
    meta: { permissionId: 'contract', action: 'view', toolSlug: 'hrm-contracts' },
  },

  // HRM - Documents
  {
    path: `${appsRoot}/documents`,
    element: <DocumentList />,
    meta: { permissionId: 'document', action: 'list', toolSlug: 'hrm-documents' },
  },
  {
    path: `${appsRoot}/documents/upload`,
    element: <DocumentForm />,
    meta: { permissionId: 'document', action: 'add', toolSlug: 'hrm-documents' },
  },
  {
    path: `${appsRoot}/documents/view/:id`,
    element: <DocumentForm />,
    meta: { permissionId: 'document', action: 'read', toolSlug: 'hrm-documents' },
  },
  {
    path: `${appsRoot}/documents/edit/:id`,
    element: <DocumentForm />,
    meta: { permissionId: 'document', action: 'view', toolSlug: 'hrm-documents' },
  },

  // Attendance - Employee
  {
    path: `${appsRoot}/attendance`,
    element: <AttendancePage />,
    meta: { permissionId: 'attendance', action: 'list', toolSlug: 'hrm-attendance' },
  },
  // Attendance - Admin
  {
    path: `${appsRoot}/attendance/admin`,
    element: <AttendanceAdminPage />,
    meta: { permissionId: 'attendance', action: 'admin', toolSlug: 'hrm-attendance' },
  },

  // Shift - Employee
  {
    path: `${appsRoot}/shifts`,
    element: <ShiftPage />,
    meta: { permissionId: 'shift', action: 'list', toolSlug: 'hrm-shift-rota' },
  },
  // Shift - Admin
  {
    path: `${appsRoot}/shifts/admin`,
    element: <ShiftAdminPage />,
    meta: { permissionId: 'shift', action: 'admin', toolSlug: 'hrm-shift-rota' },
  },

  // Company Settings
  {
    path: `${appsRoot}/company-settings`,
    element: <CompanySettingsPage />,
  },
  {
    path: `${appsRoot}/setup`,
    element: <CompanySetupPage />,
  },

  // Home Office Compliance
  {
    path: `${appsRoot}/compliance`,
    element: <CompliancePage />,
    meta: { permissionId: 'compliance', action: 'list', toolSlug: 'hrm-compliance' },
  },

  // Message Logs (single component, three routes - channel inferred from URL path)
  {
    path: `${appsRoot}/logs/email`,
    element: <MessageLogList />,
  },
  {
    path: `${appsRoot}/logs/sms`,
    element: <MessageLogList />,
  },
  {
    path: `${appsRoot}/logs/whatsapp`,
    element: <MessageLogList />,
  },

  // Payroll
  {
    path: `${appsRoot}/payroll/schedules`,
    element: <PayScheduleList />,
    meta: { toolSlug: 'hrm-payroll' },
  },
  {
    path: `${appsRoot}/payroll/elements`,
    element: <PayElementList />,
    meta: { toolSlug: 'hrm-payroll' },
  },
  {
    path: `${appsRoot}/payroll/runs`,
    element: <PayRunList />,
    meta: { toolSlug: 'hrm-payroll' },
  },
  {
    path: `${appsRoot}/payroll/runs/:id`,
    element: <PayRunDetail />,
    meta: { toolSlug: 'hrm-payroll' },
  },
  {
    path: `${appsRoot}/my-payslips`,
    element: <MyPayslips />,
    meta: { toolSlug: 'hrm-payroll' },
  },
];

export default AppRoutes;
