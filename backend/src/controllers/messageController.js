import Message from '../models/Message.js';
import Room from '../models/Room.js';

// @desc    Get message history for a room
// @route   GET /api/messages/:roomId
// @access  Private
export const getMessages = async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Verify the user is a participant for both DM and group rooms
    const isParticipant = room.participants.map(String).includes(req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You must join the group to view messages. Use the join code.' });
    }

    // Retrieve messages
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username avatar status')
      .sort({ createdAt: 1 }); // Oldest first

    // Asynchronously mark messages as read by current user (if not already in readBy)
    await Message.updateMany(
      { room: roomId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error(`GetMessages error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving messages' });
  }
};
