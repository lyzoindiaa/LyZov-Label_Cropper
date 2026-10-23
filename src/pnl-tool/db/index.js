/**
 * Local IndexedDB Database Engine for P&L Analyzer (v2)
 *
 * Implements strict period partitioning (YYYY-MM), deterministic natural key upserts,
 * file-hash duplicate blocking, and complete import history with undo capability.
 */
import { DEMO_PRODUCTS, DEMO_BATCHES, DEMO_ORDER_LINES, DEMO_AUDIT_REPORT } from './seedData.js';
import { normalizeSkuKey } from '../domain/sku.js';

const DB_NAME = 'lyzov_pnl_db';
const DB_VERSION = 2;

let dbInstance = null;

export function openLocalDb() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Imports store (tracks file hash, periods, rows added/updated/skipped)
      if (!db.objectStoreNames.contains('imports')) {
        const importStore = db.createObjectStore('imports', { keyPath: 'id' });
        importStore.createIndex('sellerId', 'sellerId', { unique: false });
        importStore.createIndex('fileHash', 'fileHash', { unique: false });
        importStore.createIndex('period', 'period', { unique: false });
        importStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }

      // 2. Order Items store (upserted by deterministic natural key)
      if (!db.objectStoreNames.contains('orderItems')) {
        const itemStore = db.createObjectStore('orderItems', { keyPath: 'uniqueKey' });
        itemStore.createIndex('sellerId', 'sellerId', { unique: false });
        itemStore.createIndex('period', 'period', { unique: false });
        itemStore.createIndex('importId', 'importId', { unique: false });
        itemStore.createIndex('skuKey', 'skuKey', { unique: false });
        itemStore.createIndex('orderItemId', 'orderItemId', { unique: false });
        itemStore.createIndex('channelId', 'channelId', { unique: false });
        itemStore.createIndex('seller_period', ['sellerId', 'period'], { unique: false });
      }

      // 3. Product master store (keyed by normalized skuKey)
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'skuKey' });
        prodStore.createIndex('sellerId', 'sellerId', { unique: false });
      } else {
        // v1 used 'sku' - we will support skuKey
      }

      // 4. SKU Aliases store (maps aliasKey -> targetSkuKey)
      if (!db.objectStoreNames.contains('skuAliases')) {
        const aliasStore = db.createObjectStore('skuAliases', { keyPath: 'aliasKey' });
        aliasStore.createIndex('sellerId', 'sellerId', { unique: false });
        aliasStore.createIndex('targetSkuKey', 'targetSkuKey', { unique: false });
      }

      // 5. Monthly Expenses store (ad spend, overheads per seller & period)
      if (!db.objectStoreNames.contains('monthlyExpenses')) {
        const expStore = db.createObjectStore('monthlyExpenses', { keyPath: 'id' });
        expStore.createIndex('sellerId', 'sellerId', { unique: false });
        expStore.createIndex('period', 'period', { unique: false });
        expStore.createIndex('seller_period', ['sellerId', 'period'], { unique: false });
      }

      // Legacy stores kept for compatibility
      if (!db.objectStoreNames.contains('batches')) {
        const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
        batchStore.createIndex('channelId', 'channelId', { unique: false });
        batchStore.createIndex('fileHash', 'fileHash', { unique: false });
      }

      if (!db.objectStoreNames.contains('rawRows')) {
        const rawStore = db.createObjectStore('rawRows', { keyPath: 'id' });
        rawStore.createIndex('batchId', 'batchId', { unique: false });
      }

      if (!db.objectStoreNames.contains('orderLines')) {
        const orderStore = db.createObjectStore('orderLines', { keyPath: 'id' });
        orderStore.createIndex('batchId', 'batchId', { unique: false });
        orderStore.createIndex('channelId', 'channelId', { unique: false });
        orderStore.createIndex('sku', 'sku', { unique: false });
        orderStore.createIndex('orderDate', 'orderDate', { unique: false });
      }

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

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS & IDEMPOTENT HASH CHECK
// ─────────────────────────────────────────────────────────────────────────────

