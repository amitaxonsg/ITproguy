import test from 'node:test';
import assert from 'node:assert/strict';
import {PilotService} from './pilot.mjs';

function setup(responses=[]){
 const calls=[],audit=[],typed=[],finished=[];
 const accounts={db:{exec(){},prepare(sql){return{run(...args){audit.push({sql,args})},get(){return{account_status:'active'}}}}}};
 const page={url:()=> 'https://example.com/',keyboard:{insertText:async text=>typed.push(text),press:async key=>typed.push(key)},mouse:{click:async()=>{},wheel:async()=>{}},screenshot:async()=>Buffer.from('jpeg'),title:async()=> 'Example'};
 const browser={idleMs:1,maxSessions:2,sessions:new Map(),available:()=>true,closeSession:async id=>browser.sessions.delete(id)};
 const client={messages:{create:async request=>{calls.push(request);return responses.shift()||{content:[{type:'text',text:'Finished.'}],stop_reason:'end_turn',usage:{}}}}};
 const pilot=new PilotService({browser,client,accounts,reserveUsage:()=>1,finishUsage:(...x)=>{finished.push(x);return{remainingTrialSeconds:100}}});
 const user={id:'one',account_status:'active'};
 return{pilot,browser,page,user,calls,audit,typed,finished}
}
const wait=()=>new Promise(r=>setTimeout(r,20));

test('pilot derives ownership from the signed-in user and rejects stale task IDs',async()=>{
 const s=setup();try{await assert.rejects(()=>s.pilot.command(null,{action:'start',prompt:'test'}),/SIGN_IN_REQUIRED/);const t=await s.pilot.start(s.user,'Check example.com');await wait();await assert.rejects(()=>s.pilot.command({...s.user,id:'two'},{action:'takeover',taskId:t.id}),/NO_ACTIVE_PILOT/);await assert.rejects(()=>s.pilot.command(s.user,{action:'takeover',taskId:'old'}),/PILOT_TASK_CHANGED/)}finally{await s.pilot.close()}
});
test('private takeover input never enters the model transcript or audit and does not invoke the model',async()=>{
 const s=setup();try{const t=await s.pilot.start(s.user,'Check example.com');await wait();s.browser.sessions.set(s.user.id,{page:s.page});await s.pilot.command(s.user,{action:'takeover',taskId:t.id});const count=s.calls.length;await s.pilot.command(s.user,{action:'input',taskId:t.id,kind:'text',text:'private-test-value'});assert.deepEqual(s.typed,['private-test-value']);assert.equal(s.calls.length,count);assert.doesNotMatch(JSON.stringify(s.audit),/private-test-value/);assert.doesNotMatch(JSON.stringify(s.pilot.tasks.get(s.user.id).messages),/private-test-value/);assert.equal(s.pilot.tasks.get(s.user.id).status,'takeover')}finally{await s.pilot.close()}
});
test('model interaction is proposed and cannot execute until the matching customer approval',async()=>{
 const s=setup([{content:[{type:'tool_use',id:'tool-1',name:'key',input:{key:'Enter',reason:'Submit the search'}}],stop_reason:'tool_use',usage:{}}]);try{s.browser.sessions.set(s.user.id,{page:s.page});const t=await s.pilot.start(s.user,'Search example.com');await wait();const state=s.pilot.state(s.pilot.tasks.get(s.user.id));assert.equal(state.status,'approval');assert.deepEqual(s.typed,[]);await assert.rejects(()=>s.pilot.command(s.user,{action:'approve',taskId:t.id,approvalId:'wrong'}),/APPROVAL_EXPIRED/);assert.deepEqual(s.typed,[]);await s.pilot.command(s.user,{action:'reject',taskId:t.id,approvalId:state.approval.id});await wait();assert.deepEqual(s.typed,[]);assert.equal(s.pilot.tasks.get(s.user.id).status,'complete')}finally{await s.pilot.close()}
});
test('takeover requires an explicit resume and private input cannot be sent while agent runs',async()=>{
 const s=setup();try{const t=await s.pilot.start(s.user,'Check example.com');await wait();s.browser.sessions.set(s.user.id,{page:s.page});await assert.rejects(()=>s.pilot.command(s.user,{action:'input',taskId:t.id,kind:'text',text:'test'}),/TAKE_CONTROL_FIRST/);await s.pilot.command(s.user,{action:'takeover',taskId:t.id});const calls=s.calls.length;await wait();assert.equal(s.calls.length,calls);await s.pilot.command(s.user,{action:'resume',taskId:t.id});await wait();assert.equal(s.calls.length,calls+1)}finally{await s.pilot.close()}
});
test('credential-shaped chat text is rejected before any model request',async()=>{
 const s=setup();try{await assert.rejects(()=>s.pilot.start(s.user,'password: dummy-sensitive-value'),/PRIVATE_INPUT_IN_CHAT/);assert.equal(s.calls.length,0);assert.equal(s.pilot.tasks.size,0)}finally{await s.pilot.close()}
});
test('only the exact pending approval executes once',async()=>{
 const s=setup([{content:[{type:'tool_use',id:'tool-2',name:'key',input:{key:'Enter',reason:'Submit search'}}],stop_reason:'tool_use',usage:{}}]);let executed=0;try{s.browser.sessions.set(s.user.id,{page:s.page});s.pilot.perform=async()=>{executed++;return{verified:true}};const t=await s.pilot.start(s.user,'Search');await wait();const pending=s.pilot.state(s.pilot.tasks.get(s.user.id)).approval;await s.pilot.command(s.user,{action:'approve',taskId:t.id,approvalId:pending.id});await wait();assert.equal(executed,1);await assert.rejects(()=>s.pilot.command(s.user,{action:'approve',taskId:t.id,approvalId:pending.id}),/APPROVAL_EXPIRED/);assert.equal(executed,1)}finally{await s.pilot.close()}
});
test('pilot HTTP handler denies unauthenticated and cross-origin requests before reading input',async()=>{
 const s=setup();const result=[];let read=0;const options={send:(res,status,body)=>result.push({status,body}),readBody:async()=>{read++;return{}},originAllowed:false};try{await s.pilot.handle({method:'GET',headers:{}},{},{...options,user:null});assert.equal(result.pop().status,401);await s.pilot.handle({method:'POST',headers:{'content-type':'application/json'}},{},{...options,user:s.user});assert.equal(result.pop().status,403);assert.equal(read,0);await s.pilot.handle({method:'GET',headers:{}},{},{...options,user:{id:'paused',account_status:'suspended'}});assert.equal(result.pop().status,403)}finally{await s.pilot.close()}
});
test('a login field in a child frame pauses before any model screenshot is captured',async()=>{
 const s=setup();try{const t=await s.pilot.start(s.user,'Check');await wait();s.page.frames=()=>[{locator:()=>({count:async()=>0})},{locator:()=>({count:async()=>1})}];s.browser.sessions.set(s.user.id,{page:s.page});s.pilot.capture=async()=>{throw Error('must not capture for model')};const value=await s.pilot.inspect(s.pilot.tasks.get(s.user.id));assert.deepEqual(value,{loginRequired:true});assert.equal(s.pilot.tasks.get(s.user.id).status,'takeover')}finally{await s.pilot.close()}
});
