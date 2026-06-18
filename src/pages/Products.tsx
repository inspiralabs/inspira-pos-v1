import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type Product, type Category, type ProductOptionGroup, type ProductOption } from '@/lib/db';
import { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package as PackageIcon, Camera, X, Copy, Infinity as InfinityIcon, ScanLine, ListPlus, Percent, Tag, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useTranslation } from 'react-i18next';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

// ─── Sub-menu Manager Component ─────────────────────────────────────────────

interface OptionManagerProps {
  productId: number;
  productName: string;
  open: boolean;
  onClose: () => void;
  rp: (n: number) => string;
}

function SubMenuManager({ productId, productName, open, onClose, rp }: OptionManagerProps) {
  const groups = useLiveQuery(
    () => db.productOptionGroups
      .where('productId').equals(productId)
      .filter(g => g.isDeleted === 0)
      .toArray()
      .then(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder)),
    [productId]
  );

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMulti, setNewGroupMulti] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const maxOrder = groups?.length ? Math.max(...groups.map(g => g.sortOrder)) + 1 : 0;
    await db.productOptionGroups.add({
      productId,
      name: newGroupName.trim(),
      isRequired: newGroupRequired ? 1 : 0,
      isMultiSelect: newGroupMulti ? 1 : 0,
      sortOrder: maxOrder,
      createdAt: new Date(),
      isDeleted: 0,
      deletedAt: null,
    });
    setNewGroupName('');
    setNewGroupRequired(false);
    setNewGroupMulti(false);
    setAddingGroup(false);
    toast.success('Grup sub-menu ditambahkan');
  };

  const handleDeleteGroup = async (groupId: number) => {
    await db.productOptionGroups.update(groupId, { isDeleted: 1, deletedAt: new Date() });
    await db.productOptions.where('groupId').equals(groupId).modify({ isDeleted: 1, deletedAt: new Date() });
    setDeleteGroupId(null);
    toast.success('Grup dihapus');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListPlus className="w-4 h-4 text-primary" />
            Sub-Menu: {productName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          Kelola opsi tambahan seperti topping, level pedas, ukuran, dll.
        </p>

        <div className="space-y-3 mt-2">
          {(!groups || groups.length === 0) && !addingGroup && (
            <div className="text-center py-8 text-muted-foreground">
              <ListPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada sub-menu</p>
              <p className="text-xs mt-1">Tambah grup opsi seperti Topping, Level Pedas, dll.</p>
            </div>
          )}

          {groups?.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              expanded={expandedGroupId === group.id}
              onToggle={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id!)}
              onDelete={() => setDeleteGroupId(group.id!)}
              rp={rp}
            />
          ))}

          {addingGroup ? (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">Grup Baru</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Grup *</Label>
                <Input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Contoh: Topping, Level Pedas, Ukuran"
                  className="h-10"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={newGroupRequired} onCheckedChange={setNewGroupRequired} />
                  <span className="text-xs">Wajib dipilih</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={newGroupMulti} onCheckedChange={setNewGroupMulti} />
                  <span className="text-xs">Bisa pilih banyak</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                  Simpan Grup
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingGroup(false); setNewGroupName(''); }}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setAddingGroup(true)}>
              <Plus className="w-4 h-4" />
              Tambah Grup Sub-Menu
            </Button>
          )}
        </div>

        <Button className="w-full mt-2" onClick={onClose}>Selesai</Button>
      </DialogContent>

      {/* Delete Group Confirmation */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Grup Sub-Menu?</AlertDialogTitle>
            <AlertDialogDescription>Semua opsi dalam grup ini juga akan dihapus. Transaksi lama tidak terpengaruh.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroupId && handleDeleteGroup(deleteGroupId)} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

interface GroupCardProps {
  group: ProductOptionGroup;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  rp: (n: number) => string;
}

