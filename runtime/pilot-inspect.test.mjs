import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserRuntime} from './browser-runtime.mjs';
import {PilotService,executionEffort} from './pilot.mjs';
const db={exec(){},prepare(){return{run(){},get(){return{account_status:'active'}}}}};
test('routine work uses low effort and complex work retains medium effort',()=>{
 assert.equal(executionEffort('Inspect this public page'),'low');
 assert.equal(executionEffort('Check DNS and DKIM configuration'),'medium');
 assert.equal(executionEffort('Deploy the website fix'),'medium');
});
test('bulk inspection preserves target handles, hides payment fields and includes iframe targets',async()=>{
 const browser=new BrowserRuntime({maxSessions:1});const pilot=new PilotService({browser,client:{},accounts:{db},reserveUsage:()=>1,finishUsage:()=>({})});const user={id:'bulk-inspect-fixture',account_status:'active'};
 try{
  await pilot.openBrowser(user);const task=pilot.tasks.get(user.id),page=pilot.session(task).page;
  await page.setContent('<title>Inspection fixture</title><button onclick="document.body.dataset.result=\'clicked\'">Public action</button><input autocomplete="cc-number" aria-label="Card number"><iframe srcdoc="<button>Frame action</button>"></iframe><div style="margin-top:3000px">'+Array.from({length:300},(_,i)=>'<button>Offscreen '+i+'</button>').join('')+'</div>');
  await page.frameLocator('iframe').getByRole('button',{name:'Frame action'}).waitFor();
  const result=await pilot.inspect(task);assert.ok(result.screenshot.length>100);assert.equal(result.title,'Inspection fixture');assert.ok(result.targets.some(x=>x.name==='Frame action'));assert.ok(!result.targets.some(x=>x.name==='Card number'||x.name.startsWith('Offscreen')));
  const target=result.targets.find(x=>x.name==='Public action');assert.ok(target);await pilot.perform(task,{name:'click',input:{target:target.id,reason:'Test the disposable fixture button'}});assert.equal(await page.locator('body').getAttribute('data-result'),'clicked');
 }finally{await pilot.close();await browser.close()}
});
