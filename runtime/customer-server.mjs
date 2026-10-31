import http from 'node:http';
import {config} from 'dotenv';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Accounts} from './accounts.mjs';
import {sendOtp} from './mail.mjs';
import {createOAuth} from './oidc.mjs';
import {askAxel,createClient} from './claude-router.mjs';
import {BrowserRuntime,parseBrowserNavigation} from './browser-runtime.mjs';
import {PilotService} from './pilot.mjs';

const origins=new Set(['https://itproguy.com','https://www.itproguy.com']);
const cookie=t=>`__Host-axel=${t}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${t?86400:0}`;

export function createCustomerApp({
 accounts,
 oauth,
 mailToken=process.env.MAILTRAP_API_TOKEN,
 mailSender=sendOtp,
 aiClient=null,
  browserRuntime=new BrowserRuntime(),
 ask=askAxel,
 now=Date.now
}={}) {
 if(!accounts)throw Error('ACCOUNTS_REQUIRED');
accounts.db.exec('CREATE TABLE IF NOT EXISTS user_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,avatar_data TEXT,updated_at INTEGER NOT NULL)');
if(!accounts.db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='account_status'))accounts.db.exec("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','under_review','suspended'))");
 oauth??=createOAuth({accounts});
 accounts.db.exec(`CREATE TABLE IF NOT EXISTS model_usage(
   usage_id INTEGER PRIMARY KEY REFERENCES usage(id) ON DELETE CASCADE,
   input_tokens INTEGER NOT NULL DEFAULT 0 CHECK(input_tokens>=0),
   output_tokens INTEGER NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
   request_id TEXT
 )`);
 let windowStart=now(),requests=0;const busyUsers=new Set();
 const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
 async function readBody(req,maxBytes=1048576){
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>maxBytes)throw Error('TOO_LARGE')}
  return JSON.parse(raw);
 }
 function reserveUsage(userId){
 const timestamp=now();accounts.db.exec('BEGIN IMMEDIATE');
 try{
  const user=accounts.db.prepare('SELECT trial_seconds FROM users WHERE id=?').get(userId);
  const paid=accounts.db.prepare("SELECT COALESCE(SUM(remaining_seconds),0) AS seconds FROM purchases WHERE user_id=? AND status='paid' AND expires>?").get(userId,timestamp)?.seconds||0;
  if(!user||Number(user.trial_seconds)+Number(paid)<=0){accounts.db.exec('ROLLBACK');return null}
  const row=accounts.db.prepare("INSERT INTO usage(user_id,thread_id,seconds,model,status,at) VALUES(?,NULL,0,'claude-haiku-5-5','reserved',?)").run(userId,timestamp);
  accounts.db.exec('COMMIT');return Number(row.lastInsertRowid);
 }catch(e){accounts.db.exec('ROLLBACK');throw e}
}
function finishUsage(id,{status,model='claude-haiku-5-5',attempts=[],elapsedSeconds=0}){
 const usage=attempts.reduce((sum,a)=>{if(a.usage){sum.input+=Number(a.usage.input_tokens)||0;sum.output+=Number(a.usage.output_tokens)||0}return sum},{input:0,output:0});
 const requestId=[...attempts].reverse().find(a=>a.requestId)?.requestId??null;
 accounts.db.exec('BEGIN IMMEDIATE');
 try{
  let trialDeductedSeconds=0,paidDeductedSeconds=0;
  if(status==='complete'){
   const user=accounts.db.prepare('SELECT id,trial_seconds FROM users WHERE id=(SELECT user_id FROM usage WHERE id=?)').get(id);
   const timestamp=now(),requested=Math.max(1,Math.ceil(Number(elapsedSeconds)||0));
   trialDeductedSeconds=Math.min(requested,Math.max(0,Number(user?.trial_seconds)||0));
   if(trialDeductedSeconds)accounts.db.prepare('UPDATE users SET trial_seconds=MAX(0,trial_seconds-?) WHERE id=?').run(trialDeductedSeconds,user.id);
   let left=requested-trialDeductedSeconds;
   const credits=accounts.db.prepare("SELECT id,remaining_seconds FROM purchases WHERE user_id=? AND status='paid' AND expires>? AND remaining_seconds>0 ORDER BY expires,id").all(user?.id,timestamp);
   for(const credit of credits){if(left<=0)break;const take=Math.min(left,Number(credit.remaining_seconds)||0);if(take>0){accounts.db.prepare('UPDATE purchases SET remaining_seconds=MAX(0,remaining_seconds-?) WHERE id=?').run(take,credit.id);paidDeductedSeconds+=take;left-=take}}
  }
  const charged=trialDeductedSeconds+paidDeductedSeconds;
  accounts.db.prepare('UPDATE usage SET status=?,model=?,seconds=? WHERE id=?').run(status,model??'claude-haiku-5-5',charged,id);
  accounts.db.prepare('INSERT OR REPLACE INTO model_usage(usage_id,input_tokens,output_tokens,request_id) VALUES(?,?,?,?)').run(id,usage.input,usage.output,requestId);
  const userId=accounts.db.prepare('SELECT user_id FROM usage WHERE id=?').get(id).user_id;
  const remainingTrialSeconds=Number(accounts.db.prepare('SELECT trial_seconds FROM users WHERE id=?').get(userId)?.trial_seconds)||0;
  const remainingPaidSeconds=Number(accounts.db.prepare("SELECT COALESCE(SUM(remaining_seconds),0) AS seconds FROM purchases WHERE user_id=? AND status='paid' AND expires>?").get(userId,now())?.seconds)||0;
  accounts.db.exec('COMMIT');return {trialDeductedSeconds,paidDeductedSeconds,chargedSeconds:charged,remainingTrialSeconds,remainingPaidSeconds};
 }catch(e){accounts.db.exec('ROLLBACK');throw e}
}

