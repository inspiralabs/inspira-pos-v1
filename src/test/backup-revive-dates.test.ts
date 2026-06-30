import { describe, expect, it } from 'vitest';
import { reviveDates } from '@/lib/backup';

describe('reviveDates (restore date integrity)', () => {
  it('mengubah string ISO hasil JSON kembali menjadi Date', () => {
    const original = { id: 1, date: new Date('2026-06-30T09:49:00.000Z'), total: 5000 };
    // Simulasikan round-trip backup: Date -> string ISO.
    const parsed = JSON.parse(JSON.stringify([original]));
    expect(typeof parsed[0].date).toBe('string');

    const revived = reviveDates(parsed) as Array<{ date: Date }>;
    expect(revived[0].date).toBeInstanceOf(Date);
    expect(revived[0].date.getTime()).toBe(original.date.getTime());
  });

  it('tidak menyentuh string non-tanggal (sku, receiptNumber, dll.)', () => {
    const rows = reviveDates([{ sku: 'PROD-123', receiptNumber: 'TX1700000000000', name: 'Nasi Goreng' }]);
    expect(rows[0].sku).toBe('PROD-123');
    expect(rows[0].receiptNumber).toBe('TX1700000000000');
    expect(rows[0].name).toBe('Nasi Goreng');
  });
});
