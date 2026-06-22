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
import { toast } from 'sonner';

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
      
      // Jika data toko belum terdaftar/tersinkron ke backend (misal onboarding diselesaikan saat offline),
      // maka coba daftarkan ulang terlebih dahulu agar deviceId terikat dengan benar ke database pusat.
      if (!storeSettings.isSyncedWithServer) {
        try {
          console.log('Mencoba mendaftarkan ulang toko ke server pusat...');
          const registerRes = await fetch(`${API_BASE_URL}/api/clients/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeName: storeSettings.storeName,
              address: storeSettings.address,
              phone: storeSettings.phone,
              deviceId: storeSettings.deviceId,
            }),
          });
          if (registerRes.ok) {
            await db.storeSettings.update(storeSettings.id!, { isSyncedWithServer: true });
            console.log('Pendaftaran ulang ke server pusat sukses.');
          } else {
            console.warn('Gagal melakukan pendaftaran ulang ke server pusat (offline/error server).');
            return; // Batalkan sync lisensi, coba lagi di interval berikutnya
          }
        } catch (err) {
          console.warn('Gagal terhubung ke database pusat untuk pendaftaran ulang (offline mode):', err);
          return; // Tunda pengecekan status lisensi karena jaringan offline
        }
      }

      // Pengecekan status lisensi ke server admin pusat
      try {
        const res = await fetch(`${API_BASE_URL}/api/clients/license-status?deviceId=${encodeURIComponent(storeSettings.deviceId)}`);
        
        // Toko hanya diblokir (REVOKED) jika sebelumnya pernah berhasil tersinkronisasi,
        // namun kemudian dihapus di panel admin (Supabase mengembalikan 404).
        if (res.status === 404) {
          console.warn('Toko ini tidak ditemukan di server (kemungkinan dihapus). Menandai sebagai REVOKED...');
          await db.storeSettings.update(storeSettings.id!, {
            licenseStatus: 'REVOKED'
          });
          return;
        }

        if (res.ok) {
          const data = await res.json();
          // If the status, key, or tier has changed on the server, update the local DB
          if (
            data.licenseStatus && 
            (data.licenseStatus !== storeSettings.licenseStatus || 
             data.licenseKey !== storeSettings.licenseKey ||
             data.planTier !== storeSettings.planTier)
          ) {
            await db.storeSettings.update(storeSettings.id!, {
              licenseStatus: data.licenseStatus,
              licenseKey: data.licenseKey || null,
              planTier: data.planTier || 'LITE',
            });
            console.log(`License status synced: ${data.licenseStatus}, tier: ${data.planTier}`);
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
  }, [storeSettings?.deviceId, storeSettings?.licenseStatus, storeSettings?.licenseKey, storeSettings?.id, storeSettings?.isSyncedWithServer]);

  // Loading state
  if (storeSettings === undefined || loading) return null;

  // Show onboarding if not done yet
  if (!storeSettings || !storeSettings.onboardingDone) {
    return <Onboarding onComplete={() => { /* Dexie live query will auto-refresh */ }} />;
  }

  // Intercept if license has expired or is revoked from admin
  const licenseStatus = getLicenseStatus(storeSettings);
  if (licenseStatus === 'EXPIRED' || licenseStatus === 'REVOKED') {
    return <LicenseBlockScreen storeSettings={storeSettings} />;
  }

  // Multi-user mode is on but no one is logged in → show login
  if (multiUserEnabled && !currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-[100dvh] bg-background max-w-lg md:max-w-6xl mx-auto relative flex flex-col justify-between">
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>
      <BottomNav />
      <PushPermissionModal />
    </div>
  );
}
