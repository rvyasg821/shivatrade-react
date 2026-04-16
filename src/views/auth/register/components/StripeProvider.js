import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getStripeConfigRequest } from '../utils/stripePaymentApi';
import Notification from '@src/@core/components/toast/notification';

// ** Stripe instance will be loaded once and reused
let stripePromise = null;

const StripeProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadStripeConfig = async () => {
            try {
                // Only load if not already loaded
                if (!stripePromise) {
                    const response = await getStripeConfigRequest();

                    if (!response.success) {
                        throw new Error(response.error || 'Failed to load Stripe configuration');
                    }

                    const { publishableKey } = response.data?.data || response.data;

                    if (!publishableKey) {
                        throw new Error('Stripe publishable key not found in configuration');
                    }

                    // Initialize Stripe with publishable key
                    stripePromise = loadStripe(publishableKey);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading Stripe:', err);
                setError(err.message);
                setLoading(false);
                Notification("Error", err.message || "Failed to load Stripe", "warning");
            }
        };

        loadStripeConfig();
    }, []);

    if (loading) {
        return (
            <div className="stripe-loading-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading Stripe...</span>
                </div>
                <p className="mt-2 text-muted">Loading payment gateway...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="stripe-error-container" style={{ padding: '2rem' }}>
                <div className="alert alert-danger" role="alert">
                    <h5 className="alert-heading">Payment Gateway Error</h5>
                    <p>{error}</p>
                    <p className="mb-0">Please contact support if this issue persists.</p>
                </div>
            </div>
        );
    }

    // Options for Elements provider
    const options = {
        // Appearance customization
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#7367f0',
                colorBackground: '#ffffff',
                colorText: '#32325d',
                colorDanger: '#ea5455',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                spacingUnit: '4px',
                borderRadius: '4px',
            },
        },
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            {children}
        </Elements>
    );
};

export default StripeProvider;
