import {test,describe} from 'node:test';
import assert from 'node:assert';
import {estimateEta} from '../../services/etaService.js';

describe('etaService',()=>{
  test('returns segment count * 4 + delay',async()=>{
    const route={stops:[{_id:'a'},{_id:'b'},{_id:'c'},{_id:'d'}]};
    const result=await estimateEta(route,'a','c',0);
    assert.strictEqual(result,8)
  });
  test('includes delay minutes',async()=>{
    const route={stops:[{_id:'a'},{_id:'b'},{_id:'c'}]};
    const result=await estimateEta(route,'a','c',5);
    assert.strictEqual(result,13)
  });
  test('defaults to next stop when destination missing',async()=>{
    const route={stops:[{_id:'a'},{_id:'b'},{_id:'c'}]};
    const result=await estimateEta(route,'a',null,0);
    assert.strictEqual(result,4)
  });
  test('handles same current and destination as 1 segment',async()=>{
    const route={stops:[{_id:'a'},{_id:'b'}]};
    const result=await estimateEta(route,'a','a',0);
    assert.strictEqual(result,4)
  });
  test('returns at least 1 segment worth of time',async()=>{
    const route={stops:[]};
    const result=await estimateEta(route,null,null,0);
    assert.strictEqual(result,4)
  })
});
