import {createHash,createPublicKey,randomBytes,verify} from 'node:crypto';

const SITE='https://itproguy.com';
const CALLBACKS={
  google:SITE+'/api/auth/google/callback',
  microsoft:SITE+'/api/auth/microsoft/callback'
};
const COOKIE='__Host-axel',STATE_COOKIE='__Host-axel-oauth';
const cookie=value=>COOKIE+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+(value?86400:0);
const stateCookie=value=>STATE_COOKIE+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+(value?600:0);
const b64json=value=>JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
const isEmail=value=>typeof value==='string'&&value.length<=254&&!/^\s*@|@\s|\s/.test(value)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function createOAuth({accounts,env=process.env,now=Date.now}={}){
  const flows=new Map(),keys=new Map();
  const providers={
    google:{
      id:env.GOOGLE_OAUTH_CLIENT_ID,secret:env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorize:'https://accounts.google.com/o/oauth2/v2/auth',
      token:'https://oauth2.googleapis.com/token',
      jwks:'https://www.googleapis.com/oauth2/v3/certs',
      scope:'openid email profile'
    },
    microsoft:{
      id:env.MICROSOFT_OAUTH_CLIENT_ID,secret:env.MICROSOFT_OAUTH_CLIENT_SECRET,
      authorize:'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
      token:'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
      jwks:'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      scope:'openid email profile'
    }
  };
  const enabled=provider=>Boolean(providers[provider]?.id&&providers[provider]?.secret);
  const health=()=>({google:enabled('google'),microsoft:enabled('microsoft')});
  const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
  const redirectError=(res,reason='oauth_failed')=>{const url=new URL('/',SITE);url.searchParams.set('auth_error',reason);res.writeHead(302,{Location:url.toString(),'Set-Cookie':stateCookie(''),'Cache-Control':'no-store'});res.end()};
  const cookieValue=req=>(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/)?.[1]||null;
  const stateCookieValue=req=>(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel-oauth=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1]||null;

  async function getKeys(provider,force=false){
    const cfg=providers[provider],cached=keys.get(provider);
    if(!force&&cached&&cached.expires>now())return cached.value;
    const response=await fetch(cfg.jwks,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('OIDC_KEYS_UNAVAILABLE');
    const value=await response.json();
    if(!Array.isArray(value.keys))throw Error('OIDC_KEYS_INVALID');
    keys.set(provider,{value,expires:now()+3600000});
    return value;
  }
  async function verifiedClaims(provider,idToken,flow){
    if(typeof idToken!=='string'||idToken.length>20000)throw Error('OIDC_TOKEN_INVALID');
    const parts=idToken.split('.');
    if(parts.length!==3)throw Error('OIDC_TOKEN_INVALID');
    const header=b64json(parts[0]),claims=b64json(parts[1]);
    if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('OIDC_ALGORITHM_INVALID');
    let set=await getKeys(provider),jwk=set.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
    if(!jwk){set=await getKeys(provider,true);jwk=set.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'))}
    if(!jwk)throw Error('OIDC_KEY_NOT_FOUND');
    const valid=verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'));
    if(!valid)throw Error('OIDC_SIGNATURE_INVALID');
    const t=Math.floor(now()/1000),cfg=providers[provider],aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(!aud.includes(cfg.id)||(aud.length>1&&claims.azp!==cfg.id))throw Error('OIDC_AUDIENCE_INVALID');
    if(!Number.isFinite(claims.exp)||claims.exp<t-60||!Number.isFinite(claims.iat)||claims.iat>t+60)throw Error('OIDC_TIME_INVALID');
    if(claims.nbf!==undefined&&claims.nbf>t+60)throw Error('OIDC_TIME_INVALID');
    if(claims.nonce!==flow.nonce)throw Error('OIDC_NONCE_INVALID');
    let issuer;
    if(provider==='google'){
      if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss))throw Error('OIDC_ISSUER_INVALID');
      issuer='https://accounts.google.com';
      if(claims.email_verified!==true&&claims.email_verified!=='true')throw Error('OIDC_EMAIL_UNVERIFIED');
    }else{
      if(typeof claims.tid!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.tid))throw Error('OIDC_TENANT_INVALID');
      issuer='https://login.microsoftonline.com/'+claims.tid+'/v2.0';
      if(claims.iss!==issuer)throw Error('OIDC_ISSUER_INVALID');
    }
    if(typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255)throw Error('OIDC_SUBJECT_INVALID');
    const email=provider==='google'?claims.email:(claims.email||claims.preferred_username);
    if(!isEmail(email))throw Error('OIDC_EMAIL_MISSING');
    return {issuer,subject:claims.sub,email,emailVerified:provider==='google'||claims.email_verified===true||claims.email_verified==='true',name:typeof claims.name==='string'?claims.name:''};
  }
  async function start(provider,req,res,url){
    if(!enabled(provider))return send(res,503,{error:'This sign-in provider is not configured.'});
    const mode=url.searchParams.get('mode')==='link'?'link':'login';
    let linkUserId=null,linkSessionToken=null;
    if(mode==='link'){
      linkSessionToken=cookieValue(req);
      const current=accounts.session(linkSessionToken);
      if(!current)return send(res,401,{error:'Sign in before connecting an account.'});
      linkUserId=current.id;
    }
    for(const [key,value] of flows)if(value.createdAt<now()-600000)flows.delete(key);
    if(flows.size>=500)return send(res,429,{error:'Too many sign-in attempts. Try again shortly.'});
    const state=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
    flows.set(state,{provider,nonce,verifier,linkUserId,linkSessionToken,createdAt:now()});
    const challenge=createHash('sha256').update(verifier).digest('base64url');
    const cfg=providers[provider],target=new URL(cfg.authorize);
    for(const [key,value] of Object.entries({client_id:cfg.id,redirect_uri:CALLBACKS[provider],response_type:'code',response_mode:'query',scope:cfg.scope,state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}))target.searchParams.set(key,value);
    res.writeHead(302,{Location:target.toString(),'Set-Cookie':stateCookie(state),'Cache-Control':'no-store'});res.end();
  }
  async function callback(provider,req,res,url){
    if(!enabled(provider))return send(res,503,{error:'This sign-in provider is not configured.'});
    const state=url.searchParams.get('state')||'',flow=flows.get(state);
    if(!flow||flow.provider!==provider||flow.createdAt<now()-600000){if(flow)flows.delete(state);return redirectError(res)}
    flows.delete(state);
    if(stateCookieValue(req)!==state)return redirectError(res);
    if(url.searchParams.has('error')||!url.searchParams.get('code'))return redirectError(res);
    if(flow.linkUserId){const current=accounts.session(flow.linkSessionToken);if(!current||current.id!==flow.linkUserId)return redirectError(res,'account_link_required')}
    const cfg=providers[provider];
    try{
      const data=new URLSearchParams({client_id:cfg.id,client_secret:cfg.secret,code:url.searchParams.get('code'),redirect_uri:CALLBACKS[provider],grant_type:'authorization_code',code_verifier:flow.verifier});
      const response=await fetch(cfg.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data,signal:AbortSignal.timeout(10000)});
      if(!response.ok)return redirectError(res);
      const tokens=await response.json(),claims=await verifiedClaims(provider,tokens.id_token,flow);
      const result=accounts.loginExternal({provider,issuer:claims.issuer,subject:claims.subject,email:claims.email,name:claims.name,emailVerified:claims.emailVerified,linkUserId:flow.linkUserId});
      const dest=new URL('/',SITE);dest.searchParams.set('auth',flow.linkUserId?'linked':'signed-in');
      res.writeHead(302,{Location:dest.toString(),'Set-Cookie':[cookie(result.token),stateCookie('')],'Cache-Control':'no-store'});res.end();
    }catch(error){
      const reason=error.message==='ACCOUNT_LINK_REQUIRED'?'account_link_required':error.message==='IDENTITY_IN_USE'?'identity_in_use':'oauth_failed';
      redirectError(res,reason);
    }
  }
  async function handle(req,res,path){
    const match=path.match(/^\/api\/auth\/(google|microsoft)(\/callback)?$/);
    if(!match)return false;
    if(req.method!=='GET')return send(res,405,{error:'Method not allowed.'},{Allow:'GET'});
    const provider=match[1],url=new URL(req.url,SITE);
    if(match[2])await callback(provider,req,res,url);else await start(provider,req,res,url);
    return true;
  }
  return {handle,health};
}
