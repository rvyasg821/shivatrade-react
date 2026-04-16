// ** Vertical Menu Components
import VerticalNavMenuLink from './VerticalNavMenuLink'
import VerticalNavMenuGroup from './VerticalNavMenuGroup'
import VerticalNavMenuSectionHeader from './VerticalNavMenuSectionHeader'

// ** Utils
import {
  canViewMenuItem,
  canViewMenuGroup,
  resolveVerticalNavMenuItemComponent as resolveNavItemComponent
} from '@layouts/utils'

import { useSelector } from 'react-redux'

// Helper to get tools from localStorage (works across all login flows)
const getToolsFromStorage = () => {
  try {
    const raw = localStorage.getItem('userData')
    if (raw) {
      const parsed = JSON.parse(raw)
      // Check companyData.tools first, then userData.company.tools
      return parsed?.companyData?.tools || parsed?.userData?.company?.tools || []
    }
  } catch { }
  return []
}

const VerticalMenuNavItems = props => {
  // ** Components Object
  const Components = {
    VerticalNavMenuLink,
    VerticalNavMenuGroup,
    VerticalNavMenuSectionHeader
  }

  // ** Store Data
  const authUserItem = useSelector(state => state.auth?.authUserItem) || {}

  // Check for system-level user
  const isSuperAdmin = authUserItem?.role?.name === 'Admin' ||
                        authUserItem?.role?.name === 'Super Admin' ||
                        authUserItem?.role?.name === 'Agent' ||
                        authUserItem?.isSystemUser === true ||
                        authUserItem?.userType === 'admin' ||
                        authUserItem?.role?.category === 'admin' ||
                        (authUserItem?.role?.category === 'custom' && !authUserItem?.role?.companyId)

  // Detect employee-level user
  const isEmployee = !isSuperAdmin && (
    authUserItem?.role?.name === 'Employee' ||
    authUserItem?.role?.category === 'employee'
  )

  // Get tools from all sources: Redux old slice > authUserItem.company > localStorage
  const reduxCompanyTools = useSelector(state => state.authentication?.companyData?.tools) || []
  const authCompanyTools = authUserItem?.company?.tools || []
  const subscribedTools = reduxCompanyTools.length > 0
    ? reduxCompanyTools
    : authCompanyTools.length > 0
    ? authCompanyTools
    : getToolsFromStorage()

  // ** Render Nav Menu Items
  const RenderNavItems = props.items.map((item, index) => {
    const TagName = Components[resolveNavItemComponent(item)]
    if (item.children) {
      return canViewMenuGroup(item, subscribedTools, isSuperAdmin, isEmployee) && <TagName item={item} index={index} key={item.id} {...props} />
    }
    return canViewMenuItem(item, subscribedTools, isSuperAdmin, isEmployee) && <TagName key={item.id || item.header} item={item} {...props} />
  })

  return RenderNavItems
}

export default VerticalMenuNavItems
