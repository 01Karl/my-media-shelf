// File Storage Service - manages local file storage
// Uses Capacitor Filesystem on native, IndexedDB on web

// TODO: Install @capacitor/filesystem for native builds
// import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const FILES_DB_NAME = 'media-library-files';
const FILES_STORE_NAME = 'files';

// Initialize IndexedDB for file storage on web
async function getFilesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILES_DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME, { keyPath: 'path' });
      }
    };
  });
}

// Check if running in Capacitor
const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const storageService = {
  /**
   * Save an image to local storage
   * Returns the path where the file was saved
   */
  async saveImage(dataUrl: string, itemId: string, type: 'front' | 'back'): Promise<string> {
    const filename = `${itemId}_${type}_${Date.now()}.jpg`;
    const path = `images/${filename}`;

    if (isCapacitor()) {
      return this.saveImageCapacitor(dataUrl, path);
    } else {
      return this.saveImageWeb(dataUrl, path);
    }
  },

  /**
   * Save image using Capacitor Filesystem
   */
  async saveImageCapacitor(dataUrl: string, path: string): Promise<string> {
    try {
      // TODO: Uncomment when @capacitor/filesystem is installed
      /*
      // Remove data URL prefix
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      
      const result = await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Data,
        recursive: true,
      });

      return result.uri;
      */
      
      console.warn('Capacitor Filesystem not available, falling back to web storage');
      return this.saveImageWeb(dataUrl, path);
    } catch (error) {
      console.error('Capacitor file save error:', error);
      throw error;
    }
  },

  /**
   * Save image using IndexedDB (web fallback)
   */
  async saveImageWeb(dataUrl: string, path: string): Promise<string> {
    const db = await getFilesDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FILES_STORE_NAME);
      
      const request = store.put({ path, dataUrl, createdAt: new Date().toISOString() });
      
      request.onsuccess = () => resolve(path);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Load an image from local storage
   * Returns the data URL
   */
  async loadImage(path: string): Promise<string | null> {
    if (isCapacitor()) {
      return this.loadImageCapacitor(path);
    } else {
      return this.loadImageWeb(path);
    }
  },

  /**
   * Load image using Capacitor Filesystem
   */
  async loadImageCapacitor(path: string): Promise<string | null> {
    try {
      // TODO: Uncomment when @capacitor/filesystem is installed
      /*
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data,
      });

      return `data:image/jpeg;base64,${result.data}`;
      */
      
      return this.loadImageWeb(path);
    } catch (error) {
      console.error('Capacitor file read error:', error);
      return null;
    }
  },

  /**
   * Load image using IndexedDB
   */
  async loadImageWeb(path: string): Promise<string | null> {
    const db = await getFilesDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE_NAME], 'readonly');
      const store = transaction.objectStore(FILES_STORE_NAME);
      
      const request = store.get(path);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.dataUrl ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete an image from local storage
   */
  async deleteImage(path: string): Promise<boolean> {
    if (isCapacitor()) {
      return this.deleteImageCapacitor(path);
    } else {
      return this.deleteImageWeb(path);
    }
  },

  /**
   * Delete image using Capacitor Filesystem
   */
  async deleteImageCapacitor(path: string): Promise<boolean> {
    try {
      // TODO: Uncomment when @capacitor/filesystem is installed
      /*
      await Filesystem.deleteFile({
        path,
        directory: Directory.Data,
      });
      return true;
      */
      
      return this.deleteImageWeb(path);
    } catch (error) {
      console.error('Capacitor file delete error:', error);
      return false;
    }
  },

  /**
   * Delete image using IndexedDB
   */
  async deleteImageWeb(path: string): Promise<boolean> {
    const db = await getFilesDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FILES_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(FILES_STORE_NAME);
      
      const request = store.delete(path);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('File delete error:', request.error);
        resolve(false);
      };
    });
  },

  /**
   * Check if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    const data = await this.loadImage(path);
    return data !== null;
  },

  /**
   * Get storage usage stats (web only)
   */
  async getStorageStats(): Promise<{ used: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
        };
      }
    } catch {
      // Storage API not available
    }
    
    return { used: 0, available: 0 };
  },

  /**
   * Clear all stored files (use with caution!)
   */
  async clearAllFiles(): Promise<void> {
    if (isCapacitor()) {
      // TODO: Implement for Capacitor
      console.warn('clearAllFiles not implemented for Capacitor');
    } else {
      const db = await getFilesDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FILES_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(FILES_STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  },
};
