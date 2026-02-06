// Item repository - manages media items

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import type { MediaItem, MediaType, MediaFormat, UnifiedWork, WorkCopy } from '@/types';
import { ownerRepository } from './ownerRepository';

// Normalize title for matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Create a unique key for matching works without TMDB ID
function createWorkKey(item: MediaItem): string {
  const normalized = normalizeTitle(item.title);
  return `${normalized}|${item.year || 'unknown'}|${item.type}|${item.season || 0}`;
}

export const itemRepository = {
  async create(
    libraryId: string,
    ownerId: string,
    data: {
      type: MediaType;
      title: string;
      format: MediaFormat;
      year?: number;
      season?: number;
      frontImagePath?: string;
      backImagePath?: string;
      ocrTextFront?: string;
      ocrTextBack?: string;
      tmdbId?: number;
      notes?: string;
      audioInfo?: string;
      videoInfo?: string;
      languages?: string;
      subtitles?: string;
    },
    sharedLibraryId?: string | null
  ): Promise<MediaItem> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const item: MediaItem = {
      itemId: uuidv4(),
      libraryId,
      sharedLibraryId: sharedLibraryId ?? null,
      ownerId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('items', item);
    return item;
  },

  async getById(itemId: string): Promise<MediaItem | null> {
    const db = await getDatabase();
    const item = await db.get('items', itemId);
    return item ?? null;
  },

  async getAll(): Promise<MediaItem[]> {
    const db = await getDatabase();
    return db.getAll('items');
  },

  async getByLibrary(libraryId: string): Promise<MediaItem[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('items', 'by-libraryId', libraryId);
  },

  async getByOwner(ownerId: string): Promise<MediaItem[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('items', 'by-ownerId', ownerId);
  },

  async getBySharedLibrary(sharedLibraryId: string): Promise<MediaItem[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('items', 'by-sharedLibraryId', sharedLibraryId);
  },

  async getByTmdbId(tmdbId: number): Promise<MediaItem[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('items', 'by-tmdbId', tmdbId);
  },

  async search(query: string, libraryId?: string): Promise<MediaItem[]> {
    const db = await getDatabase();
    const normalizedQuery = normalizeTitle(query);
    
    let items: MediaItem[];
    if (libraryId) {
      items = await db.getAllFromIndex('items', 'by-libraryId', libraryId);
    } else {
      items = await db.getAll('items');
    }
    
    return items.filter(item => 
      normalizeTitle(item.title).includes(normalizedQuery)
    );
  },

  async update(
    itemId: string,
    updates: Partial<Omit<MediaItem, 'itemId' | 'createdAt'>>
  ): Promise<MediaItem | null> {
    const db = await getDatabase();
    const existing = await db.get('items', itemId);
    
    if (!existing) return null;

    const updated: MediaItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('items', updated);
    return updated;
  },

  async moveToLibrary(itemId: string, newLibraryId: string, newSharedLibraryId?: string | null): Promise<MediaItem | null> {
    return this.update(itemId, { 
      libraryId: newLibraryId,
      sharedLibraryId: newSharedLibraryId,
    });
  },

  async delete(itemId: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.get('items', itemId);
    
    if (!existing) return false;
    
    await db.delete('items', itemId);
    return true;
  },

  // Get unified works for a shared library (groups items by work)
  async getUnifiedWorks(sharedLibraryId: string): Promise<UnifiedWork[]> {
    const items = await this.getBySharedLibrary(sharedLibraryId);
    const owners = await ownerRepository.getAll();
    const ownerMap = new Map(owners.map(o => [o.ownerId, o.displayName]));
    
    // Group by tmdbId or normalized key
    const workMap = new Map<string, UnifiedWork>();
    
    for (const item of items) {
      const workKey = item.tmdbId?.toString() || createWorkKey(item);
      
      if (!workMap.has(workKey)) {
        workMap.set(workKey, {
          workId: workKey,
          sharedLibraryId,
          tmdbId: item.tmdbId,
          title: item.title,
          year: item.year,
          season: item.season,
          type: item.type,
          copies: [],
        });
      }
      
      const work = workMap.get(workKey)!;
      work.copies.push({
        itemId: item.itemId,
        ownerId: item.ownerId,
        ownerName: ownerMap.get(item.ownerId) || 'Unknown',
        format: item.format,
        notes: item.notes,
      });
    }
    
    return Array.from(workMap.values());
  },

  // For BLE sync - add or update item from remote
  async upsertForSync(item: MediaItem, localLibraryId: string): Promise<{ item: MediaItem; isNew: boolean }> {
    const db = await getDatabase();
    
    // Check if we already have this exact item (by itemId)
    const existing = await db.get('items', item.itemId);
    
    if (existing) {
      // Update if remote is newer
      if (new Date(item.updatedAt) > new Date(existing.updatedAt)) {
        const updated: MediaItem = {
          ...item,
          libraryId: localLibraryId, // Keep local library ID
        };
        await db.put('items', updated);
        return { item: updated, isNew: false };
      }
      return { item: existing, isNew: false };
    }
    
    // Add new item
    const newItem: MediaItem = {
      ...item,
      libraryId: localLibraryId, // Set to local library ID
    };
    await db.add('items', newItem);
    return { item: newItem, isNew: true };
  },

  // Get items for sync export
  async getForSync(sharedLibraryId: string): Promise<MediaItem[]> {
    return this.getBySharedLibrary(sharedLibraryId);
  },
};
