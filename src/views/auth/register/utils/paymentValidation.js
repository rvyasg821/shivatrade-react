import * as yup from 'yup';

// ** Utility function to decode masked input format
export const decodeMaskFormat = (value = "") => {
    const maskFormat = /[ ()_-]+/g;
    let result = value;
    if (result) {
        result = result.replace(maskFormat, "");
    }
    return result;
};

// ** Format price with currency
export const formatPrice = (price, currencyCode = null) => {
    // Get currency code from localStorage if not provided
    const code = currencyCode || localStorage.getItem('currencyCode') || 'USD';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2
    }).format(price);
};

// ** Calculate final price with tax
export const calculateFinalPrice = (planItem, taxPercent) => {
    const basePrice = planItem?.special_price && planItem.special_price > 0
        ? planItem.special_price
        : planItem?.price || 0;

    const finalPrice = basePrice + (basePrice * (taxPercent / 100));
    const taxPrice = basePrice * (taxPercent / 100);

    return {
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        taxPrice: parseFloat(taxPrice.toFixed(2)),
        basePrice: parseFloat(basePrice.toFixed(2))
    };
};

// ** Validate card number using Luhn algorithm
export const validateCardNumber = (cardNumber) => {
    const cleaned = decodeMaskFormat(cardNumber);
    if (!cleaned || cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

// ** Get card type from card number
export const getCardType = (cardNumber) => {
    const cleaned = decodeMaskFormat(cardNumber);

    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';

    return 'unknown';
};

// ** CVV length based on card type
export const getCvvLength = (cardNumber) => {
    const cardType = getCardType(cardNumber);
    return cardType === 'amex' ? 4 : 3;
};

// ** Payment form validation schema
export const paymentFormSchema = yup.object().shape({
    holder_name: yup
        .string()
        .required("Card holder name is required")
        .min(2, "Card holder name must be at least 2 characters")
        .max(50, "Card holder name must not exceed 50 characters"),

    card_number: yup
        .string()
        .test("len", "Invalid card number", (val) => {
            if (val) {
                const valLength = decodeMaskFormat(val).length;
                return valLength >= 13 && valLength <= 19;
            }
            return false;
        })
        .test("luhn", "Invalid card number", (val) => {
            if (val) {
                return validateCardNumber(val);
            }
            return false;
        })
        .required("Card number is required"),

    expiry_month: yup
        .string()
        .test("len", "Invalid card expiry month", (val) => {
            if (val) {
                const valLength = decodeMaskFormat(val).length;
                return valLength === 2;
            }
            return false;
        })
        .test("valid-month", "Invalid card expiry month", (val) => {
            const month = Number(decodeMaskFormat(val));
            return month >= 1 && month <= 12;
        })
        .test(
            "current-or-future-month",
            "Month must be current or future",
            function (val) {
                const month = Number(decodeMaskFormat(val || ""));
                const year = Number(decodeMaskFormat(this.parent?.expiry_year || ""));

                if (!year || !month) return true;

                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth() + 1;

                if (year === currentYear && month < currentMonth) {
                    return false;
                }
                return true;
            }
        )
        .required("Card expiry month is required"),

    expiry_year: yup
        .string()
        .test("len", "Invalid card expiry year", (val) => {
            if (val) {
                const valLength = decodeMaskFormat(val).length;
                return valLength === 4;
            }
            return false;
        })
        .test("valid-year", "Invalid card expiry year", (val) => {
            const year = Number(decodeMaskFormat(val));
            const today = new Date();
            const currentYear = today.getFullYear();

            return year >= currentYear && year <= currentYear + 20;
        })
        .required("Card expiry year is required"),

    card_cvv: yup
        .string()
        .transform((val) => decodeMaskFormat(val))
        .min(3, "Minimum 3 digits")
        .max(4, "Maximum 4 digits")
        .test("len", "Invalid card CVV", function (val) {
            const cardNumber = this.parent?.card_number || "";
            const expectedLength = getCvvLength(cardNumber);
            return val && val.length === expectedLength;
        })
        .matches(/^\d+$/, "CVV must be numeric")
        .required("Card CVV is required")
});

// ** Input masking patterns
export const inputMasks = {
    cardNumber: "9999 9999 9999 9999 999", // Supports up to 19 digits
    expiryMonth: "99",
    expiryYear: "9999",
    cvv: "9999" // Max 4 digits for Amex
};

// ** Form validation helpers
export const validateField = async (fieldName, value, schema) => {
    try {
        await schema.validateAt(fieldName, { [fieldName]: value });
        return null;
    } catch (error) {
        return error.message;
    }
};

// ** Handle numeric input for CVV and other numeric fields
export const handleNumericInput = (value, maxLength) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.slice(0, maxLength);
};

// ** Format expiry date for display (MM/YY)
export const formatExpiryDate = (month, year) => {
    if (!month || !year) return '';
    const shortYear = year.slice(-2);
    return `${month.padStart(2, '0')}/${shortYear}`;
};

// ** Validate complete payment form
export const validatePaymentForm = async (formData) => {
    try {
        await paymentFormSchema.validate(formData, { abortEarly: false });
        return { isValid: true, errors: {} };
    } catch (error) {
        const errors = {};
        error.inner.forEach(err => {
            errors[err.path] = err.message;
        });
        return { isValid: false, errors };
    }
};

// ** Default payment form values
export const defaultPaymentValues = {
    holder_name: "",
    card_number: "",
    expiry_month: "",
    expiry_year: "",
    card_cvv: ""
};