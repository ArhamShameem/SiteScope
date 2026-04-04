const { body } = require('express-validator');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../utils/jwt');

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    provider: user.provider,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
  };
}

const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Za-z]/)
    .withMessage('Password must include a letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    provider: 'email',
  });

  res.status(201).json({
    message: 'Account created successfully',
    user: serializeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.password) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id.toString());
  setAuthCookie(res, token);

  res.json({
    message: 'Login successful',
    user: serializeUser(user),
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

function oauthRedirect(req, res) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const token = generateToken(req.user._id.toString());

  setAuthCookie(res, token);
  res.redirect(frontendUrl);
}

function oauthFailure(_req, res) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?error=oauth_failed`);
}

module.exports = {
  signupValidation,
  loginValidation,
  signup,
  login,
  getCurrentUser,
  logout,
  oauthRedirect,
  oauthFailure,
  serializeUser,
};
