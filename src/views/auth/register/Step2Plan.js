import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { ArrowLeft } from 'react-feather';
import {
  fetchPlans,
  cleanPlansMessage,
  autoSelectFirstPlan,
  startTrial,
  cleanTrialMessage,
} from './store';
import BillingCycleFilter from './components/BillingCycleFilter';
import PlanCard from './components/PlanCard';

import ErrorBoundary from './components/ErrorBoundary';
import { PlanCardSkeletonGrid } from './components/PlanCardSkeleton';
import LoadingSpinner from './components/LoadingSpinner';
import Notification from '@src/@core/components/toast/notification';
import {
  validatePlansArray,
  handleNetworkError,
  getRetryConfig,
} from './utils/planValidation';
import './Step2Plan.css';
import { Link, useNavigate } from 'react-router-dom';
import { appsRoot } from '@constant/defaultValues';
import { startLoading, stopLoading } from '../../loadingstore';
import { getAuthMe } from '../store';
import { clearLocationContext } from '@src/redux/locationContext';
import { useTranslation } from "react-i18next"
import { useCurrency } from '@src/utility/context/CurrencyContext';

const Step2Plan = ({ nextStep, prevStep }) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();

  const dispatch = useDispatch();
  const {
    plans,
    filters,
    pagination,
    plansLoading,
    planSelection,
    actionFlag,
    success,
    error,
    trialLoading,
    trialActionFlag,
    trialSuccess,
    trialError,
    tax_info
  } = useSelector((state) => state.register);
  const { selectedPlan, selectedTools, billingCycle, selectedLocations } = planSelection;

  const [retryAttempt, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const dashboardUrl = `${appsRoot}/dashboard`;
  const navigate = useNavigate();
  const store = useSelector((state) => state.auth);

  // Manage page loader for both plansLoading and trialLoading
  useEffect(() => {
    if (plansLoading?.loading || trialLoading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [plansLoading?.loading, trialLoading, dispatch])

  // Fetch plans on component mount (only if not already loaded)
  useEffect(() => {
    // Only fetch if plans are not already loaded to preserve selection when navigating back
    if (plans.length === 0) {
      dispatch(fetchPlans());
    }
  }, [dispatch, plans.length]);

  // Handle success/error messages (removed success notification for billing cycle changes)
  useEffect(() => {
    if (success && actionFlag.includes('PLANS')) {
      setRetryAttempt(0); // Reset retry count on success
      dispatch(cleanPlansMessage());
    }
    if (error && actionFlag.includes('PLANS')) {
      const friendlyError = handleNetworkError({ message: error });
      Notification('Error', friendlyError, 'warning');
      dispatch(cleanPlansMessage());
    }
  }, [success, error, actionFlag, dispatch]);

  useEffect(() => {
    if (store?.actionFlag === "AUTH_ME_SCS" && store?.authUserItem) {
      // Reset location context so it re-fetches with the newly created default location
      dispatch(clearLocationContext());
      // Always redirect to dashboard - dashboard will handle the welcome banner and redirect
      Notification('Success', 'Registration successful! Redirecting to dashboard...', 'success');
      navigate(`${appsRoot}/dashboard`, { replace: true });
    }
  }, [store.actionFlag])

  useEffect(() => {
    if (trialSuccess && trialActionFlag.includes('TRIAL')) {
      dispatch(getAuthMe({}));
      dispatch(cleanTrialMessage());
    }
    if (trialError && trialActionFlag.includes('TRIAL')) {
      Notification('Error', trialError, 'warning');
      dispatch(cleanTrialMessage());
    }
  }, [trialSuccess, trialError, trialActionFlag, dispatch]);

  // Validate plans data when it changes and auto-select first plan
  useEffect(() => {
    if (plans.length > 0) {
      const errors = validatePlansArray(plans);
      setValidationErrors(errors);

      if (errors.length > 0) {
      }

      // Auto-select first plan if no plan is selected and no saved plan in localStorage
      const savedPlan = localStorage.getItem("selectedPlan");
      if (!selectedPlan && !savedPlan) {
        const filteredPlans = plans.filter((plan) => {
          // Handle trial plans - only show when TRIAL billing cycle is selected
          if (plan.trial === true) {
            return billingCycle === 'TRIAL'; // Only show trial plans when TRIAL is selected
          }
          return plan.duration_type === billingCycle;
        });
        if (filteredPlans.length > 0) {
          dispatch(autoSelectFirstPlan(filteredPlans));
        }
      }
    }
  }, [plans, billingCycle, dispatch, selectedPlan]);

  // Form validation
  const formik = useFormik({
    initialValues: {
      selectedPlanId: selectedPlan?._id || '',
    },
    // Remove Yup validation since we handle it manually
    enableReinitialize: true,
    validate: () => {
      const errors = {};

      // Manual validation - no need for Yup schema
      if (!selectedPlan) {
        errors.selectedPlanId = 'Please select a plan to continue';
        return errors;
      }

      // Skip tool validation for trial plans
      if (selectedPlan.trial !== true && selectedTools.length === 0) {
        errors.selectedPlanId = 'Please select at least one tool to continue';
        return errors;
      }
      return errors;
    },
    onSubmit: () => {
      if (!selectedPlan) {
        Notification('Error', 'Please select a plan to continue', 'warning');
        return;
      }

      // Handle trial plans differently
      if (selectedPlan.trial === true) {
        // For trial plans, call the start trial API
        const selectedToolsData = selectedPlan.tools.filter((tool) =>
          selectedTools.includes(tool._id),
        );
        const trialPayload = {
          planId: selectedPlan._id,
          tools: selectedToolsData, // Send full tool objects, not just IDs
        };
        dispatch(startTrial(trialPayload));
        return;
      }

      if (selectedTools.length === 0) {
        Notification(
          'Error',
          'Please select at least one tool to continue',
          'warning',
        );
        return;
      }
      nextStep();
    },
  });

  // Update form when plan selection changes
  useEffect(() => {
    formik.setFieldValue('selectedPlanId', selectedPlan?._id || '');
  }, [selectedPlan]);

  const handleRetry = () => {
    const retryConfig = getRetryConfig(retryAttempt);

    if (retryConfig) {
      setRetryAttempt(retryConfig.attemptNumber);

      // Add delay for exponential backoff
      setTimeout(() => {
        dispatch(fetchPlans());
      }, retryConfig.delay);

      Notification(
        'Info',
        `Retrying... (Attempt ${retryConfig.attemptNumber}/${retryConfig.maxRetries})`,
        'info',
      );
    } else {
      Notification(
        'Error',
        'Maximum retry attempts reached. Please refresh the page.',
        'error',
      );
    }
  };

  const filteredPlans = plans.filter((plan) => {
    // Handle trial plans - only show when TRIAL billing cycle is selected
    if (plan.trial === true) {
      return billingCycle === 'TRIAL'; // Only show trial plans when TRIAL is selected
    }
    return plan.duration_type === billingCycle;
  });

  return (
    <ErrorBoundary>
      <div className="card register-steps-main step2plan pb-0">
        {/* <div className="card-header">
          <h2>Choose Your Plan</h2>
          <hr className="section-divider" />
        </div> */}

        <div className="card-body p-0">
          <form onSubmit={formik.handleSubmit}>
            {/* Billing Cycle Filter */}
            <BillingCycleFilter />

            <div className='step2plan-tabbing-content'>

              {/* Loading State */}
              {plansLoading && (
                <>
                  <LoadingSpinner message="Loading available plans..." />
                  <PlanCardSkeletonGrid count={3} />
                </>
              )}

              {/* Error State */}
              {error && actionFlag.includes('PLANS') && !plansLoading && (
                <div className="error-state">
                  <p className="error-message">{error}</p>
                  <button
                    type="button"
                    className="btn-retry"
                    onClick={handleRetry}
                  >
                    {t("Try Again")}              </button>
                </div>
              )}

              {/* Plans Grid */}
              {!plansLoading && !error && filteredPlans.length > 0 && (
                <>
                  <div className="plan-cards-container">
                    {filteredPlans.map((plan) => (
                      <PlanCard key={plan._id} plan={plan} />

                    ))}
                  </div>

                  {/* Tool Selection Validation Message - Skip for trial plans */}
                  {selectedPlan &&
                    selectedPlan.trial !== true &&
                    selectedTools.length === 0 && (
                      <div className="tool-validation-message">
                        <div className="validation-error">
                          <h4>⚠️ {t("Please select at least one tool to continue")}</h4>
                          <p>
                            {t("You must select at least one tool from the")}
                            {selectedPlan.name}" {t("plan to proceed with your subscription.")}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Plan Summary Section - Only show when tools are selected (skip for trial plans) */}
                  {selectedPlan &&
                    (
                      <div className="plan-summary-section">
                        <h3 className="text-white">{t("Plan Summary")}</h3>
                        <div className="simple-plan-summary">
                          <div className="plan-summary-row">
                            <div className="plan-name-info">
                              <span className="plan-name">
                                {selectedPlan.name}
                              </span>
                              <span className="plan-locations">
                                ({selectedLocations} {selectedLocations === 1 ? t('Location') : t('Locations')})
                              </span>
                            </div>
                            <div className="plan-price-info">
                              {(() => {
                                // Get plan base price from location_pricing
                                const locationTiers = selectedPlan.location_pricing || [];
                                const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
                                const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
                                const planBasePrice = currentTier?.special_price > 0
                                  ? currentTier.special_price
                                  : (currentTier?.price || selectedPlan.platform_price || 0);

                                const formatPrice = (price) => {
                                  return new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: currency.code,
                                    minimumFractionDigits: 2,
                                  }).format(price);
                                };

                                return (
                                  <>
                                    <span className="plan-price">
                                      {formatPrice(planBasePrice)}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Invoice-Style Pricing Breakdown */}
                          {selectedPlan.tools &&
                            selectedPlan.tools.length > 0 && (
                              <div className="invoice-summary">
                                <h5>{t("Pricing Breakdown")}</h5>
                                <div className="invoice-items">
                                  <div className='selected-tools'>
                                    {/* Individual Tool Prices - Only show selected tools */}
                                    {[...selectedPlan.tools].sort((a, b) => a.name.localeCompare(b.name)).map((tool) => {
                                      const isToolSelected = selectedTools.includes(
                                        tool._id,
                                      );
                                      if (!isToolSelected) return null;

                                      const formatPrice = (price) => {
                                        return new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: currency.code,
                                          minimumFractionDigits: 2,
                                        }).format(price);
                                      };

                                      // Calculate tool price based on pricing_mode and location
                                      const calculateToolPrice = (tool) => {
                                        const basePrice = tool.base_price ?? tool.price ?? 0;
                                        const pricingMode = tool.pricing_mode || 'fixed';
                                        const locationMultiplier = tool.location_multiplier || 1.0;

                                        if (pricingMode === 'multiplier') {
                                          // Always apply the multiplier for multiplier mode
                                          return basePrice * selectedLocations * locationMultiplier;
                                        }
                                        return basePrice;
                                      };

                                      // Get plan base price to check if free plan
                                      const _locTiers = selectedPlan.location_pricing || [];
                                      const _sortedT = [..._locTiers].sort((a, b) => b.locations - a.locations);
                                      const _curTier = _sortedT.find(t => t.locations <= selectedLocations) || _locTiers[0];
                                      const _planBase = _curTier?.special_price > 0 ? _curTier.special_price : (_curTier?.price || selectedPlan.platform_price || 0);
                                      const calculatedPrice = _planBase === 0 ? 0 : calculateToolPrice(tool);

                                      return (
                                        <div
                                          key={tool._id}
                                          className="invoice-item selected"
                                        >
                                          <span className="item-name">
                                            {tool.name}
                                            {tool.pricing_mode === 'multiplier' && _planBase > 0 && (
                                              <small className="text-muted ms-1">
                                                (×{selectedLocations})
                                              </small>
                                            )}
                                          </span>
                                          <span className="item-price">
                                            {calculatedPrice > 0
                                              ? formatPrice(calculatedPrice)
                                              : 'Free'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Subtotal */}
                                  {(() => {
                                    const selectedToolsData =
                                      selectedPlan.tools.filter((tool) =>
                                        selectedTools.includes(tool._id),
                                      );

                                    // Calculate tool price based on pricing_mode and location
                                    const calculateToolPrice = (tool) => {
                                      const basePrice = tool.base_price ?? tool.price ?? 0;
                                      const pricingMode = tool.pricing_mode || 'fixed';
                                      const locationMultiplier = tool.location_multiplier || 1.0;

                                      if (pricingMode === 'multiplier') {
                                        // Always apply the multiplier for multiplier mode
                                        return basePrice * selectedLocations * locationMultiplier;
                                      }
                                      return basePrice;
                                    };

                                    // Get plan base price from location_pricing
                                    const locationTiers = selectedPlan.location_pricing || [];
                                    const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
                                    const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
                                    const planBasePrice = currentTier?.special_price > 0
                                      ? currentTier.special_price
                                      : (currentTier?.price || selectedPlan.platform_price || 0);

                                    // If plan base is zero (trial/free), tools are also free
                                    const toolsTotal = planBasePrice === 0 ? 0 : selectedToolsData.reduce(
                                      (sum, tool) => sum + calculateToolPrice(tool),
                                      0,
                                    );

                                    const formatPrice = (price) => {
                                      return new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: currency.code,
                                        minimumFractionDigits: 2,
                                      }).format(price);
                                    };

                                    const subTotal = toolsTotal + planBasePrice
                                    const taxPrice = (subTotal * tax_info.value) / 100
                                    const totalPrice = subTotal + taxPrice

                                    return (
                                      <>
                                        <div className="invoice-subtotal">
                                          <span className="subtotal-label">
                                            {t('Tools Subtotal')}:
                                          </span>
                                          <span className="subtotal-price">
                                            {formatPrice(toolsTotal)}
                                          </span>
                                        </div>

                                        <div className="invoice-subtotal">
                                          <span className="subtotal-label">
                                            {t("Subtotal:")}
                                          </span>
                                          <span className="subtotal-price">
                                            {formatPrice(subTotal)}
                                          </span>
                                        </div>

                                        {/*Tax */}
                                        {
                                          tax_info.label &&
                                          <div className="invoice-item">
                                            <span className="subtotal-label">
                                              {`${tax_info.label} (${tax_info.value}%)`}
                                            </span>
                                            <span className="item-price">
                                              {formatPrice(taxPrice)}
                                            </span>
                                          </div>
                                        }

                                        {/* Total */}
                                        <div className="invoice-total">
                                          <span className="total-label">
                                            {t("Total Price:")}
                                          </span>
                                          <span className="total-price">
                                            {formatPrice(totalPrice)}
                                          </span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* No Plans Available */}
              {!plansLoading && !error && filteredPlans.length === 0 && (
                <div className="no-plans-state">
                  <p>
                    {t("No plans available for")} {billingCycle.toLowerCase()} {t("billing")}.
                  </p>
                  <p>{t("Please try switching to a different billing cycle.")}</p>
                </div>
              )}

              {/* Form Validation Error */}
              {formik.touched.selectedPlanId && formik.errors.selectedPlanId && (
                <p className="error plan-selection-error">
                  {formik.errors.selectedPlanId}
                </p>
              )}

              {/* Navigation Buttons */}
              <div className="form-actions mt-2 mb-2 mb-md-0">
                <button type="button" className="btn-back" onClick={prevStep}>
                  {/* <ArrowLeft size={17} /> */}
                  Back
                </button>

                <button
                  type="submit"
                  className="btn-next"
                  disabled={
                    !selectedPlan ||
                    plansLoading ||
                    trialLoading ||
                    (selectedPlan.trial !== true && selectedTools.length === 0)
                  }
                >
                  {plansLoading || trialLoading
                    ? 'Loading...'
                    : selectedPlan?.trial === true
                      ? 'Start Free Trial'
                      : 'Continue'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Step2Plan;
