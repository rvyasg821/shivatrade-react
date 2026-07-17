// HSN Summary (GSTR-1 Table 12) report store (HSN_SUMMARY_GSTR1_REPORT_PLAN.md).
// Read-only — one thunk that hits GET /admin/reports/hsn-summary.
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

export const getHsnSummary = createAsyncThunk(
  "reports/getHsnSummary",
  async (params, { rejectWithValue }) => {
    try {
      const resp = await instance.get(API_ENDPOINTS.reports.hsnSummary, {
        params,
      });
      return unwrap(resp, "Failed to load HSN summary report");
    } catch (error) {
      return rejectWithValue(errText(error, "Failed to load HSN summary report"));
    }
  }
);

const emptyTotals = {
  total_qty: 0,
  total_value_inr: 0,
  taxable_value_inr: 0,
  igst_inr: 0,
  cgst_inr: 0,
  sgst_inr: 0,
  cess_inr: 0,
};

export const hsnSummarySlice = createSlice({
  name: "hsnSummary",
  initialState: {
    rows: [],
    totals: emptyTotals,
    period_label: "",
    missing_hsn_or_uqc_rows: 0,
    pagination: { total: 0, perPage: 25, orderBy: "hsn" },
    loading: false,
    error: "",
  },
  reducers: {
    cleanHsnSummaryMessage: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getHsnSummary.pending, (state) => {
        state.loading = true;
      })
      .addCase(getHsnSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload?.rows || [];
        state.totals = action.payload?.totals || emptyTotals;
        state.period_label = action.payload?.period_label || "";
        state.missing_hsn_or_uqc_rows =
          action.payload?.missing_hsn_or_uqc_rows || 0;
        state.pagination = action.payload?.pagination || state.pagination;
        state.error = "";
      })
      .addCase(getHsnSummary.rejected, (state, action) => {
        state.loading = false;
        state.rows = [];
        state.totals = emptyTotals;
        state.error = action.payload || "";
      });
  },
});

export const { cleanHsnSummaryMessage } = hsnSummarySlice.actions;
export default hsnSummarySlice.reducer;
