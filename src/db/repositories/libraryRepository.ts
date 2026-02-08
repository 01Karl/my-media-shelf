

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import type { Library } from '@/types';

export const libraryRepository = {
  async create(
    ownerId: string,
    name: string,
    options?: {
      description?: string;
      icon?: string;
      isShared?: boolean;
      sharedLibraryId?: string;
    }
  ): Promise<Library> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const library: Library = {
      libraryId: uuidv4(),
      ownerId,
      sharedLibraryId: options?.isShared ? (options.sharedLibraryId || uuidv4()) : null,
      name,
      description: options?.description,
      icon: options?.icon,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('libraries', library);
    return library;
  },

  async getById(libraryId: string): Promise<Library | null> {
    const db = await getDatabase();
    const library = await db.get('libraries', libraryId);
    return library ?? null;
  },

  async getAll(): Promise<Library[]> {
    const db = await getDatabase();
    return db.getAll('libraries');
  },

  async getByOwner(ownerId: string): Promise<Library[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('libraries', 'by-ownerId', ownerId);
  },

  async getBySharedId(sharedLibraryId: string): Promise<Library[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('libraries', 'by-sharedLibraryId', sharedLibraryId);
  },

  async getSharedLibraries(): Promise<Library[]> {
    const db = await getDatabase();
    const all = await db.getAll('libraries');
    return all.filter(lib => lib.sharedLibraryId !== null);
  },

  async update(
    libraryId: string,
    updates: Partial<Pick<Library, 'name' | 'description' | 'icon' | 'sharedLibraryId'>>
  ): Promise<Library | null> {
    const db = await getDatabase();
    const existing = await db.get('libraries', libraryId);
    
    if (!existing) return null;

    const updated: Library = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('libraries', updated);
    return updated;
  },

  async makeShared(libraryId: string, sharedLibraryId?: string): Promise<Library | null> {
    return this.update(libraryId, {
      sharedLibraryId: sharedLibraryId || uuidv4(),
    });
  },

  async delete(libraryId: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.get('libraries', libraryId);
    
    if (!existing) return false;
    
    
    const items = await db.getAllFromIndex('items', 'by-libraryId', libraryId);
    const tx = db.transaction(['libraries', 'items'], 'readwrite');
    
    for (const item of items) {
      await tx.objectStore('items').delete(item.itemId);
    }
    
    await tx.objectStore('libraries').delete(libraryId);
    await tx.done;
    
    return true;
  },

  async getItemCount(libraryId: string): Promise<number> {
    const db = await getDatabase();
    const items = await db.getAllFromIndex('items', 'by-libraryId', libraryId);
    return items.length;
  },

  
  async upsertForSync(library: Library, localOwnerId: string): Promise<Library> {
    const db = await getDatabase();
    
    
    if (library.sharedLibraryId) {
      const existingShared = await this.getBySharedId(library.sharedLibraryId);
      const localVersion = existingShared.find(lib => lib.ownerId === localOwnerId);
      
      if (localVersion) {
        
        return localVersion;
      }
    }
    
    
    const now = new Date().toISOString();
    const newLibrary: Library = {
      ...library,
      libraryId: uuidv4(), 
      ownerId: localOwnerId, 
      updatedAt: now,
    };
    
    await db.add('libraries', newLibrary);
    return newLibrary;
  },
};
