import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from "react-i18next"
import { useCurrency } from '@src/utility/context/CurrencyContext';

const PricingSummary = () => {
    const { t } = useTranslation();
    const { currency } = useCurrency();

    const { planSelection } = useSelector(state => state.register);
    const { selectedPlan, selectedTools, billingCycle, totalPrice, platformFee } = planSelection;

    if (!selectedPlan) {
        return null;
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2
        }).format(price);
    };

    const getBillingPeriodText = () => {
        if (billingCycle === 'YEARLY') {
            return selectedPlan.duration === 1 ? 'per year' : `per ${selectedPlan.duration} years`;
        } else {
            return selectedPlan.duration === 1 ? 'per month' : `per ${selectedPlan.duration} months`;
        }
    };

    // Calculate tools total based on selected tools (memoized)
    const { toolsTotal, selectedToolsData } = useMemo(() => {
        const selectedToolsData = selectedPlan.tools.filter(tool => selectedTools.includes(tool._id));
        const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + tool.price, 0);
        return { toolsTotal, selectedToolsData };
    }, [selectedPlan.tools, selectedTools]);

    // // Calculate potential yearly savings
    // const getYearlySavings = () => {
    //     if (billingCycle === 'YEARLY' && selectedPlan.duration === 1) {
    //         // Assuming 17% discount for yearly billing
    //         const monthlyEquivalent = toolsTotal * 12;
    //         const yearlySavings = monthlyEquivalent - toolsTotal;
    //         return yearlySavings > 0 ? yearlySavings : 0;
    //     }
    //     return 0;
    // };

    // const yearlySavings = getYearlySavings();

    return (
        <div className="pricing-summary">
            <h3 className="summary-title">{t("Subscription Summary")}</h3>

            <div className="summary-breakdown">
                {/* Selected tools breakdown */}
                {selectedToolsData.length > 0 ? (
                    selectedToolsData.map((tool) => (
                        <div key={tool._id} className="summary-row">
                            <span className="summary-label">✓ {tool.name}</span>
                            <span className="summary-value">
                                {tool.price > 0 ? formatPrice(tool.price) : 'Included'}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="summary-row">
                        <span className="summary-label">{t("No tools selected")}</span>
                        <span className="summary-value">{formatPrice(0)}</span>
                    </div>
                )}

                {/* Subtotal */}
                <div className="summary-row subtotal">
                    <span className="summary-label">{t("Tools Subtotal")}</span>
                    <span className="summary-value">{formatPrice(toolsTotal)}</span>
                </div>

                {/* Platform fee */}
                {platformFee > 0 && (
                    <div className="summary-row">
                        <span className="summary-label">{t("Platform Fee")}
                        </span>
                        <span className="summary-value">{formatPrice(platformFee)}</span>
                    </div>
                )}

                {/* Yearly savings */}
                {/* {yearlySavings > 0 && (
                    <div className="summary-row savings">
                        <span className="summary-label">Yearly Savings (17% off)</span>
                        <span className="summary-value savings-amount">-{formatPrice(yearlySavings)}</span>
                    </div>
                )} */}

                {/* Total */}
                <div className="summary-row total">
                    <span className="summary-label">{t(Total)}</span>
                    <span className="summary-value">{formatPrice(totalPrice)}</span>
                </div>
            </div>

            {/* Additional info */}
            <div className="summary-footer">
                {selectedPlan.trial && (
                    <div className="trial-info">
                        <small>✓ {t("Free trial available")}</small>
                    </div>
                )}

                {selectedPlan.recurring && (
                    <div className="recurring-info">
                        <small>{t("This is a recurring subscription")}</small>
                    </div>
                )}

                {selectedPlan.is_lifetime && (
                    <div className="lifetime-info">
                        <small>✓ {t("One-time payment for lifetime access")}
                        </small>
                    </div>
                )}

                {billingCycle === 'YEARLY' && (
                    <div className="billing-info">
                        <small>{t("Billed annually • Cancel anytime")}</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(PricingSummary);