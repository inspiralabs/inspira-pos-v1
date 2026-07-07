import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  Smartphone, 
  Printer, 
  WifiOff, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle, 
  Menu, 
  X, 
  Info,
  BadgePercent
} from 'lucide-react';

const FAQS_DATA = [
  { q: "Apa itu Lisensi Beli Putus?", a: "Lisensi Beli Putus adalah skema pembayaran sekali di depan. Dengan lisensi ini, Anda bisa menggunakan aplikasi secara offline selamanya tanpa biaya berlangganan bulanan." },
  { q: "Apakah aplikasi ini bisa berjalan tanpa internet?", a: "Ya, Inspira POS dirancang dengan arsitektur offline-first. Seluruh transaksi, manajemen menu, dan pencatatan stok tetap berjalan 100% lancar walau koneksi internet terputus. Data akan otomatis tersimpan aman di penyimpanan lokal perangkat Anda." },
  { q: "Perangkat apa saja yang didukung?", a: "Inspira POS dapat diakses dari browser komputer, laptop, tablet, iPad, maupun smartphone Android dan iOS. Anda juga bisa menginstalnya langsung sebagai aplikasi native (PWA) di layar utama perangkat Anda." },
  { q: "Bagaimana dengan printer kasir?", a: "Aplikasi mendukung cetak struk menggunakan printer thermal bluetooth (ukuran 58mm atau 80mm) serta printer jaringan/USB. Anda juga bisa membagikan struk belanja digital langsung lewat WhatsApp tanpa kertas." },
  { q: "Bedanya Lite dan Pro apa?", a: "Lite cocok untuk pemilik toko yang mengoperasikan kasir sendiri tanpa karyawan. Pro cocok untuk toko yang punya kasir/staf, butuh kontrol akses (multi-user), pencatatan hutang pelanggan, pencatatan pengeluaran, void transaksi, serta laporan keuangan lengkap seperti laba rugi." },
  { q: "Kalau sudah beli Lite, bisa upgrade ke Pro?", a: "Bisa. Anda cukup membayar selisih harga (Rp 200.000) dan meminta kode lisensi Pro ke tim InsiraLabs via WhatsApp. Semua data toko Anda tetap aman, tanpa perlu melakukan reset data." },
  { q: "Apakah ada biaya tambahan setelah beli?", a: "Tidak ada biaya berlangganan bulanan. Sekali bayar, aktif selamanya di device yang sama. Anda juga bisa menambah Add-ons opsional di masa depan jika membutuhkan fitur tambahan." },
  { q: "Kalau ganti HP/perangkat bagaimana?", a: "Backup data Anda terlebih dahulu via fitur Export JSON di menu Pengaturan, lalu pasang di perangkat baru dan lakukan restore data. Untuk aktivasi ulang di perangkat baru, hubungi tim support InsiraLabs — tersedia 1x re-aktivasi gratis per pembelian lisensi." },
];


