import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatPrice } from '../utils/paymentValidation';
import { useTranslation } from "react-i18next"
import { Info, Clock, AlertCircle } from 'react-feather';

/**
 * Format discount duration for display
 * @param {Object} discount - The applied discount object
 * @param {Object} t - Translation function
 * @returns {Object|null} - { message, type, icon } or null if no duration info
 */
const getDiscountDurationInfo = (discount, t) => {
    if (!discount) return null;

    const durationType = discount.duration?.type || discount.duration_type;
    const durationMonths = discount.duration?.months || discount.duration_months;

    if (!durationType || durationType === 'forever') {
        return {
            message: t('Discount applies to all future payments'),
            type: 'success',
            icon: 'check'
        };
    }

    if (durationType === 'first_payment') {
        return {
            message: t('Discount applies to this payment only. Future payments will be at normal price.'),
            type: 'warning',
            icon: 'info'
        };
    }

    if (durationType === 'limited_months' && durationMonths) {
        const monthText = durationMonths === 1 ? t('month') : t('months');
        return {
            message: t(`Discounted price for {{count}} {{monthText}}. After that, normal pricing will apply.`, { count: durationMonths, monthText }),
            type: 'info',
            icon: 'clock'
        };
    }

    // If duration_info is provided directly from API
    if (discount.duration_info) {
        return {
            message: discount.duration_info,
            type: 'info',
            icon: 'info'
        };
    }

    return null;
};

/**
 * Format location rules for display
 * @param {Array} locationRules - Array of location rule objects
 * @param {Function} t - Translation function
 * @returns {String|null} - Formatted location rules message or null
 */
const formatLocationRules = (locationRules, t) => {
    if (!locationRules || locationRules.length === 0) return null;

    const messages = locationRules.map(rule => {
        switch (rule.type) {
            case 'any':
                return t('Any number of locations');
            case 'exact':
                return t('Exactly {{count}} location(s)', { count: rule.value });
            case 'minimum':
                return t('{{count}} or more locations', { count: rule.value });
            case 'maximum':
                return t('Up to {{count}} location(s)', { count: rule.value });
            case 'range':
                return t('{{min}} to {{max}} locations', { min: rule.min, max: rule.max });
            default:
                return null;
        }
    }).filter(Boolean);

    return messages.length > 0 ? messages.join(` ${t('or')} `) : null;
};

