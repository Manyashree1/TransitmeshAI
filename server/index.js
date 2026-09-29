import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/authRoutes.js';
import transitRoutes from './routes/transitRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { advanceSimulatedBuses } from './services/locationService.js';
import { ensureDemoUsers } from './utils/demoUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientRoot = path.resolve(__dirname, '../client');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET || 'transitai_studio_dev_jwt_secret_token_12345';
process.env.JWT_SECRET = jwtSecret;

const corsOptions = {
  origin(origin, callback) {
    callback(null, true);
  },
  credentials: true,
};

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: true,
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
  database: mongoose.connection.readyState === 1 ? 'connected' : 'in-memory-fallback',
  gpsSimulator: process.env.GPS_SIMULATOR_ENABLED !== 'false',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.get('/api/health', (req, res) => res.json({
  success: true,
  status: 'ok',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'in-memory-fallback',
  gpsSimulator: process.env.GPS_SIMULATOR_ENABLED !== 'false',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.use('/api/auth', authRoutes);
app.use('/api', transitRoutes);

// Graceful fallback for database offline errors as per AI Studio guidelines
app.use((err, req, res, next) => {
  if (
    err.name === 'MongooseError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    (err.message && err.message.includes('buffering timed out'))
  ) {
    console.warn('[AI Studio] Database offline — returning fallback response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

// Serve frontend assets
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// In dev mode when client/dist might not yet exist, attempt Vite middleware
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(path.join(clientDistPath, 'index.html'))) {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
      root: clientRoot,
    });
    app.use(vite.middlewares);
  } catch (err) {
    console.warn('Vite dev middleware not loaded:', err.message);
  }
}

// Client-side routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.use(notFound);
app.use(errorHandler);

io.on('connection', socket => {
  socket.emit('socket:ready', { at: new Date() });
});

process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error?.message || error);
});

mongoose.set('bufferCommands', false);

if (mongoUri) {
  mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 2500 })
    .then(async () => {
      console.log('MongoDB connected successfully');
      try {
        const demoUsers = await ensureDemoUsers();
        if (demoUsers.length) {
          console.log(`Demo accounts ready: ${demoUsers.map(user => user.email).join(', ')}`);
        }
      } catch (error) {
        console.warn('Failed to ensure demo accounts in MongoDB:', error.message);
      }
    })
    .catch(error => {
      console.warn('MongoDB not connected — operating with in-memory fallback store:', error.message);
    });
} else {
  console.log('No MONGODB_URI configured — operating with in-memory fallback store');
}

const port = process.env.PORT || 3000;

http.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${port} is already in use. Retrying in 1s...`);
    setTimeout(() => {
      try {
        http.close();
      } catch (closeErr) {
        // ignore
      }
      http.listen(port, '0.0.0.0');
    }, 1000);
  } else {
    console.error('[Server] Fatal HTTP server error:', err);
    process.exit(1);
  }
});

http.listen(port, '0.0.0.0', () => {
  console.log(`TransitAI running on http://0.0.0.0:${port}`);
});

const handleExit = () => {
  console.log('[Server] Gracefully shutting down...');
  try {
    io.close();
    http.close(() => {
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close(false);
      }
      process.exit(0);
    });
  } catch {
    process.exit(0);
  }
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

const gpsSimulatorEnabled = process.env.GPS_SIMULATOR_ENABLED !== 'false';
if (gpsSimulatorEnabled) {
  setInterval(async () => {
    try {
      const updates = await advanceSimulatedBuses();
      if (Array.isArray(updates) && updates.length) {
        updates.forEach(update => io.emit('bus:location', update));
      }
    } catch (error) {
      console.error('GPS simulator tick failed:', error.message);
    }
  }, 5000);
}
