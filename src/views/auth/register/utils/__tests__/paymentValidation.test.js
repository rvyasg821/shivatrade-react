import {
    decodeMaskFormat,
    formatPrice,
    calculateFinalPrice,
    validateCardNumber,
    getCardType,
    getCvvLength,
    paymentFormSchema,
    validateField,
    handleNumericInput,
    formatExpiryDate,
    validatePaymentForm,
    defaultPaymentValues
} from '../paymentValidation';

describe('Payment Validation Utilities', () => {

    describe('decodeMaskFormat', () => {
        it('should remove mask characters from input', () => {
            expect(decodeMaskFormat('1234 5678 9012 3456')).toBe('1234567890123456');
            expect(decodeMaskFormat('(123) 456-7890')).toBe('1234567890');
            expect(decodeMaskFormat('12/34')).toBe('1234');
            expect(decodeMaskFormat('')).toBe('');
        });
    });

    describe('formatPrice', () => {
        it('should format price with USD currency', () => {
            expect(formatPrice(100)).toBe('$100.00');
            expect(formatPrice(99.99)).toBe('$99.99');
            expect(formatPrice(0)).toBe('$0.00');
        });
    });

    describe('calculateFinalPrice', () => {
        it('should calculate final price with tax', () => {
            const planItem = { price: 100, special_price: null };
            const result = calculateFinalPrice(planItem, 10);

            expect(result.basePrice).toBe(100);
            expect(result.taxPrice).toBe(10);
            expect(result.finalPrice).toBe(110);
        });

        it('should use special price when available', () => {
            const planItem = { price: 100, special_price: 80 };
            const result = calculateFinalPrice(planItem, 10);

            expect(result.basePrice).toBe(80);
            expect(result.taxPrice).toBe(8);
            expect(result.finalPrice).toBe(88);
        });
    });

    describe('validateCardNumber', () => {
        it('should validate valid card numbers', () => {
            expect(validateCardNumber('4532015112830366')).toBe(true); // Valid Visa
            expect(validateCardNumber('5555555555554444')).toBe(true); // Valid Mastercard
        });

        it('should reject invalid card numbers', () => {
            expect(validateCardNumber('1234567890123456')).toBe(false);
            expect(validateCardNumber('123')).toBe(false);
            expect(validateCardNumber('')).toBe(false);
        });
    });

    describe('getCardType', () => {
        it('should identify card types correctly', () => {
            expect(getCardType('4532015112830366')).toBe('visa');
            expect(getCardType('5555555555554444')).toBe('mastercard');
            expect(getCardType('378282246310005')).toBe('amex');
            expect(getCardType('6011111111111117')).toBe('discover');
            expect(getCardType('1234567890123456')).toBe('unknown');
        });
    });

    describe('getCvvLength', () => {
        it('should return correct CVV length for card types', () => {
            expect(getCvvLength('378282246310005')).toBe(4); // Amex
            expect(getCvvLength('4532015112830366')).toBe(3); // Visa
            expect(getCvvLength('5555555555554444')).toBe(3); // Mastercard
        });
    });

    describe('handleNumericInput', () => {
        it('should handle numeric input correctly', () => {
            expect(handleNumericInput('123abc456', 5)).toBe('12345');
            expect(handleNumericInput('abc', 3)).toBe('');
            expect(handleNumericInput('123456789', 4)).toBe('1234');
        });
    });

    describe('formatExpiryDate', () => {
        it('should format expiry date correctly', () => {
            expect(formatExpiryDate('12', '2025')).toBe('12/25');
            expect(formatExpiryDate('1', '2025')).toBe('01/25');
            expect(formatExpiryDate('', '2025')).toBe('');
        });
    });

    describe('paymentFormSchema validation', () => {
        const validData = {
            holder_name: 'John Doe',
            card_number: '4532 0151 1283 0366',
            expiry_month: '12',
            expiry_year: '2025',
            card_cvv: '123'
        };

        it('should validate correct payment data', async () => {
            await expect(paymentFormSchema.validate(validData)).resolves.toBeTruthy();
        });

        it('should reject empty holder name', async () => {
            const invalidData = { ...validData, holder_name: '' };
            await expect(paymentFormSchema.validate(invalidData)).rejects.toThrow();
        });

        it('should reject invalid card number', async () => {
            const invalidData = { ...validData, card_number: '1234' };
            await expect(paymentFormSchema.validate(invalidData)).rejects.toThrow();
        });

        it('should reject invalid expiry month', async () => {
            const invalidData = { ...validData, expiry_month: '13' };
            await expect(paymentFormSchema.validate(invalidData)).rejects.toThrow();
        });

        it('should reject past expiry year', async () => {
            const invalidData = { ...validData, expiry_year: '2020' };
            await expect(paymentFormSchema.validate(invalidData)).rejects.toThrow();
        });
    });

    describe('validatePaymentForm', () => {
        it('should return validation results', async () => {
            const validData = {
                holder_name: 'John Doe',
                card_number: '4532 0151 1283 0366',
                expiry_month: '12',
                expiry_year: '2025',
                card_cvv: '123'
            };

            const result = await validatePaymentForm(validData);
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('should return errors for invalid data', async () => {
            const invalidData = {
                holder_name: '',
                card_number: '1234',
                expiry_month: '13',
                expiry_year: '2020',
                card_cvv: ''
            };

            const result = await validatePaymentForm(invalidData);
            expect(result.isValid).toBe(false);
            expect(Object.keys(result.errors).length).toBeGreaterThan(0);
        });
    });
});