const jwt = require('jsonwebtoken');

const cookieName = 'auth_token';

function generateToken(userId) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(cookieName, token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(cookieName, {
    ...getCookieOptions(),
    maxAge: undefined,
  });
}

module.exports = {
  cookieName,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
};
