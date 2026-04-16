// ** React Imports
import { useState } from 'react'

// ** Reactstrap Imports
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap'

// ** Third Party Components
import { useTranslation } from 'react-i18next'
import classnames from 'classnames'

// ** Icons
import { Tool, Settings, Clock } from 'react-feather'

// ** Components
import ToolSettings from './ToolSettings'
import ToolSchedules from './ToolSchedules'
// import TenantToolSettings from './TenantToolSettings' // Multi-tenant removed
// import TenantToolSchedules from './TenantToolSchedules' // Multi-tenant removed
import { useSelector } from 'react-redux'

const ToolTabbedInterface = ({
  toolId,
  selectedCompany,
  tenantToolId,
  children,
  onSettingsChange,
  onSchedulesChange,
  initialSettings = [],
  initialSchedules = []
}) => {
  const { t } = useTranslation()
  const authStore = useSelector((state) => state.auth)

  const [activeTab, setActiveTab] = useState('1')
  const [tenantSettings, setTenantSettings] = useState([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingTab, setPendingTab] = useState(null)

  const isAddMode = !toolId
  const shouldShowTenantTabs = false // Multi-tenant removed - always use admin tools

  const toggle = (tab) => {
    if (activeTab !== tab) {
      if (hasUnsavedChanges) {
        setPendingTab(tab)
        if (
          window.confirm(
            t(
              'You have unsaved changes. Are you sure you want to switch tabs? Your changes will be lost.'
            )
          )
        ) {
          setActiveTab(tab)
          setHasUnsavedChanges(false)
          setPendingTab(null)
        } else {
          setPendingTab(null)
        }
      } else {
        setActiveTab(tab)
      }
    }
  }

  const handleTenantSettingsChange = (settings) => {
    setTenantSettings(settings)
    if (onSettingsChange) onSettingsChange(settings)
  }

  const handleUnsavedChanges = (hasChanges) => {
    setHasUnsavedChanges(hasChanges)
  }

  return (
    <div className="pl-3">
      {/* Updated Nav Style (pills style like your second example) */}
      <Nav pills className="mb-1">
        {/* Tool Details */}
        <NavItem>
          <NavLink
            active={activeTab === '1'}
            onClick={() => toggle('1')}
          >
            <Tool className="font-medium-3 me-50" />
            <span className="fw-bold">{t('Tool Details')}</span>
            {hasUnsavedChanges && activeTab === '1' && (
              <span className="badge badge-warning ms-1">!</span>
            )}
          </NavLink>
        </NavItem>

        {/* Settings & Schedules */}
        {!authStore.authUserItem.isSystemUser && (
          <>
            
          </>
        )}
      </Nav>

      {/* Tab Content */}
      <TabContent activeTab={activeTab} className="p-0">
        <TabPane tabId="1">{children}</TabPane>

        <TabPane tabId="2">
          {shouldShowTenantTabs ? (
            <TenantToolSettings
              toolId={toolId}
              selectedCompany={selectedCompany}
              tenantToolId={tenantToolId}
              onSettingsChange={handleTenantSettingsChange}
            />
          ) : (
            <ToolSettings
              toolId={toolId}
              selectedCompany={selectedCompany}
              onSettingsChange={onSettingsChange}
              initialSettings={initialSettings}
            />
          )}
        </TabPane>

        <TabPane tabId="3">
          {shouldShowTenantTabs ? (
            <TenantToolSchedules
              toolId={toolId}
              selectedCompany={selectedCompany}
              tenantToolId={tenantToolId}
              tenantToolSettings={tenantSettings}
              onSchedulesChange={onSchedulesChange}
            />
          ) : (
            <ToolSchedules
              toolId={toolId}
              selectedCompany={selectedCompany}
              onSchedulesChange={onSchedulesChange}
              initialSchedules={initialSchedules}
            />
          )}
        </TabPane>
      </TabContent>
    </div>
  )
}

export default ToolTabbedInterface
