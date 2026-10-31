import test from 'node:test';
import assert from 'node:assert/strict';
import {readPilotResponse} from '../src/pilot-api.mjs';
test('HTML downtime pages produce a reconnect message without JSON or HTML leakage',async()=>{
 let parsed=false;await assert.rejects(()=>readPilotResponse({status:503,ok:false,headers:{get:()=> 'text/html'},json:async()=>{parsed=true;throw Error('Unexpected token <')}}),e=>e.status===503&&e.message.includes('reconnecting')&&!e.message.includes('<'));assert.equal(parsed,false)
});
test('an interrupted JSON response produces a recoverable connection error',async()=>{
 await assert.rejects(()=>readPilotResponse({status:200,ok:true,headers:{get:()=> 'application/json'},json:async()=>{throw Error('Unexpected end')}}),/reconnect automatically/)
});
test('valid pilot responses and authentication errors are preserved',async()=>{
 const make=(ok,status,data)=>({ok,status,headers:{get:()=> 'application/json; charset=utf-8'},json:async()=>data});assert.deepEqual(await readPilotResponse(make(true,200,{task:null})),{task:null});await assert.rejects(()=>readPilotResponse(make(false,401,{error:'Sign in first.'})),e=>e.status===401&&e.message==='Sign in first.')
});
