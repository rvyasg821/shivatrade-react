import React, { memo, useState, useCallback } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import { confirmStripePaymentRequest } from '../utils/stripePaymentApi';
import './StripeCardForm.scss';

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            '::placeholder': {
                color: '#aab7c4',
            },
            iconColor: '#666EE8',
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
        },
    },
    hidePostalCode: true,
};

const StripeCardForm = ({
    onSubmit,
    loading = false,
    onValidateCode,
    showDiscount = true,
    saveCard = true,
    onPaymentSuccess,
    onPaymentError
}) => {
    const { t } = useTranslation();
    const stripe = useStripe();
    const elements = useElements();
    const store = useSelector(state => state.register);

    const [cardComplete, setCardComplete] = useState(false);
    const [cardError, setCardError] = useState(null);
    const [discountCode, setDiscountCode] = useState('');
    const [processing, setProcessing] = useState(false);

    // Handle card element changes
    const handleCardChange = useCallback((event) => {
        setCardComplete(event.complete);
        setCardError(event.error ? event.error.message : null);
    }, []);

    // Handle discount code validation
    const handleDiscountBlur = useCallback((event) => {
        if (onValidateCode) {
            onValidateCode(event);
        }
    }, [onValidateCode]);

    // Handle 3D Secure authentication
    const handle3DSecure = async (clientSecret) => {
        if (!stripe) {
            throw new Error('Stripe not initialized');
        }

        // This triggers the 3DS authentication popup
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

        if (error) {
            // 3DS authentication failed or was cancelled
            throw new Error(error.message || 'Authentication failed');
        }

        return paymentIntent;
    };

    // Handle form submission
    const handleFormSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements || processing || loading) {
            return;
        }

        if (!cardComplete) {
            setCardError(t("Please complete your card information"));
            return;
        }

        if (store?.appliedDiscount?.can_apply === false ||
            (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error)) {
            setCardError(t("Please remove or correct the invalid discount code"));
            return;
        }

        try {
            setProcessing(true);
            setCardError(null);

            // Create payment method using Stripe
            const cardElement = elements.getElement(CardElement);

            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });

            if (error) {
                setCardError(error.message);
                setProcessing(false);
                return;
            }

            // Call parent submit handler with payment method ID
            // The parent will call the backend API and return the response
            if (onSubmit) {
                const response = await onSubmit({
                    payment_method_id: paymentMethod.id,
                    discount_code: discountCode.trim() || null,
                    save_card: saveCard
                });

                // Check if 3D Secure is required
                if (response?.requires3DS && response?.clientSecret) {
                    try {
                        // Show 3DS authentication popup
                        const paymentIntent = await handle3DSecure(response.clientSecret);

                        // 3DS completed successfully - now confirm with backend
                        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
                            // Call backend confirmation API to create subscription
                            const confirmPayload = {
                                payment_intent_id: response.paymentIntentId || paymentIntent.id,
                                request_id: response.data?.request_id
                            };

                            console.log('Confirming payment with backend:', confirmPayload);
                            const confirmResponse = await confirmStripePaymentRequest(confirmPayload);

                            if (confirmResponse.success) {
                                // Backend confirmed - subscription created
                                if (onPaymentSuccess) {
                                    onPaymentSuccess(confirmResponse.data);
                                }
                            } else {
                                // Backend confirmation failed
                                throw new Error(confirmResponse.error || 'Failed to confirm payment');
                            }
                        } else {
                            // Handle other statuses
                            setCardError(t("Payment could not be completed. Please try again."));
                        }
                    } catch (threeDSError) {
                        console.error('3DS authentication error:', threeDSError);
                        setCardError(threeDSError.message || t("Authentication failed. Please try again."));
                        if (onPaymentError) {
                            onPaymentError(threeDSError);
                        }
                    }
                }
            }

            setProcessing(false);

        } catch (err) {
            console.error('Stripe payment error:', err);
            setCardError(err.message || t("An error occurred while processing your payment"));
            setProcessing(false);
            if (onPaymentError) {
                onPaymentError(err);
            }
        }
    };

    const isSubmitDisabled = loading || processing || !stripe || !cardComplete ||
                             (store?.appliedDiscount?.can_apply === false) ||
                             (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error);

    return (
        <form onSubmit={handleFormSubmit} className="stripe-payment-form">
            {/* Card Element */}
            <div className="form-group">
                <label className="form-label">
                    {t("Card Information *")}
                </label>
                <div className={`stripe-card-element ${cardError ? 'is-invalid' : ''}`}>
                    <CardElement
                        options={CARD_ELEMENT_OPTIONS}
                        onChange={handleCardChange}
                    />
                </div>
                {cardError && (
                    <div className="invalid-feedback d-block">
                        {cardError}
                    </div>
                )}
                <small className="form-text text-muted">
                    {t("Enter your card number, expiry date, and CVC")}
                </small>
            </div>

            {/* Discount Code */}
            {showDiscount && (
                <div className="form-group">
                    <label className="form-label" htmlFor="discount_code">
                        {t("Discount Code")}
                    </label>
                    <input
                        id="discount_code"
                        type="text"
                        className={`form-control ${store?.appliedDiscount?.can_apply === false || (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error) ? 'is-invalid' : ''} ${store?.appliedDiscount?.can_apply === true ? 'is-valid' : ''}`}
                        placeholder={t("Enter Discount Code (Optional)")}
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        onBlur={handleDiscountBlur}
                        disabled={loading || processing}
                        autoComplete="off"
                    />
                    {(store?.appliedDiscount?.can_apply === false ||
                      (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error)) && (
                        <div className="invalid-feedback d-block">
                            {store?.appliedDiscount?.message || store?.error || t('Discount code not found!')}
                        </div>
                    )}
                    {store?.appliedDiscount?.can_apply === true && (
                        <div className="valid-feedback d-block">
                            {store?.appliedDiscount?.message || t('Discount code applied!')}
                        </div>
                    )}
                </div>
            )}

            {/* Security Notice */}
            <div className="security-notice">
                <div className="security-icon">🔒</div>
                <small className="text-muted">
                    {t("Your payment information is encrypted and secure. We use Stripe for payment processing.")}
                </small>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className={`btn btn-primary btn-block payment-submit-btn ${(loading || processing) ? 'loading' : ''}`}
                disabled={isSubmitDisabled}
            >
                {(loading || processing) ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {t("Processing Payment...")}
                    </>
                ) : (
                    t("Continue to Payment")
                )}
            </button>
        </form>
    );
};

export default memo(StripeCardForm);
