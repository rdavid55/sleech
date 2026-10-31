import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { id, stamp, hash, passwordHash, passwordMatches } from './store.mjs';
const require = createRequire(import.meta.url);
const core = require('../docs/assets/intake-core.js');
const ROOT = fileURLToPath(new URL('../docs/', import.meta.url));
const services = JSON.parse(await readFile(new URL('../docs/service-data.json', import.meta.url), 'utf8'));
const transitions = {new: ['clarification','scoped','declined'], clarification: ['scoped','declined'], scoped: ['clarification','in_progress','declined'], in_progress: ['clarification','review'], review: ['in_progress','done'], done: [], declined: []};
const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_FILE = 5 * 1024 * 1024;
class Problem extends Error {constructor(status, message) {super(message); this.status = status;}}
const fail = (code, message) => {throw new Problem(code, message);};
const str = (v, limit = 4000) => typeof v === 'string' ? v.trim().slice(0, limit) : '';
const publicUser = u => ({id: u.id, name: u.name, role: u.role, orgId: u.org_id});
const validLogin = login => /^[a-z0-9][a-z0-9._@+-]{2,119}$/.test(login);
const validPassword = password => typeof password === 'string' && password.length >= 12 && password.length <= 256;
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Нужен формат JSON.');
  let size = 0, chunks = [];
  for await (const chunk of req) {size += chunk.length; if (size > 8 * 1024 * 1024) fail(413, 'Слишком большой запрос.'); chunks.push(chunk);}
  try {const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value;} catch {fail(400, 'Не удалось прочитать данные.');}
}
function limited(s, key, max, windowMs) {
  const now = Date.now();
  if (s.one('SELECT COUNT(*) n FROM rate_limits').n > 10000) s.run('DELETE FROM rate_limits WHERE reset_at<?', now);
  s.run('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END', key, now + windowMs, now, now);
  if (s.one('SELECT count FROM rate_limits WHERE key=?', key).count > max) fail(429, 'Слишком много попыток. Повторите позже.');
}
function session(s, user) {
  const token = randomBytes(32).toString('hex'), expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
  s.run('DELETE FROM sessions WHERE expires_at<?', stamp());
  s.run('INSERT INTO sessions VALUES(?,?,?)', hash(token), user.id, expiresAt);
  return {token, expiresAt, user: publicUser(user)};
}
export function createApp({store: s, origins = [], siteOrigin, staticRoot = ROOT}) {
  if (!siteOrigin) throw Error('siteOrigin is required');
  const allow = new Set([new URL(siteOrigin).origin, ...origins.map(o => new URL(o).origin)]);
  async function route(req, res) {
    const origin = req.headers.origin, url = new URL(req.url, siteOrigin);
    const send = (data, status = 200) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data));};
    const method = req.method, segments = url.pathname.split('/').filter(Boolean).slice(1);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!url.pathname.startsWith('/api/')) {
      if (!['GET','HEAD'].includes(method)) fail(405, 'Метод недоступен.');
      let path;
      try {path = decodeURIComponent(url.pathname);} catch {fail(400, 'Неверный адрес.');}
      if (path.split('/').some(p => p.startsWith('.'))) fail(404, 'Страница не найдена.');
      const root = await realpath(staticRoot);
      let filename = resolve(root, '.' + path);
      if (!filename.startsWith(root + sep) && filename !== root) fail(404, 'Страница не найдена.');
      try {
        if ((await stat(filename)).isDirectory()) filename = resolve(filename, 'index.html');
        filename = await realpath(filename);
        if (!filename.startsWith(root + sep)) fail(404, 'Страница не найдена.');
        const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff':'font/woff','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.csv':'text/csv; charset=utf-8'};
        const data = await readFile(filename);
        res.writeHead(200, {'Content-Type':types[extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-cache'}); res.end(method === 'HEAD' ? undefined : data); return;
      } catch (e) {if (e instanceof Problem) throw e; fail(404, 'Страница не найдена.');}
    }
    res.setHeader('Cache-Control','no-store'); res.setHeader('Vary','Origin');
    if (origin) {if (!allow.has(origin)) fail(403, 'Этот адрес сайта не подключён к кабинету.'); res.setHeader('Access-Control-Allow-Origin',origin);}
    if (method === 'OPTIONS') {res.writeHead(204, {'Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600'}); res.end(); return;}
    if (segments.length === 1 && segments[0] === 'health' && method === 'GET') return send({service:'slich', schema:1, storage:s.one('PRAGMA quick_check').quick_check === 'ok' ? 'ready' : 'error'});
    const address = req.socket.remoteAddress || 'unknown'; // Never trust public X-Forwarded-For.
    if (segments[0] === 'auth' && ['register','login'].includes(segments[1]) && method === 'POST') {
      limited(s, 'auth-ip:' + address, 40, 15 * 60000);
      const b = await body(req), login = str(b.login, 120).toLowerCase();
      if (!validLogin(login) || !validPassword(b.password)) fail(400, 'Логин: от 3 латинских символов. Пароль: от 12 до 256 символов.');
      limited(s, 'auth-login:' + hash(login), 12, 15 * 60000);
      if (segments[1] === 'login') {
        const u = s.one('SELECT * FROM users WHERE login=?', login);
        // Scrypt also runs for unknown accounts; never expose the account's existence.
        const matches = await passwordMatches(b.password, u?.password || ('0'.repeat(32) + ':' + '0'.repeat(128)));
        if (!u || !matches) fail(401, 'Неверный логин или пароль.');
        return send(session(s, u));
      }
      const name = str(b.name, 100), company = str(b.company, 160);
      if (name.length < 2 || company.length < 2 || b.dataConsent !== true) fail(400, 'Укажите имя, организацию и согласие с условиями передачи данных.');
      const password = await passwordHash(b.password), userId = id();
      const digest = str(b.invitation, 100) ? hash(b.invitation) : null;
      const u = s.transaction(() => {
        if (s.one('SELECT id FROM users WHERE login=?', login)) fail(409, 'Регистрация с этим логином недоступна. Выберите другой логин или войдите.');
        let orgId = id();
        if (digest) {
          const invite = s.one('SELECT * FROM invitations WHERE token_hash=? AND used_by IS NULL AND expires_at>?', digest, stamp());
          if (!invite) fail(410, 'Приглашение недействительно или уже использовано.');
          orgId = invite.org_id;
        } else s.run('INSERT INTO organizations VALUES(?,?,?)', orgId, company, stamp());
        s.run("INSERT INTO users VALUES(?,?,?,?,'client',?,?)", userId, login, name, password, orgId, stamp());
        if (digest) s.run('UPDATE invitations SET used_by=? WHERE token_hash=?', userId, digest);
        return s.one('SELECT * FROM users WHERE id=?',userId);
      });
      return send(session(s, u), 201);
    }
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
    const user = token && s.one('SELECT u.* FROM sessions t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?',hash(token),stamp());
    if (!user) fail(401, 'Войдите в кабинет. Сеанс мог завершиться.');
    const staff = user.role !== 'client';
    if (method !== 'GET') limited(s, 'write:' + user.id, 100, 60000);
    if (segments[0] === 'auth' && segments[1] === 'logout' && method === 'POST') {s.run('DELETE FROM sessions WHERE token_hash=?', hash(token)); return send({ok:true});}
    if (segments[0] === 'me' && method === 'GET') return send({user:publicUser(user), organization:user.org_id ? s.one('SELECT id,name FROM organizations WHERE id=?',user.org_id) : null, team:staff ? s.all("SELECT id,name,role FROM users WHERE role IN ('admin','operator') ORDER BY name") : []});
    if (segments[0] === 'invitations' && method === 'POST') {
      if (!user.org_id || staff) fail(403, 'Приглашение создаёт участник организации.');
      const invitation = randomBytes(32).toString('hex'), expiresAt = new Date(Date.now()+86400000).toISOString();
      s.run('INSERT INTO invitations VALUES(?,?,?,?,?)', hash(invitation),user.org_id,user.id,null,expiresAt);
      return send({invitation,expiresAt},201);
    }
    if (segments[0] !== 'cases') fail(404, 'Раздел не найден.');
    if (segments.length === 1 && method === 'GET') {
      const where = staff ? '1=1' : 'c.org_id=?', args = staff ? [] : [user.org_id];
      const offset = Math.max(0, Math.min(1000000, Number.parseInt(url.searchParams.get('offset') || '0') || 0));
      const list = s.all(`SELECT c.id,c.ref,c.title,c.status,c.updated_at,c.revision,c.assigned_to,o.name organization FROM cases c JOIN organizations o ON o.id=c.org_id WHERE ${where} ORDER BY c.created_at DESC,c.id DESC LIMIT 30 OFFSET ?`, ...args,offset);
      return send({cases:list,total:s.one(`SELECT COUNT(*) n FROM cases c WHERE ${where}`,...args).n,offset});
    }
    if (segments.length === 1 && method === 'POST') {
      if (!user.org_id || staff) fail(403,'Заявку создаёт представитель заказчика.');
      const b = await body(req), title = str(b.title,180), payload = core.normalize(b.payload), recommendation = core.recommend(payload);
      if (title.length<3 || payload.description.length<10 || recommendation.route==='incomplete' || b.dataConsent!==true) fail(400,'Заполните название, описание задачи, четыре вопроса и подтвердите передачу данных.');
      if (!/^[a-zA-Z0-9-]{16,100}$/.test(b.idempotencyKey || '')) fail(400,'Некорректный ключ отправки. Обновите страницу.');
      const requestHash = hash(JSON.stringify({title,payload}));
      const result = s.transaction(() => {
        const old = s.one('SELECT id,ref,request_hash FROM cases WHERE org_id=? AND idempotency_key=?',user.org_id,b.idempotencyKey);
        if (old) {if (old.request_hash!==requestHash) fail(409,'Этот ключ относится к другому описанию. Создайте новую отправку.'); return {id:old.id,ref:old.ref,reused:true};}
        limited(s,'case:' + user.id,20,3600000);
        const caseId=id(), ref='СЛИЧ-' + caseId.replaceAll('-','').slice(0,16).toUpperCase(), time=stamp();
        s.run('INSERT INTO cases(id,ref,org_id,created_by,title,payload,route,idempotency_key,request_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',caseId,ref,user.org_id,user.id,title,JSON.stringify(payload),recommendation.route,b.idempotencyKey,requestHash,time,time);
        s.event(caseId,user,'Заявка получена. Команда проверит применимость услуги и комплектность данных.');
        return {id:caseId,ref,reused:false};
      });
      return send(result,result.reused?200:201);
    }
    const caseId = segments[1], c = s.one('SELECT c.*,o.name organization FROM cases c JOIN organizations o ON o.id=c.org_id WHERE c.id=?',caseId);
    if (!c || (!staff && c.org_id!==user.org_id)) fail(404,'Заявка не найдена.');
    if (segments.length === 2 && method === 'GET') {
      const {idempotency_key,request_hash,created_by,...safe} = c;
      const service = core.recommend(JSON.parse(c.payload)).service;
      return send({...safe,payload:JSON.parse(c.payload),recommendation:core.recommend(JSON.parse(c.payload)),service:services.services.find(x=>x.id===service)||null,events:s.all('SELECT id,actor,body,internal,created_at FROM events WHERE case_id=? AND (?=1 OR internal=0) ORDER BY seq',caseId,staff?1:0),files:s.all('SELECT id,name,size,actor,created_at FROM attachments WHERE case_id=? ORDER BY created_at',caseId)});
    }
    if (['done','declined'].includes(c.status) && method!=='GET') fail(409,'Заявка завершена и доступна только для чтения.');
    if (segments[2] === 'messages' && method === 'POST') {
      const b=await body(req), text=str(b.text);
      if (!text) fail(400,'Введите сообщение.');
      if (b.internal && !staff) fail(403,'Внутренние заметки доступны только команде.');
      s.transaction(()=>{if(['done','declined'].includes(s.one('SELECT status FROM cases WHERE id=?',caseId).status))fail(409,'Заявка завершена.');s.event(caseId,user,text,staff&&b.internal?1:0);s.run('UPDATE cases SET updated_at=? WHERE id=?',stamp(),caseId);});
      return send({ok:true},201);
    }
    if (segments[2] === 'accept' && method === 'POST') {
      const b=await body(req);
      if (staff || c.org_id!==user.org_id) fail(403,'Объём согласует представитель заказчика.');
      s.transaction(()=>{
        const current=s.one('SELECT * FROM cases WHERE id=?',caseId);
        if (current.status!=='scoped' || !current.scope || !current.deliverables || current.price===null || b.scopeVersion!==current.scope_version || b.revision!==current.revision) fail(409,'Условия изменились или ещё не подготовлены. Обновите заявку.');
        s.run('UPDATE cases SET accepted_version=scope_version,revision=revision+1,updated_at=? WHERE id=?',stamp(),caseId);
        s.event(caseId,user,'Заказчик согласовал объём версии '+current.scope_version+'. Договор оформляется отдельно.');
      });
      return send({ok:true});
    }
    if (segments.length === 2 && method === 'PATCH') {
      if (!staff) fail(403,'Изменять условия и статус может команда.');
      const b=await body(req);
      s.transaction(()=>{
        const current=s.one('SELECT * FROM cases WHERE id=?',caseId);
        if(['done','declined'].includes(current.status))fail(409,'Заявка завершена.');
        if (b.revision!==current.revision) fail(409,'Другой участник изменил заявку. Обновите страницу.');
        const status=b.status, scope=str(b.scope,6000), deliverables=str(b.deliverables,4000), result=str(b.result,6000);
        const price=b.price===null || b.price==='' ? null : typeof b.price==='number' ? b.price : NaN;
        if (price!==null && (!Number.isSafeInteger(price)||price<0||price>100000000)) fail(400,'Укажите целую сумму в рублях.');
        if (!Object.hasOwn(transitions,status)||status!==current.status&&!transitions[current.status].includes(status)) fail(409,'Недопустимый переход статуса.');
        const changed=scope!==current.scope||deliverables!==current.deliverables||price!==current.price;
        const assigned=b.assignedTo || null;
        if (assigned && !s.one("SELECT id FROM users WHERE id=? AND role IN ('operator','admin')",assigned)) fail(400,'Выберите сотрудника команды.');
        if (status==='scoped' && (!scope||!deliverables||price===null)) fail(400,'Заполните объём, результат и цену.');
        if (['in_progress','review','done'].includes(status) && (changed||!scope||price===null||current.accepted_version!==current.scope_version)) fail(409,'Сначала согласуйте актуальный объём с заказчиком. Для изменения условий верните заявку на уточнение.');
        if (['review','done'].includes(status)&&!result) fail(400,'Добавьте итог работы.');
        const version=current.scope_version+(changed?1:0);
        s.run('UPDATE cases SET status=?,scope=?,deliverables=?,price=?,result=?,assigned_to=?,scope_version=?,accepted_version=?,revision=revision+1,updated_at=? WHERE id=?',status,scope,deliverables,price,result,assigned,version,changed?null:current.accepted_version,stamp(),caseId);
        s.event(caseId,user,'Команда обновила заявку. Статус: '+status+(changed?'\nОбъём версии '+version+': '+scope+'\nВыдаваемый результат: '+deliverables+'\nЦена: '+(price??'не определена')+' ₽.':'')+(result!==current.result?'\nИтог: '+result:''));
      });
      return send({ok:true});
    }
    if (segments[2] === 'files' && segments.length===3 && method==='POST') {
      const b=await body(req), name=str(b.name,180).replace(/[\x00-\x1f\\/]/g,'_');
      if (!/\.(pdf|csv|json|txt|png|jpe?g|docx|xlsx)$/i.test(name)) fail(400,'Допустимы PDF, CSV, JSON, TXT, PNG, JPG, DOCX и XLSX.');
      if (typeof b.base64!=='string'||!b.base64.length||b.base64.length%4!==0||/[^A-Za-z0-9+/=]/.test(b.base64)) fail(400,'Не удалось прочитать файл.');
      const content=Buffer.from(b.base64,'base64');
      if(content.toString('base64')!==b.base64)fail(400,'Не удалось прочитать файл.');
      if (!content.length||content.length>MAX_FILE) fail(413,'Файл должен быть не больше 5 МБ.');
      const fileId=id();
      s.transaction(()=>{if(['done','declined'].includes(s.one('SELECT status FROM cases WHERE id=?',caseId).status))fail(409,'Заявка завершена.');if(s.one('SELECT COUNT(*) n FROM attachments WHERE case_id=?',caseId).n>=20) fail(400,'До 20 файлов на заявку.');s.run('INSERT INTO attachments VALUES(?,?,?,?,?,?,?)',fileId,caseId,name,content.length,content,user.name,stamp());s.event(caseId,user,'Добавлен файл: '+name);});
      return send({id:fileId,name},201);
    }
    if (segments[2] === 'files' && segments.length===4 && method==='GET') {
      const f=s.one('SELECT * FROM attachments WHERE id=? AND case_id=?',segments[3],caseId);
      if (!f) fail(404,'Файл не найден.');
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(f.name),'Content-Security-Policy':"sandbox; default-src 'none'"});res.end(Buffer.from(f.content));return;
    }
    fail(404,'Раздел не найден.');
  }
  const server = createServer((req,res)=>route(req,res).catch(e=>{
    if(res.headersSent) {res.end();return;}
    if(!(e instanceof Problem)) console.error('SLICH API error:', e.name); // Never log descriptions, passwords or tokens.
    res.writeHead(e instanceof Problem?e.status:500,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({error:e instanceof Problem?e.message:'Не удалось выполнить запрос. Повторите позже; отправку подтверждает только номер заявки.'}));
  }));
  server.requestTimeout=30000;server.headersTimeout=15000;server.maxHeadersCount=50;
  return server;
}
