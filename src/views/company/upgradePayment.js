import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, ArrowLeft } from 'react-feather';
import { paypalCardPayment, cleanPaymentMessage, applyDiscountCode } from '@src/views/auth/register/store';
import PaymentForm from './PaymentForm';
import StripePaymentForm from './StripePaymentForm';
import PaymentSummary from '@src/views/auth/register/components/PaymentSummary';
import Notification from '@src/@core/components/toast/notification';
import { getDomailUrl } from '@src/utility/Utils';
import { appsRoot } from '@constant/defaultValues';
import '@src/views/auth/register/components/PaymentForm.scss';
import '@src/views/auth/register/components/PaymentSummary.scss';
import { useNavigate, useParams } from 'react-router-dom';
import { startLoading, stopLoading } from '@src/views/loadingstore';
import "@src/views/auth/register/Wizard.scss"
import { getAuthMe } from '@src/views/auth/store/';
import {
    getCompany,
} from "@src/views/auth/profile/editCompany/store/";
import { useTranslation } from "react-i18next";
import {
    stripeCardPaymentRequest,
    buildStripePaymentPayload,
    validateStripePaymentResponse,
    generateStripeRequestId,
    getStripeConfigRequest,
    confirmStripePaymentRequest
} from '@src/views/auth/register/utils/stripePaymentApi';
import { loadStripe } from '@stripe/stripe-js';
import instance from '@src/utility/AxiosConfig';

