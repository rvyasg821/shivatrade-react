import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'react-feather';
import { withTranslation } from 'react-i18next';
import './ErrorBoundary.scss';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Payment Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if available
    if (window.reportError) {
      window.reportError(error, {
        component: 'PaymentErrorBoundary',
        errorInfo,
        retryCount: this.state.retryCount,
      });
    }
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      window.history.back();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle size={48} />
            </div>

            <h3>{t("Oops! Something went wrong")}</h3>

            <p>
              {t("We encountered an unexpected error while processing your payment.This could be due to a temporary issue with our payment system.")}
            </p>


            <div className="error-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
              >
                <RefreshCw size={16} />
                {this.state.retryCount >= 3
                  ? 'Max Retries Reached'
                  : 'Try Again'}
              </button>

              <button className="btn btn-secondary" onClick={this.handleGoBack}>
                <ArrowLeft size={16} />
                {t("Go Back")}
              </button>

              <button className="btn btn-outline" onClick={this.handleReload}>
                {t("Reload Page")}
              </button>
            </div>

            {this.state.retryCount > 0 && (
              <div className="retry-info">
                <small>{t("Retry attempt")}: {this.state.retryCount}/3</small>
              </div>
            )}

            <div className="error-help">
              <p>
                {t("If this problem persists, please contact our support team at")} {' '}
                <a href="mailto:support@ransombloc.com">
                  support@ransombloc.com
                </a>
              </p>
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error.toString()}</pre>

                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}

                  {this.state.error.stack && (
                    <>
                      <h4>Stack Trace:</h4>
                      <pre>{this.state.error.stack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
