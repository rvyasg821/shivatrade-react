import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearPlanSelection, setBillingCycle } from '../store';
clearPlanSelection
import { useTranslation } from "react-i18next"

const BillingCycleFilter = ({ isTrialEligible = true }) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { planSelection, filters, plansLoading, plans } = useSelector(
    (state) => state.register,
  );
  const { billingCycle } = planSelection;

  // checking flag condition
  const hasLifetimePlan = plans.some(plan => plan.is_lifetime === true);
  const hasTrialPlan = plans.some(plan => plan.trial === true);

  // Only show trial option if both trial plans exist AND user is eligible
  const showTrialOption = hasTrialPlan && isTrialEligible;



  const handleCycleChange = (cycle) => {
    // No API call needed - client-side filtering
    if (cycle !== billingCycle && !plansLoading) {
      dispatch(setBillingCycle(cycle));
      localStorage.setItem("billingCycle", cycle);
      dispatch(clearPlanSelection());
    }
  };

  // Get available billing cycles from API filters
  const availableCycles = filters.filter(
    (filter) =>
      filter.toLowerCase().includes('monthly') ||
      filter.toLowerCase().includes('yearly') ||
      filter.toLowerCase().includes('trial') && showTrialOption ||
      filter.toLowerCase().includes('weekly') ||
      (filter.toLowerCase().includes('lifetime') && hasLifetimePlan));

  return (
    <div className="billing-cycle-filter">
      <div className="filter-buttons">
        {availableCycles.length > 0 ? (
          availableCycles.map((filter, index) => {

            // Convert filter text to billing cycle format
            const getCycleValue = (filterText) => {
              const text = filterText.toLowerCase();
              if (text.includes(t("monthly"))) return 'MONTHLY';
              if (text.includes(t("yearly"))) return 'YEARLY';
              if (text.includes(t("weekly"))) return 'WEEKLY';
              if (text.includes(t("trial")) && showTrialOption) return 'TRIAL';
              if (text.includes('lifetime') && hasLifetimePlan) return 'LIFETIME';
              return filterText.toUpperCase();
            };

            const cycleValue = getCycleValue(filter);
            const isActive = billingCycle === cycleValue;

            return (
              <button
                key={index}
                type="button"
                className={`filter-btn btn-secondary ${isActive ? 'active' : ''}`}
                onClick={() => handleCycleChange(cycleValue)}
                disabled={plansLoading || isActive}
                aria-label={`Select ${filter} billing`}
                aria-pressed={isActive}
              >
                {t(filter)}
              </button>
            );
          })
        ) : (
          // Fallback to default filters if API doesn't provide any
          <>

            <button
              type="button"
              className={`filter-btn btn-secondary ${billingCycle === 'MONTHLY' ? 'active' : ''}`}
              onClick={() => handleCycleChange('MONTHLY')}
              disabled={plansLoading || billingCycle === 'MONTHLY'}
              aria-label="Select monthly billing"
              aria-pressed={billingCycle === 'MONTHLY'}
            >
              {t("Monthly")}

            </button>

            <button
              type="button"
              className={`filter-btn btn-secondary ${billingCycle === 'YEARLY' ? 'active' : ''}`}
              onClick={() => handleCycleChange('YEARLY')}
              disabled={plansLoading || billingCycle === 'YEARLY'}
              aria-label="Select yearly billing"
              aria-pressed={billingCycle === 'YEARLY'}
            >
              {t("Yearly")}

            </button>

            {hasLifetimePlan && (
              <button
                type="button"
                className={`filter-btn btn-secondary ${billingCycle === 'LIFETIME' ? 'active' : ''}`}
                onClick={() => handleCycleChange('LIFETIME')}
                disabled={plansLoading || billingCycle === 'LIFETIME'}
              >
                {t("Lifetime")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(BillingCycleFilter);
