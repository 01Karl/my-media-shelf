

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Owner, Library, MediaItem } from '@/types';
import { initDatabase, ownerRepository, getSetting, setSetting } from '@/db';
import { runOneTimeSeriesImport } from '@/services/oneTimeSeriesImport';
import { getDeviceLanguage, normalizeLanguage } from '@/lib/language';
import type { AppLanguage } from '@/lib/language';

interface AppState {
  
  isInitialized: boolean;
  isAuthenticated: boolean;
  currentOwner: Owner | null;
  
  
  isOnline: boolean;
  
  
  activeLibraryId: string | null;

  
  language: AppLanguage;
  
  
  initialize: () => Promise<void>;
  login: (ownerId: string, pin?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createOwner: (displayName: string, pin?: string) => Promise<Owner>;
  updateOwnerProfile: (displayName: string) => Promise<Owner | null>;
  updateOwnerPin: (pin?: string) => Promise<boolean>;
  setActiveLibrary: (libraryId: string | null) => void;
  updateOnlineStatus: (isOnline: boolean) => void;
  setLanguage: (language: AppLanguage) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      isAuthenticated: false,
      currentOwner: null,
      isOnline: navigator.onLine,
      activeLibraryId: null,
      language: getDeviceLanguage(),

      initialize: async () => {
        try {
          
          await initDatabase();

          const savedLanguage = await getSetting('language');
          const resolvedLanguage = normalizeLanguage(savedLanguage);
          if (!savedLanguage) {
            await setSetting('language', resolvedLanguage);
          }
          set({ language: resolvedLanguage });
          
          
          const savedOwnerId = await getSetting('currentOwnerId');
          
          if (savedOwnerId) {
            const owner = await ownerRepository.getById(savedOwnerId);
            if (owner) {
              
              if (!owner.pinHash) {
                set({ 
                  isInitialized: true, 
                  isAuthenticated: true, 
                  currentOwner: owner 
                });
                await runOneTimeSeriesImport(owner.ownerId);
                return;
              }
              
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
        
        
        if (owner.pinHash && pin) {
          const isValid = await ownerRepository.authenticate(ownerId, pin);
          if (!isValid) {
            return false;
          }
        } else if (owner.pinHash && !pin) {
          
          return false;
        }
        
        
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

      updateOwnerProfile: async (displayName: string) => {
        const { currentOwner } = get();
        if (!currentOwner) return null;
        const updated = await ownerRepository.update(currentOwner.ownerId, { displayName });
        if (updated) {
          set({ currentOwner: updated });
        }
        return updated;
      },

      updateOwnerPin: async (pin?: string) => {
        const { currentOwner } = get();
        if (!currentOwner) return false;

        if (pin) {
          const success = await ownerRepository.updatePin(currentOwner.ownerId, pin);
          if (!success) return false;
          const refreshed = await ownerRepository.getById(currentOwner.ownerId);
          if (refreshed) {
            set({ currentOwner: refreshed });
          }
          return Boolean(refreshed);
        }

        const updated = await ownerRepository.update(currentOwner.ownerId, { pinHash: undefined });
        if (updated) {
          set({ currentOwner: updated });
          return true;
        }
        return false;
      },

      setActiveLibrary: (libraryId: string | null) => {
        set({ activeLibraryId: libraryId });
      },

      updateOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
      },

      setLanguage: async (language: AppLanguage) => {
        await setSetting('language', language);
        set({ language });
      },
    }),
    {
      name: 'media-library-app-storage',
      partialize: (state) => ({
        
        activeLibraryId: state.activeLibraryId,
      }),
    }
  )
);


if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().updateOnlineStatus(true);
  });
  window.addEventListener('offline', () => {
    useAppStore.getState().updateOnlineStatus(false);
  });
}