export async function checkFileHash(fileHash, sellerId = 'default_seller') {
  if (!fileHash) return null;
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('imports', 'readonly');
    const store = tx.objectStore('imports');
    const idx = store.index('fileHash');
    const req = idx.getAll(fileHash);
    req.onsuccess = () => {
      const matches = (req.result || []).filter((imp) => imp.sellerId === sellerId);
      resolve(matches.length > 0 ? matches[0] : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalImports(sellerId = 'default_seller') {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('imports', 'readonly');
    const store = tx.objectStore('imports');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result || [])
        .filter((imp) => !sellerId || imp.sellerId === sellerId)
        .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NATURAL KEY UPSERT FOR ORDER ITEMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts normalized items by deterministic uniqueKey and writes the import record.
 * Never appends blindly; existing rows are updated, duplicate identical rows skipped.
 */
export async function upsertOrderItems({ items = [], importRecord }) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['orderItems', 'imports', 'orderLines'], 'readwrite');
    const itemStore = tx.objectStore('orderItems');
    const importStore = tx.objectStore('imports');
    const legacyStore = tx.objectStore('orderLines');

    let rowsAdded = 0;
    let rowsUpdated = 0;
    let rowsSkipped = 0;

    let processedCount = 0;
    const total = items.length;

    if (total === 0) {
      if (importRecord) {
        importStore.put({ ...importRecord, rowsAdded: 0, rowsUpdated: 0, rowsSkipped: 0 });
      }
      tx.oncomplete = () => resolve({ rowsAdded: 0, rowsUpdated: 0, rowsSkipped: 0 });
      return;
    }

    items.forEach((item) => {
      const getReq = itemStore.get(item.uniqueKey);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          // New row
          itemStore.put(item);
          // Sync with legacy store for any legacy reader
          legacyStore.put({ ...item, id: item.uniqueKey });
          rowsAdded++;
        } else {
          // Row exists - update if values changed, or record update
          const isIdentical = JSON.stringify(existing) === JSON.stringify(item);
          if (isIdentical) {
            rowsSkipped++;
          } else {
            // Keep prior state in history or update
            itemStore.put({ ...existing, ...item, previousState: existing });
            legacyStore.put({ ...item, id: item.uniqueKey });
            rowsUpdated++;
          }
        }

        processedCount++;
        if (processedCount === total) {
          const finalRecord = {
            ...importRecord,
            rowsAdded,
            rowsUpdated,
            rowsSkipped,
          };
          importStore.put(finalRecord);
        }
      };

      getReq.onerror = () => {
        processedCount++;
      };
    });

    tx.oncomplete = () => {
      resolve({ rowsAdded, rowsUpdated, rowsSkipped });
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD-SCOPED RETRIEVAL
// ─────────────────────────────────────────────────────────────────────────────

export async function getDistinctPeriods(sellerId = 'default_seller') {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderItems', 'readonly');
    const store = tx.objectStore('orderItems');
    const req = store.getAll();
    req.onsuccess = () => {
      const periods = new Set();
      (req.result || []).forEach((row) => {
        if (!sellerId || row.sellerId === sellerId) {
          if (row.period && /^\d{4}-\d{2}$/.test(row.period)) {
            periods.add(row.period);
          }
        }
      });
      // Sort descending (latest month first)
      const sorted = Array.from(periods).sort().reverse();
      resolve(sorted);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getRowsByPeriod(sellerId = 'default_seller', period = null) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderItems', 'readonly');
    const store = tx.objectStore('orderItems');
    let req;

    if (period && period !== 'all') {
      const idx = store.index('period');
      req = idx.getAll(period);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => {
      let results = req.result || [];
      if (sellerId) {
        results = results.filter((r) => r.sellerId === sellerId);
      }
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT DELETION / UNDO
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteLocalImport(importId) {
  if (!importId) return false;
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['orderItems', 'imports', 'orderLines'], 'readwrite');
    const itemStore = tx.objectStore('orderItems');
    const importStore = tx.objectStore('imports');
    const legacyStore = tx.objectStore('orderLines');

    const itemIdx = itemStore.index('importId');
    const req = itemIdx.getAll(importId);

    req.onsuccess = () => {
      const items = req.result || [];
      for (const item of items) {
        if (item.previousState) {
          // Restore previous row state if this import had only updated it
          itemStore.put(item.previousState);
          legacyStore.put({ ...item.previousState, id: item.uniqueKey });
        } else {
          // Row was newly created by this import: delete it
          itemStore.delete(item.uniqueKey);
          legacyStore.delete(item.uniqueKey);
        }
      }
      importStore.delete(importId);
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT MASTER & SKU ALIASES
// ─────────────────────────────────────────────────────────────────────────────

export async function saveLocalProduct(product) {
  const db = await openLocalDb();
  const skuKey = product.skuKey || normalizeSkuKey(product.sku);
  const doc = {
    ...product,
    skuKey,
    sku: product.sku || product.originalSku || skuKey.toUpperCase(),
    sellerId: product.sellerId || 'default_seller',
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    store.put(doc);
    tx.oncomplete = () => resolve(doc);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalProducts(sellerId = 'default_seller') {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const req = store.getAll();
    req.onsuccess = () => {
      let all = req.result || [];
      if (sellerId) {
        all = all.filter((p) => !p.sellerId || p.sellerId === sellerId);
      }
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalSkuAlias({ alias, targetSku, sellerId = 'default_seller' }) {
  const aliasKey = normalizeSkuKey(alias);
  const targetSkuKey = normalizeSkuKey(targetSku);
  if (!aliasKey || !targetSkuKey) return null;

  const db = await openLocalDb();
  const doc = {
    aliasKey,
    originalAlias: String(alias).trim(),
    targetSkuKey,
    targetSku: String(targetSku).trim(),
    sellerId,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('skuAliases', 'readwrite');
    const store = tx.objectStore('skuAliases');
    store.put(doc);
    tx.oncomplete = () => resolve(doc);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalSkuAliases(sellerId = 'default_seller') {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skuAliases', 'readonly');
    const store = tx.objectStore('skuAliases');
    const req = store.getAll();
    req.onsuccess = () => {
      const aliasMap = {};
      (req.result || []).forEach((row) => {
        if (!sellerId || !row.sellerId || row.sellerId === sellerId) {
          aliasMap[row.aliasKey] = row.targetSkuKey;
        }
      });
      resolve(aliasMap);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY EXPENSES (AD SPEND, OVERHEADS)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveLocalMonthlyExpense({ sellerId = 'default_seller', period, type, amountPaise, notes = '' }) {
  const id = `${sellerId}_${period}_${type}`;
  const db = await openLocalDb();
  const doc = {
    id,
    sellerId,
    period,
    type,
    amountPaise: Math.round(amountPaise || 0),
    notes,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('monthlyExpenses', 'readwrite');
    const store = tx.objectStore('monthlyExpenses');
    store.put(doc);
    tx.oncomplete = () => resolve(doc);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalMonthlyExpenses(sellerId = 'default_seller', period = null) {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('monthlyExpenses', 'readonly');
    const store = tx.objectStore('monthlyExpenses');
    let req;
    if (period && period !== 'all') {
      const idx = store.index('period');
      req = idx.getAll(period);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => {
      let results = req.result || [];
      if (sellerId) {
        results = results.filter((e) => !e.sellerId || e.sellerId === sellerId);
      }
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY METHODS
// ─────────────────────────────────────────────────────────────────────────────

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

export async function clearLocalDatabase() {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const stores = ['batches', 'orderLines', 'products', 'rawRows', 'imports', 'orderItems', 'skuAliases', 'monthlyExpenses'];
    const existingStores = stores.filter((s) => db.objectStoreNames.contains(s));
    const tx = db.transaction(existingStores, 'readwrite');
    existingStores.forEach((s) => tx.objectStore(s).clear());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function seedLocalDatabase(force = false) {
  const existingProducts = await getLocalProducts();
  if (existingProducts.length > 0 && !force) {
    const existingOrders = await getLocalOrderLines();
    const existingBatches = await getLocalBatches();
    return {
      products: existingProducts,
      batches: existingBatches,
      orders: existingOrders,
      audit: DEMO_AUDIT_REPORT,
    };
  }

  for (const p of DEMO_PRODUCTS) {
    await saveLocalProduct({
      ...p,
      skuKey: normalizeSkuKey(p.sku),
      originalSku: p.sku,
    });
  }

  for (const b of DEMO_BATCHES) {
    await saveLocalBatch(b);
  }

  await saveLocalOrderLines(DEMO_ORDER_LINES);

  return {
    products: DEMO_PRODUCTS,
    batches: DEMO_BATCHES,
    orders: DEMO_ORDER_LINES,
    audit: DEMO_AUDIT_REPORT,
  };
}
