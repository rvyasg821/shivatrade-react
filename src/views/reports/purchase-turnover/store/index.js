// Purchase Turnover (VPO) report store (PURCHASE_TURNOVER_VPO_REPORT_PLAN.md).
// Read-only — one thunk that hits GET /admin/reports/purchase-turnover.
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

export const getPurchaseTurnover = createAsyncThunk(
  "reports/getPurchaseTurnover",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.purchaseTurnover, {
        params,
      });
      return unwrap(resp, "Failed to load purchase turnover report");
    } catch (error) {
      return rejectWithValue(
        errText(error, "Failed to load purchase turnover report")
      );
    }
  }
);

const emptyTotals = {
  pov_count: 0,
  taxable_inr: 0,
  gst_inr: 0,
  order_value_inr: 0,
  paid_inr: 0,
  outstanding_inr: 0,
};

export const purchaseTurnoverSlice = createSlice({
  name: "purchaseTurnover",
  initialState: {
    rows: [],
    totals: emptyTotals,
    period_label: "",
    group_by: "month",
    pagination: { total: 0, perPage: 25, orderBy: "month" },
    loading: false,
    error: "",
  },
  reducers: {
    cleanPurchaseTurnoverMessage: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPurchaseTurnover.pending, (state) => {
        state.loading = true;
      })
      .addCase(getPurchaseTurnover.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload?.rows || [];
        state.totals = action.payload?.totals || emptyTotals;
        state.period_label = action.payload?.period_label || "";
        state.group_by = action.payload?.group_by || "month";
        state.pagination = action.payload?.pagination || state.pagination;
        state.error = "";
      })
      .addCase(getPurchaseTurnover.rejected, (state, action) => {
        state.loading = false;
        state.rows = [];
        state.totals = emptyTotals;
        state.error = action.payload || "";
      });
  },
});

export const { cleanPurchaseTurnoverMessage } = purchaseTurnoverSlice.actions;
export default purchaseTurnoverSlice.reducer;
