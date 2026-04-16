import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PricingSummary from '../PricingSummary';
import { registerSlice } from '../../store';

const mockPlan = {
    _id: 'plan_1',
    name: 'Premium Plan',
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
    duration: 1,
    duration_type: 'MONTHLY',
    trial: true,
    recurring: true,
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

describe('PricingSummary', () => {
    test('renders nothing when no plan is selected', () => {
        const store = createMockStore();
        const { container } = renderWithProvider(<PricingSummary />, store);

        expect(container.firstChild).toBeNull();
    });

    test('renders pricing summary when plan is selected', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
        expect(screen.getByText('Premium Plan')).toBeInTheDocument();
        expect(screen.getByText('per month')).toBeInTheDocument();
    });

    test('displays individual tool prices correctly', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('wazuh')).toBeInTheDocument();
        expect(screen.getByText('$9.99')).toBeInTheDocument();
        expect(screen.getByText('openvas')).toBeInTheDocument();
        expect(screen.getByText('$15.99')).toBeInTheDocument();
    });

    test('displays tools subtotal correctly', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Tools Subtotal')).toBeInTheDocument();
        expect(screen.getByText('$25.98')).toBeInTheDocument();
    });

    test('displays platform fee when present', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Platform Fee')).toBeInTheDocument();
        expect(screen.getByText('$5.00')).toBeInTheDocument();
    });

    test('displays total price correctly', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('$30.98')).toBeInTheDocument();
    });

    test('shows trial information when plan has trial', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('✓ Free trial available')).toBeInTheDocument();
    });

    test('shows recurring information when plan is recurring', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: mockPlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('This is a recurring subscription')).toBeInTheDocument();
    });

    test('shows lifetime information when plan is lifetime', () => {
        const lifetimePlan = { ...mockPlan, is_lifetime: true };
        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: lifetimePlan,
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('✓ One-time payment for lifetime access')).toBeInTheDocument();
    });

    test('shows yearly billing information', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'YEARLY',
                selectedPlan: { ...mockPlan, duration_type: 'YEARLY' },
                totalPrice: 30.98,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Billed annually • Cancel anytime')).toBeInTheDocument();
    });

    test('handles free tools correctly', () => {
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

        const store = createMockStore({
            planSelection: {
                billingCycle: 'MONTHLY',
                selectedPlan: planWithFreeTool,
                totalPrice: 5,
                platformFee: 5,
            }
        });

        renderWithProvider(<PricingSummary />, store);

        expect(screen.getByText('Free Tool')).toBeInTheDocument();
        expect(screen.getByText('Included')).toBeInTheDocument();
    });
});