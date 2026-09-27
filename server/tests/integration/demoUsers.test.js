import test from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDatabase, disconnectTestDatabase } from '../helpers/testDb.js';
import User from '../../models/User.js';
import { ensureDemoUsers } from '../../utils/demoUsers.js';

test('ensureDemoUsers creates the default demo accounts when missing', async () => {
  await connectTestDatabase();
  await User.deleteMany({});

  const results = await ensureDemoUsers();

  const expected = [
    'passenger@transitai.local',
    'driver@transitai.local',
    'admin@transitai.local',
  ];

  assert.deepEqual(results.map(user => user.email), expected);

  const saved = await User.find({ email: { $in: expected } }).lean();
  assert.equal(saved.length, 3);

  for (const user of saved) {
    assert.ok(user.role);
    assert.ok(user.name);
  }

  await disconnectTestDatabase();
});
