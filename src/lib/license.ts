import { db } from './db';

const SECURE_SALT = 'INSPIRA_POS_SECURE_SALT_2026';

/**
 * Normalizes store name for deterministic hashing (lowercase, trimmed, spaces normalized).
 */
export function normalizeStoreName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes device ID.
 */
export function normalizeDeviceId(deviceId: string): string {
  return deviceId.trim().toLowerCase();
}

/**
 * Generates the expected license key offline for a given store name and device ID.
 */
export async function generateLicenseKey(storeName: string, deviceId: string): Promise<string> {
  const normalizedStore = normalizeStoreName(storeName);
  const normalizedDevice = normalizeDeviceId(deviceId);
  const input = `${normalizedStore}_${normalizedDevice}_${SECURE_SALT}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Take first 16 characters in uppercase
  const rawCode = hashHex.substring(0, 16).toUpperCase();
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${rawCode.substring(0, 4)}-${rawCode.substring(4, 8)}-${rawCode.substring(8, 12)}-${rawCode.substring(12, 16)}`;
}

/**
 * Validates an input license key against the store name and device ID.
 */
export async function validateLicenseKey(storeName: string, deviceId: string, licenseKey: string): Promise<boolean> {
  if (!storeName || !deviceId || !licenseKey) return false;
  
  const expectedKey = await generateLicenseKey(storeName, deviceId);
  const sanitizedInput = licenseKey.trim().toUpperCase();
  
  return expectedKey === sanitizedInput;
}

/**
 * Helper to calculate license status synchronously based on loaded settings.
 */
export function getLicenseStatus(settings: any): 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (!settings) return 'TRIAL';
  if (settings.licenseStatus === 'ACTIVE') return 'ACTIVE';
  if (settings.licenseStatus === 'EXPIRED') return 'EXPIRED';
  if (settings.licenseStatus === 'REVOKED') return 'REVOKED';
  if (!settings.trialStartedAt) return 'TRIAL';
  
  const startedAt = new Date(settings.trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startedAt.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 14) {
    return 'EXPIRED';
  }
  
  return 'TRIAL';
}

/**
 * Helper to calculate remaining trial days.
 */
export function getTrialDaysLeft(settings: any): number {
  if (!settings || !settings.trialStartedAt) return 14;
  const startedAt = new Date(settings.trialStartedAt);
  const now = new Date();
  const diffTime = now.getTime() - startedAt.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, 14 - diffDays);
}
