const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const createAppError = require('../utils/appError');
const { signToken } = require('../utils/jwt');

const sanitizeUser = (userDocument) => {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;
  const { password, ...safeUser } = user;
  return safeUser;
};

const buildAuthResponse = (userDocument, message) => ({
  success: true,
  token: signToken({ userId: String(userDocument._id), role: userDocument.role }),
  user: sanitizeUser(userDocument),
  message,
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createAppError('Email and password are required', 400);
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createAppError('Invalid email or password', 401);
  }

  res.json(buildAuthResponse(user, 'Login successful'));
});

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw createAppError('Name, email, and password are required', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createAppError('Email already registered', 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    role: role || 'student',
  });

  res.status(201).json(buildAuthResponse(user, 'Account created successfully'));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json(users.map(sanitizeUser));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw createAppError('User not found', 404);
  }

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

module.exports = {
  login,
  signup,
  getAllUsers,
  getCurrentUser,
};
