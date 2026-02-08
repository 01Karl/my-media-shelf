// BLE Sync Service - handles Bluetooth Low Energy sync between devices
// Uses Capacitor BLE plugin for native, provides stub for web

// TODO: Install @capacitor-community/bluetooth-le for native builds
// import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

import type { 
  BLEDevice, 
  SyncMessage, 
  SyncHandshake, 
  SyncLibraryList, 
  SyncTransferItems,
  SyncDone,
  MediaItem,
  Owner,
  Library,
} from '@/types';
import { libraryRepository, itemRepository, ownerRepository } from '@/db';

// BLE Service UUIDs (custom for this app)
const SERVICE_UUID = 'a0000001-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = 'a0000002-0000-1000-8000-00805f9b34fb';

// App version for compatibility check
const APP_VERSION = '1.0.0';

// Check if running in Capacitor
const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

const isWebBluetoothAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

const canQueryBluetoothPermission = (): boolean => {
  return typeof navigator !== 'undefined' && 'permissions' in navigator;
};

const queryBluetoothPermission = async (): Promise<PermissionState | null> => {
  if (!canQueryBluetoothPermission()) {
    return null;
  }

  const permissionNames: PermissionName[] = ['bluetooth' as PermissionName, 'bluetooth-le' as PermissionName];

  for (const name of permissionNames) {
    try {
      const status = await navigator.permissions.query({ name });
      return status.state;
    } catch (error) {
      continue;
    }
  }

  return null;
};

// Sync state
interface SyncState {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: BLEDevice | null;
  remoteOwner: { ownerId: string; displayName: string } | null;
  selectedLibraryId: string | null;
  syncProgress: {
    phase: 'idle' | 'handshake' | 'selecting' | 'syncing' | 'done' | 'error';
    message: string;
    progress: number;
  };
}

let syncState: SyncState = {
  isScanning: false,
  isConnected: false,
  connectedDevice: null,
  remoteOwner: null,
  selectedLibraryId: null,
  syncProgress: {
    phase: 'idle',
    message: '',
    progress: 0,
  },
};

// Event callbacks
type SyncEventCallback = (state: SyncState) => void;
const eventListeners: SyncEventCallback[] = [];

function notifyListeners() {
  eventListeners.forEach(cb => cb({ ...syncState }));
}

function updateState(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  notifyListeners();
}

