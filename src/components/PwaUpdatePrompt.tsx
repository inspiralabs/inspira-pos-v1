import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Capacitor } from '@capacitor/core';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

function isDemoUpdate(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demoUpdate');
}

/** ponytail: fixed banner above bottom nav; upgrade path = toast/modal if copy grows */
export default function PwaUpdatePrompt() {
  const { t } = useTranslation('common');
  const [dismissed, setDismissed] = useState(false);
  const demoMode = isDemoUpdate();

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  if (Capacitor.isNativePlatform() || dismissed || (!needRefresh && !demoMode)) {
    return null;
  }

  const handleReload = async () => {
    if (demoMode) {
      const url = new URL(window.location.href);
      url.searchParams.delete('demoUpdate');
      window.history.replaceState({}, '', url);
      setDismissed(true);
      return;
    }
    await updateServiceWorker(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 pointer-events-none"
    >
      <div className="max-w-lg md:max-w-6xl mx-auto pointer-events-auto rounded-xl border border-primary/25 bg-card shadow-lg p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{t('appUpdate.title')}</p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{t('appUpdate.description')}</p>
        </div>
        <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleReload}>
          {t('appUpdate.reload')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          aria-label={t('common.close')}
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
