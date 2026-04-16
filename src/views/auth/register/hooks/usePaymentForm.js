import { useState, useCallback, useEffect } from 'react';
import { validatePaymentForm, defaultPaymentValues } from '../utils/paymentValidation';

/**
 * Custom hook for managing payment form state and validation
 * @param {Object} options - Configuration options
 * @param {Function} options.onSubmit - Callback for form submission
 * @param {Object} options.initialValues - Initial form values
 * @param {boolean} options.validateOnChange - Whether to validate on every change
 * @returns {Object} Form state and handlers
 */
export const usePaymentForm = ({
    onSubmit,
    initialValues = {},
    validateOnChange = true
} = {}) => {
    const [formData, setFormData] = useState({
        ...defaultPaymentValues,
        ...initialValues
    });

    const [errors, setErrors] = useState({});
    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [touched, setTouched] = useState({});

    // Update form field value
    const updateField = useCallback((fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));

        // Mark field as touched
        setTouched(prev => ({
            ...prev,
            [fieldName]: true
        }));
    }, []);

    // Mark field as touched (for blur events)
    const touchField = useCallback((fieldName) => {
        setTouched(prev => ({
            ...prev,
            [fieldName]: true
        }));
    }, []);

    // Validate form
    const validateForm = useCallback(async () => {
        setIsValidating(true);

        try {
            const result = await validatePaymentForm(formData);
            setErrors(result.errors);
            setIsValid(result.isValid);
            return result;
        } catch (error) {
            console.error('Form validation error:', error);
            setErrors({});
            setIsValid(false);
            return { isValid: false, errors: {} };
        } finally {
            setIsValidating(false);
        }
    }, [formData]);

    // Handle form submission
    const handleSubmit = useCallback(async (event) => {
        if (event) {
            event.preventDefault();
        }

        // Mark all fields as touched
        const allFieldsTouched = Object.keys(defaultPaymentValues).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {});
        setTouched(allFieldsTouched);

        const validationResult = await validateForm();

        if (validationResult.isValid && onSubmit) {
            onSubmit(formData);
        }

        return validationResult;
    }, [formData, onSubmit, validateForm]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData({
            ...defaultPaymentValues,
            ...initialValues
        });
        setErrors({});
        setTouched({});
        setIsValid(false);
    }, [initialValues]);

    // Clear specific field error
    const clearFieldError = useCallback((fieldName) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
    }, []);

    // Validate on form data change (if enabled)
    useEffect(() => {
        if (validateOnChange && Object.keys(touched).length > 0) {
            const timeoutId = setTimeout(() => {
                validateForm();
            }, 300); // Debounce validation

            return () => clearTimeout(timeoutId);
        }
    }, [formData, validateOnChange, touched, validateForm]);

    // Check if field has error and is touched
    const getFieldError = useCallback((fieldName) => {
        return touched[fieldName] && errors[fieldName] ? errors[fieldName] : null;
    }, [touched, errors]);

    // Check if field is valid
    const isFieldValid = useCallback((fieldName) => {
        return touched[fieldName] && !errors[fieldName];
    }, [touched, errors]);

    return {
        // Form state
        formData,
        errors,
        isValid,
        isValidating,
        touched,

        // Form handlers
        updateField,
        touchField,
        handleSubmit,
        validateForm,
        resetForm,
        clearFieldError,

        // Field helpers
        getFieldError,
        isFieldValid,

        // Computed values
        hasErrors: Object.keys(errors).length > 0,
        isDirty: JSON.stringify(formData) !== JSON.stringify({ ...defaultPaymentValues, ...initialValues })
    };
};

export default usePaymentForm;