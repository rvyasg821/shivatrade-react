import { configureStore } from '@reduxjs/toolkit';
import { registerSlice, fetchPlans, setBillingCycle, selectPlan, clearPlanSelection } from '../store';

// Mock API response
const mockPlansResponse = [
    {
        _id: 'plan_1',
        name: 'Basic Plan',
        tools: [{ _id: 'tool_1', name: 'wazuh', price: 9.99 }],
        platform_price: 5,
        status: 1,
        displayOrder: 1,
        duration_type: 'MONTHLY'
    },
    {
        _id: 'plan_2',
        name: 'Premium Plan',
        tools: [{ _id: 'tool_2', name: 'openvas', price: 15.99 }],
        platform_price: 10,
        status: 1,
        displayOrder: 2,
        duration_type: 'MONTHLY'
    },
    {
        _id: 'plan_3',
        name: 'Inactive Plan',
        tools: [],
        platform_price: 0,
        status: 0,
        displayOrder: 3,
        duration_type: 'MONTHLY'
    }
];

// Mock axios instance
jest.mock('@src/utility/AxiosConfig', () => ({
    get: jest.fn()
}));

import instance from '@src/utility/AxiosConfig';

describe('register store', () => {
    let store;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                register: registerSlice.reducer
            }
        });
        jest.clearAllMocks();
    });

    describe('initial state', () => {
        test('has correct initial state', () => {
            const state = store.getState().register;

            expect(state.planSelection.selectedPlan).toBe(null);
            expect(state.planSelection.billingCycle).toBe('MONTHLY');
            expect(state.planSelection.totalPrice).toBe(0);
            expect(state.planSelection.platformFee).toBe(0);
            expect(state.plans).toEqual([]);
            expect(state.plansLoading).toBe(false);
        });
    });

    describe('setBillingCycle action', () => {
        test('updates billing cycle', () => {
            store.dispatch(setBillingCycle('YEARLY'));

            const state = store.getState().register;
            expect(state.planSelection.billingCycle).toBe('YEARLY');
        });
    });

    describe('selectPlan action', () => {
        test('selects plan and calculates pricing', () => {
            const plan = mockPlansResponse[0];
            store.dispatch(selectPlan(plan));

            const state = store.getState().register;
            expect(state.planSelection.selectedPlan).toEqual(plan);
            expect(state.planSelection.totalPrice).toBe(14.99); // 9.99 + 5
            expect(state.planSelection.platformFee).toBe(5);
        });

        test('handles plan with multiple tools', () => {
            const planWithMultipleTools = {
                ...mockPlansResponse[0],
                tools: [
                    { _id: 'tool_1', name: 'tool1', price: 10 },
                    { _id: 'tool_2', name: 'tool2', price: 15 }
                ],
                platform_price: 5
            };

            store.dispatch(selectPlan(planWithMultipleTools));

            const state = store.getState().register;
            expect(state.planSelection.totalPrice).toBe(30); // 10 + 15 + 5
        });
    });

    describe('clearPlanSelection action', () => {
        test('clears plan selection', () => {
            // First select a plan
            store.dispatch(selectPlan(mockPlansResponse[0]));

            // Then clear it
            store.dispatch(clearPlanSelection());

            const state = store.getState().register;
            expect(state.planSelection.selectedPlan).toBe(null);
            expect(state.planSelection.totalPrice).toBe(0);
            expect(state.planSelection.platformFee).toBe(0);
            expect(state.planSelection.billingCycle).toBe('MONTHLY'); // Should reset to default
        });
    });

    describe('fetchPlans async thunk', () => {
        test('handles successful plans fetch', async () => {
            instance.get.mockResolvedValueOnce({
                data: mockPlansResponse
            });

            await store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            expect(state.plans).toHaveLength(2); // Only active plans (status: 1)
            expect(state.plans[0].name).toBe('Basic Plan');
            expect(state.plans[1].name).toBe('Premium Plan');
            expect(state.plansLoading).toBe(false);
            expect(state.actionFlag).toBe('FETCH_PLANS_SCS');
        });

        test('filters inactive plans', async () => {
            instance.get.mockResolvedValueOnce({
                data: mockPlansResponse
            });

            await store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            const inactivePlan = state.plans.find(plan => plan.name === 'Inactive Plan');
            expect(inactivePlan).toBeUndefined();
        });

        test('sorts plans by displayOrder', async () => {
            const unsortedPlans = [
                { ...mockPlansResponse[1], displayOrder: 3 },
                { ...mockPlansResponse[0], displayOrder: 1 }
            ];

            instance.get.mockResolvedValueOnce({
                data: unsortedPlans
            });

            await store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            expect(state.plans[0].displayOrder).toBe(1);
            expect(state.plans[1].displayOrder).toBe(3);
        });

        test('handles API error', async () => {
            const errorMessage = 'Network error';
            instance.get.mockRejectedValueOnce(new Error(errorMessage));

            await store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            expect(state.plans).toEqual([]);
            expect(state.plansLoading).toBe(false);
            expect(state.actionFlag).toBe('FETCH_PLANS_ERR');
            expect(state.error).toContain(errorMessage);
        });

        test('handles empty response', async () => {
            instance.get.mockResolvedValueOnce({
                data: []
            });

            await store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            expect(state.plans).toEqual([]);
            expect(state.actionFlag).toBe('FETCH_PLANS_SCS');
        });

        test('sets loading state during fetch', () => {
            instance.get.mockImplementationOnce(() => new Promise(() => { })); // Never resolves

            store.dispatch(fetchPlans('MONTHLY'));

            const state = store.getState().register;
            expect(state.plansLoading).toBe(true);
        });

        test('calls API with correct URL for duration type', async () => {
            instance.get.mockResolvedValueOnce({ data: [] });

            await store.dispatch(fetchPlans('YEARLY'));

            expect(instance.get).toHaveBeenCalledWith('/admin/plan/list?duration_type=YEARLY');
        });

        test('calls API without duration type when not provided', async () => {
            instance.get.mockResolvedValueOnce({ data: [] });

            await store.dispatch(fetchPlans());

            expect(instance.get).toHaveBeenCalledWith('/admin/plan/list');
        });
    });
});