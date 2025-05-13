import { io, Socket } from 'socket.io-client';

// Define the server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// Create a singleton socket instance
let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Connect with auth token
    socket = io(SERVER_URL, {
      auth: {
        token
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    
    // Setup reconnection logic
    socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      
      // Don't automatically remove token and reload - let the app handle this
      // This prevents the auto-logout loop
      if (error.message === 'Authentication error') {
        console.error('Authentication failed. Token may be invalid.');
      }
    });
  }
  
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

// Send a message to another user
export const sendMessage = (to: string, message: string): void => {
  if (socket) {
    socket.emit('message:send', { to, message });
  }
};

// Set typing status
export const setTypingStatus = (to: string, isTyping: boolean): void => {
  if (socket) {
    socket.emit('user:typing', { to, isTyping });
  }
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  sendMessage,
  setTypingStatus
};
