import assert from 'node:assert/strict';
import {BrowserRuntime} from './browser-runtime.mjs';
import {PilotService} from './pilot.mjs';
const browser=new BrowserRuntime({maxSessions:1});
const accounts={db:{exec(){},prepare(){return{run(){},get(){return{account_status:'active'}}}}}};
const pilot=new PilotService({browser,client:null,accounts,reserveUsage(){throw Error('No model calls allowed')},finishUsage(){}});
const user={id:'public-credits-smoke',account_status:'active'};
try{
 await pilot.openBrowser(user);const task=pilot.tasks.get(user.id);task.status='running';
 const view=await pilot.navigate(task,'https://axon.com.sg/');const link=view.targets.find(x=>x.tag==='a'&&x.href==='https://axon.com.sg/credit-top-up.html'&&/buy credits/i.test(x.name));assert.ok(link,'Expected the actual public Buy Credits link');
 await pilot.perform(task,{name:'click',input:{target:link.id,reason:'Open the public Buy Credits page'}});
 assert.equal(new URL(pilot.session(task).page.url()).pathname,'/credit-top-up.html');assert.notEqual(task.status,'takeover');
 console.log('PASS: reviewed Buy Credits navigation opens /credit-top-up.html; no form entry or payment submitted');
}finally{await pilot.close();await browser.close()}
