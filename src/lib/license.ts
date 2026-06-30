import { db } from './db';

const SECURE_SALT_LITE = import.meta.env.VITE_SECURE_SALT_LITE || 'INSPIRA_POS_SECURE_SALT_LITE_2026';
const SECURE_SALT_PRO  = import.meta.env.VITE_SECURE_SALT_PRO || 'INSPIRA_POS_SECURE_SALT_PRO_2026';

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
 * Generates the expected license key offline for a given device ID and tier.
 */
export async function generateLicenseKey(deviceId: string, tier: 'LITE' | 'PRO'): Promise<string> {
  const salt = tier === 'PRO' ? SECURE_SALT_PRO : SECURE_SALT_LITE;
  const normalizedDevice = normalizeDeviceId(deviceId);
  const input = `${normalizedDevice}_${salt}`;
  
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
 * Validates an input license key against the device ID.
 */
export async function validateLicenseKey(
  deviceId: string,
  licenseKey: string
): Promise<{ valid: boolean; tier: 'LITE' | 'PRO' | null }> {
  if (!deviceId || !licenseKey) return { valid: false, tier: null };
  const sanitizedInput = licenseKey.trim().toUpperCase();
  
  const liteKey = await generateLicenseKey(deviceId, 'LITE');
  const proKey = await generateLicenseKey(deviceId, 'PRO');
  
  if (sanitizedInput === proKey) {
    return { valid: true, tier: 'PRO' };
  }
  if (sanitizedInput === liteKey) {
    return { valid: true, tier: 'LITE' };
  }
  
  return { valid: false, tier: null };
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
 * Tier efektif untuk gating fitur. Selama TRIAL pengguna mendapat akses penuh
 * seperti PRO; saat ACTIVE mengikuti planTier; selain itu (EXPIRED/REVOKED,
 * yang sudah diblok di level app) jatuh ke LITE.
 */
export function getEffectiveTier(settings: any): 'LITE' | 'PRO' {
  const status = getLicenseStatus(settings);
  if (status === 'TRIAL') return 'PRO';
  if (status === 'ACTIVE') return settings?.planTier === 'PRO' ? 'PRO' : 'LITE';
  return 'LITE';
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