const PaymentSummary = ({ planItem, selectedTools = [], billingCycle = 'MONTHLY', tax_info, appliedDiscount }) => {
    const { t } = useTranslation();

    // Get selected locations from Redux store or localStorage
    const storeSelectedLocations = useSelector(state => state.register?.planSelection?.selectedLocations);
    const savedLocations = JSON.parse(localStorage.getItem("selectedLocations") || "1");
    const selectedLocations = storeSelectedLocations || savedLocations || 1;

    // Calculate tool price based on pricing_mode and location
    const calculateToolPrice = (tool) => {
        const basePrice = tool.base_price ?? tool.price ?? 0;
        const pricingMode = tool.pricing_mode || 'fixed';
        const locationMultiplier = tool.location_multiplier || 1.0;

        if (pricingMode === 'multiplier') {
            // Always apply the multiplier for multiplier mode
            return basePrice * selectedLocations * locationMultiplier;
        }
        return basePrice;
    };

    const pricingData = useMemo(() => {
        if (!planItem) return null;

        // Get plan base price from location_pricing
        const locationTiers = planItem.location_pricing || [];
        const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
        const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
        const planBasePrice = currentTier?.special_price > 0
            ? currentTier.special_price
            : (currentTier?.price || planItem.platform_price || 0);

        const selectedToolsData = planItem.tools?.filter(tool =>
            selectedTools.includes(tool._id)
        ) || [];

        // If plan base price is zero (trial/free), tools are also free
        const toolsTotal = planBasePrice === 0 ? 0 : selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
        const subtotal = toolsTotal + planBasePrice;
        const taxRate = Number(tax_info?.value || 0);

        // If discount is applied, use the discounted price for tax calculation
        const priceAfterDiscount = (appliedDiscount && appliedDiscount.price !== undefined)
            ? appliedDiscount.price
            : subtotal;
        const taxPrice = (priceAfterDiscount * taxRate) / 100;
        const totalPrice = taxPrice + priceAfterDiscount;

        // Calculate savings if special price is applied
        const regularPrice = currentTier?.price || 0;
        const specialPrice = currentTier?.special_price || 0;
        const hasSpecialPrice = specialPrice > 0 && regularPrice > specialPrice;
        const savings = hasSpecialPrice ? (regularPrice - specialPrice) : 0;

        return {
            selectedToolsData,
            toolsTotal,
            planBasePrice,
            subtotal,
            taxPrice,
            totalPrice,
            priceAfterDiscount,
            hasSpecialPrice,
            savings,
            hasDiscount: !!appliedDiscount,
            selectedLocations
        };
    }, [planItem, selectedTools, tax_info, appliedDiscount, selectedLocations]);

    if (!planItem || !pricingData) {
        return null;
    }

    return (
        <div className="payment-summary">
            <div className="summary-header">
                <div className="plan-badge">
                    {planItem.name}
                    {planItem.recurring && <span className="recurring-badge">{t("Recurring")}</span>}
                </div>
                <h4 className="summary-title">{t("Payment Summary")}</h4>
            </div>

            <div className="summary-content">
                <div className="summary-section">
                    <div className="summary-row">
                        <span className="summary-label">
                            {planItem?.name}
                            <small className="text-muted ms-1">
                                ({selectedLocations} {selectedLocations === 1 ? t('Location') : t('Locations')})
                            </small>
                        </span>
                        <span className="summary-value">
                            {formatPrice(pricingData.planBasePrice)}
                        </span>
                    </div>
                </div>

                {pricingData.selectedToolsData.length > 0 && (
                    <div className="summary-section">
                        <h5 className="section-title">{t("Selected Tools")}</h5>
                        {pricingData.selectedToolsData.map((tool) => {
                            const calculatedPrice = calculateToolPrice(tool);
                            return (
                                <div key={tool._id} className="summary-row tool-row">
                                    <span className="summary-label">
                                        <span className="tool-icon">✓</span>
                                        {tool.name}
                                        {tool.pricing_mode === 'multiplier' && (
                                            <small className="text-muted ms-1">(×{selectedLocations})</small>
                                        )}
                                    </span>
                                    <span className="summary-value">
                                        {calculatedPrice > 0 ? formatPrice(calculatedPrice) : 'Included'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="summary-section">
                    <div className="summary-row">
                        <span className="summary-label">{t("Tools Subtotal")}</span>
                        <span className="summary-value">{formatPrice(pricingData.toolsTotal)}</span>
                    </div>

                    <div className="summary-row">
                        <span className="summary-label">{t("Subtotal")}</span>
                        <span className="summary-value">{formatPrice(pricingData.subtotal)}</span>
                    </div>

                    {/* Discount Details Card */}
                    {appliedDiscount && appliedDiscount.price !== undefined && (() => {
                        const discountAmount = pricingData.subtotal - appliedDiscount.price;
                        const durationType = appliedDiscount.duration?.type || appliedDiscount.duration_type;
                        const durationMonths = appliedDiscount.duration?.months || appliedDiscount.duration_months;
                        const discountType = appliedDiscount.data?.type || appliedDiscount.discount_type;
                        const discountValue = appliedDiscount.data?.value || appliedDiscount.discount_value;
                        const discountCode = appliedDiscount.data?.discount_code || appliedDiscount.discount_code || appliedDiscount.code;
                        const locationRules = appliedDiscount.location_rules || appliedDiscount.data?.location_rules || [];
                        const locationRulesText = formatLocationRules(locationRules, t);

                        return (
                            <div
                                className="discount-details-card"
                                style={{
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                    border: '1px solid #86efac',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginTop: '12px',
                                    marginBottom: '12px'
                                }}
                            >
                                {/* Discount Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>🎉</span>
                                        <span style={{ fontWeight: '600', color: '#166534', fontSize: '0.95rem' }}>
                                            {t('Discount Applied')}
                                        </span>
                                    </div>
                                    {discountCode && (
                                        <span style={{
                                            background: '#22c55e',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {discountCode}
                                        </span>
                                    )}
                                </div>

                                {/* Discount Value Info */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: '1px dashed #86efac'
                                }}>
                                    <span style={{ color: '#166534', fontSize: '0.85rem' }}>
                                        {discountType === 'percentage'
                                            ? t('{{value}}% off your subscription', { value: discountValue })
                                            : discountValue
                                                ? t('{{amount}} off your subscription', { amount: formatPrice(discountValue) })
                                                : t('Discount applied')
                                        }
                                    </span>
                                    <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>
                                        -{formatPrice(discountAmount)}
                                    </span>
                                </div>

                                {/* Duration Info Box */}
                                {durationType && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: durationType === 'forever'
                                            ? '#dcfce7'
                                            : durationType === 'first_payment'
                                                ? '#fef3c7'
                                                : '#dbeafe',
                                        border: durationType === 'forever'
                                            ? '1px solid #86efac'
                                            : durationType === 'first_payment'
                                                ? '1px solid #fcd34d'
                                                : '1px solid #93c5fd'
                                    }}>
                                        {/* Duration Type Icon & Message */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            color: durationType === 'forever'
                                                ? '#166534'
                                                : durationType === 'first_payment'
                                                    ? '#92400e'
                                                    : '#1e40af',
                                            fontSize: '0.85rem'
                                        }}>
                                            <span style={{ flexShrink: 0, marginTop: '1px' }}>
                                                {durationType === 'forever' && '✓'}
                                                {durationType === 'first_payment' && '⚠️'}
                                                {durationType === 'limited_months' && '⏱️'}
                                            </span>
                                            <div>
                                                {durationType === 'forever' && (
                                                    <strong>{t('Lifetime Discount')}</strong>
                                                )}
                                                {durationType === 'first_payment' && (
                                                    <strong>{t('One-Time Discount')}</strong>
                                                )}
                                                {durationType === 'limited_months' && (
                                                    <strong>{t('Limited Time Discount')}</strong>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detailed Message */}
                                        <div style={{
                                            marginTop: '6px',
                                            paddingLeft: '22px',
                                            fontSize: '0.8rem',
                                            color: durationType === 'forever'
                                                ? '#15803d'
                                                : durationType === 'first_payment'
                                                    ? '#a16207'
                                                    : '#1d4ed8',
                                            lineHeight: '1.4'
                                        }}>
                                            {durationType === 'forever' && (
                                                <span>{t('This discount will be applied to all future billing cycles automatically.')}</span>
                                            )}
                                            {durationType === 'first_payment' && (
                                                <>
                                                    <span>{t('This discount applies to this payment only.')}</span>
                                                    <div style={{ marginTop: '6px', fontWeight: '500' }}>
                                                        {t('Future charges')}: {formatPrice(pricingData.subtotal)} + {t('tax')}
                                                    </div>
                                                </>
                                            )}
                                            {durationType === 'limited_months' && (
                                                <>
                                                    <span>
                                                        {t('Discounted price for {{count}} billing cycle(s).', { count: durationMonths || 1 })}
                                                    </span>
                                                    <div style={{ marginTop: '6px', fontWeight: '500' }}>
                                                        {t('After discount expires')}: {formatPrice(pricingData.subtotal)} + {t('tax')}/{t('cycle')}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Location Rules Info Box */}
                                {locationRulesText && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: '#f3e8ff',
                                        border: '1px solid #c4b5fd'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            color: '#6b21a8',
                                            fontSize: '0.85rem'
                                        }}>
                                            <span style={{ flexShrink: 0, marginTop: '1px' }}>📍</span>
                                            <div>
                                                <strong>{t('Location Requirement')}</strong>
                                            </div>
                                        </div>
                                        <div style={{
                                            marginTop: '6px',
                                            paddingLeft: '22px',
                                            fontSize: '0.8rem',
                                            color: '#7c3aed',
                                            lineHeight: '1.4'
                                        }}>
                                            <span>{t('This discount applies to')}: {locationRulesText}</span>
                                        </div>
                                    </div>
                                )}

                                {/* After Discount Row */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '10px',
                                    paddingTop: '8px',
                                    borderTop: '1px dashed #86efac'
                                }}>
                                    <span style={{ color: '#166534', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {t('After Discount')}
                                    </span>
                                    <span style={{ color: '#166534', fontWeight: '700', fontSize: '0.95rem' }}>
                                        {formatPrice(appliedDiscount.price)}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {tax_info.label && (
                        <div className="summary-row">
                            <span className="summary-label">{`${tax_info.label}  (${tax_info.value}%)`}</span>
                            <span className="summary-value">{formatPrice(pricingData.taxPrice)}</span>
                        </div>
                    )}
                </div>

                {pricingData.hasSpecialPrice && pricingData.savings > 0 && (
                    <div className="summary-section special-offer">
                        <div className="offer-badge">
                            <span className="offer-icon">🎉</span>
                            <span className="offer-text">{t("Special Offer Applied!")}</span>
                        </div>
                        <div className="savings-amount">
                            {t("You save")} {formatPrice(pricingData.savings)}
                        </div>
                    </div>
                )}

                <div className="summary-section total-section">
                    <div className="summary-row total-row">
                        <span className="summary-label">{t("Total")}</span>
                        <span className="summary-value total-amount">
                            {formatPrice(pricingData.totalPrice)}
                        </span>
                    </div>
                </div>

                <div className="summary-footer">
                    {planItem.trial && (
                        <div className="info-item">
                            <span className="info-icon">✓</span>
                            <span className="info-text">{t("Free trial available")}</span>
                        </div>
                    )}

                    {planItem.is_lifetime && (
                        <div className="info-item">
                            <span className="info-icon">✓</span>
                            <span className="info-text">{t("One-time payment for lifetime access")}</span>
                        </div>
                    )}

                </div>

                <div className="security-notice">
                    <div className="security-icon">🔒</div>
                    <div className="security-text">
                        <strong>{t("Secure Payment")}</strong>
                        <br />
                        {t("Your payment is protected by industry-standard encryption")}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(PaymentSummary);