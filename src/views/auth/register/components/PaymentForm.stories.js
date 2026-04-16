// PaymentForm.stories.js - Storybook stories for PaymentForm component

import React from 'react';
import PaymentForm from './PaymentForm';
import './PaymentForm.scss';
import { useTranslation } from "react-i18next"

export default {
    title: 'Components/PaymentForm',
    component: PaymentForm,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'A comprehensive payment form component with validation, card type detection, and security features.'
            }
        }
    },
    argTypes: {
        loading: {
            control: 'boolean',
            description: 'Shows loading state when processing payment'
        },
        onSubmit: {
            action: 'submitted',
            description: 'Callback function called when form is submitted with valid data'
        },
        initialValues: {
            control: 'object',
            description: 'Initial values for form fields'
        }
    }
};

// Default story
export const Default = {
    args: {
        loading: false,
        onSubmit: (data) => console.log('Form submitted:', data)
    }
};

// Loading state story
export const Loading = {
    args: {
        loading: true,
        onSubmit: (data) => console.log('Form submitted:', data)
    }
};

// With initial values story
export const WithInitialValues = {

    args: {
        loading: false,
        initialValues: {
            holder_name: 'John Doe',
            card_number: '4532 0151 1283 0366',
            expiry_month: '12',
            expiry_year: '2025',
            card_cvv: '123'
        },
        onSubmit: (data) => console.log('Form submitted:', data)
    }
};

// Different card types demonstration
export const CardTypeExamples = () => {
    const { t } = useTranslation();

    const cardExamples = [
        { type: 'Visa', number: '4532 0151 1283 0366' },
        { type: 'Mastercard', number: '5555 5555 5555 4444' },
        { type: 'American Express', number: '3782 822463 10005' },
        { type: 'Discover', number: '6011 1111 1111 1117' }
    ];

    return (
        <div style={{ padding: '20px' }}>
            <h3>{t("Form Validation Examples")}</h3>
            <p>{t("Try entering these card numbers to see card type detection in action:")}</p>
            <ul>
                {cardExamples.map((card, index) => (
                    <li key={index}>
                        <strong>{card.type}:</strong> {card.number}
                    </li>
                ))}
            </ul>
            <div style={{ marginTop: '20px', maxWidth: '500px' }}>
                <PaymentForm
                    onSubmit={(data) => console.log('Form submitted:', data)}
                    loading={false}
                />
            </div>
        </div>
    );
};

// Validation examples
export const ValidationExamples = () => {
    const { t } = useTranslation();

    return (
        <div style={{ padding: '20px' }}>
            <h3>Form Validation Examples</h3>
            <p>{t("Try these scenarios to test validation:")}</p>
            <ul>
                <li>{t("Leave fields empty and try to submit")}</li>
                <li>{t("Enter invalid card number: 1234")}</li>
                <li>{t("Enter invalid expiry month: 13")}</li>
                <li>{t("Enter past expiry year: 2020")}</li>
                <li>{t("Enter non-numeric CVV: abc")}</li>
            </ul>
            <div style={{ marginTop: '20px', maxWidth: '500px' }}>
                <PaymentForm
                    onSubmit={(data) => console.log('Form submitted:', data)}
                    loading={false}
                />
            </div>
        </div>
    );
};

// Responsive design story
export const ResponsiveDesign = () => {
    const { t } = useTranslation();

    return (
        <div style={{ padding: '20px' }}>
            <h3>{t("Responsive Design")}</h3>
            <p>{t("Resize your browser window to see responsive behavior")}</p>
            <div style={{ maxWidth: '100%', border: '1px solid #ccc', padding: '20px' }}>
                <PaymentForm
                    onSubmit={(data) => console.log('Form submitted:', data)}
                    loading={false}
                />
            </div>
        </div>
    );
};