// Core types for the media library app

export type MediaType = 'movie' | 'series' | 'other';

export type MediaFormat = 'DVD' | 'Blu-ray' | '4K Blu-ray' | 'Digital' | 'VHS' | 'Other';

export interface Owner {
  ownerId: string;
  displayName: string;
  pinHash?: string; // Hashed PIN for local auth
  createdAt: string;
  updatedAt: string;
}

export interface Library {
  libraryId: string;
  ownerId: string;
  sharedLibraryId: string | null; // UUID for shared/synced libraries
  name: string;
  description?: string;
  icon?: string; // Emoji or icon name
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  itemId: string;
  libraryId: string;
  sharedLibraryId: string | null;
  ownerId: string;
  type: MediaType;
  title: string;
  year?: number;
  season?: number;
  format: MediaFormat;
  frontImagePath?: string;
  backImagePath?: string;
  ocrTextFront?: string;
  ocrTextBack?: string;
  tmdbId?: number;
  notes?: string;
  audioInfo?: string; // e.g., "Dolby Digital 5.1, DTS"
  videoInfo?: string; // e.g., "1080p, HDR"
  languages?: string; // e.g., "English, Swedish"
  subtitles?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TMDBCache {
  tmdbId: number;
  type: MediaType;
  data: TMDBData;
  updatedAt: string;
}

export interface TMDBData {
  id: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  genres?: string[];
  runtime?: number; // For movies
  numberOfSeasons?: number; // For series
}

// For unified view in shared libraries
export interface UnifiedWork {
  workId: string; // tmdbId or normalized key
  sharedLibraryId: string;
  tmdbId?: number;
  title: string;
  year?: number;
  season?: number;
  type: MediaType;
  tmdbData?: TMDBData;
  copies: WorkCopy[];
}

export interface WorkCopy {
  itemId: string;
  ownerId: string;
  ownerName: string;
  format: MediaFormat;
  notes?: string;
}

// BLE Sync types
export interface BLEDevice {
  id: string;
  name: string;
  rssi?: number;
}

export interface SyncHandshake {
  type: 'HELLO';
  ownerId: string;
  displayName: string;
  appVersion: string;
}

export interface SyncLibraryList {
  type: 'LIST_LIBRARIES';
  libraries: { sharedLibraryId: string; name: string; itemCount: number }[];
}

export interface SyncSelectLibrary {
  type: 'SELECT_LIBRARY';
  sharedLibraryId: string;
}

export interface SyncDiffSummary {
  type: 'DIFF_SUMMARY';
  itemsToSend: number;
  itemsToReceive: number;
}

export interface SyncTransferItems {
  type: 'TRANSFER_ITEMS';
  items: MediaItem[];
  owners: Owner[];
}

export interface SyncDone {
  type: 'DONE';
  added: number;
  updated: number;
  matched: number;
}

export type SyncMessage = 
  | SyncHandshake 
  | SyncLibraryList 
  | SyncSelectLibrary 
  | SyncDiffSummary 
  | SyncTransferItems 
  | SyncDone;

// App state types
export interface AppState {
  isAuthenticated: boolean;
  currentOwner: Owner | null;
  isOnline: boolean;
}

// OCR result
export interface OCRResult {
  text: string;
  confidence: number;
  suggestedTitle?: string;
  suggestedYear?: number;
}

// TMDB search result
export interface TMDBSearchResult {
  id: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  mediaType: MediaType;
}
