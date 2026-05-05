// ** Icons Import
import {
  Home,
  Users,
  Shield,
  Layers,
  FileText,
  Grid,
  Tool,
  CreditCard,
  MapPin,
  UserCheck,
  Calendar,
  Clock,
  Book,
  CheckSquare,
  CheckCircle,
  Activity,
  Mail,
  MessageSquare,
  MessageCircle,
  DollarSign,
  PlayCircle,
  Sliders,
  Package,
  Truck,
  UserPlus,
  TrendingUp,
  ShoppingCart,
  Archive,
  Inbox,
  AlertTriangle,
  Box,
  Gift,
} from 'react-feather';
import { IoBusinessOutline } from 'react-icons/io5';
import { MdOutlineSupportAgent } from "react-icons/md";

// ** Constant
import {
  appsRoot,
  rolePermissionName,
  subscriptionsModuleSlug,
  masterGroupSlug,
  agentModuleSlug,
  paymentModuleSlug,
  subscriptionModuleSlug,
  usersModuleSlug,
  rolesModuleSlug,
  locationsModuleSlug,
  employeesModuleSlug,
  companyModuleSlug,
  plansModuleSlug,
  toolsModuleSlug,
  discountModuleSlug,
  currenciesModuleSlug,
  // Catalogue
  catalogueGroupSlug,
  categoriesModuleSlug,
  productsModuleSlug,
  priceListModuleSlug,
  // Parties
  vendorsModuleSlug,
  customersModuleSlug,
  leadsModuleSlug,
  // Sales
  salesGroupSlug,
  quotationsModuleSlug,
  pfiModuleSlug,
  // Purchase
  purchaseGroupSlug,
  purchaseOrdersModuleSlug,
  poVendorsModuleSlug,
  trackingModuleSlug,
  // Warehouse
  warehouseGroupSlug,
  grnModuleSlug,
  nonComplianceModuleSlug,
  containerStuffingModuleSlug,
  // Finance
  financeGroupSlug,
  invoicesModuleSlug,
  expensesModuleSlug,
  rebatesModuleSlug,
  // HRM Modules (permission slugs)
  hrmGroupSlug,
  holidayCalendarModuleSlug,
  documentModuleSlug,
  contractModuleSlug,
  leaveModuleSlug,
  attendanceModuleSlug,
  shiftModuleSlug,
  complianceHrmModuleSlug,
  // HRM Tool Slugs (subscription gating)
  hrmLeaveToolSlug,
  hrmAttendanceToolSlug,
  hrmShiftToolSlug,
  hrmContractsToolSlug,
  hrmDocumentsToolSlug,
  hrmHolidayCalendarToolSlug,
  hrmComplianceToolSlug,
  hrmPayrollToolSlug,
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
} from '@constant/defaultValues';

import { CiDiscount1 } from "react-icons/ci";

