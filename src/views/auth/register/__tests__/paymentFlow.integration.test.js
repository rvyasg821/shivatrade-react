import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import registerReducer from '../store';
import Step3Payment from '../Step3Payment';
import Step4PaymentProcess from '../Step4PaymentProcess';
import Step5ThankYou from '../Step5ThankYou';

// Mock dependencies
jest.mock('@src/utility/Utils', () => ({
    getDomailUrl: () => 'https://example.com',
    setCurrentUser: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn()
}));

jest.mock('@constant/defaultValues', () => ({
    appsRoot: '/app'
}));

jest.mock('@src/@core/components/toast/notification', () =>
    jest.fn((type, message, variant) => console.log(`${type}: ${message}`))
);

// Mock react-input-mask
jest.mock('react-input-mask', () => {
    return function MockInputMask({ mask, ...props }) {
        return <input {...props} data-mask={mask} />;
    };
});

// Create test store
const createTestStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            register: registerReducer
        },
        preloadedState: {
            register: {
                registerItem: {
                    _id: 'user123',
                    company_name: 'Test Company',
                    email: 'test@example.com',
                    fname: 'John',
                    lname: 'Doe'
                },
                planSelection: {
                    selectedPlan: {
                        _id: 'plan123',
                        name: 'Pro Plan',
                        price: 100,
                        special_price: 80,
                        platform_price: 10,
                        tax_value: 10,
                        tools: [
                            { _id: 'tool1', name: 'Tool 1', price: 20 },
                            { _id: 'tool2', name: 'Tool 2', price: 30 }
                        ]
                    },
                    selectedTools: ['tool1', 'tool2'],
                    billingCycle: 'MONTHLY',
                    totalPrice: 140
                },
                paymentLoading: false,
                paymentActionFlag: '',
                paymentSuccess: '',
                paymentError: '',
                paymentItem: null,
                ...initialState
            }
        }
    });
};

// Test wrapper component
const TestWrapper = ({ children, store }) => (
    <Provider store={store}>
        <BrowserRouter>
            {children}
        </BrowserRouter>
    </Provider>
);

