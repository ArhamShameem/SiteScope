const express = require('express');
const passport = require('passport');

const {
  signupValidation,
  loginValidation,
  signup,
  login,
  getCurrentUser,
  logout,
  oauthRedirect,
  oauthFailure,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post('/signup', signupValidation, validateRequest, signup);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/oauth/failure',
  }),
  oauthRedirect
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/api/auth/oauth/failure',
  }),
  oauthRedirect
);
router.get('/oauth/failure', oauthFailure);

module.exports = router;
