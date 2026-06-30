import { describe, expect, it } from 'vitest';
import { getEffectiveTier } from '@/lib/license';

describe('getEffectiveTier (trial = PRO)', () => {
  it('TRIAL gets PRO access', () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(getEffectiveTier({ trialStartedAt: recent })).toBe('PRO');
    expect(getEffectiveTier({})).toBe('PRO'); // belum mulai trial = masih TRIAL
  });

  it('ACTIVE follows planTier', () => {
    expect(getEffectiveTier({ licenseStatus: 'ACTIVE', planTier: 'PRO' })).toBe('PRO');
    expect(getEffectiveTier({ licenseStatus: 'ACTIVE', planTier: 'LITE' })).toBe('LITE');
  });

  it('expired trial drops to LITE', () => {
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    expect(getEffectiveTier({ trialStartedAt: old })).toBe('LITE');
    expect(getEffectiveTier({ licenseStatus: 'REVOKED' })).toBe('LITE');
  });
});
