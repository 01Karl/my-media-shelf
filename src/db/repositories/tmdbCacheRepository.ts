// TMDB cache repository - caches TMDB data locally

import { getDatabase } from '../database';
import type { TMDBCache, TMDBData, MediaType } from '@/types';

const CACHE_TTL_DAYS = 7; // Cache TMDB data for 7 days

export const tmdbCacheRepository = {
  async get(tmdbId: number): Promise<TMDBData | null> {
    const db = await getDatabase();
    const cached = await db.get('tmdb_cache', tmdbId);
    
    if (!cached) return null;
    
    // Check if cache is expired
    const cacheDate = new Date(cached.updatedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > CACHE_TTL_DAYS) {
      // Cache expired, but still return it (we're offline-first)
      // The service layer can decide to refresh if online
      console.log(`TMDB cache for ${tmdbId} is ${Math.floor(daysDiff)} days old`);
    }
    
    return cached.data;
  },

  async set(tmdbId: number, type: MediaType, data: TMDBData): Promise<void> {
    const db = await getDatabase();
    const cache: TMDBCache = {
      tmdbId,
      type,
      data,
      updatedAt: new Date().toISOString(),
    };
    await db.put('tmdb_cache', cache);
  },

  async delete(tmdbId: number): Promise<void> {
    const db = await getDatabase();
    await db.delete('tmdb_cache', tmdbId);
  },

  async getByType(type: MediaType): Promise<TMDBCache[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('tmdb_cache', 'by-type', type);
  },

  async clearExpired(): Promise<number> {
    const db = await getDatabase();
    const all = await db.getAll('tmdb_cache');
    const now = new Date();
    let deleted = 0;
    
    for (const cached of all) {
      const cacheDate = new Date(cached.updatedAt);
      const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > CACHE_TTL_DAYS * 2) { // Delete after 2x TTL
        await db.delete('tmdb_cache', cached.tmdbId);
        deleted++;
      }
    }
    
    return deleted;
  },

  async clearAll(): Promise<void> {
    const db = await getDatabase();
    await db.clear('tmdb_cache');
  },

  async getCacheStats(): Promise<{ count: number; oldestDate: string | null }> {
    const db = await getDatabase();
    const all = await db.getAll('tmdb_cache');
    
    if (all.length === 0) {
      return { count: 0, oldestDate: null };
    }
    
    const oldest = all.reduce((min, curr) => 
      new Date(curr.updatedAt) < new Date(min.updatedAt) ? curr : min
    );
    
    return {
      count: all.length,
      oldestDate: oldest.updatedAt,
    };
  },
};
