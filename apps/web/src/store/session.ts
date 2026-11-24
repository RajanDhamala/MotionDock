import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isAxiosError } from "axios";
import api from "../Utils/AxiosWrapper";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface MeResponse {
  _id: string;
  fullname: string;
  email: string;
}

interface SessionState {
  user: User | null;
  status: "checking" | "ready" | "unavailable";
  requestId: string | null;
}

const initialState: SessionState = {
  user: null,
  status: "checking",
  requestId: null,
};

export const loadSession = createAsyncThunk("session/load", async (_, { signal }): Promise<User | null> => {
  try {
    const { data } = await api.get<MeResponse>("/users/me", { signal });
    if (!data || typeof data._id !== "string" || !data._id ||
        typeof data.fullname !== "string" || typeof data.email !== "string") {
      throw new Error("MotionDock returned an invalid account profile");
    }
    return { id: data._id, name: data.fullname, email: data.email };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
});

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionCleared: (): SessionState => ({ user: null, status: "ready", requestId: null }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.pending, (state, action) => {
        state.requestId = action.meta.requestId;
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.user = action.payload;
        state.status = "ready";
        state.requestId = null;
      })
      .addCase(loadSession.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.user = null;
        state.status = "unavailable";
        state.requestId = null;
      });
  },
});

export const { sessionCleared } = sessionSlice.actions;
export default sessionSlice.reducer;
