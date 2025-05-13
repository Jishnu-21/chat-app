const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./model/User');

// Import routes
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/authRoutes');

// Load environment variables
dotenv.config();

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/auth', authRoutes);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    console.log('Authenticating socket connection with token');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    
    // Verify that the user exists in the database
    User.findById(decoded.id)
      .then(user => {
        if (!user) {
          console.log('Socket auth failed: User not found');
          return next(new Error('Authentication error'));
        }
        
        console.log('Socket authenticated successfully for user:', user.username);
        next();
      })
      .catch(err => {
        console.error('Socket auth database error:', err);
        next(new Error('Authentication error'));
      });
  } catch (error) {
    console.error('Socket auth token verification error:', error.message);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, 'User ID:', socket.userId);
  
  // Handle user joining
  socket.join(socket.userId);
  
  // Update user status to online
  io.emit('user:status', { userId: socket.userId, status: 'online' });
  
  // Handle private messages
  socket.on('message:send', (data) => {
    const { to, message } = data;
    
    // Send to recipient
    io.to(to).emit('message:receive', {
      from: socket.userId,
      message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle typing status
  socket.on('user:typing', (data) => {
    const { to, isTyping } = data;
    io.to(to).emit('user:typing', {
      from: socket.userId,
      isTyping
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Update user status to offline
    io.emit('user:status', { userId: socket.userId, status: 'offline' });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
