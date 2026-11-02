import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {streamPilot} from './pilot-stream.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function response(){const r=new EventEmitter();r.text='';r.writableLength=0;r.writableEnded=false;r.socket={setNoDelay(){}};r.writeHead=()=>{};r.flushHeaders=()=>{};r.write=x=>{r.text+=x};r.end=()=>{if(r.writableEnded)return;r.writableEnded=true;r.emit('close')};return r}
test('new task in the same browser preserves both viewers and navigation restarts frames',async()=>{
 const page=new EventEmitter(),cdp=new EventEmitter(),commands=[];let attached=0;cdp.send=async name=>commands.push(name);cdp.detach=async()=>{};
 const user={id:'stream-regression',account_status:'active'},session={page,context:{newCDPSession:async()=>{attached++;return cdp}}},pilot={tasks:new Map([[user.id,{id:'first'}]]),browser:{sessions:new Map([[user.id,session]])}};
 const req={method:'GET',headers:{'sec-fetch-site':'same-origin'}},one=response(),two=response();
 try{await streamPilot(req,one,{user,pilot,sessionValid:()=>true});pilot.tasks.set(user.id,{id:'next'});await streamPilot(req,two,{user,pilot,sessionValid:()=>true});assert.equal(attached,1);assert.equal(one.writableEnded,false);assert.equal(two.writableEnded,false);
 page.emit('domcontentloaded');await wait(20);assert.equal(commands.filter(x=>x==='Page.startScreencast').length,2);assert.match(one.text,/event: updating/);
 cdp.emit('Page.screencastFrame',{sessionId:1,data:'fake-new-frame',metadata:{deviceWidth:1180,deviceHeight:720}});await wait(70);assert.match(one.text,/fake-new-frame/);assert.match(two.text,/fake-new-frame/);
 }finally{one.end();two.end()}
});
