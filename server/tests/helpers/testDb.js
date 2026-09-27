import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import mongoose from 'mongoose';

const TEST_URI = 'mongodb://127.0.0.1:27017/transitai_mesh_test';
let runningServer = null;
let tempRoot = null;

function getMongoBinary() {
  return process.env.MONGOD_PATH || 'mongod';
}

async function startLocalMongo() {
  const mongoBin = getMongoBinary();
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'transitai-mesh-'));
  const dbPath = path.join(tempRoot, 'db');
  const logPath = path.join(tempRoot, 'mongod.log');

  await fs.mkdir(dbPath, { recursive: true });

  const child = spawn(mongoBin, [
    '--dbpath', dbPath,
    '--port', '27017',
    '--bind_ip', '127.0.0.1',
    '--logpath', logPath,
    '--logappend',
  ], {
    stdio: 'ignore',
  });

  runningServer = child;
  process.env.MONGODB_URI = TEST_URI;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), 2500);

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mongod exited with code ${code}`));
      }
    });
  });
}

export async function connectTestDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 1500 });
    process.env.MONGODB_URI = TEST_URI;
    return mongoose.connection;
  } catch (error) {
    if (!runningServer) {
      await startLocalMongo();
    }
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 10000 });
    return mongoose.connection;
  }
}

export async function disconnectTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (runningServer) {
    await new Promise((resolve) => {
      const child = runningServer;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 5000);

      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });

      child.kill('SIGTERM');
    });

    runningServer = null;
  }

  if (tempRoot) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
}
