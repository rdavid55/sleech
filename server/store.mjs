import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const stamp = () => new Date().toISOString();
export const id = () => randomUUID();
export const hash = value => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return salt + ':' + key.toString('hex');
}
export async function passwordMatches(password, stored) {
  const [salt, expected] = stored.split(':'), key = await scrypt(password, salt, 64);
  const target = Buffer.from(expected, 'hex');
  return target.length === key.length && timingSafeEqual(target, key);
}
export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), {recursive: true, mode: 0o700});
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, login TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('client','operator','admin')), org_id TEXT REFERENCES organizations(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, ref TEXT NOT NULL UNIQUE, org_id TEXT NOT NULL REFERENCES organizations(id), created_by TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, payload TEXT NOT NULL, route TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', assigned_to TEXT REFERENCES users(id), scope TEXT NOT NULL DEFAULT '', deliverables TEXT NOT NULL DEFAULT '', price INTEGER, result TEXT NOT NULL DEFAULT '', scope_version INTEGER NOT NULL DEFAULT 0, accepted_version INTEGER, revision INTEGER NOT NULL DEFAULT 1, idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(org_id,idempotency_key));
    CREATE INDEX IF NOT EXISTS cases_org_date ON cases(org_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, case_id TEXT NOT NULL REFERENCES cases(id), user_id TEXT NOT NULL REFERENCES users(id), actor TEXT NOT NULL, body TEXT NOT NULL, internal INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_case ON events(case_id,seq);
    CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), name TEXT NOT NULL, size INTEGER NOT NULL, content BLOB NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS invitations(token_hash TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), created_by TEXT NOT NULL REFERENCES users(id), used_by TEXT REFERENCES users(id), expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
    PRAGMA user_version=1;
  `);
  const store = {
    db,
    one: (sql, ...args) => db.prepare(sql).get(...args),
    all: (sql, ...args) => db.prepare(sql).all(...args),
    run: (sql, ...args) => db.prepare(sql).run(...args),
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {const result = fn(); db.exec('COMMIT'); return result;} catch (e) {db.exec('ROLLBACK'); throw e;}
    },
    event(caseId, user, text, internal = 0) {
      store.run('INSERT INTO events(id,case_id,user_id,actor,body,internal,created_at) VALUES(?,?,?,?,?,?,?)', id(), caseId, user.id, user.name, text, internal, stamp());
    },
    close: () => db.close()
  };
  return store;
}
