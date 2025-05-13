const jwt = require('jsonwebtoken');
const User = require('../model/User');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || '12345678';

if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set and no fallback value is available');
  process.exit(1);
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      iat: Math.floor(Date.now() / 1000)
    }, 
    JWT_SECRET, 
    {
      expiresIn: '30d' // Token expires in 30 days
    }
  );
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Enhanced validation
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    if (username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }
    
    if (password.trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create new user
    const newUser = new User({ username: username.trim(), password: password.trim() });
    const savedUser = await newUser.save();
    
    // Generate token
    const token = generateToken(savedUser._id);
    
    // Set user status to online
    savedUser.status = 'online';
    await savedUser.save();
    
    // Return user info and token (exclude password)
    const userResponse = {
      _id: savedUser._id,
      username: savedUser.username,
      status: savedUser.status,
      createdAt: savedUser.createdAt,
      token
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Enhanced validation
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Find user
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Set user status to online
    user.status = 'online';
    await user.save();
    
    // Return user info and token (exclude password)
    const userResponse = {
      _id: user._id,
      username: user.username,
      status: user.status,
      createdAt: user.createdAt,
      token
    };
    
    res.status(200).json(userResponse);
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    res.status(500).json({ message: 'Server error during login. Please try again.' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set user status to offline
    const user = await User.findById(userId);
    if (user) {
      user.status = 'offline';
      user.lastSeen = Date.now();
      await user.save();
    }
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
