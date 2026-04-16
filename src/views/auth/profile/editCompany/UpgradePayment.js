import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, ArrowLeft, AlertTriangle } from 'react-feather';
import { paypalCardPayment, cleanPaymentMessage, applyDiscountCode, clearAppliedDiscountData } from '@src/views/auth/register/store';
import PaymentForm from '@src/views/auth/register/components/PaymentForm';
import StripeCardForm from '@src/views/auth/register/components/StripeCardForm';
import StripeProvider from '@src/views/auth/register/components/StripeProvider';
import PaymentSummary from '@src/views/auth/register/components/PaymentSummary';
import Notification from '@src/@core/components/toast/notification';
import { getDomailUrl } from '@src/utility/Utils';
import { appsRoot } from '@constant/defaultValues';
import '@src/views/auth/register/components/PaymentForm.scss';
import '@src/views/auth/register/components/PaymentSummary.scss';
import { useNavigate } from 'react-router-dom';
import { startLoading, stopLoading } from '@src/views/loadingstore';
import "@src/views/auth/register/Wizard.scss"
import { getAuthMe } from '@src/views/auth/store/';
import { updateSubscriptionStatus } from '@src/utility/subscriptionHelpers';
import { setSubscriptionTools } from '@src/redux/authentication';
import instance from '@src/utility/AxiosConfig';
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints';
import {
  stripeCardPaymentRequest,
  buildStripePaymentPayload,
  validateStripePaymentResponse,
  generateStripeRequestId
} from '@src/views/auth/register/utils/stripePaymentApi';

