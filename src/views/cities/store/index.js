// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ** Axios Imports
import instance from "@src/utility/AxiosConfig";

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// ** Constant
import { initCityItem } from "@constant/reduxConstant";

async function getCityDrpdwnListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.cities.drpdwn}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCityDrpdwnList = createAsyncThunk(
  "appCity/getCityDrpdwnList",
  async (params) => {
    try {
      const response = await getCityDrpdwnListRequest(params);
      if (response && response.flag) {
        return {
          params,
          cityDrpdwnItems: response.data,
          // pagination: response?.page_data || null,
          actionFlag: "CITY_DRPDWN_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          cityDrpdwnItems: [],
          actionFlag: "CITY_DRPDWN_LST_ERR",
          success: "",
          error: "",
        };
      }
    } catch (error) {
      console.log("getCityList catch ", error);
      return {
        params,
        cityDrpdwnItems: [],
        actionFlag: "CITY_DRPDWN_LST_ERR",
        success: "",
        error,
      };
    }
  }
);

async function getCityListRequest(params) {
  return instance
    .get(`${API_ENDPOINTS.cities.list}`, { params })
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCityList = createAsyncThunk(
  "appCity/getCityList",
  async (params) => {
    try {
      const response = await getCityListRequest(params);
      if (response && response.flag) {
        return {
          params,
          cityItems: response.data,
          pagination: response?.page_data || null,
          actionFlag: "CITY_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          params,
          cityItems: [],
          pagination: null,
          actionFlag: "CITY_LST_ERR",
          success: "",
          error: "",
        };
      }
    } catch (error) {
      console.log("getCityList catch ", error);
      return {
        params,
        cityItems: [],
        pagination: null,
        actionFlag: "CITY_LST_ERR",
        success: "",
        error,
      };
    }
  }
);

async function getCityRequest(id) {
  return instance
    .get(`${API_ENDPOINTS.cities.get}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCity = createAsyncThunk("appCity/getCity", async (id) => {
  try {
    const response = await getCityRequest(id);
    if (response && response.flag) {
      return {
        id,
        cityItem: response.data,
        actionFlag: "CITY_SCS",
        success: "",
        error: "",
      };
    } else {
      return {
        id,
        cityItem: null,
        actionFlag: "",
        success: "",
        error: response.message,
      };
    }
  } catch (error) {
    console.log("getCity catch ", error);
    return {
      id,
      cityItem: null,
      actionFlag: "",
      success: "",
      error,
    };
  }
});

async function createCityRequest(payload) {
  return instance
    .post(`${API_ENDPOINTS.cities.create}`, payload)
    .then((items) => items.data)
    .catch((error) => error);
}

export const createCity = createAsyncThunk(
  "appCity/createCity",
  async (payload) => {
    try {
      const response = await createCityRequest(payload);
      if (response && response.flag) {
        return {
          payload,
          cityItem: response.data || null,
          actionFlag: "CITY_CREATED",
          success: response?.message || "",
          error: "",
        };
      } else {
        return {
          payload,
          actionFlag: "",
          success: "",
          error: response.message,
        };
      }
    } catch (error) {
      console.log("createCity catch ", error);
      return {
        payload,
        actionFlag: "",
        success: "",
        error,
      };
    }
  }
);

async function updateCityRequest({ id, data }) {
  return instance
    .patch(`${API_ENDPOINTS.cities.update}/${id}`, data)
    .then((items) => items.data)
    .catch((error) => error);
}

export const updateCity = createAsyncThunk(
  "appCity/updateCity",
  async (payload) => {
    try {
      const response = await updateCityRequest(payload);
      if (response && response.flag) {
        return {
          payload,
          cityItem: response.data || null,
          actionFlag: "CITY_UPDATED",
          success: response?.message || "",
          error: "",
        };
      } else {
        return {
          payload,
          actionFlag: "",
          success: "",
          error: response.message,
        };
      }
    } catch (error) {
      console.log("updateCity catch ", error);
      return {
        payload,
        actionFlag: "",
        success: "",
        error,
      };
    }
  }
);

async function deleteCityRequest(id) {
  return instance
    .delete(`${API_ENDPOINTS.cities.delete}/${id}`)
    .then((items) => items.data)
    .catch((error) => error);
}

export const deleteCity = createAsyncThunk("appCity/deleteCity", async (id) => {
  try {
    const response = await deleteCityRequest(id);
    if (response && response.flag) {
      return {
        id,
        actionFlag: "CITY_DELETED",
        success: response?.message || "",
        error: "",
      };
    } else {
      return {
        id,
        actionFlag: "",
        success: "",
        error: response.message,
      };
    }
  } catch (error) {
    console.log("deleteCity catch >>> ", error);
    return {
      id,
      actionFlag: "",
      success: "",
      error,
    };
  }
});

// async function getCityListByStateRequest(id) {
//   return instance
//     .get(`${API_ENDPOINTS.cities.list}/stateId/${id}`)
//     .then((items) => items.data)
//     .catch((error) => error);
// }

// export const getCityListByState = createAsyncThunk(
//   "appCity/getCityListByState",
//   async (id) => {
//     try {
//       const response = await getCityListByStateRequest(id);
//       if (response && response.flag) {
//         return {
//           id,
//           cityItems: response.data,
//           actionFlag: "CITY_STT_LST_SCS",
//           success: "",
//           error: "",
//         };
//       } else {
//         return {
//           id,
//           cityItems: [],
//           actionFlag: "CITY_STT_LST_ERR",
//           success: "",
//           error: response.message,
//         };
//       }
//     } catch (error) {
//       console.log("getCityListByState catch ", error);
//       return {
//         id,
//         cityItems: [],
//         actionFlag: "CITY_STT_LST_ERR",
//         success: "",
//         error,
//       };
//     }
//   }
// );

async function getCityListByStateRequest({ id, search }) {
  let url = `${API_ENDPOINTS.cities.list}/stateId/${id}`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  return instance
    .get(url)
    .then((items) => items.data)
    .catch((error) => error);
}

export const getCityListByState = createAsyncThunk(
  "appCity/getCityListByState",
  async (input) => {
    try {
      // Check if input is an object or a single value
      const isObject = typeof input === "object" && input !== null;
      const id = isObject ? input.id : input; // Extract id
      const search = isObject ? input.search : undefined; // Extract search if available

      const response = await getCityListByStateRequest({ id, search });

      if (response && response.flag) {
        return {
          id,
          cityItems: response.data,
          actionFlag: "CITY_STT_LST_SCS",
          success: "",
          error: "",
        };
      } else {
        return {
          id,
          cityItems: [],
          actionFlag: "CITY_STT_LST_ERR",
          success: "",
          error: response.message,
        };
      }
    } catch (error) {
      console.log("getCityListByState catch ", error);
      return {
        id: input.id || input,
        cityItems: [],
        actionFlag: "CITY_STT_LST_ERR",
        success: "",
        error,
      };
    }
  }
);


export const appCitySlice = createSlice({
  name: "appCity",
  initialState: {
    cityItems: [],
    pagination: null,
    cityItem: initCityItem,
    actionFlag: "",
    loading: true,
    success: "",
    error: "",
  },
  reducers: {
    cleanCityMessage: (state) => {
      state.actionFlag = "";
      state.success = "";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCityList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCityList.fulfilled, (state, action) => {
        state.cityItems = action.payload?.cityItems || [];
        state.pagination = action.payload?.pagination || null;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCityList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCity.pending, (state) => {
        state.cityItem = initCityItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCity.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCity.pending, (state) => {
        state.cityItem = initCityItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(createCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(createCity.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCity.pending, (state) => {
        state.cityItem = initCityItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(updateCity.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteCity.pending, (state) => {
        state.cityItem = initCityItem;
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.cityItem = action.payload?.cityItem || initCityItem;
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(deleteCity.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      // -------------------------------------
      .addCase(getCityListByState.pending, (state) => {
        state.cityItems = [];
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCityListByState.fulfilled, (state, action) => {
        state.cityItems = action.payload?.cityItems || [];
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCityListByState.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCityDrpdwnList.pending, (state) => {
        state.loading = false;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      })
      .addCase(getCityDrpdwnList.fulfilled, (state, action) => {
        state.cityDrpdwnItems = action.payload?.cityDrpdwnItems || [];
        state.actionFlag = action.payload.actionFlag;
        state.loading = true;
        state.success = action.payload.success;
        state.error = action.payload.error;
      })
      .addCase(getCityDrpdwnList.rejected, (state) => {
        state.loading = true;
        state.actionFlag = "";
        state.success = "";
        state.error = "";
      });
  },
});

export const { cleanCityMessage } = appCitySlice.actions;

export default appCitySlice.reducer;
