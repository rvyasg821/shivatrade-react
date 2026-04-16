import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Button,
  Spinner,
  Alert
} from 'reactstrap';
import { ArrowLeft, Save, Check, MapPin, Plus, Minus } from 'react-feather';
import { useTranslation } from 'react-i18next';
import instance from '@src/utility/AxiosConfig';
import Notification from '@components/toast/notification';
import { appsRoot } from '@constant/defaultValues';
import { startLoading, stopLoading } from '@src/views/loadingstore';
import { formatPrice } from '@src/views/auth/register/utils/paymentValidation';
import { taxLabel as defaultTaxLabel, taxValue as defaultTaxPercentage } from '@constant/defaultValues';
import '@src/views/auth/register/components/PaymentSummary.scss';
import '@src/views/auth/register/Wizard.scss';
import './EditSubscriptionTools.scss';

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

const EditSubscriptionTools = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState(1);
  const [error, setError] = useState(null);

  // Check if subscription is trial, lifetime, or custom location (read-only for company admin)
  const isTrialOrLifetime = subscription?.trial === true || subscription?.is_lifetime === true;
  const isCustomLocation = subscription?.is_custom_location === true;
  const isReadOnly = isTrialOrLifetime || isCustomLocation;

  // Get location tiers from plan or subscription
  const locationTiers = useMemo(() => {
    return plan?.location_pricing || subscription?.location_pricing || [];
  }, [plan, subscription]);

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        dispatch(startLoading());
        setLoading(true);

        const response = await instance.get(
          `/public/subscription/${subscriptionId}`
        );

        if (response?.data?.statusCode === 200 && response?.data?.data) {
          const subData = response.data.data;
          setSubscription(subData);

          // Set initially selected tools from subscription
          const initialSelected = (subData.tools || []).map(tool => tool._id);
          setSelectedTools(initialSelected);

          // Set initial locations from subscription
          setSelectedLocations(subData.locations || 1);

          // Fetch plan details with tools
          if (subData.plan?._id) {
            await fetchPlanDetails(subData.plan._id);
          }
        } else {
          setError(t('Failed to load subscription details'));
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err.response?.data?.message || t('Failed to load subscription'));
        Notification('Error', t('Failed to load subscription'), 'error');
      } finally {
        setLoading(false);
        dispatch(stopLoading());
      }
    };

    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId, dispatch, t]);

  // Fetch plan details with tools — merge with subscription tools
  const fetchPlanDetails = async (planId, currentSelectedTools = []) => {
    try {
      const response = await instance.get(`/public/plan/${planId}`);

      if (response?.data?.statusCode === 200 && response?.data?.data) {
        const planData = response.data.data;
        setPlan(planData);

        const planTools = planData.tools || [];
        const planToolIds = new Set(planTools.map(t => t._id));

        // Get subscription tools that are NOT in the current plan (legacy tools)
        const subscriptionTools = subscription?.tools || [];
        const legacyTools = subscriptionTools
          .filter(st => !planToolIds.has(st._id))
          .map(st => ({
            ...st,
            price: st.base_price || st.calculated_price || 0,
            base_price: st.base_price || st.calculated_price || 0,
            _isLegacy: true, // Mark as legacy (removed from plan)
          }));

        // Build subscription tool map for price overrides
        const subToolMap = {};
        subscriptionTools.forEach(st => { subToolMap[st._id] = st; });

        // Mark new plan tools and use subscription prices for existing tools
        const subToolIds = new Set(subscriptionTools.map(st => st._id));
        const mergedTools = planTools.map(pt => {
          const subTool = subToolMap[pt._id];
          if (subTool) {
            // Existing tool — use subscription's stored prices (e.g., £0 for trial)
            return {
              ...pt,
              base_price: subTool.base_price ?? subTool.calculated_price ?? pt.base_price ?? pt.price ?? 0,
              price: subTool.calculated_price ?? subTool.base_price ?? pt.price ?? 0,
              _isNew: false,
            };
          }
          return {
            ...pt,
            _isNew: true, // Tool added to plan after subscription
          };
        });

        // Combine: plan tools + legacy tools
        const allTools = [...mergedTools, ...legacyTools];
        setAvailableTools(allTools);

        // Ensure mandatory tools are always selected
        const mandatoryToolIds = planTools
          .filter(tool => tool.mandatory || tool.is_mandatory)
          .map(tool => tool._id);

        if (mandatoryToolIds.length > 0) {
          setSelectedTools(prev => {
            const combined = [...new Set([...prev, ...mandatoryToolIds])];
            return combined;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
      Notification('Error', t('Failed to load plan details'), 'warning');
    }
  };

  // Toggle tool selection
  const toggleTool = (toolId) => {
    // Don't allow changes for trial/lifetime subscriptions (read-only mode)
    if (isReadOnly) {
      return;
    }

    // Check if tool is mandatory - don't allow toggling mandatory tools
    const tool = availableTools.find(t => t._id === toolId);
    // Check both 'mandatory' and 'is_mandatory' field names
    if (tool?.mandatory || tool?.is_mandatory) {
      return; // Don't allow toggling mandatory tools
    }

    setSelectedTools(prev => {
      if (prev.includes(toolId)) {
        return prev.filter(id => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  // Handle location change
  const handleLocationChange = useCallback((e) => {
    // Don't allow changes for trial/lifetime subscriptions (read-only mode)
    if (isReadOnly) {
      return;
    }
    const newLocations = parseInt(e.target.value);
    setSelectedLocations(newLocations);
  }, [isReadOnly]);

  // Get min and max locations from tiers
  const { minLocations, maxLocations } = useMemo(() => {
    if (locationTiers.length === 0) return { minLocations: 1, maxLocations: 10 };
    const locations = locationTiers.map(tier => tier.locations);
    return {
      minLocations: Math.min(...locations),
      maxLocations: Math.max(...locations)
    };
  }, [locationTiers]);

  // Calculate tool price based on pricing_mode and location
  // Trial/lifetime subscriptions are always free
  const calculateToolPrice = (tool) => {
    if (isTrialOrLifetime) return 0;

    const basePrice = tool.base_price ?? tool.price ?? 0;
    const pricingMode = tool.pricing_mode || 'fixed';
    const locationMultiplier = tool.location_multiplier || 1.0;

    if (pricingMode === 'multiplier') {
      return basePrice * selectedLocations * locationMultiplier;
    }
    return basePrice;
  };

  // Calculate all pricing data using useMemo for performance
  const pricingData = useMemo(() => {
    if (!subscription || !plan) return null;

    // Get plan base price from location_pricing
    const locationTiers = plan.location_pricing || subscription.location_pricing || [];
    const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
    const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];

    const planBasePrice = isTrialOrLifetime ? 0
      : currentTier?.special_price > 0
      ? currentTier.special_price
      : (currentTier?.price || subscription.plan_price || 0);

    // Get selected tools data
    const selectedToolsData = availableTools.filter(tool =>
      selectedTools.includes(tool._id)
    );

    // Calculate tools total with location-based pricing
    const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);

    // Calculate subtotal (plan + tools)
    const subtotal = planBasePrice + toolsTotal;

    // Get discount information from subscription
    const discountCode = subscription?.discount_code || null;
    const discountType = subscription?.discount_type || null;
    const discountValue = subscription?.discount_value || null;
    const discountDurationType = subscription?.discount_duration_type || null;
    const discountDurationMonths = subscription?.discount_duration_months || null;
    const discountRemainingMonths = subscription?.discount_remaining_months || null;
    const discountName = subscription?.discount_name || null;
    const discountLocationRules = subscription?.discount_location_rules || [];
    let discountPrice = 0;

    // Recalculate discount if exists
    if (discountCode && subscription?.discount_price > 0) {
      // Check if percentage discount
      const originalSubtotal = (subscription?.plan_price || 0) + (subscription?.tools_price || 0);
      if (originalSubtotal > 0) {
        const originalDiscountPercentage = (subscription.discount_price / originalSubtotal) * 100;
        // If looks like a percentage, recalculate
        if (Number.isInteger(originalDiscountPercentage) || originalDiscountPercentage % 0.5 === 0) {
          discountPrice = (subtotal * originalDiscountPercentage) / 100;
          discountPrice = Math.min(discountPrice, subtotal);
        } else {
          discountPrice = subscription.discount_price;
        }
      }
    }

    // Calculate after discount
    const priceAfterDiscount = Math.max(0, subtotal - discountPrice);

    // Calculate tax - use tax_info from backend (env TAX_VALUE), fallback to stored or default
    const taxRate = subscription?.tax_info?.value ?? subscription?.tax_rate ?? defaultTaxPercentage ?? 0;
    const taxPrice = (priceAfterDiscount * taxRate) / 100;

    // Calculate final total
    const totalPrice = priceAfterDiscount + taxPrice;

    // Check for special price savings
    const regularPrice = currentTier?.price || 0;
    const specialPrice = currentTier?.special_price || 0;
    const hasSpecialPrice = specialPrice > 0 && regularPrice > specialPrice;
    const savings = hasSpecialPrice ? (regularPrice - specialPrice) : 0;

    return {
      selectedToolsData,
      toolsTotal,
      planBasePrice,
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
      hasSpecialPrice,
      savings,
      selectedLocations,
      currentTier
    };
  }, [subscription, plan, availableTools, selectedTools, selectedLocations]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTools.length === 0) {
      Notification('Warning', t('Please select at least one tool'), 'warning');
      return;
    }

    if (!pricingData) {
      Notification('Error', t('Unable to calculate pricing'), 'error');
      return;
    }

    try {
      dispatch(startLoading());
      setSubmitting(true);

      // Prepare tools data with new pricing structure
      // Find correct slug from plan tools (authoritative source from tools table)
      const planToolMap = {};
      (plan?.tools || []).forEach(pt => { planToolMap[pt._id] = pt; });

      const toolsData = pricingData.selectedToolsData.map(tool => ({
        _id: tool._id,
        name: tool.name,
        slug: planToolMap[tool._id]?.slug || tool.slug || '',
        base_price: tool.price || tool.base_price || 0,
        pricing_mode: tool.pricing_mode || 'fixed',
        location_multiplier: tool.location_multiplier || 1.0,
        calculated_price: calculateToolPrice(tool),
        is_mandatory: tool.is_mandatory || false,
        display_order: tool.display_order || 0
      }));

      // Prepare update payload
      const updatePayload = {
        locations: selectedLocations,
        plan_price: pricingData.planBasePrice,
        tools: toolsData,
        tools_price: pricingData.toolsTotal,
        subtotal: pricingData.subtotal,
        discount_price: pricingData.discountPrice,
        total: pricingData.priceAfterDiscount,
        tax_price: pricingData.taxPrice,
        final_price: pricingData.totalPrice
      };

      const response = await instance.patch(
        `/public/subscription/update-tools/${subscriptionId}`,
        updatePayload
      );

      if (response?.data?.statusCode === 200) {
        // Update tools in localStorage so sidebar reflects immediately
        try {
          const raw = localStorage.getItem('userData');
          if (raw) {
            const stored = JSON.parse(raw);
            if (stored?.companyData) stored.companyData.tools = toolsData;
            if (stored?.userData?.company) stored.userData.company.tools = toolsData;
            localStorage.setItem('userData', JSON.stringify(stored));
          }
        } catch { }

        Notification('Success', t('Subscription updated successfully'), 'success');
        setTimeout(() => {
          window.location.href = `${appsRoot}/profile`;
        }, 1000);
      } else {
        throw new Error(response?.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      Notification(
        'Error',
        err.response?.data?.message || t('Failed to update subscription'),
        'error'
      );
    } finally {
      setSubmitting(false);
      dispatch(stopLoading());
    }
  };

  if (loading) {
    return (
      <div className="edit-subscription-loading">
        <Spinner color="primary" />
        <p className="mt-3">{t('Loading subscription details...')}</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="main-content">
        <Alert color="danger">
          <h4 className="alert-heading">{t('Error')}</h4>
          <p>{error || t('Subscription not found')}</p>
          <Button color="primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="me-1" />
            {t('Go Back')}
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="main-content edit-subscription-page">
      <div className="card third-step-main register-steps-main">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div>
            <h3 className="page-title">
              {isReadOnly ? t('Subscription Details') : t('Edit Subscription Tools')}
            </h3>
            <p className="page-subtitle">
              {isReadOnly
                ? t('View your subscription details below')
                : t('Customize your subscription by selecting the tools you need')
              }
            </p>
          </div>
          <Button type="button" className="ms-2 btn-primary" onClick={() => navigate(`${appsRoot}/profile`)}>
            <ArrowLeft size={17} />
          </Button>
        </div>


        {/* Content */}
        <div className="payment-container">
          <div className="row">
            {/* Tool Selection */}
            <div className="col-xl-7 col-lg-7">
              <div className="tools-selection-section">
                {/* Current Plan Info */}
                {/* <div className="plan-info-card">
                  <div className="plan-badge">
                    {plan?.name || subscription.plan?.name || 'N/A'}
                    {subscription?.recurring && (
                      <span className="recurring-badge">{t('Recurring')}</span>
                    )}
                  </div>
                  <div className="plan-details">
                    <div className="plan-detail-row">
                      <span className="plan-label">{t('Plan Price')}:</span>
                      <span className="plan-value">{formatPrice(pricingData?.planBasePrice || 0)}</span>
                    </div>
                  </div>
                </div> */}

                {/* Location Selector */}
                <div className="location-selector-section">
                  <h4 className="section-title">
                    <MapPin size={18} className="me-2" />
                    {t('Number of Locations')}
                  </h4>
                  <p className="section-description">
                    {isReadOnly
                      ? t('Your subscription includes the following locations')
                      : t('Select the number of business locations for your subscription')
                    }
                  </p>

                  <div className="location-selector">
                    {/* Custom Location - Read Only Display */}
                    {isCustomLocation ? (
                      <div className="custom-location-readonly">
                        <div className="row align-items-end">
                          <div className="col-md-6 mb-2">
                            <label className="form-label">
                              {t('Custom Locations')}
                              <span className="badge bg-info ms-2">{t('Custom Plan')}</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={`${selectedLocations} ${selectedLocations === 1 ? t('Location') : t('Locations')}`}
                              disabled
                              readOnly
                            />
                          </div>
                          <div className="col-md-6 mb-2">
                            <label className="form-label">{t('Plan Price')}</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formatPrice(subscription?.plan_price || 0)}
                              disabled
                              readOnly
                            />
                          </div>
                        </div>
                        <small className="text-muted">
                          {t('This subscription has a custom location count set by administrator.')}
                        </small>
                      </div>
                    ) : locationTiers.length > 0 ? (
                      <select
                        className="location-select form-select"
                        value={selectedLocations}
                        onChange={handleLocationChange}
                        disabled={isReadOnly}
                      >
                        {[...locationTiers]
                          .sort((a, b) => a.locations - b.locations)
                          .map((tier) => (
                            <option key={tier.locations} value={tier.locations}>
                              {tier.locations} {tier.locations === 1 ? t('Location') : t('Locations')}
                              {tier.special_price > 0
                                ? ` - ${formatPrice(tier.special_price)}`
                                : ` - ${formatPrice(tier.price)}`}
                              {tier.special_price > 0 && tier.price > tier.special_price && (
                                ` (Save ${formatPrice(tier.price - tier.special_price)})`
                              )}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="location-counter">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => !isReadOnly && setSelectedLocations(prev => Math.max(1, prev - 1))}
                          disabled={selectedLocations <= 1 || isReadOnly}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="location-count">{selectedLocations}</span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => !isReadOnly && setSelectedLocations(prev => prev + 1)}
                          disabled={isReadOnly}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}

                    {!isCustomLocation && selectedLocations !== subscription?.locations && (
                      <div className="location-change-notice">
                        <span className="notice-icon">ℹ️</span>
                        <span className="notice-text">
                          {t('Location changed from')} {subscription?.locations || 1} {t('to')} {selectedLocations}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Tools */}
                <h4 className="section-title">
                  {isReadOnly ? t('Included Tools') : t('Available Tools')}
                </h4>
                <p className="section-description">
                  {isReadOnly
                    ? t('Your subscription includes the following tools')
                    : t('Select the tools you want to include in your subscription')
                  }
                </p>

                <div className="tools-grid">
                  {availableTools.map(tool => {
                    const isSelected = selectedTools.includes(tool._id);
                    const toolPrice = calculateToolPrice(tool);
                    const isMultiplier = tool.pricing_mode === 'multiplier';
                    const isMandatory = tool.mandatory === true || tool.is_mandatory === true;
                    const isLegacy = tool._isLegacy === true;
                    const isNew = tool._isNew === true;
                    const isDisabled = isReadOnly || isMandatory;

                    return (
                      <div
                        key={tool._id}
                        className={`tool-card ${isSelected ? 'selected' : ''} ${isMandatory ? 'mandatory' : ''} ${isReadOnly ? 'read-only' : ''} ${isLegacy ? 'legacy' : ''}`}
                        onClick={() => !isDisabled && toggleTool(tool._id)}
                        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.8 : 1 }}
                      >
                        <div className="tool-card-header">
                          <div className="tool-checkbox">
                            <input
                              type="checkbox"
                              id={`tool-${tool._id}`}
                              checked={isSelected || isMandatory}
                              onChange={() => !isDisabled && toggleTool(tool._id)}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isDisabled}
                            />
                            <label htmlFor={`tool-${tool._id}`}></label>
                          </div>
                          {isMandatory && (
                            <div className="mandatory-badge">
                              {t("Required")}
                            </div>
                          )}
                          {isNew && !isMandatory && (
                            <span className="doc-badge doc-badge-green" style={{ fontSize: '0.65rem' }}>
                              {t("New")}
                            </span>
                          )}
                          {isLegacy && (
                            <span className="doc-badge doc-badge-orange" style={{ fontSize: '0.65rem' }}>
                              {t("Legacy")}
                            </span>
                          )}
                          {isSelected && !isMandatory && !isNew && !isLegacy && (
                            <div className="selected-badge">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <div className="tool-card-body">
                          <h5 className="tool-name">{tool.name}</h5>
                          {tool.description && (
                            <p className="tool-description">{tool.description}</p>
                          )}
                          <div className="tool-price-info">
                            <div className="tool-price">
                              {formatPrice(toolPrice)}
                            </div>
                            {isMultiplier && selectedLocations > 1 && (
                              <div className="tool-price-detail">
                                <small className="text-muted">
                                  {formatPrice(tool.price || 0)} × {selectedLocations} loc × {tool.location_multiplier}
                                </small>
                              </div>
                            )}
                            {isMultiplier && (
                              <span className="pricing-mode-badge">
                                Per Location
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {availableTools.length === 0 && (
                  <div className="no-tools-message">
                    <p>{t('No tools available for this plan')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary - Identical to signup process */}
            <div className="col-xl-5 col-lg-5">
              <div className="payment-summary-section">
                <div className="payment-summary">
                  <div className="summary-header">
                    <div className="plan-badge">
                      {plan?.name || subscription.plan?.name}
                      {subscription?.recurring && <span className="recurring-badge">{t('Recurring')}</span>}
                    </div>
                    <h4 className="summary-title">{t('Payment Summary')}</h4>
                  </div>

                  <div className="summary-content">
                    {/* Plan Price with Locations */}
                    <div className="summary-section">
                      <div className="summary-row">
                        <span className="summary-label">
                          {plan?.name || subscription.plan?.name}
                          <small className="text-muted ms-1">
                            ({selectedLocations} {selectedLocations === 1 ? t('Location') : t('Locations')})
                          </small>
                        </span>
                        <span className="summary-value">
                          {formatPrice(pricingData?.planBasePrice || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Selected Tools */}
                    {pricingData?.selectedToolsData?.length > 0 && (
                      <div className="summary-section">
                        <h5 className="section-title">{t('Selected Tools')}</h5>
                        {pricingData.selectedToolsData.map((tool) => {
                          const calculatedPrice = calculateToolPrice(tool);
                          const isMultiplier = tool.pricing_mode === 'multiplier';
                          return (
                            <div key={tool._id} className="summary-row tool-row">
                              <span className="summary-label">
                                <span className="tool-icon">✓</span>
                                {tool.name}
                                {isMultiplier && (
                                  <small className="text-muted ms-1">(×{selectedLocations})</small>
                                )}
                              </span>
                              <span className="summary-value">
                                {calculatedPrice > 0 ? formatPrice(calculatedPrice) : t('Included')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Subtotals */}
                    <div className="summary-section">
                      <div className="summary-row">
                        <span className="summary-label">{t('Tools Subtotal')}</span>
                        <span className="summary-value">{formatPrice(pricingData?.toolsTotal || 0)}</span>
                      </div>

                      <div className="summary-row">
                        <span className="summary-label">{t('Subtotal')}</span>
                        <span className="summary-value">{formatPrice(pricingData?.subtotal || 0)}</span>
                      </div>

                      {/* Discount Details Card */}
                      {pricingData?.discountCode && pricingData?.discountPrice > 0 && (
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
                            <span style={{
                              background: '#22c55e',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {pricingData.discountCode}
                            </span>
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
                              {pricingData.discountType === 'percentage'
                                ? t('{{value}}% off your subscription', { value: pricingData.discountValue })
                                : pricingData.discountValue
                                  ? t('{{amount}} off your subscription', { amount: formatPrice(pricingData.discountValue) })
                                  : t('Discount applied')
                              }
                            </span>
                            <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1rem' }}>
                              -{formatPrice(pricingData.discountPrice)}
                            </span>
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
                              {/* Duration Type Icon & Message */}
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

                              {/* Detailed Message */}
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
                              {formatPrice(pricingData.priceAfterDiscount)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tax */}
                      <div className="summary-row">
                        <span className="summary-label">
                          {subscription?.tax_info?.label || defaultTaxLabel} ({pricingData?.taxRate ?? 0}%)
                        </span>
                        <span className="summary-value">{formatPrice(pricingData?.taxPrice || 0)}</span>
                      </div>
                    </div>

                    {/* Special Price Savings */}
                    {pricingData?.hasSpecialPrice && pricingData?.savings > 0 && (
                      <div className="summary-section special-offer">
                        <div className="offer-badge">
                          <span className="offer-icon">🎉</span>
                          <span className="offer-text">{t('Special Offer Applied!')}</span>
                        </div>
                        <div className="savings-amount">
                          {t('You save')} {formatPrice(pricingData.savings)}
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="summary-section total-section">
                      <div className="summary-row total-row">
                        <span className="summary-label">{t('Total')}</span>
                        <span className="summary-value total-amount">
                          {formatPrice(pricingData?.totalPrice || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Info Notice */}
                    <div className="summary-footer">
                      <div className="info-item">
                        <span className="info-icon">ℹ️</span>
                        <span className="info-text">
                          {t('Changes will be reflected in your next billing cycle')}
                        </span>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="security-notice">
                      <div className="security-icon">🔒</div>
                      <div className="security-text">
                        <strong>{t('Secure Payment')}</strong>
                        <br />
                        {t('Your payment is protected by industry-standard encryption')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="main-form-btn mt-2 justify-content-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`${appsRoot}/profile`)}
                disabled={submitting}
              >
                {isReadOnly ? t('Back') : t('Cancel')}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                  onClick={handleSubmit}
                  disabled={submitting || selectedTools.length === 0}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      {t('Updating...')}
                    </>
                  ) : (
                    <>
                      <Save size={16} className="me-2" />
                      {t('Update Subscription')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSubscriptionTools;
