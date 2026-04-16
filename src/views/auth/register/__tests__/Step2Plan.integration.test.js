import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Step2Plan from '../Step2Plan';
import { registerSlice } from '../store';

// Mock components that might cause issues in tests
jest.mock('@src/@core/components/toast/notification', () => jest.fn());

// Mock API
jest.mock('@src/utility/AxiosConfig', () => ({
    get: jest.fn()
}));

import instance from '@src/utility/AxiosConfig';

const mockPlans = [
    {
        _id: 'plan_1',
        name: 'Basic Plan',
        description: 'Perfect for small businesses',
        tools: [
            { _id: 'tool_1', name: 'wazuh', price: 9.99 },
            { _id: 'tool_2', name: 'openvas', price: 15.99 }
        ],
        platform_price: 5,
        features: ['Feature 1', 'Feature 2'],
        status: 1,
        displayOrder: 1,
        duration: 1,
        duration_type: 'MONTHLY',
        trial: false,
        is_lifetime: false
    },
    {
        _id: 'plan_2',
        name: 'Premium Plan',
        description: 'Advanced features for growing businesses',
        tools: [
            { _id: 'tool_3', name: 'threat intel', price: 25.99 }
        ],
        platform_price: 10,
        features: ['Premium Feature 1', 'Premium Feature 2'],
        status: 1,
        displayOrder: 2,
        duration: 1,
        duration_type: 'MONTHLY',
        trial: true,
        is_lifetime: false
    }
];

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

describe('Step2Plan Integration Tests', () => {
    const mockNextStep = jest.fn();
    const mockPrevStep = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        instance.get.mockResolvedValue({ data: mockPlans });
    });

    test('complete plan selection flow', async () => {
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Verify plans are displayed
        expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        expect(screen.getByText('Premium Plan')).toBeInTheDocument();

        // Select a plan
        const basicPlanCard = screen.getByText('Basic Plan').closest('.plan-card');
        fireEvent.click(basicPlanCard);

        // Verify plan is selected and pricing summary appears
        await waitFor(() => {
            expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
        });

        // Verify pricing calculations
        expect(screen.getByText('$25.98')).toBeInTheDocument(); // Tools total
        expect(screen.getByText('$5.00')).toBeInTheDocument(); // Platform fee
        expect(screen.getByText('$30.98')).toBeInTheDocument(); // Total

        // Submit form
        const continueButton = screen.getByText('Continue');
        expect(continueButton).not.toBeDisabled();

        fireEvent.click(continueButton);

        // Verify next step is called
        expect(mockNextStep).toHaveBeenCalled();
    });

    test('billing cycle switching updates plans', async () => {
        const monthlyPlans = mockPlans;
        const yearlyPlans = mockPlans.map(plan => ({
            ...plan,
            duration_type: 'YEARLY'
        }));

        instance.get
            .mockResolvedValueOnce({ data: monthlyPlans })
            .mockResolvedValueOnce({ data: yearlyPlans });

        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for initial monthly plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Switch to yearly billing
        const yearlyButton = screen.getByText('Yearly');
        fireEvent.click(yearlyButton);

        // Verify API is called with yearly parameter
        await waitFor(() => {
            expect(instance.get).toHaveBeenCalledWith('/admin/plan/list?duration_type=YEARLY');
        });
    });

    test('error handling and retry functionality', async () => {
        const store = createMockStore();

        // Mock API to fail first, then succeed
        instance.get
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ data: mockPlans });

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });

        // Click retry button
        const retryButton = screen.getByText('Try Again');
        fireEvent.click(retryButton);

        // Wait for successful load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });
    });

    test('form validation prevents submission without plan selection', async () => {
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Try to submit without selecting a plan
        const continueButton = screen.getByText('Continue');
        expect(continueButton).toBeDisabled();

        // Verify next step is not called
        expect(mockNextStep).not.toHaveBeenCalled();
    });

    test('back button functionality', async () => {
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Click back button
        const backButton = screen.getByText('Back');
        fireEvent.click(backButton);

        // Verify previous step is called
        expect(mockPrevStep).toHaveBeenCalled();
    });

    test('loading state displays skeleton loaders', async () => {
        const store = createMockStore({ plansLoading: true });

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Verify loading message and skeleton loaders
        expect(screen.getByText('Loading available plans...')).toBeInTheDocument();
        expect(document.querySelectorAll('.plan-card.skeleton')).toHaveLength(3);
    });

    test('no plans available state', async () => {
        instance.get.mockResolvedValue({ data: [] });
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for no plans message
        await waitFor(() => {
            expect(screen.getByText(/No plans available for monthly billing/)).toBeInTheDocument();
        });

        expect(screen.getByText('Please try switching to a different billing cycle.')).toBeInTheDocument();
    });

    test('plan selection persists across billing cycle changes', async () => {
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Select a plan
        const basicPlanCard = screen.getByText('Basic Plan').closest('.plan-card');
        fireEvent.click(basicPlanCard);

        // Verify plan is selected
        await waitFor(() => {
            expect(basicPlanCard).toHaveClass('selected');
        });

        // Switch billing cycle
        const yearlyButton = screen.getByText('Yearly');
        fireEvent.click(yearlyButton);

        // Verify selection is maintained (if same plan exists in yearly)
        const state = store.getState().register;
        expect(state.planSelection.selectedPlan).toBeTruthy();
    });

    test('responsive behavior on mobile', async () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Verify mobile-specific behavior
        const filterButtons = document.querySelector('.billing-cycle-filter .filter-buttons');
        expect(filterButtons).toBeInTheDocument();
    });

    test('accessibility features work correctly', async () => {
        const store = createMockStore();

        renderWithProvider(
            <Step2Plan nextStep={mockNextStep} prevStep={mockPrevStep} />,
            store
        );

        // Wait for plans to load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Test keyboard navigation
        const basicPlanCard = screen.getByRole('button', { name: /Select Basic Plan plan/i });

        // Test Enter key
        fireEvent.keyDown(basicPlanCard, { key: 'Enter' });

        await waitFor(() => {
            expect(basicPlanCard).toHaveClass('selected');
        });

        // Test ARIA attributes
        const monthlyButton = screen.getByText('Monthly');
        expect(monthlyButton).toHaveAttribute('aria-pressed');
        expect(monthlyButton).toHaveAttribute('aria-label');
    });
});