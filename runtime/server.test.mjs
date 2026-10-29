import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './server.mjs';

test('owner-only API fails closed, isolates sessions and enforces limits', async () => {
  let calls=0;const code='test-owner-code-with-at-least-32-characters';
  const app=createApp({ownerSecret:code,dailyLimit:1,ask:async ({intent})=>{
    calls++;return {status:intent==='image_generation'?'blocked':'complete',text:'Ready for review.',model:'claude-haiku-5-5'};
  }});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.address().port;
  const headers={'Content-Type':'application/json',Origin:'https://itproguy.com'};
  const post=(path,data,extra={})=>fetch(base+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(data)});
  try {
    assert.equal((await post('/api/axel',{prompt:'Check site'})).status,401);
    assert.equal(calls,0);
    assert.equal((await post('/api/login',{code},{Origin:'https://other.example'})).status,403);
    assert.equal((await post('/api/login',{code:'wrong'})).status,401);
    const login=await post('/api/login',{code});assert.equal(login.status,200);
    const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);
    const Cookie=setCookie.split(';')[0];
    assert.equal((await (await fetch(base+'/api/session',{headers:{Cookie}})).json()).user.name,'Amit');
    const image=await post('/api/axel',{prompt:'Generate a logo'},{Cookie});assert.equal((await image.json()).status,'blocked');
    assert.equal((await post('/api/axel',{prompt:'Check site'},{Cookie})).status,200);
    assert.equal((await post('/api/axel',{prompt:'Check site again'},{Cookie})).status,429);
    assert.equal((await post('/api/axel',{prompt:'a'.repeat(9000)},{Cookie})).status,400);
    assert.equal((await post('/api/logout',{}, {Cookie})).status,200);
    assert.equal((await post('/api/axel',{prompt:'Check site'},{Cookie})).status,401);
    assert.equal(calls,2);
  } finally { await new Promise(r=>app.close(r)); }
});

test('missing owner credential prevents starting the API',()=>{
  assert.throws(()=>createApp(),/OWNER_ACCESS_NOT_CONFIGURED/);
});
