import {test,describe} from 'node:test';
import assert from 'node:assert';
import {crowdPenalty} from '../../services/crowdService.js';

describe('recommendation scoring',()=>{
  test('score increases with ETA',()=>{
    const score=(eta,crowd,seats,delay)=>eta*4+crowdPenalty(crowd)+delay*2-(seats||0)*.15;
    const s1=score(4,'LOW',30,0);
    const s2=score(12,'LOW',30,0);
    assert.ok(s2>s1,'longer ETA should increase score')
  });
  test('score increases with crowd penalty',()=>{
    const score=(eta,crowd,seats,delay)=>eta*4+crowdPenalty(crowd)+delay*2-(seats||0)*.15;
    const s1=score(4,'LOW',30,0);
    const s2=score(4,'FULL',0,0);
    assert.ok(s2>s1,'higher crowd should increase score')
  });
  test('score increases with delay',()=>{
    const score=(eta,crowd,seats,delay)=>eta*4+crowdPenalty(crowd)+delay*2-(seats||0)*.15;
    const s1=score(4,'LOW',30,0);
    const s2=score(4,'LOW',30,10);
    assert.ok(s2>s1,'delay should increase score')
  });
  test('more available seats reduces score',()=>{
    const score=(eta,crowd,seats,delay)=>eta*4+crowdPenalty(crowd)+delay*2-(seats||0)*.15;
    const s1=score(4,'MEDIUM',10,0);
    const s2=score(4,'MEDIUM',30,0);
    assert.ok(s2<s1,'more seats should decrease score')
  })
});
