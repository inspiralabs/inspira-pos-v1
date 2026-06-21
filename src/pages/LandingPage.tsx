import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Search, 
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

const ADD_ONS_DATA = [
  { id: 1, name: "Cloud Auto-Backup & Sync", price: "Rp 29.000/bln", desc: "Sinkronisasi data otomatis ke cloud secara real-time dan aman.", category: "dashboard" },
  { id: 2, name: "Kertas Roll Thermal (Pack)", price: "Rp 49.000/pack", desc: "Bundel kertas struk thermal berkualitas isi 10 roll (58mm/80mm).", category: "operasional" },
  { id: 3, name: "Setup Hardware & Training Kasir", price: "Rp 199.000/sesi", desc: "Jasa instalasi perangkat keras & pelatihan karyawan kasir secara remote.", category: "operasional" },
  { id: 4, name: "Paket Bundel Printer Bluetooth", price: "Rp 349.000/unit", desc: "Printer thermal bluetooth 58mm portable siap pakai untuk cetak struk.", category: "operasional" },
  { id: 5, name: "Kustomisasi Cetak Struk", price: "Rp 149.000", desc: "Penyesuaian layout struk khusus dengan tambahan logo & footer kustom Anda.", category: "fitur" }
];

const FAQS_DATA = [
  { q: "Apa itu Lisensi Beli Putus?", a: "Lisensi Beli Putus adalah skema pembayaran sekali di depan. Dengan lisensi ini, Anda bisa menggunakan aplikasi secara offline selamanya tanpa biaya berlangganan bulanan, serta mendapatkan fitur sinkronisasi backup cloud lokal." },
  { q: "Apakah aplikasi ini bisa berjalan tanpa internet?", a: "Ya, Inspira POS dirancang dengan arsitektur offline-first. Seluruh transaksi, manajemen menu, dan pencatatan stok tetap berjalan 100% lancar walau koneksi internet terputus. Data akan otomatis terpendam di penyimpanan lokal perangkat Anda." },
  { q: "Perangkat apa saja yang didukung?", a: "Inspira POS dapat diakses dari browser komputer, laptop, tablet, iPad, maupun smartphone Android dan iOS. Anda juga bisa menginstalnya langsung sebagai aplikasi native (PWA) di layar utama perangkat Anda." },
  { q: "Bagaimana dengan printer kasir?", a: "Aplikasi mendukung cetak struk menggunakan printer thermal bluetooth (ukuran 58mm atau 80mm) serta printer jaringan/USB. Anda juga bisa membagikan struk belanja digital langsung lewat WhatsApp tanpa kertas." },
  { q: "Bagaimana cara melakukan backup data?", a: "Anda bisa mengekspor database lokal kapan saja secara gratis dari menu Pengaturan (Backup & Restore), atau menggunakan fitur sinkronisasi otomatis Cloud Sync agar data terbackup aman secara real-time." }
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

  // Jangan render apapun saat akan redirect supaya tidak ada flash landing page
  if (isRedirecting.current) return null;

  const [billingMode, setBillingMode] = useState<'monthly' | 'annual' | 'lifetime'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fitur' | 'dashboard' | 'operasional'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(1); // FAQ 'Bisa tanpa internet?' dibuka secara default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Typewriter effect states
  const words = useMemo(() => ["Mudah & Cepat", "Secara Offline", "Lebih Praktis", "Aman & Akurat"], []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  // Pricing calculations
  const pricing = useMemo(() => {
    if (billingMode === 'monthly') {
      return {
        lite: { price: 'Rp 149.000', period: '/ bulan' },
        pro: { price: 'Rp 299.000', period: '/ bulan' },
        v1: { price: 'Rp 199.000', period: ' sekali bayar', isLifetime: true }
      };
    } else if (billingMode === 'annual') {
      return {
        lite: { price: 'Rp 1.490.000', period: '/ tahun', discount: 'Hemat Rp 298.000' },
        pro: { price: 'Rp 2.999.000', period: '/ tahun', discount: 'Hemat Rp 589.000' },
        v1: { price: 'Rp 199.000', period: ' sekali bayar', isLifetime: true }
      };
    } else {
      return {
        lite: { price: 'Rp 3.000.000', period: ' sekali bayar', isLifetime: true },
        pro: { price: 'Rp 6.000.000', period: ' sekali bayar', isLifetime: true },
        v1: { price: 'Rp 199.000', period: ' sekali bayar', isLifetime: true }
      };
    }
  }, [billingMode]);

  // Filtering add-ons
  const filteredAddOns = useMemo(() => {
    return ADD_ONS_DATA.filter(addon => {
      const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            addon.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || addon.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

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
            <button onClick={() => scrollToSection('addons')} className="hover:text-[#b92a1c] hover:underline underline-offset-4 transition-all">Add-ons</button>
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
              <button onClick={() => scrollToSection('addons')} className="text-left py-2 font-semibold hover:text-[#b92a1c]">Add-ons</button>
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
              Pilih Paket Sesuai Kebutuhan Bisnis Anda
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Tanpa biaya tersembunyi. Mulai gratis dan upgrade kapan pun usaha Anda berekspansi lebih besar.
            </p>

            {/* Billing Mode Switcher Tabs */}
            <div className="inline-flex p-1 rounded-full bg-[#6e150f]/5 border border-[#6e150f]/10 mt-4">
              <button 
                onClick={() => setBillingMode('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all relative ${
                  billingMode === 'monthly' ? 'text-[#F5EFE6]' : 'text-[#1A1A1A] hover:text-[#b92a1c]'
                }`}
              >
                {billingMode === 'monthly' && (
                  <motion.div layoutId="activeBillingMode" className="absolute inset-0 bg-[#6e150f] rounded-full z-0" />
                )}
                <span className="relative z-10">SaaS Bulanan</span>
              </button>
              <button 
                onClick={() => setBillingMode('annual')}
                className={`relative px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  billingMode === 'annual' ? 'text-[#F5EFE6]' : 'text-[#1A1A1A] hover:text-[#b92a1c]'
                }`}
              >
                {billingMode === 'annual' && (
                  <motion.div layoutId="activeBillingMode" className="absolute inset-0 bg-[#6e150f] rounded-full z-0" />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  SaaS Tahunan
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none transition-colors ${
                    billingMode === 'annual' ? 'bg-[#d0a139] text-[#1A1A1A]' : 'bg-[#6e150f]/10 text-[#6e150f]'
                  }`}>
                    Hemat!
                  </span>
                </span>
              </button>
              <button 
                onClick={() => setBillingMode('lifetime')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all relative ${
                  billingMode === 'lifetime' ? 'text-[#F5EFE6]' : 'text-[#1A1A1A] hover:text-[#b92a1c]'
                }`}
              >
                {billingMode === 'lifetime' && (
                  <motion.div layoutId="activeBillingMode" className="absolute inset-0 bg-[#6e150f] rounded-full z-0" />
                )}
                <span className="relative z-10">Beli Putus (Lifetime)</span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Paket UMKM Lite */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col rounded-3xl bg-white border border-[#6e150f]/10 p-8 shadow-xl shadow-[#6e150f]/5 relative overflow-hidden group"
            >
              <AnimatePresence>
                {billingMode === 'annual' && pricing.lite.discount && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-4 right-4 text-[10px] font-extrabold text-[#6e150f] bg-[#6e150f]/10 border border-[#6e150f]/20 px-2.5 py-1 rounded-full"
                  >
                    {pricing.lite.discount}
                  </motion.div>
                )}
              </AnimatePresence>
              <h3 className="text-xl font-extrabold text-[#6e150f] mb-1">UMKM Lite</h3>
              <p className="text-xs text-muted-foreground mb-6">Cocok untuk gerobak, booth, and 1 operator kasir.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">{pricing.lite.price}</span>
                <span className="text-xs text-muted-foreground font-semibold ml-1">{pricing.lite.period}</span>
              </div>

              <ul className="space-y-4 mb-8 text-sm flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Maksimal 1 Cabang/Outlet</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Maksimal 1 User/Kasir</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Hingga 50 Menu Makanan &amp; Foto</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Metode Tunai + QRIS Statis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Berjalan 100% Offline Mode</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Laporan Harian via Browser</span>
                </li>
                <li className="flex items-start gap-2.5 opacity-40">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="line-through">Tidak mendukung Export PDF/Excel</span>
                </li>
                <li className="flex items-start gap-2.5 opacity-40">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="line-through">Tanpa Menu Modifiers (Topping/Level)</span>
                </li>
              </ul>

              <Link 
                to="/dashboard" 
                className="w-full inline-flex items-center justify-center rounded-xl font-bold h-11 border-2 border-[#6e150f]/20 text-[#6e150f] hover:border-[#6e150f] hover:bg-[#6e150f]/5 transition-all text-center"
              >
                Mulai Trial 30 Hari
              </Link>
            </motion.div>

            {/* Paket UMKM Pro */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col rounded-3xl bg-white border-2 border-[#6e150f] p-8 shadow-xl shadow-[#6e150f]/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 bg-[#d0a139] text-[#1A1A1A] font-extrabold text-[9px] uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-sm">
                Terpopuler
              </div>
              <AnimatePresence>
                {billingMode === 'annual' && pricing.pro.discount && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-4 right-16 text-[10px] font-extrabold text-[#6e150f] bg-[#6e150f]/10 border border-[#6e150f]/20 px-2.5 py-1 rounded-full"
                  >
                    {pricing.pro.discount}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <h3 className="text-xl font-extrabold text-[#6e150f] mb-1 flex items-center gap-1.5">
                UMKM Pro <Sparkles className="w-4 h-4 text-[#d0a139]" />
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Untuk kafe kecil, resto mini, warung + multi-karyawan.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">{pricing.pro.price}</span>
                <span className="text-xs text-muted-foreground font-semibold ml-1">{pricing.pro.period}</span>
              </div>

              <ul className="space-y-4 mb-8 text-sm flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-[#1A1A1A]">Maksimal 1 Cabang/Outlet</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Hingga 5 Akun User (Owner + Kasir)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Menu Makanan Tidak Terbatas + Foto</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Input Order &amp; Split Bills</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Menu Modifier &amp; Custom Toppings</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Diskon Khusus Default Produk</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Export Laporan ke PDF &amp; Excel</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-emerald-700">Backup Cloud Otomatis (Cloud Sync)</span>
                </li>
              </ul>

              <Link 
                to="/dashboard" 
                className="w-full inline-flex items-center justify-center rounded-xl font-bold h-11 bg-gradient-to-r from-[#6e150f] to-[#b92a1c] text-[#F5EFE6] hover:shadow-lg hover:shadow-[#6e150f]/20 transition-all text-center"
              >
                Mulai Trial Pro 30 Hari
              </Link>
            </motion.div>

            {/* Paket Inspira POS v1 (Offline-First) */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col rounded-3xl bg-white border border-[#d0a139]/40 p-8 shadow-xl shadow-[#d0a139]/5 relative overflow-hidden group hover:border-[#d0a139] transition-all"
            >
              <div className="absolute top-0 right-0 bg-[#d0a139] text-[#1A1A1A] font-extrabold text-[9px] uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-sm">
                Beli Putus
              </div>
              
              <h3 className="text-xl font-extrabold text-[#6e150f] mb-1 flex items-center gap-1.5">
                Inspira POS
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Sistem kasir offline-first lengkap sekali bayar, selamanya.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">{pricing.v1.price}</span>
                <span className="text-xs text-muted-foreground font-semibold ml-1">{pricing.v1.period}</span>
              </div>

              <ul className="space-y-4 mb-8 text-sm flex-1">
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-emerald-700">Lisensi Aktif Offline Selamanya</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Kapasitas Produk &amp; Transaksi Tanpa Batas</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Multi-User (Owner + Staff/Kasir) via PIN</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Cetak Struk Thermal (Bluetooth/USB)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Manajemen Stok Barang &amp; Supplier</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Pencatatan Utang Pelanggan &amp; Cicilan</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Pencatatan Pengeluaran Toko</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Custom Modifier &amp; Diskon Produk</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Ekspor Laporan Harian ke PDF &amp; Excel</span>
                </li>
              </ul>

              <Link 
                to="/dashboard" 
                className="w-full inline-flex items-center justify-center rounded-xl font-bold h-11 border-2 border-[#d0a139] text-[#1A1A1A] hover:bg-[#d0a139]/5 transition-all text-center animate-pulse"
              >
                Coba Demo Gratis
              </Link>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 max-w-md mx-auto p-4 rounded-xl bg-white/40 border border-[#6e150f]/5"
          >
            <div className="flex items-center gap-1.5 font-semibold text-[#6e150f]">
              <Info className="w-3.5 h-3.5" /> Biaya Setup &amp; Lisensi
            </div>
            <p>
              Tingkatkan kapabilitas kasir Anda dengan membeli Add-ons modul kapan pun diperlukan secara fleksibel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Add-ons Section (Interactive Grid with search and category filter) */}
      <section id="addons" className="py-20 bg-white border-y border-[#6e150f]/5">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12 space-y-3"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-[#6e150f]">
              Modul Tambahan (Add-ons) Fleksibel
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Hanya bayar fitur yang Anda butuhkan. Sesuaikan aplikasi POS agar pas dengan alur operasional bisnis Anda.
            </p>
          </motion.div>

          {/* Search bar and Category filter tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-[#6e150f]/10">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'fitur', 'dashboard', 'operasional'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all relative ${
                    selectedCategory === cat
                      ? 'text-[#F5EFE6]'
                      : 'text-[#1A1A1A] hover:text-[#b92a1c]'
                  }`}
                >
                  {selectedCategory === cat && (
                    <motion.div layoutId="activeAddonTab" className="absolute inset-0 bg-[#6e150f] rounded-lg z-0" />
                  )}
                  <span className="relative z-10">
                    {cat === 'all' ? 'Semua Modul' : cat}
                  </span>
                </button>
              ))}
            </div>

            {/* Search inputs */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari modul tambahan..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#F5EFE6]/50 border border-[#6e150f]/10 focus:outline-none focus:ring-2 focus:ring-[#6e150f]/20 focus:border-[#6e150f] transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
              )}
            </div>
          </div>

          {/* Add-ons list grid - animated dynamically */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAddOns.length > 0 ? (
                filteredAddOns.map((addon) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    key={addon.id}
                    className="flex flex-col p-6 rounded-2xl bg-[#F5EFE6]/30 border border-[#6e150f]/5 hover:border-[#6e150f]/20 hover:bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#d0a139] uppercase tracking-wider bg-[#d0a139]/10 px-2 py-0.5 rounded-full">
                        {addon.category}
                      </span>
                      <span className="text-xs font-bold text-[#6e150f] bg-[#6e150f]/10 px-2.5 py-1 rounded-lg">
                        {addon.price}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#1A1A1A] mb-1.5">{addon.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                      {addon.desc}
                    </p>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2"
                >
                  <Search className="w-8 h-8 text-[#6e150f]/20" />
                  <p className="text-sm font-semibold">Modul tidak ditemukan</p>
                  <p className="text-xs">Coba cari dengan kata kunci lain atau bersihkan filter.</p>
                </motion.div>
              )}
            </AnimatePresence>
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
              <li><button onClick={() => scrollToSection('addons')} className="hover:text-white transition-colors">Modul Add-ons</button></li>
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
