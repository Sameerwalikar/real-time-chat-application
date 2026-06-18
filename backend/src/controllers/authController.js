import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper to generate and set JWT token in cookie and response
const generateToken = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-12345';
  const token = jwt.sign({ id: userId }, secret, { expiresIn: '7d' });

  // Cooke settings
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Create avatar using a free UI initials service
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;

    const user = await User.create({
      username,
      password,
      isGuest: false,
      avatar,
      status: 'offline',
    });

    const token = generateToken(res, user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isGuest: user.isGuest,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(`Register error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username });
    if (!user || user.isGuest) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(res, user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isGuest: user.isGuest,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Guest Login (No password required)
// @route   POST /api/auth/guest
// @access  Public
export const guestLogin = async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required for guest mode' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    // Check if user exists. If it exists and is a registered user, prevent overwrite.
    let user = await User.findOne({ username });
    if (user && !user.isGuest) {
      return res.status(400).json({ success: false, message: 'Username is reserved by a registered user' });
    }

    // If guest exists, we let them login, otherwise we create them.
    if (!user) {
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      user = await User.create({
        username,
        isGuest: true,
        avatar,
        status: 'offline',
      });
    }

    const token = generateToken(res, user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isGuest: user.isGuest,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(`Guest login error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during guest login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        isGuest: req.user.isGuest,
        status: req.user.status,
      },
    });
  } catch (error) {
    console.error(`GetMe error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(`Logout error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during logout' });
  }
};
