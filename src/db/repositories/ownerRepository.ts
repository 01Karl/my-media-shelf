

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import type { Owner } from '@/types';


async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'media-library-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === pinHash;
}

export const ownerRepository = {
  async create(displayName: string, pin?: string): Promise<Owner> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const owner: Owner = {
      ownerId: uuidv4(),
      displayName,
      pinHash: pin ? await hashPin(pin) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('owners', owner);
    return owner;
  },

  async getById(ownerId: string): Promise<Owner | null> {
    const db = await getDatabase();
    const owner = await db.get('owners', ownerId);
    return owner ?? null;
  },

  async getAll(): Promise<Owner[]> {
    const db = await getDatabase();
    return db.getAll('owners');
  },

  async getByDisplayName(displayName: string): Promise<Owner | null> {
    const db = await getDatabase();
    const owners = await db.getAllFromIndex('owners', 'by-displayName', displayName);
    return owners[0] ?? null;
  },

  async update(ownerId: string, updates: Partial<Pick<Owner, 'displayName' | 'pinHash'>>): Promise<Owner | null> {
    const db = await getDatabase();
    const existing = await db.get('owners', ownerId);
    
    if (!existing) return null;

    const updated: Owner = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.put('owners', updated);
    return updated;
  },

  async updatePin(ownerId: string, newPin: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.get('owners', ownerId);
    
    if (!existing) return false;

    const updated: Owner = {
      ...existing,
      pinHash: await hashPin(newPin),
      updatedAt: new Date().toISOString(),
    };

    await db.put('owners', updated);
    return true;
  },

  async delete(ownerId: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.get('owners', ownerId);
    
    if (!existing) return false;
    
    await db.delete('owners', ownerId);
    return true;
  },

  async authenticate(ownerId: string, pin: string): Promise<boolean> {
    const db = await getDatabase();
    const owner = await db.get('owners', ownerId);
    
    if (!owner || !owner.pinHash) return false;
    
    return verifyPin(pin, owner.pinHash);
  },

  
  async upsert(owner: Owner): Promise<Owner> {
    const db = await getDatabase();
    const existing = await db.get('owners', owner.ownerId);
    
    if (existing) {
      
      const updated: Owner = {
        ...existing,
        displayName: owner.displayName,
        updatedAt: new Date().toISOString(),
      };
      await db.put('owners', updated);
      return updated;
    } else {
      
      const newOwner: Owner = {
        ...owner,
        pinHash: undefined,
      };
      await db.add('owners', newOwner);
      return newOwner;
    }
  },
};
