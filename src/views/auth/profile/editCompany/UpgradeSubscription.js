import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { ArrowLeft, AlertCircle, Edit, AlertTriangle } from 'react-feather';
import {
  fetchPlans,
  cleanPlansMessage,
  autoSelectFirstPlan,
  startTrial,
  cleanTrialMessage,
} from '@src/views/auth/register/store/';
import { getCompanySubscriptionList, validateDiscountOnPlanChange, clearDiscountWarning } from '@src/views/subscription/store/';
import BillingCycleFilter from '@src/views/auth/register/components/BillingCycleFilter';
import PlanCard from '@src/views/auth/register/components/PlanCard';

import ErrorBoundary from '@src/views/auth/register/components/ErrorBoundary';
import { PlanCardSkeletonGrid } from '@src/views/auth/register/components/PlanCardSkeleton';
import LoadingSpinner from '@src/views/auth/register/components/LoadingSpinner';
import Notification from '@src/@core/components/toast/notification';
import {
  validatePlansArray,
  handleNetworkError,
  getRetryConfig,
} from '@src/views/auth/register/utils/planValidation';
import { formatPrice } from '@src/views/auth/register/utils/paymentValidation';
import '@src/views/auth/register/Step2Plan.css';
import { Link, useNavigate } from 'react-router-dom';
import { appsRoot } from '@constant/defaultValues';
import { startLoading, stopLoading } from '@src/views/loadingstore';
import { getAuthMe } from '@src/views/auth/store/';
import axios from '@src/utility/AxiosConfig';

