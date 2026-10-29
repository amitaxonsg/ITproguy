import http from 'node:http';
import {config} from 'dotenv';
import {Accounts} from './accounts.mjs';
import {sendOtp} from './mail.mjs';
config({path:'/srv/itproguy/private/auth.env',quiet:true});
config({path:'/srv/itproguy/private/mailtrap.env',quiet:true});
const accounts=new Accounts('/srv/itproguy/private/customers.sqlite',process.env.AUTH_SECRET);
const origins=new Set(['https://itproguy.com','https://www.itproguy.com']);
const cookie=t=>`__Host-axel=${t}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${t?86400:0}`;
let windowStart=Date.now(),requests=0;
http.createServer(async(req,res)=>{
 const send=(status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
 try{
 const path=req.url.split('?')[0];
 const token=(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/)?.[1];
 const user=accounts.session(token);
 if(req.method==='GET'&&path==='/api/session')return send(200,{user});
 if(req.method==='GET'&&path==='/api/health')return send(200,{ok:true,emailLogin:true,google:false,microsoft:false,browserActions:false});
 if(req.method==='GET'&&path==='/api/profile')return send(user?200:401,user?{user}:{error:'Sign in first.'});
 if(req.method!=='POST')return send(404,{error:'Not found.'});
 if(!origins.has(req.headers.origin)||!/^application\/json(?:;|$)/.test(req.headers['content-type']||''))return send(403,{error:'Request origin not allowed.'});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return send(413,{error:'Request too large.'})}const data=JSON.parse(raw);
 if(path==='/api/otp/request'){
 if(Date.now()-windowStart>3600000){windowStart=Date.now();requests=0}if(requests>=30)return send(429,{error:'Email limit reached. Please try later.'});requests++;
 const challenge=accounts.issueCode(data.email);await sendOtp(challenge,process.env.MAILTRAP_API_TOKEN);return send(200,{ok:true,message:'Check your inbox for your eight-digit code.'});
 }
 if(path==='/api/login'){const result=accounts.verifyCode(data.email,data.code);return send(200,{user:result.user},{'Set-Cookie':cookie(result.token)})}
 if(path==='/api/logout'){if(token)accounts.logout(token);return send(200,{ok:true},{'Set-Cookie':cookie('')})}
 if(!user)return send(401,{error:'Sign in with your email first.'});
 if(path==='/api/axel')return send(503,{error:'Email sign-in is ready. Live task execution is still being connected; no trial time has been deducted.'});
 return send(404,{error:'Not found.'});
 }catch(e){const known=['INVALID_EMAIL','WAIT_BEFORE_RESENDING','EMAIL_RATE_LIMIT','INVALID_OR_EXPIRED_CODE'];send(known.includes(e.message)?400:503,{error:known.includes(e.message)?e.message.replaceAll('_',' ').toLowerCase():'Unable to complete this request. Please try again later.'})}
}).listen(3188,'127.0.0.1',()=>console.log('Axel customer sign-in listening on loopback:3188'));
