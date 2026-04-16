import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

export const getLookups = createAsyncThunk("appCompanyLookup/getLookups", async (type) => {
  try {
    const response = await instance.get(API_ENDPOINTS.companyLookup.list, { params: { type } }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { type, items: response.data, actionFlag: "CL_LST_SCS", success: "", error: "" };
    }
    return { type, items: [], actionFlag: "CL_LST_ERR", success: "", error: response?.message };
  } catch (error) {
    return { type, items: [], actionFlag: "CL_LST_ERR", success: "", error: error.message };
  }
});

export const createLookup = createAsyncThunk("appCompanyLookup/createLookup", async ({ type, name }, { rejectWithValue }) => {
  try {
    const response = await instance.post(API_ENDPOINTS.companyLookup.create, { type, name }).then((r) => r.data);
    if (response?.statusCode && response?.data) {
      return { type, item: response.data, actionFlag: "CL_CRT_SCS", success: response.message || "", error: "" };
    }
    return rejectWithValue(response?.message || "Failed");
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error.message);
  }
});

export const appCompanyLookupSlice = createSlice({
  name: "appCompanyLookup",
  initialState: {
    designations: [],
    departments: [],
    actionFlag: "",
    success: "",
    error: "",
  },
  reducers: {
    clearLookupMessages: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLookups.fulfilled, (state, action) => {
        const { type, items } = action.payload;
        if (type === "designation") state.designations = items;
        if (type === "department") state.departments = items;
        Object.assign(state, { actionFlag: action.payload.actionFlag, success: action.payload.success, error: action.payload.error });
      })
      .addCase(createLookup.fulfilled, (state, action) => {
        const { type, item } = action.payload;
        if (type === "designation") state.designations = [...state.designations, item];
        if (type === "department") state.departments = [...state.departments, item];
        Object.assign(state, { actionFlag: action.payload.actionFlag, success: action.payload.success, error: action.payload.error });
      })
      .addCase(createLookup.rejected, (state, action) => {
        state.error = action.payload || "An error occurred";
        state.actionFlag = "CL_CRT_ERR";
      });
  },
});

export const { clearLookupMessages } = appCompanyLookupSlice.actions;
export default appCompanyLookupSlice.reducer;
