const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const env = require('../config/env');

const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches JWT expiry of 1 day

const cookieOptions = {
  httpOnly: true, // not readable from JS — protects the token from XSS
  sameSite: 'lax',
  secure: env.cookieSecure,
  maxAge: COOKIE_MAX_AGE_MS,
};

const setAuthCookie = (res, user) => {
  res.cookie('token', signToken(user), cookieOptions);
};

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  setAuthCookie(res, user);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  setAuthCookie(res, user);
  res.json({ user });
});

const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: env.cookieSecure });
  res.json({ message: 'Logged out' });
};

const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  res.json({ user });
});

module.exports = { register, login, logout, me };
