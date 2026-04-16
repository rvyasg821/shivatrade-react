import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PlanCard from '../components/PlanCard';
import { registerSlice } from '../store';

const mockPlan = {
    _id: 'plan_1',
    name: 'Test Plan',
    tools: [
        { _id: 'tool_1', name: 'wazuh', price: 10.00 },
        { _id: 'tool_2', name: 'openvas', price: 15.00 },
        { _id: 'tool_3', name: 'threat intel', price: 20.00 }
    ],
    platform_price: 5,
    features: ['Feature 1'],
    status: 1,
    duration: 1,
    duration_type: 'MONTHLY'
};

const createTestStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            register: registerSlice.reducer
        },
        preloadedState: {
            register: {
                planSelection: {
                    selectedPlan: null,
                    selectedTools: [],
                    billingCycle: 'MONTHLY',
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

describe('Tool Selection Functionality', () => {
    test('shows all tools selected by default when plan is selected', () => {
        const store = createTestStore({
            planSelection: {
                selectedPlan: mockPlan,
                selectedTools: ['tool_1', 'tool_2', 'tool_3'],
                billingCycle: 'MONTHLY',
                totalPrice: 50, // 10 + 15 + 20 + 5
                platformFee: 5,
            }
        });

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // All tools should be checked
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(3);
        checkboxes.forEach(checkbox => {
            expect(checkbox).toBeChecked();
        });

        // Should show total price
        expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    test('allows toggling individual tools', () => {
        const store = createTestStore({
            planSelection: {
                selectedPlan: mockPlan,
                selectedTools: ['tool_1', 'tool_2', 'tool_3'],
                billingCycle: 'MONTHLY',
                totalPrice: 50,
                platformFee: 5,
            }
        });

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // Click on the first tool to deselect it
        const firstToolItem = screen.getByText('wazuh').closest('.tool-item');
        fireEvent.click(firstToolItem);

        // Check that the action was dispatched
        const state = store.getState().register.planSelection;
        expect(state.selectedTools).toEqual(['tool_2', 'tool_3']);
        expect(state.totalPrice).toBe(40); // 15 + 20 + 5 (removed 10)
    });

    test('recalculates price when tools are toggled', () => {
        const store = createTestStore({
            planSelection: {
                selectedPlan: mockPlan,
                selectedTools: ['tool_1', 'tool_2'], // Only first two tools selected
                billingCycle: 'MONTHLY',
                totalPrice: 30, // 10 + 15 + 5
                platformFee: 5,
            }
        });

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // Should show reduced price
        expect(screen.getByText('$30.00')).toBeInTheDocument();

        // Third tool should be unchecked
        const thirdToolItem = screen.getByText('threat intel').closest('.tool-item');
        expect(thirdToolItem).toHaveClass('unselected');
    });

    test('shows tool selection note when plan is selected', () => {
        const store = createTestStore({
            planSelection: {
                selectedPlan: mockPlan,
                selectedTools: ['tool_1', 'tool_2', 'tool_3'],
                billingCycle: 'MONTHLY',
                totalPrice: 50,
                platformFee: 5,
            }
        });

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        expect(screen.getByText('💡 Click on tools to add/remove them from your subscription')).toBeInTheDocument();
    });

    test('does not show checkboxes for unselected plans', () => {
        const store = createTestStore(); // No plan selected

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // Should not show checkboxes
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes).toHaveLength(0);

        // Should show full price
        expect(screen.getByText('$50.00')).toBeInTheDocument(); // Full price
    });

    test('prevents tool toggling when plan is not selected', () => {
        const store = createTestStore(); // No plan selected
        const dispatchSpy = jest.spyOn(store, 'dispatch');

        renderWithProvider(<PlanCard plan={mockPlan} />, store);

        // Click on a tool
        const firstToolItem = screen.getByText('wazuh').closest('.tool-item');
        fireEvent.click(firstToolItem);

        // Should not dispatch toggleTool action
        expect(dispatchSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/toggleTool'
            })
        );
    });
});