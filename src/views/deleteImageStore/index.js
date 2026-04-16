// ** Redux Imports
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

// ** Axios Imports
import instance from "@src/utility/AxiosConfig"

// ** Api endpoints
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints"

// ** Constant
import { initImageDelete } from "@constant/reduxConstant"

async function createDeleteImageRequest(payload) {
    return instance.post(`${API_ENDPOINTS.deleteImages.create}`, payload)
        .then((items) => items.data)
        .catch((error) => error)
}

export const createDeleteImage = createAsyncThunk("appDeleteImage/createDeleteImage", async (payload) => {
    try {
        const response = await createDeleteImageRequest(payload)
        if (response && response.flag) {
            return {
                payload,
                deleteImageItem: response.data || null,
                actionFlag: "IMG_DELETED",
                success: response?.message || "",
                error: ""
            }
        } else {
            return {
                payload,
                actionFlag: "",
                success: "",
                error: response.message
            }
        }
    } catch (error) {
        console.log("createDeleteImage catch ", error)
        return {
            payload,
            actionFlag: "",
            success: "",
            error
        }
    }
})

export const appDeleteImageSlice = createSlice({
    name: "appDeleteImage",
    initialState: {
        pagination: null,
        deleteImageItem: initImageDelete,
        actionFlag: "",
        loading: true,
        success: "",
        error: ""
    },
    reducers: {
        cleanDeleteImageMessage: (state) => {
            state.actionFlag = ""
            state.success = ""
            state.error = ""
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(createDeleteImage.pending, (state) => {
                state.deleteImageItem = initImageDelete
                state.loading = false
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
            .addCase(createDeleteImage.fulfilled, (state, action) => {
                state.deleteImageItem = action.payload?.serviceItem || initImageDelete
                state.actionFlag = action.payload.actionFlag
                state.loading = true
                state.success = action.payload.success
                state.error = action.payload.error
            })
            .addCase(createDeleteImage.rejected, (state) => {
                state.loading = true
                state.actionFlag = ""
                state.success = ""
                state.error = ""
            })
    }
})

export const {
    cleanDeleteImageMessage
} = appDeleteImageSlice.actions

export default appDeleteImageSlice.reducer