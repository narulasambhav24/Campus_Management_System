const User = require('../models/User');
const asyncHandler = require('./asyncHandler');
const createAppError = require('../utils/appError');
const { verifyToken } = require('../utils/jwt');

const sanitizeUser = (userDocument) => {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;
  const { password, ...safeUser } = user;
  return safeUser;
};

const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createAppError('Authorization token is required', 401);
  }

  const token = authHeader.replace('Bearer ', '').trim();

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    throw createAppError('Invalid or expired token', 401);
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw createAppError('User no longer exists', 401);
  }

  req.user = sanitizeUser(user);
  req.token = token;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(createAppError('Authentication required', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(createAppError('You are not authorized to perform this action', 403));
  }

  next();
};

module.exports = {
  requireAuth,
  requireRole,
};
