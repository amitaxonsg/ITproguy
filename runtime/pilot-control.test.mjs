import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import {attachPilotControl} from './pilot-control.mjs';
const token='a'.repeat(64),origin='https://itproguy.com';
test('persistent controls authenticate, serialize pipelined inputs, and reject non-input commands',async()=>{
 const received=[];let active=true;
 const accounts={session:t=>t===token&&active?{id:'one',account_status:'active'}:null};
 const server=http.createServer();attachPilotControl(server,{accounts,pilot:{command:async(user,data)=>{await new Promise(r=>setTimeout(r,5));received.push(data.seq)}},origins:new Set([origin])});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='ws://127.0.0.1:'+server.address().port+'/api/pilot/control';const clients=[];
 const connect=headers=>new Promise((resolve,reject)=>{const ws=new WebSocket(url,{headers});clients.push(ws);ws.once('open',()=>resolve(ws));ws.once('error',reject)});
 try{
  await assert.rejects(connect({Origin:origin}),/403/);await assert.rejects(connect({Origin:'https://untrusted.example',Cookie:'__Host-axel='+token}),/403/);
  const ws=await connect({Origin:origin,Cookie:'__Host-axel='+token});const acknowledgements=[];const complete=new Promise((resolve,reject)=>{ws.on('message',raw=>{const data=JSON.parse(raw.toString());acknowledgements.push(data);if(acknowledgements.length===20)resolve()});ws.once('error',reject)});
  for(let seq=1;seq<=20;seq++)ws.send(JSON.stringify({seq,action:'input',taskId:'fixture',kind:'key',key:'Tab'}));await complete;assert.deepEqual(received,Array.from({length:20},(_,i)=>i+1));assert.ok(acknowledgements.every(x=>x.ok));
  const closed=new Promise(r=>ws.once('close',r));ws.send(JSON.stringify({seq:21,action:'resume'}));await closed;assert.equal(received.length,20);
  active=false;await assert.rejects(connect({Origin:origin,Cookie:'__Host-axel='+token}),/403/);
 }finally{for(const ws of clients)ws.terminate();server.closeAllConnections();await new Promise(r=>server.close(r))}
});
