import axios from 'axios';

// With the proxy configuration in vite.config.ts, we can use a relative URL
// This will be proxied to the server URL defined in the vite config
const API_URL = 'https://chat-app-stit.onrender.com/';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth related API calls
export const authApi = {
  // Register a new user
  register: async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/register', { username, password });
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('chatUser', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },
  
  // Login user
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('chatUser', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
      // Remove token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('chatUser');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still remove token on error
      localStorage.removeItem('token');
      localStorage.removeItem('chatUser');
      throw error;
    }
  },
  
  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }
};

// User related API calls
export const userApi = {
  // Get all users
  getUsers: async () => {
    try {
      const response = await api.get('/api/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  // Get user by ID
  getUserById: async (id: string) => {
    try {
      const response = await api.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },
  
  // Update user status
  updateUserStatus: async (id: string, status: 'online' | 'offline') => {
    try {
      const response = await api.patch(`/api/users/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id} status:`, error);
      throw error;
    }
  }
};

// Message related API calls
export const messageApi = {
  // Get messages between two users
  getMessages: async (userId: string, recipientId: string) => {
    try {
      const response = await api.get(`/api/messages/${userId}/${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },
  
  // Send a message
  sendMessage: async (sender: string, recipient: string, content: string) => {
    try {
      console.log('API call - Sending message to database:', { sender, recipient, content });
      const response = await api.post('/api/messages', { sender, recipient, content });
      console.log('API response from message save:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending message to API:', error);
      // Log more details about the error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server');
      }
      throw error;
    }
  },
  
  // Mark messages as read
  markAsRead: async (userId: string, senderId: string) => {
    try {
      const response = await api.patch(`/api/messages/read/${userId}/${senderId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }
};

export default {
  authApi,
  userApi,
  messageApi
};
