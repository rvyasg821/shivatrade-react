// ** React Imports
import { Suspense, useEffect, useRef } from "react"
import { Navigate } from "react-router-dom"

// ** Store & Actions
import { useSelector } from "react-redux"

// ** Constant
import { roleBypassType } from "@constant/defaultValues"
import { getCompanyData } from "@src/redux/authentication"
import Notification from "@components/toast/notification"

const RoleWrapper = ({ children, route }) => {
    // ** Store vars
    const authStore = useSelector((state) => state.auth)
    const authUserItem = authStore?.authUserItem || null
    const permissions = authUserItem?.role?.permissions || {}
    const roleName = authUserItem?.role?.name || ""
    const roleType = authUserItem?.role?.type || ""

    // ** Bypass for System Admins (Super Admin/Admin with type 'system')
    const isSystemAdmin = roleType === 'system' && (roleName === 'Super Admin' || roleName === 'Admin')
    const bypass = isSystemAdmin || roleBypassType.includes(authUserItem?.role?.roleType)

    let hasPermission = true
    if (route) {
        const action = route?.meta?.action || ""
        // ** Company-Admin-only routes (e.g. Activity Log): gate on role name,
        // NOT a module permission — a Company Admin's permissions never include a
        // brand-new 'activity-log' slug, so a permissionId check would wrongly
        // block them. The backend is the hard gate (403s non-company-admins).
        if (route?.meta?.companyAdminOnly && roleName !== 'Company Admin') {
            hasPermission = false
        }
        // ** Allow access if user is super admin (bypass) or has permission
        if (!bypass && route?.meta?.permissionId) {
            const modulePermissions = permissions[route.meta.permissionId]
            if (!modulePermissions?.can_read) { hasPermission = false }
            if (action === "add") {
                if (!modulePermissions?.can_add) { hasPermission = false }
            } else if (action === "edit") {
                if (!modulePermissions?.can_update) { hasPermission = false }
            }
        }
    }

    // ── Tool Access Check ──────────────────────────────────────────────────
    // If the route declares a toolSlug, the user's company subscription must
    // include that tool. Backend already enforces this on API calls; this is
    // a frontend belt-and-braces check that prevents the user from landing
    // on a broken page when they type the URL directly.
    let lacksToolAccess = false
    if (route?.meta?.toolSlug && !bypass) {
        const companyData = getCompanyData()
        const tools = companyData?.tools || authUserItem?.company?.tools || []
        const slug = route.meta.toolSlug
        const hasTool = tools.some((t) => t?.slug === slug || t?._id === slug)
        if (!hasTool) lacksToolAccess = true
    }

    // Show toast on the same render cycle, then redirect.
    // Use a ref guard so we don't fire the toast twice during React 18 strict mode.
    const toastFired = useRef(false)
    useEffect(() => {
        if (lacksToolAccess && !toastFired.current) {
            toastFired.current = true
            Notification('Warning', 'This tool is not in your subscription', 'warning')
        }
    }, [lacksToolAccess])

    if (lacksToolAccess) {
        return <Navigate to='/apps/dashboard' replace />
    }

    if (!hasPermission) {
        // Permission description mapping
        const permissionDescriptions = {
            user: 'User Management',
            role: 'Role Management',
            plans: 'Plan Management',
            tools: 'Tools Management',
            company: 'Company Management',
            subscription: 'Subscription Management',
            payments: 'Payment Management',
            setting: 'System Settings'
        }

        const actionDescriptions = {
            list: 'view',
            add: 'create',
            edit: 'update',
            view: 'view',
            delete: 'delete'
        }

        const moduleSlug = route?.meta?.permissionId
        const action = route?.meta?.action || 'read'
        const moduleName = permissionDescriptions[moduleSlug] || moduleSlug
        const actionName = actionDescriptions[action] || action

        const permissionInfo = {
            reason: 'insufficient_permissions',
            requiredPermission: {
                moduleSlug,
                action,
                description: `${moduleName} - ${actionName} access`
            },
            returnUrl: window.location.pathname
        }

        return (
            <Navigate
                to="/auth/not-auth"
                state={permissionInfo}
                replace
            />
        )
    }

    return (<Suspense fallback={null}>{children}</Suspense>)
}

export default RoleWrapper
