import * as Yup from 'yup';

// Plan selection validation schema
export const planSelectionSchema = Yup.object({
  selectedPlanId: Yup.string()
    .required('Please select a plan to continue')
    .test(
      'plan-exists',
      'Selected plan is no longer available',
      function (value) {
        const { plans } = this.options.context || {};
        if (!plans || !value) return false;
        return plans.some((plan) => plan._id === value);
      },
    ),
});

// Validate plan data structure
export const validatePlanData = (plan) => {
  const errors = [];

  if (!plan) {
    errors.push('Plan data is missing');
    return errors;
  }

  if (!plan._id) {
    errors.push('Plan ID is missing');
  }

  if (!plan.name || typeof plan.name !== 'string') {
    errors.push('Plan name is invalid');
  }

  if (!Array.isArray(plan.tools)) {
    errors.push('Plan tools data is invalid');
  } else {
    plan.tools.forEach((tool, index) => {
      if (!tool._id) {
        errors.push(`Tool ${index + 1} is missing ID`);
      }
      if (!tool.name) {
        errors.push(`Tool ${index + 1} is missing name`);
      }
      if (typeof tool.price !== 'number' || tool.price < 0) {
        errors.push(`Tool ${index + 1} has invalid price`);
      }
    });
  }

  if (typeof plan.platform_price !== 'number' || plan.platform_price < 0) {
    errors.push('Platform price is invalid');
  }

  if (!['MONTHLY', 'YEARLY', 'WEEKLY'].includes(plan.duration_type)) {
    console.log("🚀 ~ validatePlanData ~ plan.duration_type:", plan.duration_type)
    errors.push('Plan duration type is invalid');
  }

  // if (plan.duration < '0') {
  //   errors.push('Plan duration is invalid');
  // }

  // Check soft_delete field instead of status (based on API response structure)
  if (typeof plan.soft_delete !== 'boolean') {
    errors.push('Plan soft_delete status is invalid');
  }

  // console.log('plan soft_delete:', plan.soft_delete);
  // console.log('plan object:', plan);

  return errors;
};

// Validate plans array
export const validatePlansArray = (plans) => {
  const errors = [];

  if (!Array.isArray(plans)) {
    errors.push('Plans data must be an array');
    return errors;
  }

  if (plans.length === 0) {
    errors.push('No plans available');
    return errors;
  }

  plans.forEach((plan, index) => {
    const planErrors = validatePlanData(plan);
    if (planErrors.length > 0) {
      errors.push(`Plan ${index + 1}: ${planErrors.join(', ')}`);
    }
  });

  return errors;
};

// Calculate total price with validation
export const calculateTotalPrice = (plan) => {
  try {
    if (!plan) {
      throw new Error('Plan is required for price calculation');
    }

    const planErrors = validatePlanData(plan);
    if (planErrors.length > 0) {
      throw new Error(`Invalid plan data: ${planErrors.join(', ')}`);
    }

    const toolsTotal = plan.tools.reduce((sum, tool) => {
      if (typeof tool.price !== 'number') {
        throw new Error(`Invalid tool price for ${tool.name}`);
      }
      return sum + tool.price;
    }, 0);

    const platformFee = plan.platform_price || 0;
    const totalPrice = toolsTotal + platformFee;

    if (totalPrice < 0) {
      throw new Error('Total price cannot be negative');
    }

    return {
      toolsTotal,
      platformFee,
      totalPrice,
      isValid: true,
      error: null,
    };
  } catch (error) {
    return {
      toolsTotal: 0,
      platformFee: 0,
      totalPrice: 0,
      isValid: false,
      error: error.message,
    };
  }
};

// Validate billing cycle
export const validateBillingCycle = (cycle) => {
  const validCycles = ['MONTHLY', 'YEARLY'];
  return validCycles.includes(cycle);
};

// Network error handling
export const handleNetworkError = (error) => {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Network connectivity issues
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network and try again.';
  }

  // API response errors
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    switch (status) {
      case 400:
        return `Invalid request: ${message}`;
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to view plans.';
      case 404:
        return 'Plans not found. Please contact support.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Error ${status}: ${message}`;
    }
  }

  // Network timeout or connection errors
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }

  if (
    error.code === 'NETWORK_ERROR' ||
    error.message.includes('Network Error')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Generic error fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};

// Retry configuration
export const getRetryConfig = (attemptNumber = 0) => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds

  if (attemptNumber >= maxRetries) {
    return null; // No more retries
  }

  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);

  return {
    shouldRetry: true,
    delay,
    attemptNumber: attemptNumber + 1,
    maxRetries,
  };
};
