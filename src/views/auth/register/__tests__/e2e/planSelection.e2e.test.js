/**
 * End-to-End Tests for Plan Selection Feature
 * 
 * These tests simulate real user interactions with the plan selection flow
 * to ensure the complete feature works as expected.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { registerSlice } from '../../store';
import Wizard from '../../Wizard';

// Mock API responses
const mockPlansResponse = [
    {
        _id: 'plan_basic',
        name: 'Basic Plan',
        description: 'Perfect for small businesses',
        tools: [
            { _id: 'tool_wazuh', name: 'wazuh', price: 9.99 },
            { _id: 'tool_openvas', name: 'openvas', price: 15.99 }
        ],
        platform_price: 5,
        features: ['24/7 Support', 'Basic Analytics'],
        status: 1,
        displayOrder: 1,
        duration: 1,
        duration_type: 'MONTHLY',
        trial: true,
        recurring: true,
        is_lifetime: false
    },
    {
        _id: 'plan_premium',
        name: 'Premium Plan',
        description: 'Advanced features for growing businesses',
        tools: [
            { _id: 'tool_wazuh', name: 'wazuh', price: 19.99 },
            { _id: 'tool_openvas', name: 'openvas', price: 25.99 },
            { _id: 'tool_threat', name: 'Netswitch Threat Intel', price: 50.00 }
        ],
        platform_price: 10,
        features: ['Priority Support', 'Advanced Analytics', 'Custom Reports'],
        status: 1,
        displayOrder: 2,
        duration: 1,
        duration_type: 'MONTHLY',
        trial: false,
        recurring: true,
        is_lifetime: false
    }
];

// Mock external dependencies
jest.mock('@src/utility/AxiosConfig', () => ({
    get: jest.fn(),
    post: jest.fn()
}));

jest.mock('@src/@core/components/toast/notification', () => jest.fn());

import instance from '@src/utility/AxiosConfig';

const createTestStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            register: registerSlice.reducer
        },
        preloadedState: {
            register: {
                registerItem: {
                    company_name: 'Test Company',
                    fname: 'John',
                    lname: 'Doe',
                    email: 'john@test.com',
                    mobile: '',
                    country_code: { code: '+1', name: 'United States' },
                    password: 'password123'
                },
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

describe('Plan Selection E2E Tests', () => {
    let user;
    let store;

    beforeEach(() => {
        user = userEvent.setup();
        store = createTestStore();

        // Mock successful API responses
        instance.get.mockResolvedValue({ data: mockPlansResponse });
        instance.post.mockResolvedValue({
            data: {
                statusCode: 200,
                data: { token: { accessToken: 'test-token' } }
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Complete plan selection user journey', async () => {
        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Start at step 1 - Company Details
        expect(screen.getByText('Company Details')).toBeInTheDocument();

        // Navigate to step 2 - Plan Selection
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);

        // Wait for plan selection step to load
        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Verify billing cycle filter is present
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Yearly')).toBeInTheDocument();

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
            expect(screen.getByText('Premium Plan')).toBeInTheDocument();
        });

        // Verify plan details are displayed
        expect(screen.getByText('Perfect for small businesses')).toBeInTheDocument();
        expect(screen.getByText('Advanced features for growing businesses')).toBeInTheDocument();

        // Select the Basic Plan
        const basicPlanCard = screen.getByText('Basic Plan').closest('.plan-card');
        await user.click(basicPlanCard);

        // Verify plan is selected
        await waitFor(() => {
            expect(basicPlanCard).toHaveClass('selected');
        });

        // Verify pricing summary appears
        expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
        expect(screen.getByText('$25.98')).toBeInTheDocument(); // Tools total
        expect(screen.getByText('$5.00')).toBeInTheDocument(); // Platform fee
        expect(screen.getByText('$30.98')).toBeInTheDocument(); // Total

        // Verify continue button is enabled
        const continueButton = screen.getByText('Continue');
        expect(continueButton).not.toBeDisabled();

        // Continue to next step
        await user.click(continueButton);

        // Verify navigation to payment step
        await waitFor(() => {
            expect(screen.getByText('Payment Info')).toBeInTheDocument();
        });
    });

    test('Billing cycle switching functionality', async () => {
        // Mock different responses for monthly and yearly
        const yearlyPlans = mockPlansResponse.map(plan => ({
            ...plan,
            duration_type: 'YEARLY'
        }));

        instance.get
            .mockResolvedValueOnce({ data: mockPlansResponse }) // Monthly
            .mockResolvedValueOnce({ data: yearlyPlans }); // Yearly

        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Wait for monthly plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Switch to yearly billing
        const yearlyButton = screen.getByText('Yearly');
        await user.click(yearlyButton);

        // Verify API is called with yearly parameter
        await waitFor(() => {
            expect(instance.get).toHaveBeenCalledWith('/admin/plan/list?duration_type=YEARLY');
        });

        // Verify yearly button is now active
        expect(yearlyButton).toHaveClass('active');
    });

    test('Plan comparison and selection', async () => {
        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
            expect(screen.getByText('Premium Plan')).toBeInTheDocument();
        });

        // Compare plan features
        const basicPlan = screen.getByText('Basic Plan').closest('.plan-card');
        const premiumPlan = screen.getByText('Premium Plan').closest('.plan-card');

        // Verify Basic Plan details
        within(basicPlan).getByText('$25.98'); // Tools total
        within(basicPlan).getByText('wazuh');
        within(basicPlan).getByText('openvas');
        within(basicPlan).getByText('24/7 Support');

        // Verify Premium Plan details
        within(premiumPlan).getByText('$95.98'); // Tools total (19.99 + 25.99 + 50.00)
        within(premiumPlan).getByText('Netswitch Threat Intel');
        within(premiumPlan).getByText('Priority Support');

        // Select Premium Plan
        await user.click(premiumPlan);

        // Verify selection and pricing
        await waitFor(() => {
            expect(premiumPlan).toHaveClass('selected');
            expect(screen.getByText('$105.98')).toBeInTheDocument(); // Total with platform fee
        });
    });

    test('Error handling and recovery', async () => {
        // Mock API failure then success
        instance.get
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ data: mockPlansResponse });

        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });

        // Click retry
        const retryButton = screen.getByText('Try Again');
        await user.click(retryButton);

        // Wait for successful load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });
    });

    test('Form validation prevents invalid submissions', async () => {
        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Try to continue without selecting a plan
        const continueButton = screen.getByText('Continue');
        expect(continueButton).toBeDisabled();

        // Select a plan
        const basicPlan = screen.getByText('Basic Plan').closest('.plan-card');
        await user.click(basicPlan);

        // Verify continue button is now enabled
        await waitFor(() => {
            expect(continueButton).not.toBeDisabled();
        });
    });

    test('Responsive behavior and mobile interactions', async () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Verify mobile-friendly interactions work
        const basicPlan = screen.getByText('Basic Plan').closest('.plan-card');
        await user.click(basicPlan);

        await waitFor(() => {
            expect(basicPlan).toHaveClass('selected');
        });
    });

    test('Accessibility compliance', async () => {
        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Test keyboard navigation
        const basicPlan = screen.getByRole('button', { name: /Select Basic Plan plan/i });

        // Focus and activate with keyboard
        basicPlan.focus();
        await user.keyboard('{Enter}');

        await waitFor(() => {
            expect(basicPlan).toHaveClass('selected');
        });

        // Test ARIA attributes
        const monthlyButton = screen.getByText('Monthly');
        expect(monthlyButton).toHaveAttribute('aria-pressed');
        expect(monthlyButton).toHaveAttribute('aria-label');
    });

    test('Data persistence across navigation', async () => {
        render(
            <Provider store={store}>
                <Wizard />
            </Provider>
        );

        // Navigate to plan selection
        await user.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Select a plan
        const basicPlan = screen.getByText('Basic Plan').closest('.plan-card');
        await user.click(basicPlan);

        await waitFor(() => {
            expect(basicPlan).toHaveClass('selected');
        });

        // Navigate back to step 1
        const backButton = screen.getByText('Back');
        await user.click(backButton);

        // Navigate forward again
        await user.click(screen.getByText('Next'));

        // Verify plan selection is maintained
        await waitFor(() => {
            const basicPlanAgain = screen.getByText('Basic Plan').closest('.plan-card');
            expect(basicPlanAgain).toHaveClass('selected');
        });
    });
});