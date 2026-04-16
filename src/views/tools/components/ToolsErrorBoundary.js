// ** React Imports
import React from 'react'

// ** Reactstrap Imports
import { Alert, Button, Card, CardBody } from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'

// ** Icons
import { AlertTriangle, RefreshCw } from 'react-feather'

// ** Error utilities
import { getErrorMessage } from '../errors/ToolsErrors'

/**
 * Error Boundary component for tools-related errors
 */
class ToolsErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Tools Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ToolsErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          userRole={this.props.userRole}
          onRetry={() => {
            this.setState({ hasError: false, error: null, errorInfo: null })
            if (this.props.onRetry) {
              this.props.onRetry()
            }
          }}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Fallback component displayed when error boundary catches an error
 */
const ToolsErrorFallback = ({ error, errorInfo, userRole, onRetry }) => {
  const { t } = useTranslation()

  const errorMessage = getErrorMessage(error, t)
  const isPermissionError = error?.name === 'ToolsPermissionError'
  const isTenantError = error?.name === 'TenantNotFoundError'

  return (
    <Card className="border-danger">
      <CardBody className="text-center py-5">
        <AlertTriangle size={48} className="text-danger mb-3" />
        
        <h4 className="text-danger mb-3">
          {isPermissionError && t('Access Denied')}
          {isTenantError && t('Company Not Found')}
          {!isPermissionError && !isTenantError && t('Something went wrong')}
        </h4>

        <Alert color="danger" className="text-start mb-4">
          <strong>{t('Error Details:')}</strong>
          <br />
          {errorMessage}
        </Alert>

        {/* Role-specific error guidance */}
        {isPermissionError && (
          <Alert color="warning" className="text-start mb-4">
            <strong>{t('What you can do:')}</strong>
            <ul className="mb-0 mt-2">
              <li>{t('Contact your administrator to request the necessary permissions')}</li>
              <li>{t('Check if you are logged in with the correct account')}</li>
            </ul>
          </Alert>
        )}

        {isTenantError && (
          <Alert color="info" className="text-start mb-4">
            <strong>{t('What you can do:')}</strong>
            <ul className="mb-0 mt-2">
              <li>{t('Try selecting a different company from the dropdown')}</li>
              <li>{t('Contact support if the issue persists')}</li>
            </ul>
          </Alert>
        )}

        <div className="d-flex justify-content-center gap-2">
          <Button
            color="primary"
            onClick={onRetry}
            className="d-flex align-items-center"
          >
            <RefreshCw size={16} className="me-1" />
            {t('Try Again')}
          </Button>
          
          <Button
            color="secondary"
            onClick={() => window.location.reload()}
            outline
          >
            {t('Refresh Page')}
          </Button>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-start">
            <summary className="text-muted cursor-pointer">
              {t('Technical Details (Development Only)')}
            </summary>
            <pre className="mt-2 p-3 bg-light border rounded small text-muted">
              <strong>Error:</strong> {error.toString()}
              {error.stack && (
                <>
                  <br />
                  <strong>Stack:</strong>
                  <br />
                  {error.stack}
                </>
              )}
              {errorInfo && errorInfo.componentStack && (
                <>
                  <br />
                  <strong>Component Stack:</strong>
                  <br />
                  {errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        )}
      </CardBody>
    </Card>
  )
}

export default ToolsErrorBoundary