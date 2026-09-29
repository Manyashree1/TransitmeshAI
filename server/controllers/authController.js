import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { inMemoryStore } from '../services/inMemoryStore.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DEMO_PASSWORD, ensureDemoUsers } from '../utils/demoUsers.js';

const createToken = user =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'transitai_studio_jwt_secret_dev_key_2024', {
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

  if (mongoose.connection.readyState === 1) {
    const existingUser = await User.exists({
      email: req.body.email.toLowerCase(),
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash: await bcrypt.hash(req.body.password, 10),
      role: 'PASSENGER',
    });

    return res.status(201).json({ token: createToken(user), user });
  }

  // In-memory fallback
  if (inMemoryStore.findUserByEmail(req.body.email)) {
    throw new AppError('Email already registered', 409);
  }

  const user = await inMemoryStore.createUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: 'PASSENGER',
  });

  const safeUser = { _id: user._id, name: user.name, email: user.email, role: user.role };
  res.status(201).json({ token: createToken(user), user: safeUser });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isDemoAccount = normalizedEmail.endsWith('@transitai.local');

  if (mongoose.connection.readyState === 1) {
    let user = await User.findOne({ email: normalizedEmail });

    if (isDemoAccount && (password === DEMO_PASSWORD || password === 'Transit123!' || password === 'password')) {
      if (!user) {
        await ensureDemoUsers();
        user = await User.findOne({ email: normalizedEmail });
      }
      if (user) {
        return res.json({ token: createToken(user), user: user.toJSON ? user.toJSON() : user });
      }
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid email or password', 401);
    }

    return res.json({ token: createToken(user), user: user.toJSON ? user.toJSON() : user });
  }

  // In-memory fallback
  let user = inMemoryStore.findUserByEmail(normalizedEmail);
  if (!user && isDemoAccount) {
    const demoDef = DEMO_USERS.find(d => d.email.toLowerCase() === normalizedEmail);
    if (demoDef) {
      user = await inMemoryStore.createUser({
        name: demoDef.name,
        email: demoDef.email,
        password: DEMO_PASSWORD,
        role: demoDef.role,
      });
    }
  }

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const validPassword =
    (isDemoAccount && (password === DEMO_PASSWORD || password === 'Transit123!' || password === 'password')) ||
    (await bcrypt.compare(password, user.passwordHash));

  if (!validPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  const safeUser = { _id: user._id, name: user.name, email: user.email, role: user.role };
  res.json({ token: createToken(user), user: safeUser });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