// Framer Motion staggered variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const hoverScaleVariants = {
  hover: {
    y: -5,
    scale: 1.02,
    boxShadow: "0 10px 30px -10px rgba(110, 21, 15, 0.15)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const isRedirecting = useRef(false);

  // Deteksi mode PWA standalone atau native Capacitor.
  // Jika terdeteksi, langsung arahkan ke /dashboard agar user
  // yang membuka app dari home screen tidak melihat landing page.
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://') ||
      Capacitor.isNativePlatform();

    if (isStandalone) {
      isRedirecting.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(1); // FAQ 'Bisa tanpa internet?' dibuka secara default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Typewriter effect states
  const words = useMemo(() => ["Mudah & Cepat", "Secara Offline", "Lebih Praktis", "Aman & Akurat"], []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleTyping = () => {
      const fullWord = words[currentWordIndex];
      if (!isDeleting) {
        // Typing text
        setCurrentText(fullWord.substring(0, currentText.length + 1));
        setTypingSpeed(100);

        if (currentText === fullWord) {
          timer = setTimeout(() => setIsDeleting(true), 2000); // Wait 2s before deleting
          return;
        }
      } else {
        // Deleting text
        setCurrentText(fullWord.substring(0, currentText.length - 1));
        setTypingSpeed(50);

        if (currentText === "") {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
          setTypingSpeed(150);
          return;
        }
      }

      timer = setTimeout(handleTyping, typingSpeed);
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, typingSpeed, words]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Jangan render apapun saat akan redirect supaya tidak ada flash landing page
  if (isRedirecting.current) return null;

  return (
    <div className="min-h-screen bg-[#F5EFE6] text-[#1A1A1A] font-sans antialiased selection:bg-[#6e150f]/10 selection:text-[#6e150f]">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#6e150f]/10 bg-[#F5EFE6]/95 backdrop-blur supports-[backdrop-filter]:bg-[#F5EFE6]/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <img 
              src="/inspirapos-icon.jpeg" 
              alt="Inspira POS Logo" 
              className="w-10 h-10 object-contain rounded-xl shadow-md border border-[#d0a139]/20" 
            />
            <span className="text-xl font-bold tracking-tight text-[#6e150f]">
              Inspira <span className="text-[#d0a139]">POS</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#1A1A1A]">
            <button onClick={() => scrollToSection('features')} className="hover:text-[#b92a1c] hover:underline underline-offset-4 transition-all">Fitur</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-[#b92a1c] hover:underline underline-offset-4 transition-all">Harga</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#b92a1c] hover:underline underline-offset-4 transition-all">FAQ</button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center justify-center rounded-full text-sm font-bold h-10 px-5 bg-gradient-to-r from-[#6e150f] to-[#b92a1c] text-[#F5EFE6] hover:shadow-lg hover:shadow-[#6e150f]/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              Mulai Jualan (Demo)
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button 
            className="md:hidden p-2 text-[#1A1A1A]/80 hover:text-[#6e150f]" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#6e150f]/10 bg-[#F5EFE6] p-4 flex flex-col gap-4 overflow-hidden"
            >
              <button onClick={() => scrollToSection('features')} className="text-left py-2 font-semibold hover:text-[#b92a1c]">Fitur</button>
              <button onClick={() => scrollToSection('pricing')} className="text-left py-2 font-semibold hover:text-[#b92a1c]">Harga</button>
              <button onClick={() => scrollToSection('faq')} className="text-left py-2 font-semibold hover:text-[#b92a1c]">FAQ</button>
              <hr className="border-[#6e150f]/10" />
              <Link 
                to="/dashboard" 
                className="inline-flex items-center justify-center rounded-full font-bold h-11 bg-gradient-to-r from-[#6e150f] to-[#b92a1c] text-[#F5EFE6] text-center"
              >
                Mulai Jualan (Demo)
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative pt-10 pb-20 md:py-24 overflow-hidden">
        {/* Soft background glow spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#6e150f]/5 to-[#d0a139]/10 rounded-full blur-3xl pointer-events-none -z-10" />
        
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Headline and Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-6 flex flex-col text-center lg:text-left items-center lg:items-start space-y-6"
            >
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.15] text-[#1A1A1A]">
                Kelola Penjualan <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#6e150f] to-[#b92a1c] bg-clip-text text-transparent inline-flex items-center min-h-[1.25em] border-r-2 border-[#b92a1c] pr-1">
                  {currentText}
                </span>{" "}
                <br />
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Aplikasi kasir modern yang offline-first, cepat, dan siap mengelola penjualan, diskon produk, variasi menu (modifier), hingga laporan keuangan harian bisnis Anda tanpa bergantung internet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center justify-center gap-2 rounded-full font-bold h-12 px-8 bg-[#6e150f] hover:bg-[#b92a1c] text-[#F5EFE6] shadow-xl shadow-[#6e150f]/10 hover:shadow-[#6e150f]/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Coba Aplikasi Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="inline-flex items-center justify-center rounded-full font-bold h-12 px-8 border-2 border-[#6e150f]/20 hover:border-[#6e150f] text-[#6e150f] transition-all bg-transparent"
                >
                  Lihat Paket Harga
                </button>
              </div>
            </motion.div>

            {/* Application Mockup Display */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-6 flex justify-center"
            >
              <div className="relative group w-full max-w-[540px]">
                {/* Visual Glow behind frame */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#6e150f]/10 to-[#d0a139]/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform duration-500 -z-10" />
                
                {/* Tablet Frame container */}
                <div className="relative rounded-2xl p-2 bg-gradient-to-br from-[#6e150f]/80 to-[#d0a139]/50 shadow-2xl border border-white/20">
                  <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
                    <img 
                      src="/og-image.jpeg" 
                      alt="Inspira POS Dashboard Preview" 
                      className="w-full h-auto object-cover aspect-[16/9] group-hover:scale-[1.02] transition-transform duration-700"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-20 bg-white border-y border-[#6e150f]/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-16 space-y-3"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-[#6e150f]">
              Fitur Utama yang Memudahkan Bisnis Anda
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Nikmati kenyamanan mengelola gerobak, kafe, warung, atau franchise Anda dengan modul canggih yang dirancang ramah pengguna.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Feature 1 */}
            <motion.div 
              variants={itemVariants}
              whileHover="hover"
              custom={0}
              className="flex flex-col p-6 rounded-2xl bg-[#F5EFE6]/50 border border-[#6e150f]/5 hover:border-[#6e150f]/20 transition-all hover:shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6e150f]/10 text-[#6e150f] mb-5 group-hover:bg-[#6e150f] group-hover:text-[#F5EFE6] transition-colors">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[#1A1A1A]">100% Offline</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tetap bisa jualan tanpa internet. Data transaksi tersimpan aman di peranti Anda dan disinkronkan otomatis saat online.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              variants={itemVariants}
              whileHover="hover"
              custom={1}
              className="flex flex-col p-6 rounded-2xl bg-[#F5EFE6]/50 border border-[#6e150f]/5 hover:border-[#6e150f]/20 transition-all hover:shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6e150f]/10 text-[#6e150f] mb-5 group-hover:bg-[#6e150f] group-hover:text-[#F5EFE6] transition-colors">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[#1A1A1A]">Menu Modifier (Sub-Menu)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Atur topping tambahan, level kepedasan, pilihan ukuran menu, baik dengan biaya tambahan opsional maupun tanpa biaya.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              variants={itemVariants}
              whileHover="hover"
              custom={2}
              className="flex flex-col p-6 rounded-2xl bg-[#F5EFE6]/50 border border-[#6e150f]/5 hover:border-[#6e150f]/20 transition-all hover:shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6e150f]/10 text-[#6e150f] mb-5 group-hover:bg-[#6e150f] group-hover:text-[#F5EFE6] transition-colors">
                <BadgePercent className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[#1A1A1A]">Diskon Default Produk</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tentukan harga coret diskon default per produk langsung melalui menu pengelolaan item dari halaman Owner.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              variants={itemVariants}
              whileHover="hover"
              custom={3}
              className="flex flex-col p-6 rounded-2xl bg-[#F5EFE6]/50 border border-[#6e150f]/5 hover:border-[#6e150f]/20 transition-all hover:shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6e150f]/10 text-[#6e150f] mb-5 group-hover:bg-[#6e150f] group-hover:text-[#F5EFE6] transition-colors">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-[#1A1A1A]">Struk Cetak &amp; Digital</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hubungkan dengan printer kasir bluetooth thermal, atau kirim struk belanja interaktif langsung ke WhatsApp pelanggan.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Pricing Section */}
      <section id="pricing" className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12 space-y-4"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-[#6e150f]">
              Pilih Paket Sesuai Kebutuhan Toko Anda
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sekali bayar. Aktif selamanya. Tanpa biaya berlangganan bulanan.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Inspira Offline Lite */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col rounded-3xl bg-white border border-[#6e150f]/10 p-8 shadow-xl shadow-[#6e150f]/5 relative overflow-hidden group hover:border-[#6e150f]/30 transition-all duration-300"
            >
              <div className="absolute top-4 right-4 text-[10px] font-extrabold text-[#6e150f] bg-[#6e150f]/10 border border-[#6e150f]/20 px-2.5 py-1 rounded-full">
                Paling Terjangkau
              </div>
              <h3 className="text-xl font-extrabold text-[#6e150f] mb-1">Inspira Offline Lite</h3>
              <p className="text-xs text-muted-foreground mb-6">Untuk pemilik toko solo yang pegang semuanya sendiri.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">Rp 299.000</span>
                <span className="text-xs text-muted-foreground font-semibold ml-1">/ sekali bayar / device</span>
              </div>

              <ul className="space-y-4 mb-8 text-sm flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Lisensi Aktif Offline Selamanya</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Kapasitas Produk &amp; Transaksi Tanpa Batas</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Custom Modifier &amp; Variasi Produk</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Diskon per Item &amp; per Transaksi</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Open Bill (Simpan Tagihan Sementara)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Manajemen Stok &amp; HPP Otomatis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Sold Out Toggle &amp; Alert Stok Menipis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Cetak Struk Thermal Bluetooth (58/80mm)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Laporan Harian, 7 Hari, &amp; 30 Hari</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Backup &amp; Restore Data (JSON)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>1 Pengguna (Pemilik Toko)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Ekspor Laporan PDF &amp; Excel</span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground/60">
                  <X className="w-5 h-5 text-red-500/60 flex-shrink-0 mt-0.5" />
                  <span>Multi-User &amp; PIN Kasir <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded ml-1">PRO</span></span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground/60">
                  <X className="w-5 h-5 text-red-500/60 flex-shrink-0 mt-0.5" />
                  <span>Database Pelanggan &amp; Hutang <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded ml-1">PRO</span></span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground/60">
                  <X className="w-5 h-5 text-red-500/60 flex-shrink-0 mt-0.5" />
                  <span>Pencatatan Pengeluaran Toko <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded ml-1">PRO</span></span>
                </li>
              </ul>

              <a 
                href="https://wa.me/6282124533265?text=Halo%20Admin%20Inspira%20POS%2C%20saya%20tertarik%20membeli%20paket%20Inspira%20Offline%20Lite%20(Rp%20299.000%2Fdevice)%20untuk%20toko%20saya."
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-xl font-bold h-11 border-2 border-[#6e150f]/20 text-[#6e150f] hover:border-[#6e150f] hover:bg-[#6e150f]/5 transition-all text-center"
              >
                Beli Lite — Rp 299.000
              </a>
            </motion.div>

            {/* Inspira Offline Pro */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col rounded-3xl bg-white border-2 border-[#6e150f] p-8 shadow-xl shadow-[#6e150f]/10 relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 bg-[#d0a139] text-[#1A1A1A] font-extrabold text-[9px] uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-sm">
                ⭐ Recommended
              </div>
              
              <h3 className="text-xl font-extrabold text-[#6e150f] mb-1 flex items-center gap-1.5">
                Inspira Offline Pro <Sparkles className="w-4 h-4 text-[#d0a139]" />
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Untuk toko dengan karyawan kasir dan butuh kontrol penuh.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">Rp 499.000</span>
                <span className="text-xs text-muted-foreground font-semibold ml-1">/ sekali bayar / device</span>
              </div>

              <ul className="space-y-4 mb-8 text-sm flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-emerald-700">Semua Fitur Inspira Offline Lite</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Multi-User: Owner + Staff/Kasir (Tanpa Batas Akun)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Login PIN 4–6 Digit per Kasir (Enkripsi Lokal)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Kontrol Akses Granular per Staf</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Manajemen Shift Kasir</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Void / Cancel Transaksi (PIN Owner)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Bagi Tagihan (Split Bill)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Database Supplier &amp; Pelanggan</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Pencatatan Hutang &amp; Cicilan Pelanggan</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Pencatatan Pengeluaran Operasional Toko</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Laporan Laba Rugi Sederhana (P&amp;L)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-emerald-700">Laporan per Kasir / Shift</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Grafik Penjualan 30 Hari terakhir</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Ekspor Laporan ke PDF &amp; Excel</span>
                </li>
              </ul>

              <a 
                href="https://wa.me/6282124533265?text=Halo%20Admin%20Inspira%20POS%2C%20saya%20tertarik%20membeli%20paket%20Inspira%20Offline%20Pro%20(Rp%20499.000%2Fdevice)%20untuk%20toko%20saya."
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-xl font-bold h-11 bg-gradient-to-r from-[#6e150f] to-[#b92a1c] text-[#F5EFE6] hover:shadow-lg hover:shadow-[#6e150f]/20 transition-all text-center"
              >
                Beli Pro — Rp 499.000
              </a>
            </motion.div>
          </div>

          {/* Comparison Table */}
          <div className="mt-16 overflow-x-auto rounded-3xl border border-[#6e150f]/10 bg-white p-6 md:p-8 shadow-xl shadow-[#6e150f]/5">
            <h3 className="text-xl font-extrabold text-[#6e150f] mb-6 text-center">Tabel Perbandingan Fitur Detail</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#6e150f]/10 text-xs font-semibold text-[#1A1A1A]">
                  <th className="py-3 px-4">Fitur Utama</th>
                  <th className="py-3 px-4 text-center">Offline Lite</th>
                  <th className="py-3 px-4 text-center">Offline Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6e150f]/5 text-xs sm:text-sm">
                <tr>
                  <td className="py-3.5 px-4 font-medium">Harga</td>
                  <td className="py-3.5 px-4 text-center text-[#6e150f] font-bold">Rp 299.000</td>
                  <td className="py-3.5 px-4 text-center text-[#6e150f] font-bold">Rp 499.000</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Masa Aktif Lisensi</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Sekali Bayar (Selamanya)</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Sekali Bayar (Selamanya)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Kapasitas Produk &amp; Transaksi</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Unlimited</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Pengguna</td>
                  <td className="py-3.5 px-4 text-center">1 (Owner)</td>
                  <td className="py-3.5 px-4 text-center font-medium text-emerald-700 bg-emerald-50/50 rounded-lg">Owner + Staff tak terbatas</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Login PIN &amp; Shift Kasir</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Void Transaksi &amp; Otorisasi PIN</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Bagi Tagihan (Split Bill)</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Custom Modifiers &amp; Topping</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Manajemen Stok &amp; HPP Otomatis</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Database Pelanggan &amp; Hutang</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Pencatatan Pengeluaran Toko</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Grafik Penjualan 30 Hari</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Laporan Laba Rugi (P&amp;L)</td>
                  <td className="py-3.5 px-4 text-center text-red-500 font-bold">❌</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Ekspor Laporan PDF &amp; Excel</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 space-y-3"
          >
            <div className="inline-flex p-2 rounded-full bg-[#6e150f]/10 text-[#6e150f] mb-2">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#6e150f]">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Temukan jawaban untuk memperjelas wawasan Anda seputar sistem lisensi dan fungsionalitas Inspira POS.
            </p>
          </motion.div>

          <div className="space-y-4">
            {FAQS_DATA.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="rounded-2xl border border-[#6e150f]/10 bg-white shadow-sm overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-bold text-[#1A1A1A] hover:text-[#b92a1c] hover:bg-[#6e150f]/5 transition-all gap-4"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-[#d0a139] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          <hr className="border-[#6e150f]/5 mb-4" />
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium CTA Request Banner */}
      <section className="mx-4 md:mx-8 mb-20 max-w-6xl lg:mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-gradient-to-br from-[#6e150f] to-[#b92a1c] text-[#F5EFE6] p-8 md:p-12 shadow-xl shadow-[#6e150f]/20 relative overflow-hidden"
        >
          {/* Subtle background circles */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-2xl flex flex-col space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#d0a139] text-[#1A1A1A] w-fit">
              <ShieldCheck className="w-3.5 h-3.5" /> Kustomisasi Custom POS
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Butuh Fitur Khusus atau Integrasi Sistem POS Kustom?
            </h2>
            <p className="text-sm sm:text-base text-[#F5EFE6]/80 leading-relaxed">
              Tim pengembang kami di Inspira Labs siap membantu merealisasikan integrasi khusus untuk rantai bisnis, waralaba besar, maupun jenis usaha spesifik Anda.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="https://inspiralabs.id/kontak" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full font-bold h-12 px-6 bg-[#d0a139] hover:bg-[#fad64a] text-[#1A1A1A] shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Hubungi Kami di WhatsApp <ArrowRight className="w-4 h-4" />
              </a>
              <a 
                href="https://inspiralabs.id/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full font-bold h-12 px-6 border border-white/20 hover:border-white text-white transition-all bg-transparent"
              >
                Kunjungi Website Inspira Labs
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-[#F5EFE6]/60 py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <img src="/inspirapos-icon.jpeg" alt="Logo" className="w-7 h-7 rounded-lg object-contain" />
              <span>Inspira <span className="text-[#d0a139]">POS</span></span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs">
              Smart POS &amp; Aplikasi Kasir offline-first modern untuk memajukan kapabilitas digitalisasi operasional UMKM Indonesia.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-bold mb-4">Navigasi</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors">Beranda</button></li>
              <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Fitur Utama</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Paket Harga</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-bold mb-4">Produk &amp; Layanan</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Aplikasi Kasir POS</Link></li>
              <li><a href="https://inspiralabs.id/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Inspira Labs Ecosystem</a></li>
              <li><a href="https://inspiralabs.id/kontak" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Custom System Development</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-bold mb-4">Hubungi Kami</h4>
            <p className="text-xs leading-relaxed">
              Email: <span className="text-white">hello@inspiralabs.id</span> <br />
              Website: <a href="https://inspiralabs.id" target="_blank" rel="noreferrer" className="text-[#d0a139] hover:underline">inspiralabs.id</a>
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-8 border-t border-white/5 pt-8 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Inspira POS by InspiraLabs. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex gap-4">
            <a href="https://inspiralabs.id" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Syarat Ketentuan</a>
            <a href="https://inspiralabs.id" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
