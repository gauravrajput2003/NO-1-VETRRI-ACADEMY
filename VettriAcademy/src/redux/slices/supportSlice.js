import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  createSupportTicketAPI,
  getMySupportTicketsAPI,
  getSupportTicketDetailAPI,
  getAdminSupportTicketsAPI,
  updateAdminSupportTicketAPI,
  deleteAdminSupportTicketAPI,
} from '../../services/api';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const createSupportTicket = createAsyncThunk(
  'support/createTicket',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await createSupportTicketAPI(payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit query');
    }
  }
);

export const fetchMyTickets = createAsyncThunk(
  'support/fetchMyTickets',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await getMySupportTicketsAPI(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load tickets');
    }
  }
);

export const fetchSupportTicketDetail = createAsyncThunk(
  'support/fetchTicketDetail',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await getSupportTicketDetailAPI(id);
      return data.ticket;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load ticket detail');
    }
  }
);

export const fetchAdminSupportTickets = createAsyncThunk(
  'support/fetchAdminTickets',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await getAdminSupportTicketsAPI(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load queries');
    }
  }
);

export const updateAdminSupportTicket = createAsyncThunk(
  'support/updateAdminTicket',
  async ({ id, data: updateData }, { rejectWithValue }) => {
    try {
      const { data } = await updateAdminSupportTicketAPI(id, updateData);
      return data.ticket;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update ticket');
    }
  }
);

export const deleteAdminSupportTicket = createAsyncThunk(
  'support/deleteAdminTicket',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await deleteAdminSupportTicketAPI(id);
      return { id, ticketId: data.ticketId };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to delete query',
        code: error.response?.data?.code,
        canDeleteAfter: error.response?.data?.canDeleteAfter,
        remainingHours: error.response?.data?.remainingHours,
      });
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const supportSlice = createSlice({
  name: 'support',
  initialState: {
    myTickets: [],
    myTicketsTotal: 0,
    adminTickets: [],
    adminTicketsTotal: 0,
    adminCounts: {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      students: 0,
      teachers: 0,
    },
    selectedTicket: null,
    loading: false,
    submitting: false,
    adminLoading: false,
    error: null,
  },
  reducers: {
    clearSupportError: (state) => {
      state.error = null;
    },
    setSelectedTicket: (state, action) => {
      state.selectedTicket = action.payload;
    },
    addIncomingTicket: (state, action) => {
      const ticket = action.payload;
      const exists = state.adminTickets.find((t) => t._id === ticket._id || t.ticketId === ticket.ticketId);
      if (!exists) {
        state.adminTickets.unshift(ticket);
        state.adminTicketsTotal += 1;
        state.adminCounts.total += 1;
        if (ticket.status === 'open') state.adminCounts.open += 1;
      }
    },
    updateTicketLocally: (state, action) => {
      const updated = action.payload;
      state.myTickets = state.myTickets.map((t) => (t._id === updated._id ? updated : t));
      state.adminTickets = state.adminTickets.map((t) => (t._id === updated._id ? updated : t));
      if (state.selectedTicket && state.selectedTicket._id === updated._id) {
        state.selectedTicket = updated;
      }
    },
    removeTicketLocally: (state, action) => {
      const { id, ticketId } = action.payload;
      state.adminTickets = state.adminTickets.filter((t) => t._id !== id && t.ticketId !== ticketId);
      state.myTickets = state.myTickets.filter((t) => t._id !== id && t.ticketId !== ticketId);
      if (state.selectedTicket && (state.selectedTicket._id === id || state.selectedTicket.ticketId === ticketId)) {
        state.selectedTicket = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create ticket
      .addCase(createSupportTicket.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createSupportTicket.fulfilled, (state, action) => {
        state.submitting = false;
        if (action.payload.ticket) {
          state.myTickets.unshift(action.payload.ticket);
          state.myTicketsTotal += 1;
        }
      })
      .addCase(createSupportTicket.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // My tickets
      .addCase(fetchMyTickets.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.myTickets = action.payload.tickets || [];
        state.myTicketsTotal = action.payload.total || 0;
      })
      .addCase(fetchMyTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Ticket detail
      .addCase(fetchSupportTicketDetail.fulfilled, (state, action) => {
        state.selectedTicket = action.payload;
      })

      // Admin tickets
      .addCase(fetchAdminSupportTickets.pending, (state) => {
        state.adminLoading = true;
      })
      .addCase(fetchAdminSupportTickets.fulfilled, (state, action) => {
        state.adminLoading = false;
        state.adminTickets = action.payload.tickets || [];
        state.adminTicketsTotal = action.payload.total || 0;
        if (action.payload.counts) {
          state.adminCounts = action.payload.counts;
        }
      })
      .addCase(fetchAdminSupportTickets.rejected, (state, action) => {
        state.adminLoading = false;
        state.error = action.payload;
      })

      // Update admin ticket
      .addCase(updateAdminSupportTicket.fulfilled, (state, action) => {
        const updated = action.payload;
        state.adminTickets = state.adminTickets.map((t) => (t._id === updated._id ? updated : t));
        if (state.selectedTicket && state.selectedTicket._id === updated._id) {
          state.selectedTicket = updated;
        }
      })

      // Delete admin ticket
      .addCase(deleteAdminSupportTicket.fulfilled, (state, action) => {
        const { id, ticketId } = action.payload;
        state.adminTickets = state.adminTickets.filter((t) => t._id !== id && t.ticketId !== ticketId);
        if (state.selectedTicket && (state.selectedTicket._id === id || state.selectedTicket.ticketId === ticketId)) {
          state.selectedTicket = null;
        }
        state.adminCounts.total = Math.max(0, state.adminCounts.total - 1);
      });
  },
});

export const {
  clearSupportError,
  setSelectedTicket,
  addIncomingTicket,
  updateTicketLocally,
  removeTicketLocally,
} = supportSlice.actions;

export default supportSlice.reducer;
