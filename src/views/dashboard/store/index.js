// ** Redux Toolkit Imports
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import instance from "../../../utility/AxiosConfig";
import { API_ENDPOINTS } from "../../../utility/ApiEndPoints";

// Fetch admin dashboard stats (for super admin)
async function getAdminDashboardStatsRequest() {
    try {
        const response = await instance.get(API_ENDPOINTS.dashboard.adminStats);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchAdminDashboardStats = createAsyncThunk(
    "dashboard/fetchAdminDashboardStats",
    async () => {
        const response = await getAdminDashboardStatsRequest();
        console.log('Admin dashboard stats response:', response);

        if (response?.statusCode && response?.data) {
            return {
                stats: response.data,
                actionFlag: "ADMIN_STATS_SUCCESS",
                error: "",
            };
        } else if (response?.data) {
            // Handle direct response without statusCode wrapper
            return {
                stats: response.data,
                actionFlag: "ADMIN_STATS_SUCCESS",
                error: "",
            };
        } else {
            return {
                stats: null,
                actionFlag: "ADMIN_STATS_ERR",
                error: response?.message || "Failed to fetch dashboard stats",
            };
        }
    }
);

// Fetch my subscription
async function getMySubscriptionRequest() {
    try {
        const response = await instance.get(API_ENDPOINTS.Subscription.getmysubscription);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchMySubscription = createAsyncThunk(
    "dashboard/fetchMySubscription",
    async () => {
        const response = await getMySubscriptionRequest();
        if (response?.statusCode && response?.data) {
            // API returns paginated list { _pagination: {...}, data: [...] }
            // Get the first active subscription from the list
            const subscriptions = Array.isArray(response.data) ? response.data : response.data?.data || [];

            // Find the first active subscription (status: true or status: 1)
            const activeSubscription = subscriptions.find(sub =>
                sub.status === true || sub.status === 1 || sub.status === 'active'
            ) || subscriptions[0] || null;

            return {
                subscription: activeSubscription,
                subscriptions: subscriptions,
                actionFlag: "MY_SUB_FETCH_SUCCESS",
                success: response?.message || "Subscription fetched successfully",
                error: "",
            };
        } else {
            return {
                subscription: null,
                subscriptions: [],
                actionFlag: "MY_SUB_FETCH_ERR",
                success: "",
                error: response?.message || "Failed to fetch subscription",
            };
        }
    }
);

async function getAllWidgetsRequest() {
    try {
        const response = await instance.get(API_ENDPOINTS.dashboard.getAllWidgets);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchDashboardWidgets = createAsyncThunk(
    "dashboard/fetchWidgets",
    async () => {
        const response = await getAllWidgetsRequest();
        if (response?.widgets) {
            return {
                widgetList: response?.widgets || [],
                invisibleMetaData: response.invisibleMetaData || [],
                actionFlag: "DSH_WGT_FETCH_SUCCESS",
                success: response?.message || "Succesfully get Data!!",
                error: "",
            };
        } else {
            return {
                widgetList: [],
                invisibleMetaData: [],
                actionFlag: "DSH_WGT_FETCH_ERR",
                success: "",
                error: response?.message || "Something went wrong",
            };
        }
    }
);

async function updateDashboardWidgetsRequest(payload) {
    try {
        const response = await instance.post(
            API_ENDPOINTS.dashboard.updateWidgets,
            payload
        );
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const updateDashboardWidgets = createAsyncThunk(
    "dashboard/updateWidgets",
    async (payload) => {
        const response = await updateDashboardWidgetsRequest(payload);
        console.log('updateDashboardWidgets Response :', response);

        if (response?.flag) {
            return {
                actionFlag: "DSH_WGT_UPDATE_SUCCESS",
                success: response?.message || "Widgets updated successfully!",
                error: "",
            };
        } else {
            return {
                actionFlag: "DSH_WGT_UPDATE_ERR",
                success: "",
                error: response?.message || "Update failed",
            };
        }
    }
);

// Fetch recent activity for super admin dashboard
async function getRecentActivityRequest(limit = 10) {
    try {
        const response = await instance.get(`${API_ENDPOINTS.dashboard.recentActivity}?limit=${limit}`);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchRecentActivity = createAsyncThunk(
    "dashboard/fetchRecentActivity",
    async (limit = 10) => {
        const response = await getRecentActivityRequest(limit);
        if (response?.data) {
            return {
                recentActivity: response.data,
                actionFlag: "RECENT_ACTIVITY_SUCCESS",
                error: "",
            };
        } else {
            return {
                recentActivity: [],
                actionFlag: "RECENT_ACTIVITY_ERR",
                error: response?.message || "Failed to fetch recent activity",
            };
        }
    }
);

// Fetch chart data for super admin dashboard
async function getChartDataRequest(months = 6) {
    try {
        const response = await instance.get(`${API_ENDPOINTS.dashboard.chartData}?months=${months}`);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchChartData = createAsyncThunk(
    "dashboard/fetchChartData",
    async (months = 6) => {
        const response = await getChartDataRequest(months);
        if (response?.data) {
            return {
                chartData: response.data,
                actionFlag: "CHART_DATA_SUCCESS",
                error: "",
            };
        } else {
            return {
                chartData: null,
                actionFlag: "CHART_DATA_ERR",
                error: response?.message || "Failed to fetch chart data",
            };
        }
    }
);

// Fetch recent companies with subscription status
async function getRecentCompaniesRequest(limit = 10) {
    try {
        const response = await instance.get(`${API_ENDPOINTS.dashboard.companies}?limit=${limit}`);
        return response.data;
    } catch (error) {
        return { flag: false, message: error.message };
    }
}

export const fetchRecentCompanies = createAsyncThunk(
    "dashboard/fetchRecentCompanies",
    async (limit = 10) => {
        const response = await getRecentCompaniesRequest(limit);
        if (response?.data) {
            return {
                recentCompanies: response.data,
                actionFlag: "RECENT_COMPANIES_SUCCESS",
                error: "",
            };
        } else {
            return {
                recentCompanies: [],
                actionFlag: "RECENT_COMPANIES_ERR",
                error: response?.message || "Failed to fetch recent companies",
            };
        }
    }
);

// Fetch company/location dashboard stats
export const fetchCompanyDashboardStats = createAsyncThunk(
    "dashboard/fetchCompanyDashboardStats",
    async () => {
        try {
            const response = await instance.get(API_ENDPOINTS.dashboard.companyStats);
            if (response?.data?.statusCode && response?.data?.data) {
                return { companyStats: response.data.data, error: "" };
            }
            return { companyStats: null, error: response?.data?.message || "Failed" };
        } catch (error) {
            return { companyStats: null, error: error.message };
        }
    }
);

// Sales / Purchase / Operations rollup for the dashboard.
export const fetchOperationsStats = createAsyncThunk(
    "dashboard/fetchOperationsStats",
    async (period = "month") => {
        try {
            const response = await instance.get(
                API_ENDPOINTS.dashboard.operationsStats,
                { params: { period } }
            );
            if (response?.data?.statusCode && response?.data?.data) {
                return { operationsStats: response.data.data, error: "" };
            }
            return { operationsStats: null, error: response?.data?.message || "Failed" };
        } catch (error) {
            return { operationsStats: null, error: error.message };
        }
    }
);

const dashboardWidgetsSlice = createSlice({
    name: "dashboardWidgets",
    initialState: {
        widgetList: [],
        invisibleMetaData: [],
        actionFlag: "",
        loading: true,
        success: "",
        error: "",
        // Admin dashboard stats (for super admin)
        adminStats: null,
        adminStatsLoading: false,
        adminStatsError: "",
        // Company/Location dashboard stats
        companyStats: null,
        companyStatsLoading: false,
        companyStatsError: "",
        // Sales / Purchase / Operations rollup
        operationsStats: null,
        operationsStatsLoading: false,
        operationsStatsError: "",
        // Subscription state (for company admin)
        subscription: null,
        subscriptionLoading: false,
        subscriptionError: "",
        // Recent activity state
        recentActivity: [],
        recentActivityLoading: false,
        recentActivityError: "",
        // Chart data state
        chartData: null,
        chartDataLoading: false,
        chartDataError: "",
        // Recent companies state
        recentCompanies: [],
        recentCompaniesLoading: false,
        recentCompaniesError: "",
    },

    reducers: {
        resetDashboardWidgetMessage: (state) => {
            state.actionFlag = "";
            state.success = "";
            state.error = "";
        },
        clearSubscription: (state) => {
            state.subscription = null;
            state.subscriptionError = "";
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardWidgets.pending, (state) => {
                state.loading = true;
                state.error = "";
                state.success = "";
            })
            .addCase(fetchDashboardWidgets.fulfilled, (state, action) => {
                state.loading = false;
                state.widgetList = action.payload.widgetList;
                state.invisibleMetaData = action.payload.invisibleMetaData
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(fetchDashboardWidgets.rejected, (state, action) => {
                state.loading = false;
                state.widgetList = [];
                state.actionFlag = "DSH_WGT_FETCH_ERR";
                state.error = action.error?.message || "Something went wrong";
            })
            .addCase(updateDashboardWidgets.pending, (state) => {
                state.loading = true;
                state.error = "";
                state.success = "";
            })
            .addCase(updateDashboardWidgets.fulfilled, (state, action) => {
                state.loading = false;
                state.actionFlag = action.payload.actionFlag;
                state.success = action.payload.success;
                state.error = action.payload.error;
            })
            .addCase(updateDashboardWidgets.rejected, (state, action) => {
                state.loading = false;
                state.actionFlag = "DSH_WGT_UPDATE_ERR";
                state.error = action.error?.message || "Failed to update widgets";
            })
            // Subscription cases
            .addCase(fetchMySubscription.pending, (state) => {
                state.subscriptionLoading = true;
                state.subscriptionError = "";
            })
            .addCase(fetchMySubscription.fulfilled, (state, action) => {
                state.subscriptionLoading = false;
                state.subscription = action.payload.subscription;
                state.actionFlag = action.payload.actionFlag;
                state.subscriptionError = action.payload.error;
            })
            .addCase(fetchMySubscription.rejected, (state, action) => {
                state.subscriptionLoading = false;
                state.subscription = null;
                state.subscriptionError = action.error?.message || "Failed to fetch subscription";
            })
            // Admin dashboard stats cases
            .addCase(fetchAdminDashboardStats.pending, (state) => {
                state.adminStatsLoading = true;
                state.adminStatsError = "";
            })
            .addCase(fetchAdminDashboardStats.fulfilled, (state, action) => {
                state.adminStatsLoading = false;
                state.adminStats = action.payload.stats;
                state.actionFlag = action.payload.actionFlag;
                state.adminStatsError = action.payload.error || "";
            })
            .addCase(fetchAdminDashboardStats.rejected, (state, action) => {
                state.adminStatsLoading = false;
                state.adminStats = null;
                state.adminStatsError = action.error?.message || "Failed to fetch dashboard stats";
            })
            // Recent activity cases
            .addCase(fetchRecentActivity.pending, (state) => {
                state.recentActivityLoading = true;
                state.recentActivityError = "";
            })
            .addCase(fetchRecentActivity.fulfilled, (state, action) => {
                state.recentActivityLoading = false;
                state.recentActivity = action.payload.recentActivity;
                state.recentActivityError = action.payload.error || "";
            })
            .addCase(fetchRecentActivity.rejected, (state, action) => {
                state.recentActivityLoading = false;
                state.recentActivity = [];
                state.recentActivityError = action.error?.message || "Failed to fetch recent activity";
            })
            // Chart data cases
            .addCase(fetchChartData.pending, (state) => {
                state.chartDataLoading = true;
                state.chartDataError = "";
            })
            .addCase(fetchChartData.fulfilled, (state, action) => {
                state.chartDataLoading = false;
                state.chartData = action.payload.chartData;
                state.chartDataError = action.payload.error || "";
            })
            .addCase(fetchChartData.rejected, (state, action) => {
                state.chartDataLoading = false;
                state.chartData = null;
                state.chartDataError = action.error?.message || "Failed to fetch chart data";
            })
            // Recent companies cases
            .addCase(fetchRecentCompanies.pending, (state) => {
                state.recentCompaniesLoading = true;
                state.recentCompaniesError = "";
            })
            .addCase(fetchRecentCompanies.fulfilled, (state, action) => {
                state.recentCompaniesLoading = false;
                state.recentCompanies = action.payload.recentCompanies;
                state.recentCompaniesError = action.payload.error || "";
            })
            .addCase(fetchRecentCompanies.rejected, (state, action) => {
                state.recentCompaniesLoading = false;
                state.recentCompanies = [];
                state.recentCompaniesError = action.error?.message || "Failed to fetch recent companies";
            })
            // Company dashboard stats
            .addCase(fetchCompanyDashboardStats.pending, (state) => {
                state.companyStatsLoading = true;
                state.companyStatsError = "";
            })
            .addCase(fetchCompanyDashboardStats.fulfilled, (state, action) => {
                state.companyStatsLoading = false;
                state.companyStats = action.payload.companyStats;
                state.companyStatsError = action.payload.error || "";
            })
            .addCase(fetchCompanyDashboardStats.rejected, (state, action) => {
                state.companyStatsLoading = false;
                state.companyStats = null;
                state.companyStatsError = action.error?.message || "Failed";
            })
            .addCase(fetchOperationsStats.pending, (state) => {
                state.operationsStatsLoading = true;
                state.operationsStatsError = "";
            })
            .addCase(fetchOperationsStats.fulfilled, (state, action) => {
                state.operationsStatsLoading = false;
                state.operationsStats = action.payload.operationsStats;
                state.operationsStatsError = action.payload.error || "";
            })
            .addCase(fetchOperationsStats.rejected, (state, action) => {
                state.operationsStatsLoading = false;
                state.operationsStats = null;
                state.operationsStatsError = action.error?.message || "Failed";
            });
    },
});

export const selectInvisibleWidgets = createSelector(
    [(state) => state.DashboardWidgets.widgetList],
    (widgetList) => widgetList.filter((w) => !w.is_visible)
);

export const selectInvisibleWidgetNames = createSelector(
    [
        (state) => state.DashboardWidgets.widgetList,
        (state) => state.DashboardWidgets.invisibleMetaData
    ],
    (widgetList, invisibleMetaData) => {
        // Build a Set of slugs that are invisible
        const invisibleSlugs = new Set(
            widgetList.filter((w) => !w.is_visible).map((w) => w.slug)
        );

        // Keep only meta entries whose slug is in the invisible set
        return invisibleMetaData.filter((meta) => invisibleSlugs.has(meta.slug));
    }
);

export const { resetDashboardWidgetMessage, clearSubscription } = dashboardWidgetsSlice.actions;
export default dashboardWidgetsSlice.reducer;
