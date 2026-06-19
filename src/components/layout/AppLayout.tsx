import { Outlet } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDefaultData } from '@/lib/db';
import { useEffect } from 'react';
import BottomNav from './BottomNav';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCloudAutoBackup } from '@/hooks/use-cloud-auto-backup';
import Onboarding from '@/components/Onboarding';
import LoginScreen from '@/components/LoginScreen';
import PushPermissionModal from '@/components/PushPermissionModal';
import LicenseBlockScreen from '@/components/LicenseBlockScreen';
import { getLicenseStatus } from '@/lib/license';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

export default function AppLayout() {
  const {} = useTranslation();
  useThemeColor(); // Apply saved theme color on mount
  useCloudAutoBackup(); // Auto cloud backup on app open (if enabled & subscribed)
  const { multiUserEnabled, currentUser, loading } = useAuth();

  useEffect(() => {
    seedDefaultData();
  }, []);

  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  // Background license status check/sync
  useEffect(() => {
    if (!storeSettings || !storeSettings.onboardingDone || !storeSettings.deviceId) return;

    const syncLicenseStatus = async () => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      try {
        const res = await fetch(`${API_BASE_URL}/api/clients/license-status?deviceId=${encodeURIComponent(storeSettings.deviceId)}`);
        if (res.ok) {
          const data = await res.json();
          // If the status or key has changed on the server, update the local DB
          if (
            data.licenseStatus && 
            (data.licenseStatus !== storeSettings.licenseStatus || data.licenseKey !== storeSettings.licenseKey)
          ) {
            await db.storeSettings.update(storeSettings.id!, {
              licenseStatus: data.licenseStatus,
              licenseKey: data.licenseKey || null,
            });
            console.log(`License status synced: ${data.licenseStatus}`);
          }
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi status lisensi dengan server:', err);
      }
    };

    // Run once on load
    syncLicenseStatus();

    // Check every 5 minutes in background
    const interval = setInterval(syncLicenseStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeSettings?.deviceId, storeSettings?.licenseStatus, storeSettings?.licenseKey, storeSettings?.id]);

  // Loading state
  if (storeSettings === undefined || loading) return null;

  // Show onboarding if not done yet
  if (!storeSettings || !storeSettings.onboardingDone) {
    return <Onboarding onComplete={() => { /* Dexie live query will auto-refresh */ }} />;
  }

  // Intercept if license has expired
  const licenseStatus = getLicenseStatus(storeSettings);
  if (licenseStatus === 'EXPIRED') {
    return <LicenseBlockScreen storeSettings={storeSettings} />;
  }

  // Multi-user mode is on but no one is logged in → show login
  if (multiUserEnabled && !currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-background max-w-lg md:max-w-6xl mx-auto relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <PushPermissionModal />
    </div>
  );
}
