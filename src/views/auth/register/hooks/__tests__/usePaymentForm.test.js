import { renderHook, act } from '@testing-library/react';
import { usePaymentForm } from '../usePaymentForm';

describe('usePaymentForm Hook', () => {
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        mockOnSubmit.mockClear();
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => usePaymentForm());

        expect(result.current.formData).toEqual({
            holder_name: '',
            card_number: '',
            expiry_month: '',
            expiry_year: '',
            card_cvv: ''
        });
        expect(result.current.errors).toEqual({});
        expect(result.current.isValid).toBe(false);
        expect(result.current.touched).toEqual({});
    });

    it('initializes with provided initial values', () => {
        const initialValues = {
            holder_name: 'John Doe',
            card_number: '4532 0151 1283 0366'
        };

        const { result } = renderHook(() =>
            usePaymentForm({ initialValues })
        );

        expect(result.current.formData.holder_name).toBe('John Doe');
        expect(result.current.formData.card_number).toBe('4532 0151 1283 0366');
        expect(result.current.formData.expiry_month).toBe('');
    });

    it('updates field values correctly', () => {
        const { result } = renderHook(() => usePaymentForm());

        act(() => {
            result.current.updateField('holder_name', 'Jane Smith');
        });

        expect(result.current.formData.holder_name).toBe('Jane Smith');
        expect(result.current.touched.holder_name).toBe(true);
    });

    it('marks fields as touched', () => {
        const { result } = renderHook(() => usePaymentForm());

        act(() => {
            result.current.touchField('card_number');
        });

        expect(result.current.touched.card_number).toBe(true);
    });

    it('validates form correctly', async () => {
        const { result } = renderHook(() => usePaymentForm());

        // Set invalid data
        act(() => {
            result.current.updateField('holder_name', '');
            result.current.updateField('card_number', '1234');
        });

        let validationResult;
        await act(async () => {
            validationResult = await result.current.validateForm();
        });

        expect(validationResult.isValid).toBe(false);
        expect(Object.keys(validationResult.errors).length).toBeGreaterThan(0);
        expect(result.current.isValid).toBe(false);
    });

    it('handles form submission with valid data', async () => {
        const { result } = renderHook(() =>
            usePaymentForm({ onSubmit: mockOnSubmit })
        );

        // Set valid data
        act(() => {
            result.current.updateField('holder_name', 'John Doe');
            result.current.updateField('card_number', '4532015112830366');
            result.current.updateField('expiry_month', '12');
            result.current.updateField('expiry_year', '2025');
            result.current.updateField('card_cvv', '123');
        });

        await act(async () => {
            await result.current.handleSubmit();
        });

        expect(mockOnSubmit).toHaveBeenCalledWith({
            holder_name: 'John Doe',
            card_number: '4532015112830366',
            expiry_month: '12',
            expiry_year: '2025',
            card_cvv: '123'
        });
    });

    it('does not submit with invalid data', async () => {
        const { result } = renderHook(() =>
            usePaymentForm({ onSubmit: mockOnSubmit })
        );

        // Set invalid data
        act(() => {
            result.current.updateField('holder_name', '');
            result.current.updateField('card_number', '1234');
        });

        await act(async () => {
            await result.current.handleSubmit();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('resets form correctly', () => {
        const initialValues = { holder_name: 'Initial Name' };
        const { result } = renderHook(() =>
            usePaymentForm({ initialValues })
        );

        // Update some fields
        act(() => {
            result.current.updateField('holder_name', 'Changed Name');
            result.current.updateField('card_number', '1234');
        });

        // Reset form
        act(() => {
            result.current.resetForm();
        });

        expect(result.current.formData.holder_name).toBe('Initial Name');
        expect(result.current.formData.card_number).toBe('');
        expect(result.current.errors).toEqual({});
        expect(result.current.touched).toEqual({});
    });

    it('clears field errors correctly', () => {
        const { result } = renderHook(() => usePaymentForm());

        // Set some errors manually (in real usage, these come from validation)
        act(() => {
            result.current.updateField('holder_name', '');
        });

        // Simulate validation that sets errors
        act(() => {
            result.current.validateForm();
        });

        // Clear specific field error
        act(() => {
            result.current.clearFieldError('holder_name');
        });

        expect(result.current.errors.holder_name).toBeUndefined();
    });

    it('provides field error helpers', () => {
        const { result } = renderHook(() => usePaymentForm());

        // Touch field and set error
        act(() => {
            result.current.touchField('holder_name');
        });

        // Manually set error for testing
        act(() => {
            result.current.updateField('holder_name', '');
        });

        expect(result.current.getFieldError('holder_name')).toBeTruthy();
        expect(result.current.isFieldValid('holder_name')).toBe(false);
    });

    it('tracks dirty state correctly', () => {
        const initialValues = { holder_name: 'Initial' };
        const { result } = renderHook(() =>
            usePaymentForm({ initialValues })
        );

        // Initially not dirty
        expect(result.current.isDirty).toBe(false);

        // Update field - should be dirty
        act(() => {
            result.current.updateField('holder_name', 'Changed');
        });

        expect(result.current.isDirty).toBe(true);

        // Reset to initial - should not be dirty
        act(() => {
            result.current.updateField('holder_name', 'Initial');
        });

        expect(result.current.isDirty).toBe(false);
    });

    it('handles validation on change when enabled', async () => {
        const { result } = renderHook(() =>
            usePaymentForm({ validateOnChange: true })
        );

        act(() => {
            result.current.updateField('holder_name', 'Test');
        });

        // Wait for debounced validation
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 350));
        });

        expect(result.current.isValidating).toBe(false);
    });

    it('does not validate on change when disabled', () => {
        const { result } = renderHook(() =>
            usePaymentForm({ validateOnChange: false })
        );

        act(() => {
            result.current.updateField('holder_name', 'Test');
        });

        // Should not trigger validation automatically
        expect(result.current.isValidating).toBe(false);
    });
});