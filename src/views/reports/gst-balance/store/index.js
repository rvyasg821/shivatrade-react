// Input-Output GST Balance report store (INPUT_OUTPUT_GST_BALANCE_REPORT_PLAN.md).
// Read-only — one thunk that hits GET /admin/reports/gst-balance.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

const unwrap = (resp, fallback) => {
  const body = resp?.data;
  if (body?.statusCode && body?.data !== undefined) return body.data;
  throw new Error(body?.message || fallback);
};
const errText = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const getGstBalance = createAsyncThunk(
  "reports/getGstBalance",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.gstBalance, {
        params,
      });
      return unwrap(resp, "Failed to load GST balance report");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load GST balance report"));
    }
  }
);

const emptyTotals = {
  output_igst_inr: 0,
  input_igst_inr: 0,
  input_cgst_inr: 0,
  input_sgst_inr: 0,
  input_unclassified_inr: 0,
  input_total_inr: 0,
  net_itc_inr: 0,
};

export const gstBalanceSlice = createSlice({
  name: "gstBalance",
  initialState: {
    rows: [],
    totals: emptyTotals,
    period_label: "",
    unclassified_pov_count: 0,
    loading: false,
    error: "",
  },
  reducers: {
    cleanGstBalanceMessage: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getGstBalance.pending, (state) => {
        state.loading = true;
      })
      .addCase(getGstBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload?.rows || [];
        state.totals = action.payload?.totals || emptyTotals;
        state.period_label = action.payload?.period_label || "";
        state.unclassified_pov_count =
          action.payload?.unclassified_pov_count || 0;
        state.error = "";
      })
      .addCase(getGstBalance.rejected, (state, action) => {
        state.loading = false;
        state.rows = [];
        state.totals = emptyTotals;
        state.error = action.payload || "";
      });
  },
});

export const { cleanGstBalanceMessage } = gstBalanceSlice.actions;
export default gstBalanceSlice.reducer;
