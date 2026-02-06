// Database schema definitions
// This app uses IndexedDB as the primary storage with a clean API via 'idb'
// In a real Capacitor build, you would use @capacitor-community/sqlite

import { DBSchema } from 'idb';
import type { Owner, Library, MediaItem, TMDBCache } from '@/types';

export interface MediaLibraryDB extends DBSchema {
  owners: {
    key: string;
    value: Owner;
    indexes: { 'by-displayName': string };
  };
  libraries: {
    key: string;
    value: Library;
    indexes: { 
      'by-ownerId': string;
      'by-sharedLibraryId': string;
    };
  };
  items: {
    key: string;
    value: MediaItem;
    indexes: { 
      'by-libraryId': string;
      'by-ownerId': string;
      'by-sharedLibraryId': string;
      'by-tmdbId': number;
      'by-title': string;
    };
  };
  tmdb_cache: {
    key: number;
    value: TMDBCache;
    indexes: { 'by-type': string };
  };
  app_settings: {
    key: string;
    value: {
      key: string;
      value: string;
    };
  };
}

export const DB_NAME = 'media-library-db';
export const DB_VERSION = 1;

// SQL schema for reference (when using SQLite via Capacitor)
export const SQL_SCHEMA = `
-- Owners table
CREATE TABLE IF NOT EXISTS owners (
  ownerId TEXT PRIMARY KEY,
  displayName TEXT NOT NULL,
  pinHash TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Libraries table
CREATE TABLE IF NOT EXISTS libraries (
  libraryId TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  sharedLibraryId TEXT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (ownerId) REFERENCES owners(ownerId)
);

CREATE INDEX IF NOT EXISTS idx_libraries_ownerId ON libraries(ownerId);
CREATE INDEX IF NOT EXISTS idx_libraries_sharedLibraryId ON libraries(sharedLibraryId);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  itemId TEXT PRIMARY KEY,
  libraryId TEXT NOT NULL,
  sharedLibraryId TEXT,
  ownerId TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('movie', 'series', 'other')),
  title TEXT NOT NULL,
  year INTEGER,
  season INTEGER,
  format TEXT NOT NULL CHECK(format IN ('DVD', 'Blu-ray', '4K Blu-ray', 'Digital', 'VHS', 'Other')),
  frontImagePath TEXT,
  backImagePath TEXT,
  ocrTextFront TEXT,
  ocrTextBack TEXT,
  tmdbId INTEGER,
  notes TEXT,
  audioInfo TEXT,
  videoInfo TEXT,
  languages TEXT,
  subtitles TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (libraryId) REFERENCES libraries(libraryId),
  FOREIGN KEY (ownerId) REFERENCES owners(ownerId)
);

CREATE INDEX IF NOT EXISTS idx_items_libraryId ON items(libraryId);
CREATE INDEX IF NOT EXISTS idx_items_ownerId ON items(ownerId);
CREATE INDEX IF NOT EXISTS idx_items_sharedLibraryId ON items(sharedLibraryId);
CREATE INDEX IF NOT EXISTS idx_items_tmdbId ON items(tmdbId);
CREATE INDEX IF NOT EXISTS idx_items_title ON items(title);

-- TMDB cache table
CREATE TABLE IF NOT EXISTS tmdb_cache (
  tmdbId INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
