const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup({hostname='rdavid55.github.io',apiBase='',health=true}={}){
 const calls=[],ids=new Map(),storage=new Map();
 const get=id=>{if(!ids.has(id))ids.set(id,{textContent:'',innerHTML:'',disabled:false});return ids.get(id)};
 const origin=hostname==='rdavid55.github.io'?'https://rdavid55.github.io':'http://localhost:8080';
 const ctx={window:{SLICH_PORTAL_CONFIG:{apiBase},SlichIntake:require('../docs/assets/intake-core.js'),addEventListener(){}},document:{getElementById:get},location:{hostname,origin,pathname:'/sleech/portal.html',search:'',hash:''},history:{replaceState(){}},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},URL,AbortSignal,setTimeout,Intl,console,fetch:async(url,options)=>{calls.push({url,options});if(!health)throw Error('network');return {ok:true,status:200,json:async()=>({service:'slich',storage:'ready'})}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../docs/assets/portal.js'),'utf8'),ctx);
 return {calls,get,storage};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('GitHub Pages without an API cannot silently submit or pretend to receive a request',async()=>{
 const s=setup();await tick();assert.equal(s.calls.length,0);assert.match(s.get('portal-body').innerHTML,/Приём заявок ещё не подключён/);assert.doesNotMatch(s.get('portal-body').innerHTML,/auth-form/);
});
test('opening a configured portal only checks readiness; credentials are never submitted automatically',async()=>{
 const s=setup({apiBase:'https://portal.example.org'});await tick();assert.equal(s.calls.length,1);assert.equal(s.calls[0].url,'https://portal.example.org/api/health');assert.equal(s.calls[0].options.method,'GET');assert.match(s.get('portal-body').innerHTML,/auth-form/);
 // Legacy site snapshots capture only input[id]; password fields intentionally have no id.
 const password=s.get('portal-body').innerHTML.match(/<input[^>]+name="password"[^>]*>/)[0];assert.doesNotMatch(password,/\bid=/);
 const pattern=s.get('portal-body').innerHTML.match(/pattern="([^"]+)"/)[1];const re=new RegExp('^(?:'+pattern+')$','v');assert.ok(re.test('test.user'));assert.equal(re.test('bad login'),false);
});
test('a network failure leaves a clear unavailable state, never a success reference',async()=>{
 const s=setup({apiBase:'https://portal.example.org',health:false});await tick();assert.match(s.get('portal-body').innerHTML,/Кабинет временно недоступен/);assert.match(s.get('portal-error').textContent,/Сервер недоступен/);assert.equal(s.get('portal-notice').textContent,'');
});
test('an insecure remote API configuration is disabled rather than receiving credentials',async()=>{
 const s=setup({apiBase:'http://untrusted.example.org'});await tick();assert.equal(s.calls.length,0);assert.match(s.get('portal-body').innerHTML,/Приём заявок ещё не подключён/);
});
