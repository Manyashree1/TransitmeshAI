import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const DEMO_PASSWORD = 'Transit123!';

export const DEMO_USERS = [
  { name: 'Priya Passenger', email: 'passenger@transitai.local', role: 'PASSENGER' },
  { name: 'Dev Driver', email: 'driver@transitai.local', role: 'DRIVER' },
  { name: 'Asha Admin', email: 'admin@transitai.local', role: 'ADMIN' },
];

export async function ensureDemoUsers() {
  const emails = DEMO_USERS.map(user => user.email.toLowerCase());
  const existing = await User.find({ email: { $in: emails } }).select('email').lean();
  const existingSet = new Set(existing.map(user => user.email.toLowerCase()));

  const created = [];
  for (const demoUser of DEMO_USERS) {
    const email = demoUser.email.toLowerCase();
    if (existingSet.has(email)) {
      continue;
    }

    const user = await User.create({
      name: demoUser.name,
      email,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      role: demoUser.role,
    });

    created.push(user);
    existingSet.add(email);
  }

  const allUsers = await User.find({ email: { $in: emails } }).lean();
  return DEMO_USERS.map(demoUser => {
    const email = demoUser.email.toLowerCase();
    return allUsers.find(user => user.email.toLowerCase() === email) || null;
  }).filter(Boolean);
}
