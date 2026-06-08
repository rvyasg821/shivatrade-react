// ** React Imports
import { Suspense } from 'react'
import { Navigate } from 'react-router-dom'

// ** Utils
import { getCurrentUser } from "@utils"
import { getCompanyData } from "@src/redux/authentication"
import { APP_MODE } from "@src/configs/appMode"


const PrivateRoute = ({ children, route }) => {
  // ** Vars
  const currentUser = getCurrentUser()
  const companyData = getCompanyData()

  if (route) {
    let restrictedRoute = false

    if (route.meta) {
      restrictedRoute = route.meta?.restricted
    }

    if (!currentUser) {
      return (<Navigate to='/login' />)
    }

    // Note: Super Admin role name is 'Admin' in database
    const isSystemAdmin = currentUser?.isSystemUser || currentUser?.role?.name === 'Super Admin' || currentUser?.role?.name === 'Admin' || currentUser?.userType === 'admin'

    // Multi-tenant removed - tenantId validation no longer needed
    // Company Admins no longer require tenantId to access the system

    if (currentUser && !isSystemAdmin) {
      // Check if user's company is marked as suspended
      const isSuspended = companyData?.status === 'suspended' ||
        currentUser?.company?.status === 'suspended'

      if (isSuspended) {
        console.warn('Company is suspended, redirecting to suspended page')
        return <Navigate to='/tenant/suspended' />
      }
    }

    // ** Subscription Validation
    // Backend already blocks Location Admin / Employee at login when the
    // subscription is inactive, so they should never reach this guard.
    // Company Admin is allowed in but pinned to the upgrade page until they
    // renew. Super Admin / impersonators bypass entirely.
    // Single-tenant mode has no subscriptions — skip the inactive-subscription
    // gate entirely (the upgrade route is hidden, so redirecting there would
    // land on a 404 / "page not found").
    if (currentUser && !isSystemAdmin && APP_MODE !== "single") {
      const isInactive = currentUser?.subscription_inactive === true
      if (isInactive) {
        // Company Admin → upgrade page (only allowed destination)
        // Other roles shouldn't reach here, but if they do, log them out via /login
        const isCompanyAdmin = currentUser?.role?.name === 'Company Admin'
        if (isCompanyAdmin) {
          // Allow the upgrade route + nested payment/checkout to render
          const path = (route?.path || '').toLowerCase()
          const allowed = path.includes('/profile/subscription') ||
                          path.includes('/profile') ||
                          path.includes('/company/upgrade')
          if (!allowed) {
            return <Navigate to='/apps/profile/subscription/upgrade' replace />
          }
        } else {
          return <Navigate to='/login' replace />
        }
      }
    }

    // ** Company-Only Route Protection
    // Prevent super admins from accessing company-only routes (like locations)
    const companyOnly = route.meta?.companyOnly
    // Note: Super Admin role name is 'Admin' in database
    const isSuperAdmin = currentUser?.role?.name === 'Admin' || currentUser?.isSystemUser === true || currentUser?.userType === 'admin'

    if (companyOnly && isSuperAdmin) {
      console.warn('🚫 Super admin attempted to access company-only route, redirecting to home')
      return <Navigate to='/' />
    }

    if (currentUser && restrictedRoute) {
      return (<Navigate to='/' />)
    }
  }

  return <Suspense fallback={null}>{children}</Suspense>
}

export default PrivateRoute
