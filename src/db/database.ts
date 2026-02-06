// Database initialization and management
// Uses IndexedDB via 'idb' library for web
// TODO: Add Capacitor SQLite support for native builds

import { openDB, IDBPDatabase } from 'idb';
import { MediaLibraryDB, DB_NAME, DB_VERSION } from './schema';

let dbInstance: IDBPDatabase<MediaLibraryDB> | null = null;

export async function initDatabase(): Promise<IDBPDatabase<MediaLibraryDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<MediaLibraryDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);

      // Owners store
      if (!db.objectStoreNames.contains('owners')) {
        const ownerStore = db.createObjectStore('owners', { keyPath: 'ownerId' });
        ownerStore.createIndex('by-displayName', 'displayName');
      }

      // Libraries store
      if (!db.objectStoreNames.contains('libraries')) {
        const libraryStore = db.createObjectStore('libraries', { keyPath: 'libraryId' });
        libraryStore.createIndex('by-ownerId', 'ownerId');
        libraryStore.createIndex('by-sharedLibraryId', 'sharedLibraryId');
      }

      // Items store
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'itemId' });
        itemStore.createIndex('by-libraryId', 'libraryId');
        itemStore.createIndex('by-ownerId', 'ownerId');
        itemStore.createIndex('by-sharedLibraryId', 'sharedLibraryId');
        itemStore.createIndex('by-tmdbId', 'tmdbId');
        itemStore.createIndex('by-title', 'title');
      }

      // TMDB cache store
      if (!db.objectStoreNames.contains('tmdb_cache')) {
        const cacheStore = db.createObjectStore('tmdb_cache', { keyPath: 'tmdbId' });
        cacheStore.createIndex('by-type', 'type');
      }

      // App settings store
      if (!db.objectStoreNames.contains('app_settings')) {
        db.createObjectStore('app_settings', { keyPath: 'key' });
      }
    },
    blocked() {
      console.warn('Database blocked - close other tabs using this database');
    },
    blocking() {
      console.warn('This connection is blocking a database upgrade');
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.warn('Database connection terminated unexpectedly');
      dbInstance = null;
    },
  });

  return dbInstance;
}

export async function getDatabase(): Promise<IDBPDatabase<MediaLibraryDB>> {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Settings helpers
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const setting = await db.get('app_settings', key);
  return setting?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.put('app_settings', { key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('app_settings', key);
}
