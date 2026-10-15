/**
 * Local IndexedDB Database Engine for P&L Analyzer
 * Provides blazing-fast client-side storage for files, raw rows, batches, and cache.
 */

const DB_NAME = 'lyzov_pnl_db';
const DB_VERSION = 1;

let dbInstance = null;

export function openLocalDb() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Batches store
      if (!db.objectStoreNames.contains('batches')) {
        const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
        batchStore.createIndex('channelId', 'channelId', { unique: false });
        batchStore.createIndex('fileHash', 'fileHash', { unique: false });
      }

      // Raw rows store (traceability)
      if (!db.objectStoreNames.contains('rawRows')) {
        const rawStore = db.createObjectStore('rawRows', { keyPath: 'id' });
        rawStore.createIndex('batchId', 'batchId', { unique: false });
      }

      // Normalized order lines
      if (!db.objectStoreNames.contains('orderLines')) {
        const orderStore = db.createObjectStore('orderLines', { keyPath: 'id' });
        orderStore.createIndex('batchId', 'batchId', { unique: false });
        orderStore.createIndex('channelId', 'channelId', { unique: false });
        orderStore.createIndex('sku', 'sku', { unique: false });
        orderStore.createIndex('orderDate', 'orderDate', { unique: false });
      }

      // Product master
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'sku' });
      }

      // Templates
      if (!db.objectStoreNames.contains('templates')) {
        const tmplStore = db.createObjectStore('templates', { keyPath: 'id' });
        tmplStore.createIndex('channelId', 'channelId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function saveLocalBatch(batch) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('batches', 'readwrite');
    const store = tx.objectStore('batches');
    store.put(batch);
    tx.oncomplete = () => resolve(batch);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalBatches() {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('batches', 'readonly');
    const store = tx.objectStore('batches');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalRawRows(rawRows) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('rawRows', 'readwrite');
    const store = tx.objectStore('rawRows');
    for (const row of rawRows) {
      store.put(row);
    }
    tx.oncomplete = () => resolve(rawRows.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalRawRow(id) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('rawRows', 'readonly');
    const store = tx.objectStore('rawRows');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalOrderLines(orderLines) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderLines', 'readwrite');
    const store = tx.objectStore('orderLines');
    for (const line of orderLines) {
      store.put(line);
    }
    tx.oncomplete = () => resolve(orderLines.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalOrderLines(batchId = null) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderLines', 'readonly');
    const store = tx.objectStore('orderLines');
    let req;
    if (batchId) {
      const idx = store.index('batchId');
      req = idx.getAll(batchId);
    } else {
      req = store.getAll();
    }
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalProduct(product) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    store.put(product);
    tx.oncomplete = () => resolve(product);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalProducts() {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
