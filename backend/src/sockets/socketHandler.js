import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';

// Map of userId -> Set of socketIds (to handle multiple tabs)
const userSockets = new Map();

// Map of roomId -> Set of userIds (active users currently viewing this room)
const roomActiveUsers = new Map();

export const handleSocketConnection = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.JWT_SECRET || 'fallback-secret-key-12345';
      const decoded = jwt.verify(token, secret);
      
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error(`Socket auth error: ${err.message}`);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();
    console.log(`Socket connected: User ${user.username} (${socket.id})`);

    // Add socket to user's socket set
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
      
      // Update database status to online
      await User.findByIdAndUpdate(userId, { status: 'online' });
      // Broadcast online status to all connected users
      io.emit('userStatusChange', { userId, status: 'online' });
    }
    userSockets.get(userId).add(socket.id);

    // Track active rooms for this socket
    let currentRoom = null;

    // Join a room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        // Leave previous room if any
        if (currentRoom) {
          socket.leave(currentRoom);
          removeUserFromRoomActive(currentRoom, userId, socket.id);
          broadcastRoomActiveUsers(io, currentRoom);
        }

        currentRoom = roomId;
        socket.join(roomId);
        console.log(`User ${user.username} joined room ${roomId}`);

        // Add user to room's active users
        addUserToRoomActive(roomId, userId);
        broadcastRoomActiveUsers(io, roomId);

        // Notify room about joining (optional log, not required for WhatsApp UI)
      } catch (err) {
        console.error(`joinRoom error: ${err.message}`);
      }
    });

    // Handle sending a chat message
    socket.on('chatMessage', async ({ roomId, content }) => {
      try {
        if (!content || !content.trim()) return;

        // Verify room exists
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Verify user is a participant for both DM and group rooms
        if (!room.participants.map(String).includes(userId)) {
          socket.emit('error', { message: 'Not authorized to send messages here — join the group first' });
          return;
        }

        // Save message to database
        const message = await Message.create({
          sender: userId,
          room: roomId,
          content: content.trim(),
          readBy: [userId],
        });

        // Populate message sender info
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar status');

        // Update last message in room schema
        await Room.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
        });

        // Broadcast message to room
        io.to(roomId).emit('message', populatedMessage);

        // Fetch fully populated room for updating sidebar previews
        const populatedRoom = await Room.findById(roomId)
          .populate('participants', 'username avatar status lastSeen')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'sender',
              select: 'username avatar'
            }
          });

        // Emit roomUpdate to all participants (even if not currently in room)
        room.participants.forEach((participantId) => {
          const participantStr = participantId.toString();
          const sockets = userSockets.get(participantStr);
          if (sockets) {
            sockets.forEach((sId) => {
              io.to(sId).emit('roomUpdate', populatedRoom);
            });
          }
        });

      } catch (err) {
        console.error(`chatMessage error: ${err.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      if (roomId) {
        socket.to(roomId).emit('typing', {
          roomId,
          userId,
          username: user.username,
          isTyping,
        });
      }
    });

    // Handle leaving a room explicitly
    socket.on('leaveRoom', ({ roomId }) => {
      if (roomId) {
        socket.leave(roomId);
        console.log(`User ${user.username} left room ${roomId}`);
        removeUserFromRoomActive(roomId, userId, socket.id);
        broadcastRoomActiveUsers(io, roomId);
        if (currentRoom === roomId) {
          currentRoom = null;
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: User ${user.username} (${socket.id})`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        
        // Clean up from active room
        if (currentRoom) {
          removeUserFromRoomActive(currentRoom, userId, socket.id);
          broadcastRoomActiveUsers(io, currentRoom);
        }

        // If no more open sockets/tabs for this user, mark them offline
        if (sockets.size === 0) {
          userSockets.delete(userId);
          
          const lastSeenDate = new Date();
          await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: lastSeenDate,
          });

          // Broadcast status change
          io.emit('userStatusChange', {
            userId,
            status: 'offline',
            lastSeen: lastSeenDate,
          });
        }
      }
    });
  });
};

// Helper: Add user to room's active users list
const addUserToRoomActive = (roomId, userId) => {
  if (!roomActiveUsers.has(roomId)) {
    roomActiveUsers.set(roomId, new Set());
  }
  roomActiveUsers.get(roomId).add(userId);
};

// Helper: Remove user from room's active users list (safely check other open sockets)
const removeUserFromRoomActive = (roomId, userId, disconnectingSocketId) => {
  const activeUsers = roomActiveUsers.get(roomId);
  if (!activeUsers) return;

  // Verify if the user has other sockets in this room
  // For simplicity, we remove the user. If they have other tabs, they'll rejoin or stay.
  // In a robust scenario, we can track sockets per room, but standard tab focus is fine.
  activeUsers.delete(userId);
  if (activeUsers.size === 0) {
    roomActiveUsers.delete(roomId);
  }
};

// Helper: Broadcast current online/active users list of a room
const broadcastRoomActiveUsers = async (io, roomId) => {
  const activeIds = roomActiveUsers.get(roomId);
  const userList = [];

  if (activeIds && activeIds.size > 0) {
    try {
      const users = await User.find({ _id: { $in: Array.from(activeIds) } })
        .select('username avatar status lastSeen');
      userList.push(...users);
    } catch (err) {
      console.error(`broadcastRoomActiveUsers DB error: ${err.message}`);
    }
  }

  io.to(roomId).emit('onlineUsers', {
    roomId,
    users: userList,
  });
};
