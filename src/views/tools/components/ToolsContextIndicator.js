// ** React Imports
import { useEffect, useState } from "react"

// ** Reactstrap Imports
import { Badge } from "reactstrap"

// ** Third Party Components
import { useTranslation } from "react-i18next"

// ** Utils
import { ToolsAPIStrategyFactory } from "../strategies"

/**
 * Component that displays the current viewing context for tools
 * Shows different badges based on user role and selected company
 */
const ToolsContextIndicator = ({
    userRole,
    selectedCompany,
    tenantId,
    currentStrategy,
    companiesItems = []
}) => {
    const { t } = useTranslation()
    const [contextInfo, setContextInfo] = useState({
        type: 'unknown',
        label: '',
        color: 'secondary'
    })

    useEffect(() => {
        if (!userRole) {
            setContextInfo({
                type: 'unknown',
                label: t('Loading...'),
                color: 'secondary'
            })
            return
        }

        const isSuperAdmin = ToolsAPIStrategyFactory.isSuperAdmin(userRole)

        if (isSuperAdmin) {
            if (selectedCompany) {
                // Super Admin viewing specific company tools
                const companyName = companiesItems.find(
                    company => company.tenantId === selectedCompany
                )?.company_name || selectedCompany

                setContextInfo({
                    type: 'tenant',
                    label: t('Viewing: {{companyName}} Tools', { companyName }),
                    color: 'info'
                })
            } else {
                // Super Admin viewing all tools
                setContextInfo({
                    type: 'admin',
                    label: t('Viewing: All Tools (Admin)'),
                    color: 'primary'
                })
            }
        } else {
            // Company Admin or other roles viewing their company tools
            setContextInfo({
                type: 'tenant',
                label: t('Company Tools'),
                color: 'secondary'
            })
        }
    }, [userRole, selectedCompany, tenantId, companiesItems, t])

    // Don't render if no user role is available
    if (!userRole) {
        return null
    }

    return (
        <div className="d-flex align-items-center mb-2">
            <Badge
                color={contextInfo.color}
                className="me-2"
                pill
            >
                {contextInfo.label}
            </Badge>

            {/* Optional strategy indicator for debugging */}
            {process.env.NODE_ENV === 'development' && currentStrategy && (
                <Badge
                    color="light"
                    className="text-muted"
                    style={{ fontSize: '0.7rem' }}
                >
                    {currentStrategy} API
                </Badge>
            )}
        </div>
    )
}

export default ToolsContextIndicator