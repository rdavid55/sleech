import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/app.mjs';
import { openStore, id, stamp, passwordHash } from '../server/store.mjs';
const PASSWORD='test-only-long-password-917';
const payload={role:'customer',stage:'conflict',category:'geometry',evidence:'two',description:'Две стороны получили разные результаты измерений.',object:'Условная продукция',characteristic:'Размер',requirements:['method']};
async function fixture(t) {
 const folder=await mkdtemp(join(tmpdir(),'slich-test-')),store=openStore(join(folder,'slich.sqlite'));
 const server=createApp({store,siteOrigin:'http://localhost',origins:['https://rdavid55.github.io']});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));store.close();await rm(folder,{recursive:true,force:true});});
 async function request(path,token,data,method=data?'POST':'GET',origin='http://localhost') {
  const res=await fetch(base+'/api/'+path,{method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  const type=res.headers.get('content-type');return {status:res.status,data:type?.includes('application/json')?await res.json():await res.arrayBuffer(),headers:res.headers};
 }
 async function register(login,company='Компания '+login,extra={}){const r=await request('auth/register',null,{login,name:'Тестовый пользователь',company,password:PASSWORD,dataConsent:true,...extra});assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
 async function staff(login='david'){const userId=id();store.run('INSERT INTO users VALUES(?,?,?,?,?,NULL,?)',userId,login,'Команда '+login,await passwordHash(PASSWORD),'admin',stamp());const r=await request('auth/login',null,{login,password:PASSWORD});assert.equal(r.status,200);return r.data;}
 async function create(token,overrides={}){return request('cases',token,{title:'Задача по контролю',payload,idempotencyKey:id(),dataConsent:true,...overrides});}
 return {store,server,base,request,register,staff,create,folder};
}
test('two companies are isolated, role fields are ignored, and team can see all incoming cases',async t=>{
 const f=await fixture(t),a=await f.register('company.a','Компания А',{role:'admin'}),b=await f.register('company.b','Компания Б'),staff=await f.staff();
 assert.equal(a.user.role,'client');
 const ca=await f.create(a.token),cb=await f.create(b.token);assert.equal(ca.status,201);assert.equal(cb.status,201);assert.notEqual(ca.data.id,cb.data.id);
 assert.equal((await f.request('cases/'+ca.data.id,b.token)).status,404);
 assert.equal((await f.request('cases/'+ca.data.id+'/messages',b.token,{text:'Чужие данные'})).status,404);
 assert.equal((await f.request('cases/'+ca.data.id,b.token,{revision:1,status:'done'},'PATCH')).status,404);
 const listA=await f.request('cases',a.token),listTeam=await f.request('cases',staff.token);
 assert.equal(listA.data.total,1);assert.equal(listTeam.data.total,2);
 assert.equal((await f.request('cases/'+ca.data.id,staff.token)).status,200);
 assert.equal((await f.request('cases/'+ca.data.id,a.token,{revision:1,status:'scoped'},'PATCH')).status,403);
 assert.equal((await f.request('cases')).status,401);
});
test('only a confirmed server write creates a case, retries deduplicate and changed retries conflict',async t=>{
 const f=await fixture(t),a=await f.register('retry.user'),key=id();
 assert.equal((await f.create(a.token,{dataConsent:false})).status,400);
 assert.equal((await f.create(a.token,{payload:{...payload,role:'admin'}})).status,400);
 const first=await f.create(a.token,{idempotencyKey:key});assert.equal(first.status,201);
 const repeat=await f.create(a.token,{idempotencyKey:key});assert.equal(repeat.status,200);assert.equal(repeat.data.id,first.data.id);
 const changed=await f.create(a.token,{idempotencyKey:key,title:'Другая задача'});assert.equal(changed.status,409);
 const c=await f.request('cases/'+first.data.id,a.token);assert.equal(c.data.events.length,1);assert.equal(c.data.route,'audit');
});
test('scope approval, optimistic concurrency and changed-price invalidation protect agreed work',async t=>{
 const f=await fixture(t),a=await f.register('scope.user'),staff=await f.staff(),created=await f.create(a.token),path='cases/'+created.data.id;
 const patch={revision:1,status:'in_progress',scope:'Разбор двух комплектов данных',deliverables:'Карта различий и план',price:45000,result:'',assignedTo:staff.user.id};
 assert.equal((await f.request(path,staff.token,patch,'PATCH')).status,409);
 let r=await f.request(path,staff.token,{...patch,status:'scoped'},'PATCH');assert.equal(r.status,200);
 let c=(await f.request(path,a.token)).data;assert.equal(c.scope_version,1);assert.equal(c.accepted_version,null);
 assert.equal((await f.request(path,staff.token,{...patch,revision:c.revision},'PATCH')).status,409);
 assert.equal((await f.request(path+'/accept',staff.token,{revision:c.revision,scopeVersion:1})).status,403);
 assert.equal((await f.request(path+'/accept',a.token,{revision:1,scopeVersion:1})).status,409);
 assert.equal((await f.request(path+'/accept',a.token,{revision:c.revision,scopeVersion:1})).status,200);
 c=(await f.request(path,a.token)).data;
 assert.equal((await f.request(path,staff.token,{...patch,revision:c.revision,price:50000},'PATCH')).status,409);
 assert.equal((await f.request(path,staff.token,{...patch,status:'scoped',revision:c.revision,price:50000},'PATCH')).status,200);
 assert.equal((await f.request(path,staff.token,{...patch,status:'scoped',revision:c.revision},'PATCH')).status,409);
 c=(await f.request(path,a.token)).data;assert.equal(c.accepted_version,null);assert.equal(c.scope_version,2);
 await f.request(path+'/accept',a.token,{revision:c.revision,scopeVersion:2});c=(await f.request(path,a.token)).data;
 assert.equal((await f.request(path,staff.token,{...patch,price:50000,revision:c.revision},'PATCH')).status,200);
 c=(await f.request(path,a.token)).data;
 assert.equal((await f.request(path,staff.token,{...patch,status:'review',price:50000,revision:c.revision},'PATCH')).status,400);
 assert.equal((await f.request(path,staff.token,{...patch,status:'review',price:50000,revision:c.revision,result:'Подготовлен отчёт и план повторного контроля.'},'PATCH')).status,200);
 c=(await f.request(path,a.token)).data;
 await f.request(path,staff.token,{...patch,status:'done',price:50000,revision:c.revision,result:c.result},'PATCH');
 assert.equal((await f.request(path+'/messages',a.token,{text:'Изменить завершённую заявку'})).status,409);
});
test('internal notes and attachments cannot be accessed across companies',async t=>{
 const f=await fixture(t),a=await f.register('notes.a'),b=await f.register('notes.b'),staff=await f.staff(),c=await f.create(a.token),path='cases/'+c.data.id;
 assert.equal((await f.request(path+'/messages',a.token,{text:'Инъекция роли',internal:true})).status,403);
 await f.request(path+'/messages',staff.token,{text:'Внутренние расходы команды',internal:true});
 await f.request(path+'/messages',staff.token,{text:'Пожалуйста, уточните метод.'});
 assert.equal((await f.request(path,a.token)).data.events.some(x=>x.internal),false);
 assert.equal((await f.request(path,staff.token)).data.events.filter(x=>x.internal).length,1);
 const file=await f.request(path+'/files',a.token,{name:'измерения.csv',base64:Buffer.from('x,value\n1,12.5').toString('base64')});assert.equal(file.status,201);
 assert.equal((await f.request(path+'/files/'+file.data.id,b.token)).status,404);
 const downloaded=await f.request(path+'/files/'+file.data.id,staff.token);assert.equal(downloaded.status,200);assert.equal(Buffer.from(downloaded.data).toString(),'x,value\n1,12.5');
 assert.equal((await f.request(path+'/files',a.token,{name:'payload.html',base64:'YWJj'})).status,400);
 assert.equal((await f.request(path+'/files',a.token,{name:'bad.csv',base64:'a==='})).status,400);
 const large=await f.request(path+'/files',a.token,{name:'large.txt',base64:Buffer.alloc(5*1024*1024+1).toString('base64')});assert.equal(large.status,413);
});
test('organisation invitation is single-use and grants access only to that organisation',async t=>{
 const f=await fixture(t),a=await f.register('invite.owner'),created=await f.create(a.token),invite=await f.request('invitations',a.token,{});
 const colleague=await f.register('invite.member','Название не меняет организацию',{invitation:invite.data.invitation});
 assert.equal((await f.request('cases/'+created.data.id,colleague.token)).status,200);
 const repeat=await f.request('auth/register',null,{login:'invite.other',name:'Тест',company:'Тест',password:PASSWORD,dataConsent:true,invitation:invite.data.invitation});assert.equal(repeat.status,410);
});
test('passwords are hashed, sessions expire/revoke, and untrusted CORS origins are blocked',async t=>{
 const f=await fixture(t),a=await f.register('auth.user');assert.notEqual(f.store.one('SELECT password FROM users WHERE id=?',a.user.id).password,PASSWORD);
 assert.equal((await f.request('me',a.token,undefined,'GET','https://evil.invalid')).status,403);
 const cors=await f.request('me',a.token,undefined,'GET','https://rdavid55.github.io');assert.equal(cors.headers.get('access-control-allow-origin'),'https://rdavid55.github.io');
 const secrets=f.store.all('SELECT token_hash FROM sessions');assert.equal(secrets.some(x=>x.token_hash===a.token),false);
 await f.request('auth/logout',a.token,{});assert.equal((await f.request('me',a.token)).status,401);
 const login=await f.request('auth/login',null,{login:'auth.user',password:PASSWORD});assert.equal(login.status,200);
 f.store.run("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z'");assert.equal((await f.request('me',login.data.token)).status,401);
});
test('database backup restores cases, organisation boundaries and attachments',async t=>{
 const f=await fixture(t),a=await f.register('backup.user'),created=await f.create(a.token);
 await f.request('cases/'+created.data.id+'/files',a.token,{name:'report.txt',base64:Buffer.from('report').toString('base64')});
 const destination=join(f.folder,'backup.sqlite');await backup(f.store.db,destination);
 const restored=new DatabaseSync(destination,{readOnly:true});
 try {assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(restored.prepare('SELECT COUNT(*) n FROM cases').get().n,1);assert.equal(restored.prepare('SELECT COUNT(*) n FROM attachments').get().n,1);assert.equal(restored.prepare('SELECT org_id FROM cases').get().org_id,a.user.orgId);}finally{restored.close()}
});
test('static server exposes only public docs, never private database and source paths',async t=>{
 const f=await fixture(t);
 for(const path of ['/server/store.mjs','/data/slich.sqlite','/.git/config','/%2e%2e%2fserver/app.mjs']){const res=await fetch(f.base+path);assert.equal(res.status,404,path);}
 assert.equal((await fetch(f.base+'/start.html')).status,200);
 assert.equal((await fetch(f.base+'/assets/portal.js')).status,200);
});
