import React from 'react';
import { AlertCircle, CreditCard, Wifi, Server, Clock } from 'react-feather';
import './PaymentErrorDisplay.scss';

const PaymentErrorDisplay = ({
  error,
  errorType = 'general',
  onRetry,
  onGoBack,
  retryCount = 0,
  maxRetries = 3,
  showDetails = false,
}) => {
  const getErrorConfig = (type, message) => {
    const configs = {
      network: {
        icon: Wifi,
        title: 'Connection Problem',
        description:
          'Unable to connect to our payment servers. Please check your internet connection and try again.',
        color: '#ffc107',
        canRetry: true,
      },
      server: {
        icon: Server,
        title: 'Server Error',
        description:
          'Our payment system is temporarily unavailable. Please try again in a few moments.',
        color: '#dc3545',
        canRetry: true,
      },
      timeout: {
        icon: Clock,
        title: 'Request Timeout',
        description:
          'The payment request took too long to process. Please try again.',
        color: '#fd7e14',
        canRetry: true,
      },
      payment: {
        icon: CreditCard,
        title: 'Payment Failed',
        description:
          message ||
          'Your payment could not be processed. Please check your payment details and try again.',
        color: '#dc3545',
        canRetry: true,
      },
      validation: {
        icon: AlertCircle,
        title: 'Invalid Information',
        description:
          message ||
          'Please check your payment information and correct any errors.',
        color: '#ffc107',
        canRetry: false,
      },
      general: {
        icon: AlertCircle,
        title: 'Payment Error',
        description:
          message ||
          'An unexpected error occurred while processing your payment.',
        color: '#dc3545',
        canRetry: true,
      },
    };

    return configs[type] || configs.general;
  };

  const config = getErrorConfig(errorType, error);
  const IconComponent = config.icon;
  const canRetry = config.canRetry && retryCount < maxRetries;

  const getRetryButtonText = () => {
    if (retryCount >= maxRetries) {
      return 'Max Retries Reached';
    }
    if (retryCount > 0) {
      return `Retry (${retryCount}/${maxRetries})`;
    }
    return 'Try Again';
  };

  const getSuggestions = () => {
    const suggestions = {
      network: [
        'Check your internet connection',
        'Try switching to a different network',
        "Disable VPN if you're using one",
      ],
      server: [
        'Wait a few minutes and try again',
        'Check our status page for updates',
        'Contact support if the issue persists',
      ],
      timeout: [
        'Ensure you have a stable internet connection',
        'Try again with a faster connection',
        'Contact support if timeouts continue',
      ],
      payment: [
        'Verify your card details are correct',
        'Check if your card has sufficient funds',
        'Try a different payment method',
        'Contact your bank if the issue persists',
      ],
      validation: [
        'Double-check all required fields',
        'Ensure card number is entered correctly',
        'Verify expiry date is not in the past',
        'Check CVV is correct for your card type',
      ],
    };

    return suggestions[errorType] || suggestions.general || [];
  };

  return (
    <div className="payment-error-display">
      <div className="error-content">
        <div className="error-header">
          <div className="error-icon" style={{ color: config.color }}>
            <IconComponent size={32} />
          </div>
          <h3>{config.title}</h3>
        </div>

        <div className="error-body">
          <p className="error-description">{config.description}</p>

          {showDetails && error && (
            <div className="error-details">
              <strong>Error Details:</strong>
              <code>{error}</code>
            </div>
          )}

          {getSuggestions().length > 0 && (
            <div className="error-suggestions">
              <h4>What you can try:</h4>
              <ul>
                {getSuggestions().map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {retryCount > 0 && (
            <div className="retry-info">
              <small>
                Previous attempts: {retryCount}
                {retryCount >= maxRetries && ' (Maximum reached)'}
              </small>
            </div>
          )}
        </div>

        <div className="error-actions">
          {canRetry && onRetry && (
            <button className="btn btn-primary" onClick={onRetry}>
              {getRetryButtonText()}
            </button>
          )}

          {onGoBack && (
            <button className="btn btn-secondary" onClick={onGoBack}>
              Go Back
            </button>
          )}

          <button
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>

        <div className="error-help">
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@ransombloc.com">support@ransombloc.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentErrorDisplay;
