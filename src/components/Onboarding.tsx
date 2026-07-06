import { useState, useMemo, useEffect } from 'react';
import { Store, MapPin, Phone, ChevronRight, ChevronLeft, ShoppingCart, Package, BarChart3, Shield, Clock, Palette, Download, CheckCircle2, Globe, Upload, Cloud, Loader2, DownloadCloud, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { db, type Product } from '@/lib/db';
import { TRIAL_LIMITS } from '@/lib/trial-limits';
import { UMKM_TYPES, seedUmkmDummy, type UmkmTypeId } from '@/lib/umkm-dummy-data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import { applyThemeColor } from '@/hooks/use-theme-color';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { isNativePlatform } from '@/lib/printer';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { GoogleLogin } from '@react-oauth/google';
import { listBackups, downloadBackup, type CloudBackup } from '@/lib/cloud-api';
import { nativeGoogleSignIn } from '@/lib/google-auth';
import { restoreFromBackupData } from '@/lib/backup';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, i18n } = useTranslation('onboarding');
  const isNative = useMemo(() => isNativePlatform(), []);

  const tutorialSlides = useMemo(() => [
    {
      icon: Store,
      title: t('slides.welcome.title'),
      description: t('slides.welcome.description'),
      color: 'text-primary bg-primary/10',
      isWelcome: true,
    },
    {
      icon: ShoppingCart,
      title: t('slides.cashier.title'),
      description: t('slides.cashier.description'),
      color: 'text-primary bg-primary/10',
    },
    {
      icon: Package,
      title: t('slides.stock.title'),
      description: t('slides.stock.description'),
      color: 'text-accent bg-accent/10',
    },
    {
      icon: BarChart3,
      title: t('slides.reports.title'),
      description: t('slides.reports.description'),
      color: 'text-success bg-success/10',
    },
    {
      icon: Shield,
      title: t('slides.data.title'),
      description: t('slides.data.description'),
      color: 'text-warning bg-warning/10',
    },
    {
      icon: Clock,
      title: t('slides.trial.title'),
      description: t('slides.trial.description'),
      color: 'text-amber-600 bg-amber-500/10',
      isTrial: true,
    },
  ], [t]);
  // Web/PWA: tutorial slides (0-3), install (4), store setup (5)
  // APK/native: tutorial slides (0-3), store setup (4)
  const [step, setStep] = useState(0);
  const [agreedTnc, setAgreedTnc] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState<UmkmTypeId | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [themeColor, setThemeColorState] = useState('4');
  const { isLoggedIn: cloudLoggedIn, login: cloudLogin, googleUser: cloudUser, logout: cloudLogout } = useCloudAuth();
  const [showCloud, setShowCloud] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudRestoringId, setCloudRestoringId] = useState<string | null>(null);
  const [cloudLoginBusy, setCloudLoginBusy] = useState(false);

  const handleNativeCloudLogin = async () => {
    setCloudLoginBusy(true);
    try {
      const idToken = await nativeGoogleSignIn();
      await cloudLogin(idToken);
    } catch {
      toast.error(t('toast.googleLoginFailed'));
    } finally {
      setCloudLoginBusy(false);
    }
  };
  const [installDone, setInstallDone] = useState(false);
  const { canInstall, isInstalled, install } = usePWAInstall();

  const hasInstallStep = !isNative;
  const totalSteps = tutorialSlides.length + (hasInstallStep ? 2 : 1); // tutorials + (install) + store setup
  const isTutorialStep = step < tutorialSlides.length;
  const isInstallStep = hasInstallStep && step === tutorialSlides.length;
  const isStoreStep = step === tutorialSlides.length + (hasInstallStep ? 1 : 0);
  const tutorialIndex = step;

  const handleRestore = () => {
    if (restoring) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setRestoring(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version) { toast.error(t('toast.restoreInvalidFile')); setRestoring(false); return; }

        const hasSomeData = ['categories', 'products', 'suppliers', 'transactions', 'paymentMethods'].some(
          key => Array.isArray(data[key]) && data[key].length > 0,
        );
        if (!hasSomeData) { toast.error(t('toast.restoreNoData')); setRestoring(false); return; }

        // Fresh install: clear seeded defaults then load from file.
        await db.categories.clear(); await db.products.clear(); await db.suppliers.clear();
        await db.stockIns.clear(); await db.stockOuts.clear(); await db.hppHistory.clear();
        await db.paymentMethods.clear(); await db.transactions.clear(); await db.transactionItems.clear();
        await db.storeSettings.clear();
        if (Array.isArray(data.users)) await db.users.clear();
        await db.units.clear();
        if (Array.isArray(data.expenseCategories) || Array.isArray(data.expenses)) {
          await db.expenseCategories.clear();
          await db.expenses.clear();
        }
        if (Array.isArray(data.customers)) await db.customers.clear();

        if (data.categories?.length) await db.categories.bulkAdd(data.categories);
        if (data.products?.length) {
          const normalized = (data.products as Product[]).map((p) =>
            p && p.trackStock === undefined ? { ...p, trackStock: true } : p,
          );
          await db.products.bulkAdd(normalized);
        }
        if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
        if (data.customers?.length) await db.customers.bulkAdd(data.customers);
        if (data.stockIns?.length) await db.stockIns.bulkAdd(data.stockIns);
        if (data.stockOuts?.length) await db.stockOuts.bulkAdd(data.stockOuts);
        if (data.hppHistory?.length) await db.hppHistory.bulkAdd(data.hppHistory);
        if (data.paymentMethods?.length) await db.paymentMethods.bulkAdd(data.paymentMethods);
        if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
        if (data.users?.length) await db.users.bulkAdd(data.users);
        if (data.expenseCategories?.length) await db.expenseCategories.bulkAdd(data.expenseCategories);
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);

        // Units (v3+ backup) or harvest from products (v1/v2 backup)
        if (Array.isArray(data.units) && data.units.length > 0) {
          await db.units.bulkAdd(data.units);
        } else {
          const now = new Date();
          const defaults = ['pcs', 'kg', 'gram', 'liter', 'ml', 'porsi', 'cup', 'botol', 'bungkus'];
          const seen = new Set<string>();
          const toAdd: Array<{ name: string; isDefault: number; createdAt: Date; isDeleted: number; deletedAt: null }> = [];
          for (const name of defaults) { seen.add(name); toAdd.push({ name, isDefault: 1, createdAt: now, isDeleted: 0, deletedAt: null }); }
          if (Array.isArray(data.products)) {
            for (const p of data.products as Product[]) {
              const u = p?.unit?.trim();
              if (!u || seen.has(u)) continue;
              seen.add(u);
              toAdd.push({ name: u, isDefault: 0, createdAt: now, isDeleted: 0, deletedAt: null });
            }
          }
          if (toAdd.length) await db.units.bulkAdd(toAdd);
        }

        if (data.transactionItems?.length) await db.transactionItems.bulkAdd(data.transactionItems);

        // Restored storeSettings carries onboardingDone from the source device.
        // Force it true so the wizard closes and the app opens straight away.
        if (data.storeSettings?.length) {
          const restored = data.storeSettings.map((s: Record<string, unknown>) => ({ ...s, onboardingDone: true, appTourDone: true }));
          await db.storeSettings.bulkAdd(restored);
        } else {
          await db.storeSettings.add({
            storeName: 'Toko Saya',
            address: '',
            phone: '',
            receiptFooter: 'Terima kasih atas kunjungan Anda!',
            onboardingDone: true,
            appTourDone: true,
            lastBackupAt: null,
            deviceId: crypto.randomUUID(),
          });
        }

        const saved = await db.storeSettings.toCollection().first();
        if (!saved?.onboardingDone) throw new Error('Gagal menyimpan pengaturan toko');
        toast.success(t('toast.restoreSuccess'));
        onComplete();
      } catch {
        toast.error(t('toast.restoreError'));
      } finally {
        setRestoring(false);
      }
    };
    input.click();
  };

  // Tutup wizard onboarding setelah restore berhasil (paksa onboardingDone).
  const finishAfterRestore = async (successMsg: string) => {
    const s = await db.storeSettings.toCollection().first();
    if (s?.id) {
      await db.storeSettings.update(s.id, { onboardingDone: true, appTourDone: true });
    } else {
      await db.storeSettings.add({
        storeName: 'Toko Saya',
        address: '',
        phone: '',
        receiptFooter: 'Terima kasih atas kunjungan Anda!',
        onboardingDone: true,
        appTourDone: true,
        lastBackupAt: null,
        deviceId: crypto.randomUUID(),
      });
    }
    const saved = await db.storeSettings.toCollection().first();
    if (!saved?.onboardingDone) throw new Error('Gagal menyimpan pengaturan toko');
    toast.success(successMsg);
    onComplete();
  };

  const loadCloudBackups = async () => {
    setCloudLoading(true);
    try {
      const { items } = await listBackups({ page: 1, limit: 50 });
      setCloudBackups(items);
    } catch {
      toast.error(t('toast.cloudLoadError'));
    } finally {
      setCloudLoading(false);
    }
  };

  // Saat login cloud berhasil & panel terbuka, ambil daftar backup.
  useEffect(() => {
    if (showCloud && cloudLoggedIn) loadCloudBackups();
  }, [showCloud, cloudLoggedIn]);

  const handleCloudRestore = async (backup: CloudBackup) => {
    if (cloudRestoringId) return;
    // Tutup modal LEBIH DULU. Restore akan menulis onboardingDone=true yang
    // memicu AppLayout melepas Onboarding; jika modal masih terbuka saat itu,
    // Radix meninggalkan `pointer-events:none` di body → layar freeze.
    setShowCloud(false);
    setCloudRestoringId(backup.id);
    setRestoring(true);
    const toastId = toast.loading(t('restore.restoring'));
    try {
      const data = await downloadBackup(backup.id);
      await restoreFromBackupData(data);
      toast.dismiss(toastId);
      await finishAfterRestore(t('toast.cloudRestoreSuccess'));
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : t('toast.cloudRestoreError'));
      setShowCloud(true); // buka lagi agar user bisa coba lagi
    } finally {
      setCloudRestoringId(null);
      setRestoring(false);
    }
  };

  const handleFinish = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    try {
      const existing = await db.storeSettings.toCollection().first();
      const trialStartedAt = existing?.trialStartedAt || new Date();
      const deviceId = existing?.deviceId || crypto.randomUUID();

      if (existing?.id) {
        await db.storeSettings.update(existing.id, {
          storeName: storeName.trim(),
          address: address.trim(),
          phone: phone.trim(),
          onboardingDone: true,
          appTourDone: true,
          themeColor,
          licenseStatus: 'TRIAL',
          trialStartedAt,
          licenseKey: null,
          deviceId,
          isSyncedWithServer: false,
        });
      } else {
        await db.storeSettings.add({
          storeName: storeName.trim(),
          address: address.trim(),
          phone: phone.trim(),
          receiptFooter: 'Terima kasih atas kunjungan Anda!',
          onboardingDone: true,
          appTourDone: true,
          lastBackupAt: null,
          themeColor,
          licenseStatus: 'TRIAL',
          trialStartedAt,
          licenseKey: null,
          deviceId,
          isSyncedWithServer: false,
        });
      }

      if (businessType) {
        await seedUmkmDummy(businessType);
      }

      // Sync onboarding to backend (Supabase) if online.
      // VITE_API_URL must be set to the production backend URL in Vercel env vars.
      // Fallback is intentionally empty — calling localhost in production is always wrong.
      const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      if (!API_BASE_URL) {
        console.warn('[Onboarding] VITE_API_URL tidak di-set. Lewati sync server.');
      }
      try {
        if (!API_BASE_URL) throw new Error('API_BASE_URL tidak dikonfigurasi');
        const res = await fetch(`${API_BASE_URL}/api/clients/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: storeName.trim(),
            address: address.trim(),
            phone: phone.trim(),
            deviceId,
          }),
        });
        if (res.ok) {
          toast.success('Pendaftaran toko berhasil!');
          const current = await db.storeSettings.toCollection().first();
          if (current?.id) {
            await db.storeSettings.update(current.id, { isSyncedWithServer: true });
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('Pendaftaran pusat gagal:', errData.error || 'Server error');
        }
      } catch (err) {
        console.warn('Gagal terhubung ke database pusat (offline mode):', err);
        toast.info('Setup selesai secara offline. Riwayat lisensi akan disinkronkan saat terhubung internet.');
      }

      const saved = await db.storeSettings.toCollection().first();
      if (!saved?.onboardingDone) {
        throw new Error('Gagal menyimpan pengaturan toko');
      }

      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-background max-w-lg md:max-w-6xl mx-auto overflow-y-auto" style={{ height: '100dvh', WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-full flex flex-col">
        <div className="flex items-center justify-center gap-2 pt-8 pb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/20'
              )}
            />
          ))}
        </div>

      <div className="flex-1 flex flex-col px-4">
        {isTutorialStep ? (
          /* Tutorial slides */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            {(() => {
              const slide = tutorialSlides[tutorialIndex];
              const Icon = slide.icon;
              return (
                <>
                  {tutorialIndex === 0 ? (
                    <>
                      <img
                        src="/inspirapos-icon.jpeg"
                        alt="Inspira POS"
                        className="w-28 h-28 object-contain rounded-2xl"
                      />
                      <div className="space-y-3">
                        <h2 className="text-2xl font-bold tracking-tight">{slide.title}</h2>
                        <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{slide.description}</p>
                      </div>
                      {/* Language picker */}
                      <div className="w-full max-w-xs space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">{t('language.title')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => i18n.changeLanguage(code as SupportedLanguage)}
                              className={cn(
                                'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200',
                                i18n.language === code
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
                              )}
                            >
                              <span className="text-2xl">{flag}</span>
                              <span className={cn(
                                'text-[11px] font-semibold leading-tight text-center',
                                i18n.language === code ? 'text-primary' : 'text-foreground'
                              )}>
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center', slide.color)}>
                      <Icon className="w-12 h-12" />
                    </div>
                  )}
                  {tutorialIndex === 0 ? null : (
                    <div className="space-y-3 w-full max-w-xs">
                      <h2 className="text-2xl font-bold tracking-tight">{slide.title}</h2>
                      {'isTrial' in slide && slide.isTrial ? (
                        <ul className="text-left text-sm space-y-2">
                          {(['days', 'products', 'transactions', 'receipt', 'export'] as const).map((key) => (
                            <li key={key} className="flex gap-2 text-muted-foreground">
                              <span className="text-primary shrink-0">•</span>
                              {t(`trialLimits.${key}`, TRIAL_LIMITS)}
                            </li>
                          ))}
                        </ul>
                      ) : slide.description ? (
                        <p className="text-muted-foreground leading-relaxed mx-auto">{slide.description}</p>
                      ) : null}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : isInstallStep ? (
          /* Install step - FIRST, before anything else */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center',
              isInstalled || installDone ? 'text-success bg-success/10' : 'text-primary bg-primary/10'
            )}>
              {isInstalled || installDone ? <CheckCircle2 className="w-12 h-12" /> : <Download className="w-12 h-12" />}
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {isInstalled || installDone ? t('install.installed') : t('install.title')}
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {isInstalled || installDone
                  ? t('install.installedDesc')
                  : t('install.desc')}
              </p>
            </div>
            {!isInstalled && !installDone && (
              canInstall ? (
                <div className="space-y-3 w-full max-w-xs">
                  <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) {
                        setInstallDone(true);
                        toast.success('Berhasil install Inspira POS!');
                      }
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {t('install.button')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full h-12 text-base text-muted-foreground"
                    onClick={() => setStep(s => s + 1)}
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    {t('install.continueBrowser')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-w-xs">
                  <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('install.chromeHint') }} />
                  <p className="text-xs text-muted-foreground/70">
                    {t('install.safariHint')}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          /* Store setup - LAST */
          <div className="flex-1 flex flex-col overflow-y-auto space-y-6 py-4 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{t('store.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('store.subtitle')}</p>
              <div className="inline-flex items-center gap-1.5 mx-auto text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50 mt-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t('store.trialBadge')}
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t('restore.title')}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{t('restore.desc')}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-10 text-sm gap-2" onClick={handleRestore} disabled={restoring}>
                <Upload className="w-4 h-4" />
                {restoring ? t('restore.restoring') : t('restore.backupButton')}
              </Button>


            </div>

            {showCloud && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => !cloudRestoringId && setShowCloud(false)}
              >
              <div
                className="w-full max-w-md rounded-xl bg-background p-4 shadow-lg max-h-[85vh] overflow-y-auto space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-primary" />
                      {t('restore.cloudTitle')}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('restore.cloudSubtitle')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 -mr-1 -mt-1"
                    disabled={!!cloudRestoringId}
                    onClick={() => setShowCloud(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {!cloudLoggedIn ? (
                  <div className="space-y-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{t('restore.cloudLogin')}</p>
                    <div className="flex justify-center">
                      {isNative ? (
                        <Button className="h-11 gap-2" disabled={cloudLoginBusy} onClick={handleNativeCloudLogin}>
                          {cloudLoginBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                          {t('restore.googleContinue')}
                        </Button>
                      ) : (
                        <GoogleLogin
                          onSuccess={(cr) => {
                            if (cr.credential) cloudLogin(cr.credential).catch(() => toast.error(t('toast.googleLoginFailed')));
                            else toast.error(t('toast.googleLoginFailed'));
                          }}
                          onError={() => toast.error(t('toast.googleLoginFailed'))}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Account info + logout */}
                    <div className="flex items-center gap-3 rounded-xl border p-3">
                      {cloudUser?.picture ? (
                        <img src={cloudUser.picture} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {cloudUser?.name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{cloudUser?.name ?? t('restore.account')}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{cloudUser?.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-muted-foreground shrink-0"
                        disabled={!!cloudRestoringId}
                        onClick={() => { cloudLogout(); setCloudBackups([]); }}
                      >
                        <LogOut className="w-4 h-4" /> {t('restore.switchAccount')}
                      </Button>
                    </div>

                    {/* Backup list */}
                    <div className="space-y-2">
                      {cloudLoading ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : cloudBackups.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          {t('restore.noBackups')}
                        </p>
                      ) : (
                        cloudBackups.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            disabled={!!cloudRestoringId}
                            onClick={() => handleCloudRestore(b)}
                            className="flex w-full items-center gap-2 rounded-lg border p-2.5 text-left hover:bg-muted/60 disabled:opacity-60"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{b.fileName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {(b.fileSize / (1024 * 1024)).toFixed(2)} MB · {format(new Date(b.createdAt), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                            {cloudRestoringId === b.id ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              <DownloadCloud className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {cloudRestoringId && (
                      <p className="text-[10px] text-muted-foreground text-center">{t('restore.restoringInProgress')}</p>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName" className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  {t('store.storeName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="storeName"
                  placeholder={t('store.storeNamePlaceholder')}
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {t('store.address')}
                </Label>
                <Input
                  id="address"
                  placeholder={t('store.addressPlaceholder')}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {t('store.phone')}
                </Label>
                <Input
                  id="phone"
                  placeholder={t('store.phonePlaceholder')}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-12"
                  type="tel"
                />
              </div>

              {/* Jenis usaha + contoh menu */}
              <div className="space-y-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                <div>
                  <p className="text-sm font-medium">{t('store.businessType')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('store.businessTypeHint')}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBusinessType(null)}
                    className={cn(
                      'rounded-xl border-2 p-2.5 text-left transition-all min-h-[44px]',
                      businessType === null
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <span className="text-lg">✨</span>
                    <p className="text-[11px] font-semibold mt-1 leading-tight">{t('store.businessTypeNone')}</p>
                  </button>
                  {UMKM_TYPES.map(({ id, emoji }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBusinessType(id)}
                      className={cn(
                        'rounded-xl border-2 p-2.5 text-left transition-all min-h-[44px]',
                        businessType === id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      <span className="text-lg">{emoji}</span>
                      <p className="text-[11px] font-semibold mt-1 leading-tight">{t(`businessTypes.${id}`)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme color picker */}
              <div className="space-y-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('store.theme')}</p>
                    <p className="text-[10px] text-muted-foreground">{t('store.themeDesc')}</p>
                  </div>
                </div>
                <ThemeColorPicker
                  value={themeColor}
                  onChange={hue => {
                    setThemeColorState(hue);
                    applyThemeColor(hue);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TnC consent — slide pertama saja */}
      {isTutorialStep && tutorialIndex === 0 && (
        <div className="px-4 pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              checked={agreedTnc}
              onCheckedChange={(c) => setAgreedTnc(c === true)}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              {t('tnc.agree')}{' '}
              <a
                href="https://inspiralabs.id/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary font-medium underline"
              >
                {t('tnc.terms')}
              </a>{' '}
              {t('tnc.and')}{' '}
              <a
                href="https://inspiralabs.id/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary font-medium underline"
              >
                {t('tnc.privacy')}
              </a>
              .
            </span>
          </label>
        </div>
      )}

      {/* Navigation */}
      <div className="px-4 pt-4 flex items-center gap-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
        {step > 0 && !isInstallStep && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep(s => s - 1)}
            className="h-12"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        {isInstallStep ? (
          <>
            {(isInstalled || installDone) && (
              <Button
                size="lg"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => setStep(s => s + 1)}
              >
                {t('navigation.next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {!canInstall && !isInstalled && !installDone && (
              <Button
                size="lg"
                className="flex-1 h-12 text-base font-semibold"
                onClick={() => setStep(s => s + 1)}
              >
                {t('navigation.next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </>
        ) : isStoreStep ? (
          <Button
            size="lg"
            className="flex-1 h-12 text-base font-semibold"
            onClick={handleFinish}
            disabled={!storeName.trim() || saving}
          >
            {saving ? t('navigation.saving') : t('navigation.finish')}
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 h-12 text-base font-semibold"
            onClick={() => setStep(s => s + 1)}
            disabled={tutorialIndex === 0 && !agreedTnc}
          >
            {t('navigation.next')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
