import { useState } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProGateProps {
  featureKey: string;
  children: React.ReactNode;
  showBanner?: boolean; // Tampilkan upgrade banner atau sembunyikan total
}

export function ProGate({ featureKey, children, showBanner = true }: ProGateProps) {
  const isAllowed = useFeatureFlag(featureKey);
  const [open, setOpen] = useState(false);
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  if (isAllowed) return <>{children}</>;

  if (!showBanner) return null;

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleWhatsAppContact = () => {
    const waNumber = '6282124533265'; // Inspira Labs WhatsApp
    const storeName = storeSettings?.storeName ?? 'Toko Saya';
    const deviceId = storeSettings?.deviceId ?? 'unknown';
    const message = encodeURIComponent(
      `Halo Admin Inspira POS, saya ingin melakukan upgrade dari Lite ke Pro untuk toko saya:\n` +
      `- Nama Toko: ${storeName}\n` +
      `- Device ID: ${deviceId}\n` +
      `Mohon dibantu info pembayaran selisih Rp 200.000.`
    );
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  return (
    <>
      <div className="relative cursor-pointer" onClick={handleUpgradeClick}>
        {/* Render children tapi blur/disable */}
        <div className="pointer-events-none opacity-40 select-none filter blur-[1px]">
          {children}
        </div>
        {/* Overlay upgrade banner */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/20 rounded-lg">
          <div className="text-center p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-full shadow-sm border border-neutral-200/50 dark:border-slate-800/50">
            <Lock className="text-amber-500 w-4 h-4 mx-auto" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] rounded-2xl md:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Lock className="w-5 h-5 text-amber-500" />
              Fitur Inspira Offline Pro
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Upgrade lisensi Anda untuk membuka seluruh fitur premium.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-3 text-left">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Mengapa Fitur Ini Terkunci?</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Fitur lanjutan seperti Multi-User, Pembayaran Hutang Pelanggan, Supplier, Pengeluaran Toko, dan Laporan Lengkap (termasuk ekspor PDF/Excel) hanya tersedia di paket <strong>Inspira Offline Pro</strong>.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Biaya Upgrade Sekali Bayar</p>
              <p className="text-lg font-bold text-amber-500">Cukup Rp 200.000 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(selisih dari harga Lite Anda)</span></p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Setelah pembayaran berhasil, Admin akan mengirimkan kode aktivasi Pro baru. Semua data transaksi lokal Anda tetap aman dan tidak akan hilang/terhapus.
            </p>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Tutup
              </Button>
              <Button onClick={handleWhatsAppContact} className="flex-1 h-11 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold gap-1.5">
                Hubungi WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
