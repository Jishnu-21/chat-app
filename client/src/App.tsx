import { useState, useEffect, useRef } from 'react';
import { userApi, messageApi, authApi } from './services/api';
import { initializeSocket, disconnectSocket, sendMessage, getSocket } from './services/socket';
import AuthFormComponent from './components/AuthForm';
import UserList from './components/UserList';
import ChatArea from './components/ChatArea';
import { Socket } from 'socket.io-client';

// Import types from components
interface User {
  _id: string;
  username: string;
  status: 'online' | 'offline';
  lastSeen: string;
  token?: string;
}

interface Message {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: 'text' | 'system';
}

interface TypingStatus {
  [key: string]: boolean;
}

interface AuthForm {
  username: string;
  password: string;
}

interface SocketError extends Error {
  message: string;
}

type AuthMode = 'login' | 'register';

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [typingStatus, setTypingStatus] = useState<TypingStatus>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authForm, setAuthForm] = useState<AuthForm>({ username: '', password: '' });
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string>('');
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('chatUser');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsLoading(false);
        // Don't initialize socket here - we'll do it in the next useEffect
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('chatUser');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (currentUser) {
        disconnectSocket();
      }
    };
  }, []);

  // Set up socket listeners when current user changes
  useEffect(() => {
    if (!currentUser) return;
    
    // Disconnect any existing socket
    disconnectSocket();
    
    // Initialize a new socket
    let socketInstance: Socket;
    try {
      socketInstance = initializeSocket();
      
      // Update the initialization flag
      socketInitializedRef.current = true;
      
      // Handle authentication errors
      socketInstance.on('connect_error', (error: SocketError) => {
        console.error('Socket connection error:', error.message);
        if (error.message === 'Authentication error') {
          // Clear invalid credentials
          localStorage.removeItem('token');
          localStorage.removeItem('chatUser');
          setCurrentUser(null);
          setAuthError('Session expired. Please login again.');
        }
      });
      
      // Clean up previous listeners to prevent duplicates
      socketInstance.off('message:receive');
      socketInstance.off('user:status');
      socketInstance.off('user:typing');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      
      // Set up reconnection listener
      socketInstance.on('connect', () => {
        console.log('Socket connected/reconnected');
        // Reload users when socket reconnects
        fetchUsers();
      });
      
      // Listen for incoming messages
      socketInstance.on('message:receive', (data: { from: string; message: string; timestamp?: string }) => {
        console.log('New message received:', data);
        const newMessage: Message = {
          _id: Date.now().toString(),
          sender: data.from,
          recipient: currentUser._id,
          content: data.message,
          read: false,
          createdAt: data.timestamp || new Date().toISOString(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        if (currentChat === data.from) {
          messageApi.markAsRead(currentUser._id, data.from);
        }
      });
      
      // Listen for user status changes
      socketInstance.on('user:status', (data: { userId: string; status: 'online' | 'offline' }) => {
        console.log('User status update:', data);
        setUsers(prev => {
          const updatedUsers = prev.map(user => 
            user._id === data.userId ? { ...user, status: data.status } : user
          );
          
          if (currentChat === data.userId) {
            const statusUser = updatedUsers.find(u => u._id === data.userId);
            if (statusUser) {
              const statusMessage: Message = {
                _id: `status-${Date.now()}`,
                sender: 'system',
                recipient: currentUser._id,
                content: `${statusUser.username} is ${data.status === 'online' ? 'online' : 'offline'}`,
                read: true,
                createdAt: new Date().toISOString(),
                type: 'system'
              };
              setMessages(prev => [...prev, statusMessage]);
            }
          }
          
          return updatedUsers;
        });
      });
      
      // Listen for typing status
      socketInstance.on('user:typing', (data: { from: string; isTyping: boolean }) => {
        console.log('Typing status update:', data);
        setTypingStatus(prev => ({
          ...prev,
          [data.from]: data.isTyping
        }));
      });
      
      // Handle socket errors
      socketInstance.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        // Don't auto-logout on connection error
      });
      
      // Handle disconnection
      socketInstance.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
      });
      
      // Load users
      fetchUsers();
    } catch (error) {
      console.error('Socket initialization error:', error);
      // Don't auto-logout on initialization error
      if (error instanceof Error && error.message.includes('No authentication token found')) {
        setAuthError('Authentication failed. Please log in again.');
      }
    }
    
    return () => {
      // Clean up listeners but don't disconnect
      const socket = getSocket();
      if (socket) {
        socket.off('message:receive');
        socket.off('user:status');
        socket.off('user:typing');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
      }
    };
  }, [currentUser, currentChat]);  // Added currentChat as dependency

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentUser && currentChat) {
      fetchMessages();
      messageApi.markAsRead(currentUser._id, currentChat);
    }
  }, [currentUser, currentChat, users]);

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuthForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      setIsLoading(true);
      let user;
      
      if (authMode === 'login') {
        user = await authApi.login(authForm.username, authForm.password);
      } else {
        user = await authApi.register(authForm.username, authForm.password);
      }
      
      setCurrentUser(user);
      setAuthForm({ username: '', password: '' });
      socketInitializedRef.current = false;
      setIsLoading(false);
    } catch (error) {
      console.error(`Error during ${authMode}:`, error);
      setAuthError(authMode === 'login' 
        ? 'Invalid username or password' 
        : 'Registration failed. Username may already exist.'
      );
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      // First clear the user state to immediately show login screen
      setCurrentUser(null);
      // Then clean up other state and resources
      disconnectSocket();
      setUsers([]);
      setMessages([]);
      setCurrentChat(null);
      socketInitializedRef.current = false;
      // Finally call the API to logout on the server
      await authApi.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await userApi.getUsers();
      const filteredUsers = fetchedUsers.filter((user: User) => user._id !== currentUser?._id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser || !currentChat) return;
    
    try {
      const fetchedMessages = await messageApi.getMessages(currentUser._id, currentChat);
      const typedMessages: Message[] = fetchedMessages.map((msg: any) => ({
        ...msg,
        type: 'text' as const
      }));
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUser || !currentChat) return;
    
    try {
      // Make sure the socket is initialized before sending
      if (!getSocket()) {
        try {
          initializeSocket();
        } catch (error) {
          console.error('Failed to initialize socket for sending message:', error);
          return;
        }
      }
      
      // Create a temporary message object for immediate display
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        sender: currentUser._id,
        recipient: currentChat,
        content: messageInput,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'text'
      };
      
      // Update UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Send message through socket.io
      sendMessage(currentChat, messageInput);
      
      // Also send through API for persistence
      const newMessage = await messageApi.sendMessage(
        currentUser._id,
        currentChat,
        messageInput
      );
      
      // Replace the temporary message with the actual one from the server
      const typedMessage: Message = {
        ...newMessage,
        type: 'text'
      };
      
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessage._id ? typedMessage : msg
        )
      );
      
      setMessageInput('');
      handleTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message if sending failed
      setMessages(prev => 
        prev.filter(msg => !msg._id.startsWith('temp-'))
      );
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentUser || !currentChat) return;
    
    setTypingStatus(prev => ({
      ...prev,
      [currentUser._id]: isTyping
    }));
    
    try {
      // Try to get the socket, if not available, initialize it
      let socketInstance = getSocket();
      if (!socketInstance) {
        try {
          socketInstance = initializeSocket();
          socketInitializedRef.current = true;
        } catch (error) {
          console.error('Failed to initialize socket for typing status:', error);
          return;
        }
      }
      
      socketInstance.emit('user:typing', { to: currentChat, isTyping });
      
      if (typingTimeoutRef.current[currentChat]) {
        clearTimeout(typingTimeoutRef.current[currentChat]);
      }
      
      if (isTyping) {
        typingTimeoutRef.current[currentChat] = setTimeout(() => {
          handleTyping(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping(e.target.value.length > 0);
  };

  // Toggle between user list and chat in mobile view
  const toggleMobileView = () => {
    setShowMobileChat(!showMobileChat);
  };

  // Handle selecting a user in mobile view
  const handleUserSelect = (userId: string) => {
    setCurrentChat(userId);
    // In mobile view, show chat area when a user is selected
    setShowMobileChat(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthFormComponent
        authMode={authMode}
        authError={authError}
        authForm={authForm}
        onAuthSubmit={handleAuthSubmit}
        onAuthInputChange={handleAuthInputChange}
        onAuthModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError('');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`
          md:relative
          w-full md:w-1/3 lg:w-1/4
          max-w-full md:max-w-[350px]
          h-full
          bg-white
          ${showMobileChat ? 'hidden md:block' : 'block'}
        `}
      >
        <UserList
          users={users}
          currentUser={currentUser}
          currentChat={currentChat}
          typingStatus={typingStatus}
          onUserSelect={handleUserSelect}
          onLogout={handleLogout}
        />
      </div>

      {/* Chat Area */}
      <div 
        className={`
          flex-1 flex flex-col h-full
          ${showMobileChat ? 'block' : 'hidden md:flex'}
        `}
      >
        <ChatArea
          currentUser={currentUser}
          currentChat={currentChat}
          messages={messages}
          messageInput={messageInput}
          typingStatus={typingStatus}
          users={users}
          onSendMessage={handleSendMessage}
          onInputChange={handleInputChange}
          messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          onToggleMobileView={toggleMobileView}
        />
      </div>
    </div>
  );
};

export default App;