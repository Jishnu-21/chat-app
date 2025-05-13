const express = require('express');
const router = express.Router();
const Message = require('../model/Message');

// Get messages between two users
router.get('/:userId/:recipientId', async (req, res) => {
  try {
    const { userId, recipientId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message
router.post('/', async (req, res) => {
  const { sender, recipient, content } = req.body;
  
  if (!sender || !recipient || !content) {
    return res.status(400).json({ message: 'Sender, recipient, and content are required' });
  }
  
  try {
    const newMessage = new Message({
      sender,
      recipient,
      content
    });
    
    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.patch('/read/:userId/:senderId', async (req, res) => {
  try {
    const { userId, senderId } = req.params;
    
    const result = await Message.updateMany(
      { recipient: userId, sender: senderId, read: false },
      { read: true }
    );
    
    res.status(200).json({ updated: result.nModified });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
