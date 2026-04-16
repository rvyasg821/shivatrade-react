import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'react-feather';
import { useTranslation } from "react-i18next"
import { useCurrency } from '@src/utility/context/CurrencyContext';

const ToolTooltip = ({ tool, children }) => {
    const { t } = useTranslation();
    const { getCurrencySymbol } = useCurrency();
    
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef(null);
    const triggerRef = useRef(null);

    const showTooltip = (e) => {
        if (!tool.description) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const tooltipWidth = 250; // Approximate tooltip width
        const tooltipHeight = 100; // Approximate tooltip height

        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        let top = rect.top - tooltipHeight - 10;

        // Adjust if tooltip goes off screen
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) {
            left = window.innerWidth - tooltipWidth - 10;
        }

        // If tooltip goes above viewport, show below
        if (top < 10) {
            top = rect.bottom + 10;
        }

        setPosition({ top, left });
        setIsVisible(true);
    };

    const hideTooltip = () => {
        setIsVisible(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            hideTooltip();
        }
    };

    useEffect(() => {
        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isVisible]);

    // Get tool description or generate one based on tool name
    const getToolDescription = () => {
        if (tool.description) return tool.description;

        // Generate description based on tool name
        const name = tool.name.toLowerCase();
        if (name.includes('wazuh')) {
            return 'Open source security monitoring platform for threat detection, integrity monitoring, incident response and compliance.';
        }
        if (name.includes('threat') && name.includes('intel')) {
            return 'Advanced threat intelligence service providing real-time security insights and threat indicators.';
        }
        if (name.includes('openvas')) {
            return 'Comprehensive vulnerability assessment and management solution for network security scanning.';
        }
        if (name.includes('email') || name.includes('mail')) {
            return 'Professional email marketing and communication tools for customer engagement.';
        }
        if (name.includes('analytics')) {
            return 'Advanced analytics and reporting tools for business intelligence and data insights.';
        }
        if (name.includes('crm')) {
            return 'Customer relationship management system for managing contacts and business relationships.';
        }

        return `${tool.name} - Professional tool included in this plan`;
    };

    if (!tool.description && !tool.name) {
        return children;
    }

    return (
        <>
            <div
                ref={triggerRef}
                className="tool-tooltip-trigger"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                tabIndex={0}
                role="button"
                aria-describedby={isVisible ? `tooltip-${tool._id}` : undefined}
                aria-label={`More information about ${tool.name}`}
            >
                {children}
                <Info className="tool-info-icon" size={14} />
            </div>

            {isVisible && (
                <div
                    ref={tooltipRef}
                    id={`tooltip-${tool._id}`}
                    className="tool-tooltip"
                    style={{
                        position: 'fixed',
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        zIndex: 1000,
                    }}
                    role="tooltip"
                >
                    <div className="tooltip-content">
                        <div className="tooltip-header">
                            <strong>{tool.name}</strong>
                        </div>
                        <div className="tooltip-description">
                            {getToolDescription()}
                        </div>
                        {tool.price > 0 && (
                            <div className="tooltip-price">
                               {t("Price")}: {getCurrencySymbol()}{tool.price.toFixed(2)}
                            </div>
                        )}
                    </div>
                    <div className="tooltip-arrow"></div>
                </div>
            )}
        </>
    );
};

export default ToolTooltip;