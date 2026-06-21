import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Download, Upload, ChevronLeft, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { exportBackupData } from '@/components/BackupReminder';
import { restoreFromBackupData } from '@/lib/backup';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';

const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function BackupRestoreSettings() {
  const { t, i18n } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';

  if (!can('manage_backup')) {
    return <LockedPage title={t('backupRestore.locked.title')} permissionLabel={t('backupRestore.locked.permissionLabel')} />;
  }

  if (storeSettings && storeSettings.licenseStatus !== 'ACTIVE') {
    return (
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Download className="w-5 h-5 text-muted-foreground" />
            {t('backupRestore.title')}
          </h1>
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 text-warning flex items-center justify-center animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold">{t('backupRestore.trialLocked.title')}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t('backupRestore.trialLocked.description')}
              </p>
            </div>
            <Link to="/settings" className="w-full max-w-[200px] mt-2">
              <Button className="w-full h-10 text-sm gap-2">
                {t('backupRestore.trialLocked.backButton')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!text.trim()) { toast.error(t('backupRestore.emptyFile')); return; }
        const data = JSON.parse(text);
        await restoreFromBackupData(data);
        toast.success(t('backupRestore.restoreSuccess'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('backupRestore.readError'));
      }
    };
    input.click();
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          {t('backupRestore.title')}
        </h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <Button variant="outline" className="w-full h-10 text-sm gap-2" onClick={exportBackupData}>
            <Download className="w-4 h-4" /> {t('backupRestore.exportButton')}
          </Button>
          <Button variant="outline" className="w-full h-10 text-sm gap-2" onClick={handleImport}>
            <Upload className="w-4 h-4" /> {t('backupRestore.importButton')}
          </Button>
          {storeSettings?.lastBackupAt && (
            <p className="text-[10px] text-muted-foreground text-center">{t('backupRestore.lastBackup', { time: new Date(storeSettings.lastBackupAt).toLocaleString(numberLocale) })}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
