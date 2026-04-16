import React, { useEffect, useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { cleanCreateAccountMessage, resetPaymentState } from './store';
import {
  setCurrentUser,
  setAccessToken,
  setRefreshToken,
} from '@src/utility/Utils';
import { AbilityContext } from '@src/utility/context/Can';
import { useCurrency } from '@src/utility/context/CurrencyContext';
import { appsRoot } from '@constant/defaultValues';
import instance from '@src/utility/AxiosConfig';
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints';
import './Step5ThankYou.scss';

const Step5ThankYou = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ability = useContext(AbilityContext);
  const { currency } = useCurrency();

  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { registerItem, planSelection, paymentItem } = useSelector(
    (state) => state.register,
  );
  const { selectedPlan, selectedTools } = planSelection;

  const dashboardUrl = `${appsRoot}/dashboard`;

  // Update user authentication and abilities
  useEffect(() => {
    if (registerItem?.token && registerItem?._id) {
      // Update user authentication
      const updateUserAuth = async () => {
        try {
          await setCurrentUser(registerItem);
          await setAccessToken(registerItem.token.accessToken);
          await setRefreshToken(registerItem.token.refreshToken);

          // Update user abilities
          if (ability && registerItem.ability) {
            ability.update(registerItem.ability);
          }
        } catch (error) {
          console.error('Error updating user authentication:', error);
        }
      };

      updateUserAuth();
    }
  }, [registerItem, ability]);

  // Countdown and redirect logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRedirecting(true);

          // Clean up registration state
          dispatch(cleanCreateAccountMessage());
          dispatch(resetPaymentState());

          // Redirect to dashboard
          setTimeout(() => {
            navigate(dashboardUrl, { replace: true });
          }, 500);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, dashboardUrl, dispatch]);

  const handleGoToDashboard = () => {
    setIsRedirecting(true);

    // Clean up registration state
    dispatch(cleanCreateAccountMessage());
    dispatch(resetPaymentState());

    // Navigate to dashboard
    navigate(dashboardUrl, { replace: true });
  };

  const getRedirectMessage = () => {
    return 'You will be automatically redirected to your dashboard';
  };

  const getButtonText = () => {
    return 'Go to Dashboard Now';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
    }).format(price);
  };

  const getSelectedToolsData = () => {
    if (!selectedPlan?.tools || !selectedTools?.length) return [];
    return selectedPlan.tools.filter((tool) =>
      selectedTools.includes(tool._id),
    );
  };

  return (
    <div className="thank-you-container">
      <div className="thank-you-content">
        {/* Success Animation */}
        <div className="success-animation">
          <div className="checkmark-circle">
            <div className="checkmark">✓</div>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="thank-you-message">
          <h1>Thank You!</h1>
          <p className="subtitle">
            Your registration and payment have been completed successfully.
          </p>
        </div>

        {/* Registration Summary */}
        <div className="registration-summary">
          <div className="summary-card">
            <h3>Registration Complete</h3>

            {/* User Info */}
            <div className="user-info">
              <div className="info-row">
                <span className="label">Company:</span>
                <span className="value">
                  {registerItem?.company_name || 'N/A'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{registerItem?.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">
                  {registerItem?.fname} {registerItem?.lname}
                </span>
              </div>
            </div>

            {/* Plan Info */}
            {selectedPlan && (
              <div className="plan-info">
                <h4>Selected Plan</h4>
                <div className="plan-details">
                  <div className="plan-name">{selectedPlan.name}</div>
                  {selectedPlan.description && (
                    <div className="plan-description">
                      {selectedPlan.description}
                    </div>
                  )}

                  {/* Selected Tools */}
                  {getSelectedToolsData().length > 0 && (
                    <div className="selected-tools">
                      <h5>Included Tools:</h5>
                      <ul>
                        {getSelectedToolsData().map((tool) => (
                          <li key={tool._id}>
                            <span className="tool-icon">✓</span>
                            <span className="tool-name">{tool.name}</span>
                            <span className="tool-price">
                              {tool.price > 0
                                ? formatPrice(tool.price)
                                : 'Included'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            {paymentItem && (
              <div className="payment-info">
                <h4>Payment Confirmed</h4>
                <div className="payment-details">
                  <div className="info-row">
                    <span className="label">Transaction ID:</span>
                    <span className="value">{paymentItem._id || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className="value success">Completed</span>
                  </div>
                  {paymentItem.amount && (
                    <div className="info-row">
                      <span className="label">Amount:</span>
                      <span className="value">
                        {formatPrice(paymentItem.amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="next-steps">
          <h3>What's Next?</h3>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-icon">🚀</div>
              <div className="step-content">
                <h4>Access Your Dashboard</h4>
                <p>Start exploring your new security tools and features</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-icon">📧</div>
              <div className="step-content">
                <h4>Check Your Email</h4>
                <p>
                  We've sent you a confirmation email with important details
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-icon">🛡️</div>
              <div className="step-content">
                <h4>Set Up Security</h4>
                <p>Configure your security tools to protect your business</p>
              </div>
            </div>
          </div>
        </div>

        {/* Redirect Section */}
        <div className="redirect-section">
          {!isRedirecting ? (
            <>
              <p className="redirect-message">
                {getRedirectMessage()} in{' '}
                <span className="countdown">{countdown}</span> second
                {countdown !== 1 ? 's' : ''}
              </p>
              <button className="btn btn-primary" onClick={handleGoToDashboard}>
                {getButtonText()}
              </button>
            </>
          ) : (
            <div className="redirecting">
              <div className="spinner"></div>
              <p>Redirecting to your dashboard...</p>
            </div>
          )}
        </div>

        {/* Support Info */}
        <div className="support-info">
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@ransombloc.com">support@ransombloc.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step5ThankYou;
