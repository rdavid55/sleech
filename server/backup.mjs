import { DatabaseSync, backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync, chmodSync } from 'node:fs';
process.umask(0o077);
const destination=resolve(process.argv[2]||`backups/slich-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
mkdirSync(resolve(destination,'..'),{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(process.env.SLICH_DATA_DIR||'data','slich.sqlite'),{readOnly:true});
try {await backup(db,destination);chmodSync(destination,0o600);console.log('Резервная копия создана: '+destination);}finally{db.close()}
