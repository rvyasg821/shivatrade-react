import { formatDate as sharedFormatDate } from "@src/utility/dateFormat";
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardBody, CardHeader, Badge, Button, Spinner, Progress, Row, Col } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import { Calendar, Package, MapPin, Clock, Check, CreditCard, RefreshCw } from 'react-feather';
import { fetchMySubscription } from './store';
import { formatPrice } from '@src/views/auth/register/utils/paymentValidation';
import { taxLabel as defaultTaxLabel, taxValue as defaultTaxPercentage } from '@constant/defaultValues';

/**
 * Format location rules for display
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

const SubscriptionCard = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const {
        subscription,
        subscriptionLoading,
        subscriptionError
    } = useSelector((state) => state.DashboardWidgets);

    useEffect(() => {
        dispatch(fetchMySubscription());
    }, [dispatch]);

    // Debug log for discount fields
    useEffect(() => {
        if (subscription) {
            console.log('SubscriptionCard - Full subscription data:', subscription);
            console.log('SubscriptionCard - Discount fields:', {
                discount_code: subscription.discount_code,
                discount_price: subscription.discount_price,
                discount_type: subscription.discount_type,
                discount_value: subscription.discount_value,
                discount_duration_type: subscription.discount_duration_type,
                discount_duration_months: subscription.discount_duration_months,
                discount_remaining_months: subscription.discount_remaining_months,
                discount_location_rules: subscription.discount_location_rules,
            });
        }
    }, [subscription]);

    // Was en-US ("Jul 14, 2026"). Shared DD-MM-YYYY helper — one format app-wide.
    const formatDate = (dateString) =>
        dateString ? sharedFormatDate(dateString) : 'N/A';

    const getStatusBadge = (sub) => {
        if (!sub) return <Badge color="secondary">{t('No Subscription')}</Badge>;

        if (sub.trial) {
            return <Badge color="info">{t('Trial')}</Badge>;
        }
        if (sub.is_lifetime) {
            return <Badge color="success">{t('Lifetime')}</Badge>;
        }
        if (sub.status) {
            return <Badge color="success">{t('Active')}</Badge>;
        }
        return <Badge color="danger">{t('Inactive')}</Badge>;
    };

    const getDaysRemaining = (endDate) => {
        if (!endDate) return null;
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    // Calculate pricing data from subscription
    const pricingData = useMemo(() => {
        if (!subscription) return null;

        const selectedLocations = subscription.locations || 1;
        const planBasePrice = subscription.plan_price || 0;
        const toolsTotal = subscription.tools_price || 0;
        const subtotal = subscription.subtotal || (planBasePrice + toolsTotal);

        const discountCode = subscription.discount_code || null;
        const discountType = subscription.discount_type || null;
        const discountValue = subscription.discount_value || null;
        const discountPrice = subscription.discount_price || 0;
        const discountDurationType = subscription.discount_duration_type || null;
        const discountDurationMonths = subscription.discount_duration_months || null;
        const discountRemainingMonths = subscription.discount_remaining_months || null;
        const discountName = subscription.discount_name || null;
        const discountLocationRules = subscription.discount_location_rules || [];

        const priceAfterDiscount = subscription.total || Math.max(0, subtotal - discountPrice);
        const taxRate = subscription.tax_info?.value ?? subscription.tax_rate ?? defaultTaxPercentage ?? 0;
        const taxPrice = subscription.tax_price || ((priceAfterDiscount * taxRate) / 100);
        const totalPrice = subscription.final_price || (priceAfterDiscount + taxPrice);
        const tools = subscription.tools || [];

        return {
            selectedLocations,
            planBasePrice,
            toolsTotal,
            subtotal,
            discountCode,
            discountType,
            discountValue,
            discountPrice,
            discountDurationType,
            discountDurationMonths,
            discountRemainingMonths,
            discountName,
            discountLocationRules,
            priceAfterDiscount,
            taxRate,
            taxPrice,
            totalPrice,
            tools
        };
    }, [subscription]);

    const getPlanName = (sub) => {
        if (!sub) return t('Standard Plan');
        return sub.plan?.name || sub.plan_id?.name || sub.plan_name || sub.planName || t('Standard Plan');
    };

    const getPlanType = (sub) => {
        if (!sub) return '';
        return sub.plan_type || sub.plan?.plan_type || '';
    };

    if (subscriptionLoading) {
        return (
            <Card className="subscription-card">
                <CardBody className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <Spinner color="primary" />
                </CardBody>
            </Card>
        );
    }

    if (subscriptionError && !subscription) {
        return (
            <Card className="subscription-card">
                <CardBody className="text-center py-4">
                    <p className="text-muted mb-0">{t('Unable to load subscription details')}</p>
                </CardBody>
            </Card>
        );
    }

    const daysRemaining = subscription?.end_date ? getDaysRemaining(subscription.end_date) : null;

    return (
        <Card className="subscription-card shadow-sm">
            <CardHeader className="bg-gradient-primary text-white d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="mb-0 text-white">{t('Your Subscription')}</h5>
                </div>
                {getStatusBadge(subscription)}
            </CardHeader>
            <CardBody>
                {subscription ? (
                    <>
                        <Row>
                            {/* Column 1 - Subscription Details */}
                            <Col lg={4} md={12} className="subscription-info-column mb-2">
                                <div className="subscription-info-section">
                                    <h6 className="section-header">
                                        <Package size={16} className="me-2" />
                                        {t('Subscription Details')}
                                    </h6>

                                    <div className="info-item">
                                        <span className="info-label">{t('Plan')}</span>
                                        <span className="info-value">
                                            {getPlanName(subscription)}
                                            {getPlanType(subscription) && (
                                                <Badge color="light-primary" className="ms-2" pill>
                                                    {getPlanType(subscription)}
                                                </Badge>
                                            )}
                                        </span>
                                    </div>

                                    {pricingData?.selectedLocations > 0 && (
                                        <div className="info-item">
                                            <span className="info-label"><MapPin size={14} className="me-1" />{t('Locations')}</span>
                                            <span className="info-value">{pricingData.selectedLocations} {pricingData.selectedLocations === 1 ? t('Location') : t('Locations')}</span>
                                        </div>
                                    )}

                                    <div className="info-item">
                                        <span className="info-label"><Calendar size={14} className="me-1" />{t('Started')}</span>
                                        <span className="info-value">{formatDate(subscription.start_date || subscription.createdAt)}</span>
                                    </div>

                                    {/* Trial End / Next Billing Date */}
                                    {subscription.end_date && !subscription.is_lifetime && (
                                        <div className="info-item">
                                            <span className="info-label">
                                                <Clock size={14} className="me-1" />
                                                {subscription.trial ? t('Trial Ends') : t('Next Billing')}
                                            </span>
                                            <span className="info-value">
                                                {formatDate(subscription.end_date)}
                                                {daysRemaining !== null && (
                                                    <Badge color={daysRemaining <= 7 ? 'light-warning' : 'light-info'} className="ms-2" pill>
                                                        {daysRemaining} {t('days')}
                                                    </Badge>
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {subscription.is_lifetime && (
                                        <div className="info-item">
                                            <span className="info-label"><Clock size={14} className="me-1" />{t('Duration')}</span>
                                            <span className="info-value text-success fw-bold">{t('Lifetime Access')}</span>
                                        </div>
                                    )}

                                    {subscription.recurring && (
                                        <div className="info-item">
                                            <span className="info-label"><RefreshCw size={14} className="me-1" />{t('Billing')}</span>
                                            <span className="info-value"><Badge color="light-success" pill>{t('Auto-Renewal')}</Badge></span>
                                        </div>
                                    )}
                                </div>
                            </Col>

                            {/* Column 2 - Included Tools */}
                            <Col lg={4} md={12} className="mb-2">
                                {pricingData?.tools?.length > 0 && (
                                    <div className="subscription-info-section">
                                        <h6 className="section-header">
                                            <Check size={16} className="me-2" />
                                            {t('Included Tools')} ({pricingData.tools.length})
                                        </h6>
                                        <div className="tools-list">
                                            {pricingData.tools.map((tool) => (
                                                <div key={tool._id} className="tool-item">
                                                    <Check size={12} className="text-success me-2" />
                                                    <span>{tool.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Col>

                            {/* Column 3 - Payment Summary */}
                            <Col lg={4} md={12} className="payment-info-column mb-2">
                                <div className="payment-info-section">
                                    <h6 className="section-header">
                                        <CreditCard size={16} className="me-2" />
                                        {t('Payment Summary')}
                                    </h6>

                                    {/* Plan Price */}
                                    <div className="price-row">
                                        <span className="price-label">{t('Plan Price')}</span>
                                        <span className="price-value">{formatPrice(pricingData?.planBasePrice || 0)}</span>
                                    </div>

                                    {/* Tools Price */}
                                    {pricingData?.toolsTotal > 0 && (
                                        <div className="price-row">
                                            <span className="price-label">{t('Tools')}</span>
                                            <span className="price-value">{formatPrice(pricingData.toolsTotal)}</span>
                                        </div>
                                    )}

                                    {/* Subtotal */}
                                    <div className="price-row subtotal-row">
                                        <span className="price-label">{t('Subtotal')}</span>
                                        <span className="price-value">{formatPrice(pricingData?.subtotal || 0)}</span>
                                    </div>

                                    {/* Discount Card */}
                                    {pricingData?.discountCode && pricingData?.discountPrice > 0 && (
                                        <div className="discount-card">
                                            <div className="discount-header">
                                                <span className="discount-icon">🎉</span>
                                                <span className="discount-title">{t('Discount Applied')}</span>
                                                <Badge color="success" pill className="discount-badge">
                                                    {pricingData.discountCode}
                                                </Badge>
                                            </div>

                                            <div className="discount-amount">
                                                <span>
                                                    {pricingData.discountType === 'percentage'
                                                        ? t('{{value}}% off your subscription', { value: pricingData.discountValue })
                                                        : pricingData.discountValue
                                                            ? t('{{amount}} off your subscription', { amount: formatPrice(pricingData.discountValue) })
                                                            : t('Discount applied')
                                                    }
                                                </span>
                                                <span className="text-success fw-bold">-{formatPrice(pricingData.discountPrice)}</span>
                                            </div>

                                            {/* Duration Info Box */}
                                            {pricingData.discountDurationType && (
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: pricingData.discountDurationType === 'forever'
                                                        ? '#dcfce7'
                                                        : pricingData.discountDurationType === 'first_payment'
                                                            ? '#fef3c7'
                                                            : '#dbeafe',
                                                    border: pricingData.discountDurationType === 'forever'
                                                        ? '1px solid #86efac'
                                                        : pricingData.discountDurationType === 'first_payment'
                                                            ? '1px solid #fcd34d'
                                                            : '1px solid #93c5fd'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '8px',
                                                        color: pricingData.discountDurationType === 'forever'
                                                            ? '#166534'
                                                            : pricingData.discountDurationType === 'first_payment'
                                                                ? '#92400e'
                                                                : '#1e40af',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        <span style={{ flexShrink: 0, marginTop: '1px' }}>
                                                            {pricingData.discountDurationType === 'forever' && '✓'}
                                                            {pricingData.discountDurationType === 'first_payment' && '⚠️'}
                                                            {pricingData.discountDurationType === 'limited_months' && '⏱️'}
                                                        </span>
                                                        <div>
                                                            {pricingData.discountDurationType === 'forever' && (
                                                                <strong>{t('Lifetime Discount')}</strong>
                                                            )}
                                                            {pricingData.discountDurationType === 'first_payment' && (
                                                                <strong>{t('One-Time Discount')}</strong>
                                                            )}
                                                            {pricingData.discountDurationType === 'limited_months' && (
                                                                <strong>{t('Limited Time Discount')}</strong>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        marginTop: '6px',
                                                        paddingLeft: '22px',
                                                        fontSize: '0.8rem',
                                                        color: pricingData.discountDurationType === 'forever'
                                                            ? '#15803d'
                                                            : pricingData.discountDurationType === 'first_payment'
                                                                ? '#a16207'
                                                                : '#1d4ed8',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {pricingData.discountDurationType === 'forever' && (
                                                            <span>{t('This discount will be applied to all future billing cycles automatically.')}</span>
                                                        )}
                                                        {pricingData.discountDurationType === 'first_payment' && (
                                                            <>
                                                                <span>{t('This discount applies to this payment only.')}</span>
                                                                <div style={{ marginTop: '6px', fontWeight: '500' }}>
                                                                    {t('Future charges')}: {formatPrice(pricingData.subtotal)} + {t('tax')}
                                                                </div>
                                                            </>
                                                        )}
                                                        {pricingData.discountDurationType === 'limited_months' && (
                                                            <>
                                                                <span>
                                                                    {pricingData.discountRemainingMonths
                                                                        ? t('{{remaining}} of {{total}} discounted cycles remaining.', {
                                                                            remaining: pricingData.discountRemainingMonths,
                                                                            total: pricingData.discountDurationMonths || pricingData.discountRemainingMonths
                                                                        })
                                                                        : t('Discounted price for {{count}} billing cycle(s).', { count: pricingData.discountDurationMonths || 1 })
                                                                    }
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
                                            {pricingData.discountLocationRules && pricingData.discountLocationRules.length > 0 && (() => {
                                                const locationRulesText = formatLocationRules(pricingData.discountLocationRules, t);
                                                if (!locationRulesText) return null;
                                                return (
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
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* After Discount */}
                                    {pricingData?.discountPrice > 0 && (
                                        <div className="price-row">
                                            <span className="price-label">{t('After Discount')}</span>
                                            <span className="price-value">{formatPrice(pricingData.priceAfterDiscount)}</span>
                                        </div>
                                    )}

                                    {/* Tax */}
                                    {pricingData?.taxRate > 0 && (
                                        <div className="price-row">
                                            <span className="price-label">
                                                {subscription?.tax_info?.label || defaultTaxLabel} ({pricingData.taxRate}%)
                                            </span>
                                            <span className="price-value">{formatPrice(pricingData.taxPrice || 0)}</span>
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="price-row total-row">
                                        <span className="price-label">
                                            {subscription.recurring ? t('Recurring Total') : t('Total')}
                                        </span>
                                        <span className="price-value total-value">
                                            {formatPrice(pricingData?.totalPrice || 0)}
                                            {subscription.recurring && (
                                                <small className="billing-cycle">
                                                    /{subscription.plan_type === 'YEARLY' ? t('year') : t('month')}
                                                </small>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <Package size={48} className="text-muted mb-3" />
                        <p className="text-muted mb-0">{t('No active subscription found')}</p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default SubscriptionCard;
