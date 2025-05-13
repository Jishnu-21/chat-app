const jwt = require('jsonwebtoken');
const User = require('../model/User');

// JWT secret key - should be in environment variables in production
const JWT_SECRET = "12345678";

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
