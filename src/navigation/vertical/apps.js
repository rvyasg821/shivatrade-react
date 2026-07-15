// ** Icons Import
import {
  Home,
  Users,
  Shield,
  Layers,
  FileText,
  Grid,
  Globe,
  Hash,
  Map,
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
  Send,
  TrendingUp,
  ShoppingCart,
  Box,
  Gift,
  Eye,
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
  uomModuleSlug,
  countriesModuleSlug,
  statesModuleSlug,
  citiesModuleSlug,
  reportsModuleSlug,
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
  rfqModuleSlug,
  quotationsModuleSlug,
  pfiModuleSlug,
  // Purchase
  purchaseGroupSlug,
  purchaseOrdersModuleSlug,
  poVendorsModuleSlug,
  trackingModuleSlug,
  trackingLogsModuleSlug,
  inventoryModuleSlug,
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
import { HIDDEN_NAV_IDS } from '../../configs/appMode';

const navigationItems = [
  {
    id: 'dashboards',
    title: 'Dashboard',
    icon: <Home size={20} />,
    navLink: `${appsRoot}/dashboard`,
  },

  {
    id: reportsModuleSlug,
    permissionId: reportsModuleSlug,
    companyOnly: true,
    title: rolePermissionName[reportsModuleSlug],
    icon: <TrendingUp size={20} />,
    navLink: `${appsRoot}/reports`,
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
        id: rfqModuleSlug,
        title: "RFQ",
        icon: <Send size={20} />,
        navLink: `${appsRoot}/rfq`,
        permissionId: rfqModuleSlug,
        resource: rfqModuleSlug,
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
        navLink: `${appsRoot}/pfi`,
        permissionId: pfiModuleSlug,
        resource: pfiModuleSlug,
        companyOnly: true,
      },
      {
        id: purchaseOrdersModuleSlug,
        title: rolePermissionName[purchaseOrdersModuleSlug],
        icon: <FileText size={20} />,
        navLink: `${appsRoot}/purchase-orders`,
        permissionId: purchaseOrdersModuleSlug,
        resource: purchaseOrdersModuleSlug,
        companyOnly: true,
      },
      {
        id: invoicesModuleSlug,
        title: rolePermissionName[invoicesModuleSlug],
        icon: <FileText size={20} />,
        navLink: `${appsRoot}/invoices`,
        permissionId: invoicesModuleSlug,
        resource: invoicesModuleSlug,
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
        id: uomModuleSlug,
        title: rolePermissionName[uomModuleSlug],
        icon: <Hash size={20} />,
        navLink: `${appsRoot}/uom`,
        permissionId: uomModuleSlug,
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

  // PO Vendor - promoted to a top-level entry (out of the Purchase group)
  // since it's the only item that lives there for now. Tracking sidebar
  // entry remains hidden; its permission slug (`trackingModuleSlug`) is
  // still wired for the per-POV Tracking tab + BE checks.
  {
    id: poVendorsModuleSlug,
    title: rolePermissionName[poVendorsModuleSlug],
    icon: <CheckSquare size={20} />,
    navLink: `${appsRoot}/po-vendors`,
    permissionId: poVendorsModuleSlug,
    resource: poVendorsModuleSlug,
    companyOnly: true,
  },

  // GRN (Goods Receipt Note) and Debit Notes are no longer top-level nav
  // items — they live inside the Vendor PO (POV) detail as tabs (GRNs /
  // Debit Notes). Their list/detail routes remain for deep links + Back.

  // Inventory - received-goods register (read-only view of POV closures).
  {
    id: inventoryModuleSlug,
    title: rolePermissionName[inventoryModuleSlug],
    icon: <Box size={20} />,
    navLink: `${appsRoot}/inventory`,
    permissionId: inventoryModuleSlug,
    resource: inventoryModuleSlug,
    companyOnly: true,
  },

  // People group (Employees + HRM tools)
  // Admin tier sees this labeled "People" (management view).
  // Employee tier sees "My Records" (self-service view) - swapped at
  // render time in VerticalLayout based on the user's role tier.
  {
    id: 'people',
    title: 'People',
    titleSelfService: 'HRM',
    icon: <Users size={20} />,
    companyOnly: true,
    children: [
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
      },
      {
        id: 'employeeLookups',
        permissionId: 'employee',
        action: 'read',
        resource: 'employee',
        companyOnly: true,
        adminLevel: true,
        title: 'Designations & Departments',
        icon: <Sliders size={20} />,
        navLink: `${appsRoot}/employees/lookups`,
      },
    ],
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

  // SaaS Activity Log (platform owner only).
  //
  // `adminOnly: true` hides it from every non-super-admin (see
  // @core/layouts/utils.js:134). No `action`/`resource` on purpose: those would
  // run an ability check against a permission row that does not exist for this
  // module, which would hide the item even from the super admin.
  {
    id: trackingLogsModuleSlug,
    title: rolePermissionName[trackingLogsModuleSlug],
    icon: <Eye size={20} />,
    navLink: `${appsRoot}/tracking-logs`,
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
      // Geo masters. No `action`/`resource` — those run an ability check against
      // a permission row that does not exist yet for these modules, which would
      // hide the item from everyone. The route's `permissionId` still gates it.
      {
        id: countriesModuleSlug,
        permissionId: countriesModuleSlug,
        companyOnly: true,
        title: rolePermissionName[countriesModuleSlug],
        icon: <Globe size={20} />,
        navLink: `${appsRoot}/countries`,
      },
      {
        id: statesModuleSlug,
        permissionId: statesModuleSlug,
        companyOnly: true,
        title: rolePermissionName[statesModuleSlug],
        icon: <Map size={20} />,
        navLink: `${appsRoot}/states`,
      },
      {
        id: citiesModuleSlug,
        permissionId: citiesModuleSlug,
        companyOnly: true,
        title: rolePermissionName[citiesModuleSlug],
        icon: <MapPin size={20} />,
        navLink: `${appsRoot}/cities`,
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

// Single-tenant mode: drop hidden nav items (and any parent left empty).
const filterNav = (items) =>
  items
    .filter((item) => !HIDDEN_NAV_IDS.includes(item.id))
    .map((item) =>
      item.children ? { ...item, children: filterNav(item.children) } : item
    )
    .filter((item) => !item.children || item.children.length > 0);

export default filterNav(navigationItems);
