const jwt = require('jsonwebtoken');

const User = require('../models/User');
const asyncHandler = require('./asyncHandler');
const { cookieName } = require('../utils/jwt');

const protect = asyncHandler(async (req, _res, next) => {
  const token = req.cookies[cookieName];

  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = 'Invalid or expired token';
    }

    throw error;
  }
});

module.exports = { protect };