const pilot=new PilotService({browser:browserRuntime,client:aiClient,accounts,reserveUsage,finishUsage,now});
 return http.createServer(async(req,res)=>{
  let usageId=null;
  try{
   const path=req.url?.split('?')[0]||'/';
   const token=(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/)?.[1];
   const user=accounts.session(token); if(path==='/api/pilot')return pilot.handle(req,res,{user,readBody,send,originAllowed:origins.has(req.headers.origin)}); const adminEmail='amit@axon.com.sg'; const isAdmin=!!user&&String(user.email||'').toLowerCase()===adminEmail; if(req.method==='GET'&&path==='/api/admin/overview'){ if(!user)return send(res,401,{error:'Sign in first.'}); if(!isAdmin)return send(res,403,{error:'Admin access required.'}); const db=accounts.db; db.exec('CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,at INTEGER NOT NULL)'); const timestamp=now(); db.prepare('INSERT INTO admin_audit(actor_email,action,target_id,at) VALUES(?,?,?,?)').run(adminEmail,'view_overview',null,timestamp); const totals={users:db.prepare('SELECT COUNT(*) n FROM users').get().n,purchases:db.prepare('SELECT COUNT(*) n FROM purchases').get().n,pendingRequests:db.prepare("SELECT COUNT(*) n FROM requests WHERE status='pending'").get().n}; const users=db.prepare('SELECT id,email,name,created_at,first_login,last_login,trial_seconds,account_status FROM users ORDER BY created_at DESC LIMIT 500').all(); const logins=db.prepare('SELECT l.user_id,u.email,l.provider,l.at FROM logins l JOIN users u ON u.id=l.user_id ORDER BY l.at DESC LIMIT 200').all(); const purchases=db.prepare('SELECT p.id,p.user_id,u.email,p.amount_cents,p.currency,p.seconds,p.remaining_seconds,p.expires,p.status,p.receipt_url FROM purchases p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 200').all().map(x=>({...x,receipt_url:typeof x.receipt_url==='string'&&x.receipt_url.startsWith('https://')?x.receipt_url:null})); const requests=db.prepare('SELECT r.id,r.user_id,u.email,r.kind,r.reason,r.details,r.status,r.created_at FROM requests r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 200').all(); const audit=db.prepare('SELECT id,actor_email,action,target_id,at FROM admin_audit ORDER BY at DESC LIMIT 100').all(); const usage=db.prepare('SELECT u.id,u.user_id,x.email,u.seconds,u.model,u.status,u.at,mu.input_tokens,mu.output_tokens FROM usage u JOIN users x ON x.id=u.user_id LEFT JOIN model_usage mu ON mu.usage_id=u.id ORDER BY u.at DESC LIMIT 200').all(); return send(res,200,{totals,users,logins,purchases,requests,audit,usage}); }
   if(req.method==='GET'&&path==='/api/session')return send(res,200,{user});
if(req.method==='GET'&&path==='/api/account'){if(!user)return send(res,401,{error:'Sign in first.'});const db=accounts.db;const usage=db.prepare('SELECT u.id,u.seconds,u.model,u.status,u.at,mu.input_tokens,mu.output_tokens FROM usage u LEFT JOIN model_usage mu ON mu.usage_id=u.id WHERE u.user_id=? ORDER BY u.at DESC LIMIT 100').all(user.id);const logins=db.prepare('SELECT provider,at FROM logins WHERE user_id=? ORDER BY at DESC LIMIT 100').all(user.id);const purchases=db.prepare('SELECT amount_cents,currency,seconds,remaining_seconds,expires,status,receipt_url FROM purchases WHERE user_id=? ORDER BY id DESC LIMIT 100').all(user.id).map(x=>({...x,receipt_url:typeof x.receipt_url==='string'&&x.receipt_url.startsWith('https://')?x.receipt_url:null}));const reviewRequests=db.prepare('SELECT id,kind,reason,status,created_at FROM requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(user.id);return send(res,200,{account:user,usage,logins,purchases,reviewRequests});}
   if(req.method==='GET'&&path==='/api/health')return send(res,200,{ok:true,emailLogin:Boolean(mailToken),taskGuidance:Boolean(aiClient),...oauth.health(),browserActions:Boolean(aiClient&&browserRuntime.available()),pilotBrowser:Boolean(aiClient&&browserRuntime.available()),publicPagePreview:browserRuntime.available()});
   if(req.method==='GET'&&await oauth.handle(req,res,path))return;
   if(req.method==='GET'&&path==='/api/profile'){if(!user)return send(res,401,{error:'Sign in first.'});const avatar_data=accounts.db.prepare('SELECT avatar_data FROM user_profiles WHERE user_id=?').get(user.id)?.avatar_data||null;return send(res,200,{user,avatar_data});}
   if(req.method!=='POST')return send(res,404,{error:'Not found.'});
   if(!origins.has(req.headers.origin)||!/^application\/json(?:;|$)/.test(req.headers['content-type']||''))return send(res,403,{error:'Request origin not allowed.'});
   const data=await readBody(req); if(path==='/api/review'){if(!user)return send(res,401,{error:'Sign in first.'});const kind=String(data.kind||'account_review');const details=typeof data.details==='string'?data.details.trim():'';if(!['account_review','abuse_report'].includes(kind)||details.length<10||details.length>1200)return send(res,400,{error:'Choose a review type and enter 10 to 1,200 characters.'});const db=accounts.db;const pending=db.prepare("SELECT id FROM requests WHERE user_id=? AND kind=? AND status='pending' LIMIT 1").get(user.id,kind);if(pending)return send(res,409,{error:'You already have a pending request of this type.'});const id=randomUUID();const reason=kind==='account_review'?'Account review requested':'Abuse or safety report';db.prepare("INSERT INTO requests(id,user_id,kind,reason,details,status,created_at) VALUES(?,?,?,?,?,'pending',?)").run(id,user.id,kind,reason,details,now());return send(res,201,{ok:true,request:{id,kind,reason,status:'pending',created_at:now()}});} if(path==='/api/admin/account-status'){if(!user)return send(res,401,{error:'Sign in first.'});if(!isAdmin)return send(res,403,{error:'Admin access required.'});const userId=String(data.user_id||'');const status=String(data.status||'');if(!userId||userId.length>64||!['active','under_review','suspended'].includes(status))return send(res,400,{error:'Invalid account status update.'});const db=accounts.db;const result=db.prepare('UPDATE users SET account_status=? WHERE id=?').run(status,userId);if(!result.changes)return send(res,404,{error:'Account not found.'});db.exec('CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,at INTEGER NOT NULL)');db.prepare('INSERT INTO admin_audit(actor_email,action,target_id,at) VALUES(?,?,?,?)').run(adminEmail,'account_status:'+status,userId,now());return send(res,200,{ok:true,user_id:userId,status});} if(path==='/api/admin/request-status'){ if(!user)return send(res,401,{error:'Sign in first.'}); if(!isAdmin)return send(res,403,{error:'Admin access required.'}); const status=String(data.status||''); const id=String(data.id||''); if(!id||id.length>64||!['pending','reviewed','approved','declined'].includes(status))return send(res,400,{error:'Invalid request update.'}); const db=accounts.db; db.exec('CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,at INTEGER NOT NULL)'); const result=db.prepare('UPDATE requests SET status=? WHERE id=?').run(status,id); if(!result.changes)return send(res,404,{error:'Request not found.'}); db.prepare('INSERT INTO admin_audit(actor_email,action,target_id,at) VALUES(?,?,?,?)').run(adminEmail,'request_status',String(id),now()); return send(res,200,{ok:true,id,status}); }
   if(path==='/api/otp/request'){
    if(now()-windowStart>3600000){windowStart=now();requests=0}
    if(requests>=30)return send(res,429,{error:'Email limit reached. Please try later.'});
    requests++;
    const challenge=accounts.issueCode(data.email);await mailSender(challenge,mailToken);
    return send(res,200,{ok:true,message:'Check your inbox for your eight-digit code.'});
   }
   if(path==='/api/login'){
    const result=accounts.verifyCode(data.email,data.code);
    return send(res,200,{user:result.user},{'Set-Cookie':cookie(result.token)});
   }
   if(path==='/api/logout'){
    if(user)await pilot.end(user.id);if(token)accounts.logout(token);
    return send(res,200,{ok:true},{'Set-Cookie':cookie('')});
   }
   if(!user)return send(res,401,{error:'Sign in with your email first.'});if(path==='/api/profile'){const avatar=data.avatar_data;if(avatar!==null&&typeof avatar!=='string')return send(res,400,{error:'Invalid profile image.'});if(typeof avatar==='string'){const match=avatar.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);if(avatar.length>400000||!match)return send(res,400,{error:'Choose a valid JPEG photo smaller than 8 MB.'});const bytes=Buffer.from(match[1],'base64');if(bytes.length>280000||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)return send(res,400,{error:'The image could not be verified as a JPEG.'});}accounts.db.prepare('INSERT INTO user_profiles(user_id,avatar_data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar_data=excluded.avatar_data,updated_at=excluded.updated_at').run(user.id,avatar,now());return send(res,200,{ok:true,avatar_data:avatar});}

   if(path==='/api/axel'){if(['running','approval','takeover'].includes(pilot.tasks.get(user.id)?.status))return send(res,409,{error:'Use the active pilot to continue this task.'});if(user.account_status==='under_review')return send(res,403,{error:'Your account is under review. You can still view account activity and contact support.'});if(user.account_status==='suspended')return send(res,403,{error:'Guidance is paused for this account. Please contact support for a review.'});
    if(typeof data.prompt!=='string'||!data.prompt.trim())return send(res,400,{error:'Enter a task.'});
    const browserTarget=parseBrowserNavigation(data.prompt);if(browserTarget&&!browserRuntime.available())return send(res,503,{error:'The browser service is not ready. No work time was deducted.'});if(!aiClient&&!browserTarget)return send(res,503,{error:'Axel guidance is temporarily unavailable. No work time was deducted.'});
    if(busyUsers.has(user.id))return send(res,429,{error:'Axel is finishing your previous request. Please try again shortly.'});
    usageId=reserveUsage(user.id);
    if(usageId===null)return send(res,402,{error:'No guidance time is available. Checkout is currently disabled; contact support to add time.'});
    busyUsers.add(user.id);
    const startedAt=Date.now();
try{
     if(browserTarget){const browser=await browserRuntime.open(user.id,browserTarget);const metering=finishUsage(usageId,{status:'complete',model:'browser-navigation',attempts:[],elapsedSeconds:Math.max(1,Math.ceil((Date.now()-startedAt)/1000))});const host=new URL(browser.url).hostname;return send(res,200,{status:'complete',text:'Opened '+host+' in Axel’s private browser. This session can view public pages; it is not signed in and cannot change external accounts.',model:'browser-navigation',browserActions:false,publicPagePreview:true,browser,...metering});}const result=await ask({prompt:data.prompt,history:[],taskClass:'simple',intent:'it_task',allowFallback:false},aiClient);
     const metering=finishUsage(usageId,{status:result.status,model:result.model,attempts:result.attempts||[],elapsedSeconds:Math.max(1,Math.ceil((Date.now()-startedAt)/1000))});return send(res,200,{status:result.status,text:result.text,model:result.model,browserActions:false,publicPagePreview:browserRuntime.available(),...metering});
    }catch(e){
     finishUsage(usageId,{status:'failed',attempts:[]});
     throw e;
    }finally{busyUsers.delete(user.id)}
   }
   return send(res,404,{error:'Not found.'});
  }catch(e){
   const known=['INVALID_EMAIL','WAIT_BEFORE_RESENDING','EMAIL_RATE_LIMIT','INVALID_OR_EXPIRED_CODE'];
   const invalid=['TOO_LARGE','SyntaxError'].includes(e.message)||e instanceof SyntaxError;
   const status=known.includes(e.message)||invalid?400:503;
   send(res,status,{error:known.includes(e.message)?e.message.replaceAll('_',' ').toLowerCase():invalid?'Invalid request.':'Unable to complete this request. Please try again later.'});
   console.error(JSON.stringify({event:'customer_request_failed',code:status===400?'INVALID_REQUEST':'SERVICE_ERROR',errorType:typeof e?.name==='string'?e.name:'Error',reason:typeof e?.message==='string'&&/^[A-Z0-9_]{1,48}$/.test(e.message)?e.message:/browser(?:Type.launch|Context.newPage)/.test(String(e?.message||''))?'BROWSER_LAUNCH_FAILED':'UNCLASSIFIED'}));
  }
 });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 config({path:'/srv/itproguy/private/auth.env',quiet:true});
 config({path:'/srv/itproguy/private/mailtrap.env',quiet:true});
 config({path:'/srv/itproguy/private/claude.env',quiet:true});
 const accounts=new Accounts('/srv/itproguy/private/customers.sqlite',process.env.AUTH_SECRET);
 const oauth=createOAuth({accounts});
 let aiClient=null;
 if(process.env.ANTHROPIC_API_KEY){try{aiClient=createClient({maxRetries:0,timeoutMs:60000})}catch{aiClient=null}}
 const app=createCustomerApp({accounts,oauth,aiClient});
 app.listen(3188,'127.0.0.1',()=>console.log('Axel customer API listening on loopback:3188'));
 process.once('SIGTERM',()=>{app.closeAllConnections();app.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref()});
}
