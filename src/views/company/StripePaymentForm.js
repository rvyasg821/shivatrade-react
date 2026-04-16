import React, { memo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormFeedback, Input, Label } from "reactstrap";
import { useDispatch, useSelector } from "react-redux";
import { getActiveCard } from "@src/views/auth/register/store/index";
import Swal from "sweetalert2";

const StripePaymentForm = ({
    onSubmit,
    loading = false,
    initialValues = {},
    planItem,
    gateway = 'stripe',
    discountCode = '',
    setDiscountCode,
    appliedDiscount,
    onApplyDiscount,
    onRemoveDiscount,
    discountLoading = false
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const companyId = useSelector(
        (state) => state.company?.companyItem?.user?._id
    );

    // Get active card from store
    const activeCardData = useSelector((state) => state.register?.activeCard);
    const activeCardLoading = useSelector((state) => state.register?.activeCardLoading);

    // Extract card from response
    const activeCard = activeCardData?.hasCard ? activeCardData.card : null;

    // Fetch active card for this user
    useEffect(() => {
        if (companyId) {
            dispatch(getActiveCard({ userId: companyId, gateway: 'stripe' }));
        }
    }, [companyId, dispatch]);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm({
        mode: "onChange",
        defaultValues: {
            ...initialValues,
            selectedCard: "",
            selectedCardDetails: {}
        }
    });

    const selectedCard = watch("selectedCard");

    // Auto-select the active card when it's loaded
    useEffect(() => {
        if (activeCard) {
            setValue("selectedCard", activeCard._id);
            setValue("selectedCardDetails", {
                expiry_month: activeCard.expiry_month,
                expiry_year: activeCard.expiry_year,
                gateway: activeCard.gateway,
                holder_name: activeCard.holder_name,
                is_default: activeCard.is_default,
                last4: activeCard.last4
            });
        }
    }, [activeCard, setValue]);

    const handlePaymentConfirm = () => {
        Swal.fire({
            title: t("Are you sure?"),
            text: planItem.name,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: t("Yes, continue!"),
            cancelButtonText: t("No"),
            customClass: {
                confirmButton: "btn btn-primary",
                cancelButton: "btn btn-outline-danger ms-1",
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                handleSubmit(submitForm)();
            }
        });
    };

    const submitForm = (data) => {
        onSubmit({
            ...data,
            selectedCardDetails: data.selectedCardDetails
        });
    };

    // Check if we have a card available
    const hasCard = !!activeCard;
    const isLoading = loading || activeCardLoading;

    return (
        <form className="payment-form">
            {/* Active Card Display */}
            <div className="mb-3">
                <Label className="form-label">{t("Payment Card")}</Label>

                <Controller
                    name="selectedCard"
                    control={control}
                    rules={{ required: "Card is required" }}
                    render={({ field }) => (
                        <div>
                            {activeCardLoading ? (
                                <div className="d-flex align-items-center">
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    <span className="text-muted">{t("Loading card...")}</span>
                                </div>
                            ) : hasCard ? (
                                <div
                                    className={`d-flex align-items-center stored-card-item selected-card`}
                                >
                                    <Input
                                        type="radio"
                                        id="active-card"
                                        value={activeCard._id}
                                        checked={true}
                                        onChange={() => {}}
                                        className=""
                                    />
                                    <Label htmlFor="active-card" className="mb-0">
                                        ****{activeCard.last4} — {activeCard.holder_name} ({activeCard.expiry_month}/{activeCard.expiry_year})
                                    </Label>
                                </div>
                            ) : (
                                <p className="text-muted">{t("There is no Stripe card available.")}</p>
                            )}
                        </div>
                    )}
                />

                <FormFeedback className="d-block">
                    {errors.selectedCard?.message}
                </FormFeedback>
            </div>

            {/* Discount Code Section */}
            {setDiscountCode && (
                <div className="mb-3">
                    <Label className="form-label">{t('Have a discount code?')}</Label>
                    <div className="d-flex gap-2">
                        <Input
                            type="text"
                            placeholder={t("Enter discount code")}
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                            disabled={appliedDiscount !== null || discountLoading || isLoading}
                        />
                        {appliedDiscount ? (
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={onRemoveDiscount}
                                disabled={isLoading}
                            >
                                {t('Remove')}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={onApplyDiscount}
                                disabled={!discountCode.trim() || discountLoading || isLoading}
                            >
                                {discountLoading ? t('Applying...') : t('Apply')}
                            </button>
                        )}
                    </div>
                    {appliedDiscount && (
                        <div className="alert alert-success mt-2 mb-0">
                            <small>{t('Discount applied successfully!')}</small>
                        </div>
                    )}
                </div>
            )}

            {/* Security Notice */}
            <div className="security-notice d-flex align-items-center">
                <div className="security-icon">🔒</div>
                <small className="text-muted">
                    {t(
                        "Your payment information is encrypted and secure. Powered by Stripe."
                    )}
                </small>
            </div>

            {/* Continue Button */}
            <button
                type="button"
                className={`btn btn-primary btn-block payment-submit-btn ${loading && hasCard ? "loading" : ""}`}
                disabled={isLoading || !selectedCard || !hasCard}
                onClick={handlePaymentConfirm}
            >
                {activeCardLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        {t("Loading...")}
                    </>
                ) : !hasCard ? (
                    t("Card Not Available")
                ) : loading ? (
                    <>
                        <span className="spinner-border spinner-border-sm"></span>
                        {t("Processing Payment...")}
                    </>
                ) : (
                    t("Continue to Payment")
                )}
            </button>
        </form>
    );
};

export default memo(StripePaymentForm);
