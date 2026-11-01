import assert from 'node:assert/strict';
import http from 'node:http';
import {BrowserRuntime} from './browser-runtime.mjs';
import {PilotService} from './pilot.mjs';
import {streamPilot} from './pilot-stream.mjs';
const browser=new BrowserRuntime({maxSessions:1});
const audit={exec(){},prepare(){return{run(){},get(){return{account_status:'active'}}}}};
const pilot=new PilotService({browser,client:null,accounts:{db:audit},reserveUsage(){throw Error('Model must not run')},finishUsage(){}});
const user={id:'live-smoke-test',account_status:'active'};
let server;
try{
 await pilot.openBrowser(user);const task=pilot.tasks.get(user.id),page=browser.sessions.get(user.id).page;
 await page.setContent('<label>Test input<input id="test"></label><input type="password" hidden>');
 assert.equal(await pilot.loginPage(task),false,'Hidden password fields must not pause the agent');
 await pilot.command(user,{action:'input',taskId:task.id,kind:'click',x:110,y:18});
 await page.locator('#test').focus();
 await pilot.command(user,{action:'input',taskId:task.id,kind:'text',text:'Direct typing works'});
 assert.equal(await page.locator('#test').inputValue(),'Direct typing works');
 server=http.createServer((req,res)=>streamPilot(req,res,{user:req.url==='/unauthorized'?null:user,pilot,sessionValid:()=>true}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(url+'/unauthorized')).status,401);
 assert.equal((await fetch(url+'/stream',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 const second=new AbortController();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(url+'/stream',{signal:controller.signal});assert.equal(response.status,200);const reader=response.body.getReader();let received='';while(!received.includes('event: frame')){const item=await reader.read();assert.equal(item.done,false);received+=Buffer.from(item.value).toString()}
  const other=await fetch(url+'/stream',{signal:second.signal});assert.equal(other.status,200);const reader2=other.body.getReader();let received2='';while(!received2.includes('event: frame')){const item=await reader2.read();assert.equal(item.done,false);received2+=Buffer.from(item.value).toString()}
  await page.locator('#test').fill('Two viewers remain connected');const firstAgain=await reader.read();assert.equal(firstAgain.done,false,'Second viewer must not disconnect the first');console.log('PASS: two authenticated viewers share one live stream without reconnect ping-pong');
 }finally{clearTimeout(timeout);controller.abort();second.abort()}
 task.status='running';await assert.rejects(pilot.command(user,{action:'input',taskId:task.id,kind:'text',text:'blocked'}),/TAKE_CONTROL_FIRST/);
 console.log('PASS: live Chromium frame, direct typing, hidden login, unauthorized/cross-origin rejection, input blocked while Axel runs');
}finally{await pilot.close();await browser.close();server?.closeAllConnections();await new Promise(r=>server?server.close(r):r())}
