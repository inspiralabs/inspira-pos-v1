import { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, type StoreSettings, seedDefaultData } from '@/lib/db';
import { validateLicenseKey } from '@/lib/license';
import { toast } from 'sonner';

interface LicenseBlockScreenProps {
  storeSettings: StoreSettings;
}

export default function LicenseBlockScreen({ storeSettings }: LicenseBlockScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const isRevoked = storeSettings.licenseStatus === 'REVOKED';

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      const isValid = await validateLicenseKey(storeSettings.storeName, storeSettings.deviceId, licenseKey.trim());
      if (isValid) {
        await db.storeSettings.update(storeSettings.id!, {
          licenseStatus: 'ACTIVE',
          licenseKey: licenseKey.trim(),
        });
        toast.success('Aplikasi Kasir berhasil diaktifkan secara permanen!');
      } else {
        toast.error('Kode Aktivasi tidak valid. Periksa kembali nama toko atau kode Anda.');
      }
    } catch {
      toast.error('Gagal memverifikasi kode lisensi.');
    } finally {
      setActivating(false);
    }
  };

  const handleWhatsAppContact = () => {
    const waNumber = '6282124533265'; // Inspira Labs WhatsApp
    const message = encodeURIComponent(
      isRevoked
        ? `Halo Admin Inspira POS, toko saya tidak ditemukan atau dinonaktifkan oleh admin.\n` +
          `- Nama Toko: ${storeSettings.storeName}\n` +
          `- Device ID: ${storeSettings.deviceId}\n` +
          `Mohon bantuannya untuk memeriksa dan mengaktifkan kembali.`
        : `Halo Admin Inspira POS, saya ingin mengaktifkan lisensi untuk toko:\n` +
          `- Nama Toko: ${storeSettings.storeName}\n` +
          `- Device ID: ${storeSettings.deviceId}`
    );
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  const handleResetStore = async () => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin mereset pengaturan toko ini?\n\n" +
      "Tindakan ini akan menghapus pengaturan toko lokal agar Anda dapat mendaftarkan toko baru dari awal. Data transaksi lokal Anda tidak akan dihapus."
    );
    if (confirmed) {
      await db.storeSettings.clear();
      await seedDefaultData();
      toast.success('Pengaturan toko berhasil di-reset. Silakan daftarkan toko baru.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${
            isRevoked ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {isRevoked ? <ShieldAlert className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isRevoked ? 'Toko Dinonaktifkan' : 'Masa Percobaan Habis'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            {isRevoked 
              ? 'Toko Anda telah dinonaktifkan atau dihapus oleh admin. Silakan hubungi Administrator untuk memulihkan akses, atau lakukan reset untuk mendaftarkan toko baru.'
              : 'Akses aplikasi kasir Anda telah dikunci karena masa uji coba offline gratis 14 hari sudah berakhir.'}
          </p>
        </div>

        <Card className="border-border shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Toko:</span>
                <span className="font-bold">{storeSettings.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device ID:</span>
                <span className="font-mono text-[10px] break-all select-all">{storeSettings.deviceId}</span>
              </div>
            </div>

            <Button onClick={handleWhatsAppContact} className="w-full h-11 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold gap-2">
              <ExternalLink className="w-4 h-4" />
              Hubungi Admin via WhatsApp
            </Button>

            {!isRevoked ? (
              <>
                <div className="relative flex items-center justify-center my-4">
                  <span className="absolute inset-x-0 border-t border-border" />
                  <span className="relative px-3 bg-card text-xs text-muted-foreground uppercase">Atau masukkan kode lisensi</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license-code" className="text-xs font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Kode Aktivasi Lisensi
                  </Label>
                  <Input
                    id="license-code"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    className="h-11 text-center font-mono text-sm tracking-wider uppercase"
                    disabled={activating}
                  />
                </div>

                <Button onClick={handleActivate} className="w-full h-11 font-bold" disabled={!licenseKey.trim() || activating}>
                  {activating ? 'Memproses...' : 'Aktifkan Aplikasi'}
                </Button>
              </>
            ) : null}

            <div className="relative flex items-center justify-center my-4">
              <span className="absolute inset-x-0 border-t border-border" />
              <span className="relative px-3 bg-card text-xs text-muted-foreground uppercase">Pengaturan Perangkat</span>
            </div>

            <Button 
              onClick={handleResetStore} 
              variant="outline" 
              className="w-full h-11 border-destructive/20 text-destructive hover:bg-destructive/5 font-bold gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset &amp; Daftarkan Toko Baru
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
