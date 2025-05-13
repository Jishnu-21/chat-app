import { useState, useEffect, useRef } from 'react';
import { userApi, messageApi, authApi } from './services/api';
import { initializeSocket, disconnectSocket, sendMessage, getSocket } from './services/socket';
import { Socket } from 'socket.io-client';

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
      socketInstance.on('connect_error', (error) => {
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
      
      const chatUser = users.find(u => u._id === currentChat);
      if (chatUser) {
        const statusMessage: Message = {
          _id: `status-initial-${Date.now()}`,
          sender: 'system',
          recipient: currentUser._id,
          content: `${chatUser.username} is ${chatUser.status === 'online' ? 'online' : 'offline'}`,
          read: true,
          createdAt: new Date().toISOString(),
          type: 'system'
        };
        setMessages([statusMessage]);
      }
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
      
      // Reset socket initialization flag
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
      await authApi.logout();
      disconnectSocket();
      setCurrentUser(null);
      setUsers([]);
      setMessages([]);
      setCurrentChat(null);
      socketInitializedRef.current = false;
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

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Chat App {authMode === 'login' ? 'Login' : 'Register'}</h1>
          
          {authError && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
              {authError}
            </div>
          )}
          
          <form onSubmit={handleAuthSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={authForm.username}
                onChange={handleAuthInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            {authMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  className="text-blue-500 hover:underline"
                >
                  Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  className="text-blue-500 hover:underline"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">
              {currentUser.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-4rem)]">
          {users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users available</div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${currentChat === user._id ? 'bg-blue-50' : ''}`}
                onClick={() => setCurrentChat(user._id)}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between">
                    <h2 className="font-medium text-gray-900">{user.username}</h2>
                  </div>
                  <p className="text-sm text-gray-500">
                    {typingStatus[user._id] ? (
                      <span className="text-green-600 font-medium flex items-center">
                        <span className="inline-block w-1.5 h-1.5 bg-green-600 rounded-full mr-1 animate-pulse"></span>
                        Typing...
                      </span>
                    ) : (
                      user.status === 'online' ? 'Online' : 'Offline'
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-200 bg-white flex items-center">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                  {users.find(u => u._id === currentChat)?.username.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                    users.find(u => u._id === currentChat)?.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></span>
              </div>
              <div className="ml-3">
                <h2 className="font-medium text-gray-900">
                  {users.find(u => u._id === currentChat)?.username}
                </h2>
                <p className={`text-xs ${
                  users.find(u => u._id === currentChat)?.status === 'online' 
                    ? typingStatus[currentChat] 
                      ? 'text-green-600 font-medium' 
                      : 'text-green-500'
                    : 'text-gray-500'
                }`}>
                  {users.find(u => u._id === currentChat)?.status === 'online' 
                    ? typingStatus[currentChat] 
                      ? 'Typing...' 
                      : 'Online'
                    : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-4">No messages yet. Start a conversation!</div>
              ) : (
                messages.map((msg) => (
                  msg.type === 'system' ? (
                    <div key={msg._id} className="flex justify-center my-2">
                      <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={msg._id} 
                      className={`mb-4 flex ${msg.sender === currentUser._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs p-3 rounded-lg ${
                          msg.sender === currentUser._id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p 
                          className={`text-xs mt-1 text-right ${
                            msg.sender === currentUser._id ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                ))
              )}
              
              {/* Typing indicator */}
              {typingStatus[currentChat] && (
                <div className="flex items-center text-gray-500 text-sm mb-2">
                  <div className="flex space-x-1 bg-gray-100 px-4 py-2 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-150"></div>
                    <span className="ml-2 text-gray-600 font-medium">Typing...</span>
                  </div>
                </div>
              )}
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