const UpgradePayment = ({ nextStep, prevStep }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const savedPlan = JSON.parse(localStorage.getItem("selectedPlan"))
    const savedTools = JSON.parse(localStorage.getItem("selectedTools") || "[]");
    const savedCycle = localStorage.getItem("billingCycle");
    const savedTaxInfo = JSON.parse(localStorage.getItem("taxInfo") || "{}");
    const savedLocations = JSON.parse(localStorage.getItem("selectedLocations") || "1");

    // Get payment gateway from store or localStorage
    const storePaymentGateway = useSelector(state => state.register?.payment_gateway);
    const savedPaymentGateway = localStorage.getItem('paymentGateway');
    const configuredGateway = storePaymentGateway || savedPaymentGateway || 'stripe';

    // Payment gateway selector state - set to configured gateway
    const [selectedGateway, setSelectedGateway] = useState(configuredGateway);
    const [stripeLoading, setStripeLoading] = useState(false);

    const {
        planSelection,
        authUserItem: storeRegisterItem
    } = useSelector(state => state.auth);

    const {
        paymentLoading,
        paymentActionFlag,
        paymentSuccess,
        paymentError,
        paymentItem,
        tax_info,
        appliedDiscount
    } = useSelector(state => state.register);

    // Get discount warning from subscription store
    const { discountWarning } = useSelector(state => state.subscription);
    console.log("payment", paymentActionFlag)
    const store = useSelector((state) => state.auth);
    const authUserItem = storeRegisterItem?._id
        ? storeRegisterItem
        : JSON.parse(localStorage.getItem("authUserItem") || "{}");

    const { selectedPlan, selectedTools, billingCycle, selectedLocations: storeSelectedLocations } = planSelection || {};
    const selectedLocations = storeSelectedLocations || savedLocations || 1;

    // Calculate tool price based on pricing_mode and location
    const calculateToolPrice = useCallback((tool) => {
        const basePrice = tool.base_price ?? tool.price ?? 0;
        const pricingMode = tool.pricing_mode || 'fixed';
        const locationMultiplier = tool.location_multiplier || 1.0;

        if (pricingMode === 'multiplier') {
            // Always apply the multiplier for multiplier mode
            return basePrice * selectedLocations * locationMultiplier;
        }
        return basePrice;
    }, [selectedLocations]);

    // Get plan base price from location_pricing
    const getPlanBasePrice = useCallback((plan) => {
        if (!plan) return 0;
        const locationTiers = plan.location_pricing || [];
        const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
        const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
        return currentTier?.special_price > 0
            ? currentTier.special_price
            : (currentTier?.price || plan.platform_price || 0);
    }, [selectedLocations]);

    useEffect(() => {
        if (paymentLoading) {
            dispatch(startLoading())
        } else {
            dispatch(stopLoading())
        }
    }, [paymentLoading])

    // Handle payment response
    useEffect(() => {

        if (paymentActionFlag === "PPAL_CRD_PMNT_SCS" && paymentItem) {
            if (paymentItem.redirectConfirm) {
                // Redirect to PayPal for payment confirmation
                window.location.href = paymentItem.redirectConfirm;
            } else if (paymentItem._id && paymentItem.status === "completed") {
                // Payment completed → refresh subscription tools so the nav menu,
                // dashboard widgets, and route guards immediately reflect the
                // new tool set without requiring re-login.
                instance.get(API_ENDPOINTS.subscription.myStatus)
                    .then(res => {
                        const data = res?.data?.data;
                        if (data) {
                            dispatch(setSubscriptionTools({
                                tools: data.tools || [],
                                isActive: data.is_active,
                            }));
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        updateSubscriptionStatus(true);
                        dispatch(getAuthMe({}));
                        navigate(`${appsRoot}/profile/`);
                    });
            }
        }

    }, [paymentActionFlag, paymentItem, nextStep, dispatch]);

    useEffect(() => {
        if (paymentSuccess) {
            Notification("Success", paymentSuccess, "success");
        }

        if (paymentError) {
            Notification("Error", paymentError, "warning");
        }

        if (paymentSuccess || paymentError) {
            setTimeout(() => {
                dispatch(cleanPaymentMessage());
                dispatch(clearAppliedDiscountData());
            }, 100);
        }
    }, [paymentSuccess, paymentError, dispatch]);

    useEffect(() => {
        if (store?.actionFlag === "AUTH_ME_SCS" && store?.authUserItem) {
            // handleManageMenu(store.authUserItem?.role);
            localStorage.removeItem('registerFormData')
            localStorage.removeItem('authUserItem')
            localStorage.removeItem('selectedPlan')
            localStorage.removeItem('selectedTools')
            localStorage.removeItem('billingCycle')
            localStorage.removeItem('taxInfo')
            // Redirect to profile page to view subscription details
            navigate(`${appsRoot}/profile`, { replace: true });

        }
    }, [store.actionFlag])

    const validateCode = async (event) => {
        const code = event?.target?.value?.trim();

        if (!code) {
            dispatch(clearAppliedDiscountData());
            return;
        }

        try {
            const plan = selectedPlan || savedPlan;
            const tools = selectedTools?.length ? selectedTools : savedTools;
            const locations = selectedLocations || savedLocations || 1;
            const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];
            const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
            const planBasePrice = getPlanBasePrice(plan);
            const subtotal = toolsTotal + planBasePrice;

            const applyPayload = {
                code: code,
                user_id: authUserItem._id,
                amount: subtotal,
                locations: locations // Include locations for location-based discount validation
            };

            console.log('🔍 Applying discount with payload:', applyPayload);
            await dispatch(applyDiscountCode(applyPayload)).unwrap();
        } catch (err) {
            console.error('❌ Discount validation error:', err);
            // Error handled by Redux - notification will be shown
        }
    };

    const handlePaymentSubmit = useCallback((paymentData) => {
        // Fallback to localStorage if store is empty
        const plan = selectedPlan || savedPlan;
        const tools = selectedTools?.length ? selectedTools : savedTools;
        const cycle = billingCycle || savedCycle;
        const locations = selectedLocations || savedLocations || 1;
        const tax =
            tax_info && Object.keys(tax_info).length
                ? tax_info
                : typeof savedTaxInfo === "string"
                    ? JSON.parse(savedTaxInfo || "{}")
                    : savedTaxInfo || {};

        if (!plan) {
            Notification("Error", "Please select a plan to continue", "warning");
            return;
        }

        if (!authUserItem._id) {
            Notification("Error", "Registration data not found. Please start over.", "warning");
            return;
        }

        // Calculate final pricing using location-based logic
        const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];
        const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
        const planBasePrice = getPlanBasePrice(plan);
        const subtotal = toolsTotal + planBasePrice;
        const taxValue = tax.value || 0;

        let taxPrice = (subtotal * (taxValue / 100));
        let finalPrice = subtotal + taxPrice;

        // Apply discount if available
        if (appliedDiscount?.price) {
            finalPrice = appliedDiscount?.price + (appliedDiscount?.price * (taxValue / 100));
            taxPrice = (appliedDiscount?.price * (taxValue / 100));
        }

        let total = appliedDiscount?.price ?? subtotal;

        // Prepare payment payload with new pricing structure
        const paymentPayload = {
            lang: 'en',
            user_id: authUserItem._id,
            customer_id: authUserItem._id,
            plan_id: plan._id,
            selected_tools: tools,
            billing_cycle: cycle,
            locations: locations,
            holder_name: paymentData.holder_name,
            card_number: paymentData.card_number,
            expiry_month: paymentData.expiry_month,
            expiry_year: paymentData.expiry_year,
            card_cvv: paymentData.card_cvv,
            plan_price: planBasePrice,
            price: planBasePrice,
            special_price: null,
            special_price_duration: null,
            final_price: finalPrice,
            tax_value: parseFloat(taxPrice),
            subtotal: subtotal,
            total: total,
            tools_price: toolsTotal,
            platform_fee: planBasePrice,
            plan_details: {
                name: plan.name,
                description: plan.description,
                duration: plan.duration,
                duration_type: plan.duration_type,
                tools_count: selectedToolsData.length,
                total_tools_available: plan.tools?.length || 0,
                locations: locations
            },
            tools: selectedToolsData.map(tool => ({
                _id: tool._id,
                name: tool.name,
                slug: tool.slug || tool.name.toLowerCase().replace(/\s+/g, '-'),
                base_price: tool.price || 0,
                pricing_mode: tool.pricing_mode || 'fixed',
                location_multiplier: tool.location_multiplier || 1.0,
                calculated_price: calculateToolPrice(tool)
            })),
            user_details: {
                company_name: authUserItem?.company?.company_name,
                email: authUserItem.email,
                fname: authUserItem.first_name,
                lname: authUserItem.last_name,
                mobile: authUserItem.mobile,
                country_code: authUserItem.country_code?.code || '+1'
            },
            redirect_url: `${getDomailUrl()}${appsRoot}/profile`,
            timestamp: new Date().toISOString(),
            source: 'upgrade_flow'
        };

        // Add discount information if provided
        if (paymentData?.discount_code?.trim()) {
            paymentPayload.discount_code = paymentData.discount_code.trim();
        }
        if (appliedDiscount?.discounted_price) {
            paymentPayload.discount_price = appliedDiscount?.discounted_price;
        }
        if (appliedDiscount?.data?._id) {
            paymentPayload.discount_id = appliedDiscount.data._id;
        }
        // Add discount duration info
        if (appliedDiscount?.duration?.type || appliedDiscount?.duration_type) {
            paymentPayload.discount_duration_type = appliedDiscount.duration?.type || appliedDiscount.duration_type;
        }
        if (appliedDiscount?.duration?.months || appliedDiscount?.duration_months) {
            paymentPayload.discount_duration_months = appliedDiscount.duration?.months || appliedDiscount.duration_months;
        }
        if (appliedDiscount?.data?.name || appliedDiscount?.discount_name) {
            paymentPayload.discount_name = appliedDiscount.data?.name || appliedDiscount.discount_name;
        }

        dispatch(paypalCardPayment(paymentPayload));
    }, [selectedPlan, selectedTools, authUserItem, billingCycle, dispatch, savedPlan, savedTools, savedCycle, savedTaxInfo, appliedDiscount, selectedLocations, savedLocations, calculateToolPrice, getPlanBasePrice]);

    // Handle successful payment (after 3DS if required)
    const handlePaymentSuccess = useCallback((paymentIntent) => {
        Notification("Success", "Payment Successful! Updating subscription...", "success");

        // Clear applied discount
        dispatch(clearAppliedDiscountData());

        // Update subscription status
        updateSubscriptionStatus(true);

        // Refresh User Data
        dispatch(getAuthMe({}));

        // Clear upgrade data
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedTools');
        localStorage.removeItem('billingCycle');
        localStorage.removeItem('taxInfo');

        // Redirect to profile
        setTimeout(() => {
            navigate(`${appsRoot}/profile`, { replace: true });
        }, 1000);

        setStripeLoading(false);
    }, [dispatch, navigate]);

    // Handle payment error
    const handlePaymentError = useCallback((error) => {
        console.error('Payment error:', error);
        Notification("Error", error.message || "Payment failed", "warning");
        setStripeLoading(false);
    }, []);

    // Handle Stripe payment submission
    const handleStripePaymentSubmit = useCallback(async (paymentData) => {
        const plan = selectedPlan || savedPlan;
        const tools = selectedTools?.length ? selectedTools : savedTools;
        const cycle = billingCycle || savedCycle;
        const locations = selectedLocations || savedLocations || 1;
        const tax =
            tax_info && Object.keys(tax_info).length
                ? tax_info
                : typeof savedTaxInfo === "string"
                    ? JSON.parse(savedTaxInfo || "{}")
                    : savedTaxInfo || {};

        if (!plan) {
            Notification("Error", "Please select a plan to continue", "warning");
            return null;
        }

        if (!authUserItem._id) {
            Notification("Error", "User data not found. Please try again.", "warning");
            return null;
        }

        try {
            setStripeLoading(true);

            // Generate unique request ID
            const requestId = generateStripeRequestId(authUserItem._id, plan._id);

            // Build Stripe payment payload with location-based pricing
            const stripePayload = buildStripePaymentPayload({
                registerItem: authUserItem,
                selectedPlan: plan,
                selectedTools: tools,
                billingCycle: cycle,
                paymentMethodId: paymentData.payment_method_id,
                saveCard: paymentData.save_card ?? true,
                requestId,
                language: 'en',
                discountCode: paymentData.discount_code,
                discountPrice: appliedDiscount?.discounted_price,
                appliedDiscount,
                taxInfo: tax,
                selectedLocations: locations,
                calculateToolPrice,
                getPlanBasePrice
            });

            // Call Stripe payment API
            const response = await stripeCardPaymentRequest(stripePayload);

            // Validate response
            const validation = validateStripePaymentResponse(response);

            if (!validation.isValid) {
                throw new Error(validation.error || "Payment failed");
            }

            // Check if 3D Secure authentication required
            if (validation.requires3DS) {
                // Return the validation object so StripeCardForm can handle 3DS
                Notification("Info", "Additional authentication required. Please complete the verification.", "info");
                return validation;
            }

            // Payment successful (no 3DS required)
            if (validation.isCompleted) {
                handlePaymentSuccess(validation.data);
            }

            return validation;

        } catch (error) {
            console.error('Stripe payment error:', error);
            Notification("Error", error.message || "Stripe payment failed", "warning");
            setStripeLoading(false);
            return null;
        }
    }, [selectedPlan, selectedTools, authUserItem, billingCycle, appliedDiscount, tax_info, dispatch, navigate, savedPlan, savedTools, savedCycle, savedTaxInfo, selectedLocations, savedLocations, calculateToolPrice, getPlanBasePrice, handlePaymentSuccess]);

    return (
        <>
            {/* Page Header */}
            <div className="page-header d-flex align-items-center justify-content-between">
                <div>
                    <h3>Upgrade Subscription</h3>
                    <p className="subtitle">Complete your payment to upgrade your subscription</p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => navigate(`${appsRoot}/profile/subscription/upgrade`)}
                    disabled={paymentLoading || stripeLoading}
                >
                    <ArrowLeft size={16} className="me-50" />
                    Back
                </button>
            </div>

            {/* Discount Warning Message */}
            {discountWarning && discountWarning.hasDiscount && discountWarning.willLoseDiscount && (
                <div className="discount-warning-message mb-3" style={{
                    background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '1.25rem'
                }}>
                    <div className="d-flex align-items-start">
                        <AlertTriangle size={24} className="me-3 flex-shrink-0" style={{ marginTop: '2px', color: '#ff8f00' }} />
                        <div>
                            <h5 style={{ color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                                Important: You Will Lose Your Discount
                            </h5>
                            <p style={{ color: '#6d4c41', marginBottom: '0.75rem' }}>
                                {discountWarning.warning}
                            </p>
                            {discountWarning.discountInfo && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    marginTop: '0.5rem'
                                }}>
                                    <p style={{ color: '#5d4037', margin: 0 }}>
                                        <strong>Current Discount:</strong> {discountWarning.discountInfo.discount_code}
                                        {' '}
                                        ({discountWarning.discountInfo.discount_type === 'percentage'
                                            ? `${discountWarning.discountInfo.discount_value}%`
                                            : `$${discountWarning.discountInfo.discount_value}`})
                                        {discountWarning.discountInfo.remaining_months && (
                                            <span className="ms-2">
                                                - {discountWarning.discountInfo.remaining_months} months remaining
                                            </span>
                                        )}
                                    </p>
                                    <p style={{ color: '#d84315', margin: '0.5rem 0 0 0', fontWeight: '500' }}>
                                        This discount will be permanently removed if you proceed with this upgrade.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card third-step-main register-steps-main">
                <div >
                {/* Payment Gateway Selector Buttons - Hidden when PAYMENT_GATEWAY is configured in backend */}
                {false && ( // Gateway selector buttons hidden - using configured gateway from backend
                    <div className="btn-group w-100 mb-3" role="group">
                        <button
                            type="button"
                            className={`btn ${selectedGateway === 'paypal' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedGateway('paypal')}
                            disabled={paymentLoading || stripeLoading}
                        >
                            <CreditCard size={18} className="me-1" />
                            PayPal Card Payment
                        </button>
                        <button
                            type="button"
                            className={`btn ${selectedGateway === 'stripe' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedGateway('stripe')}
                            disabled={paymentLoading || stripeLoading}
                        >
                            <CreditCard size={18} className="me-1" />
                            Stripe Card Payment
                        </button>
                    </div>
                )}

                <div className="payment-container">
                    <div className="row">
                        {/* Payment Form */}
                        <div className="col-xl-6 col-lg-7">
                            <div className="payment-form-section">
                                {/* PayPal Payment Form */}
                                {selectedGateway === 'paypal' && (
                                    <PaymentForm
                                        onSubmit={handlePaymentSubmit}
                                        loading={paymentLoading}
                                        onValidateCode={validateCode}
                                        showDiscount={true}
                                    />
                                )}

                                {/* Stripe Payment Form */}
                                {selectedGateway === 'stripe' && (
                                    <StripeProvider>
                                        <StripeCardForm
                                            onSubmit={handleStripePaymentSubmit}
                                            loading={stripeLoading}
                                            onValidateCode={validateCode}
                                            showDiscount={true}
                                            saveCard={true}
                                            onPaymentSuccess={handlePaymentSuccess}
                                            onPaymentError={handlePaymentError}
                                        />
                                    </StripeProvider>
                                )}
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="col-xl-6 col-lg-5">
                            <div className="payment-summary-section">

                                <PaymentSummary
                                    planItem={selectedPlan || savedPlan}
                                    selectedTools={selectedTools?.length ? selectedTools : savedTools}
                                    billingCycle={billingCycle || savedCycle}
                                    tax_info={tax_info && Object.keys(tax_info).length ? tax_info : savedTaxInfo}
                                    appliedDiscount={appliedDiscount}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
};

export default UpgradePayment;