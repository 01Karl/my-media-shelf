





const FILES_DB_NAME = 'media-library-files';
const FILES_STORE_NAME = 'files';


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


const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const storageService = {
  



  async saveImage(dataUrl: string, itemId: string, type: 'front' | 'back'): Promise<string> {
    const filename = `${itemId}_${type}_${Date.now()}.jpg`;
    const path = `images/${filename}`;

    if (isCapacitor()) {
      return this.saveImageCapacitor(dataUrl, path);
    } else {
      return this.saveImageWeb(dataUrl, path);
    }
  },

  


  async saveImageCapacitor(dataUrl: string, path: string): Promise<string> {
    try {
      
      












      
      console.warn('Capacitor Filesystem not available, falling back to web storage');
      return this.saveImageWeb(dataUrl, path);
    } catch (error) {
      console.error('Capacitor file save error:', error);
      throw error;
    }
  },

  


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

  



  async loadImage(path: string): Promise<string | null> {
    if (isCapacitor()) {
      return this.loadImageCapacitor(path);
    } else {
      return this.loadImageWeb(path);
    }
  },

  


  async loadImageCapacitor(path: string): Promise<string | null> {
    try {
      
      







      
      return this.loadImageWeb(path);
    } catch (error) {
      console.error('Capacitor file read error:', error);
      return null;
    }
  },

  


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

  


  async deleteImage(path: string): Promise<boolean> {
    if (isCapacitor()) {
      return this.deleteImageCapacitor(path);
    } else {
      return this.deleteImageWeb(path);
    }
  },

  


  async deleteImageCapacitor(path: string): Promise<boolean> {
    try {
      
      






      
      return this.deleteImageWeb(path);
    } catch (error) {
      console.error('Capacitor file delete error:', error);
      return false;
    }
  },

  


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

  


  async fileExists(path: string): Promise<boolean> {
    const data = await this.loadImage(path);
    return data !== null;
  },

  


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
      
    }
    
    return { used: 0, available: 0 };
  },

  


  async clearAllFiles(): Promise<void> {
    if (isCapacitor()) {
      
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
