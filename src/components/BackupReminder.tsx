import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { buildBackupJsonString, backupFileName } from '@/lib/backup';
import { formatDistanceToNow } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/use-auth';
import i18n from '@/i18n';

const LOCALES: Record<string, Locale> = {
  id,
  en: enUS,
  ms,
};

export type BackupReminderLevel = 'none' | 'gentle' | 'urgent' | 'first_time';

/** Hitung selisih hari sejak backup terakhir; null = belum pernah backup. */
export function getBackupDaysSince(lastBackupAt: Date | string | null): number | null {
  if (!lastBackupAt) return null;
  const date = lastBackupAt instanceof Date ? lastBackupAt : new Date(lastBackupAt);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Tentukan tingkat reminder berdasarkan threshold 3 / 14 hari. */
export function getBackupReminderLevel(lastBackupAt: Date | string | null): BackupReminderLevel {
  const diffDays = getBackupDaysSince(lastBackupAt);
  if (diffDays === null) return 'first_time';
  if (diffDays < 3) return 'none';
  if (diffDays >= 14) return 'urgent';
  return 'gentle';
}

export function shouldShowBackupReminder(lastBackupAt: Date | string | null): boolean {
  return getBackupReminderLevel(lastBackupAt) !== 'none';
}

interface BackupReminderProps {
  lastBackupAt: Date | string | null;
  onDismiss: () => void;
  onBackup: () => void;
}

export default function BackupReminder({ lastBackupAt, onDismiss, onBackup }: BackupReminderProps) {
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? id;
  const level = getBackupReminderLevel(lastBackupAt);

  const timeAgo = lastBackupAt
    ? formatDistanceToNow(lastBackupAt instanceof Date ? lastBackupAt : new Date(lastBackupAt), { addSuffix: true, locale: dateLocale })
    : null;

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
            <Download className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {level === 'urgent' ? t('backupReminder.urgentTitle') : t('backupReminder.title')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastBackupAt
                ? t('backupReminder.lastBackup', { time: timeAgo })
                : t('backupReminder.neverBackedUp')}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2 h-8 text-xs font-semibold border-warning/30 text-warning hover:bg-warning/10"
          onClick={onBackup}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          {t('backupReminder.backupNow')}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Cek reminder saat app dibuka: toast (gentle) atau modal (urgent / first_time). */
export function BackupReminderChecker() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const shownRef = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [level, setLevel] = useState<BackupReminderLevel>('none');

  useEffect(() => {
    if (shownRef.current) return;
    if (!storeSettings?.onboardingDone) return;
    if (!can('manage_backup')) return;

    const reminderLevel = getBackupReminderLevel(storeSettings.lastBackupAt);
    if (reminderLevel === 'none') return;

    shownRef.current = true;
    setLevel(reminderLevel);

    if (reminderLevel === 'gentle') {
      const diffDays = getBackupDaysSince(storeSettings.lastBackupAt) ?? 0;
      toast(t('backupReminder.gentleToast', { days: diffDays }), {
        duration: 8000,
        action: {
          label: t('backupReminder.backupNow'),
          onClick: () => { void exportBackupData(); },
        },
      });
    } else {
      setModalOpen(true);
    }
  }, [storeSettings?.id, storeSettings?.onboardingDone, storeSettings?.lastBackupAt, can, t]);

  const handleBackup = async () => {
    await exportBackupData();
    setModalOpen(false);
  };

  if (!modalOpen) return null;

  const isFirstTime = level === 'first_time';

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isFirstTime ? t('backupReminder.firstTimeTitle') : t('backupReminder.urgentTitle')}
          </DialogTitle>
          <DialogDescription>
            {isFirstTime ? t('backupReminder.firstTimeDescription') : t('backupReminder.urgentDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={() => { void handleBackup(); }}>
            <Download className="w-4 h-4" />
            {t('backupReminder.backupNow')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setModalOpen(false)}>
            {t('backupReminder.later')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function exportBackupData() {
  const fileName = backupFileName();
  const jsonString = await buildBackupJsonString();

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: i18n.t('settings:backupReminder.shareTitle'),
        text: i18n.t('settings:backupReminder.shareText'),
        url: result.uri,
        dialogTitle: i18n.t('settings:backupReminder.shareDialogTitle'),
      });

      toast.success(i18n.t('settings:backupReminder.successCreated'));
    } catch {
      toast.error(i18n.t('settings:backupReminder.errorCreateShare'));
    }
  } else {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(i18n.t('settings:backupReminder.successDownloaded'));
  }

  const settings = await db.storeSettings.toCollection().first();
  if (settings?.id) {
    await db.storeSettings.update(settings.id, { lastBackupAt: new Date() });
  }
}
