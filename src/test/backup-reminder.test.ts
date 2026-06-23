import { describe, expect, it } from 'vitest';
import { getBackupReminderLevel, getBackupDaysSince } from '@/components/BackupReminder';

describe('backup reminder thresholds', () => {
  it('first_time when never backed up', () => {
    expect(getBackupReminderLevel(null)).toBe('first_time');
  });

  it('none when backed up within 3 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(getBackupReminderLevel(twoDaysAgo)).toBe('none');
  });

  it('gentle between 3 and 13 days', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(getBackupReminderLevel(fiveDaysAgo)).toBe('gentle');
  });

  it('urgent at 14+ days', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(getBackupReminderLevel(fifteenDaysAgo)).toBe('urgent');
  });

  it('getBackupDaysSince returns null for missing backup', () => {
    expect(getBackupDaysSince(null)).toBeNull();
  });
});
