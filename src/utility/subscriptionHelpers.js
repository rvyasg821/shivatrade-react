/**
 * Subscription Helper Functions
 * Utilities for managing subscription status in frontend
 */

import { getUserData } from '@src/redux/authentication';
import { storageUserKeyName } from '@constant/defaultValues';

/**
 * Update user's subscription status in localStorage
 * Call this after successful subscription purchase
 */
export const updateSubscriptionStatus = (hasActiveSubscription = true) => {
  try {
    const item = localStorage.getItem(storageUserKeyName);
    if (item) {
      const parsed = JSON.parse(item);

      // Update userData with new subscription status
      if (parsed.userData) {
        parsed.userData.hasActiveSubscription = hasActiveSubscription;
      } else {
        parsed.hasActiveSubscription = hasActiveSubscription;
      }

      // Save back to localStorage
      localStorage.setItem(storageUserKeyName, JSON.stringify(parsed));

      console.log(`✅ Subscription status updated: ${hasActiveSubscription}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error updating subscription status:', error);
    return false;
  }
  return false;
};

/**
 * Get current subscription status from localStorage
 */
export const getSubscriptionStatus = () => {
  try {
    const userData = getUserData();
    return userData?.hasActiveSubscription === true;
  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    return false;
  }
};

/**
 * Check if user needs to upgrade subscription
 * Returns true if user is not Admin and has no active subscription
 */
export const needsSubscriptionUpgrade = () => {
  try {
    const userData = getUserData();

    // Super Admin doesn't need subscription
    const isAdmin = userData?.role?.name === 'Admin' ||
                   userData?.role?.name === 'Super Admin' ||
                   userData?.isSystemUser === true;

    if (isAdmin) {
      return false;
    }

    // Check subscription status
    return !getSubscriptionStatus();
  } catch (error) {
    console.error('❌ Error checking subscription upgrade need:', error);
    return false;
  }
};
