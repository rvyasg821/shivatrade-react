// ** React Imports
import { useContext } from 'react'
import { AbilityContext } from '@src/utility/context/Can'

/**
 * Return which component to render based on it's data/context
 * @param {Object} item nav menu item
 */
export const resolveVerticalNavMenuItemComponent = item => {
  if (item.header) return 'VerticalNavMenuSectionHeader'
  if (item.children) return 'VerticalNavMenuGroup'
  return 'VerticalNavMenuLink'
}

/**
 * Return which component to render based on it's data/context
 * @param {Object} item nav menu item
 */
export const resolveHorizontalNavMenuItemComponent = item => {
  if (item.children) return 'HorizontalNavMenuGroup'
  return 'HorizontalNavMenuLink'
}

/**
 * Check if nav-link is active
 * @param {Object} link nav-link object
 */
export const isNavLinkActive = (link, currentURL, routerProps) => {
  return (
    currentURL === link ||
    (routerProps && routerProps.meta && routerProps.meta.navLink && routerProps.meta.navLink === link)
  )
  // return currentURL === link
}

/**
 * Check if the given item has the given url
 * in one of its children
 *
 * @param item
 * @param activeItem
 */
export const hasActiveChild = (item, currentUrl) => {
  const { children } = item

  if (!children) {
    return false
  }

  for (const child of children) {
    if (child.children) {
      if (hasActiveChild(child, currentUrl)) {
        return true
      }
    }

    // Check if the child has a link and is active
    if (child && child.navLink && currentUrl && (child.navLink === currentUrl || currentUrl.includes(child.navLink))) {
      return true
    }
  }

  return false
}

/**
 * Check if this is a children
 * of the given item
 *
 * @param children
 * @param openGroup
 * @param currentActiveGroup
 */
export const removeChildren = (children, openGroup, currentActiveGroup) => {
  children.forEach(child => {
    if (!currentActiveGroup.includes(child.id)) {
      const index = openGroup.indexOf(child.id)
      if (index > -1) openGroup.splice(index, 1)
      if (child.children) removeChildren(child.children, openGroup, currentActiveGroup)
    }
  })
}

// ** Helper to check tool access
const hasToolAccess = (item, tools, isSuperAdmin) => {
  if (isSuperAdmin) return true
  if (!item.slug) return true
  return tools.some(t => t.slug === item.slug || t._id === item.slug)
}

export const canViewMenuGroup = (item, tools = [], isSuperAdmin = false, isEmployee = false) => {
  const ability = useContext(AbilityContext)
  // ! This same logic is used in canViewHorizontalNavMenuGroup and canViewHorizontalNavMenuHeaderGroup. So make sure to update logic in them as well

  const hasAnyVisibleChild = item.children && item.children.some((i) => {
    // Hide company-only items from super admins
    if (i.companyOnly && isSuperAdmin) return false

    // Hide admin-only items from non-admins (company admin should not see)
    if (i.adminOnly && !isSuperAdmin) return false

    // Hide admin-level items (e.g. "Attendance Admin", "Leave Requests Admin") from Employee role users
    if (i.adminLevel && isEmployee) return false

    // Subscription tool gating — check FIRST
    if (!hasToolAccess(i, tools, isSuperAdmin)) return false

    // RBAC check
    if (i.action && i.resource) {
      return ability.can(i.action, i.resource)
    }

    return true
  })

  // Check tool access for the group itself (groups rarely have a slug)
  if (!hasToolAccess(item, tools, isSuperAdmin)) return false

  // ** If resource and action is defined in item => Return based on children visibility (Hide group if no child is visible)
  // ** Else check for ability using provided resource and action along with checking if has any visible child
  if (!(item.action && item.resource)) {
    return hasAnyVisibleChild
  }
  return ability.can(item.action, item.resource) && hasAnyVisibleChild
}

export const canViewMenuItem = (item, tools = [], isSuperAdmin = false, isEmployee = false) => {
  const ability = useContext(AbilityContext)

  // Hide company-only items from super admins
  if (item.companyOnly && isSuperAdmin) return false

  // Hide admin-only items from non-admins (company admin should not see)
  if (item.adminOnly && !isSuperAdmin) return false

  // Hide admin-level items (e.g. "Home Office Compliance") from Employee role users
  if (item.adminLevel && isEmployee) return false

  // Subscription tool gating — check FIRST (tool must be in subscription)
  if (!hasToolAccess(item, tools, isSuperAdmin)) return false

  // RBAC check: if user has permission for this resource
  if (item.action && item.resource) {
    return ability.can(item.action, item.resource)
  }

  return true
}
