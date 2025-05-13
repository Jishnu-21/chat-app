const express = require('express');
const router = express.Router();
const User = require('../model/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(200).json(existingUser);
    }
    
    // Create new user
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['online', 'offline'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }
  
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'offline' && { lastSeen: Date.now() })
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
