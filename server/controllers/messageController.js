const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }
        
        const newMessage = new Message({ name, email, subject, message });
        await newMessage.save();
        res.status(201).json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }
        await Message.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Message removed' });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ msg: 'Server Error' });
    }
};
