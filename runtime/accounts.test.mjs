import test from 'node:test';import assert from 'node:assert/strict';import {Accounts} from './accounts.mjs';import {otpEmail} from './mail.mjs';
test('OTP is single use, trial persists and profile is scoped to account',()=>{
 let now=100000000;const a=new Accounts(':memory:','test-secret-with-at-least-32-characters',()=>now);
 try{const first=a.issueCode(' Amit@Example.com ');assert.throws(()=>a.issueCode(first.email),/WAIT/);assert.throws(()=>a.verifyCode(first.email,'00000000'),/INVALID/);
 const login=a.verifyCode(first.email,first.code);assert.equal(login.user.trial_seconds,1800);assert.equal(a.session(login.token).email,'amit@example.com');assert.throws(()=>a.verifyCode(first.email,first.code),/INVALID/);
 a.db.prepare('UPDATE users SET trial_seconds=100 WHERE id=?').run(login.user.id);now+=61000;const second=a.issueCode(first.email);const again=a.verifyCode(first.email,second.code);assert.equal(again.user.id,login.user.id);assert.equal(again.user.trial_seconds,100);assert.equal(again.user.logins.length,2);a.logout(again.token);assert.equal(a.session(again.token),null);
 const other=a.issueCode('other@example.com');const otherLogin=a.verifyCode(other.email,other.code);assert.notEqual(otherLogin.user.id,login.user.id);assert.equal(otherLogin.user.trial_seconds,1800);
 }finally{a.close()}
});
test('expired and exhausted codes fail; email HTML is clean and branded',()=>{
 let now=100000000;const a=new Accounts(':memory:','test-secret-with-at-least-32-characters',()=>now);try{const item=a.issueCode('user@example.com');for(let i=0;i<5;i++)assert.throws(()=>a.verifyCode(item.email,'00000000'));assert.throws(()=>a.verifyCode(item.email,item.code));now+=61000;const later=a.issueCode(item.email);now+=600001;assert.throws(()=>a.verifyCode(later.email,later.code));assert.match(otpEmail('12345678').html,/ITProGuy from Axon/);assert.throws(()=>otpEmail('<script>'))}finally{a.close()}
});
