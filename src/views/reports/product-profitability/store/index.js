// Product-wise Profitability report store (PRODUCT_PROFITABILITY_REPORT_PLAN.md).
// Read-only — one thunk that hits GET /admin/reports/product-profitability.
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

export const getProductProfitability = createAsyncThunk(
  "reports/getProductProfitability",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(
        API_ENDPOINTS.reports.productProfitability,
        { params }
      );
      return unwrap(resp, "Failed to load profitability report");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load profitability report"));
    }
  }
);

const emptyTotals = {
  qty_sold: 0,
  revenue_inr: 0,
  cost_inr: 0,
  profit_inr: 0,
  margin_pct: 0,
};

export const productProfitabilitySlice = createSlice({
  name: "productProfitability",
  initialState: {
    rows: [],
    totals: emptyTotals,
    period_label: "",
    pagination: { total: 0, perPage: 25, orderBy: "profit" },
    loading: false,
    error: "",
  },
  reducers: {
    cleanReportMessage: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProductProfitability.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductProfitability.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload?.rows || [];
        state.totals = action.payload?.totals || emptyTotals;
        state.period_label = action.payload?.period_label || "";
        state.pagination = action.payload?.pagination || state.pagination;
        state.error = "";
      })
      .addCase(getProductProfitability.rejected, (state, action) => {
        state.loading = false;
        state.rows = [];
        state.totals = emptyTotals;
        state.error = action.payload || "";
      });
  },
});

export const { cleanReportMessage } = productProfitabilitySlice.actions;
export default productProfitabilitySlice.reducer;
