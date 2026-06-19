import Room from '../models/Room.js';
import User from '../models/User.js';

// Utility to generate a numeric 6-digit code as string
const generate6DigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Ensure generated code is unique (limited retries)
export const generateUniqueJoinCode = async () => {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generate6DigitCode();
    const exists = await Room.findOne({ joinCode: code });
    if (!exists) return code;
  }
  throw new Error('Unable to generate unique join code');
};

// @desc    Get all rooms (Group rooms + direct rooms for current user)
// @route   GET /api/rooms
// @access  Private
export const getRooms = async (req, res) => {
  try {
    // Find all group rooms OR DM rooms where the current user is a participant
    const rooms = await Room.find({
      $or: [
        { isGroup: true },
        { isGroup: false, participants: req.user._id }
      ]
    })
      .populate('participants', 'username avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      })
      .sort({ updatedAt: -1 }); // Sort by latest message/activity

    // For each room, indicate whether the current user is a member and/or creator.
    // Only the creator should retain the joinCode value.
    const processed = rooms.map((r) => {
      const roomObj = r.toObject();
      const isMember = Array.isArray(roomObj.participants) && roomObj.participants.some(p => p._id.toString() === req.user._id.toString());
      const isCreator = roomObj.createdBy && roomObj.createdBy.toString() === req.user._id.toString();
      roomObj.isMember = isMember;
      roomObj.isCreator = isCreator;
      if (!isCreator) {
        delete roomObj.joinCode;
      }
      return roomObj;
    });

    return res.status(200).json({ success: true, data: processed });
  } catch (error) {
    console.error(`GetRooms error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving rooms' });
  }
};

// @desc    Create a group room
// @route   POST /api/rooms/group
// @access  Private
export const createGroupRoom = async (req, res) => {
  const { name } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Room name is required' });
    }

    const roomExists = await Room.findOne({ name, isGroup: true });
    if (roomExists) {
      return res.status(400).json({ success: false, message: 'Group room name already exists' });
    }

    // Generate avatar using initials
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;

    // Generate a unique 6-digit join code for this group
    const joinCode = await generateUniqueJoinCode();

    const newRoom = await Room.create({
      name,
      isGroup: true,
      avatar,
      joinCode,
      createdBy: req.user._id,
      participants: [req.user._id]
    });

    const populatedRoom = await Room.findById(newRoom._id)
      .populate('participants', 'username avatar status lastSeen');

    const response = populatedRoom.toObject();
    response.isCreator = true;
    response.isMember = true;
    response.joinCode = joinCode;
    return res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error(`CreateGroupRoom error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error creating group room' });
  }
};

// @desc    Join a group room by 6-digit code
// @route   POST /api/rooms/join
// @access  Private
export const joinGroupByCode = async (req, res) => {
  const { code } = req.body;

  try {
    if (!code) {
      return res.status(400).json({ success: false, message: 'Join code is required' });
    }

    const room = await Room.findOne({ joinCode: code, isGroup: true });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Group not found for provided code' });
    }

    // If already participant, return existing room with member metadata, but do not expose joinCode.
    if (room.participants.some(p => p.toString() === req.user._id.toString())) {
      const populated = await Room.findById(room._id).populate('participants', 'username avatar status lastSeen');
      const roomObj = populated.toObject();
      roomObj.isMember = true;
      roomObj.isCreator = roomObj.createdBy && roomObj.createdBy.toString() === req.user._id.toString();
      if (!roomObj.isCreator) {
        delete roomObj.joinCode;
      }
      return res.status(200).json({ success: true, message: 'Already a member', data: roomObj });
    }

    // Add user to participants atomically using $addToSet
    const updatedRoom = await Room.findByIdAndUpdate(
      room._id,
      { $addToSet: { participants: req.user._id } },
      { new: true }
    )
      .populate('participants', 'username avatar status lastSeen')
      .exec();

    const roomObj = updatedRoom.toObject();
    roomObj.isMember = true;
    roomObj.isCreator = false;
    delete roomObj.joinCode;
    return res.status(200).json({ success: true, message: 'Joined group', data: roomObj });
  } catch (error) {
    console.error(`JoinGroupByCode error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error joining group' });
  }
};

// @desc    Get or create a 1-to-1 DM room
// @route   POST /api/rooms/dm
// @access  Private
export const getOrCreateDM = async (req, res) => {
  const { recipientId } = req.body;

  try {
    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start a DM with yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // Find if 1-to-1 room already exists between these two users
    let room = await Room.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, recipientId], $size: 2 }
    })
      .populate('participants', 'username avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username'
        }
      });

    if (room) {
      return res.status(200).json({ success: true, data: room });
    }

    // If it doesn't exist, create it
    room = await Room.create({
      isGroup: false,
      participants: [req.user._id, recipientId],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipient.username)}`
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('participants', 'username avatar status lastSeen');

    return res.status(201).json({ success: true, data: populatedRoom });
  } catch (error) {
    console.error(`GetOrCreateDM error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error creating direct chat' });
  }
};

// @desc    Get all users except current user (for starting new direct chats)
// @route   GET /api/rooms/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username avatar status lastSeen')
      .sort({ username: 1 });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error(`GetAllUsers error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving users' });
  }
};
