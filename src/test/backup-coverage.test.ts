import { describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { BACKUP_TABLE_KEYS } from '@/lib/backup';

describe('backup coverage', () => {
  it('mencakup semua tabel Dexie yang aktif', () => {
    const dbTableNames = db.tables.map((table) => table.name).sort();
    const backupKeys = [...BACKUP_TABLE_KEYS].sort();

    expect(backupKeys).toEqual(dbTableNames);
  });
});
