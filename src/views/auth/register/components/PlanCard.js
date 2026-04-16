import { memo, useMemo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlan, toggleTool, clearPlanSelection, setSelectedLocations } from '../store';
import { Check } from 'react-feather';
import { useTranslation } from "react-i18next"
import { useCurrency } from '@src/utility/context/CurrencyContext';

const PlanCard = ({ plan }) => {
    const { t } = useTranslation();
    const { currency } = useCurrency();

    const dispatch = useDispatch();
    const { planSelection } = useSelector(state => state.register);
    const { selectedPlan, selectedTools, billingCycle, selectedLocations: storeLocations } = planSelection;
    // Ensure selectedLocations defaults to 1 if undefined or 0
    const selectedLocations = storeLocations || 1;

    const isSelected = selectedPlan?._id === plan._id;

    // Get available location tiers for this plan
    const locationTiers = useMemo(() => {
        return plan.location_pricing || [];
    }, [plan.location_pricing]);

    // Get the current location tier based on selected locations
    const currentLocationTier = useMemo(() => {
        if (!locationTiers.length) return null;

        // Sort tiers by locations in descending order and find the first one <= selectedLocations
        const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
        return sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
    }, [locationTiers, selectedLocations]);

    // Calculate tool price based on pricing_mode and location
    const calculateToolPrice = useCallback((tool) => {
        // Use base_price first (actual base price), fallback to price
        const basePrice = tool.base_price ?? tool.price ?? 0;
        const pricingMode = tool.pricing_mode || 'fixed';
        const locationMultiplier = tool.location_multiplier || 1.0;

        if (pricingMode === 'multiplier') {
            // Always apply the multiplier for multiplier mode
            // For 1 location: basePrice * 1 * locationMultiplier
            // For multiple locations: basePrice * locations * locationMultiplier
            return basePrice * selectedLocations * locationMultiplier;
        } else {
            // FIXED mode: same price regardless of locations
            return basePrice;
        }
    }, [selectedLocations]);

    useEffect(() => {
        if (isSelected && plan?.tools?.length > 0) {
            const mandatoryToolIds = plan.tools
                .filter(tool => tool.is_mandatory)
                .map(tool => tool._id);

            if (mandatoryToolIds.length > 0) {
                // Only toggle if not already selected (to prevent toggling OFF when navigating back)
                mandatoryToolIds.forEach((toolId) => {
                    if (!selectedTools.includes(toolId)) {
                        dispatch(toggleTool(toolId));
                    }
                });
            }
        }
    }, [dispatch, isSelected, plan, selectedTools]);

    // Calculate pricing based on selected tools and location (memoized for performance)
    const pricingData = useMemo(() => {
        // Get plan base price from location tier
        const planBasePrice = currentLocationTier?.special_price > 0
            ? currentLocationTier.special_price
            : (currentLocationTier?.price || plan.platform_price || 0);

        // If plan base price is zero (trial/free), tools are also free
        if (planBasePrice === 0) {
            return { toolsTotal: 0, planBasePrice: 0, totalPrice: 0 };
        }

        // If this plan is selected, calculate based on selected tools
        if (isSelected && selectedTools.length > 0) {
            const selectedToolsData = plan.tools.filter(tool => selectedTools.includes(tool._id));
            const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
            const totalPrice = toolsTotal + planBasePrice;
            return { toolsTotal, planBasePrice, totalPrice };
        } else {
            // Show full price for unselected plans
            const toolsTotal = plan.tools.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
            const totalPrice = toolsTotal + planBasePrice;
            return { toolsTotal, planBasePrice, totalPrice };
        }
    }, [plan.tools, plan.platform_price, isSelected, selectedTools, currentLocationTier, calculateToolPrice]);

    const { toolsTotal, planBasePrice, totalPrice } = pricingData;

    // Handle location change
    const handleLocationChange = useCallback((e) => {
        const newLocations = parseInt(e.target.value);
        dispatch(setSelectedLocations(newLocations));
    }, [dispatch]);


    const handlePlanSelect = useCallback(() => {
        if (isSelected) {
            // If plan is already selected, deselect it
            dispatch(clearPlanSelection());
        } else {
            // If plan is not selected, select it
            console.log('Selected by user  ==>', plan);
            dispatch(selectPlan(plan));
        }
    }, [dispatch, plan, isSelected]);

    const handleToolToggle = useCallback((toolId, event) => {
        event.stopPropagation(); // Prevent plan selection when clicking on tool
        if (isSelected) {
            dispatch(toggleTool(toolId));
        }
    }, [dispatch, isSelected]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2
        }).format(price);
    };

    const getBillingPeriodText = () => {
        if (billingCycle === 'YEARLY') {
            return plan.duration === 1 ? 'per year' : `per ${plan.duration} years`;
        } else {
            return plan.duration === 1 ? 'per month' : `per ${plan.duration} months`;
        }
    };


    return (
        <div
            className={`plan-card ${isSelected ? 'selected' : ''}`}
           
            role="button"
            tabIndex={0}
            aria-label={isSelected ? `Deselect ${plan.name} plan` : `Select ${plan.name} plan`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // handlePlanSelect();
                }
            }}
        >
            <div className="selection-indicator" 
             onClick={handlePlanSelect}
            >
                <Check className="check-icon" />
            </div>

            <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                {/* {plan.description && (
                    <p className="plan-description">{plan.description}</p>
                )} */}
            </div>

            <div className="plan-pricing">
                <div className="pricing-left">
                    <div className="tools-total">
                        {formatPrice(planBasePrice)}
                    </div>
                    <div className="tools-total-month">
                        {"/"} {getBillingPeriodText()}
                    </div>
                </div>
                {locationTiers.length > 0 && (
                    <div className="pricing-right">
                        <select
                            className="location-select"
                            value={selectedLocations}
                            onChange={handleLocationChange}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[...locationTiers]
                                .sort((a, b) => a.locations - b.locations)
                                .map((tier) => (
                                    <option key={tier.locations} value={tier.locations}>
                                        {tier.locations} {tier.locations === 1 ? t('Location') : t('Locations')}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
            </div>

            {plan.tools && plan.tools.length > 0 && (
                <div className="plan-tools">
                    <h4 className="tools-title">{t("Included Tools")}</h4>
                    <div className="tools-grid">
                        {[...plan.tools].sort((a, b) => a.name.localeCompare(b.name)).map((tool) => {
                            // const IconComponent = getToolIcon(tool.name);
                            const isToolSelected = isSelected ? selectedTools.includes(tool._id) : true;

                            // Get tool description
                            const getToolDescription = (toolName) => {
                                const name = toolName.toLowerCase();
                                if (name.includes('wazuh')) {
                                    return 'Open source security monitoring platform for threat detection and compliance.';
                                }
                                if (name.includes('threat') && name.includes('intel')) {
                                    return 'Advanced threat intelligence service providing real-time security insights.';
                                }
                                if (name.includes('openvas')) {
                                    return 'Comprehensive vulnerability assessment and management solution.';
                                }
                                return `${tool.name} - Professional security tool for your business.`;
                            };

                            return (
                                <div
                                    key={tool._id}
                                    className={`tool-card ${isSelected ? 'selectable' : ''} ${isToolSelected ? 'selected' : 'unselected'}`}
                                    // onClick={(e) => {
                                    //     if (isSelected && !tool.is_mandatory) {
                                    //         handleToolToggle(tool._id, e);
                                    //     }
                                    // }}
                                >
                                    <div className="tool-name-row">
                                        <span className="tool-name">{tool.name}</span>
                                    </div>
                                    <div className="tool-description-row">
                                        <p className="tool-description">
                                            {getToolDescription(tool.name)}
                                        </p>
                                    </div>
                                    <div className="tool-action-row">
                                        <div className="tool-price">
                                            {(() => {
                                                const calculatedPrice = planBasePrice === 0 ? 0 : calculateToolPrice(tool);
                                                const isMultiplier = tool.pricing_mode === 'multiplier';
                                                const basePrice = tool.base_price ?? tool.price ?? 0;
                                                return (
                                                    <>
                                                        {calculatedPrice > 0 ? formatPrice(calculatedPrice) : 'Free'}
                                                        {isMultiplier && selectedLocations > 1 && planBasePrice > 0 && (
                                                            <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>
                                                                {formatPrice(basePrice)} × {selectedLocations} × {tool.location_multiplier || 1}
                                                            </small>
                                                        )}

                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {
                                            tool.is_mandatory ?
                                                <span className="mandatory-label">{t("Mandatory")}</span>
                                                :
                                                isSelected && (
                                                    <button
                                                        type="button"
                                                        className={`btn btn-primary ${isToolSelected ? 'selected' : ''}`}
                                                        onClick={(e) => handleToolToggle(tool._id, e)}
                                                    >
                                                        {isToolSelected ? 'Remove' : 'Select'}
                                                    </button>
                                                )
                                        }

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {plan.features && plan.features.length > 0 && (
                <div className="plan-features">
                    <h4 className="features-title">{t("Features")}</h4>
                    {plan.features.map((feature, index) => (
                        <div key={index} className="feature-item">
                            <Check className="feature-icon" />
                            <span className="feature-text">{feature}</span>
                        </div>
                    ))}
                </div>
            )}

            {plan.trial && (
                <div className="trial-badge">
                   {t("Free Trial Available")}
                </div>
            )}


            {isSelected && (
                <div className="tool-selection-note">
                    💡 {t("Use the Select/Remove buttons to customize your subscription")}
                    {selectedTools.length === 0 && (
                        <div className="no-tools-warning">
                            ⚠️ {t("Select at least one tool to keep this plan active")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(PlanCard);