const navigationItems = [
  {
    id: 'dashboards',
    title: 'Dashboard',
    icon: <Home size={20} />,
    navLink: `${appsRoot}/dashboard`,
  },

  // Sales
  {
    id: salesGroupSlug,
    title: 'Sales',
    icon: <TrendingUp size={20} />,
    companyOnly: true,
    children: [
      {
        id: leadsModuleSlug,
        title: rolePermissionName[leadsModuleSlug],
        icon: <UserPlus size={20} />,
        navLink: `${appsRoot}/leads`,
        permissionId: leadsModuleSlug,
        resource: leadsModuleSlug,
        companyOnly: true,
      },
      {
        id: quotationsModuleSlug,
        title: rolePermissionName[quotationsModuleSlug],
        icon: <FileText size={20} />,
        navLink: `${appsRoot}/quotations`,
        permissionId: quotationsModuleSlug,
        resource: quotationsModuleSlug,
        companyOnly: true,
      },
      {
        id: pfiModuleSlug,
        title: rolePermissionName[pfiModuleSlug],
        icon: <FileText size={20} />,
        navLink: '',
        companyOnly: true,
      },
      {
        id: purchaseOrdersModuleSlug,
        title: rolePermissionName[purchaseOrdersModuleSlug],
        icon: <FileText size={20} />,
        navLink: '',
        companyOnly: true,
      },
    ],
  },

  // Parties (standalone)
  {
    id: customersModuleSlug,
    title: rolePermissionName[customersModuleSlug],
    icon: <UserCheck size={20} />,
    navLink: `${appsRoot}/customers`,
    permissionId: customersModuleSlug,
    resource: customersModuleSlug,
    companyOnly: true,
  },

  // Catalogue
  {
    id: catalogueGroupSlug,
    title: 'Catalogue',
    icon: <Book size={20} />,
    companyOnly: true,
    children: [
      {
        id: categoriesModuleSlug,
        title: rolePermissionName[categoriesModuleSlug],
        icon: <Layers size={20} />,
        navLink: `${appsRoot}/categories`,
        permissionId: categoriesModuleSlug,
        resource: categoriesModuleSlug,
        companyOnly: true,
      },
      {
        id: productsModuleSlug,
        title: rolePermissionName[productsModuleSlug],
        icon: <Package size={20} />,
        navLink: `${appsRoot}/products`,
        permissionId: productsModuleSlug,
        resource: productsModuleSlug,
        companyOnly: true,
      },
      {
        id: vendorsModuleSlug,
        title: rolePermissionName[vendorsModuleSlug],
        icon: <Truck size={20} />,
        navLink: `${appsRoot}/vendors`,
        permissionId: vendorsModuleSlug,
        resource: vendorsModuleSlug,
        companyOnly: true,
      },
      {
        id: priceListModuleSlug,
        title: rolePermissionName[priceListModuleSlug],
        icon: <FileText size={20} />,
        navLink: `${appsRoot}/price-list`,
        permissionId: priceListModuleSlug,
        resource: priceListModuleSlug,
        companyOnly: true,
      },
    ],
  },

  // Purchase
  {
    id: purchaseGroupSlug,
    title: 'Purchase',
    icon: <ShoppingCart size={20} />,
    companyOnly: true,
    children: [
      {
        id: poVendorsModuleSlug,
        title: rolePermissionName[poVendorsModuleSlug],
        icon: <CheckSquare size={20} />,
        navLink: '',
        companyOnly: true,
      },
      {
        id: trackingModuleSlug,
        title: rolePermissionName[trackingModuleSlug],
        icon: <MapPin size={20} />,
        navLink: '',
        companyOnly: true,
      },
    ],
  },

  // Warehouse
  // {
  //   id: warehouseGroupSlug,
  //   title: 'Warehouse',
  //   icon: <Archive size={20} />,
  //   companyOnly: true,
  //   children: [
  //     {
  //       id: grnModuleSlug,
  //       title: rolePermissionName[grnModuleSlug],
  //       icon: <Inbox size={20} />,
  //       navLink: '',
  //       companyOnly: true,
  //     },
  //     {
  //       id: nonComplianceModuleSlug,
  //       title: rolePermissionName[nonComplianceModuleSlug],
  //       icon: <AlertTriangle size={20} />,
  //       navLink: '',
  //       companyOnly: true,
  //     },
  //     {
  //       id: containerStuffingModuleSlug,
  //       title: rolePermissionName[containerStuffingModuleSlug],
  //       icon: <Box size={20} />,
  //       navLink: '',
  //       companyOnly: true,
  //     },
  //   ],
  // },

  // Finance
  {
    id: financeGroupSlug,
    title: 'Invoices',
    icon: <DollarSign size={20} />,
    companyOnly: true,
    children: [
      {
        id: invoicesModuleSlug,
        title: rolePermissionName[invoicesModuleSlug],
        icon: <FileText size={20} />,
        navLink: '',
        companyOnly: true,
      },
    ],
  },

  // Employees (standalone, above Master)
  {
    id: employeesModuleSlug,
    permissionId: 'employee',
    action: 'read',
    resource: 'employee',
    companyOnly: true,
    title: rolePermissionName[employeesModuleSlug],
    icon: <UserCheck size={20} />,
    navLink: `${appsRoot}/employees`,
  },
  // HRM modules as standalone items (no dropdown)
  {
    id: attendanceModuleSlug,
    permissionId: attendanceModuleSlug,
    action: 'read',
    resource: attendanceModuleSlug,
    slug: hrmAttendanceToolSlug,
    title: 'Attendance',
    icon: <Clock size={20} />,
    navLink: `${appsRoot}/attendance`,
    companyOnly: true,
    selfServiceOnly: true,
  },
  {
    id: leaveModuleSlug,
    permissionId: leaveModuleSlug,
    action: 'read',
    resource: leaveModuleSlug,
    slug: hrmLeaveToolSlug,
    title: 'Leaves',
    icon: <Calendar size={20} />,
    navLink: `${appsRoot}/leave`,
    companyOnly: true,
    selfServiceOnly: true,
  },
  // {
  //   id: shiftModuleSlug,
  //   permissionId: shiftModuleSlug,
  //   action: 'read',
  //   resource: shiftModuleSlug,
  //   slug: hrmShiftToolSlug,
  //   title: 'My Shifts',
  //   icon: <Grid size={20} />,
  //   navLink: `${appsRoot}/shifts`,
  //   companyOnly: true,
  //   employeeOnly: true,
  // },
  {
    id: holidayCalendarModuleSlug,
    permissionId: holidayCalendarModuleSlug,
    action: 'read',
    resource: holidayCalendarModuleSlug,
    slug: hrmHolidayCalendarToolSlug,
    title: 'Holiday Calendar',
    icon: <Calendar size={20} />,
    navLink: `${appsRoot}/holiday-calendar`,
    companyOnly: true,
    employeeOnly: true,
  },

  // ── Payroll (top-level sub-group with right-side flyout) ──
  // Only sub-group in the admin nav. The 3 children form a coherent unit
  // (Pay Runs is the main page, Schedules + Elements are setup pages).
  // On hover, the children panel slides in from the right (via custom.scss).
  {
    id: payrollGroupSlug,
    title: rolePermissionName[payrollGroupSlug],
    icon: <DollarSign size={20} />,
    slug: hrmPayrollToolSlug,
    companyOnly: true,
    adminLevel: true,
    children: [
      {
        id: payRunsModuleSlug,
        title: rolePermissionName[payRunsModuleSlug],
        icon: <PlayCircle size={20} />,
        navLink: `${appsRoot}/payroll/runs`,
        slug: hrmPayrollToolSlug,
        companyOnly: true,
        adminLevel: true,
      },
      {
        id: paySchedulesModuleSlug,
        title: rolePermissionName[paySchedulesModuleSlug],
        icon: <Calendar size={20} />,
        navLink: `${appsRoot}/payroll/schedules`,
        slug: hrmPayrollToolSlug,
        companyOnly: true,
        adminLevel: true,
      },
      {
        id: payElementsModuleSlug,
        title: rolePermissionName[payElementsModuleSlug],
        icon: <Sliders size={20} />,
        navLink: `${appsRoot}/payroll/elements`,
        slug: hrmPayrollToolSlug,
        companyOnly: true,
        adminLevel: true,
      },
    ],
  },

  // ── ADMIN-ONLY HRM tools (flat top-level, hidden from employees) ──
  // Employees see the HRM tools as a flat list above (with employeeOnly /
  // selfServiceOnly flags). Admins see them here at top level — no extra
  // click into a parent group. Payroll stays as a sub-group below because
  // it has its own settings sub-pages.
  {
    id: `${attendanceModuleSlug}_admin`,
    permissionId: attendanceModuleSlug,
    action: 'read',
    resource: attendanceModuleSlug,
    slug: hrmAttendanceToolSlug,
    title: 'Attendance',
    icon: <Clock size={20} />,
    navLink: `${appsRoot}/attendance/admin`,
    companyOnly: true,
    adminLevel: true,
  },
  {
    id: `${leaveModuleSlug}_admin`,
    permissionId: leaveModuleSlug,
    action: 'read',
    resource: leaveModuleSlug,
    slug: hrmLeaveToolSlug,
    title: 'Leave Requests',
    icon: <CheckCircle size={20} />,
    navLink: `${appsRoot}/leave/admin`,
    companyOnly: true,
    adminLevel: true,
  },
  // {
  //   id: `${shiftModuleSlug}_admin`,
  //   permissionId: shiftModuleSlug,
  //   action: 'read',
  //   resource: shiftModuleSlug,
  //   slug: hrmShiftToolSlug,
  //   title: 'Rota Builder',
  //   icon: <Grid size={20} />,
  //   navLink: `${appsRoot}/shifts/admin`,
  //   companyOnly: true,
  //   adminLevel: true,
  // },
  {
    id: `${holidayCalendarModuleSlug}_admin`,
    permissionId: holidayCalendarModuleSlug,
    action: 'read',
    resource: holidayCalendarModuleSlug,
    slug: hrmHolidayCalendarToolSlug,
    title: 'Holiday Calendar',
    icon: <Calendar size={20} />,
    navLink: `${appsRoot}/holiday-calendar`,
    companyOnly: true,
    adminLevel: true,
  },

  // Company (admin only)
  {
    id: 'companyModuleSlug',
    title: rolePermissionName[companyModuleSlug],
    permissionId: 'company',
    action: 'read',
    resource: 'company',
    icon: <IoBusinessOutline size={20} />,
    navLink: `${appsRoot}/company`,
    adminOnly: true,
  },

  // Subscriptions (admin only)
  {
    id: subscriptionsModuleSlug,
    title: 'Subscriptions',
    icon: <FileText size={20} />,
    children: [
      {
        id: plansModuleSlug,
        permissionId: 'plans',
        action: 'read',
        resource: 'plans',
        title: rolePermissionName[plansModuleSlug],
        icon: <Layers size={20} />,
        navLink: `${appsRoot}/plans`,
        adminOnly: true,
      },
      {
        id: discountModuleSlug,
        permissionId: 'discount',
        action: 'read',
        resource: 'discount',
        title: rolePermissionName[discountModuleSlug],
        icon: <CiDiscount1 size={20} />,
        navLink: `${appsRoot}/discount`,
        adminOnly: true,
      },
      {
        id: subscriptionModuleSlug,
        permissionId: 'subscription',
        action: 'read',
        resource: 'subscription',
        title: rolePermissionName[subscriptionModuleSlug],
        icon: <FileText size={20} />,
        navLink: `${appsRoot}/subscription`,
        adminOnly: true,
      },
      {
        id: paymentModuleSlug,
        permissionId: 'payments',
        action: 'read',
        resource: 'payments',
        title: rolePermissionName[paymentModuleSlug],
        icon: <CreditCard size={20} />,
        navLink: `${appsRoot}/payment`,
        adminOnly: true,
      },
    ],
  },

  // Tools
  {
    id: toolsModuleSlug,
    permissionId: 'tools',
    action: 'read',
    resource: 'tools',
    title: rolePermissionName[toolsModuleSlug],
    icon: <Tool size={20} />,
    navLink: `${appsRoot}/tools`,
    adminLevel: true,
  },

  // Master
  {
    id: masterGroupSlug,
    title: 'Master',
    icon: <Grid size={20} />,
    children: [
      {
        id: rolesModuleSlug,
        permissionId: 'role',
        action: 'read',
        resource: 'role',
        title: rolePermissionName[rolesModuleSlug],
        icon: <Shield size={20} />,
        navLink: `${appsRoot}/roles`,
      },
      {
        id: usersModuleSlug,
        permissionId: 'user',
        action: 'read',
        resource: 'user',
        title: rolePermissionName[usersModuleSlug],
        icon: <Users size={20} />,
        navLink: `${appsRoot}/users`,
      },
      {
        id: agentModuleSlug,
        permissionId: 'agent',
        action: 'read',
        resource: 'agent',
        title: rolePermissionName[agentModuleSlug],
        icon: <MdOutlineSupportAgent size={20} />,
        navLink: `${appsRoot}/agents`,
      },
      {
        id: locationsModuleSlug,
        permissionId: 'location',
        action: 'read',
        resource: 'location',
        companyOnly: true,
        adminLevel: true,
        title: rolePermissionName[locationsModuleSlug],
        icon: <MapPin size={20} />,
        navLink: `${appsRoot}/locations`,
      },
      {
        id: currenciesModuleSlug,
        title: rolePermissionName[currenciesModuleSlug],
        icon: <DollarSign size={20} />,
        navLink: `${appsRoot}/currencies`,
        permissionId: currenciesModuleSlug,
        resource: currenciesModuleSlug,
        companyOnly: true,
      },
      {
        id: rebatesModuleSlug,
        title: rolePermissionName[rebatesModuleSlug],
        icon: <Gift size={20} />,
        navLink: `${appsRoot}/rebates`,
        permissionId: rebatesModuleSlug,
        resource: rebatesModuleSlug,
        companyOnly: true,
      },
      {
        id: expensesModuleSlug,
        title: rolePermissionName[expensesModuleSlug],
        icon: <CreditCard size={20} />,
        navLink: `${appsRoot}/expenses`,
        permissionId: expensesModuleSlug,
        resource: expensesModuleSlug,
        companyOnly: true,
      },
    ],
  },
];

// console.log('Navigation items loaded:', navigationItems);
// console.log('Tools module slug:', toolsModuleSlug);
// console.log(
//   'Role permission name for tools:',
//   rolePermissionName[toolsModuleSlug],
// );

export default navigationItems;
