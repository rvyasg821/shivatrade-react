// ** React Imports
import { useState, useEffect } from 'react'

// ** Reactstrap Imports
import { Alert, Button } from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'

// ** Icons
import { X, AlertCircle, Lock, Search } from 'react-feather'

// ** Error utilities
import { getErrorMessage } from '../errors/ToolsErrors'

/**
 * Component for displaying tools-related error messages
 */
const ToolsErrorAlert = ({ 
  error, 
  onDismiss, 
  onRetry, 
  userRole,
  dismissible = true,
  showRetry = true 
}) => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    setIsVisible(true)
  }, [error])

  if (!error || !isVisible) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  const errorMessage = getErrorMessage(error, t)
  const isPermissionError = error?.name === 'ToolsPermissionError'
  const isTenantError = error?.name === 'TenantNotFoundError'
  const isNotFoundError = error?.name === 'ToolNotFoundError'
  const isValidationError = error?.name === 'ToolValidationError'

  // Determine alert color based on error type
  let alertColor = 'danger'
  let icon = AlertCircle

  if (isPermissionError) {
    alertColor = 'warning'
    icon = Lock
  } else if (isNotFoundError) {
    alertColor = 'info'
    icon = Search
  } else if (isValidationError) {
    alertColor = 'warning'
    icon = AlertCircle
  }

  const IconComponent = icon

  return (
    <Alert 
      color={alertColor} 
      isOpen={isVisible}
      className="d-flex align-items-start"
    >
      <IconComponent size={20} className="me-2 mt-1 flex-shrink-0" />
      
      <div className="flex-grow-1">
        <div className="fw-bold mb-1">
          {isPermissionError && t('Permission Denied')}
          {isTenantError && t('Company Access Error')}
          {isNotFoundError && t('Not Found')}
          {isValidationError && t('Validation Error')}
          {!isPermissionError && !isTenantError && !isNotFoundError && !isValidationError && t('Error')}
        </div>
        
        <div className="mb-2">
          {errorMessage}
        </div>

        {/* Additional context for specific error types */}
        {isPermissionError && (
          <small className="text-muted">
            {t('Contact your administrator if you believe you should have access to this feature.')}
          </small>
        )}

        {isTenantError && (
          <small className="text-muted">
            {t('Please try selecting a different company or contact support.')}
          </small>
        )}

        {isValidationError && error.field && (
          <small className="text-muted">
            {t('Field: {{field}}', { field: error.field })}
          </small>
        )}

        {/* Action buttons */}
        <div className="mt-2">
          {showRetry && onRetry && (
            <Button
              size="sm"
              color={alertColor}
              outline
              onClick={onRetry}
              className="me-2"
            >
              {t('Retry')}
            </Button>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <Button
          close
          onClick={handleDismiss}
          className="ms-2"
          aria-label={t('Dismiss')}
        >
          <X size={16} />
        </Button>
      )}
    </Alert>
  )
}

export default ToolsErrorAlert