import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, Users, KeyRound, LogOut, Search, Plus, Trash2, ShieldAlert, Award, Calendar, Phone, MapPin, RefreshCw, Key, Copy, Check, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

interface Client {
  id: string;
  store_name: string;
  address: string | null;
  phone: string | null;
  device_id: string;
  license_status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  trial_started_at: string;
  license_key: string | null;
  created_at: string;
  plan_tier?: 'LITE' | 'PRO';
}

interface Admin {
  id: string;
  username: string;
  name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ipos_admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState(() => localStorage.getItem('ipos_admin_name') || 'Admin');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [adminsList, setAdminsList] = useState<Admin[]>([]);
  const [activeTab, setActiveTab] = useState<'clients' | 'admins'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [loading, setLoading] = useState(false);

  // License result modal
  const [generatedKey, setGeneratedKey] = useState('');
  const [generatedStoreName, setGeneratedStoreName] = useState('');
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // Confirmation modals state
  const [genConfirmOpen, setGenConfirmOpen] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<'LITE' | 'PRO'>('LITE');
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);
  const [delClientConfirmOpen, setDelClientConfirmOpen] = useState(false);
  const [pendingDeleteClientId, setPendingDeleteClientId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isAdminDarkMode, setIsAdminDarkMode] = useState(() => {
    const saved = localStorage.getItem('ipos_admin_theme_mode');
    if (saved) return saved === 'dark';
    return true; // default is dark
  });

  useEffect(() => {
    if (isAdminDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ipos_admin_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ipos_admin_theme_mode', 'light');
    }
  }, [isAdminDarkMode]);

  // New admin modal
  const [newAdminOpen, setNewAdminOpen] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login gagal.');
        return;
      }
      localStorage.setItem('ipos_admin_token', data.token);
      localStorage.setItem('ipos_admin_name', data.admin.name);
      setToken(data.token);
      setAdminName(data.admin.name);
      toast.success(`Selamat datang, ${data.admin.name}!`);
    } catch {
      toast.error('Gagal terhubung ke backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('ipos_admin_token');
    localStorage.removeItem('ipos_admin_name');
    setToken(null);
    setClients([]);
    setAdminsList([]);
    toast.success('Berhasil logout.');
  };

  // Fetch Clients
  const fetchClients = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengambil data klien.');
        return;
      }
      setClients(data);
    } catch {
      toast.error('Gagal mengambil data klien dari backend.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Admins List
  const fetchAdmins = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAdminsList(data);
      }
    } catch {
      toast.error('Gagal mengambil data admin.');
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success('Kode lisensi berhasil disalin.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger Generate License confirmation modal
  const triggerGenerateLicense = (clientId: string, currentTier?: 'LITE' | 'PRO') => {
    setPendingClientId(clientId);
    setSelectedPlanTier(currentTier || 'LITE');
    setGenConfirmOpen(true);
  };

  // Generate License
  const handleGenerateLicense = async () => {
    if (!token || !pendingClientId) return;
    const clientId = pendingClientId;
    setGenConfirmOpen(false);
    setPendingClientId(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/clients/generate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId, planTier: selectedPlanTier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menerbitkan lisensi.');
        return;
      }
      setGeneratedKey(data.licenseKey);
      setGeneratedStoreName(data.storeName);
      setKeyModalOpen(true);
      toast.success('Lisensi berhasil diterbitkan!');
      fetchClients();
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // Create Admin User
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword || !newAdminName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newAdminUsername,
          password: newAdminPassword,
          name: newAdminName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menambahkan admin baru.');
        return;
      }
      toast.success('Admin baru berhasil ditambahkan.');
      setNewAdminOpen(false);
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewAdminName('');
      fetchAdmins();
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // Trigger Delete Admin confirmation modal
  const triggerDeleteAdmin = (id: string) => {
    setPendingAdminId(id);
    setDelConfirmOpen(true);
  };

  // Delete Admin
  const handleDeleteAdmin = async () => {
    if (!token || !pendingAdminId) return;
    const id = pendingAdminId;
    setDelConfirmOpen(false);
    setPendingAdminId(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus admin.');
        return;
      }
      toast.success('Admin berhasil dihapus.');
      fetchAdmins();
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // Trigger Delete Client confirmation modal
  const triggerDeleteClient = (id: string) => {
    setPendingDeleteClientId(id);
    setDelClientConfirmOpen(true);
  };

  // Delete Client
  const handleDeleteClient = async () => {
    if (!token || !pendingDeleteClientId) return;
    const id = pendingDeleteClientId;
    setDelClientConfirmOpen(false);
    setPendingDeleteClientId(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus klien.');
        return;
      }
      toast.success('Toko berhasil dihapus secara permanen.');
      fetchClients();
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // Deactivate Client (soft delete / non-aktifkan)
  const handleDeactivateClient = async () => {
    if (!token || !pendingDeleteClientId) return;
    const id = pendingDeleteClientId;
    setDelClientConfirmOpen(false);
    setPendingDeleteClientId(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/clients/${id}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menonaktifkan klien.');
        return;
      }
      toast.success('Toko berhasil dinonaktifkan.');
      fetchClients();
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    }
  };

  // Fetch data on login
  useEffect(() => {
    if (token) {
      fetchClients();
      fetchAdmins();
    }
  }, [token]);

  // Compute stats
  const stats = useMemo(() => {
    if (!clients) return { trial: 0, active: 0, expired: 0, revoked: 0 };
    return {
      trial: clients.filter(c => c.license_status === 'TRIAL').length,
      active: clients.filter(c => c.license_status === 'ACTIVE').length,
      expired: clients.filter(c => c.license_status === 'EXPIRED').length,
      revoked: clients.filter(c => c.license_status === 'REVOKED').length,
    };
  }, [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.phone && c.phone.includes(searchQuery));
      const matchesStatus = filterStatus === 'ALL' || c.license_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, filterStatus]);

  const pendingClient = useMemo(() => {
    return clients.find(c => c.id === pendingClientId);
  }, [clients, pendingClientId]);

  const isCurrentlyActive = pendingClient?.license_status === 'ACTIVE';

  if (!token) {
    // Render Login Screen
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center px-4 relative transition-colors duration-200">
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
            className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isAdminDarkMode ? "Mode Terang" : "Mode Gelap"}
          >
            {isAdminDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>
        </div>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <img src="/inspirapos-icon.jpeg" alt="Inspira POS" className="w-16 h-16 object-contain rounded-2xl mx-auto" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-4">Inspira POS Admin Portal</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Dashboard Pengelolaan Lisensi & Klien Kasir</p>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-xl shadow-xl text-slate-900 dark:text-white">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 text-left block">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-left block">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2">
                  {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render Main Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <img src="/inspirapos-icon.jpeg" alt="Inspira POS" className="w-12 h-12 object-contain rounded-xl" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Inspira POS Admin Panel</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Masuk sebagai: <span className="text-amber-500 font-semibold">{adminName}</span></p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
              className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={isAdminDarkMode ? "Mode Terang" : "Mode Gelap"}
            >
              {isAdminDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchClients} className="h-9 gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="sm" className="h-9 gap-1.5 font-bold">
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-slate-200 dark:border-0 bg-white dark:bg-slate-900/50 shadow-md">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Klien Trial</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{stats.trial}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-0 bg-white dark:bg-slate-900/50 shadow-md">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Klien Aktif</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-0 bg-white dark:bg-slate-900/50 shadow-md">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Lisensi Habis</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">{stats.expired}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-0 bg-white dark:bg-slate-900/50 shadow-md">
            <CardContent className="p-4">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Non-aktif</p>
              <p className="text-2xl font-bold text-slate-500 mt-1">{stats.revoked}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('clients')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === 'clients' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Daftar Klien Kasir
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === 'admins' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Kelola Akun Admin
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'clients' ? (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Cari berdasarkan nama toko, device ID, atau telepon..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {(['ALL', 'TRIAL', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map(st => (
                  <Button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    size="sm"
                    variant={filterStatus === st ? 'default' : 'outline'}
                    className={`h-10 text-xs px-3 font-semibold ${filterStatus === st ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {st === 'ALL' ? 'Semua' : st === 'TRIAL' ? 'Trial' : st === 'ACTIVE' ? 'Aktif' : st === 'EXPIRED' ? 'Habis' : 'Non-aktif'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Clients Table */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Toko & Device ID</th>
                      <th className="p-3 font-semibold">Telepon & Alamat</th>
                      <th className="p-3 font-semibold">Daftar Pada</th>
                      <th className="p-3 font-semibold text-center">Tier</th>
                      <th className="p-3 font-semibold text-center">Status</th>
                      <th className="p-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500">Tidak ada data klien ditemukan.</td>
                      </tr>
                    ) : (
                      filteredClients.map(c => {
                        const registerDate = new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/25 transition-colors">
                            <td className="p-3">
                              <p className="font-bold text-slate-900 dark:text-white">{c.store_name}</p>
                              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 break-all">ID: {c.device_id}</p>
                            </td>
                            <td className="p-3">
                              <p className="text-xs text-slate-700 dark:text-slate-300">{c.phone || '-'}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{c.address || '-'}</p>
                            </td>
                            <td className="p-3 text-xs text-slate-700 dark:text-slate-300">{registerDate}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.plan_tier === 'PRO'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                              }`}>
                                {c.plan_tier || 'LITE'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                c.license_status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : c.license_status === 'EXPIRED'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : c.license_status === 'REVOKED'
                                  ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}>
                                {c.license_status}
                              </span>
                            </td>
                            <td className="p-3 text-right flex items-center justify-end gap-1.5">
                              {c.license_status !== 'ACTIVE' ? (
                                <Button
                                  size="sm"
                                  onClick={() => triggerGenerateLicense(c.id, c.plan_tier)}
                                  className="h-8 bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1 text-xs"
                                >
                                  <Key className="w-3.5 h-3.5" /> Aktivasi
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 px-2 py-1 rounded">
                                    {c.license_key}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => triggerGenerateLicense(c.id, c.plan_tier)}
                                    className="h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 text-xs font-semibold"
                                    title="Ubah Tier / Regenerasi Lisensi"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Ubah</span>
                                  </Button>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => triggerDeleteClient(c.id)}
                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
                                title="Hapus Toko"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          /* Admins List tab */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pengelola Lisensi Resmi</h2>
              <Button size="sm" onClick={() => setNewAdminOpen(true)} className="h-9 bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5">
                <Plus className="w-4 h-4" /> Admin Baru
              </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Nama Admin</th>
                    <th className="p-3 font-semibold">Username</th>
                    <th className="p-3 font-semibold">Dibuat Pada</th>
                    <th className="p-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminsList.map(ad => (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/25 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{ad.name}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">@{ad.username}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{new Date(ad.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => triggerDeleteAdmin(ad.id)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* Generated License Result Modal */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Award className="w-5 h-5 text-amber-500" /> Lisensi Berhasil Diterbitkan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3 text-center">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nama Toko Klien</p>
              <p className="text-base font-bold text-slate-900 dark:text-white">{generatedStoreName}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 relative overflow-hidden">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Kode Lisensi Kasir (Offline)</p>
                <p className="text-xl font-mono font-extrabold text-amber-500 tracking-wider select-all mt-1">{generatedKey}</p>
              </div>
              <Button
                size="sm"
                onClick={handleCopyKey}
                className={`h-8 w-full font-bold gap-1.5 text-xs transition-colors ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin Kode Lisensi
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Kirimkan kode lisensi di atas ke klien. Klien dapat menyalin dan menempel kode tersebut pada menu Aktivasi di kasir offline mereka.
            </p>
            <Button onClick={() => setKeyModalOpen(false)} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold">
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Admin Modal */}
      <Dialog open={newAdminOpen} onOpenChange={setNewAdminOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Tambah Akun Admin Pengelola</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4 pt-3">
            <div className="space-y-1.5 text-left">
              <Label className="text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
              <Input
                value={newAdminName}
                onChange={e => setNewAdminName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-slate-700 dark:text-slate-300">Username</Label>
              <Input
                value={newAdminUsername}
                onChange={e => setNewAdminUsername(e.target.value)}
                placeholder="Masukkan username admin"
                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <Label className="text-slate-700 dark:text-slate-300">Password</Label>
              <Input
                type="password"
                value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                placeholder="Masukkan password admin"
                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setNewAdminOpen(false)} className="flex-1 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Batal
              </Button>
              <Button type="submit" className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold">
                Simpan Admin
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Aktivasi License Confirmation Modal */}
      <Dialog open={genConfirmOpen} onOpenChange={setGenConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              {isCurrentlyActive ? 'Ubah Tier / Regenerasi Lisensi' : 'Konfirmasi Aktivasi Toko'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-left">
              {isCurrentlyActive 
                ? `Apakah Anda yakin ingin mengubah paket (tier) atau menerbitkan ulang kode lisensi untuk toko "${pendingClient?.store_name || ''}"? Klien harus memasukkan kode lisensi yang baru diterbitkan di aplikasi kasir offline mereka.`
                : 'Apakah Anda yakin ingin memproses kode lisensi aktif permanen untuk toko ini? Klien akan langsung teraktivasi secara otomatis.'}
            </p>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="planTierSelect" className="text-slate-700 dark:text-slate-300 text-xs font-semibold">Pilih Paket (Plan Tier)</Label>
              <select
                id="planTierSelect"
                value={selectedPlanTier}
                onChange={(e) => setSelectedPlanTier(e.target.value as 'LITE' | 'PRO')}
                className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-md focus:border-amber-500 focus:ring-amber-500 text-sm focus:outline-none"
              >
                <option value="LITE">Lite (Rp 299.000)</option>
                <option value="PRO">Pro (Rp 499.000)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGenConfirmOpen(false)} className="flex-1 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Batal
              </Button>
              <Button onClick={handleGenerateLicense} className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold">
                {isCurrentlyActive ? 'Simpan & Terbitkan' : 'Ya, Aktivasi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Modal */}
      <Dialog open={delConfirmOpen} onOpenChange={setDelConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Konfirmasi Hapus Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-left">
              Apakah Anda yakin ingin menghapus pengelola admin ini? Akun ini tidak akan bisa login ke dashboard admin lagi.
            </p>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDelConfirmOpen(false)} className="flex-1 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Batal
              </Button>
              <Button onClick={handleDeleteAdmin} className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Ya, Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Modal */}
      <Dialog open={delClientConfirmOpen} onOpenChange={setDelClientConfirmOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Kelola Status &amp; Penghapusan Toko
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3 text-left">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Silakan pilih tindakan untuk toko ini. Anda dapat menonaktifkan lisensi sementara (data tidak hilang) atau menghapus seluruh data secara permanen.
            </p>
            
            <div className="space-y-3 pt-2">
              {/* Opsi 1: Non-aktifkan */}
              <button 
                type="button"
                onClick={handleDeactivateClient}
                className="w-full p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 active:bg-amber-500/15 cursor-pointer text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Non-aktifkan Toko (Soft Delete)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Mengunci akses kasir klien secara instan, namun data toko dan histori lisensi tetap tersimpan utuh di database pusat.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opsi 2: Hapus Permanen */}
              <button 
                type="button"
                onClick={handleDeleteClient}
                className="w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 active:bg-rose-500/15 cursor-pointer text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Hapus Toko Permanen</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Menghapus seluruh data toko beserta log lisensi dari server selamanya. Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setDelClientConfirmOpen(false)} className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
