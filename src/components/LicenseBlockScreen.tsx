import { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, type StoreSettings } from '@/lib/db';
import { validateLicenseKey } from '@/lib/license';
import { toast } from 'sonner';

interface LicenseBlockScreenProps {
  storeSettings: StoreSettings;
}

export default function LicenseBlockScreen({ storeSettings }: LicenseBlockScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

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
      `Halo Admin Inspira POS, saya ingin mengaktifkan lisensi untuk toko:\n` +
      `- Nama Toko: ${storeSettings.storeName}\n` +
      `- Device ID: ${storeSettings.deviceId}`
    );
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Masa Percobaan Habis</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Akses aplikasi kasir Anda telah dikunci karena masa uji coba offline gratis 14 hari sudah berakhir.
          </p>
        </div>

        <Card className="border-border shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
