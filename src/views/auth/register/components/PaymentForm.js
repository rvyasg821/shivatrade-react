import React, { memo, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import InputMask from 'react-input-mask';
import { useTranslation } from "react-i18next"

import {
    paymentFormSchema,
    defaultPaymentValues,
    handleNumericInput,
    getCvvLength,
    getCardType
} from '../utils/paymentValidation';
import { INPUT_MASKS, PAYMENT_FIELDS } from '../constants/paymentConstants';
import { useDispatch, useSelector } from 'react-redux';

const PaymentForm = ({ onSubmit, loading = false, initialValues = {}, onValidateCode, showDiscount = true }) => {
    const { t } = useTranslation();
    const {
        control,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors, isValid }
    } = useForm({
        mode: 'onChange',
        defaultValues: { ...defaultPaymentValues, ...initialValues },
        resolver: yupResolver(paymentFormSchema)
    });
    const store = useSelector(state => state.register);

    // Watch card number to determine CVV length
    const cardNumber = watch(PAYMENT_FIELDS.CARD_NUMBER);
    const cvvLength = getCvvLength(cardNumber);
    const cardType = getCardType(cardNumber);

    // Handle CVV input with dynamic length validation
    const handleCvvInput = useCallback((event) => {
        const { value } = event.target;
        const numericValue = handleNumericInput(value, cvvLength);
        setValue(PAYMENT_FIELDS.CARD_CVV, numericValue);
        trigger(PAYMENT_FIELDS.CARD_CVV);
    }, [cvvLength, setValue, trigger]);

    // Handle form submission
    const handleFormSubmit = useCallback((data) => {
        if (onSubmit) {
            console.log('data', data);

            onSubmit(data);
        }
    }, [onSubmit]);

    // Trigger validation when card number changes (for CVV length)
    useEffect(() => {
        if (cardNumber) {
            trigger(PAYMENT_FIELDS.CARD_CVV);
        }
    }, [cardNumber, trigger]);

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="payment-form">
            {/* Card Holder Name */}
            <div className="form-group">
                <label className="form-label" htmlFor={PAYMENT_FIELDS.HOLDER_NAME}>
                    {t("Card Holder Name *")}
                </label>
                <Controller
                    name={PAYMENT_FIELDS.HOLDER_NAME}
                    control={control}
                    render={({ field }) => (
                        <input
                            {...field}
                            id={PAYMENT_FIELDS.HOLDER_NAME}
                            type="text"
                            className={`form-control ${errors[PAYMENT_FIELDS.HOLDER_NAME] ? 'is-invalid' : ''}`}
                            placeholder={t("Enter card holder name")}
                            autoComplete="cc-name"
                            disabled={loading}
                            onBlur={() => trigger(PAYMENT_FIELDS.HOLDER_NAME)}
                        />
                    )}
                />
                {errors[PAYMENT_FIELDS.HOLDER_NAME] && (
                    <div className="invalid-feedback">
                        {errors[PAYMENT_FIELDS.HOLDER_NAME].message}
                    </div>
                )}
            </div>

            {/* Card Number */}
            <div className="form-group">
                <label className="form-label" htmlFor={PAYMENT_FIELDS.CARD_NUMBER}>
                    {t("Card Number *")}
                </label>
                <div className="card-input-wrapper">
                    <Controller
                        name={PAYMENT_FIELDS.CARD_NUMBER}
                        control={control}
                        render={({ field }) => (
                            <InputMask
                                {...field}
                                mask={INPUT_MASKS.CARD_NUMBER}
                                id={PAYMENT_FIELDS.CARD_NUMBER}
                                className={`form-control ${errors[PAYMENT_FIELDS.CARD_NUMBER] ? 'is-invalid' : ''}`}
                                placeholder="1234 5678 9012 3456"
                                autoComplete="cc-number"
                                disabled={loading}
                                onBlur={() => trigger(PAYMENT_FIELDS.CARD_NUMBER)}
                            />
                        )}
                    />

                </div>
                {errors[PAYMENT_FIELDS.CARD_NUMBER] && (
                    <div className="invalid-feedback">
                        {errors[PAYMENT_FIELDS.CARD_NUMBER].message}
                    </div>
                )}
            </div>

            {/* Expiry Date Row */}
            <div className="form-row mb-2">
                {/* Expiry Month */}
                <div className="form-group col-md-6">
                    <label className="form-label" htmlFor={PAYMENT_FIELDS.EXPIRY_MONTH}>
                        Expiry Month *
                    </label>
                    <Controller
                        name={PAYMENT_FIELDS.EXPIRY_MONTH}
                        control={control}
                        render={({ field }) => (
                            <InputMask
                                {...field}
                                mask={INPUT_MASKS.EXPIRY_MONTH}
                                id={PAYMENT_FIELDS.EXPIRY_MONTH}
                                className={`form-control ${errors[PAYMENT_FIELDS.EXPIRY_MONTH] ? 'is-invalid' : ''}`}
                                placeholder="MM"
                                autoComplete="cc-exp-month"
                                disabled={loading}
                                onBlur={() => trigger(PAYMENT_FIELDS.EXPIRY_MONTH)}
                            />
                        )}
                    />
                    {errors[PAYMENT_FIELDS.EXPIRY_MONTH] && (
                        <div className="invalid-feedback">
                            {errors[PAYMENT_FIELDS.EXPIRY_MONTH].message}
                        </div>
                    )}
                </div>

                {/* Expiry Year */}
                <div className="form-group col-md-6">
                    <label className="form-label" htmlFor={PAYMENT_FIELDS.EXPIRY_YEAR}>
                        {t("Expiry Year *")}
                    </label>
                    <Controller
                        name={PAYMENT_FIELDS.EXPIRY_YEAR}
                        control={control}
                        render={({ field }) => (
                            <InputMask
                                {...field}
                                mask={INPUT_MASKS.EXPIRY_YEAR}
                                id={PAYMENT_FIELDS.EXPIRY_YEAR}
                                className={`form-control ${errors[PAYMENT_FIELDS.EXPIRY_YEAR] ? 'is-invalid' : ''}`}
                                placeholder="YYYY"
                                autoComplete="cc-exp-year"
                                disabled={loading}
                                onBlur={() => trigger(PAYMENT_FIELDS.EXPIRY_YEAR)}
                            />
                        )}
                    />
                    {errors[PAYMENT_FIELDS.EXPIRY_YEAR] && (
                        <div className="invalid-feedback">
                            {errors[PAYMENT_FIELDS.EXPIRY_YEAR].message}
                        </div>
                    )}
                </div>
            </div>

            {/* CVV */}
            <div className="form-group">
                <label className="form-label" htmlFor={PAYMENT_FIELDS.CARD_CVV}>
                    {t("CVV *")}
                </label>
                <Controller
                    name={PAYMENT_FIELDS.CARD_CVV}
                    control={control}
                    render={({ field }) => (
                        <input
                            {...field}
                            id={PAYMENT_FIELDS.CARD_CVV}
                            type="text"
                            className={`form-control cvv-input ${errors[PAYMENT_FIELDS.CARD_CVV] ? 'is-invalid' : ''}`}
                            placeholder={cardType === 'amex' ? '1234' : '123'}
                            autoComplete="cc-csc"
                            disabled={loading}
                            maxLength={cvvLength}
                            onInput={handleCvvInput}
                            onBlur={() => trigger(PAYMENT_FIELDS.CARD_CVV)}
                        />
                    )}
                />
                {errors[PAYMENT_FIELDS.CARD_CVV] && (
                    <div className="invalid-feedback">
                        {errors[PAYMENT_FIELDS.CARD_CVV].message}
                    </div>
                )}
                <small className="form-text text-muted">
                    {cardType === 'amex'
                        ? 'The 4-digit code on the front of your American Express card'
                        : 'The 3-digit code on the back of your card'
                    }
                </small>
            </div>

            {showDiscount && (<div className="form-group">
                <label className="form-label" htmlFor={PAYMENT_FIELDS.DISCOUNT_CODE}>
                    {t("Discount Code")}
                </label>
                <Controller
                    name={PAYMENT_FIELDS.DISCOUNT_CODE}
                    control={control}
                    render={({ field }) => (
                        <input
                            {...field}
                            id={PAYMENT_FIELDS.DISCOUNT_CODE}
                            type="text"
                            className={`form-control ${errors[PAYMENT_FIELDS.DISCOUNT_CODE] ? 'is-invalid' : ''} ${store?.appliedDiscount?.can_apply === false || (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error) ? 'is-invalid' : ''} ${store?.appliedDiscount?.can_apply === true ? 'is-valid' : ''}`}
                            placeholder={t("Enter Discount Code (Optional)")}
                            autoComplete="off"
                            disabled={loading}
                            onBlur={onValidateCode}
                        />
                    )}
                />

                {
                    (store?.appliedDiscount?.can_apply === false ||
                     (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error)) && (
                        <div className="invalid-feedback d-block">
                            {store?.appliedDiscount?.message || store?.error || 'Discount code not found!'}
                        </div>
                    )
                }
                {
                    store?.appliedDiscount?.can_apply === true && (
                        <div className="valid-feedback d-block">
                            {store?.appliedDiscount?.message || 'Discount code applied!'}
                        </div>
                    )
                }
            </div>
            )}

            {/* Security Notice */}
            <div className="security-notice">
                <div className="security-icon">🔒</div>
                <small className="text-muted">
                    {t("Your payment information is encrypted and secure. We never store your card details.")}
                </small>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className={`btn btn-primary btn-block payment-submit-btn  ${loading ? 'loading' : ''}`}
                disabled={loading || !isValid || (store?.appliedDiscount?.can_apply === false) || (store?.actionFlag === 'DISCOUNT_CODE_APPLIED_ERROR' && store?.error)}
            >
                {loading ? (
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

export default memo(PaymentForm);