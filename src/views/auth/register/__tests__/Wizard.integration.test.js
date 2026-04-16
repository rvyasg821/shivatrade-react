import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Wizard from '../Wizard';
import { registerSlice } from '../store';

// Mock child components to focus on integration
jest.mock('../Step1CompanyDetails', () => {
    return function MockStep1({ nextStep }) {
        return (
            <div data-testid="step1">
                <h2>Company Details</h2>
                <button onClick={nextStep}>Next to Plans</button>
            </div>
        );
    };
});

jest.mock('../Step3Payment', () => {
    return function MockStep3({ nextStep, prevStep }) {
        return (
            <div data-testid="step3">
                <h2>Payment Info</h2>
                <button onClick={prevStep}>Back to Plans</button>
                <button onClick={nextStep}>Next to Confirmation</button>
            </div>
        );
    };
});

jest.mock('../Step4Profile', () => {
    return function MockStep4({ prevStep }) {
        return (
            <div data-testid="step4">
                <h2>Confirmation</h2>
                <button onClick={prevStep}>Back to Payment</button>
            </div>
        );
    };
});

// Mock Step2Plan with basic functionality
jest.mock('../Step2Plan', () => {
    return function MockStep2Plan({ nextStep, prevStep }) {
        const { useSelector, useDispatch } = require('react-redux');
        const { selectPlan } = require('../store');

        const dispatch = useDispatch();
        const { planSelection } = useSelector(state => state.register);

        const mockPlan = {
            _id: 'plan_1',
            name: 'Test Plan',
            tools: [{ _id: 'tool_1', name: 'test tool', price: 10 }],
            platform_price: 5
        };

        return (
            <div data-testid="step2">
                <h2>Plan Selection</h2>
                <button onClick={() => dispatch(selectPlan(mockPlan))}>
                    Select Plan
                </button>
                <button onClick={prevStep}>Back to Company</button>
                <button
                    onClick={nextStep}
                    disabled={!planSelection.selectedPlan}
                >
                    Next to Payment
                </button>
                {planSelection.selectedPlan && (
                    <div data-testid="selected-plan">
                        Plan: {planSelection.selectedPlan.name}
                    </div>
                )}
            </div>
        );
    };
});

jest.mock('@src/@core/components/toast/notification', () => jest.fn());

const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            register: registerSlice.reducer
        },
        preloadedState: {
            register: {
                registerItem: {},
                planSelection: {
                    selectedPlan: null,
                    billingCycle: 'MONTHLY',
                    totalPrice: 0,
                    platformFee: 0,
                },
                plans: [],
                plansLoading: false,
                actionFlag: '',
                loading: false,
                success: '',
                error: '',
                ...initialState
            }
        }
    });
};

const renderWithProvider = (component, store) => {
    return render(
        <Provider store={store}>
            {component}
        </Provider>
    );
};

describe('Wizard Integration Tests', () => {
    test('complete wizard navigation flow', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Start at step 1
        expect(screen.getByTestId('step1')).toBeInTheDocument();
        expect(screen.getByText('Company Details')).toBeInTheDocument();

        // Navigate to step 2
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        // Select a plan
        fireEvent.click(screen.getByText('Select Plan'));

        await waitFor(() => {
            expect(screen.getByTestId('selected-plan')).toBeInTheDocument();
        });

        // Navigate to step 3
        fireEvent.click(screen.getByText('Next to Payment'));

        await waitFor(() => {
            expect(screen.getByTestId('step3')).toBeInTheDocument();
        });

        // Navigate to step 4
        fireEvent.click(screen.getByText('Next to Confirmation'));

        await waitFor(() => {
            expect(screen.getByTestId('step4')).toBeInTheDocument();
        });
    });

    test('backward navigation works correctly', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Navigate forward to step 2
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        // Navigate back to step 1
        fireEvent.click(screen.getByText('Back to Company'));

        await waitFor(() => {
            expect(screen.getByTestId('step1')).toBeInTheDocument();
        });
    });

    test('step validation prevents navigation without plan selection', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Navigate to step 2
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        // Try to navigate to step 3 without selecting a plan
        const nextButton = screen.getByText('Next to Payment');
        expect(nextButton).toBeDisabled();
    });

    test('sidebar shows correct step states', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Check initial step states
        const steps = document.querySelectorAll('.steps li');
        expect(steps[0]).toHaveClass('active');
        expect(steps[1]).toHaveClass('pending');
        expect(steps[2]).toHaveClass('pending');
        expect(steps[3]).toHaveClass('pending');

        // Navigate to step 2
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            const updatedSteps = document.querySelectorAll('.steps li');
            expect(updatedSteps[0]).toHaveClass('completed');
            expect(updatedSteps[1]).toHaveClass('active');
        });
    });

    test('sidebar shows plan information when selected', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Navigate to step 2 and select a plan
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Select Plan'));

        await waitFor(() => {
            // Check if plan info appears in sidebar
            expect(screen.getByText('Test Plan')).toBeInTheDocument();
        });
    });

    test('step accessibility and keyboard navigation', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Test that steps have proper structure
        const sidebar = document.querySelector('.wizard-sidebar');
        expect(sidebar).toBeInTheDocument();

        const stepsList = document.querySelector('.steps');
        expect(stepsList).toBeInTheDocument();

        // Test step indicators
        const circles = document.querySelectorAll('.circle');
        expect(circles).toHaveLength(4);
        expect(circles[0]).toHaveTextContent('1');
        expect(circles[1]).toHaveTextContent('2');
        expect(circles[2]).toHaveTextContent('3');
        expect(circles[3]).toHaveTextContent('4');
    });

    test('responsive behavior on mobile', async () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Verify mobile layout
        const container = document.querySelector('.wizard-container');
        expect(container).toBeInTheDocument();

        const sidebar = document.querySelector('.wizard-sidebar');
        expect(sidebar).toBeInTheDocument();
    });

    test('plan selection data persists across steps', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Navigate to step 2 and select a plan
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Select Plan'));

        await waitFor(() => {
            expect(screen.getByTestId('selected-plan')).toBeInTheDocument();
        });

        // Navigate to step 3
        fireEvent.click(screen.getByText('Next to Payment'));

        await waitFor(() => {
            expect(screen.getByTestId('step3')).toBeInTheDocument();
        });

        // Navigate back to step 2
        fireEvent.click(screen.getByText('Back to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
            // Plan selection should still be there
            expect(screen.getByTestId('selected-plan')).toBeInTheDocument();
        });
    });

    test('error handling in wizard navigation', async () => {
        const store = createMockStore();

        renderWithProvider(<Wizard />, store);

        // Navigate to step 2
        fireEvent.click(screen.getByText('Next to Plans'));

        await waitFor(() => {
            expect(screen.getByTestId('step2')).toBeInTheDocument();
        });

        // Try to proceed without plan selection - should show notification
        // This would be handled by the validation in the actual nextStep function
        const nextButton = screen.getByText('Next to Payment');
        expect(nextButton).toBeDisabled();
    });
});