// ** Icons Import
import {
  Home,
  User,
  Users,
  Shield,
} from 'react-feather'


// ** Constant
import {
  appsRoot,
  rolePermissionName,
  masterGroupSlug,
  usersModuleSlug,
  rolesModuleSlug,
} from "@constant/defaultValues"
import { HIDDEN_NAV_IDS } from '../../configs/appMode'

const horizontalNav = [
  {
    id: "dashboards",
    title: "Dashboard",
    icon: (<Home size={20} />),
    navLink: `${appsRoot}/dashboard`
  },
  {
    id: masterGroupSlug,
    title: "Products",
    icon: (<User size={20} />),
    children: [
      {
        id: usersModuleSlug,
        permissionId: usersModuleSlug,
        title: rolePermissionName[usersModuleSlug],
        icon: (<Users size={20} />),
        navLink: `${appsRoot}/users`
      },
      {
        id: rolesModuleSlug,
        permissionId: rolesModuleSlug,
        title: rolePermissionName[rolesModuleSlug],
        icon: (<Shield size={20} />),
        navLink: `${appsRoot}/roles`
      },
    ]
  },
]

// Single-tenant mode: drop hidden nav items (and any parent left empty).
const filterNav = (items) =>
  items
    .filter((item) => !HIDDEN_NAV_IDS.includes(item.id))
    .map((item) =>
      item.children ? { ...item, children: filterNav(item.children) } : item
    )
    .filter((item) => !item.children || item.children.length > 0)

export default filterNav(horizontalNav)
