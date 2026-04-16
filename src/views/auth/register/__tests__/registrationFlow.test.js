import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import Wizard from '../Wizard';
import { registerSlice } from '../store';

// Mock external dependencies
jest.mock('@src/@core/components/toast/notification', () => jest.fn());
jest.mock('@src/utility/AxiosConfig', () => ({
    get: jest.fn(),
    post: jest.fn()
}));

const mockPlans = [
    {
        _id: 'plan_1',
        name: 'Basic Plan',
        tools: [{ _id: 'tool_1', name: 'wazuh', price: 9.99 }],
        platform_price: 5,
        features: ['Feature 1'],
        status: 1,
        displayOrder: 1,
        duration: 1,
        duration_type: 'MONTHLY'
    }
];

import instance from '@src/utility/AxiosConfig';

const createTestStore = () => {
    return configureStore({
        reducer: {
            register: registerSlice.reducer
        }
    });
};

const renderWithProviders = (component) => {
    const store = createTestStore();
    return render(
        <Provider store={store}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </Provider>
    );
};

describe('Registration Flow Integration', () => {
    beforeEach(() => {
        instance.get.mockResolvedValue({ data: mockPlans });
        instance.post.mockResolvedValue({
            data: {
                statusCode: 200,
                data: {
                    token: { accessToken: 'test-token' },
                    ability: []
                }
            }
        });
    });

    test('Complete registration flow from company details to plan selection', async () => {
        renderWithProviders(<Wizard />);

        // Step 1: Fill company details
        expect(screen.getByText('Company Details')).toBeInTheDocument();

        // Fill required fields
        fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@test.com' } });
        fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Test Company' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

        // Click Next to go to plan selection
        fireEvent.click(screen.getByText('Next'));

        // Step 2: Plan selection should load
        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Plans should load
        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        // Select a plan
        const planCard = screen.getByText('Basic Plan').closest('.plan-card');
        fireEvent.click(planCard);

        // Continue to payment/completion
        await waitFor(() => {
            const continueButton = screen.getByText('Continue');
            expect(continueButton).not.toBeDisabled();
            fireEvent.click(continueButton);
        });

        // Step 3: Registration completion
        await waitFor(() => {
            expect(screen.getByText('Complete Registration')).toBeInTheDocument();
        });

        // Should show selected plan summary
        expect(screen.getByText('Selected Plan: Basic Plan')).toBeInTheDocument();
        expect(screen.getByText('$14.99')).toBeInTheDocument(); // Total price

        // Complete registration
        const completeButton = screen.getByText('Complete Registration');
        fireEvent.click(completeButton);

        // Should call the registration API
        await waitFor(() => {
            expect(instance.post).toHaveBeenCalled();
        });
    });

    test('Navigation between steps works correctly', async () => {
        renderWithProviders(<Wizard />);

        // Start at step 1
        expect(screen.getByText('Company Details')).toBeInTheDocument();

        // Fill form and go to step 2
        fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@test.com' } });
        fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Test Company' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Next'));

        await waitFor(() => {
            expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
        });

        // Go back to step 1
        fireEvent.click(screen.getByText('Back'));

        await waitFor(() => {
            expect(screen.getByText('Company Details')).toBeInTheDocument();
        });

        // Form data should be preserved
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    });
});