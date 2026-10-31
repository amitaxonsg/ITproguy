import test from 'node:test';
import assert from 'node:assert/strict';
import {Accounts} from './accounts.mjs';
import {createCustomerApp} from './customer-server.mjs';

async function setup({dailyLimit=10,userDailyLimit=3,aiClient={},ask}={}){
 const accounts=new Accounts(':memory:','customer-test-secret-with-at-least-32-chars');
 const oauth={health:()=>({google:true,microsoft:true}),handle:async()=>false};
 const calls=[];
 const app=createCustomerApp({accounts,oauth,mailToken:'configured',aiClient,dailyLimit,userDailyLimit,ask:ask??(async()=>({status:'complete',text:'Axel guidance is ready.',model:'claude-haiku-5-5',attempts:[{requestId:'req-test',usage:{input_tokens:12,output_tokens:20}}]})),mailSender:async()=>{},now:()=>Date.UTC(2026,9,30)});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.address().port;
 const origin='https://itproguy.com';
 const challenge=accounts.issueCode('amit@example.com');
 const loggedIn=accounts.verifyCode(challenge.email,challenge.code);
 const Cookie='__Host-axel='+loggedIn.token;
 return {accounts,app,base,origin,Cookie,loggedIn,calls};
}
const post=(s,path,data,Cookie)=>fetch(s.base+path,{method:'POST',headers:{Origin:s.origin,'Content-Type':'application/json',...(Cookie?{Cookie}:{})},body:JSON.stringify(data)});
test('customer API charges completed Axel guidance against trial time',async()=>{
 const s=await setup();
 try{
  const response=await post(s,'/api/axel',{prompt:'Help me plan a website update.'},s.Cookie);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.status,'complete');assert.equal(body.browserActions,false);assert.ok(body.trialDeductedSeconds>=1);assert.equal(body.chargedSeconds,body.trialDeductedSeconds+body.paidDeductedSeconds);assert.equal(body.remainingTrialSeconds,1800-body.trialDeductedSeconds);
  assert.equal(s.accounts.profile(s.loggedIn.user.id).trial_seconds,body.remainingTrialSeconds);
  assert.equal(s.accounts.db.prepare('SELECT status,model FROM usage').get().status,'complete');
  assert.deepEqual({...s.accounts.db.prepare('SELECT input_tokens,output_tokens,request_id FROM model_usage').get()},{input_tokens:12,output_tokens:20,request_id:'req-test'});
 }finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
test('customer API has no artificial daily request quota',async()=>{
 let calls=0;const s=await setup({dailyLimit:1,userDailyLimit:1,ask:async()=>{calls++;return {status:'complete',text:'Guidance',model:'claude-haiku-5-5',attempts:[]}}});
 try{for(let i=0;i<4;i++)assert.equal((await post(s,'/api/axel',{prompt:'Request '+i},s.Cookie)).status,200);assert.equal(calls,4)}
 finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
test('customer API charges paid seconds after trial is used',async()=>{
 const s=await setup();
 try{
  s.accounts.db.prepare('UPDATE users SET trial_seconds=0 WHERE id=?').run(s.loggedIn.user.id);
  s.accounts.db.prepare("INSERT INTO purchases(id,user_id,stripe_session,amount_cents,currency,seconds,remaining_seconds,expires,status) VALUES(?,?,?,?,?,?,?,?,?)").run('purchase-test',s.loggedIn.user.id,'cs-test',500,'USD',3600,3600,Date.UTC(2027,9,30),'paid');
  const response=await post(s,'/api/axel',{prompt:'Help with a paid task.'},s.Cookie);const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.trialDeductedSeconds,0);assert.ok(body.paidDeductedSeconds>=1);assert.equal(body.remainingPaidSeconds,3600-body.paidDeductedSeconds);
 }finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
test('customer API blocks work when both trial and paid time are empty',async()=>{
 let calls=0;const s=await setup({ask:async()=>{calls++;return {status:'complete',text:'Guidance',model:'claude-haiku-5-5',attempts:[]}}});
 try{s.accounts.db.prepare('UPDATE users SET trial_seconds=0 WHERE id=?').run(s.loggedIn.user.id);const response=await post(s,'/api/axel',{prompt:'No credits'},s.Cookie);assert.equal(response.status,402);assert.equal(calls,0)}
 finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
test('customer API does not charge failed or review-paused guidance',async()=>{
 const s=await setup({ask:async()=>({status:'needs_review',text:'Paused',model:'claude-haiku-5-5',attempts:[]})});
 try{const response=await post(s,'/api/axel',{prompt:'Review this'},s.Cookie);const body=await response.json();assert.equal(body.chargedSeconds,0);assert.equal(body.remainingTrialSeconds,1800);assert.equal(s.accounts.db.prepare('SELECT seconds FROM usage').get().seconds,0)}
 finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
test('customer API requires login and reports model connection status',async()=>{
 const s=await setup({aiClient:null});
 try{
  assert.equal((await post(s,'/api/axel',{prompt:'Help'},null)).status,401);
  const health=await (await fetch(s.base+'/api/health')).json();
  assert.equal(health.taskGuidance,false);assert.equal(health.browserActions,false);
 }finally{s.accounts.close();await new Promise(resolve=>s.app.close(resolve))}
});
