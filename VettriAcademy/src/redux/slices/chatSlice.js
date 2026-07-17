import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getConversationsAPI, getMessagesAPI, sendMessageAPI, markAsReadAPI, getUnreadCountAPI } from '../../services/api';

export const fetchConversations = createAsyncThunk('chat/fetchConversations', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getConversationsAPI();
    return data.conversations;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load conversations');
  }
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async ({ conversationId, page = 1 }, { rejectWithValue }) => {
  try {
    const { data } = await getMessagesAPI(conversationId, page);
    return { messages: data.messages, total: data.total, page: data.page, conversationId };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load messages');
  }
});

export const sendMessage = createAsyncThunk('chat/sendMessage', async ({ receiverId, message }, { rejectWithValue }) => {
  try {
    const { data } = await sendMessageAPI(receiverId, message);
    return data.message;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to send message');
  }
});

export const markConversationRead = createAsyncThunk('chat/markRead', async (conversationId, { rejectWithValue }) => {
  try {
    await markAsReadAPI(conversationId);
    return conversationId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

export const fetchUnreadCount = createAsyncThunk('chat/fetchUnread', async () => {
  const { data } = await getUnreadCountAPI();
  return data.count;
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    messages: [],
    currentConversationId: null,
    totalMessages: 0,
    unreadCount: 0,
    loading: false,
    error: null,
    typingUsers: {},
  },
  reducers: {
    clearChatError: (state) => { state.error = null; },
    setCurrentConversation: (state, action) => { state.currentConversationId = action.payload; },
    addIncomingMessage: (state, action) => {
      const msg = action.payload;
      // Add to messages if in current conversation
      if (msg.conversationId === state.currentConversationId) {
        const exists = state.messages.find((m) => m._id === msg._id);
        if (!exists) state.messages.push(msg);
      }
      // Update conversation list
      state.conversations = state.conversations.map((conv) => {
        if (conv.conversationId === msg.conversationId) {
          return { ...conv, lastMessage: msg.message || `📎 File`, lastMessageAt: msg.createdAt };
        }
        return conv;
      });
    },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (isTyping) {
        state.typingUsers[conversationId] = userId;
      } else {
        delete state.typingUsers[conversationId];
      }
    },
    resetMessages: (state) => { state.messages = []; state.totalMessages = 0; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.loading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => { state.loading = false; state.conversations = action.payload; })
      .addCase(fetchConversations.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchMessages.pending, (state) => { state.loading = true; })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.page === 1) {
          state.messages = action.payload.messages;
        } else {
          state.messages = [...action.payload.messages, ...state.messages];
        }
        state.totalMessages = action.payload.total;
        state.currentConversationId = action.payload.conversationId;
      })
      .addCase(fetchMessages.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        const exists = state.messages.find((m) => m._id === msg._id);
        if (!exists) state.messages.push(msg);
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        state.conversations = state.conversations.map((c) =>
          c.conversationId === action.payload ? { ...c, unreadCount: { ...c.unreadCount } } : c
        );
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = action.payload; });
  },
});

export const { clearChatError, setCurrentConversation, addIncomingMessage, setTyping, resetMessages } = chatSlice.actions;
export default chatSlice.reducer;
