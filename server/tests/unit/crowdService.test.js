import {test,describe} from 'node:test';
import assert from 'node:assert';
import {crowdPenalty} from '../../services/crowdService.js';

describe('crowdService',()=>{
  describe('crowdPenalty',()=>{
    test('returns correct penalty for each level',()=>{
      assert.strictEqual(crowdPenalty('LOW'),0);
      assert.strictEqual(crowdPenalty('MEDIUM'),10);
      assert.strictEqual(crowdPenalty('HIGH'),25);
      assert.strictEqual(crowdPenalty('FULL'),45);
      assert.strictEqual(crowdPenalty('UNKNOWN'),15)
    });
    test('returns default for unknown level',()=>{
      assert.strictEqual(crowdPenalty('INVALID'),15)
    })
  })
});
