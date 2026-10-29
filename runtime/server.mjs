import http from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { askAxel } from './claude-router.mjs';

const origins = new Set(['https://itproguy.com', 'https://www.itproguy.com']);
const hash = s => createHash('sha256').update(s).digest();
const equal = (a,b) => timingSafeEqual(hash(a),hash(b));
const cookie = value => `__Host-axel=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${value ? 3600 : 0}`;
const imageRequest = s => /\b(generate|create|draw|design|make)\b.{0,60}\b(image|picture|photo|illustration|artwork|logo)\b|\b(image|picture|photo|logo)\b.{0,30}\bgenerat(?:e|ion)\b/i.test(s) && !/\b(upload|replace|update|existing)\b/i.test(s);

export function createApp({ ownerSecret, ask = askAxel, dailyLimit = 10, ledgerPath, now = Date.now } = {}) {
  if (typeof ownerSecret !== 'string' || ownerSecret.length < 32) throw Error('OWNER_ACCESS_NOT_CONFIGURED');
  const sessions = new Map(), failures = new Map();
  let ledger = { day: '', used: 0 }, busy = false;
  if (ledgerPath) { try { ledger = JSON.parse(readFileSync(ledgerPath,'utf8')); }
    catch(e) { if(e.code !== 'ENOENT') throw Error('INVALID_USAGE_LEDGER'); } }
  function reserve() {
    const day = new Date(now()).toISOString().slice(0,10);
    if (ledger.day !== day) ledger = { day, used: 0 };
    if (ledger.used >= dailyLimit) return false;
    ledger.used++;
    if (ledgerPath) { writeFileSync(ledgerPath+'.tmp',JSON.stringify(ledger),{mode:0o600}); renameSync(ledgerPath+'.tmp',ledgerPath); }
    return true;
  }
  const send = (res, status, body, extra = {}) => {
    res.writeHead(status,{ 'Content-Type':'application/json', 'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff', ...extra }); res.end(JSON.stringify(body));
  };
  async function body(req) {
    let text = ''; for await(const chunk of req) { text += chunk; if(Buffer.byteLength(text)>20000) throw Error('TOO_LARGE'); }
    return JSON.parse(text);
  }
  return http.createServer(async (req,res) => {
    try {
      const path = req.url?.split('?')[0];
      if(req.method === 'GET' && path === '/api/health') return send(res,200,{ok:true,mode:'owner-preview',browserActions:false});
      if(req.method === 'POST' && (!origins.has(req.headers.origin) || !/^application\/json(?:;|$)/.test(req.headers['content-type']??'')))
        return send(res,403,{error:'Request origin not allowed.'});
      const match = (req.headers.cookie??'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/);
      for(const [id,s] of sessions) if(s.expires <= now()) sessions.delete(id);
      let session = match && sessions.get(match[1]);
      if(req.method === 'GET' && path === '/api/session') return send(res,200,{user:session?{name:'Amit'}:null});
      if(req.method === 'POST' && path === '/api/login') {
        // Remote address is the local reverse proxy; deliberately a global login limit.
        const slot = Math.floor(now()/900000);
        for(const key of failures.keys()) if(key!==slot) failures.delete(key);
        if((failures.get(slot)??0)>=5) return send(res,429,{error:'Too many sign-in attempts. Try again in 15 minutes.'});
        const data=await body(req);
        if(typeof data.code!=='string' || !equal(data.code,ownerSecret)) {
          failures.set(slot,(failures.get(slot)??0)+1); return send(res,401,{error:'Access code not recognised.'});
        }
        if(sessions.size>=20) return send(res,429,{error:'Session limit reached.'});
        const id=randomBytes(32).toString('hex');
        sessions.set(id,{expires:now()+3600000,history:[]});
        return send(res,200,{user:{name:'Amit'}},{'Set-Cookie':cookie(id)});
      }
      if(req.method === 'POST' && path === '/api/logout') {
        if(match) sessions.delete(match[1]); return send(res,200,{ok:true},{'Set-Cookie':cookie('')});
      }
      if(req.method === 'POST' && path === '/api/reset') {
        if(!session) return send(res,401,{error:'Sign in first.'});
        if(busy) return send(res,429,{error:'Wait for the current request.'});
        session.history=[]; return send(res,200,{ok:true});
      }
      if(req.method !== 'POST' || path !== '/api/axel') return send(res,404,{error:'Not found.'});
      if(!session) return send(res,401,{error:'Sign in with your owner access code first.'});
      const data=await body(req);
      if(typeof data.prompt !== 'string' || !data.prompt.trim() || data.prompt.length>8000) return send(res,400,{error:'Enter a task of up to 8,000 characters.'});
      if(busy) return send(res,429,{error:'Axel is already working. Please wait.'});
      busy=true;
      try {
        const blocked=imageRequest(data.prompt);
        if(!blocked && !reserve()) return send(res,429,{error:'The owner preview has reached its daily request limit.'});
        const result=await ask({prompt:data.prompt,history:session.history,intent:blocked?'image_generation':'it_task',taskClass:'standard'});
        if(result.status==='complete') session.history=[...session.history,{role:'user',content:data.prompt},{role:'assistant',content:result.text}].slice(-8).map(m=>({...m,content:m.content.slice(0,8000)}));
        // Never return raw SDK errors, keys, full request bodies, or account metadata.
        return send(res,200,{status:result.status,text:result.text,model:result.model,browserActions:false});
      } finally { busy=false; }
    } catch(e) {
      const clientError=['TOO_LARGE','SyntaxError'].includes(e.message) || e instanceof SyntaxError;
      send(res,clientError?400:503,{error:clientError?'Invalid request.':'Axel is temporarily unavailable. Please try again later.'});
      console.error(JSON.stringify({event:'axel_request_failed',code:clientError?'INVALID_REQUEST':'SERVICE_ERROR'}));
    }
  });
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  config({path:'/srv/itproguy/private/claude.env',quiet:true});
  if(!process.env.ANTHROPIC_API_KEY) throw Error('CLAUDE_KEY_NOT_CONFIGURED');
  const server=createApp({ownerSecret:process.env.ITPROGUY_OWNER_CODE,ledgerPath:'/srv/itproguy/private/usage.json'});
  server.requestTimeout=15000; server.headersTimeout=10000;
  server.listen(3188,'127.0.0.1',()=>console.log('Axel owner API listening on loopback:3188'));
}