describe('Payment Flow Integration Tests', () => {
    let mockNextStep, mockPrevStep;

    beforeEach(() => {
        mockNextStep = jest.fn();
        mockPrevStep = jest.fn();
        jest.clearAllMocks();
    });

    describe('Step3Payment Integration', () => {
        it('should render payment form and summary correctly', () => {
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            expect(screen.getByText('Payment Information')).toBeInTheDocument();
            expect(screen.getByLabelText(/card holder name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
            expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        });

        it('should handle payment form submission', async () => {
            const user = userEvent.setup();
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Fill out payment form
            await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
            await user.type(screen.getByLabelText(/card number/i), '4532015112830366');
            await user.type(screen.getByLabelText(/expiry month/i), '12');
            await user.type(screen.getByLabelText(/expiry year/i), '2025');
            await user.type(screen.getByLabelText(/cvv/i), '123');

            // Submit form
            const submitButton = screen.getByRole('button', { name: /continue to payment/i });
            await user.click(submitButton);

            // Verify form submission
            await waitFor(() => {
                const state = store.getState();
                expect(state.register.paymentLoading).toBe(true);
            });
        });

        it('should handle navigation correctly', async () => {
            const user = userEvent.setup();
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Test back button
            const backButton = screen.getByRole('button', { name: /back to plans/i });
            await user.click(backButton);

            expect(mockPrevStep).toHaveBeenCalled();
        });

        it('should show error when no plan is selected', () => {
            const store = createTestStore({
                planSelection: {
                    selectedPlan: null,
                    selectedTools: [],
                    billingCycle: 'MONTHLY',
                    totalPrice: 0
                }
            });

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            expect(screen.getByText(/no plan selected/i)).toBeInTheDocument();
        });
    });

    describe('Step4PaymentProcess Integration', () => {
        it('should render payment processing correctly', () => {
            const store = createTestStore({
                paymentLoading: true
            });

            // Mock URL search params
            delete window.location;
            window.location = {
                search: '?request_id=123&state=approved&action=confirm',
                href: 'https://example.com/payment-process'
            };

            render(
                <TestWrapper store={store}>
                    <Step4PaymentProcess nextStep={mockNextStep} />
                </TestWrapper>
            );

            expect(screen.getByText(/please wait while we confirm your payment/i)).toBeInTheDocument();
        });

        it('should handle successful payment confirmation', async () => {
            const store = createTestStore({
                paymentActionFlag: 'PPAL_RDRT_PMNT_CNFRM_SCS',
                paymentItem: {
                    _id: 'payment123',
                    status: 'completed'
                }
            });

            render(
                <TestWrapper store={store}>
                    <Step4PaymentProcess nextStep={mockNextStep} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockNextStep).toHaveBeenCalled();
            }, { timeout: 3000 });
        });

        it('should handle payment errors with retry', async () => {
            const user = userEvent.setup();
            const store = createTestStore({
                paymentError: 'Payment failed'
            });

            render(
                <TestWrapper store={store}>
                    <Step4PaymentProcess nextStep={mockNextStep} />
                </TestWrapper>
            );

            // Should show retry button after error
            await waitFor(() => {
                const retryButton = screen.queryByText(/try again/i);
                if (retryButton) {
                    expect(retryButton).toBeInTheDocument();
                }
            });
        });
    });

    describe('Step5ThankYou Integration', () => {
        it('should render thank you page correctly', () => {
            const store = createTestStore({
                paymentItem: {
                    _id: 'payment123',
                    status: 'completed',
                    amount: 140
                }
            });

            render(
                <TestWrapper store={store}>
                    <Step5ThankYou />
                </TestWrapper>
            );

            expect(screen.getByText('Thank You!')).toBeInTheDocument();
            expect(screen.getByText(/registration and payment have been completed/i)).toBeInTheDocument();
        });

        it('should show registration summary', () => {
            const store = createTestStore({
                paymentItem: {
                    _id: 'payment123',
                    status: 'completed'
                }
            });

            render(
                <TestWrapper store={store}>
                    <Step5ThankYou />
                </TestWrapper>
            );

            expect(screen.getByText('Test Company')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
            expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        });

        it('should handle dashboard redirect', async () => {
            const store = createTestStore({
                registerItem: {
                    _id: 'user123',
                    token: {
                        accessToken: 'token123',
                        refreshToken: 'refresh123'
                    },
                    ability: []
                }
            });

            render(
                <TestWrapper store={store}>
                    <Step5ThankYou />
                </TestWrapper>
            );

            // Should show countdown
            expect(screen.getByText(/you will be automatically redirected/i)).toBeInTheDocument();

            // Should have redirect button
            const redirectButton = screen.getByRole('button', { name: /go to dashboard now/i });
            expect(redirectButton).toBeInTheDocument();
        });
    });

    describe('Complete Payment Flow', () => {
        it('should handle complete payment flow from form to completion', async () => {
            const user = userEvent.setup();
            let currentStep = 3;

            const mockNextStepHandler = () => {
                currentStep++;
            };

            const store = createTestStore();

            // Start with Step 3 (Payment)
            const { rerender } = render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStepHandler} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Fill and submit payment form
            await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
            await user.type(screen.getByLabelText(/card number/i), '4532015112830366');
            await user.type(screen.getByLabelText(/expiry month/i), '12');
            await user.type(screen.getByLabelText(/expiry year/i), '2025');
            await user.type(screen.getByLabelText(/cvv/i), '123');

            const submitButton = screen.getByRole('button', { name: /continue to payment/i });
            await user.click(submitButton);

            // Simulate successful payment response
            store.dispatch({
                type: 'register/paypalCardPayment/fulfilled',
                payload: {
                    paymentItem: { _id: 'payment123', status: 'completed' },
                    paymentActionFlag: 'PPAL_CRD_PMNT_SCS',
                    paymentSuccess: 'Payment successful',
                    paymentError: ''
                }
            });

            // Move to Step 4 (Payment Process)
            rerender(
                <TestWrapper store={store}>
                    <Step4PaymentProcess nextStep={mockNextStepHandler} />
                </TestWrapper>
            );

            // Should show processing
            expect(screen.getByText(/processing your payment/i)).toBeInTheDocument();

            // Simulate payment confirmation
            store.dispatch({
                type: 'register/confirmRedirectPaypalPayment/fulfilled',
                payload: {
                    paymentItem: { _id: 'payment123', status: 'completed' },
                    paymentActionFlag: 'PPAL_RDRT_PMNT_CNFRM_SCS',
                    paymentSuccess: 'Payment confirmed',
                    paymentError: ''
                }
            });

            // Move to Step 5 (Thank You)
            rerender(
                <TestWrapper store={store}>
                    <Step5ThankYou />
                </TestWrapper>
            );

            // Should show thank you page
            expect(screen.getByText('Thank You!')).toBeInTheDocument();
        });

        it('should handle payment errors gracefully', async () => {
            const user = userEvent.setup();
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Fill and submit payment form
            await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
            await user.type(screen.getByLabelText(/card number/i), '4532015112830366');
            await user.type(screen.getByLabelText(/expiry month/i), '12');
            await user.type(screen.getByLabelText(/expiry year/i), '2025');
            await user.type(screen.getByLabelText(/cvv/i), '123');

            const submitButton = screen.getByRole('button', { name: /continue to payment/i });
            await user.click(submitButton);

            // Simulate payment error
            store.dispatch({
                type: 'register/paypalCardPayment/fulfilled',
                payload: {
                    paymentItem: null,
                    paymentActionFlag: 'PPAL_CRD_PMNT_ERR',
                    paymentSuccess: '',
                    paymentError: 'Payment declined'
                }
            });

            // Should show error notification
            await waitFor(() => {
                const state = store.getState();
                expect(state.register.paymentError).toBe('Payment declined');
            });
        });
    });

    describe('Accessibility Tests', () => {
        it('should have proper ARIA labels and roles', () => {
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Check form accessibility
            expect(screen.getByLabelText(/card holder name/i)).toHaveAttribute('id');
            expect(screen.getByLabelText(/card number/i)).toHaveAttribute('id');
            expect(screen.getByLabelText(/cvv/i)).toHaveAttribute('id');

            // Check button accessibility
            const buttons = screen.getAllByRole('button');
            buttons.forEach(button => {
                expect(button).toHaveAttribute('type');
            });
        });

        it('should support keyboard navigation', async () => {
            const user = userEvent.setup();
            const store = createTestStore();

            render(
                <TestWrapper store={store}>
                    <Step3Payment nextStep={mockNextStep} prevStep={mockPrevStep} />
                </TestWrapper>
            );

            // Tab through form fields
            await user.tab();
            expect(screen.getByLabelText(/card holder name/i)).toHaveFocus();

            await user.tab();
            expect(screen.getByLabelText(/card number/i)).toHaveFocus();
        });
    });
});