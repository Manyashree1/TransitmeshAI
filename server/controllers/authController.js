import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DEMO_PASSWORD, ensureDemoUsers } from '../utils/demoUsers.js';

const createToken = user =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const validateRegistration = ({ name, email, password }) => {
  if (!name || !email || !password || password.length < 6) {
    throw new AppError(
      'Name, valid email, and 6+ character password are required'
    );
  }
};

export const register = asyncHandler(async (req, res) => {
  validateRegistration(req.body);

  const existingUser = await User.exists({
    email: req.body.email.toLowerCase(),
  });

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    role: 'PASSENGER',
  });

  res.status(201).json({ token: createToken(user), user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required');
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user && email.toLowerCase().endsWith('@transitai.local')) {
    await ensureDemoUsers();
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (email.toLowerCase().endsWith('@transitai.local') && password === DEMO_PASSWORD) {
      await ensureDemoUsers();
      user = await User.findOne({ email: email.toLowerCase() });
    }
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  res.json({ token: createToken(user), user: user.toJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
