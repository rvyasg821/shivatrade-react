/* eslint-disable prefer-const */
import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, CreditCard } from 'react-feather';
import { paypalCardPayment, cleanPaymentMessage, applyDiscountCode, clearAppliedDiscountData } from './store';
import PaymentForm from './components/PaymentForm';
import StripeCardForm from './components/StripeCardForm';
import StripeProvider from './components/StripeProvider';
import PaymentSummary from './components/PaymentSummary';
import Notification from '@src/@core/components/toast/notification';
import { getDomailUrl } from '@src/utility/Utils';
import { appsRoot } from '@constant/defaultValues';
import './components/PaymentForm.scss';
import './components/PaymentSummary.scss';
import { useNavigate } from 'react-router-dom';
import { getAuthMe } from '../store';
import { startLoading, stopLoading } from '../../loadingstore';
import { useTranslation } from "react-i18next";
import {
  stripeCardPaymentRequest,
  buildStripePaymentPayload,
  validateStripePaymentResponse,
  generateStripeRequestId
} from './utils/stripePaymentApi';

const Step3Payment = ({ nextStep, prevStep }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const savedPlan = JSON.parse(localStorage.getItem("selectedPlan"))
  const savedTools = JSON.parse(localStorage.getItem("selectedTools") || "[]");
  const savedCycle = localStorage.getItem("billingCycle");
  const savedTaxInfo = JSON.parse(localStorage.getItem("taxInfo") || "{}");

  // Ref to lock success logic
  const successHandled = React.useRef(false);

  const { t } = useTranslation();

  // Get payment gateway from store or localStorage
  const storePaymentGateway = useSelector(state => state.register.payment_gateway);
  const savedPaymentGateway = localStorage.getItem('paymentGateway');
  const configuredGateway = storePaymentGateway || savedPaymentGateway || 'stripe';

  // Payment gateway selector state - set to configured gateway
  const [selectedGateway, setSelectedGateway] = useState(configuredGateway);
  const [stripeLoading, setStripeLoading] = useState(false);

  const {
    planSelection,
    registerItem: storeRegisterItem,
    paymentLoading,
    paymentActionFlag,
    paymentSuccess,
    paymentError,
    paymentItem,
    tax_info,
    appliedDiscount,
    actionFlag: discountActionFlag,
    error: discountError
  } = useSelector(state => state.register);

  const store = useSelector((state) => state.auth);
  const registerItem = storeRegisterItem?._id
    ? storeRegisterItem
    : JSON.parse(localStorage.getItem("registerItem") || "{}");

  const { selectedPlan, selectedTools, billingCycle, selectedLocations: storeSelectedLocations } = planSelection;
  const savedLocations = JSON.parse(localStorage.getItem("selectedLocations") || "1");
  const selectedLocations = storeSelectedLocations || savedLocations || 1;

  useEffect(() => {
    if (paymentLoading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [paymentLoading])

  useEffect(() => {

    if (paymentActionFlag === "PPAL_CRD_PMNT_SCS" && paymentItem) {
      if (paymentItem.redirectConfirm) {
        window.location.href = paymentItem.redirectConfirm;
      } else if (paymentItem._id && paymentItem.status === "completed") {

        // Execute Success Logic ONLY ONCE
        if (!successHandled.current) {
          successHandled.current = true;

          // Dispatch clean message immediately to prevent re-runs
          dispatch(cleanPaymentMessage());
          dispatch(clearAppliedDiscountData());

          // Refresh User Data (Background) - Don't wait for this to redirect
          dispatch(getAuthMe({}));

          localStorage.removeItem('registerFormData')
          localStorage.removeItem('registerItem')

          // Set justSignedUp flag for dashboard welcome banner and auto-redirect
          localStorage.setItem('justSignedUp', 'true');

          // Redirect to dashboard - dashboard will handle the welcome banner and redirect to appointment app
          setTimeout(() => {
            navigate(`${appsRoot}/dashboard`, { replace: true });
          }, 1000);
        }
      }
    }

  }, [paymentActionFlag, paymentItem, nextStep, dispatch, navigate]);

  // Handle Errors and Messages
  useEffect(() => {
    // Only handle success message if NOT handled by main logic (e.g. non-redirect success?)
    // But for Step 3, success implies redirect. So we suppress generic success msg here if handled.
    if (paymentSuccess && !successHandled.current && !paymentActionFlag?.includes('SCS')) {
      // Success notification handled by Step2Plan on AUTH_ME_SCS
    }

    if (paymentError) {
      Notification("Error", paymentError, "warning");
    }

    if (paymentSuccess || paymentError) {
      setTimeout(() => {
        dispatch(cleanPaymentMessage());
        dispatch(clearAppliedDiscountData())
      }, 500); // Increased to 500ms to allow Toast to trigger before cleanup
    }
  }, [paymentSuccess, paymentError, dispatch, paymentActionFlag]);

  // Handle Discount Validation Errors
  useEffect(() => {
    if (discountActionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && discountError) {
      Notification("Error", discountError, "warning");
    }
  }, [discountActionFlag, discountError]);

  // REMOVED: Separate useEffect for store.actionFlag === "AUTH_ME_SCS" to avoid blocking.
  // We navigate directly above.

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

  // Get plan base price from location_pricing
  const getPlanBasePrice = (plan) => {
    const locationTiers = plan.location_pricing || [];
    const sortedTiers = [...locationTiers].sort((a, b) => b.locations - a.locations);
    const currentTier = sortedTiers.find(tier => tier.locations <= selectedLocations) || locationTiers[0];
    return currentTier?.special_price > 0
      ? currentTier.special_price
      : (currentTier?.price || plan.platform_price || 0);
  };

  const validateCode = async (event) => {
    const code = event?.target?.value?.trim();

    if (!code) {
      dispatch(clearAppliedDiscountData())
      return;
    }

    try {
      const plan = selectedPlan || savedPlan;
      const tools = selectedTools.length ? selectedTools : savedTools;
      const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];

      // Calculate tools total with location-based pricing
      const planBasePrice = getPlanBasePrice(plan);
      const toolsTotal = planBasePrice === 0 ? 0 : selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);
      const subtotal = toolsTotal + planBasePrice;

      // Get current selected locations
      const locations = selectedLocations || savedLocations || 1;

      const applyPayload = {
        code: code,
        user_id: registerItem?._id,
        amount: subtotal,
        locations: locations // Include locations for location-based discount validation
      };
      await dispatch(applyDiscountCode(applyPayload)).unwrap();
    } catch (err) {
      // Error is handled by Redux - notification will be shown
      console.error('Discount validation error:', err);
    }
  };

  const handlePaymentSubmit = useCallback((paymentData) => {
    const plan = selectedPlan || savedPlan;
    const tools = selectedTools.length ? selectedTools : savedTools;
    const cycle = billingCycle || savedCycle;
    const tax = tax_info && Object.keys(tax_info).length ? tax_info : savedTaxInfo

    if (!plan) {
      Notification("Error", "Please select a plan to continue", "warning");
      return;
    }

    if (!registerItem._id) {
      Notification("Error", "Registration data not found. Please start over.", "warning");
      return;
    }

    const selectedToolsData = plan.tools?.filter(tool => tools.includes(tool._id)) || [];

    // Calculate tools total with location-based pricing
    const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + calculateToolPrice(tool), 0);

    // Get plan base price from location_pricing
    const planBasePrice = getPlanBasePrice(plan);
    const subtotal = toolsTotal + planBasePrice;
    const taxValue = tax.value || 0;

    let taxPrice = (subtotal * (taxValue / 100))
    let finalPrice = subtotal + (subtotal * (taxValue / 100));

    if (appliedDiscount?.price) {
      finalPrice = appliedDiscount?.price + (appliedDiscount?.price * (taxValue / 100))
    }
    if (appliedDiscount?.price) {
      taxPrice = (appliedDiscount?.price * (taxValue / 100))
    }

    const paymentPayload = {
      lang: 'en',
      user_id: registerItem._id,
      customer_id: registerItem._id,
      plan_id: plan._id,
      selected_tools: tools,
      billing_cycle: cycle,
      locations: selectedLocations, // Add locations count
      holder_name: paymentData.holder_name,
      card_number: paymentData.card_number,
      expiry_month: paymentData.expiry_month,
      expiry_year: paymentData.expiry_year,
      card_cvv: paymentData.card_cvv,
      price: planBasePrice,
      special_price: null,
      special_price_duration: null,
      final_price: finalPrice,
      tax_value: taxPrice,
      total: appliedDiscount?.price ?? subtotal,
      tools_price: toolsTotal,
      platform_fee: planBasePrice,
      plan_details: {
        name: plan.name,
        description: plan.description,
        duration: plan.duration,
        duration_type: plan.duration_type,
        tools_count: selectedToolsData.length,
        total_tools_available: plan.tools?.length || 0,
        locations: selectedLocations
      },
      tools: selectedToolsData.map(tool => ({
        _id: tool._id,
        name: tool.name,
        price: calculateToolPrice(tool),
        pricing_mode: tool.pricing_mode || 'fixed',
        location_multiplier: tool.location_multiplier || 1.0
      })),
      user_details: {
        company_name: registerItem.company_name,
        email: registerItem.email,
        fname: registerItem.fname,
        lname: registerItem.lname,
        mobile: registerItem.mobile,
        country_code: registerItem.country_code?.code || '+1'
      },
      redirect_url: `${getDomailUrl()}${appsRoot}/register/payment-process`,
      timestamp: new Date().toISOString(),
      source: 'registration_flow'
    };

    if (paymentData?.discount_code?.trim()) {
      paymentPayload.discount_code = paymentData.discount_code.trim();
    }
    if (appliedDiscount?.discounted_price) {
      paymentPayload.discount_price = appliedDiscount?.discounted_price
    }
    dispatch(paypalCardPayment(paymentPayload));

  }, [selectedPlan, selectedTools, registerItem, billingCycle, dispatch, savedPlan, savedTools, savedCycle, savedTaxInfo, selectedLocations, appliedDiscount, tax_info]);

  // Handle successful payment (after 3DS if required)
  const handlePaymentSuccess = useCallback((paymentIntent) => {
    // Clear applied discount
    dispatch(clearAppliedDiscountData());

    // Clear registration data
    localStorage.removeItem('registerFormData');
    localStorage.removeItem('registerItem');

    // Set justSignedUp flag for dashboard welcome banner and auto-redirect
    localStorage.setItem('justSignedUp', 'true');

    // Refresh User Data after a short delay to allow backend subscription creation to complete
    setTimeout(() => {
      dispatch(getAuthMe({}));
    }, 500);

    // Redirect to dashboard - dashboard will handle the welcome banner and refresh user data
    setTimeout(() => {
      navigate(`${appsRoot}/dashboard`, { replace: true });
    }, 1500);

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
    const tools = selectedTools.length ? selectedTools : savedTools;
    const cycle = billingCycle || savedCycle;
    const tax = tax_info && Object.keys(tax_info).length ? tax_info : savedTaxInfo;

    if (!plan) {
      Notification("Error", "Please select a plan to continue", "warning");
      return null;
    }

    if (!registerItem._id) {
      Notification("Error", "Registration data not found. Please start over.", "warning");
      return null;
    }

    try {
      setStripeLoading(true);

      // Generate unique request ID
      const requestId = generateStripeRequestId(registerItem._id, plan._id);

      // Build Stripe payment payload with location-based pricing
      const stripePayload = buildStripePaymentPayload({
        registerItem,
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
        selectedLocations, // Add locations count
        calculateToolPrice, // Pass the calculation function
        getPlanBasePrice // Pass the plan price function
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
  }, [selectedPlan, selectedTools, registerItem, billingCycle, appliedDiscount, tax_info, dispatch, navigate, savedPlan, savedTools, savedCycle, savedTaxInfo, handlePaymentSuccess]);


  return (
    <div className="card third-step-main register-steps-main">

      <div >
        {/* Payment Gateway Selector - Only show if both gateways are available */}
        {/* Hidden when PAYMENT_GATEWAY is configured in backend */}
        {false && ( // Gateway selector hidden - using configured gateway from backend
          <div className="payment-gateway-selector mb-3">
            <h5 className="mb-2">{t("Select Payment Method")}</h5>
            <div className="btn-group w-100" role="group">
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
          </div>
        )}

        <div className="payment-container">
          <div className="row">
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

            <div className="col-xl-6 col-lg-5">
              <div className="payment-summary-section">
                <PaymentSummary
                  planItem={selectedPlan || savedPlan}
                  selectedTools={selectedTools.length ? selectedTools : savedTools}
                  billingCycle={billingCycle || savedCycle}
                  tax_info={tax_info && Object.keys(tax_info).length ? tax_info : savedTaxInfo}
                  appliedDiscount={appliedDiscount}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-back"
            onClick={prevStep}
            disabled={paymentLoading || stripeLoading}
          >
            {t("Back to Plans")}
          </button>

          {!selectedPlan && (
            <button
              type="button"
              className="btn-next"
              onClick={prevStep}
            >
              {t('Select Plan')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step3Payment;