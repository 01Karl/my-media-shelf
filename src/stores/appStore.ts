// App store - global state management with Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Owner, Library, MediaItem } from '@/types';
import { initDatabase, ownerRepository, getSetting, setSetting } from '@/db';
import { runOneTimeSeriesImport } from '@/services/oneTimeSeriesImport';

interface AppState {
  // Auth state
  isInitialized: boolean;
  isAuthenticated: boolean;
  currentOwner: Owner | null;
  
  // Network state
  isOnline: boolean;
  
  // UI state
  activeLibraryId: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (ownerId: string, pin?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createOwner: (displayName: string, pin?: string) => Promise<Owner>;
  setActiveLibrary: (libraryId: string | null) => void;
  updateOnlineStatus: (isOnline: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      isAuthenticated: false,
      currentOwner: null,
      isOnline: navigator.onLine,
      activeLibraryId: null,

      initialize: async () => {
        try {
          // Initialize database
          await initDatabase();
          
          // Check if there's a saved owner
          const savedOwnerId = await getSetting('currentOwnerId');
          
          if (savedOwnerId) {
            const owner = await ownerRepository.getById(savedOwnerId);
            if (owner) {
              // If owner has no PIN, auto-login
              if (!owner.pinHash) {
                set({ 
                  isInitialized: true, 
                  isAuthenticated: true, 
                  currentOwner: owner 
                });
                await runOneTimeSeriesImport(owner.ownerId);
                return;
              }
              // Otherwise, require PIN
              set({ 
                isInitialized: true, 
                isAuthenticated: false, 
                currentOwner: owner 
              });
              return;
            }
          }
          
          set({ isInitialized: true });
        } catch (error) {
          console.error('Failed to initialize app:', error);
          set({ isInitialized: true });
        }
      },

      login: async (ownerId: string, pin?: string) => {
        const owner = await ownerRepository.getById(ownerId);
        
        if (!owner) {
          return false;
        }
        
        // If owner has PIN, verify it
        if (owner.pinHash && pin) {
          const isValid = await ownerRepository.authenticate(ownerId, pin);
          if (!isValid) {
            return false;
          }
        } else if (owner.pinHash && !pin) {
          // PIN required but not provided
          return false;
        }
        
        // Save current owner
        await setSetting('currentOwnerId', ownerId);
        
        set({ isAuthenticated: true, currentOwner: owner });
        await runOneTimeSeriesImport(ownerId);
        return true;
      },

      logout: async () => {
        set({ isAuthenticated: false, currentOwner: null, activeLibraryId: null });
      },

      createOwner: async (displayName: string, pin?: string) => {
        const owner = await ownerRepository.create(displayName, pin);
        await setSetting('currentOwnerId', owner.ownerId);
        set({ isAuthenticated: true, currentOwner: owner });
        await runOneTimeSeriesImport(owner.ownerId);
        return owner;
      },

      setActiveLibrary: (libraryId: string | null) => {
        set({ activeLibraryId: libraryId });
      },

      updateOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
      },
    }),
    {
      name: 'media-library-app-storage',
      partialize: (state) => ({
        // Only persist these fields
        activeLibraryId: state.activeLibraryId,
      }),
    }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().updateOnlineStatus(true);
  });
  window.addEventListener('offline', () => {
    useAppStore.getState().updateOnlineStatus(false);
  });
}
