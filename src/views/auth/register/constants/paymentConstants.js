// ** Payment related constants

// ** Currency configuration (defaults - use useCurrency hook from CurrencyContext for dynamic values)
export const CURRENCY_SIGN = "$";
export const CURRENCY_CODE = "USD";

// ** Payment form field names
export const PAYMENT_FIELDS = {
    HOLDER_NAME: 'holder_name',
    CARD_NUMBER: 'card_number',
    EXPIRY_MONTH: 'expiry_month',
    EXPIRY_YEAR: 'expiry_year',
    CARD_CVV: 'card_cvv',
    DISCOUNT_CODE:"discount_code",   
};

// ** Payment action flags
export const PAYMENT_ACTION_FLAGS = {
    PAYPAL_CARD_PAYMENT: 'PPAL_CRD_PMNT',
    PAYPAL_REDIRECT_PAYMENT_CONFIRM: 'PPAL_RDRT_PMNT_CNFRM',
    PAYMENT_SUCCESS: 'PAYMENT_SCS',
    PAYMENT_ERROR: 'PAYMENT_ERR'
};

// ** Card type configurations
export const CARD_TYPES = {
    VISA: 'visa',
    MASTERCARD: 'mastercard',
    AMEX: 'amex',
    DISCOVER: 'discover',
    UNKNOWN: 'unknown'
};

// ** CVV lengths by card type
export const CVV_LENGTHS = {
    [CARD_TYPES.AMEX]: 4,
    [CARD_TYPES.VISA]: 3,
    [CARD_TYPES.MASTERCARD]: 3,
    [CARD_TYPES.DISCOVER]: 3,
    [CARD_TYPES.UNKNOWN]: 3
};

// ** Input validation limits
export const VALIDATION_LIMITS = {
    CARD_NUMBER_MIN: 13,
    CARD_NUMBER_MAX: 19,
    HOLDER_NAME_MIN: 2,
    HOLDER_NAME_MAX: 50,
    CVV_MIN: 3,
    CVV_MAX: 4,
    EXPIRY_MONTH_MIN: 1,
    EXPIRY_MONTH_MAX: 12,
    FUTURE_YEARS_LIMIT: 20
};

// ** Input masks
export const INPUT_MASKS = {
    CARD_NUMBER: "9999 9999 9999 9999 999",
    EXPIRY_MONTH: "99",
    EXPIRY_YEAR: "9999",
    CVV: "9999"
};

// ** Error messages
export const ERROR_MESSAGES = {
    REQUIRED: {
        HOLDER_NAME: "Card holder name is required",
        CARD_NUMBER: "Card number is required",
        EXPIRY_MONTH: "Card expiry month is required",
        EXPIRY_YEAR: "Card expiry year is required",
        CARD_CVV: "Card CVV is required"
    },
    INVALID: {
        CARD_NUMBER: "Invalid card number",
        EXPIRY_MONTH: "Invalid card expiry month",
        EXPIRY_YEAR: "Invalid card expiry year",
        CARD_CVV: "Invalid card CVV",
        PAST_DATE: "Month must be current or future"
    },
    LENGTH: {
        HOLDER_NAME_MIN: "Card holder name must be at least 2 characters",
        HOLDER_NAME_MAX: "Card holder name must not exceed 50 characters"
    }
};

// ** Payment processing states
export const PAYMENT_STATES = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    ERROR: 'error',
    REDIRECT: 'redirect'
};

// ** Default form values
export const DEFAULT_PAYMENT_FORM = {
    [PAYMENT_FIELDS.HOLDER_NAME]: "",
    [PAYMENT_FIELDS.CARD_NUMBER]: "",
    [PAYMENT_FIELDS.EXPIRY_MONTH]: "",
    [PAYMENT_FIELDS.EXPIRY_YEAR]: "",
    [PAYMENT_FIELDS.CARD_CVV]: ""
};