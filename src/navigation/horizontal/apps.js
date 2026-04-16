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

export default [
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
