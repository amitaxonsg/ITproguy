import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export class Accounts {
  constructor(path, pepper, now=Date.now) {
    if(typeof pepper!=='string'||pepper.length<32) throw Error('AUTH_SECRET_REQUIRED');
    this.db=new DatabaseSync(path);this.pepper=pepper;this.now=now;
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,first_login INTEGER,last_login INTEGER,trial_seconds INTEGER NOT NULL DEFAULT 1800 CHECK(trial_seconds>=0));
      CREATE TABLE IF NOT EXISTS email_requests(email TEXT PRIMARY KEY,last_sent INTEGER NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS otp(email TEXT PRIMARY KEY,digest TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS logins(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),provider TEXT NOT NULL,at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS identities(provider TEXT NOT NULL,issuer TEXT NOT NULL,subject TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),UNIQUE(provider,issuer,subject));
      CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,thread_id TEXT NOT NULL REFERENCES threads(id),role TEXT NOT NULL CHECK(role IN ('user','assistant')),content TEXT NOT NULL,at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),thread_id TEXT,seconds INTEGER NOT NULL CHECK(seconds>=0),model TEXT,status TEXT NOT NULL,at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),stripe_session TEXT UNIQUE NOT NULL,amount_cents INTEGER NOT NULL,currency TEXT NOT NULL,seconds INTEGER NOT NULL,remaining_seconds INTEGER NOT NULL,expires INTEGER NOT NULL,status TEXT NOT NULL,receipt_url TEXT);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,reason TEXT NOT NULL,details TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS stripe_events(id TEXT PRIMARY KEY,processed_at INTEGER NOT NULL);`);
  }
  hash(s){return createHmac('sha256',this.pepper).update(s).digest('hex')}
  email(s){if(typeof s!=='string'||s.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()))throw Error('INVALID_EMAIL');return s.trim().toLowerCase()}
  issueCode(raw){
    const email=this.email(raw),now=this.now();
    const previous=this.db.prepare('SELECT * FROM email_requests WHERE email=?').get(email);
    if(previous&&now-previous.last_sent<60000)throw Error('WAIT_BEFORE_RESENDING');
    const sameWindow=previous&&now-previous.window_start<3600000;
    if(sameWindow&&previous.count>=5)throw Error('EMAIL_RATE_LIMIT');
    this.db.prepare('INSERT OR REPLACE INTO email_requests VALUES(?,?,?,?)').run(email,now,sameWindow?previous.window_start:now,sameWindow?previous.count+1:1);
    const code=String(randomInt(10000000,100000000));
    this.db.prepare('INSERT OR REPLACE INTO otp VALUES(?,?,?,0)').run(email,this.hash(email+':'+code),now+600000);
    return {email,code};
  }
  verifyCode(raw,code){
    const email=this.email(raw),entry=this.db.prepare('SELECT * FROM otp WHERE email=?').get(email);
    if(!entry||entry.expires<this.now()||entry.attempts>=5||typeof code!=='string')throw Error('INVALID_OR_EXPIRED_CODE');
    this.db.prepare('UPDATE otp SET attempts=attempts+1 WHERE email=?').run(email);
    if(!timingSafeEqual(Buffer.from(entry.digest,'hex'),Buffer.from(this.hash(email+':'+code),'hex')))throw Error('INVALID_OR_EXPIRED_CODE');
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('DELETE FROM otp WHERE email=?').run(email);
      let user=this.db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if(!user){const id=randomBytes(16).toString('hex');this.db.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?)').run(id,email,this.now());user=this.db.prepare('SELECT * FROM users WHERE id=?').get(id)}
      this.db.prepare('UPDATE users SET first_login=COALESCE(first_login,?),last_login=? WHERE id=?').run(this.now(),this.now(),user.id);
      this.db.prepare('INSERT INTO logins(user_id,provider,at) VALUES(?,?,?)').run(user.id,'email',this.now());
      const token=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(this.hash(token),user.id,this.now()+86400000);
      this.db.exec('COMMIT');return {token,user:this.profile(user.id)};
    }catch(e){this.db.exec('ROLLBACK');throw e}
  }
  session(token){if(typeof token!=='string')return null;const row=this.db.prepare('SELECT user_id FROM sessions WHERE digest=? AND expires>?').get(this.hash(token),this.now());return row?this.profile(row.user_id):null}
  logout(token){this.db.prepare('DELETE FROM sessions WHERE digest=?').run(this.hash(token))}
  profile(id){
    const user=this.db.prepare('SELECT id,email,name,created_at,first_login,last_login,trial_seconds FROM users WHERE id=?').get(id);if(!user)return null;
    return {...user,paid_seconds:this.db.prepare("SELECT COALESCE(SUM(remaining_seconds),0) AS total FROM purchases WHERE user_id=? AND status='paid' AND expires>?").get(id,this.now()).total,
      usage:this.db.prepare('SELECT seconds,model,status,at FROM usage WHERE user_id=? ORDER BY id DESC LIMIT 100').all(id),
      payments:this.db.prepare('SELECT id,amount_cents,currency,seconds,remaining_seconds,expires,status,receipt_url FROM purchases WHERE user_id=? ORDER BY expires DESC LIMIT 100').all(id),
      logins:this.db.prepare('SELECT provider,at FROM logins WHERE user_id=? ORDER BY id DESC LIMIT 20').all(id)};
  }
  loginExternal({provider,issuer,subject,email,name='',emailVerified=false,linkUserId=null}){
    if(!['google','microsoft'].includes(provider)||typeof issuer!=='string'||!issuer.startsWith('https://')||typeof subject!=='string'||!subject||subject.length>255)throw Error('INVALID_EXTERNAL_IDENTITY');
    const normalized=this.email(email),displayName=typeof name==='string'?name.trim().slice(0,120):'';
    const now=this.now();
    this.db.exec('BEGIN IMMEDIATE');
    try{
      let identity=this.db.prepare('SELECT user_id FROM identities WHERE provider=? AND issuer=? AND subject=?').get(provider,issuer,subject);
      let userId;
      if(identity){
        if(linkUserId&&identity.user_id!==linkUserId)throw Error('IDENTITY_IN_USE');
        userId=identity.user_id;
      }else if(linkUserId){
        const account=this.db.prepare('SELECT id FROM users WHERE id=?').get(linkUserId);
        if(!account)throw Error('ACCOUNT_LINK_REQUIRED');
        this.db.prepare('INSERT INTO identities(provider,issuer,subject,user_id) VALUES(?,?,?,?)').run(provider,issuer,subject,linkUserId);
        userId=linkUserId;
      }else{
        const existing=this.db.prepare('SELECT id FROM users WHERE email=?').get(normalized);
        if(existing){
          if(emailVerified!==true)throw Error('ACCOUNT_LINK_REQUIRED');
          userId=existing.id;
          this.db.prepare('INSERT INTO identities(provider,issuer,subject,user_id) VALUES(?,?,?,?)').run(provider,issuer,subject,userId);
        }else{
          userId=randomBytes(16).toString('hex');
          this.db.prepare('INSERT INTO users(id,email,name,created_at) VALUES(?,?,?,?)').run(userId,normalized,displayName,now);
          this.db.prepare('INSERT INTO identities(provider,issuer,subject,user_id) VALUES(?,?,?,?)').run(provider,issuer,subject,userId);
        }
      }
      this.db.prepare('UPDATE users SET first_login=COALESCE(first_login,?),last_login=? WHERE id=?').run(now,now,userId);
      this.db.prepare('INSERT INTO logins(user_id,provider,at) VALUES(?,?,?)').run(userId,provider,now);
      const token=randomBytes(32).toString('hex');
      this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(this.hash(token),userId,now+86400000);
      this.db.exec('COMMIT');
      return {token,user:this.profile(userId)};
    }catch(e){this.db.exec('ROLLBACK');throw e}
  }
  close(){this.db.close()}
}
