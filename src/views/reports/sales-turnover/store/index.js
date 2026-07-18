// Sales Turnover report store (SALES_TURNOVER_REPORT_PLAN.md).
// Read-only — one thunk that hits GET /admin/reports/sales-turnover. The
// response is multi-currency: `groups` is a stack of per-currency sections,
// each with its own rows + subtotal (never summed across currencies).
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

export const getSalesTurnover = createAsyncThunk(
  "reports/getSalesTurnover",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.salesTurnover, {
        params,
      });
      return unwrap(resp, "Failed to load sales turnover report");
    } catch (error) {
      return rejectWithValue(
        errText(error, "Failed to load sales turnover report")
      );
    }
  }
);

export const salesTurnoverSlice = createSlice({
  name: "salesTurnover",
  initialState: {
    groups: [],
    available_currencies: [],
    overall_invoice_count: 0,
    period_label: "",
    group_by: "month",
    loading: false,
    error: "",
  },
  reducers: {
    cleanSalesTurnoverMessage: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSalesTurnover.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSalesTurnover.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload?.groups || [];
        state.available_currencies =
          action.payload?.available_currencies || [];
        state.overall_invoice_count =
          action.payload?.overall_invoice_count || 0;
        state.period_label = action.payload?.period_label || "";
        state.group_by = action.payload?.group_by || "month";
        state.error = "";
      })
      .addCase(getSalesTurnover.rejected, (state, action) => {
        state.loading = false;
        state.groups = [];
        state.available_currencies = [];
        state.overall_invoice_count = 0;
        state.error = action.payload || "";
      });
  },
});

export const { cleanSalesTurnoverMessage } = salesTurnoverSlice.actions;
export default salesTurnoverSlice.reducer;
