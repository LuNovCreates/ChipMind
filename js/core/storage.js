/* ════════════════════════════════════════════════════
   ChipMind — storage.js
   Wrapper IndexedDB. localStorage interdit pour les données core.
════════════════════════════════════════════════════ */

const DB_NAME    = 'ChipMindDB';
const DB_VERSION = 1;
const STORE      = 'kv';

let _db = null;

function _open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

export async function get(key) {
  const db = await _open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function set(key, value) {
  const db = await _open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

export async function remove(key) {
  const db = await _open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

/* Efface tout : IndexedDB + localStorage + SW caches */
export async function reset() {
  if (_db) { _db.close(); _db = null; }
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
  localStorage.clear();
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
}

/* Objet façade pour l'API spec : db.get / db.set / db.delete / db.reset */
export const db = { get, set, delete: remove, reset };
export default db;
