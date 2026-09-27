import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createSocketController } from '../../../client/src/services/socketManager.js';

describe('socket manager', () => {
  test('refreshes on reconnect and keeps a single controller lifecycle', () => {
    const events = {};
    const socket = {
      on(event, callback) {
        events[event] = events[event] || [];
        events[event].push(callback);
        return this;
      },
      off(event, callback) {
        if (!events[event]) return this;
        if (callback) {
          events[event] = events[event].filter(item => item !== callback);
        } else {
          events[event] = [];
        }
        return this;
      },
      disconnect() {
        this.disconnected = true;
      },
      disconnected: false,
    };

    let status = 'unknown';
    let refreshCount = 0;

    const controller = createSocketController({
      socketFactory: () => socket,
      onRefresh: () => refreshCount += 1,
      onStatus: next => {
        status = next;
      },
      eventNames: ['bus:location'],
    });

    assert.ok(events.connect);
    assert.ok(events.reconnect);
    events.connect[0]();
    events.reconnect[0]();
    assert.equal(refreshCount, 2);
    assert.equal(status, 'online');

    controller.destroy();
    assert.equal(events.connect.length, 0);
    assert.equal(events.reconnect.length, 0);
    assert.equal(events['bus:location'].length, 0);
  });
});