export const bleSyncService = {
  /**
   * Subscribe to sync state changes
   */
  subscribe(callback: SyncEventCallback): () => void {
    eventListeners.push(callback);
    callback({ ...syncState });
    
    return () => {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    };
  },

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...syncState };
  },

  /**
   * Check if BLE is available
   */
  async isAvailable(): Promise<boolean> {
    if (!isCapacitor()) {
      // Web Bluetooth API check
      return isWebBluetoothAvailable();
    }
    
    // TODO: Check Capacitor BLE availability
    return true;
  },

  /**
   * Request Bluetooth permissions when supported
   */
  async requestPermissions(): Promise<boolean> {
    if (isCapacitor()) {
      // TODO: Implement Capacitor BLE permission request
      return true;
    }

    if (!isWebBluetoothAvailable()) {
      return false;
    }

    const permissionState = await queryBluetoothPermission();
    if (permissionState === 'granted') {
      return true;
    }
    if (permissionState === 'denied') {
      return false;
    }

    return true;
  },

  /**
   * Start scanning for nearby devices
   */
  async startScanning(): Promise<BLEDevice[]> {
    if (!isCapacitor()) {
      if (!isWebBluetoothAvailable()) {
        throw new Error('Bluetooth not supported');
      }

      updateState({ isScanning: true });

      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SERVICE_UUID],
        });

        const webDevice: BLEDevice = {
          id: device.id,
          name: device.name || 'Okänd enhet',
        };

        updateState({ isScanning: false });
        return [webDevice];
      } catch (error) {
        updateState({ isScanning: false });
        throw error;
      }
    }

    try {
      updateState({ isScanning: true });
      
      // TODO: Implement Capacitor BLE scanning
      /*
      await BleClient.initialize();
      await BleClient.requestLEScan(
        { services: [SERVICE_UUID] },
        (result: ScanResult) => {
          console.log('Found device:', result);
        }
      );
      */
      
      updateState({ isScanning: false });
      return [];
    } catch (error) {
      console.error('BLE scan error:', error);
      updateState({ isScanning: false });
      throw error;
    }
  },

  /**
   * Stop scanning
   */
  async stopScanning(): Promise<void> {
    if (isCapacitor()) {
      // TODO: BleClient.stopLEScan();
    }
    updateState({ isScanning: false });
  },

  /**
   * Connect to a device
   */
  async connect(device: BLEDevice): Promise<boolean> {
    console.log('Connecting to device:', device);
    
    updateState({
      syncProgress: { phase: 'handshake', message: 'Connecting...', progress: 0 },
    });

    if (!isCapacitor()) {
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateState({
        isConnected: true,
        connectedDevice: device,
        remoteOwner: { ownerId: 'mock-owner', displayName: device.name || 'Unknown' },
        syncProgress: { phase: 'handshake', message: 'Connected!', progress: 25 },
      });
      
      return true;
    }

    try {
      // TODO: Implement Capacitor BLE connection
      /*
      await BleClient.connect(device.id);
      
      // Send handshake
      const owner = await ownerRepository.getAll().then(owners => owners[0]);
      const handshake: SyncHandshake = {
        type: 'HELLO',
        ownerId: owner?.ownerId || '',
        displayName: owner?.displayName || 'Unknown',
        appVersion: APP_VERSION,
      };
      
      await this.sendMessage(handshake);
      */
      
      return true;
    } catch (error) {
      console.error('BLE connect error:', error);
      updateState({
        syncProgress: { phase: 'error', message: 'Connection failed', progress: 0 },
      });
      return false;
    }
  },

  /**
   * Disconnect from the current device
   */
  async disconnect(): Promise<void> {
    console.log('Disconnecting from device');
    
    if (isCapacitor() && syncState.connectedDevice) {
      // TODO: BleClient.disconnect(syncState.connectedDevice.id);
    }

    updateState({
      isConnected: false,
      connectedDevice: null,
      remoteOwner: null,
      selectedLibraryId: null,
      syncProgress: { phase: 'idle', message: '', progress: 0 },
    });
  },

  /**
   * Get list of shared libraries to sync
   */
  async getSharedLibraries(ownerId: string): Promise<{ sharedLibraryId: string; name: string; itemCount: number }[]> {
    const libraries = await libraryRepository.getByOwner(ownerId);
    const sharedLibraries = libraries.filter(lib => lib.sharedLibraryId !== null);
    
    const result = await Promise.all(
      sharedLibraries.map(async lib => ({
        sharedLibraryId: lib.sharedLibraryId!,
        name: lib.name,
        itemCount: await libraryRepository.getItemCount(lib.libraryId),
      }))
    );
    
    return result;
  },

  /**
   * Select a library to sync
   */
  async selectLibrary(sharedLibraryId: string): Promise<void> {
    updateState({
      selectedLibraryId: sharedLibraryId,
      syncProgress: { phase: 'selecting', message: 'Library selected', progress: 50 },
    });
  },

  /**
   * Perform the sync
   */
  async performSync(localOwnerId: string, localLibraryId: string): Promise<SyncDone> {
    console.log('Performing sync for library:', localLibraryId);
    
    updateState({
      syncProgress: { phase: 'syncing', message: 'Syncing items...', progress: 60 },
    });

    if (!isCapacitor()) {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result: SyncDone = {
        type: 'DONE',
        added: 5,
        updated: 2,
        matched: 10,
      };
      
      updateState({
        syncProgress: { phase: 'done', message: 'Sync complete!', progress: 100 },
      });
      
      return result;
    }

    try {
      // Get local items
      const library = await libraryRepository.getById(localLibraryId);
      if (!library?.sharedLibraryId) {
        throw new Error('Library is not shared');
      }

      const items = await itemRepository.getForSync(library.sharedLibraryId);
      const owners = await ownerRepository.getAll();
      
      // Send items to remote device
      const transferMessage: SyncTransferItems = {
        type: 'TRANSFER_ITEMS',
        items,
        owners,
      };
      
      // TODO: Send via BLE
      // await this.sendMessage(transferMessage);
      
      // Wait for response with remote items
      // TODO: Receive via BLE
      
      // Process received items
      let added = 0;
      let updated = 0;
      let matched = 0;
      
      // TODO: Process remote items
      // for (const remoteItem of remoteItems) {
      //   const result = await itemRepository.upsertForSync(remoteItem, localLibraryId);
      //   if (result.isNew) added++;
      //   else updated++;
      // }

      const result: SyncDone = {
        type: 'DONE',
        added,
        updated,
        matched: items.length,
      };
      
      updateState({
        syncProgress: { phase: 'done', message: 'Sync complete!', progress: 100 },
      });
      
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      updateState({
        syncProgress: { phase: 'error', message: 'Sync failed', progress: 0 },
      });
      throw error;
    }
  },

  /**
   * Start advertising this device for others to find
   */
  async startAdvertising(displayName: string): Promise<void> {
    console.log('Starting BLE advertising as:', displayName);
    
    if (!isCapacitor()) {
      console.log('BLE advertising (web stub)');
      return;
    }

    // TODO: Implement BLE advertising for Capacitor
    // This is typically done via a BLE peripheral plugin
  },

  /**
   * Stop advertising
   */
  async stopAdvertising(): Promise<void> {
    console.log('Stopping BLE advertising');
    
    // TODO: Stop advertising
  },

  /**
   * Send a message over BLE
   */
  async sendMessage(message: SyncMessage): Promise<void> {
    const json = JSON.stringify(message);
    const chunks = this.chunkMessage(json);
    
    console.log(`Sending message type: ${message.type}, chunks: ${chunks.length}`);
    
    // TODO: Send each chunk via BLE characteristic
    for (const chunk of chunks) {
      // await BleClient.write(deviceId, SERVICE_UUID, CHARACTERISTIC_UUID, chunk);
    }
  },

  /**
   * Chunk large messages for BLE transfer
   */
  chunkMessage(json: string, chunkSize = 512): Uint8Array[] {
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const chunks: Uint8Array[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    
    return chunks;
  },

  /**
   * Reset sync state
   */
  reset(): void {
    updateState({
      isScanning: false,
      isConnected: false,
      connectedDevice: null,
      remoteOwner: null,
      selectedLibraryId: null,
      syncProgress: { phase: 'idle', message: '', progress: 0 },
    });
  },
};