const UpgradePayment = ({ nextStep, prevStep }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const savedPlan = JSON.parse(localStorage.getItem("selectedPlan"))
    const savedTools = JSON.parse(localStorage.getItem("selectedTools") || "[]");
    const savedCycle = localStorage.getItem("billingCycle");
    const savedTaxInfo = JSON.parse(localStorage.getItem("taxInfo") || "{}");
    const savedLocations = parseInt(localStorage.getItem("selectedLocations") || "1");
    const { t } = useTranslation();

    // Get payment gateway from store or localStorage
    const storePaymentGateway = useSelector(state => state.register?.payment_gateway);
    const savedPaymentGateway = localStorage.getItem('paymentGateway');
    const configuredGateway = storePaymentGateway || savedPaymentGateway || 'stripe';

    // Payment gateway selector state - set to configured gateway
    const [selectedGateway, setSelectedGateway] = useState(configuredGateway);
    const [stripeLoading, setStripeLoading] = useState(false);

    // Stripe instance for 3DS handling
    const stripeRef = useRef(null);
    const [stripeReady, setStripeReady] = useState(false);

    // Discount code state
    const [discountCode, setDiscountCode] = useState('');
    const [discountLoading, setDiscountLoading] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState(null);

    // Initialize Stripe.js for 3DS handling
    useEffect(() => {
        const initStripe = async () => {
            try {
                const configResponse = await getStripeConfigRequest();
                if (configResponse.success && configResponse.data?.data?.publishable_key) {
                    const stripe = await loadStripe(configResponse.data.data.publishable_key);
                    stripeRef.current = stripe;
                    setStripeReady(true);
                }
            } catch (error) {
                console.error('Failed to initialize Stripe:', error);
            }
        };

        if (selectedGateway === 'stripe') {
            initStripe();
        }
    }, [selectedGateway]);

    // getting id from url
    const { id } = useParams();

    const {
        companyItem: storeRegisterItem
    } = useSelector(state => state.company);


    const {
        planSelection,
        paymentLoading,
        paymentActionFlag,
        paymentSuccess,
        paymentError,
        paymentItem,
        tax_info
    } = useSelector(state => state.register);

    const store = useSelector((state) => state.auth);

    const companyItem = storeRegisterItem?.user?._id
        ? storeRegisterItem
        : JSON.parse(localStorage.getItem("companyItem") || "{}");

    const { selectedPlan, selectedTools, billingCycle, selectedLocations: storeLocations } = planSelection || {};
    const selectedLocations = storeLocations || savedLocations || 1;
    const Id = useSelector((state) => state.company?.companyItem?._id)

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



    // get companyList 
    useEffect(() => {
        if (id) dispatch(getCompany({ id }));
    }, [id, dispatch]);

    //   loadding mangemnent
    useEffect(() => {
        if (paymentLoading || stripeLoading) {
            dispatch(startLoading())
        } else {
            dispatch(stopLoading())
        }
    }, [paymentLoading, stripeLoading])

    // Handle payment response
    useEffect(() => {

        if (paymentActionFlag === "PPAL_CRD_PMNT_SCS" && paymentItem) {
            if (paymentItem.redirectConfirm) {
                // Redirect to PayPal for payment confirmation
                window.location.href = paymentItem.redirectConfirm;
            } else if (paymentItem._id && paymentItem.status === "completed") {
                // Payment completed, proceed to next step
                dispatch(getAuthMe({}));
                navigate(`${appsRoot}/company/view/${Id}`);

            }
        }

    }, [paymentActionFlag, paymentItem, nextStep, dispatch]);


    // check sucess
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
            }, 100);
        }
    }, [paymentSuccess, paymentError, dispatch]);

    // localstorage
    useEffect(() => {
        if (store?.actionFlag === "AUTH_ME_SCS" && store?.companyItem) {
            // handleManageMenu(store.authUserItem?.role);
            localStorage.removeItem('registerFormData')
            localStorage.removeItem('companyItem')
        }
    }, [store.actionFlag])

    // Handle discount code application
    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) {
            Notification("Error", t("Please enter a discount code"), "warning");
            return;
        }

        const plan = selectedPlan || savedPlan;
        const tools = selectedTools?.length ? selectedTools : savedTools;
        const tax = tax_info && Object.keys(tax_info).length ? tax_info : savedTaxInfo;

        if (!plan) {
            Notification("Error", t("Please select a plan first"), "warning");
            return;
        }

        setDiscountLoading(true);

        try {
            // Calculate total amount for discount validation with location-based pricing
            const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];
            const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
            const planBasePrice = getPlanBasePrice(plan);
            const subtotal = toolsTotal + planBasePrice;

            // Use validate-with-location endpoint to check all discount conditions including location rules
            const response = await instance.get('/public/discount/validate-with-location', {
                params: {
                    discount_code: discountCode.trim(),
                    amount: subtotal,
                    locations: selectedLocations,
                    user_id: companyItem?.user?._id
                }
            });

            if (response?.data?.statusCode === 200 && response?.data?.data) {
                const discountData = response.data.data;

                // Check if discount is valid
                if (discountData.valid && discountData.can_apply) {
                    // Get discount amount from preview if available
                    const discountAmount = discountData.preview?.discount_amount || 0;
                    const discountedPrice = discountData.preview?.discounted_total || (subtotal - discountAmount);

                    setAppliedDiscount({
                        code: discountData.discount_code,
                        price: discountedPrice,
                        discounted_price: discountAmount,
                        discount_id: discountData.discount_id,
                        data: { _id: discountData.discount_id, name: discountData.discount?.name },
                        discount_type: discountData.discount?.type,
                        discount_value: discountData.discount?.value,
                        // Duration info for display
                        duration: discountData.duration,
                        duration_type: discountData.duration?.type,
                        duration_months: discountData.duration?.months,
                        duration_info: discountData.duration_info,
                        // Location rules for display
                        location_rules: discountData.location_rules || []
                    });

                    Notification("Success", discountData.message || t("Discount code applied successfully"), "success");
                } else {
                    // Show specific error message for location eligibility
                    const errorMessage = discountData.message ||
                        (discountData.error_type === 'LOCATION_INELIGIBLE'
                            ? t('This discount code is not valid for your current number of locations')
                            : t('Invalid discount code'));
                    Notification("Error", errorMessage, "warning");
                    setAppliedDiscount(null);
                }
            } else {
                const errorMessage = response?.data?.message || t('Invalid discount code');
                Notification("Error", errorMessage, "warning");
                setAppliedDiscount(null);
            }
        } catch (error) {
            console.error('❌ Discount Error:', error);
            const errorMessage = error?.response?.data?.message || error?.message || t("Invalid discount code");
            Notification("Error", errorMessage, "warning");
            setAppliedDiscount(null);
        } finally {
            setDiscountLoading(false);
        }
    };

    // Remove discount
    const handleRemoveDiscount = () => {
        setDiscountCode('');
        setAppliedDiscount(null);
    };

    // payment submit
    const handlePaymentSubmit = useCallback((paymentData) => {
        // Fallback to localStorage if store is empty
        const plan = selectedPlan || savedPlan;
        const tools = selectedTools?.length ? selectedTools : savedTools;
        const cycle = billingCycle || savedCycle;
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

        if (!companyItem.user._id) {
            Notification("Error", "Registration data not found. Please start over.", "warning");
            return;
        }

        // Calculate final pricing with location-based pricing
        const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];
        const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
        const planBasePrice = getPlanBasePrice(plan);
        const subtotal = toolsTotal + planBasePrice;
        const taxValue = tax.value || 0;

        // Use discounted price if discount is applied
        const totalPriceBeforeTax = appliedDiscount ? appliedDiscount.price : subtotal;
        const taxPrice = (totalPriceBeforeTax * taxValue) / 100;
        const finalPrice = totalPriceBeforeTax + taxPrice;

        // Prepare payment payload with new pricing structure
        const paymentPayload = {
            lang: 'en',
            user_id: companyItem.user._id,
            customer_id: companyItem.user._id,
            plan_id: plan._id,
            selected_tools: tools,
            billing_cycle: cycle,
            card_id: paymentData.selectedCard,
            stored_card_details: paymentData.selectedCardDetails,

            // Location-based pricing fields
            locations: selectedLocations,
            plan_price: planBasePrice,
            tools_price: toolsTotal,
            subtotal: subtotal,
            total_price: totalPriceBeforeTax,
            final_price: finalPrice,
            tax_value: parseFloat(taxPrice),

            // Legacy fields for backward compatibility
            platform_price: planBasePrice,
            price: planBasePrice,
            special_price: plan.special_price || null,
            special_price_duration: plan.special_price_duration || null,

            // Add discount fields only if discount is applied
            ...(appliedDiscount && discountCode.trim() && {
                discount_code: discountCode.trim(),
                discount_price: appliedDiscount?.discounted_price,
                discount_id: appliedDiscount?.data?._id || appliedDiscount?.discount_id || appliedDiscount?._id,
                // Discount duration info
                discount_duration_type: appliedDiscount?.duration?.type || appliedDiscount?.duration_type || null,
                discount_duration_months: appliedDiscount?.duration?.months || appliedDiscount?.duration_months || null,
                discount_name: appliedDiscount?.data?.name || appliedDiscount?.discount_name || null,
                // Location rules
                discount_location_rules: appliedDiscount?.location_rules || [],
            }),

            plan_details: {
                name: plan.name,
                description: plan.description,
                duration: plan.duration,
                duration_type: plan.duration_type,
                tools_count: selectedToolsData.length,
                total_tools_available: plan.tools?.length || 0
            },

            tools: selectedToolsData.map(tool => ({
                _id: tool._id,
                name: tool.name,
                slug: tool.slug || tool.name.toLowerCase().replace(/\s+/g, '-'),
                base_price: tool.price || 0,
                pricing_mode: tool.pricing_mode || 'fixed',
                location_multiplier: tool.location_multiplier || 1.0,
                calculated_price: calculateToolPrice(tool),
                price: calculateToolPrice(tool)
            })),
            user_details: {
                company_name: companyItem?.company?.company_name,
                email: companyItem.email,
                fname: companyItem.first_name,
                lname: companyItem.last_name,
                mobile: companyItem.mobile,
                country_code: companyItem.country_code?.code || '+1'
            },
            redirect_url: `${getDomailUrl()}${appsRoot}/company/view/${Id}`,
            timestamp: new Date().toISOString(),
            source: 'admin_company_upgrade'
        };

        dispatch(paypalCardPayment(paymentPayload));
    }, [selectedPlan, selectedTools, companyItem, billingCycle, dispatch, savedPlan, savedTools, savedCycle, savedTaxInfo, discountCode, appliedDiscount, selectedLocations, calculateToolPrice, getPlanBasePrice]);

    // Handle successful payment
    const handlePaymentSuccess = useCallback(() => {
        Notification("Success", "Payment Successful! Updating subscription...", "success");

        // Refresh User Data
        dispatch(getAuthMe({}));

        // Clear upgrade data
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedTools');
        localStorage.removeItem('billingCycle');
        localStorage.removeItem('taxInfo');
        localStorage.removeItem('companyItem');

        // Redirect to company view
        setTimeout(() => {
            navigate(`${appsRoot}/company/view/${Id}`, { replace: true });
        }, 1000);

        setStripeLoading(false);
    }, [dispatch, navigate, Id]);

    // Handle 3D Secure authentication for stored cards
    const handle3DSecure = async (clientSecret) => {
        if (!stripeRef.current) {
            throw new Error('Stripe not initialized');
        }

        // This triggers the 3DS authentication popup
        const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(clientSecret);

        if (error) {
            throw new Error(error.message || 'Authentication failed');
        }

        return paymentIntent;
    };

    // Handle Stripe payment submission
    const handleStripePaymentSubmit = useCallback(async (paymentData) => {
        const plan = selectedPlan || savedPlan;
        const tools = selectedTools?.length ? selectedTools : savedTools;
        const cycle = billingCycle || savedCycle;
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

        if (!companyItem.user._id) {
            Notification("Error", "Company data not found. Please try again.", "warning");
            return;
        }

        try {
            setStripeLoading(true);

            // Generate unique request ID
            const requestId = generateStripeRequestId(companyItem.user._id, plan._id);

            // Build Stripe payment payload
            const stripePayload = buildStripePayloadForStoredCard({
                companyItem,
                selectedPlan: plan,
                selectedTools: tools,
                billingCycle: cycle,
                cardId: paymentData.selectedCard,
                cardDetails: paymentData.selectedCardDetails,
                requestId,
                language: 'en',
                taxInfo: tax
            });

            // Call Stripe payment API
            const response = await stripeCardPaymentRequest(stripePayload);

            // Validate response
            const validation = validateStripePaymentResponse(response);

            if (!validation.isValid) {
                throw new Error(validation.error || "Payment failed");
            }

            // Check if 3D Secure authentication required
            if (validation.requires3DS && validation.clientSecret) {
                // Ensure Stripe.js is ready for 3DS authentication
                if (!stripeReady || !stripeRef.current) {
                    throw new Error('Payment system is initializing. Please try again in a moment.');
                }

                Notification("Info", "Additional authentication required. Please complete the verification.", "info");

                try {
                    // Show 3DS authentication popup
                    const paymentIntent = await handle3DSecure(validation.clientSecret);

                    // 3DS completed successfully - now confirm with backend
                    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
                        // Call backend confirmation API to create subscription
                        const confirmPayload = {
                            payment_intent_id: validation.paymentIntentId || paymentIntent.id,
                            request_id: requestId
                        };

                        console.log('Confirming payment with backend:', confirmPayload);
                        const confirmResponse = await confirmStripePaymentRequest(confirmPayload);

                        if (confirmResponse.success) {
                            // Backend confirmed - subscription created
                            handlePaymentSuccess();
                        } else {
                            throw new Error(confirmResponse.error || 'Failed to confirm payment');
                        }
                    } else {
                        throw new Error('Payment could not be completed. Please try again.');
                    }
                } catch (threeDSError) {
                    console.error('3DS authentication error:', threeDSError);
                    Notification("Error", threeDSError.message || "Authentication failed. Please try again.", "warning");
                    setStripeLoading(false);
                }
                return;
            }

            // Payment successful (no 3DS required)
            if (validation.isCompleted) {
                handlePaymentSuccess();
            }

            setStripeLoading(false);

        } catch (error) {
            console.error('Stripe payment error:', error);
            Notification("Error", error.message || "Stripe payment failed", "warning");
            setStripeLoading(false);
        }
    }, [selectedPlan, selectedTools, companyItem, billingCycle, dispatch, navigate, savedPlan, savedTools, savedCycle, savedTaxInfo, discountCode, appliedDiscount, Id, handlePaymentSuccess]);

    // Helper function to build Stripe payload for stored card
    const buildStripePayloadForStoredCard = ({
        companyItem,
        selectedPlan,
        selectedTools,
        billingCycle,
        cardId,
        cardDetails,
        requestId,
        language,
        taxInfo
    }) => {
        // Calculate final pricing with location-based pricing
        const selectedToolsData = selectedPlan.tools?.filter(tool => selectedTools.includes(tool._id)) || [];
        const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
        const planBasePrice = getPlanBasePrice(selectedPlan);
        const subtotal = toolsTotal + planBasePrice;
        const taxValue = taxInfo.value || 0;

        // Use discounted price if discount is applied
        const totalPriceBeforeTax = appliedDiscount ? appliedDiscount.price : subtotal;
        const taxPrice = (totalPriceBeforeTax * taxValue) / 100;
        const finalPrice = totalPriceBeforeTax + taxPrice;

        return {
            lang: language,
            user_id: companyItem.user._id,
            customer_id: companyItem.user._id,
            plan_id: selectedPlan._id,
            selected_tools: selectedTools,
            billing_cycle: billingCycle,
            card_id: cardId,
            stored_card_details: cardDetails,
            use_stored_card: true,

            // Location-based pricing fields
            locations: selectedLocations,
            plan_price: planBasePrice,
            tools_price: toolsTotal,
            subtotal: subtotal,
            total_price: totalPriceBeforeTax,
            final_price: finalPrice,
            tax_value: parseFloat(taxPrice),

            // Legacy fields for backward compatibility
            platform_price: planBasePrice,
            price: planBasePrice,
            special_price: selectedPlan.special_price || null,
            special_price_duration: selectedPlan.special_price_duration || null,

            // Add discount fields only if discount is applied
            ...(appliedDiscount && discountCode.trim() && {
                discount_code: discountCode.trim(),
                discount_price: appliedDiscount?.discounted_price,
                discount_id: appliedDiscount?.data?._id || appliedDiscount?.discount_id || appliedDiscount?._id,
                // Discount duration info
                discount_duration_type: appliedDiscount?.duration?.type || appliedDiscount?.duration_type || null,
                discount_duration_months: appliedDiscount?.duration?.months || appliedDiscount?.duration_months || null,
                discount_name: appliedDiscount?.data?.name || appliedDiscount?.discount_name || null,
                // Location rules
                discount_location_rules: appliedDiscount?.location_rules || [],
            }),

            plan_details: {
                name: selectedPlan.name,
                description: selectedPlan.description,
                duration: selectedPlan.duration,
                duration_type: selectedPlan.duration_type,
                tools_count: selectedToolsData.length,
                total_tools_available: selectedPlan.tools?.length || 0
            },
            tools: selectedToolsData.map(tool => ({
                _id: tool._id,
                name: tool.name,
                slug: tool.slug || tool.name.toLowerCase().replace(/\s+/g, '-'),
                base_price: tool.price || 0,
                pricing_mode: tool.pricing_mode || 'fixed',
                location_multiplier: tool.location_multiplier || 1.0,
                calculated_price: calculateToolPrice(tool),
                price: calculateToolPrice(tool)
            })),
            user_details: {
                company_name: companyItem?.company?.company_name,
                email: companyItem.user.email,
                fname: companyItem.user.first_name,
                lname: companyItem.user.last_name,
                mobile: companyItem.user.mobile,
                country_code: companyItem.user.country_code?.code || '+1'
            },
            request_id: requestId,
            timestamp: new Date().toISOString(),
            source: 'admin_company_upgrade'
        };
    };

    return (
        <>
            {/* Page Header */}
            <div className="page-header d-flex align-items-center justify-content-between">
                <div>
                    <h3>{t('Upgrade Company Subscription')}</h3>
                    <p className="subtitle">{t('Complete payment to upgrade company subscription')}</p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => navigate(`${appsRoot}/company/plan/upgrade/${Id}`)}
                    disabled={paymentLoading || stripeLoading}
                >
                    <ArrowLeft size={16} className="me-50" />
                    {t('Back')}
                </button>
            </div>

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
                                {t('PayPal Card Payment')}
                            </button>
                            <button
                                type="button"
                                className={`btn ${selectedGateway === 'stripe' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedGateway('stripe')}
                                disabled={paymentLoading || stripeLoading}
                            >
                                <CreditCard size={18} className="me-1" />
                                {t('Stripe Card Payment')}
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
                                        planItem={selectedPlan || savedPlan}
                                        gateway="paypal"
                                        discountCode={discountCode}
                                        setDiscountCode={setDiscountCode}
                                        appliedDiscount={appliedDiscount}
                                        onApplyDiscount={handleApplyDiscount}
                                        onRemoveDiscount={handleRemoveDiscount}
                                        discountLoading={discountLoading}
                                    />
                                )}

                                {/* Stripe Payment Form */}
                                {selectedGateway === 'stripe' && (
                                    <StripePaymentForm
                                        onSubmit={handleStripePaymentSubmit}
                                        loading={stripeLoading}
                                        planItem={selectedPlan || savedPlan}
                                        gateway="stripe"
                                        discountCode={discountCode}
                                        setDiscountCode={setDiscountCode}
                                        appliedDiscount={appliedDiscount}
                                        onApplyDiscount={handleApplyDiscount}
                                        onRemoveDiscount={handleRemoveDiscount}
                                        discountLoading={discountLoading}
                                    />
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