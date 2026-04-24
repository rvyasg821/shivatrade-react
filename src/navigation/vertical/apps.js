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
