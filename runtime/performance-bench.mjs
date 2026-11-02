import {performance} from 'node:perf_hooks';
import {BrowserRuntime} from './browser-runtime.mjs';
import {PilotService} from './pilot.mjs';
import {createClient} from './claude-router.mjs';
const api=createClient({maxRetries:0,timeoutMs:60000});
const db={exec(){},prepare(){return{run(){},get(){return{account_status:'active'}}}}};
for(const effort of ['medium','low']){
 const browser=new BrowserRuntime({maxSessions:1}),metrics={effort,modelMs:0,modelCalls:0,inspectMs:0,inspectCalls:0,captureMs:0};
 const client={messages:{create:async(params,options)=>{const at=performance.now();try{return await api.messages.create({...params,output_config:{effort}},options)}finally{metrics.modelMs+=performance.now()-at;metrics.modelCalls++}}}};
 const pilot=new PilotService({browser,client,accounts:{db},reserveUsage:()=>1,finishUsage:()=>({})});
 const user={id:'performance-fixture-'+effort,account_status:'active'};
 try{
  await pilot.openBrowser(user);const page=pilot.session(pilot.tasks.get(user.id)).page;
  await page.setContent('<title>Axel speed check</title><h1>Performance fixture</h1><p>Reference value: SPEED-614</p>');
  for(const name of ['inspect','capture']){const fn=pilot[name].bind(pilot);pilot[name]=async(...args)=>{const at=performance.now();try{return await fn(...args)}finally{metrics[name==='inspect'?'inspectMs':'captureMs']+=performance.now()-at;if(name==='inspect')metrics.inspectCalls++}}}
  // Replace the manual-only blank task without closing its browser context.
  pilot.tasks.get(user.id).status='complete';const started=performance.now();await pilot.start(user,'Inspect the current browser page once, then report its title and the reference value. Do not navigate, click, fill or make any changes.');
  while(performance.now()-started<120000){const task=pilot.tasks.get(user.id);if(task.status==='approval'){if(task.pending.tool.name!=='propose_plan')throw Error('UNEXPECTED_ACTION');await pilot.command(user,{action:'approve',taskId:task.id,approvalId:task.pending.id})}else if(!['running','approval'].includes(task.status)&&!task.loop){metrics.status=task.status;metrics.verified=metrics.inspectCalls>0&&/SPEED-614/.test(task.events.map(x=>x.text).join(' '));break}await new Promise(r=>setTimeout(r,50))}
  metrics.totalMs=Math.round(performance.now()-started);for(const key of ['modelMs','inspectMs','captureMs'])metrics[key]=Math.round(metrics[key]);console.log(JSON.stringify(metrics));
 }finally{await pilot.close();await browser.close()}
}
