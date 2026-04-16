// ** React Imports
import { useState } from 'react'

// ** Reactstrap Imports
import { 
  Badge, 
  Button, 
  UncontrolledTooltip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'

// ** Icons
import { Power, AlertCircle } from 'react-feather'

// ** Role-based utilities
import { hasToolsPermission, isSuperAdmin } from '../utils/roleUtils'

// ** Constants
import { ENUM_TOOLS_STATUS, ENUM_TOOLS_STATUS_COLOR } from '@constant/defaultValues'

/**
 * Component for managing tool status with role-based permissions
 */
const ToolStatusManager = ({ 
  tool, 
  userRole, 
  selectedCompany,
  onStatusChange,
  disabled = false 
}) => {
  const { t } = useTranslation()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)

  // ** Permission checks
  const isUserSuperAdmin = isSuperAdmin(userRole)
  const canUpdateStatus = isUserSuperAdmin || hasToolsPermission(userRole, 'can_update')

  if (!tool) {
    return null
  }

  const currentStatus = tool.status || 1
  const newStatus = currentStatus === 1 ? 2 : 1
  const statusText = ENUM_TOOLS_STATUS?.[currentStatus] || 'Unknown'
  const statusColor = ENUM_TOOLS_STATUS_COLOR?.[currentStatus] || 'secondary'

  const handleStatusToggle = () => {
    if (!canUpdateStatus || disabled) {
      return
    }

    setPendingStatus(newStatus)
    setShowConfirmModal(true)
  }

  const handleConfirmStatusChange = () => {
    if (onStatusChange && pendingStatus !== null) {
      onStatusChange(tool._id, currentStatus, pendingStatus, selectedCompany)
    }
    setShowConfirmModal(false)
    setPendingStatus(null)
  }

  const handleCancelStatusChange = () => {
    setShowConfirmModal(false)
    setPendingStatus(null)
  }

  const getStatusChangeText = () => {
    if (pendingStatus === 1) {
      return t('activate')
    } else if (pendingStatus === 2) {
      return t('deactivate')
    }
    return t('change status')
  }

  const getContextText = () => {
    if (isUserSuperAdmin && selectedCompany) {
      return t('This will affect the tool for the selected company.')
    } else if (isUserSuperAdmin && !selectedCompany) {
      return t('This will affect the tool at the admin level.')
    } else {
      return t('This will affect the tool for your company.')
    }
  }

  return (
    <>
      <div className="d-flex align-items-center">
        {/* Status Badge */}
        <Badge color={statusColor} className="me-2">
          {t(statusText)}
        </Badge>

        {/* Status Toggle Button */}
        {canUpdateStatus && !disabled && (
          <>
            <Button
              size="sm"
              color="link"
              className="p-0"
              id={`status-toggle-${tool._id}`}
              onClick={handleStatusToggle}
            >
              <Power 
                size={16} 
                className={currentStatus === 1 ? 'text-success' : 'text-muted'} 
              />
            </Button>
            <UncontrolledTooltip
              placement="top"
              target={`status-toggle-${tool._id}`}
            >
              {currentStatus === 1 ? t('Deactivate Tool') : t('Activate Tool')}
            </UncontrolledTooltip>
          </>
        )}

        {/* Permission Denied Indicator */}
        {!canUpdateStatus && (
          <>
            <AlertCircle 
              size={16} 
              className="text-muted ms-2"
              id={`status-disabled-${tool._id}`}
            />
            <UncontrolledTooltip
              placement="top"
              target={`status-disabled-${tool._id}`}
            >
              {t('You do not have permission to change tool status')}
            </UncontrolledTooltip>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={showConfirmModal} 
        toggle={handleCancelStatusChange}
        centered
      >
        <ModalHeader toggle={handleCancelStatusChange}>
          {t('Confirm Status Change')}
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <strong>{t('Tool:')}</strong> {tool.name}
          </div>
          <div className="mb-3">
            <strong>{t('Current Status:')}</strong>{' '}
            <Badge color={statusColor}>{t(statusText)}</Badge>
          </div>
          <div className="mb-3">
            <strong>{t('New Status:')}</strong>{' '}
            <Badge color={ENUM_TOOLS_STATUS_COLOR?.[pendingStatus] || 'secondary'}>
              {t(ENUM_TOOLS_STATUS?.[pendingStatus] || 'Unknown')}
            </Badge>
          </div>
          
          <p>
            {t('Are you sure you want to {{action}} this tool?', { 
              action: getStatusChangeText() 
            })}
          </p>
          
          <div className="alert alert-info">
            <small>{getContextText()}</small>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button 
            color="secondary" 
            outline 
            onClick={handleCancelStatusChange}
          >
            {t('Cancel')}
          </Button>
          <Button 
            color={pendingStatus === 1 ? 'success' : 'warning'}
            onClick={handleConfirmStatusChange}
          >
            {t('Confirm {{action}}', { action: getStatusChangeText() })}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default ToolStatusManager