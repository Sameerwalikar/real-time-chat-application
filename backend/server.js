import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import roomRoutes from './src/routes/roomRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';
import { handleSocketConnection } from './src/sockets/socketHandler.js';
import Room from './src/models/Room.js';

// Load Env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      } else {
        // In local development, fallback to allow all for ease of setup
        return callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Simple Status Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Seed default group rooms if none exist
const seedDefaultRooms = async () => {
  try {
    const groupRoomsCount = await Room.countDocuments({ isGroup: true });
    if (groupRoomsCount === 0) {
      console.log('Seeding default group rooms...');
      const defaults = ['General Chat', 'Tech Talk', 'Design Lab'];
      for (const name of defaults) {
        await Room.create({
          name,
          isGroup: true,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        });
      }
      console.log('Default group rooms seeded!');
    }
  } catch (error) {
    console.error(`Error seeding default rooms: ${error.message}`);
  }
};
seedDefaultRooms();

// Integrate Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all sockets to connect. Handled by connection logic.
    methods: ['GET', 'POST'],
  },
});

// Bind socket events
handleSocketConnection(io);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
