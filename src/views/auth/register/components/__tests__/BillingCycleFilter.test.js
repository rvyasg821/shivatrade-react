import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BillingCycleFilter from '../BillingCycleFilter';
import { registerSlice } from '../../store';

// Mock store setup
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

describe('BillingCycleFilter', () => {
    test('renders monthly and yearly buttons', () => {
        const store = createMockStore();
        renderWithProvider(<BillingCycleFilter />, store);

        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Yearly')).toBeInTheDocument();
        expect(screen.getByText('Save 17%')).toBeInTheDocument();
    });

    test('shows monthly as active by default', () => {
        const store = createMockStore();
        renderWithProvider(<BillingCycleFilter />, store);

        const monthlyButton = screen.getByText('Monthly');
        const yearlyButton = screen.getByText('Yearly');

        expect(monthlyButton).toHaveClass('active');
        expect(yearlyButton).not.toHaveClass('active');
    });

    test('shows yearly as active when selected', () => {
        const store = createMockStore({
            planSelection: {
                billingCycle: 'YEARLY',
                selectedPlan: null,
                totalPrice: 0,
                platformFee: 0,
            }
        });
        renderWithProvider(<BillingCycleFilter />, store);

        const monthlyButton = screen.getByText('Monthly');
        const yearlyButton = screen.getByText('Yearly');

        expect(monthlyButton).not.toHaveClass('active');
        expect(yearlyButton).toHaveClass('active');
    });

    test('dispatches setBillingCycle and fetchPlans when clicked', () => {
        const store = createMockStore();
        const dispatchSpy = jest.spyOn(store, 'dispatch');

        renderWithProvider(<BillingCycleFilter />, store);

        const yearlyButton = screen.getByText('Yearly');
        fireEvent.click(yearlyButton);

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/setBillingCycle',
                payload: 'YEARLY'
            })
        );

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'register/fetchPlans/pending'
            })
        );
    });

    test('disables buttons when loading', () => {
        const store = createMockStore({
            plansLoading: true
        });
        renderWithProvider(<BillingCycleFilter />, store);

        const monthlyButton = screen.getByText('Monthly');
        const yearlyButton = screen.getByText('Yearly');

        expect(monthlyButton).toBeDisabled();
        expect(yearlyButton).toBeDisabled();
    });

    test('has proper accessibility attributes', () => {
        const store = createMockStore();
        renderWithProvider(<BillingCycleFilter />, store);

        const monthlyButton = screen.getByText('Monthly');
        const yearlyButton = screen.getByText('Yearly');

        expect(monthlyButton).toHaveAttribute('aria-label', 'Select monthly billing');
        expect(monthlyButton).toHaveAttribute('aria-pressed', 'true');
        expect(yearlyButton).toHaveAttribute('aria-label', 'Select yearly billing');
        expect(yearlyButton).toHaveAttribute('aria-pressed', 'false');
    });
});