import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { confirmRedirectPaypalPayment, cleanPaymentMessage } from './store';
import Notification from '@src/@core/components/toast/notification';
import { appsRoot } from '@constant/defaultValues';
import { useCurrency } from '@src/utility/context/CurrencyContext';
import './Step4PaymentProcess.scss';
import { useTranslation } from "react-i18next";
import { setCurrentUser, setAccessToken, setRefreshToken } from '@src/utility/Utils';
import { AbilityContext } from '@src/utility/context/Can';

const Step4PaymentProcess = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const ability = useContext(AbilityContext);
  const { getCurrencySymbol } = useCurrency();

  const [retryCount, setRetryCount] = useState(0);
  const [timeoutId, setTimeoutId] = useState(null);
  const confirmationRequested = useRef(false);
  const successHandled = useRef(false);

  const {
    paymentLoading,
    paymentActionFlag,
    paymentSuccess,
    paymentError,
    paymentItem,
    registerItem: storeRegisterItem,
  } = useSelector((state) => state.register);

  const registerItem = storeRegisterItem?._id
    ? storeRegisterItem
    : JSON.parse(localStorage.getItem("registerItem") || "{}");

  // Extract URL parameters
  const searchParams = new URLSearchParams(location.search);
  console.log("🚀 ~ Step4PaymentProcess ~ searchParams: STEP 4", searchParams)
  const state = searchParams.get('state');
  const action = searchParams.get('action');
  const requestId = searchParams.get('request_id');

  // Handle payment confirmation
  useEffect(() => {
    if (requestId && registerItem?._id && !confirmationRequested.current) {
      confirmationRequested.current = true;
      const confirmPayment = () => {
        dispatch(
          confirmRedirectPaypalPayment({
            lang: 'en',
            request_id: requestId,
            state,
            action,
            customer_id: registerItem._id,
            user_id: registerItem._id,
            retry_attempt: 0,
            timestamp: new Date().toISOString(),
            source: 'redirect_confirmation'
          }),
        );
      };

      // Initial confirmation attempt
      confirmPayment();

      // Set timeout for payment processing (30 seconds)
      const timeout = setTimeout(() => {
        if (paymentLoading) {
          dispatch(cleanPaymentMessage());
          Notification(
            'Warning',
            'Payment processing is taking longer than expected. Please contact support if the issue persists.',
            'warning',
          );
        }
      }, 30000);

      setTimeoutId(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else if (!requestId && !confirmationRequested.current) {
      // No request ID, redirect back to payment step
      console.log("Missing Request ID, redirecting back");
      // navigate(`${appsRoot}/register/step3`, { replace: true }); // Commented out to avoid premature redirect loop if params are slow
    }
  }, [requestId, registerItem, dispatch, navigate, state, action]);

  // Handle payment confirmation response
  useEffect(() => {
    if (paymentActionFlag === 'PPAL_RDRT_PMNT_CNFRM_SCS' && paymentItem) {
      if (paymentItem._id && paymentItem.status === 'completed' && !successHandled.current) {
        successHandled.current = true;

        // Update user authentication
        const updateUserAuth = async () => {
          try {
            // Use the updated user object from response if available, or fallback to registerItem
            const userToSave = paymentItem.user || registerItem;

            // If the response contains tokens, usage them
            if (paymentItem.token) {
              await setCurrentUser(userToSave);
              await setAccessToken(paymentItem.token.accessToken);
              await setRefreshToken(paymentItem.token.refreshToken);
            } else if (registerItem.token) {
              // Fallback to existing token if valid
              await setCurrentUser(registerItem);
              await setAccessToken(registerItem.token.accessToken);
              await setRefreshToken(registerItem.token.refreshToken);
            }

            // Update user abilities
            if (ability && (paymentItem.ability || registerItem.ability)) {
              ability.update(paymentItem.ability || registerItem.ability);
            }

            // Dispatch clean message to clear flag from logic, though Ref protects us
            dispatch(cleanPaymentMessage());

            // Set justSignedUp flag for dashboard welcome banner and redirect
            localStorage.setItem('justSignedUp', 'true');

            // Always redirect to dashboard - dashboard will handle the welcome banner and redirect to appointment app
            setTimeout(() => {
              navigate(`${appsRoot}/dashboard`, { replace: true });
            }, 1000);

          } catch (error) {
            console.error('Error updating user authentication:', error);
            Notification('Error', 'Failed to setup session. Please login.', 'warning');
            setTimeout(() => {
              navigate(`${appsRoot}/login`, { replace: true });
            }, 2000);
          }
        };

        updateUserAuth();
      }
    }

    // Handle messages
    if (paymentActionFlag || paymentSuccess || paymentError) {
      // Only show success notification if NOT handled above (avoid double)
      if (paymentSuccess && !successHandled.current && !paymentActionFlag.includes('SCS')) {
        // Success notification handled on dashboard redirect
      }

      if (paymentError) {
        Notification('Error', paymentError, 'warning');

        // Retry logic for failed payments
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            if (requestId && registerItem?._id) {
              dispatch(
                confirmRedirectPaypalPayment({
                  lang: 'en',
                  request_id: requestId,
                  state,
                  action,
                  customer_id: registerItem._id,
                  user_id: registerItem._id,
                  retry_attempt: retryCount + 1,
                  timestamp: new Date().toISOString(),
                  source: 'payment_retry',
                }),
              );
            }
          }, 3000);
        }
      }

      // Clean messages
      setTimeout(() => {
        dispatch(cleanPaymentMessage());
      }, 500);
    }
  }, [
    paymentActionFlag,
    paymentSuccess,
    paymentError,
    paymentItem,
    dispatch,
    retryCount,
    requestId,
    registerItem,
    state,
    action,
    navigate,
    ability
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const handleRetryPayment = () => {
    if (requestId && registerItem?._id) {
      setRetryCount((prev) => prev + 1);
      dispatch(
        confirmRedirectPaypalPayment({
          lang: 'en',
          request_id: requestId,
          state,
          action,
          customer_id: registerItem._id,
          user_id: registerItem._id,
          retry_attempt: retryCount + 1,
          timestamp: new Date().toISOString(),
          source: 'manual_retry',
        }),
      );
    }
  };

  const handleBackToPayment = () => {
    navigate(`${appsRoot}/register/step3`, { replace: true });
  };

  const getStatusMessage = () => {
    if (paymentLoading) {
      return useTranslation().t ? useTranslation().t('Please wait while we confirm your payment...') : 'Processing payment...';
    }

    if (paymentError) {
      return 'Something went wrong while processing your payment. Please try again.';
    }

    if (paymentItem?.status === 'completed') {
      return 'Payment confirmed successfully! Redirecting...';
    }

    return 'Processing your payment...';
  };

  const getStatusIcon = () => {
    if (paymentItem?.status === 'completed') {
      return '✅';
    }

    if (paymentError) {
      return '❌';
    }

    return getCurrencySymbol();
  };

  return (
    <div className="payment-process-container">
      <div className="payment-process-content">
        {/* Logo/Brand */}
        <div className="brand-logo">
          <div className="logo-placeholder">
            <span className="logo-text">RansomBloc</span>
          </div>
        </div>

        {/* Status Display */}
        <div className="payment-status">
          <div
            className={`status-icon ${paymentLoading ? 'loading' : ''} ${paymentError ? 'error' : ''} ${paymentItem?.status === 'completed' ? 'success' : ''}`}
          >
            {paymentLoading ? (
              <div className="payment-loader">
                <div className="payment-circle">
                  <div className="payment-inner-circle" />
                  <h1 className="text-loader">{getCurrencySymbol()}</h1>
                </div>
              </div>
            ) : (
              <span className="status-emoji">{getStatusIcon()}</span>
            )}
          </div>

          <div className="status-message">
            <h2>{getStatusMessage()}</h2>

            {retryCount > 0 && retryCount < 3 && (
              <p className="retry-info">Retry attempt {retryCount} of 3...</p>
            )}

            {paymentItem?.status === 'completed' && (
              <p className="success-info">
                Your registration is now complete. You will be redirected to the
                dashboard shortly.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {paymentError && retryCount >= 3 && (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleRetryPayment}
              disabled={paymentLoading}
            >
              Try Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleBackToPayment}
              disabled={paymentLoading}
            >
              Back to Payment
            </button>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-steps">
            <div className="step completed">
              <span className="step-number">1</span>
              <span className="step-label">Company Details</span>
            </div>
            <div className="step completed">
              <span className="step-number">2</span>
              <span className="step-label">Plan Selection</span>
            </div>
            <div className="step completed">
              <span className="step-number">3</span>
              <span className="step-label">Payment</span>
            </div>
            <div
              className={`step ${paymentItem?.status === 'completed' ? 'completed' : 'active'}`}
            >
              <span className="step-number">4</span>
              <span className="step-label">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icon">🔒</div>
          <div className="security-text">
            <strong>Secure Transaction</strong>
            <br />
            Your payment is being processed securely through PayPal
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4PaymentProcess;
