import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PlanCard from '../PlanCard';
import { registerSlice } from '../../store';

const mockPlan = {
    _id: 'plan_1',
    name: 'Premium Plan',
    description: 'Perfect for growing businesses',
    tools: [
        {
            _id: 'tool_1',
            name: 'wazuh',
            price: 9.99
        },
        {
            _id: 'tool_2',
            name: 'openvas',
            price: 15.99
        }
    ],
    platform_price: 5,
    features: ['Feature 1', 'Feature 2'],
    duration: 1,
    duration_type: 'MONTHLY',
    trial: false,
    is_lifetime: false
};

const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            register: registerSlice.reducer
        },
        preloadedState: {
            register: {
                planSelection: {
                    billingCycle: 'MONTHLY',
                    selectedPlan: null,
                    totalPrice: 0,
                    platformFee: 0,
                },
                plans: [],
                plansLoading: false,
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

describe('PlanCard', () => {
    test('renders plan information correctly', () => {
        const store = createMockStore();
        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        expect(screen.getByText('Premium Plan')).toBeInTheDocument();
        expect(screen.getByText('Perfect for growing businesses')).toBeInTheDocument();
        expect(screen.getByText('wazuh')).toBeInTheDocument();
        expect(screen.getByText('openvas')).toBeInTheDocument();
        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
    });

    test('calculates and displays pricing correctly', () => {
        const store = createMockStore();
        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // Tools total: 9.99 + 15.99 = 25.98
        expect(screen.getByText('$25.98')).toBeInTheDocument();

        // Platform fee
        expect(screen.getByText('+ $5.00 platform fee')).toBeInTheDocument();

        // Total: 25.98 + 5 = 30.98
        expect(screen.getByText('Total: $30.98')).toBeInTheDocument();
    });

    test('shows selected state when plan is selected', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });
        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        const planCard = screen.getByRole('button', { name: /Select Premium Plan plan/i });
        expect(planCard).toHaveClass('selected');
    });

    test('dispatches selectPlan when clicked', () => {
        const store = createMockStore();
        const dispatchSpy = jest.spyOn(store, 'dispatch');

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        const planCard = screen.getByRole('button', { name: /Select Premium Plan plan/i });
        fireEvent.click(planCard);

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/selectPlan',
                payload: mockPlan
            })
        );
    });

    test('handles keyboard navigation', () => {
        const store = createMockStore();
        const dispatchSpy = jest.spyOn(store, 'dispatch');

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        const planCard = screen.getByRole('button', { name: /Select Premium Plan plan/i });

        // Test Enter key
        fireEvent.keyDown(planCard, { key: 'Enter' });
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/selectPlan',
                payload: mockPlan
            })
        );

        // Test Space key
        fireEvent.keyDown(planCard, { key: ' ' });
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/selectPlan',
                payload: mockPlan
            })
        );
    });

    test('displays trial badge when plan has trial', () => {
        const trialPlan = { ...mockPlan, trial: true };
        const store = createMockStore();

        renderWithProvider(<PlanCard plan={trialPlan} />, store);

        expect(screen.getByText('Free Trial Available')).toBeInTheDocument();
    });

    test('displays lifetime badge when plan is lifetime', () => {
        const lifetimePlan = { ...mockPlan, is_lifetime: true };
        const store = createMockStore();

        renderWithProvider(<PlanCard plan={lifetimePlan} />, store);

        expect(screen.getByText('Lifetime Access')).toBeInTheDocument();
    });

    test('shows correct billing period text', () => {
        const store = createMockStore();
        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        expect(screen.getByText('per month')).toBeInTheDocument();
    });

    test('shows yearly billing period text correctly', () => {
        const yearlyPlan = { ...mockPlan, duration_type: 'YEARLY' };
        const store = createMockStore({
            planSelection: {
                billingCycle: 'YEARLY',
                selectedPlan: null,
                totalPrice: 0,
                platformFee: 0,
            }
        });

        renderWithProvider(<PlanCard plan={yearlyPlan} />, store);

        expect(screen.getByText('per year')).toBeInTheDocument();
    });

    test('handles tools with zero price correctly', () => {
        const planWithFreeTool = {
            ...mockPlan,
            tools: [
                {
                    _id: 'tool_free',
                    name: 'Free Tool',
                    price: 0
                }
            ]
        };

        const store = createMockStore();
        renderWithProvider(<PlanCard plan={planWithFreeTool} />, store);

        expect(screen.getByText('Included')).toBeInTheDocument();
    });
});