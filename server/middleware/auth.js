import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { inMemoryStore } from '../services/inMemoryStore.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const BEARER_PREFIX = 'Bearer ';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    throw new AppError('Authentication required', 401);
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'transitai_studio_jwt_secret_dev_key_2024');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }

    throw new AppError('Invalid token', 401);
  }

  let user = null;
  if (mongoose.connection.readyState === 1) {
    try {
      user = await User.findById(payload.id);
    } catch {
      user = null;
    }
  }

  if (!user) {
    user = inMemoryStore.findUserById(payload.id);
  }

  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Insufficient permissions', 403));
