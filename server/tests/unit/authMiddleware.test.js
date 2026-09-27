import {test,describe} from 'node:test';
import assert from 'node:assert';
import {protect,authorize} from '../../middleware/auth.js';

describe('auth middleware',()=>{
  test('protect rejects missing token',async()=>{
    const req={headers:{}};
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await protect(req,{},next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,401)
  });
  test('protect rejects invalid token',async()=>{
    const req={headers:{authorization:'Bearer invalid'}};
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    await protect(req,{},next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,401);
    assert.strictEqual(capturedErr.message,'Invalid token');
  });
  test('authorize allows correct role',async()=>{
    const req={user:{role:'DRIVER'}};
    let called=false;
    const next=()=>{called=true};
    authorize('DRIVER','ADMIN')(req,{},next);
    assert.strictEqual(called,true)
  });
  test('authorize rejects wrong role',async()=>{
    const req={user:{role:'PASSENGER'}};
    let capturedErr;
    const next=(err)=>{capturedErr=err};
    authorize('DRIVER','ADMIN')(req,{},next);
    assert.ok(capturedErr,'expected error to be passed to next');
    assert.strictEqual(capturedErr.statusCode,403)
  })
});
