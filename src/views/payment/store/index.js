// ** Redux Imports
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ** Axios Imports
import instance from '@src/utility/AxiosConfig';

// ** Api endpoints
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints';

// ** Constant
import { initPayment } from '@constant/reduxConstant';

// ---------------------- API CALL ----------------------
async function getPaymentRequest(params) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.payments.list}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('getPaymentRequest error', error);
    return { statusCode: 500, data: [], message: error.message || 'API Error' };
  }
}
async function getComapnyPaymentRequest(params) {
  try {
    const response = await instance.get(`${API_ENDPOINTS.payments.get}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('getPaymentRequest error', error);
    return { statusCode: 500, data: [], message: error.message || 'API Error' };
  }
}

// ---------------------- THUNKS ----------------------
export const getPaymentDetail = createAsyncThunk(
  'appPayment/getPaymentDetail',
  async (paymentId) => {
    try {
      const response = await instance.get(`${API_ENDPOINTS.payments.detail}/${paymentId}`);
      if (response.data?.statusCode === 200 && response.data?.data) {
        return { paymentDetail: response.data.data, error: '' };
      }
      return { paymentDetail: null, error: response.data?.message || 'Failed to fetch payment detail' };
    } catch (error) {
      return { paymentDetail: null, error: error.message || 'API Error' };
    }
  }
);

export const getPaymentList = createAsyncThunk(
  'appPayment/getPaymentList',
  async (params) => {
    const response = await getPaymentRequest(params);

    if (response?.statusCode === 200 && Array.isArray(response.data)) {
      return {
        params,
        paymentItems: response.data,
        pagination: response._metadata?.pagination || null,
        actionFlag: 'PAYM_LST_SCS',
        success: '',
        error: '',
      };
    } else {
      return {
        params,
        paymentItems: [],
        pagination: null,
        actionFlag: 'PAYM_LST_ERR',
        success: '',
        error: response?.message || 'Failed to fetch Payment list',
      };
    }
  },
);

// ---------------------- THUNK ----------------------
export const getCompanyPaymentList = createAsyncThunk(
  'appPayment/getCompanyPaymentList', // unique name
  async ({ page, perPage ,search, orderBy, orderDirection }) => {
    // Call the API with parameters
    const response = await getComapnyPaymentRequest({
      page,
      perPage,
      search,
      orderBy,
      orderDirection,
    });

    if (response?.statusCode === 200 && Array.isArray(response.data)) {
      return {
        paymentItems: response.data,
        pagination: response._metadata?.pagination || null,
        actionFlag: 'PAYM_LST_SCS',
        success: '',
        error: '',
      };
    } else {
      return {
        paymentItems: [],
        pagination: null,
        actionFlag: 'PAYM_LST_ERR',
        success: '',
        error: response?.message || 'Failed to fetch Company Payment list',
      };
    }
  }
);


// ---------------------- SLICE ----------------------
export const appPaymentSlice = createSlice({
  name: 'appPayment',
  initialState: {
    paymentItems: [],
    pagination: null,
    paymentItem: initPayment,
    toolItems: [],
    actionFlag: '',
    loading: false,
    success: '',
    error: '',
  },
  reducers: {
    cleanPaymentMessage: (state) => {
      state.actionFlag = '';
      state.success = '';
      state.error = '';
    },
    cleanPaymentState: (state) => {
      state.paymentItem = initPayment;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Payment list
      .addCase(getPaymentList.pending, (state) => {
        state.loading = true;
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      })
      .addCase(getPaymentList.fulfilled, (state, action) => {
        state.paymentItems = action.payload.paymentItems; // 🟢 Fixed key name
        state.pagination = action.payload.pagination;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getPaymentList.rejected, (state, action) => {
        state.loading = false;
        state.paymentItems = [];
        state.pagination = null;
        state.actionFlag = 'PAYM_LST_ERR'; // 🟢 Fixed wrong constant
        state.success = '';
        state.error = action.error?.message || 'Something went wrong';
      })
      // Get Company Payment list
      .addCase(getCompanyPaymentList.pending, (state) => {
        state.loading = true;
        state.actionFlag = '';
        state.success = '';
        state.error = '';
      })
      .addCase(getCompanyPaymentList.fulfilled, (state, action) => {
        state.paymentItems = action.payload.paymentItems || [];
        state.pagination = action.payload.pagination || null;
        state.loading = false;
        state.actionFlag = action.payload.actionFlag || 'PAYM_LST_SCS';
        state.success = action.payload.success || '';
        state.error = action.payload.error || '';
      })
      .addCase(getCompanyPaymentList.rejected, (state, action) => {
        state.loading = false;
        state.paymentItems = [];
        state.pagination = null;
        state.actionFlag = 'PAYM_LST_ERR';
        state.success = '';
        state.error = action.error?.message || 'Something went wrong';
      });


  },
});

// ---------------------- EXPORTS ----------------------
export const { cleanPaymentMessage, cleanPaymentState } =
  appPaymentSlice.actions;
export default appPaymentSlice.reducer;
