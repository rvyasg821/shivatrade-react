/* eslint-disable no-useless-return */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import { ArrowLeft } from 'react-feather';
import BillingCycleFilter from '../auth/register/components/BillingCycleFilter';
import PlanCard from '../auth/register/components/PlanCard';

import ErrorBoundary from '../auth/register/components/ErrorBoundary';
import { PlanCardSkeletonGrid } from '../auth/register/components/PlanCardSkeleton';
import LoadingSpinner from '../auth/register/components/LoadingSpinner';
import Notification from '@src/@core/components/toast/notification';
import {
  validatePlansArray,
  handleNetworkError,
  getRetryConfig,
} from '../auth/register/utils/planValidation';
// import './Step2Plan.css';
import '../auth/register/Step2Plan.css'
import { Link, useNavigate } from 'react-router-dom';
import { appsRoot } from '@constant/defaultValues';
import { autoSelectFirstPlan, cleanPlansMessage, cleanTrialMessage, fetchPlans, startTrial } from './register/store';
import { startLoading, stopLoading } from '../loadingstore';
import { useCurrency } from '@src/utility/context/CurrencyContext';

const PlanSelection = ({ user }) => {
  const dispatch = useDispatch();
  const { currency } = useCurrency();
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  useEffect(() => {
          //  dispatch(getAuthMe({}));
   
  }, [])
  
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
  const { selectedPlan, selectedTools, billingCycle } = planSelection;

  const [retryAttempt, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const dashboardUrl = `${appsRoot}/dashboard`;
  const navigate = useNavigate();

  useEffect(() => {
    if (plansLoading?.loading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [plansLoading?.loading])

  // Fetch plans on component mount (only once) - fetch all plans
  useEffect(() => {
    if (authUserItem?._id) {
      dispatch(fetchPlans());
    } else {
      navigate(`/login`, { replace: true });
    }
  }, [authUserItem, dispatch, navigate]);

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

  // Handle trial success and redirect to dashboard
  useEffect(() => {
    if (trialSuccess && trialActionFlag.includes('TRIAL')) {
      Notification('Success', trialSuccess, 'success');
      dispatch(cleanTrialMessage());

      // Redirect to dashboard after successful trial start
      // navigate(`${appsRoot}/dashboard`, { replace: true });
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
        // console.warn('Plan validation errors:', errors);
      }

      // Auto-select first plan if no plan is selected
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
  }, [plans, billingCycle, dispatch]);

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
      console.log('ONSUBMIT ??');

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

      // Proceed to next step for regular plans
      // nextStep();
      console.log('LAST LINE OF ONSUBMIT ??');
      navigate(`/plan-payment`, { replace: true });
      console.log('AFTER NAVIGATE LAST LINE OF ONSUBMIT ??');

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
      <div className="card register-steps-main p-2 m-2 m-md-3">
        <div className="card-header">
          <h2 className="form-section-title">Choose Your Plan</h2>
          <hr className="section-divider" />
        </div>

        <div className="card-body p-0">
          <form onSubmit={formik.handleSubmit}>
            {/* Billing Cycle Filter */}
            <BillingCycleFilter />

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
                {selectedPlan &&
                  (selectedPlan.trial === true || selectedTools.length > 0) && (
                    <div className="plan-summary-section">
                      <h3>Plan Summary</h3>
                      <div className="simple-plan-summary">
                        <div className="plan-summary-row">
                          <div className="plan-name-info">
                            <span className="plan-name">
                              {selectedPlan.name}
                            </span>
                          </div>
                          <div className="plan-price-info">
                            {(() => {
                              const selectedToolsData =
                                selectedPlan.tools.filter((tool) =>
                                  selectedTools.includes(tool._id),
                                );
                              const toolsTotal = selectedToolsData.reduce(
                                (sum, tool) => sum + tool.price,
                                0,
                              );
                              const platformFee =
                                selectedPlan.platform_price || 0;
                              const totalPrice = toolsTotal + platformFee;

                              const formatPrice = (price) => {
                                return new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: currency.code,
                                  minimumFractionDigits: 2,
                                }).format(price);
                              };

                              const billingPeriod =
                                billingCycle === 'YEARLY'
                                  ? selectedPlan.duration === 1
                                    ? 'per year'
                                    : `per ${selectedPlan.duration} years`
                                  : selectedPlan.duration === 1
                                    ? 'per month'
                                    : `per ${selectedPlan.duration} months`;

                              return (
                                <>
                                  <span className="plan-price">
                                    {formatPrice(totalPrice)}
                                  </span>
                                  {/* <span className="plan-duration">
                                    {billingPeriod}
                                  </span> */}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Invoice-Style Pricing Breakdown */}
                        {selectedPlan.tools &&
                          selectedPlan.tools.length > 0 && (
                            <div className="invoice-summary">
                              <h5>Pricing Breakdown</h5>
                              <div className="invoice-items">
                                {/* Individual Tool Prices - Only show selected tools */}
                                {selectedPlan.tools.map((tool) => {
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

                                  return (
                                    <div
                                      key={tool._id}
                                      className="invoice-item selected"
                                    >
                                      <span className="item-name">
                                        {tool.name}
                                      </span>
                                      <span className="item-price">
                                        {tool.price > 0
                                          ? formatPrice(tool.price)
                                          : 'Free'}
                                      </span>
                                    </div>
                                  );
                                })}

                                {/* Subtotal */}
                                {(() => {
                                  const selectedToolsData =
                                    selectedPlan.tools.filter((tool) =>
                                      selectedTools.includes(tool._id),
                                    );
                                  const toolsTotal = selectedToolsData.reduce(
                                    (sum, tool) => sum + tool.price,
                                    0,
                                  );
                                  const platformFee =
                                    selectedPlan.platform_price || 0;
                                  // const totalPrice = toolsTotal + platformFee;

                                  const formatPrice = (price) => {
                                    return new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: currency.code,
                                      minimumFractionDigits: 2,
                                    }).format(price);
                                  };

                                  const totalPrice = toolsTotal + platformFee + ((toolsTotal+platformFee) * tax_info.value) / 100

                                 return (
                                    <>
                                      <div className="invoice-subtotal">
                                        <span className="subtotal-label">
                                          Tools Subtotal:
                                        </span>
                                        <span className="subtotal-price">
                                          {formatPrice(toolsTotal)}
                                        </span>
                                      </div>

                                      {/* Platform Fee */}
                                      {platformFee > 0 && (
                                        <div className="invoice-item">
                                          <span className="subtotal-label">
                                            Platform Fee
                                          </span>
                                          <span className="item-price">
                                            {formatPrice(platformFee)}
                                          </span>
                                        </div>
                                      )}

                                      {/*Tax */}
                                      {
                                        tax_info.label &&
                                        <div className="invoice-item">
                                          <span className="subtotal-label">
                                            {`${tax_info.label} (${tax_info.value}%)`}
                                          </span>
                                          <span className="item-price">
                                            {formatPrice(((toolsTotal+platformFee) * tax_info.value) / 100)}
                                          </span>
                                        </div>
                                      }

                                      {/* Total */}
                                      <div className="invoice-total">
                                        <span className="total-label">
                                          Total Price:
                                        </span>
                                        <span className="total-price">
                                          {formatPrice(totalPrice)}
                                        </span>
                                      </div>

                                      {/* Billing Period */}
                                      {/* <div className="billing-period">
                                        {billingCycle === 'YEARLY'
                                          ? selectedPlan.duration === 1
                                            ? 'per year'
                                            : `per ${selectedPlan.duration} years`
                                          : selectedPlan.duration === 1
                                            ? 'per month'
                                            : `per ${selectedPlan.duration} months`}
                                      </div> */}
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
            <div className="form-actions mt-2 text-end">
              {/* <button type="button" className="btn-back" 
              // onClick={prevStep}
              >
                <ArrowLeft size={17} />
                Back
              </button> */}

              <button
                type="submit"
                className="btn-next btn btn-primary"
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
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PlanSelection;
