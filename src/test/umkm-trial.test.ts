import { describe, it, expect } from 'vitest';
import { UMKM_TYPES } from '@/lib/umkm-dummy-data';
import { TRIAL_LIMITS } from '@/lib/trial-limits';

describe('umkm dummy profiles', () => {
  it('has 7 business types', () => {
    expect(UMKM_TYPES).toHaveLength(7);
    expect(UMKM_TYPES.map((t) => t.id)).toContain('seblak');
    expect(UMKM_TYPES.map((t) => t.id)).toContain('bakso');
  });
});

describe('trial limits', () => {
  it('matches gating in cashier/products', () => {
    expect(TRIAL_LIMITS.maxProducts).toBe(20);
    expect(TRIAL_LIMITS.maxTransactions).toBe(50);
    expect(TRIAL_LIMITS.days).toBe(14);
  });
});
