import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserData } from '@src/redux/authentication';
import { APP_MODE } from '@src/configs/appMode';

/**
 * SubscriptionGuard - Enforces subscription requirement for all routes
 * Redirects users without active subscription to upgrade page
 */
const SubscriptionGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Routes that don't require subscription check
  const ALLOWED_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/apps/profile/subscription/upgrade',
    '/apps/profile/subscription/payment/upgrade',
    '/plan-selection',
    '/plan-payment',
    '/auth/not-auth',
    '/assessment-form'
  ];

  useEffect(() => {
    // Single-tenant mode has no subscriptions — never redirect to the (hidden)
    // upgrade page, which would otherwise trap the user on a 404/loop.
    if (APP_MODE === 'single') {
      return;
    }

    const currentPath = location.pathname;

    // Check if current path is in allowed paths or starts with allowed path
    const isAllowedPath = ALLOWED_PATHS.some(path =>
      currentPath === path ||
      currentPath.startsWith(path) ||
      currentPath.startsWith('/forgot-password/otp-verify') ||
      currentPath.startsWith('/reset-password/verify')
    );

    if (isAllowedPath) {
      return; // Don't check subscription for allowed paths
    }

    // Get user data from localStorage
    const userData = getUserData();

    // Skip check if user not logged in (handled by auth guard)
    if (!userData || !userData._id) {
      return;
    }

    // Skip check for Super Admin (Admin role)
    const roleName = userData?.role?.name;
    const isAdmin = roleName === 'Admin' ||
                   roleName === 'Super Admin' ||
                   userData?.isSystemUser === true;

    if (isAdmin) {
      return; // Super Admin doesn't need subscription
    }

    // Skip check when Super Admin is impersonating a Company Admin
    const isImpersonating = userData?.isImpersonating === true ||
                           !!localStorage.getItem('sa_accessToken');
    if (isImpersonating) {
      return; // Impersonating Super Admin can access everything
    }

    // Only Company Admin manages subscriptions
    // Location Admin, Employee, and custom roles use the company's subscription
    // and should never see the purchase screen
    const isCompanyAdmin = roleName === 'Company Admin';
    if (!isCompanyAdmin) {
      return; // Non-Company Admin roles don't manage subscriptions
    }

    // Check subscription status (only for Company Admin)
    const hasActiveSubscription = userData?.hasActiveSubscription === true;

    if (!hasActiveSubscription) {
      console.log('🚫 No active subscription - redirecting to upgrade page');
      navigate('/apps/profile/subscription/upgrade', { replace: true });
    }
  }, [location.pathname, navigate]);

  return children;
};

export default SubscriptionGuard;
