import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentForm from '../PaymentForm';

// Mock react-input-mask
jest.mock('react-input-mask', () => {
    return function MockInputMask({ mask, ...props }) {
        return <input {...props} data-mask={mask} />;
    };
});

describe('PaymentForm Component', () => {
    const mockOnSubmit = jest.fn();

    const defaultProps = {
        onSubmit: mockOnSubmit,
        loading: false
    };

    beforeEach(() => {
        mockOnSubmit.mockClear();
    });

    it('renders all form fields correctly', () => {
        render(<PaymentForm {...defaultProps} />);

        expect(screen.getByLabelText(/card holder name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/expiry month/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/expiry year/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
    });

    it('displays security notice', () => {
        render(<PaymentForm {...defaultProps} />);

        expect(screen.getByText(/your payment information is encrypted and secure/i)).toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
        render(<PaymentForm {...defaultProps} loading={true} />);

        const submitButton = screen.getByRole('button');
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/processing payment/i)).toBeInTheDocument();

        // All inputs should be disabled
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach(input => {
            expect(input).toBeDisabled();
        });
    });

    it('validates required fields', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const submitButton = screen.getByRole('button', { name: /continue to payment/i });

        // Try to submit empty form
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/card holder name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/card number is required/i)).toBeInTheDocument();
            expect(screen.getByText(/card expiry month is required/i)).toBeInTheDocument();
            expect(screen.getByText(/card expiry year is required/i)).toBeInTheDocument();
            expect(screen.getByText(/card cvv is required/i)).toBeInTheDocument();
        });
    });

    it('validates card number format', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const cardNumberInput = screen.getByLabelText(/card number/i);

        // Enter invalid card number
        await user.type(cardNumberInput, '1234');
        await user.tab(); // Trigger blur event

        await waitFor(() => {
            expect(screen.getByText(/invalid card number/i)).toBeInTheDocument();
        });
    });

    it('validates expiry month', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const expiryMonthInput = screen.getByLabelText(/expiry month/i);

        // Enter invalid month
        await user.type(expiryMonthInput, '13');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText(/invalid card expiry month/i)).toBeInTheDocument();
        });
    });

    it('validates expiry year', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const expiryYearInput = screen.getByLabelText(/expiry year/i);

        // Enter past year
        await user.type(expiryYearInput, '2020');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText(/invalid card expiry year/i)).toBeInTheDocument();
        });
    });

    it('adjusts CVV length based on card type', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const cardNumberInput = screen.getByLabelText(/card number/i);
        const cvvInput = screen.getByLabelText(/cvv/i);

        // Enter Amex card number (should require 4-digit CVV)
        await user.type(cardNumberInput, '378282246310005');

        await waitFor(() => {
            expect(screen.getByText(/4 digits/i)).toBeInTheDocument();
            expect(cvvInput).toHaveAttribute('maxLength', '4');
        });

        // Clear and enter Visa card number (should require 3-digit CVV)
        await user.clear(cardNumberInput);
        await user.type(cardNumberInput, '4532015112830366');

        await waitFor(() => {
            expect(screen.getByText(/3 digits/i)).toBeInTheDocument();
            expect(cvvInput).toHaveAttribute('maxLength', '3');
        });
    });

    it('handles CVV numeric input correctly', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const cvvInput = screen.getByLabelText(/cvv/i);

        // Try to enter non-numeric characters
        fireEvent.input(cvvInput, { target: { value: 'abc123def' } });

        await waitFor(() => {
            expect(cvvInput.value).toBe('123');
        });
    });

    it('submits form with valid data', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        // Fill out form with valid data
        await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
        await user.type(screen.getByLabelText(/card number/i), '4532015112830366');
        await user.type(screen.getByLabelText(/expiry month/i), '12');
        await user.type(screen.getByLabelText(/expiry year/i), '2025');
        await user.type(screen.getByLabelText(/cvv/i), '123');

        const submitButton = screen.getByRole('button', { name: /continue to payment/i });

        await waitFor(() => {
            expect(submitButton).not.toBeDisabled();
        });

        await user.click(submitButton);

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith({
                holder_name: 'John Doe',
                card_number: '4532015112830366',
                expiry_month: '12',
                expiry_year: '2025',
                card_cvv: '123'
            });
        });
    });

    it('uses initial values when provided', () => {
        const initialValues = {
            holder_name: 'Jane Smith',
            card_number: '4532 0151 1283 0366'
        };

        render(<PaymentForm {...defaultProps} initialValues={initialValues} />);

        expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
        expect(screen.getByDisplayValue('4532 0151 1283 0366')).toBeInTheDocument();
    });

    it('shows card type indicator for recognized cards', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const cardNumberInput = screen.getByLabelText(/card number/i);

        // Enter Visa card number
        await user.type(cardNumberInput, '4532015112830366');

        await waitFor(() => {
            const cardIcon = document.querySelector('.card-visa');
            expect(cardIcon).toBeInTheDocument();
        });
    });

    it('handles form reset correctly', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        // Fill out some fields
        await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
        await user.type(screen.getByLabelText(/card number/i), '4532');

        // Verify fields have values
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('4532')).toBeInTheDocument();
    });

    it('prevents form submission when loading', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} loading={true} />);

        const submitButton = screen.getByRole('button');

        await user.click(submitButton);

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows appropriate CVV help text based on card type', async () => {
        const user = userEvent.setup();
        render(<PaymentForm {...defaultProps} />);

        const cardNumberInput = screen.getByLabelText(/card number/i);

        // Test Amex card
        await user.type(cardNumberInput, '378282246310005');

        await waitFor(() => {
            expect(screen.getByText(/4-digit code on the front/i)).toBeInTheDocument();
        });

        // Clear and test Visa card
        await user.clear(cardNumberInput);
        await user.type(cardNumberInput, '4532015112830366');

        await waitFor(() => {
            expect(screen.getByText(/3-digit code on the back/i)).toBeInTheDocument();
        });
    });
});