import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'react-feather';
import Notification from '@src/@core/components/toast/notification';
import { getDomailUrl } from '@src/utility/Utils';
import { appsRoot } from '@constant/defaultValues';
// import './components/PaymentForm.scss';
// import './components/PaymentSummary.scss';
import { useNavigate } from 'react-router-dom';
import { startLoading, stopLoading } from '../loadingstore';
import { getAuthMe } from './store';
import { cleanPaymentMessage, paypalCardPayment } from './register/store';
import PaymentSummary from './register/components/PaymentSummary';
import PaymentForm from './register/components/PaymentForm';

const PlanPayment = ({ user }) => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    planSelection,
    registerItem,
    paymentLoading,
    paymentActionFlag,
    paymentSuccess,
    paymentError,
    paymentItem,
    tax_info
  } = useSelector(state => state.register);
  const store = useSelector((state) => state.auth);
  const authUserItem = store?.authUserItem || null;

  const { selectedPlan, selectedTools, billingCycle } = planSelection;

  useEffect(() => {
    if (paymentLoading) {
      dispatch(startLoading())
    } else {
      dispatch(stopLoading())
    }
  }, [paymentLoading])

  // Handle payment response
  useEffect(() => {
    if (!authUserItem?._id) {
      navigate(`/login`, { replace: true });
    }

    if (paymentActionFlag === "PPAL_CRD_PMNT_SCS" && paymentItem) {
      if (paymentItem.redirectConfirm) {
        // Redirect to PayPal for payment confirmation
        window.location.href = paymentItem.redirectConfirm;
      } else if (paymentItem._id && paymentItem.status === "completed") {
        // Payment completed, proceed to next step
        // nextStep();
        // dispatch()
        console.log('paymentItem.status ====>', paymentItem.status);

        dispatch(getAuthMe({}));
        // navigate(`${appsRoot}/dashboard`, { replace: true });

      }
    }

    // Clean up messages
    if (paymentActionFlag || paymentSuccess || paymentError) {
      if (paymentSuccess) {
        // console.log('THIS IS CALLED OR NOT ??');

        Notification("Success", paymentSuccess, "success");
      }
      if (paymentError) {
        Notification("Error", paymentError, "warning");

      }

      // Clean messages after showing notifications
      setTimeout(() => {
        dispatch(cleanPaymentMessage());
      }, 100);
    }
  }, [paymentActionFlag, paymentSuccess, paymentError, paymentItem, authUserItem, navigate, dispatch]);

  useEffect(() => {
    if (store?.actionFlag === "AUTH_ME_SCS" && store?.authUserItem) {
      // handleManageMenu(store.authUserItem?.role);
      console.log('THIS IS CALLED  //AUTH_ME_SCS');

      // setTimeout(() => {
      //  navigate(`${appsRoot}/dashboard`, { replace: true });
      // }, 500);
      navigate(`${appsRoot}/dashboard`, { replace: true });

    }
  }, [store.actionFlag])

  // Handle payment form submission
  const handlePaymentSubmit = useCallback((paymentData) => {

    if (!selectedPlan) {
      Notification("Error", "Please select a plan to continue", "warning");
      return;
    }

    if (!user._id) {
      Notification("Error", "Registration data not found. Please start over.", "warning");
      return;
    }

    // Calculate final pricing
    const selectedToolsData = selectedPlan.tools?.filter(tool =>
      selectedTools.includes(tool._id)
    ) || [];

    const toolsTotal = selectedToolsData.reduce((sum, tool) => sum + (tool.price || 0), 0);
    const basePrice = selectedPlan.special_price && selectedPlan.special_price > 0
      ? selectedPlan.special_price
      : selectedPlan.price || 0;

    const subtotal = toolsTotal + basePrice;
    const taxValue = tax_info.value || 0;
    const finalPrice = subtotal + selectedPlan?.platform_price + (subtotal * (taxValue / 100));
    console.log('Calculated TAXVALUE AND FINALPRICE :', taxValue);

    // Prepare payment payload with all required data
    const paymentPayload = {
      // Language and basic info
      lang: 'en', // You might want to get this from i18n context

      // Required IDs and plan data
      user_id: user._id, // User ID as requested
      customer_id: user._id, // Keep for backward compatibility
      plan_id: selectedPlan._id, // Selected plan ID as requested
      selected_tools: selectedTools, // Selected tools array as requested
      billing_cycle: billingCycle, // Billing cycle (MONTHLY/YEARLY)

      // Payment card details
      holder_name: paymentData.holder_name,
      card_number: paymentData.card_number,
      expiry_month: paymentData.expiry_month,
      expiry_year: paymentData.expiry_year,
      card_cvv: paymentData.card_cvv,

      // Pricing details
      price: basePrice,
      special_price: selectedPlan.special_price || null,
      special_price_duration: selectedPlan.special_price_duration || null,
      final_price: finalPrice,
      tax_value: parseFloat(taxValue),
      total: finalPrice,
      tools_price: toolsTotal,
      platform_fee: selectedPlan.platform_price || 0,
      // finalPrice

      // Additional plan details for backend processing
      plan_details: {
        name: selectedPlan.name,
        description: selectedPlan.description,
        duration: selectedPlan.duration,
        duration_type: selectedPlan.duration_type,
        tools_count: selectedToolsData.length,
        total_tools_available: selectedPlan.tools?.length || 0
      },

      // Selected tools details for backend processing
      tools: selectedToolsData.map(tool => ({
        _id: tool._id,
        name: tool.name,
        price: tool.price
      })),

      // User details for backend processing
      user_details: {
        company_name: registerItem.company_name,
        email: registerItem.email,
        fname: registerItem.fname,
        lname: registerItem.lname,
        mobile: registerItem.mobile,
        country_code: registerItem.country_code?.code || '+1'
      },

      // System details
      redirect_url: `${getDomailUrl()}${appsRoot}/register/payment-process`,
      timestamp: new Date().toISOString(),
      source: 'registration_flow'
    };

    // Log payment payload for debugging (remove in production)
    // console.log('Payment Payload:', {
    //   user_id: paymentPayload.user_id,
    //   plan_id: paymentPayload.plan_id,
    //   selected_tools: paymentPayload.selected_tools,
    //   tools: paymentPayload.tools,
    //   billing_cycle: paymentPayload.billing_cycle,
    //   total: paymentPayload.total,
    //   plan_details: paymentPayload.plan_details,
    // });

    dispatch(paypalCardPayment(paymentPayload));
  }, [selectedPlan, selectedTools, registerItem, billingCycle, dispatch]);

  return (
    <div className="card third-step-main register-steps-main p-2 m-2 m-md-3">
      {/* <div className="card-header">
        <h2>Payment Information</h2>
        <hr className="section-divider" />
      </div> */}

      <div >
        {selectedPlan ? (
          <div className="payment-container">
            <div className="row">
              {/* Payment Form */}
              <div className="col-xl-6 col-lg-7">
                <div className="payment-form-section">
                  {/* <h3 className="section-title">Enter Payment Details</h3> */}
                  <PaymentForm
                    onSubmit={handlePaymentSubmit}
                    loading={paymentLoading}
                  />
                </div>
              </div>

              {/* Payment Summary */}
              <div className="col-xl-6 col-lg-5">
                <div className="payment-summary-section">
                  <PaymentSummary
                    planItem={selectedPlan}
                    selectedTools={selectedTools}
                    billingCycle={billingCycle}
                    tax_info={tax_info}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-plan-selected">
            <div className="alert alert-warning p-2">
              <h4>No Plan Selected</h4>
              <p>Please go back and select a plan before proceeding to payment.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-back btn btn-secondary"
            // onClick={prevStep}
            disabled={paymentLoading}
          >
            {/* <ArrowLeft size={17} /> */}
            Back to Plans
          </button>

          {!selectedPlan && (
            <button
              type="button"
              className="btn-next btn btn-primary ms-2"
            // onClick={prevStep}
            >
              Select Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanPayment;