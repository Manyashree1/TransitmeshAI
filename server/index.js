import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import transitRoutes from './routes/transitRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { advanceSimulatedBuses } from './services/locationService.js';
import { ensureDemoUsers } from './utils/demoUsers.js';

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri || !jwtSecret) {
  throw new Error('MONGODB_URI (or MONGO_URI) and JWT_SECRET are required');
}

const parseOrigins = value =>
  (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allowedOrigins = parseOrigins(
  process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || defaultOrigins.join(',')
);

const isLocalDevOrigin = origin =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin || '');

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
};

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({
  success: true,
  status: 'ok',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  gpsSimulator: process.env.GPS_SIMULATOR_ENABLED === 'true',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.get('/api/health', (req, res) => res.json({
  success: true,
  status: 'ok',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  gpsSimulator: process.env.GPS_SIMULATOR_ENABLED === 'true',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.use('/api/auth', authRoutes);
app.use('/api', transitRoutes);
app.use(notFound);
app.use(errorHandler);

io.on('connection', socket => {
  socket.emit('socket:ready', { at: new Date() });
});

process.on('unhandledRejection', error => {
  console.error(error);
  http.close(() => process.exit(1));
});

mongoose
  .connect(mongoUri)
  .then(async () => {
    try {
      const demoUsers = await ensureDemoUsers();
      if (demoUsers.length) {
        console.log(`Demo accounts ready: ${demoUsers.map(user => user.email).join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to ensure demo accounts', error);
    }

    const port = Number(process.env.PORT || 5000);
    http.listen(port, () => {
      console.log(`TransitAI API on ${port}`);
    });

    if (process.env.GPS_SIMULATOR_ENABLED === 'true') {
      setInterval(async () => {
        try {
          const updates = await advanceSimulatedBuses();
          updates.forEach(update => io.emit('bus:location', update));
        } catch (error) {
          console.error('GPS simulator tick failed', error.message);
        }
      }, 5000);
    }
  })
  .catch(error => {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  });
