// Explicit opt-in live integration test: one paid request; no browser actions.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createApp } from './server.mjs';
if (!process.argv.includes('--live')) throw Error('Use --live to authorise one paid integration request.');
const secret=randomBytes(32).toString('hex');
const app=createApp({ownerSecret:secret,dailyLimit:1});
await new Promise(r=>app.listen(3188,'127.0.0.1',r));
const base='http://127.0.0.1:3188';
const headers={Origin:'https://itproguy.com','Content-Type':'application/json'};
try {
  const login=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({code:secret})});
  assert.equal(login.status,200);
  const Cookie=login.headers.get('set-cookie').split(';')[0];
  const res=await fetch(base+'/api/axel',{method:'POST',headers:{...headers,Cookie},body:JSON.stringify({prompt:'Connection test only. Reply exactly: Axel integration ready.'})});
  const result=await res.json();
  assert.equal(res.status,200);assert.equal(result.status,'complete');
  assert.match(result.text,/Axel integration ready/);
  console.log(JSON.stringify({test:'owner API to Claude',status:'passed',model:result.model}));
} catch(e) { console.error('Live integration check failed; key and response details hidden.'); process.exitCode=1; }
finally { await new Promise(r=>app.close(r)); }
