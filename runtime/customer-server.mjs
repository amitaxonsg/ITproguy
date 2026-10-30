import http from 'node:http';
import {config} from 'dotenv';
import {pathToFileURL} from 'node:url';
import {Accounts} from './accounts.mjs';
import {sendOtp} from './mail.mjs';
import {createOAuth} from './oidc.mjs';
import {askAxel,createClient} from './claude-router.mjs';

const origins=new Set(['https://itproguy.com','https://www.itproguy.com']);
const cookie=t=>`__Host-axel=${t}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${t?86400:0}`;

export function createCustomerApp({
 accounts,
 oauth,
 mailToken=process.env.MAILTRAP_API_TOKEN,
 mailSender=sendOtp,
 aiClient=null,
 ask=askAxel,
 dailyLimit=10,
 userDailyLimit=3,
 now=Date.now
}={}) {
 if(!accounts)throw Error('ACCOUNTS_REQUIRED');
 oauth??=createOAuth({accounts});
 accounts.db.exec(`CREATE TABLE IF NOT EXISTS model_usage(
   usage_id INTEGER PRIMARY KEY REFERENCES usage(id) ON DELETE CASCADE,
   input_tokens INTEGER NOT NULL DEFAULT 0 CHECK(input_tokens>=0),
   output_tokens INTEGER NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
   request_id TEXT
 )`);
 let windowStart=now(),requests=0,busy=false;
 const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
 async function readBody(req,maxBytes=12000){
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>maxBytes)throw Error('TOO_LARGE')}
  return JSON.parse(raw);
 }
 function reserveUsage(userId){
  const timestamp=now(),date=new Date(timestamp),start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
  accounts.db.exec('BEGIN IMMEDIATE');
  try{
   const global=accounts.db.prepare("SELECT COUNT(*) AS n FROM usage WHERE at>=? AND at<? AND seconds=0 AND model LIKE 'claude-%'").get(start,start+86400000).n;
   const personal=accounts.db.prepare("SELECT COUNT(*) AS n FROM usage WHERE user_id=? AND at>=? AND at<? AND seconds=0 AND model LIKE 'claude-%'").get(userId,start,start+86400000).n;
   if(global>=dailyLimit||personal>=userDailyLimit){accounts.db.exec('ROLLBACK');return null}
   const row=accounts.db.prepare("INSERT INTO usage(user_id,thread_id,seconds,model,status,at) VALUES(?,NULL,0,'claude-haiku-5-5','reserved',?)").run(userId,timestamp);
   accounts.db.exec('COMMIT');return Number(row.lastInsertRowid);
  }catch(e){accounts.db.exec('ROLLBACK');throw e}
 }
 function finishUsage(id,{status,model='claude-haiku-5-5',attempts=[]}){
  const usage=attempts.reduce((sum,a)=>{if(a.usage){sum.input+=Number(a.usage.input_tokens)||0;sum.output+=Number(a.usage.output_tokens)||0}return sum},{input:0,output:0});
  const requestId=[...attempts].reverse().find(a=>a.requestId)?.requestId??null;
  accounts.db.exec('BEGIN IMMEDIATE');
  try{
   accounts.db.prepare('UPDATE usage SET status=?,model=? WHERE id=?').run(status,model??'claude-haiku-5-5',id);
   accounts.db.prepare('INSERT OR REPLACE INTO model_usage(usage_id,input_tokens,output_tokens,request_id) VALUES(?,?,?,?)').run(id,usage.input,usage.output,requestId);
   accounts.db.exec('COMMIT');
  }catch(e){accounts.db.exec('ROLLBACK');throw e}
 }
 return http.createServer(async(req,res)=>{
  let usageId=null;
  try{
   const path=req.url?.split('?')[0]||'/';
   const token=(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/)?.[1];
   const user=accounts.session(token); const adminEmail='amit@axon.com.sg'; const isAdmin=!!user&&String(user.email||'').toLowerCase()===adminEmail; if(req.method==='GET'&&path==='/api/admin/overview'){ if(!user)return send(res,401,{error:'Sign in first.'}); if(!isAdmin)return send(res,403,{error:'Admin access required.'}); const db=accounts.db; db.exec('CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,at INTEGER NOT NULL)'); const timestamp=now(); db.prepare('INSERT INTO admin_audit(actor_email,action,target_id,at) VALUES(?,?,?,?)').run(adminEmail,'view_overview',null,timestamp); const totals={users:db.prepare('SELECT COUNT(*) n FROM users').get().n,purchases:db.prepare('SELECT COUNT(*) n FROM purchases').get().n,pendingRequests:db.prepare("SELECT COUNT(*) n FROM requests WHERE status='pending'").get().n}; const users=db.prepare('SELECT id,email,name,created_at,first_login,last_login,trial_seconds FROM users ORDER BY created_at DESC LIMIT 500').all(); const logins=db.prepare('SELECT l.user_id,u.email,l.provider,l.at FROM logins l JOIN users u ON u.id=l.user_id ORDER BY l.at DESC LIMIT 200').all(); const purchases=db.prepare('SELECT p.id,p.user_id,u.email,p.amount_cents,p.currency,p.seconds,p.remaining_seconds,p.expires,p.status,p.receipt_url FROM purchases p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 200').all().map(x=>({...x,receipt_url:typeof x.receipt_url==='string'&&x.receipt_url.startsWith('https://')?x.receipt_url:null})); const requests=db.prepare('SELECT r.id,r.user_id,u.email,r.kind,r.reason,r.status,r.created_at FROM requests r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 200').all(); const audit=db.prepare('SELECT id,actor_email,action,target_id,at FROM admin_audit ORDER BY at DESC LIMIT 100').all(); return send(res,200,{totals,users,logins,purchases,requests,audit}); }
   if(req.method==='GET'&&path==='/api/session')return send(res,200,{user});
   if(req.method==='GET'&&path==='/api/health')return send(res,200,{ok:true,emailLogin:Boolean(mailToken),taskGuidance:Boolean(aiClient),...oauth.health(),browserActions:false});
   if(req.method==='GET'&&await oauth.handle(req,res,path))return;
   if(req.method==='GET'&&path==='/api/profile')return send(user?200:401,user?{user}:{error:'Sign in first.'});
   if(req.method!=='POST')return send(res,404,{error:'Not found.'});
   if(!origins.has(req.headers.origin)||!/^application\/json(?:;|$)/.test(req.headers['content-type']||''))return send(res,403,{error:'Request origin not allowed.'});
   const data=await readBody(req); if(path==='/api/admin/request-status'){ if(!user)return send(res,401,{error:'Sign in first.'}); if(!isAdmin)return send(res,403,{error:'Admin access required.'}); const status=String(data.status||''); const id=Number(data.id); if(!Number.isInteger(id)||!['pending','reviewed','approved','declined'].includes(status))return send(res,400,{error:'Invalid request update.'}); const db=accounts.db; db.exec('CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,at INTEGER NOT NULL)'); const result=db.prepare('UPDATE requests SET status=? WHERE id=?').run(status,id); if(!result.changes)return send(res,404,{error:'Request not found.'}); db.prepare('INSERT INTO admin_audit(actor_email,action,target_id,at) VALUES(?,?,?,?)').run(adminEmail,'request_status',String(id),now()); return send(res,200,{ok:true,id,status}); }
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
    if(token)accounts.logout(token);
    return send(res,200,{ok:true},{'Set-Cookie':cookie('')});
   }
   if(!user)return send(res,401,{error:'Sign in with your email first.'});
   if(path==='/api/axel'){
    if(typeof data.prompt!=='string'||!data.prompt.trim()||data.prompt.length>8000)return send(res,400,{error:'Enter a task of up to 8,000 characters.'});
    if(!aiClient)return send(res,503,{error:'Axel guidance is temporarily unavailable. No work time was deducted.'});
    if(busy)return send(res,429,{error:'Axel is handling another request. Please try again shortly.'});
    usageId=reserveUsage(user.id);
    if(usageId===null)return send(res,429,{error:'The daily Axel request limit has been reached. Try again tomorrow.'});
    busy=true;
    try{
     const result=await ask({prompt:data.prompt,history:[],taskClass:'simple',intent:'it_task',allowFallback:false},aiClient);
     finishUsage(usageId,{status:result.status,model:result.model,attempts:result.attempts||[]});
     return send(res,200,{status:result.status,text:result.text,model:result.model,browserActions:false,trialDeductedSeconds:0});
    }catch(e){
     finishUsage(usageId,{status:'failed',attempts:[]});
     throw e;
    }finally{busy=false}
   }
   return send(res,404,{error:'Not found.'});
  }catch(e){
   const known=['INVALID_EMAIL','WAIT_BEFORE_RESENDING','EMAIL_RATE_LIMIT','INVALID_OR_EXPIRED_CODE'];
   const invalid=['TOO_LARGE','SyntaxError'].includes(e.message)||e instanceof SyntaxError;
   const status=known.includes(e.message)||invalid?400:503;
   send(res,status,{error:known.includes(e.message)?e.message.replaceAll('_',' ').toLowerCase():invalid?'Invalid request.':'Unable to complete this request. Please try again later.'});
   console.error(JSON.stringify({event:'customer_request_failed',code:status===400?'INVALID_REQUEST':'SERVICE_ERROR'}));
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
}