function GroupCard({ group, expanded, onToggle, onDelete, rp }: GroupCardProps) {
  const options = useLiveQuery(
    () => db.productOptions
      .where('groupId').equals(group.id!)
      .filter(o => o.isDeleted === 0)
      .toArray()
      .then(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder)),
    [group.id]
  );

  const [addingOption, setAddingOption] = useState(false);
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState('');
  const [deleteOptId, setDeleteOptId] = useState<number | null>(null);

  const handleAddOption = async () => {
    if (!newOptName.trim()) return;
    const maxOrder = options?.length ? Math.max(...options.map(o => o.sortOrder)) + 1 : 0;
    await db.productOptions.add({
      groupId: group.id!,
      name: newOptName.trim(),
      additionalPrice: Number(newOptPrice) || 0,
      sortOrder: maxOrder,
      createdAt: new Date(),
      isDeleted: 0,
      deletedAt: null,
    });
    setNewOptName('');
    setNewOptPrice('');
    setAddingOption(false);
    toast.success(`Opsi "${newOptName}" ditambahkan`);
  };

  const handleDeleteOption = async (optId: number) => {
    await db.productOptions.update(optId, { isDeleted: 1, deletedAt: new Date() });
    setDeleteOptId(null);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 p-3 bg-muted/40 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{group.name}</p>
            {group.isRequired === 1 && <Badge variant="destructive" className="text-[9px] h-4 px-1">Wajib</Badge>}
            {group.isMultiSelect === 1 && <Badge variant="outline" className="text-[9px] h-4 px-1">Multi</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground">{options?.length ?? 0} opsi</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Options list */}
      {expanded && (
        <div className="p-3 space-y-2 border-t border-border">
          {options?.length === 0 && !addingOption && (
            <p className="text-xs text-muted-foreground text-center py-2">Belum ada opsi. Tambahkan opsi di bawah.</p>
          )}
          {options?.map(opt => (
            <div key={opt.id} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{opt.name}</p>
                {opt.additionalPrice > 0 && (
                  <p className="text-[10px] text-primary">+{rp(opt.additionalPrice)}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => setDeleteOptId(opt.id!)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {addingOption ? (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Nama Opsi *</Label>
                  <Input value={newOptName} onChange={e => setNewOptName(e.target.value)} placeholder="Sosis, Level 1..." className="h-9 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddOption()} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Harga Tambahan (opsional)</Label>
                  <Input type="number" value={newOptPrice} onChange={e => setNewOptPrice(e.target.value)} placeholder="0" className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={handleAddOption} disabled={!newOptName.trim()}>Simpan</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingOption(false); setNewOptName(''); setNewOptPrice(''); }}>Batal</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => setAddingOption(true)}>
              <Plus className="w-3 h-3" /> Tambah Opsi
            </Button>
          )}
        </div>
      )}

      {/* Delete option confirmation */}
      <AlertDialog open={!!deleteOptId} onOpenChange={() => setDeleteOptId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus opsi ini?</AlertDialogTitle>
            <AlertDialogDescription>Opsi ini akan dihapus dari sub-menu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteOptId && handleDeleteOption(deleteOptId)} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Products Page ───────────────────────────────────────────────────────

export default function Produk() {
  const { currentUser, can } = useAuth();
  const canManage = can('manage_products');
  const { t, i18n } = useTranslation('products');
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [subMenuProduct, setSubMenuProduct] = useState<Product | null>(null);
  // Field tujuan hasil scan kamera: SKU atau Barcode.
  const [scanTarget, setScanTarget] = useState<'sku' | 'barcode' | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [hpp, setHpp] = useState('');
  const [stock, setStock] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [unit, setUnit] = useState('pcs');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  // Diskon default
  const [defaultDiscountType, setDefaultDiscountType] = useState<'percentage' | 'nominal' | null>(null);
  const [defaultDiscountValue, setDefaultDiscountValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());

  // Compose dropdown options: active master units + current product's unit if it has been deleted/renamed
  const unitOptions = (() => {
    const names = (units ?? []).map(u => u.name);
    if (unit && !names.includes(unit)) names.push(unit);
    return names;
  })();

  const filtered = products?.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false);
    const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
    return matchSearch && matchCategory;
  }) ?? [];

  const getCategoryName = (catId: number) => categories?.find(c => c.id === catId)?.name ?? '-';
  const getCategoryColor = (catId: number) => categories?.find(c => c.id === catId)?.color ?? '#999';

  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const resetForm = () => {
    setName(''); setSku(''); setPrice(''); setHpp(''); setStock('');
    setTrackStock(true); setUnit('pcs'); setBarcode(''); setDescription(''); setPhoto(undefined);
    setDefaultDiscountType(null); setDefaultDiscountValue('');
  };

  const openAdd = () => {
    if (!categories || categories.length === 0) {
      toast.error(t('toast.noCategory'));
      return;
    }
    setEditProduct(null);
    setCategoryId(categories[0]?.id?.toString() ?? '');
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setName(p.name); setSku(p.sku); setCategoryId(p.categoryId.toString()); setPrice(p.price.toString()); setHpp(p.hpp.toString()); setStock(p.stock.toString()); setTrackStock(isStockManaged(p)); setUnit(p.unit); setBarcode(p.barcode ?? ''); setDescription(p.description ?? ''); setPhoto(p.photo);
    setDefaultDiscountType(p.defaultDiscountType ?? null);
    setDefaultDiscountValue(p.defaultDiscountValue ? String(p.defaultDiscountValue) : '');
    setDialogOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidImage'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      toast.error(t('toast.processImageFailed'));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (openSubMenuAfterSave = false) => {
    if (!name.trim() || !categoryId || !sku.trim()) return;

    // Check SKU uniqueness
    const existing = await db.products
      .where('sku')
      .equals(sku.trim())
      .filter(p => p.isDeleted === 0)
      .first();
    if (existing && existing.id !== editProduct?.id) {
      toast.error(t('toast.skuExists', { sku: sku.trim(), name: existing.name }));
      return;
    }

    // Validasi diskon default
    const discVal = Number(defaultDiscountValue) || 0;
    const discType = discVal > 0 ? defaultDiscountType : null;
    const discValue = discType ? discVal : 0;

    const data = {
      name: name.trim(),
      sku: sku.trim(),
      categoryId: Number(categoryId),
      price: Number(price) || 0,
      hpp: Number(hpp) || 0,
      stock: Number(stock) || 0,
      trackStock,
      unit: unit.trim() || 'pcs',
      description: description.trim() || undefined,
      barcode: barcode.trim() || undefined,
      photo: photo || undefined,
      defaultDiscountType: discType,
      defaultDiscountValue: discValue || undefined,
      updatedAt: new Date(),
      updatedBy: currentUser?.id,
    };

    let savedProduct: Product | null = null;

    if (editProduct?.id) {
      await db.products.update(editProduct.id, data);
      trackEvent('edit_product');
      savedProduct = { ...editProduct, ...data };
    } else {
      const newId = await db.products.add({
        ...data,
        createdAt: new Date(),
        createdBy: currentUser?.id,
        isDeleted: 0,
        deletedAt: null,
      } as Product);
      trackEvent('create_product');
      savedProduct = { ...data, id: newId as number, createdAt: new Date(), isDeleted: 0, deletedAt: null };
    }

    setDialogOpen(false);

    if (openSubMenuAfterSave && savedProduct) {
      setSubMenuProduct(savedProduct);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.products.update(deleteId, {
        isDeleted: 1,
        deletedAt: new Date(),
        updatedBy: currentUser?.id,
      });
      setDeleteId(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PackageIcon className="w-5 h-5 text-primary" />
          {t('title')}
        </h1>
        {canManage && (
          <Button size="sm" onClick={openAdd} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" />
            {t('addButton')}
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[120px] h-10">
            <SelectValue placeholder={t('filterCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={c.id!.toString()}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product count */}
      <p className="text-xs text-muted-foreground">{t('productCount', { count: filtered.length })}</p>

      {/* Product List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <PackageIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t('empty.title')}</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> {t('empty.addButton')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Product thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <PackageIcon className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: getCategoryColor(p.categoryId), color: getCategoryColor(p.categoryId) }}>
                        {getCategoryName(p.categoryId)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('card.sku')}: {p.sku || '-'}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-sm font-bold text-primary">{rp(p.price)}</span>
                      {p.defaultDiscountType && p.defaultDiscountValue ? (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <Percent className="w-2.5 h-2.5" />
                          Diskon {p.defaultDiscountType === 'percentage' ? `${p.defaultDiscountValue}%` : rp(p.defaultDiscountValue)}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{t('card.hpp')}: {rp(p.hpp)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {isStockManaged(p) ? (
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', p.stock <= 5 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                          {t('card.stock')}: {p.stock} {p.unit}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                          <InfinityIcon className="w-3 h-3" />
                          {t('card.stockUnmanaged')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {canManage ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Kelola Sub-Menu"
                          onClick={(e) => { e.stopPropagation(); setSubMenuProduct(p); }}
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id!)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? t('dialog.titleEdit') : t('dialog.titleAdd')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Photo picker */}
            <div className="space-y-1.5">
              <Label>{t('dialog.photoLabel')}</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photo ? (
                    <img src={photo} alt={t('dialog.photoPreviewAlt')} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photo ? t('dialog.photoChange') : t('dialog.photoSelect')}
                  </Button>
                  {photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive gap-1.5"
                      onClick={() => setPhoto(undefined)}
                    >
                      <X className="w-3.5 h-3.5" />
                      {t('dialog.photoRemove')}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('dialog.nameLabel')} *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('dialog.namePlaceholder')} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('dialog.skuLabel')} *</Label>
              <div className="flex gap-2">
                <Input value={sku} onChange={e => setSku(e.target.value)} placeholder={t('dialog.skuPlaceholder')} className="h-11 flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title={t('dialog.scanCamera')}
                  onClick={() => setScanTarget('sku')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dialog.categoryLabel')} *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t('dialog.categoryPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {(categories && categories.length > 0) ? categories.map(c => (
                    <SelectItem key={c.id} value={c.id!.toString()}>{c.icon} {c.name}</SelectItem>
                  )) : (
                    <SelectItem value="__empty" disabled>{t('dialog.categoryEmpty')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('dialog.priceLabel')} *</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('dialog.pricePlaceholder')} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.hppLabel')}</Label>
                <Input type="number" value={hpp} onChange={e => setHpp(e.target.value)} placeholder={t('dialog.hppPlaceholder')} className="h-11" />
              </div>
            </div>

            {/* ── Diskon Default Produk ── */}
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Diskon Default</p>
                <p className="text-[10px] text-muted-foreground ml-auto">Opsional</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug -mt-1">
                Diskon ini akan otomatis ter-apply saat produk ditambahkan ke keranjang kasir.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipe Diskon</Label>
                  <Select
                    value={defaultDiscountType ?? 'none'}
                    onValueChange={v => {
                      setDefaultDiscountType(v === 'none' ? null : v as 'percentage' | 'nominal');
                      if (v === 'none') setDefaultDiscountValue('');
                    }}
                  >
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada diskon</SelectItem>
                      <SelectItem value="percentage">Persen (%)</SelectItem>
                      <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Nilai {defaultDiscountType === 'percentage' ? '(%)' : defaultDiscountType === 'nominal' ? '(Rp)' : ''}
                  </Label>
                  <Input
                    type="number"
                    value={defaultDiscountValue}
                    onChange={e => setDefaultDiscountValue(e.target.value)}
                    placeholder={defaultDiscountType === 'percentage' ? '0–100' : '0'}
                    className="h-10"
                    disabled={!defaultDiscountType}
                  />
                </div>
              </div>
              {defaultDiscountType && Number(defaultDiscountValue) > 0 && (
                <p className="text-[11px] text-primary">
                  Preview diskon: {defaultDiscountType === 'percentage'
                    ? `${defaultDiscountValue}% = Rp ${((Number(price) || 0) * Number(defaultDiscountValue) / 100).toLocaleString('id-ID')}`
                    : `Rp ${Number(defaultDiscountValue).toLocaleString('id-ID')}`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="space-y-0.5 pr-3">
                <Label className="text-sm">{t('dialog.manageStockLabel')}</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {trackStock
                    ? t('dialog.stockEnabledHint')
                    : t('dialog.stockDisabledHint')}
                </p>
              </div>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trackStock && (
                <div className="space-y-1.5">
                  <Label>{t('dialog.stockLabel')}</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder={t('dialog.stockPlaceholder')} className="h-11" />
                </div>
              )}
              <div className={cn('space-y-1.5', !trackStock && 'col-span-2')}>
                <Label>{t('dialog.unitLabel')}</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unitOptions.length === 0 ? (
                      <SelectItem value="pcs">pcs</SelectItem>
                    ) : (
                      unitOptions.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dialog.barcodeLabel')}</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder={t('dialog.barcodePlaceholder')} className="h-11 flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title={t('dialog.copyFromSku')}
                  onClick={() => setBarcode(sku.trim())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title={t('dialog.scanCamera')}
                  onClick={() => setScanTarget('barcode')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('dialog.descriptionLabel')}</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('dialog.descriptionPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">{description.length}{t('dialog.descriptionCounter')}</p>
            </div>
            {!editProduct ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => handleSave(false)}
                  disabled={!name.trim() || !categoryId || !sku.trim()}
                >
                  {t('saveButton.add')}
                </Button>
                <Button
                  className="flex-1 h-12 text-sm font-semibold"
                  onClick={() => handleSave(true)}
                  disabled={!name.trim() || !categoryId || !sku.trim()}
                >
                  Simpan & Atur Sub-Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button className="w-full h-12 text-base font-semibold" onClick={() => handleSave(false)} disabled={!name.trim() || !categoryId || !sku.trim()}>
                  {t('saveButton.edit')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => handleSave(true)}
                  disabled={!name.trim() || !categoryId || !sku.trim()}
                >
                  <ListPlus className="w-4 h-4" />
                  Simpan & Kelola Sub-Menu
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t('deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scanner kamera untuk SKU / Barcode */}
      <BarcodeScanner
        open={scanTarget !== null}
        onClose={() => setScanTarget(null)}
        onScan={(value) => {
          const v = value.trim();
          if (scanTarget === 'sku') setSku(v);
          else if (scanTarget === 'barcode') setBarcode(v);
          setScanTarget(null);
        }}
      />

      {/* Sub-Menu Manager */}
      {subMenuProduct && (
        <SubMenuManager
          productId={subMenuProduct.id!}
          productName={subMenuProduct.name}
          open={!!subMenuProduct}
          onClose={() => setSubMenuProduct(null)}
          rp={rp}
        />
      )}
    </div>
  );
}
