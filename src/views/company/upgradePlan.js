import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { ArrowLeft } from 'react-feather';
import {
  fetchPlans,
  cleanPlansMessage,
  autoSelectFirstPlan,
  startTrial,
  cleanTrialMessage,
} from '@src/views/auth/register/store/';
import BillingCycleFilter from '@src/views/auth/register/components/BillingCycleFilter';
import PlanCard from '@src/views/auth/register/components/PlanCard';
import { formatPrice } from '@src/views/auth/register/utils/paymentValidation';

import ErrorBoundary from '@src/views/auth/register/components/ErrorBoundary';
import { PlanCardSkeletonGrid } from '@src/views/auth/register/components/PlanCardSkeleton';
import LoadingSpinner from '@src/views/auth/register/components/LoadingSpinner';
import Notification from '@src/@core/components/toast/notification';
import {
  validatePlansArray,
  handleNetworkError,
  getRetryConfig,
} from '@src/views/auth/register/utils/planValidation';
import '@src/views/auth/register/Step2Plan.css';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { appsRoot } from '@constant/defaultValues';
import { startLoading, stopLoading } from '@src/views/loadingstore';
import { getAuthMe } from '@src/views/auth/store/';
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2";
import axios from '@src/utility/AxiosConfig';

import {
  getCompany,
} from "@src/views/auth/profile/editCompany/store/";
const UpgradePlan = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const {
    plans,
    filters,
    pagination,
    plansLoading,
    planSelection,
    actionFlag,
    success,
    error,
    storedCards,
    trialLoading,
    trialActionFlag,
    trialSuccess,
    trialError,
    tax_info
  } = useSelector((state) => state.register);
  const { selectedPlan, selectedTools, billingCycle, selectedLocations: storeLocations } = planSelection;
  // Ensure selectedLocations has a default value of 1
  const selectedLocations = storeLocations || 1;

  // Calculate tool price based on pricing_mode and location
  const calculateToolPrice = useCallback((tool) => {
    const basePrice = tool.base_price ?? tool.price ?? 0;
    const pricingMode = tool.pricing_mode || 'fixed';
    const locationMultiplier = tool.location_multiplier || 1.0;

    if (pricingMode === 'multiplier') {
      // Always apply the multiplier for multiplier mode
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

  const Id = useSelector((state) => state.company?.companyItem?._id)
  // user._id is set by mapGet when join populates the user; fall back to user_id (plain UUID) for PostgreSQL
  const CompanyId = useSelector((state) =>
    state.company?.companyItem?.user?._id || state.company?.companyItem?.user_id
  )

  const [retryAttempt, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isTrialEligible, setIsTrialEligible] = useState(true); // Default to true, will be checked via API
  const [trialEligibilityChecked, setTrialEligibilityChecked] = useState(false);
  const dashboardUrl = `${appsRoot}/dashboard`;
  const navigate = useNavigate();
  const store = useSelector((state) => state.auth);
  const payment = useSelector((state) => state.payment);

  // Get user role - Super Admin can assign any plan
  const userRole = store?.authUserItem?.role?.name;
  const isSuperAdmin = userRole === "Admin" || userRole === "Super Admin";

  const { id } = useParams();

  useEffect(() => {
    if (id) dispatch(getCompany({ id }));
  }, [id, dispatch]);

  // Check trial eligibility when component mounts
  useEffect(() => {
    const checkTrialEligibility = async () => {
      try {
        console.log('🔍 Checking trial eligibility (Super Admin)...');

        const response = await axios.get('/subscription/trial-eligibility');

        console.log('📦 Super Admin - API Response:', response.data);

        const data = response.data;
        let eligible = false;

        if (data.data && typeof data.data.eligible !== 'undefined') {
          eligible = data.data.eligible;
        } else if (typeof data.eligible !== 'undefined') {
          eligible = data.eligible;
        }

        console.log('📊 Super Admin - Setting isTrialEligible to:', eligible);
        setIsTrialEligible(eligible);
      } catch (error) {
        console.error('❌ Trial eligibility error (Super Admin):', error);
        console.error('❌ Error details:', error.response?.data);
        // If API fails, default to not eligible (safer)
        setIsTrialEligible(false);
      } finally {
        setTrialEligibilityChecked(true);
      }
    };

    checkTrialEligibility();
  }, []);

  // Manage page loader for both plansLoading and trialLoading
  useEffect(() => {
    if (plansLoading?.loading || trialLoading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [plansLoading?.loading, trialLoading, dispatch])

  // Fetch plans on component mount (only once) - fetch all plans

  useEffect(() => {
    dispatch(fetchPlans());

    return () => {
      dispatch(cleanPlansMessage()); // Reset plans state
    };
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
    }
  }, [store.actionFlag])

  useEffect(() => {
    if (trialSuccess && trialActionFlag.includes('TRIAL')) {
      dispatch(getAuthMe({}));
      Notification('Success', trialSuccess, 'success');
      navigate(`${appsRoot}/company/view/${Id}`);
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

        // Super Admin can see all plans
        if (isSuperAdmin) {
          if (plan.trial === true) {
            return billingCycle === 'TRIAL';
          }
          if (plan.is_lifetime === true) {
            return billingCycle === 'LIFETIME';
          }
          if (billingCycle === 'YEARLY') {
            return plan.is_lifetime === false && plan.duration_type === 'YEARLY'
          }
          return plan.duration_type === billingCycle && plan.is_lifetime === false;
        }

        // For non-super admins, hide trial/lifetime plans if user has existing subscriptions
        if (plan.trial === true) {
          return isTrialEligible && billingCycle === 'TRIAL';
        }
        if (plan.is_lifetime === true) {
          return isTrialEligible && billingCycle === 'LIFETIME';
        }
        if (billingCycle === 'YEARLY') {
          return plan.is_lifetime === false && plan.duration_type === 'YEARLY'
        }
        if (billingCycle === 'LIFETIME') {
          return plan.is_lifetime === true
        }
        return plan.duration_type === billingCycle && plan.is_lifetime === false; ;
      });
      if (filteredPlans.length > 0) {
        dispatch(autoSelectFirstPlan(filteredPlans));
      }
    }
  }, [plans, billingCycle, dispatch, isTrialEligible, isSuperAdmin]);
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
      if ((selectedPlan.trial !== true && selectedPlan.is_lifetime !== true) && selectedTools.length === 0) {
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
      if (selectedPlan.trial === true || selectedPlan.is_lifetime === true) {
        // For trial plans, call the start trial API
        const selectedToolsData = selectedPlan.tools.filter((tool) =>
          selectedTools.includes(tool._id),
        );
        const trialPayload = {
          planId: selectedPlan._id,
          tools: selectedToolsData,
          user_id: CompanyId,
          locations: selectedLocations, // Include location count for lifetime plans
        };
        dispatch(startTrial(trialPayload)).unwrap();

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
      navigate(`${appsRoot}/company/payment/upgrade/${Id}`);
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
    // Super Admin can see all plans
    if (isSuperAdmin) {
      if (plan.trial === true) {
        return billingCycle === 'TRIAL';
      }
      if (plan.is_lifetime === true) {
        return billingCycle === 'LIFETIME';
      }
      if (billingCycle === 'YEARLY') {
        return plan.is_lifetime === false && plan.duration_type === billingCycle
      }
      return plan.duration_type === billingCycle && plan.is_lifetime === false;
    }

    // For non-super admins, hide trial/lifetime plans if user has existing subscriptions
    if (plan.trial === true) {
      return isTrialEligible && billingCycle === 'TRIAL';
    }
    if (plan.is_lifetime === true) {
      return isTrialEligible && billingCycle === 'LIFETIME';
    }
    if (planSelection?.selectedPlan?.is_lifetime && plan.lifetime === true) {
      return billingCycle === 'LIFETIME'
    }
    if (billingCycle === 'YEARLY') {
      return plan.is_lifetime === false && plan.duration_type === billingCycle
    }
    if (billingCycle === 'LIFETIME') {
      return plan.is_lifetime === true
    }
    return plan.duration_type === billingCycle && plan.is_lifetime === false;
  });


  const handlePlanConfirm = () => {
    Swal.fire({
      title: t("Are you sure?"),
      text: (selectedPlan?.name),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, continue!"),
      cancelButtonText: t("No"),
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-danger ms-1",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        formik.handleSubmit();
      }
    });
  };
console.log("trial",selectedPlan?.trial)
  return (
    <ErrorBoundary>
      <div className="card register-steps-main pb-0">

        <div className="card-body p-0">
          <form onSubmit={formik.handleSubmit}>
            {/* Billing Cycle Filter */}
            <BillingCycleFilter isTrialEligible={isSuperAdmin ? true : isTrialEligible} />

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

                {/* Plan Summary Section - Only show when tools are selected (skip for trial plans) */}
                {selectedPlan && pricingData && (
                    <div className="plan-summary-section">
                      <h3 className="text-white">{t('Plan Summary')}</h3>
                      <div className="simple-plan-summary">
                        <div className="plan-summary-row">
                          <div className="plan-name-info">
                            <span className="plan-name">
                              {selectedPlan.name}
                              <small className="text-muted ms-2">
                                ({selectedLocations} {selectedLocations === 1 ? t('Location') : t('Locations')})
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
                              <h5>{t('Pricing Breakdown')}</h5>
                              <div className="invoice-items">
                                <div className='selected-tools'>
                                  {/* Individual Tool Prices - Only show selected tools */}
                                  {pricingData.selectedToolsData
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((tool) => {
                                      const toolPrice = pricingData.planBasePrice === 0 ? 0 : calculateToolPrice(tool);
                                      const isMultiplier = tool.pricing_mode === 'multiplier';
                                      const basePrice = tool.base_price ?? tool.price ?? 0;

                                      return (
                                        <div
                                          key={tool._id}
                                          className="invoice-item selected"
                                        >
                                          <span className="item-name">
                                            {tool.name}
                                            {isMultiplier && pricingData.planBasePrice > 0 && (
                                              <span className="badge bg-light text-dark ms-1" style={{fontSize: '0.7rem'}}>
                                                {t('Per Location')}
                                              </span>
                                            )}
                                          </span>
                                          <span className="item-price">
                                            {toolPrice > 0
                                              ? formatPrice(toolPrice)
                                              : 'Free'}
                                            {isMultiplier && selectedLocations > 1 && pricingData.planBasePrice > 0 && (
                                              <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>
                                                {formatPrice(basePrice)} × {selectedLocations} × {tool.location_multiplier || 1}
                                              </small>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>

                                {/* Tools Subtotal */}
                                <div className="invoice-subtotal">
                                  <span className="subtotal-label">
                                    {t('Tools Subtotal:')}
                                  </span>
                                  <span className="subtotal-price">
                                    {pricingData.toolsTotal > 0 ? formatPrice(pricingData.toolsTotal) : 'Free'}
                                  </span>
                                </div>

                                {/* Subtotal */}
                                <div className="invoice-subtotal">
                                  <span className="subtotal-label">
                                    {t('Subtotal:')}
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
                                    {t('Total Price:')}
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
                  {t('No plans available for')} {billingCycle.toLowerCase()} {t('billing.')}
                </p>
                <p>{t('Please try switching to a different billing cycle.')}</p>
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
              <button type="button" className="btn-back mb-2" onClick={() => navigate(`${appsRoot}/company/view/${Id}`)} >
                {/* <ArrowLeft size={17} /> */}
                Back
              </button>

              <button
                type="button"
                className="btn-next mb-2"
                disabled={
                  !selectedPlan ||
                  plansLoading ||
                  trialLoading ||
                  (selectedPlan.trial !== true || selectedPlan.is_lifetime !== true) && (selectedTools.length === 0)

                }
                onClick={handlePlanConfirm}
              >
                {
                  plansLoading || trialLoading
                    ? 'Loading...'
                    : selectedPlan?.trial === true
                      ? 'Start Free Trial'
                      : selectedPlan?.is_lifetime === true
                        ? 'Start Lifetime Plan'
                        : 'Continue'
                }

              </button>
            </div>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default UpgradePlan;