const UpgradeSubscription = () => {
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

  // Get current subscription from subscription store
  const { subscriptionItems: currentSubscriptions, loading: subscriptionLoading, discountWarning } = useSelector(
    (state) => state.subscription
  );

  // State for same plan detection
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [isSamePlan, setIsSamePlan] = useState(false);

  // Calculate tool price based on pricing_mode and location
  const calculateToolPrice = useCallback((tool) => {
    const basePrice = tool.base_price ?? tool.price ?? 0;
    const pricingMode = tool.pricing_mode || 'fixed';
    const locationMultiplier = tool.location_multiplier || 1.0;

    if (pricingMode === 'multiplier') {
      // Always apply the multiplier for multiplier mode
      // For 1 location: basePrice * 1 * locationMultiplier
      // For multiple locations: basePrice * locations * locationMultiplier
      return basePrice * selectedLocations * locationMultiplier;
    }
    return basePrice;
  }, [selectedLocations]);

  // Get plan base price from location_pricing
  const getPlanBasePrice = useCallback((plan) => {
    if (!plan) return 0;
    const locationTiers = plan.location_pricing || [];
    const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
    const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
    return currentTier?.special_price > 0
      ? currentTier.special_price
      : (currentTier?.price || plan.platform_price || 0);
  }, [selectedLocations]);

  // Calculate pricing data
  const pricingData = useMemo(() => {
    if (!selectedPlan) return null;

    const planBasePrice = getPlanBasePrice(selectedPlan);
    const selectedToolsData = selectedPlan.tools?.filter(tool =>
      selectedTools.includes(tool._id)
    ) || [];

    // If plan base price is zero (trial/free), tools are also free
    const toolsTotal = planBasePrice === 0 ? 0 : selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
    const subtotal = toolsTotal + planBasePrice;
    const taxRate = Number(tax_info?.value || 0);
    const taxPrice = (subtotal * taxRate) / 100;
    const totalPrice = subtotal + taxPrice;

    return {
      selectedToolsData,
      toolsTotal,
      planBasePrice,
      subtotal,
      taxPrice,
      totalPrice,
      selectedLocations
    };
  }, [selectedPlan, selectedTools, tax_info, selectedLocations, calculateToolPrice, getPlanBasePrice]);

  const [retryAttempt, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isTrialEligible, setIsTrialEligible] = useState(true); // Default to true, will be checked via API
  const [trialEligibilityChecked, setTrialEligibilityChecked] = useState(false);
  const dashboardUrl = `${appsRoot}/dashboard`;
  const navigate = useNavigate();
  const store = useSelector((state) => state.auth);
  const payment =useSelector((state)=>state.payment);

  // Check trial eligibility when component mounts
  useEffect(() => {
    const checkTrialEligibility = async () => {
      try {
        console.log('🔍 Checking trial eligibility...');

        const response = await axios.get('/subscription/trial-eligibility');

        console.log('📦 Full API Response:', JSON.stringify(response.data, null, 2));
        console.log('📦 response.data:', response.data);
        console.log('📦 response.data.data:', response.data.data);

        // Extract eligible field from response
        const data = response.data;
        let eligible = false;

        if (data.data && typeof data.data.eligible !== 'undefined') {
          eligible = data.data.eligible;
          console.log('✅ Found eligible at data.data.eligible:', eligible);
        } else if (typeof data.eligible !== 'undefined') {
          eligible = data.eligible;
          console.log('✅ Found eligible at data.eligible:', eligible);
        } else {
          console.error('❌ Could not find eligible field. Response structure:', data);
        }

        console.log('📊 Setting isTrialEligible to:', eligible);
        setIsTrialEligible(eligible);
        console.log('✅ Trial eligibility checked:', eligible ? 'ELIGIBLE (No subscription history)' : 'NOT ELIGIBLE (Has subscription history)');
      } catch (error) {
        console.error('❌ Trial eligibility error:', error);
        console.error('❌ Error details:', error.response?.data);
        setIsTrialEligible(false);
      } finally {
        setTrialEligibilityChecked(true);
      }
    };

    checkTrialEligibility();
  }, []);

  // Fetch current company subscription on mount
  useEffect(() => {
    dispatch(getCompanySubscriptionList({
      page: 1,
      perPage: 10,
      search: '',
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }));
  }, [dispatch]);

  // Set current active subscription when subscriptions are loaded
  useEffect(() => {
    if (currentSubscriptions && Array.isArray(currentSubscriptions) && currentSubscriptions.length > 0) {
      // Find the active subscription (not cancelled, not expired)
      const activeSub = currentSubscriptions.find(
        (sub) => sub.status === 'active' || sub.status === 'trial'
      );
      if (activeSub) {
        setCurrentSubscription(activeSub);
      }
    }
  }, [currentSubscriptions]);

  // Detect if selected plan is the same as current subscription plan
  useEffect(() => {
    if (selectedPlan && currentSubscription) {
      const currentPlanId = currentSubscription.plan_id?._id || currentSubscription.plan_id;
      const isSame = selectedPlan._id === currentPlanId;
      setIsSamePlan(isSame);
    } else {
      setIsSamePlan(false);
    }
  }, [selectedPlan, currentSubscription]);

  // Check for discount warning when plan or locations change
  useEffect(() => {
    if (currentSubscription?._id && selectedLocations) {
      // Only check if the subscription has a discount applied
      if (currentSubscription.discount_id || currentSubscription.discount_code) {
        dispatch(validateDiscountOnPlanChange({
          subscriptionId: currentSubscription._id,
          newLocations: selectedLocations
        }));
      }
    }

    // Clean up discount warning on unmount
    return () => {
      dispatch(clearDiscountWarning());
    };
  }, [currentSubscription, selectedLocations, dispatch]);

  useEffect(() => {
    if (plansLoading?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [plansLoading?.loading])

  // Fetch plans on component mount (only once) - fetch all plans
  useEffect(() => {
    dispatch(fetchPlans());
  }, [dispatch]);

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
      navigate(`${appsRoot}/dashboard`, { replace: true });
    }
  }, [store.actionFlag])

  useEffect(() => {
    if (trialSuccess && trialActionFlag.includes('TRIAL')) {
      dispatch(getAuthMe({}));
      Notification('Success', trialSuccess, 'success');
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

      // Auto-select first plan if no plan is selected
      const filteredPlans = plans.filter((plan) => {
        // Hide trial plans if user has existing subscriptions
        if (plan.trial === true) {
          return isTrialEligible && billingCycle === 'TRIAL';
        }
        // NEVER show lifetime plans to company admins (only super admins can assign them)
        if (plan.is_lifetime === true) {
          return false;
        }
        return plan.duration_type === billingCycle;
      });
      if (filteredPlans.length > 0) {
        dispatch(autoSelectFirstPlan(filteredPlans));
      }
    }
  }, [plans, billingCycle, dispatch, isTrialEligible]);

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
     navigate(`${appsRoot}/profile/subscription/payment/upgrade`);
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
    // Hide trial plans if user has existing subscriptions
    if (plan.trial === true) {
      const showTrial = isTrialEligible && billingCycle === 'TRIAL';
      console.log(`Trial plan "${plan.name}": isTrialEligible=${isTrialEligible}, billingCycle=${billingCycle}, showing=${showTrial}`);
      return showTrial;
    }
    // NEVER show lifetime plans to company admins (only super admins can assign them)
    if (plan.is_lifetime === true) {
      console.log(`Lifetime plan "${plan.name}": HIDDEN from company admin`);
      return false;
    }
    return plan.duration_type === billingCycle;
  });

  console.log(`📊 Filtered plans for ${billingCycle}:`, filteredPlans.map(p => p.name));

  return (
    <ErrorBoundary>
      <div className="card register-steps-main upgradesubscriptionplan pb-0">

        <div className="card-body p-0">
          <form onSubmit={formik.handleSubmit}>
            {/* Billing Cycle Filter */}
            <BillingCycleFilter isTrialEligible={isTrialEligible} />

            <div className='upgradesubscriptionplan-tabbing-content'>
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
                    Try Again
                  </button>
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
                          <h4>⚠️ Please select at least one tool to continue</h4>
                          <p>
                            You must select at least one tool from the "
                            {selectedPlan.name}" plan to proceed with your
                            subscription.
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Same Plan Info Message */}
                  {isSamePlan && currentSubscription && (
                    <div className="same-plan-info-message" style={{
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                      border: '1px solid #ff9800',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      marginTop: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div className="d-flex align-items-start">
                        <AlertCircle size={24} className="text-warning me-3 flex-shrink-0" style={{ marginTop: '2px' }} />
                        <div>
                          <h5 style={{ color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                            You already have this plan
                          </h5>
                          <p style={{ color: '#6d4c41', marginBottom: '0.75rem' }}>
                            You are currently subscribed to the <strong>"{selectedPlan.name}"</strong> plan
                            {currentSubscription.locations && (
                              <> with <strong>{currentSubscription.locations}</strong> location{currentSubscription.locations > 1 ? 's' : ''}</>
                            )}.
                            {selectedLocations !== currentSubscription.locations && (
                              <> To change your location count to <strong>{selectedLocations}</strong>, you can edit your existing subscription.</>
                            )}
                          </p>
                          <Link
                            to={`${appsRoot}/profile/subscription/edit/${currentSubscription._id}`}
                            className="btn btn-warning btn-sm d-inline-flex align-items-center"
                            style={{
                              background: '#ff9800',
                              border: 'none',
                              color: '#fff',
                              fontWeight: '500'
                            }}
                          >
                            <Edit size={16} className="me-1" />
                            Edit Existing Subscription
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discount Warning Message */}
                  {discountWarning && discountWarning.hasDiscount && discountWarning.willLoseDiscount && (
                    <div className="discount-warning-message" style={{
                      background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      marginTop: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div className="d-flex align-items-start">
                        <AlertTriangle size={24} className="text-warning me-3 flex-shrink-0" style={{ marginTop: '2px', color: '#ff8f00' }} />
                        <div>
                          <h5 style={{ color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Discount Warning
                          </h5>
                          <p style={{ color: '#6d4c41', marginBottom: '0.75rem' }}>
                            {discountWarning.warning}
                          </p>
                          {discountWarning.discountInfo && (
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.7)',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              marginTop: '0.5rem'
                            }}>
                              <p style={{ color: '#5d4037', margin: 0 }}>
                                <strong>Current Discount:</strong> {discountWarning.discountInfo.discount_code}
                                {' '}
                                ({discountWarning.discountInfo.discount_type === 'percentage'
                                  ? `${discountWarning.discountInfo.discount_value}%`
                                  : `$${discountWarning.discountInfo.discount_value}`})
                                {discountWarning.discountInfo.remaining_months && (
                                  <span className="ms-2">
                                    - {discountWarning.discountInfo.remaining_months} months remaining
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan Summary Section - Only show when tools are selected (skip for trial plans) */}
                  {selectedPlan && pricingData && (
                      <div className="plan-summary-section">
                        <h3 className="text-white">Plan Summary</h3>
                        <div className="simple-plan-summary">
                          <div className="plan-summary-row">
                            <div className="plan-name-info">
                              <span className="plan-name">
                                {selectedPlan.name}
                                <small className="text-muted ms-2">
                                  ({selectedLocations} {selectedLocations === 1 ? 'Location' : 'Locations'})
                                </small>
                              </span>
                            </div>
                            <div className="plan-price-info">
                              <span className="plan-price">
                                {pricingData.planBasePrice > 0 ? formatPrice(pricingData.planBasePrice) : 'Free'}
                              </span>
                            </div>
                          </div>

                          {/* Invoice-Style Pricing Breakdown */}
                          {selectedPlan.tools && selectedPlan.tools.length > 0 && (
                              <div className="invoice-summary">
                                <h5>Pricing Breakdown</h5>
                                <div className="invoice-items">
                                  <div className='selected-tools'>
                                    {/* Individual Tool Prices - Only show selected tools */}
                                    {pricingData.selectedToolsData
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map((tool) => {
                                        const toolPrice = pricingData.planBasePrice === 0 ? 0 : calculateToolPrice(tool);
                                        const isMultiplier = tool.pricing_mode === 'multiplier';

                                        return (
                                          <div
                                            key={tool._id}
                                            className="invoice-item selected"
                                          >
                                            <span className="item-name">
                                              {tool.name}
                                              {isMultiplier && selectedLocations > 1 && pricingData.planBasePrice > 0 && (
                                                <small className="text-muted ms-1">
                                                  (×{selectedLocations})
                                                </small>
                                              )}
                                            </span>
                                            <span className="item-price">
                                              {toolPrice > 0
                                                ? formatPrice(toolPrice)
                                                : 'Free'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                  </div>

                                  {/* Tools Subtotal */}
                                  <div className="invoice-subtotal">
                                    <span className="subtotal-label">
                                      Tools Subtotal:
                                    </span>
                                    <span className="subtotal-price">
                                      {pricingData.toolsTotal > 0 ? formatPrice(pricingData.toolsTotal) : 'Free'}
                                    </span>
                                  </div>

                                  {/* Subtotal */}
                                  <div className="invoice-subtotal">
                                    <span className="subtotal-label">
                                      Subtotal:
                                    </span>
                                    <span className="subtotal-price">
                                      {pricingData.subtotal > 0 ? formatPrice(pricingData.subtotal) : 'Free'}
                                    </span>
                                  </div>

                                  {/* Tax */}
                                  {tax_info?.label && pricingData.subtotal > 0 && (
                                    <div className="invoice-item">
                                      <span className="subtotal-label">
                                        {`${tax_info.label} (${tax_info.value}%)`}
                                      </span>
                                      <span className="item-price">
                                        {formatPrice(pricingData.taxPrice)}
                                      </span>
                                    </div>
                                  )}

                                  {/* Total */}
                                  <div className="invoice-total">
                                    <span className="total-label">
                                      Total Price:
                                    </span>
                                    <span className="total-price">
                                      {pricingData.totalPrice > 0 ? formatPrice(pricingData.totalPrice) : 'Free'}
                                    </span>
                                  </div>
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
                    No plans available for {billingCycle.toLowerCase()} billing.
                  </p>
                  <p>Please try switching to a different billing cycle.</p>
                </div>
              )}

              {/* Form Validation Error */}
              {formik.touched.selectedPlanId && formik.errors.selectedPlanId && (
                <p className="error plan-selection-error">
                  {formik.errors.selectedPlanId}
                </p>
              )}

              {/* Navigation Buttons */}
              <div className="form-actions mt-2 mb-2 mb-md-0 d-flex justify-content-end">
                <button type="button" className="btn-back mb-2" onClick={() => navigate(`${appsRoot}/profile`)} >
                  {/* <ArrowLeft size={17} /> */}
                  Back
                </button>

                <button
                  type="submit"
                  className="btn-next mb-2"
                  disabled={
                    !selectedPlan ||
                    plansLoading ||
                    trialLoading ||
                    isSamePlan ||
                    (selectedPlan.trial !== true && selectedTools.length === 0)
                  }
                >
                  {plansLoading || trialLoading
                    ? 'Loading...'
                    : isSamePlan
                      ? 'Same Plan Selected'
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

export default UpgradeSubscription;
