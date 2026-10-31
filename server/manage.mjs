// Only a server operator can create team identities. No browser role assignment exists.
import { resolve } from 'node:path';
import { openStore, id, stamp, passwordHash } from './store.mjs';
process.umask(0o077);
const [action,loginArg,name,role='operator']=process.argv.slice(2);
const login=String(loginArg||'').toLowerCase();
if(!['add','reset-password'].includes(action)||! /^[a-z0-9][a-z0-9._@+-]{2,119}$/.test(login)||action==='add'&&(!name||!['operator','admin'].includes(role))) throw Error('Usage: npm run team -- add <login> "<name>" [admin|operator], or reset-password <login>. Supply the new password through stdin.');
if(process.stdin.isTTY) console.log('Введите пароль (от 12 символов). Для скрытого ввода используйте инструкцию server/README.md.');
let password='';for await(const chunk of process.stdin)password+=chunk;password=password.replace(/\r?\n$/,'');
if(password.length<12||password.length>256)throw Error('Пароль должен содержать от 12 до 256 символов.');
const encoded=await passwordHash(password),store=openStore(resolve(process.env.SLICH_DATA_DIR||'data','slich.sqlite'));
try{
 if(action==='add') {if(store.one('SELECT id FROM users WHERE login=?',login))throw Error('Этот логин уже занят.');store.run('INSERT INTO users VALUES(?,?,?,?,?,NULL,?)',id(),login,name,encoded,role,stamp());}
 else {const user=store.one('SELECT id FROM users WHERE login=?',login);if(!user)throw Error('Учётная запись не найдена.');store.transaction(()=>{store.run('UPDATE users SET password=? WHERE id=?',encoded,user.id);store.run('DELETE FROM sessions WHERE user_id=?',user.id);});}
 console.log('Учётная запись обновлена.');
}finally{store.close()}
