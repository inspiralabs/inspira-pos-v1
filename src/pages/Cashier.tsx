import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type Product, type Category, type Transaction, type ReceiptItem, type ProductOptionGroup, type ProductOption, bulkAddTransactionItemsWithOptions, deleteTransactionItemsWithOptions, type SaveCartItemInput, nextReceiptNumber } from '@/lib/db';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, ShoppingCart, X, Percent, Tag, CreditCard, Banknote, Check, Package as PackageIcon, ClipboardList, Save, Pencil, User, Hash, Trash2, ListPlus } from 'lucide-react';
import Receipt from '@/components/Receipt';
import NumberInput from '@/components/NumberInput';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { trackEvent } from '@/lib/analytics';
import CustomerPicker from '@/components/CustomerPicker';
import LockedPage from '@/components/LockedPage';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProGate } from '@/components/ProGate';
import { TRIAL_LIMITS } from '@/lib/trial-limits';

// Opsi yang dipilih saat transaksi
interface SelectedOption {
  groupId: number;
  groupName: string;
  optionId: number;
  optionName: string;
  additionalPrice: number;
  quantity: number; // jumlah topping (mis. sosis x2). Selalu >= 1.
}

interface CartItem {
  product: Product;
  qty: number;
  discountType: 'percentage' | 'nominal' | null;
  discountValue: number;
  notes?: string;
  selectedOptions?: SelectedOption[];
}

const CURRENCY_SYMBOL: Record<string, string> = {
  id: 'Rp',
  en: '$',
  ms: 'Rp',
};

const NUMBER_LOCALES: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  ms: 'ms-MY',
};

const LOCALES: Record<string, Locale> = {
  id,
  en: enUS,
  ms,
};

export default function Kasir() {
  const { currentUser, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('settings');

  const lang = i18n.language?.split('-')[0] || 'id';
  const dateLocale = LOCALES[lang] || id;
  const numberLocale = NUMBER_LOCALES[lang] || 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[lang] || 'Rp';
  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [txDiscountType, setTxDiscountType] = useState<'percentage' | 'nominal' | null>(null);
  const [txDiscountValue, setTxDiscountValue] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  // Item-level discount dialog state
  const [itemDiscountTargetId, setItemDiscountTargetId] = useState<number | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [itemDiscountValue, setItemDiscountValue] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [useDebt, setUseDebt] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [lastTxItems, setLastTxItems] = useState<ReceiptItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [openBillsOpen, setOpenBillsOpen] = useState(false);
  const [editingItemNotes, setEditingItemNotes] = useState<number | null>(null);
  const [tempItemNotes, setTempItemNotes] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState<Transaction | null>(null);

  // Sub-menu dialog state
  const [subMenuProduct, setSubMenuProduct] = useState<Product | null>(null);
  const [subMenuGroups, setSubMenuGroups] = useState<(ProductOptionGroup & { options: ProductOption[] })[]>([]);
  const [subMenuSelections, setSubMenuSelections] = useState<Record<number, number[]>>({}); // groupId -> optionIds[]
  const [subMenuQty, setSubMenuQty] = useState<Record<number, number>>({}); // optionId -> qty (untuk grup multi-select)

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const openBills = useLiveQuery(() => db.transactions.where('status').equals('open').reverse().sortBy('date'));
  const allUsers = useLiveQuery(() => db.users.toArray());
  const customers = useLiveQuery(() => db.customers.where('isDeleted').equals(0).toArray());
  // Set productId yang punya sub-menu aktif — dipakai untuk tampilkan badge di product card
  const productsWithSubMenu = useLiveQuery(
    async () => {
      const links = await db.productOptionLinks.where('isDeleted').equals(0).toArray();
      return new Set(links.map(l => l.productId));
    }
  );

  // Permission gate — kept render-side (not redirect) so the bottom nav stays
  // intact. All hooks above run unconditionally; we just swap the rendered tree.
  const allowed = can('create_transaction');

  const cartProductIds = new Set(cart.map(c => c.product.id));

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
    const available = !isStockManaged(p) || p.stock > 0 || cartProductIds.has(p.id!);
    return matchSearch && matchCategory && available;
  }) ?? [];

  const doFullReset = () => {
    setCart([]);
    setEditingTxId(null);
    setTxDiscountType(null);
    setTxDiscountValue('');
    setPaymentMethodId('');
    setPaymentAmount('');
    setUseDebt(false);
    setCustomerName('');
    setCustomerId(undefined);
    setTableNumber('');
    setRemarks('');
    setIsQuickAdding(false);
  };

  // === Cart Operations ===

  // Buka sub-menu dialog atau langsung tambah ke cart jika tidak ada sub-menu
  const handleProductTap = async (product: Product) => {
    // Cek topping/opsi yang ditautkan ke produk ini (katalog global via links).
    const links = await db.productOptionLinks
      .where('productId').equals(product.id!)
      .filter(l => l.isDeleted === 0)
      .toArray();
    const groupIds = links.map(l => l.groupId);
    const groups = groupIds.length === 0 ? [] : await db.productOptionGroups
      .where('id').anyOf(groupIds)
      .filter(g => g.isDeleted === 0)
      .toArray()
      .then(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));

    if (groups.length > 0) {
      // Load options per group
      const groupsWithOptions = await Promise.all(
        groups.map(async g => {
          const opts = await db.productOptions
            .where('groupId').equals(g.id!)
            .filter(o => o.isDeleted === 0)
            .toArray()
            .then(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));
          return { ...g, options: opts };
        })
      );
      setSubMenuProduct(product);
      setSubMenuGroups(groupsWithOptions);
      // Pre-select first option for non-multi groups
      const preSelect: Record<number, number[]> = {};
      groupsWithOptions.forEach(g => {
        if (g.isMultiSelect === 0 && g.options.length > 0) {
          preSelect[g.id!] = [];
        } else {
          preSelect[g.id!] = [];
        }
      });
      setSubMenuSelections(preSelect);
      setSubMenuQty({});
    } else {
      addToCart(product, []);
    }
  };

  const confirmSubMenuAndAdd = () => {
    if (!subMenuProduct) return;

    // Validasi: grup wajib harus ada pilihannya
    for (const group of subMenuGroups) {
      const selected = subMenuSelections[group.id!] ?? [];
      if (group.isRequired === 1 && selected.length === 0) {
        toast.error(`Pilih opsi untuk "${group.name}" terlebih dahulu`);
        return;
      }
    }

    // Build selectedOptions array
    const selectedOptions: SelectedOption[] = [];
    for (const group of subMenuGroups) {
      const selectedIds = subMenuSelections[group.id!] ?? [];
      for (const optId of selectedIds) {
        const opt = group.options.find(o => o.id === optId);
        if (opt) {
          // Qty hanya berlaku untuk grup multi-select (mis. topping). Grup pilih-satu selalu 1.
          const quantity = group.isMultiSelect === 1 ? Math.max(1, subMenuQty[optId] ?? 1) : 1;
          selectedOptions.push({
            groupId: group.id!,
            groupName: group.name,
            optionId: opt.id!,
            optionName: opt.name,
            additionalPrice: opt.additionalPrice,
            quantity,
          });
        }
      }
    }

    addToCart(subMenuProduct, selectedOptions);
    setSubMenuProduct(null);
    setSubMenuGroups([]);
    setSubMenuSelections({});
    setSubMenuQty({});
  };

  const addToCart = (product: Product, selectedOptions: SelectedOption[] = []) => {
    setCart(prev => {
      // Jika produk sudah ada DAN tidak punya sub-menu → naikkan qty
      const existing = prev.find(c => c.product.id === product.id && (!c.selectedOptions || c.selectedOptions.length === 0) && selectedOptions.length === 0);
      if (existing) {
        if (isStockManaged(product) && existing.qty >= product.stock) {
          toast.error(t('cashier.toast.stockLow'));
          return prev;
        }
        return prev.map(c => {
          if (c.product.id === product.id && (!c.selectedOptions || c.selectedOptions.length === 0) && selectedOptions.length === 0) {
            return { ...c, qty: c.qty + 1 };
          }
          return c;
        });
      }
      // Harga dasar produk + harga tambahan opsi (harga x qty per opsi)
      const optionsPrice = selectedOptions.reduce((s, o) => s + o.additionalPrice * o.quantity, 0);
      // Jika ada selectedOptions, harga jual termasuk opsi
      // Diskon default dari produk
      const defDiscType = product.defaultDiscountType ?? null;
      const defDiscValue = product.defaultDiscountValue ?? 0;
      return [...prev, {
        product,
        qty: 1,
        discountType: defDiscType,
        discountValue: defDiscValue,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
        // Simpan harga tambahan opsi di notes sementara
        _optionsPrice: optionsPrice,
      } as CartItem & { _optionsPrice?: number }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return c;
      if (isStockManaged(c.product) && newQty > c.product.stock) { toast.error(t('cashier.toast.stockLow')); return c; }
      return { ...c, qty: newQty };
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, notes: notes.trim() || undefined } : c));
  };

  const openItemDiscount = (item: CartItem) => {
    setItemDiscountTargetId(item.product.id!);
    if (item.discountType) {
      setItemDiscountType(item.discountType);
      setItemDiscountValue(String(item.discountValue));
    } else {
      setItemDiscountType('nominal');
      setItemDiscountValue('');
    }
  };

  const saveItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    const raw = Number(itemDiscountValue) || 0;
    setCart(prev => prev.map(c => {
      if (c.product.id !== itemDiscountTargetId) return c;
      if (raw <= 0) {
        return { ...c, discountType: null, discountValue: 0 };
      }
      const base = c.product.price * c.qty;
      const clamped = itemDiscountType === 'percentage'
        ? Math.min(100, raw)
        : Math.min(base, raw);
      return { ...c, discountType: itemDiscountType, discountValue: clamped };
    }));
    setItemDiscountTargetId(null);
  };

  const clearItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    setCart(prev => prev.map(c =>
      c.product.id === itemDiscountTargetId
        ? { ...c, discountType: null, discountValue: 0 }
        : c
    ));
    setItemDiscountTargetId(null);
  };

  const getItemDiscountAmount = (item: CartItem) => {
    const base = item.product.price * item.qty;
    if (item.discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, item.discountValue));
      return base * pct / 100;
    }
    if (item.discountType === 'nominal') {
      return Math.min(base, Math.max(0, item.discountValue));
    }
    return 0;
  };

  const getItemSubtotal = (item: CartItem & { _optionsPrice?: number }) => {
    const optionsPrice = item._optionsPrice ?? item.selectedOptions?.reduce((s, o) => s + o.additionalPrice * (o.quantity ?? 1), 0) ?? 0;
    const base = (item.product.price + optionsPrice) * item.qty;
    return Math.max(0, base - getItemDiscountAmount(item));
  };

  const getItemBasePrice = (item: CartItem & { _optionsPrice?: number }) => {
    const optionsPrice = item._optionsPrice ?? item.selectedOptions?.reduce((s, o) => s + o.additionalPrice * (o.quantity ?? 1), 0) ?? 0;
    return item.product.price + optionsPrice;
  };

  const cartToSaveInput = (c: CartItem): SaveCartItemInput => ({
    productId: c.product.id!,
    productName: c.product.name,
    quantity: c.qty,
    unitPrice: getItemBasePrice(c),
    hpp: c.product.hpp,
    discountType: c.discountType,
    discountValue: c.discountValue,
    discountAmount: getItemDiscountAmount(c),
    subtotal: getItemSubtotal(c),
    notes: c.notes,
    selectedOptions: c.selectedOptions,
  });

  const subtotal = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const txDiscountAmount = txDiscountType === 'percentage'
    ? subtotal * Math.min(100, Math.max(0, Number(txDiscountValue) || 0)) / 100
    : txDiscountType === 'nominal'
      ? Math.min(subtotal, Math.max(0, Number(txDiscountValue) || 0))
      : 0;
  const total = Math.max(0, subtotal - txDiscountAmount);

  // === Split Bill States ===
  const [splitBillOpen, setSplitBillOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'item'>('equal');
  const [numSplits, setNumSplits] = useState(2);
  const [paidSplits, setPaidSplits] = useState<boolean[]>([]);
  const [splitItemQtys, setSplitItemQtys] = useState<Record<number, number>>({});
  const [splitCart, setSplitCart] = useState<CartItem[] | null>(null);
  const [splitPartCheckoutIndex, setSplitPartCheckoutIndex] = useState<number | null>(null);

  // Auto initialize/resize paidSplits array when numSplits changes
  useEffect(() => {
    setPaidSplits(new Array(numSplits).fill(false));
  }, [numSplits]);

  const handleOpenSplitBill = () => {
    if (cart.length === 0) {
      toast.error(t('cashier.toast.cartEmpty') || 'Keranjang belanja kosong');
      return;
    }
    const initialQtys: Record<number, number> = {};
    cart.forEach((_, idx) => {
      initialQtys[idx] = 0;
    });
    setSplitItemQtys(initialQtys);
    setNumSplits(2);
    setPaidSplits(new Array(2).fill(false));
    setSplitCart(null);
    setSplitPartCheckoutIndex(null);
    setSplitBillOpen(true);
  };

  const currentSplitItems = useMemo(() => {
    const items: CartItem[] = [];
    cart.forEach((item, index) => {
      const qty = splitItemQtys[index] || 0;
      if (qty > 0) {
        items.push({
          ...item,
          qty
        });
      }
    });
    return items;
  }, [cart, splitItemQtys]);

  const splitCartTotal = useMemo(() => {
    return currentSplitItems.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  }, [currentSplitItems]);

  const activeCheckoutTotal = splitPartCheckoutIndex !== null
    ? Math.round(total / numSplits)
    : splitCart
      ? Math.max(0, splitCart.reduce((sum, item) => sum + getItemSubtotal(item), 0))
      : total;

  const paidAmount = Number(paymentAmount) || 0;
  const checkoutPaidAmount = useDebt ? Math.min(activeCheckoutTotal, Math.max(0, paidAmount)) : paidAmount;
  const debtAmount = useDebt ? Math.max(0, activeCheckoutTotal - checkoutPaidAmount) : 0;
  const change = useDebt ? 0 : paidAmount - activeCheckoutTotal;

  const totalItemDiscount = cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
  const totalProfit = cart.reduce((sum, item) => sum + (item.product.price - item.product.hpp) * item.qty, 0) - totalItemDiscount - txDiscountAmount;

  // === Open Bill Operations ===

  const checkTrialTransactionLimit = async (): Promise<boolean> => {
    const settings = await db.storeSettings.toCollection().first();
    const isTrial = settings?.licenseStatus !== 'ACTIVE';
    if (isTrial) {
      const txCount = await db.transactions.count();
      if (txCount >= 50) {
        toast.error(`Sudah ${TRIAL_LIMITS.maxTransactions} transaksi — aktivasi lisensi untuk lanjut jualan.`);
        return false;
      }
    }
    return true;
  };

  const openCheckout = async () => {
    if (!editingTxId) {
      const allowed = await checkTrialTransactionLimit();
      if (!allowed) return;
    }
    setCheckoutOpen(true);
    setUseDebt(false);
    setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? '');
    setPaymentAmount(total.toString());
    setIsQuickAdding(false);
  };

  const saveOpenBill = async () => {
    if (cart.length === 0) { toast.error(t('cashier.toast.cartEmpty')); return; }

    if (!editingTxId) {
      const allowed = await checkTrialTransactionLimit();
      if (!allowed) return;
    }

    const now = new Date();

    if (editingTxId) {
      // Update existing open bill
      const oldItems = await db.transactionItems.where('transactionId').equals(editingTxId).toArray();

      await db.transactions.update(editingTxId, {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        date: now,
      });
      await deleteTransactionItemsWithOptions(editingTxId);
      const savedItems = await bulkAddTransactionItemsWithOptions(editingTxId, cart.map(cartToSaveInput));

      // Adjust stock deltas
      for (const cartItem of cart) {
        if (!isStockManaged(cartItem.product)) continue;
        const oldItem = oldItems.find(oi => oi.productId === cartItem.product.id);
        const oldQty = oldItem?.quantity ?? 0;
        const newQty = cartItem.qty;
        const delta = newQty - oldQty;
        if (delta !== 0) {
          await db.products.update(cartItem.product.id!, { stock: cartItem.product.stock - delta, updatedAt: new Date() });
        }
      }
      // Restore stock for removed items that were in old bill
      for (const oldItem of oldItems) {
        const stillInCart = cart.find(c => c.product.id === oldItem.productId);
        if (!stillInCart) {
          const product = await db.products.get(oldItem.productId);
          if (product && isStockManaged(product)) {
            await db.products.update(oldItem.productId, { stock: product.stock + oldItem.quantity });
          }
        }
      }

      const updatedTx = await db.transactions.get(editingTxId);
      toast.success(t('cashier.toast.billUpdated', { receiptNumber: updatedTx?.receiptNumber }));
    } else {
      const receiptNumber = nextReceiptNumber();

      const txData: Transaction = {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: 0,
        paymentAmount: 0,
        change: 0,
        profit: 0,
        date: now,
        receiptNumber,
        status: 'open',
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        openedAt: now,
        createdBy: currentUser?.id,
      };

      const txId = await db.transactions.add(txData);

      await bulkAddTransactionItemsWithOptions(txId as number, cart.map(cartToSaveInput));

      for (const item of cart) {
        if (!isStockManaged(item.product)) continue;
        await db.products.update(item.product.id!, { stock: item.product.stock - item.qty, updatedAt: new Date() });
      }

      toast.success(t('cashier.toast.billSaved', { receiptNumber }));
    }

    doFullReset();
    setCartOpen(false);
  };

  const loadOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const items = await db.transactionItems.where('transactionId').equals(tx.id).toArray();
    const allProducts = await db.products.where('isDeleted').equals(0).toArray();

    const cartItems: CartItem[] = items.map(item => {
      const product = allProducts.find(p => p.id === item.productId);
      if (!product) throw new Error(t('cashier.toast.productNotFoundLoadBill', { name: item.productName }));
      return {
        product,
        qty: item.quantity,
        discountType: item.discountType as 'percentage' | 'nominal' | null,
        discountValue: item.discountValue,
        notes: item.notes,
      };
    });

    setCart(cartItems);
    setEditingTxId(tx.id);
    setTxDiscountType(tx.discountType);
    setTxDiscountValue(tx.discountType ? String(tx.discountValue) : '');
    setCustomerName(tx.customerName || '');
    setCustomerId(tx.customerId);
    setTableNumber(tx.tableNumber || '');
    setRemarks(tx.remarks || '');
    setOpenBillsOpen(false);
    setCartOpen(true);
  };

  const cancelOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const items = await db.transactionItems.where('transactionId').equals(tx.id).toArray();
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (product && isStockManaged(product)) {
        await db.products.update(item.productId, { stock: product.stock + item.quantity });
      }
    }
    await deleteTransactionItemsWithOptions(tx.id);
    await db.transactions.delete(tx.id);
    toast.success(t('cashier.toast.billCancelled', { receiptNumber: tx.receiptNumber }));
    setCancelDialogOpen(false);
    setCancelTargetTx(null);
    if (editingTxId === tx.id) {
      doFullReset();
      setCartOpen(false);
    }
  };

  const handleCancelFromCart = () => {
    const tx = openBills?.find(b => b.id === editingTxId);
    if (tx) {
      setCancelTargetTx(tx);
      setCancelDialogOpen(true);
    }
  };

  const handleCancelFromList = (bill: Transaction) => {
    setCancelTargetTx(bill);
    setCancelDialogOpen(true);
  };

  // === Checkout ===

  const handleCheckout = async () => {
    if (!editingTxId) {
      const allowed = await checkTrialTransactionLimit();
      if (!allowed) return;
    }

    if (useDebt) {
      if (!storeSettings?.allowDebt) return;
      if (!customerId) {
        toast.error(t('cashier.toast.selectCustomerForDebt'));
        return;
      }
      if (paidAmount < 0 || paidAmount > activeCheckoutTotal) {
        toast.error(t('cashier.toast.paymentAmountRange', { symbol: currencySymbol }));
        return;
      }
      if (checkoutPaidAmount > 0 && !paymentMethodId) {
        toast.error(t('cashier.toast.selectPaymentMethod'));
        return;
      }
    } else if (!paymentMethodId || paidAmount < activeCheckoutTotal) {
      return;
    }

    if (splitPartCheckoutIndex !== null) {
      // 1. Bagi Rata Mode: Save the split portion
      const receiptNumber = nextReceiptNumber('TX-SPLIT-');
      const txData: Transaction = {
        subtotal: activeCheckoutTotal,
        discountType: null,
        discountValue: 0,
        discountAmount: 0,
        total: activeCheckoutTotal,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: 0,
        date: new Date(),
        receiptNumber,
        status: 'completed',
        customerId,
        customerName: (customerName.trim() ? `${customerName.trim()} (Split ${splitPartCheckoutIndex + 1}/${numSplits})` : `Bagi Rata ${splitPartCheckoutIndex + 1}/${numSplits}`),
        tableNumber: tableNumber.trim() || undefined,
        remarks: `Bagi Rata ${splitPartCheckoutIndex + 1}/${numSplits} - ${remarks.trim()}`.trim(),
        createdBy: currentUser?.id,
        debtAmount,
      };

      const txId = await db.transactions.add(txData);

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: txId as number,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          settledAt: null,
        });
      }

      const itemRecord: ReceiptItem = {
        transactionId: txId as number,
        productId: 0,
        productName: `Bagi Rata (Bagian ${splitPartCheckoutIndex + 1}/${numSplits})`,
        quantity: 1,
        price: activeCheckoutTotal,
        hpp: 0,
        discountType: null,
        discountValue: 0,
        discountAmount: 0,
        subtotal: activeCheckoutTotal,
        notes: `Total tagihan asli: ${rp(total)}`,
      };
      await db.transactionItems.add(itemRecord);

      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction({ ...txData, id: txId as number });
      setLastTxItems([itemRecord]);
      
      const newPaidSplits = [...paidSplits];
      newPaidSplits[splitPartCheckoutIndex] = true;
      setPaidSplits(newPaidSplits);
      setSplitPartCheckoutIndex(null);
      setCheckoutOpen(false);

      const allPaid = newPaidSplits.every(Boolean);
      if (allPaid) {
        doFullReset();
        setSplitBillOpen(false);
        toast.success("Seluruh bagian tagihan split bill telah lunas dibayar!");
      } else {
        setSplitBillOpen(true);
      }
      setReceiptOpen(true);
      return;
    }

    if (splitCart !== null) {
      // 2. Per Item Mode: Save the split items
      const receiptNumber = nextReceiptNumber('TX-ITEM-');
      const splitProfit = splitCart.reduce((sum, item) => sum + (item.product.price - item.product.hpp) * item.qty, 0) - splitCart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
      
      const txData: Transaction = {
        subtotal: activeCheckoutTotal,
        discountType: null,
        discountValue: 0,
        discountAmount: 0,
        total: activeCheckoutTotal,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: splitProfit,
        date: new Date(),
        receiptNumber,
        status: 'completed',
        customerId,
        customerName: (customerName.trim() ? `${customerName.trim()} (Split Item)` : `Split Item`),
        tableNumber: tableNumber.trim() || undefined,
        remarks: `Split Bill Per Item - ${remarks.trim()}`.trim(),
        createdBy: currentUser?.id,
        debtAmount,
      };

      const txId = await db.transactions.add(txData);

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: txId as number,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          settledAt: null,
        });
      }

      const savedItems = await bulkAddTransactionItemsWithOptions(txId as number, splitCart.map(cartToSaveInput));

      for (const item of splitCart) {
        if (!isStockManaged(item.product)) continue;
        await db.products.update(item.product.id!, { stock: item.product.stock - item.qty, updatedAt: new Date() });
      }

      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction({ ...txData, id: txId as number });
      setLastTxItems(savedItems);
      
      // Update main cart: subtract split items
      const newCart = cart.map(c => {
        const splitItem = splitCart.find(sc => sc.product.id === c.product.id);
        if (splitItem) {
          return { ...c, qty: c.qty - splitItem.qty };
        }
        return c;
      }).filter(c => c.qty > 0);
      
      setCart(newCart);
      setSplitCart(null);
      setCheckoutOpen(false);

      if (newCart.length === 0) {
        doFullReset();
        setSplitBillOpen(false);
        toast.success("Seluruh item tagihan telah lunas dibayar!");
      } else {
        // Re-initialize split item quantities to 0 for remaining cart
        const initialQtys: Record<number, number> = {};
        newCart.forEach((item, index) => {
          initialQtys[index] = 0;
        });
        setSplitItemQtys(initialQtys);
        setSplitBillOpen(true);
      }
      setReceiptOpen(true);
      return;
    }

    if (editingTxId) {
      // Update existing open bill → paid
      const oldItems = await db.transactionItems.where('transactionId').equals(editingTxId).toArray();

      await db.transactions.update(editingTxId, {
        status: 'completed',
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: totalProfit,
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        closedAt: new Date(),
        debtAmount,
      });

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: editingTxId,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          settledAt: null,
        });
      }

      await deleteTransactionItemsWithOptions(editingTxId);
      const savedItems = await bulkAddTransactionItemsWithOptions(editingTxId, cart.map(cartToSaveInput));

      // Adjust stock deltas (same as saveOpenBill)
      for (const cartItem of cart) {
        if (!isStockManaged(cartItem.product)) continue;
        const oldItem = oldItems.find(oi => oi.productId === cartItem.product.id);
        const oldQty = oldItem?.quantity ?? 0;
        const newQty = cartItem.qty;
        const delta = newQty - oldQty;
        if (delta !== 0) {
          await db.products.update(cartItem.product.id!, { stock: cartItem.product.stock - delta, updatedAt: new Date() });
        }
      }
      for (const oldItem of oldItems) {
        const stillInCart = cart.find(c => c.product.id === oldItem.productId);
        if (!stillInCart) {
          const product = await db.products.get(oldItem.productId);
          if (product && isStockManaged(product)) {
            await db.products.update(oldItem.productId, { stock: product.stock + oldItem.quantity });
          }
        }
      }

      const updatedTx = await db.transactions.get(editingTxId);
      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber: updatedTx?.receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction(updatedTx || null);
      setLastTxItems(savedItems);
      setReceiptOpen(true);
    } else {
      const receiptNumber = nextReceiptNumber();

      const txData: Transaction = {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: totalProfit,
        date: new Date(),
        receiptNumber,
        status: 'completed',
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        createdBy: currentUser?.id,
        debtAmount,
      };

      const txId = await db.transactions.add(txData);

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: txId as number,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          settledAt: null,
        });
      }

      const savedItems = await bulkAddTransactionItemsWithOptions(txId as number, cart.map(cartToSaveInput));

      for (const item of cart) {
        if (!isStockManaged(item.product)) continue;
        await db.products.update(item.product.id!, { stock: item.product.stock - item.qty, updatedAt: new Date() });
      }

      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction({ ...txData, id: txId as number });
      setLastTxItems(savedItems);
      setReceiptOpen(true);
    }

    doFullReset();
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const openBillsCount = openBills?.length ?? 0;





  // Open the Open Bills sheet when navigated here from the dashboard
  useEffect(() => {
    if ((location.state as { openBills?: boolean } | null)?.openBills) {
      setOpenBillsOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // After all hooks: if user can't create transactions, render the locked
  // placeholder instead of the kasir UI. Bottom nav stays visible.
  if (!allowed) {
    return <LockedPage title={t('cashier.locked.title')} permissionLabel={t('cashier.locked.permissionLabel')} />;
  }

  return (
    <div className="px-4 pt-6 pb-4 h-[calc(100dvh-4rem)]">
      <div className="flex flex-col landscape:flex-row md:flex-row gap-2 landscape:gap-4 md:gap-4 h-full">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          {t('cashier.title')}
          {editingTxId && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {t('cashier.editingBill')}
            </Badge>
          )}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-xs relative"
          onClick={() => setOpenBillsOpen(true)}
        >
          <ClipboardList className="w-4 h-4" />
          {t('cashier.openBill')}{openBillsCount > 0 && ` (${openBillsCount})`}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('cashier.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1 pr-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
        <button onClick={() => setFilterCategory('all')} className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          {t('cashier.categoryAll')}
        </button>
        {categories?.map(c => (
          <button key={c.id} onClick={() => setFilterCategory(c.id!.toString())} className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === c.id!.toString() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {products && products.length > 0
                ? t('cashier.empty.outOfStock')
                : t('cashier.empty.noProducts')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(p => (
              <Card key={p.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] relative" onClick={() => handleProductTap(p)}>
                <CardContent className="p-0">
                  <div className="w-full aspect-square bg-muted rounded-t-lg overflow-hidden flex items-center justify-center relative">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <PackageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                    {/* Badge sub-menu */}
                    {productsWithSubMenu?.has(p.id!) && (
                      <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shadow">
                        <ListPlus className="w-3 h-3" />
                      </div>
                    )}
                    {/* Badge diskon default */}
                    {p.defaultDiscountType && p.defaultDiscountValue ? (
                      <div className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow">
                        {p.defaultDiscountType === 'percentage' ? `${p.defaultDiscountValue}%` : 'Disc'}
                      </div>
                    ) : null}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-semibold truncate">{p.name}</h3>
                    <p className="text-sm font-bold text-primary mt-0.5">{rp(p.price)}</p>
                    {p.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={p.description}>
                        {p.description}
                      </p>
                    )}
                    {isStockManaged(p) ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('cashier.productCard.stock', { stock: p.stock, unit: p.unit })}</p>
                    ) : (
                      <p className="text-[10px] text-primary mt-0.5">{t('cashier.productCard.alwaysAvailable')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Desktop Cart Panel */}
      <div className="hidden landscape:flex md:flex landscape:w-72 md:w-80 lg:w-96 flex-col overflow-hidden bg-card rounded-xl border border-border shrink-0">
        <div className="p-4 border-b border-border shrink-0">
          <h3 className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            {t('cashier.cart.title', { count: cartCount })}
            {editingTxId && <span className="text-xs font-normal text-muted-foreground">{t('cashier.cart.editLabel')}</span>}
          </h3>
        </div>
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{t('cashier.cart.empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {cart.map((item, idx) => (
                <div key={`${item.product.id}-${idx}`} className="bg-muted/50 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{rp(getItemBasePrice(item as CartItem & { _optionsPrice?: number }))} × {item.qty}</p>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedOptions.map((opt, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {opt.optionName}{(opt.quantity ?? 1) > 1 ? ` ×${opt.quantity}` : ''}{opt.additionalPrice > 0 ? ` +${rp(opt.additionalPrice * (opt.quantity ?? 1))}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.discountType && getItemDiscountAmount(item) > 0 && (
                        <p className="text-[10px] text-destructive">
                          {t('cashier.cartDiscount.label')}: {item.discountType === 'percentage' ? `${item.discountValue}%` : rp(item.discountValue)} (-{rp(getItemDiscountAmount(item))})
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary">{rp(getItemSubtotal(item as CartItem & { _optionsPrice?: number }))}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => item.qty === 1 ? removeFromCart(item.product.id!) : updateQty(item.product.id!, -1)}>
                        {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </Button>
                      <input
                        key={item.qty}
                        type="number"
                        inputMode="numeric"
                        defaultValue={item.qty}
                        onBlur={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            if (isStockManaged(item.product) && val > item.product.stock) {
                              toast.error(t('cashier.toast.stockLowWithMax', { max: item.product.stock }));
                              e.target.value = String(item.product.stock);
                              setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: item.product.stock } : c));
                            } else {
                              setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: val } : c));
                            }
                          } else {
                            e.target.value = String(item.qty);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-10 h-8 text-center text-sm font-bold bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(item.product.id!, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.notes ? (
                      <button
                        className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
                        onClick={() => { setEditingItemNotes(item.product.id!); setTempItemNotes(item.notes || ''); }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {item.notes}
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => { setEditingItemNotes(item.product.id!); setTempItemNotes(''); }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {t('cashier.itemNotes.add')}
                      </button>
                    )}
                    {item.discountType ? (
                      <button
                        className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
                        onClick={() => openItemDiscount(item)}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t('cashier.itemDiscount.change')}
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => openItemDiscount(item)}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t('cashier.itemDiscount.add')}
                      </button>
                    )}
                  </div>
                  {editingItemNotes === item.product.id && (
                    <div className="flex gap-2 items-center">
                      <Input
                        autoFocus
                        value={tempItemNotes}
                        onChange={e => setTempItemNotes(e.target.value)}
                        placeholder={t('cashier.itemNotes.placeholder')}
                        className="h-8 text-xs"
                        onKeyDown={e => {
                          if (e.key === 'Enter') { updateItemNotes(item.product.id!, tempItemNotes); setEditingItemNotes(null); }
                          if (e.key === 'Escape') setEditingItemNotes(null);
                        }}
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => { updateItemNotes(item.product.id!, tempItemNotes); setEditingItemNotes(null); }}>{t('cashier.buttons.ok')}</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-4 mb-2">
              <CustomerPicker
                customers={customers ?? []}
                value={customerName}
                customerId={customerId}
                onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                className="flex-1 [&_input]:h-9 [&_input]:text-xs"
              />
              <div className="relative flex-[0.6]">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('cashier.checkout.table')}
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3 px-4 pb-4">
              {txDiscountAmount > 0 ? (
                <button
                  onClick={() => { setTempDiscountType(txDiscountType!); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-destructive font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {t('cashier.cartDiscount.label')}: {txDiscountType === 'percentage' ? `${txDiscountValue}%` : rp(Number(txDiscountValue))}
                  <span className="text-[10px] underline ml-1">{t('cashier.cartDiscount.change')}</span>
                </button>
              ) : (
                <button
                  onClick={() => { setTempDiscountType('nominal'); setTempDiscountValue(''); setDiscountDialogOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{t('cashier.cartDiscount.add')}</span>
                </button>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cashier.cartDiscount.subtotal')}</span>
                <span className="font-medium">{rp(subtotal)}</span>
              </div>
              {txDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>{t('cashier.cartDiscount.discount')}</span>
                  <span>-{rp(txDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>{t('cashier.cartDiscount.total')}</span>
                <span className="text-primary">{rp(total)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm font-semibold"
                  onClick={saveOpenBill}
                  disabled={cart.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('cashier.buttons.saveBill')}
                </Button>
                <Button
                  className="flex-1 h-12 text-sm font-semibold"
                  onClick={openCheckout}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('cashier.buttons.pay')}
                </Button>
              </div>

              <ProGate featureKey="split_bill">
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs"
                  onClick={handleOpenSplitBill}
                  disabled={cart.length === 0}
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                  Bagi Tagihan (Split Bill)
                </Button>
              </ProGate>

              {editingTxId && can('delete_transaction') && (
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={handleCancelFromCart}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {t('cashier.buttons.cancelBill')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>{/* end flex row */}

      {/* Cart FAB (mobile only) */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden landscape:hidden fixed right-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl active:scale-95 transition-transform z-40"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold text-sm">{t('cashier.cart.title', { count: cartCount })}</span>
          <span className="text-sm font-bold">• {rp(total)}</span>
        </button>
      )}

      {/* Cart Sheet (mobile only) */}
      <div className="md:hidden landscape:hidden">
      <Sheet open={cartOpen} onOpenChange={(open) => { setCartOpen(open); if (!open) setEditingItemNotes(null); }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl max-w-lg mx-auto">
          <SheetHeader>
            <SheetTitle className="text-left">
              {t('cashier.cart.title', { count: cartCount })}
              {editingTxId && <span className="text-xs font-normal text-muted-foreground ml-2">{t('cashier.cart.editOpenBillLabel')}</span>}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full mt-4">
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {cart.map((item, idx) => (
                <div key={`${item.product.id}-${idx}`} className="bg-muted/50 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{rp(getItemBasePrice(item))} × {item.qty}</p>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedOptions.map((opt, i) => (
                            <span key={`${opt.optionId}-${i}`} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {opt.optionName}{(opt.quantity ?? 1) > 1 ? ` ×${opt.quantity}` : ''}{opt.additionalPrice > 0 ? ` +${rp(opt.additionalPrice * (opt.quantity ?? 1))}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.discountType && getItemDiscountAmount(item) > 0 && (
                        <p className="text-[10px] text-destructive">
                          {t('cashier.cartDiscount.label')}: {item.discountType === 'percentage' ? `${item.discountValue}%` : rp(item.discountValue)} (-{rp(getItemDiscountAmount(item))})
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary">{rp(getItemSubtotal(item))}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => item.qty === 1 ? removeFromCart(item.product.id!) : updateQty(item.product.id!, -1)}>
                        {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </Button>
                      <input
                        key={item.qty}
                        type="number"
                        inputMode="numeric"
                        defaultValue={item.qty}
                        onBlur={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            if (isStockManaged(item.product) && val > item.product.stock) {
                              toast.error(t('cashier.toast.stockLowWithMax', { max: item.product.stock }));
                              e.target.value = String(item.product.stock);
                              setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: item.product.stock } : c));
                            } else {
                              setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: val } : c));
                            }
                          } else {
                            e.target.value = String(item.qty);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-10 h-8 text-center text-sm font-bold bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(item.product.id!, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {/* Item notes & discount row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.notes ? (
                      <button
                        className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
                        onClick={() => { setEditingItemNotes(item.product.id!); setTempItemNotes(item.notes || ''); }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {item.notes}
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => { setEditingItemNotes(item.product.id!); setTempItemNotes(''); }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {t('cashier.itemNotes.add')}
                      </button>
                    )}
                    {item.discountType ? (
                      <button
                        className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
                        onClick={() => openItemDiscount(item)}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t('cashier.itemDiscount.change')}
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => openItemDiscount(item)}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t('cashier.itemDiscount.add')}
                      </button>
                    )}
                  </div>
                  {/* Inline notes editor */}
                  {editingItemNotes === item.product.id && (
                    <div className="flex gap-2 items-center">
                      <Input
                        autoFocus
                        value={tempItemNotes}
                        onChange={e => setTempItemNotes(e.target.value)}
                        placeholder={t('cashier.itemNotes.placeholder')}
                        className="h-8 text-xs"
                        onKeyDown={e => {
                          if (e.key === 'Enter') { updateItemNotes(item.product.id!, tempItemNotes); setEditingItemNotes(null); }
                          if (e.key === 'Escape') setEditingItemNotes(null);
                        }}
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => { updateItemNotes(item.product.id!, tempItemNotes); setEditingItemNotes(null); }}>{t('cashier.buttons.ok')}</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Customer / Table quick inputs */}
            <div className="flex gap-2 mb-2">
              <CustomerPicker
                customers={customers ?? []}
                value={customerName}
                customerId={customerId}
                onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                className="flex-1 [&_input]:h-9 [&_input]:text-xs"
              />
              <div className="relative flex-[0.6]">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('cashier.checkout.table')}
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-3 pb-6">
              {txDiscountAmount > 0 ? (
                <button
                  onClick={() => { setTempDiscountType(txDiscountType!); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-destructive font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {t('cashier.cartDiscount.label')}: {txDiscountType === 'percentage' ? `${txDiscountValue}%` : rp(Number(txDiscountValue))}
                  <span className="text-[10px] underline ml-1">{t('cashier.cartDiscount.change')}</span>
                </button>
              ) : (
                <button
                  onClick={() => { setTempDiscountType('nominal'); setTempDiscountValue(''); setDiscountDialogOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{t('cashier.cartDiscount.add')}</span>
                </button>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cashier.cartDiscount.subtotal')}</span>
                <span className="font-medium">{rp(subtotal)}</span>
              </div>
              {txDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>{t('cashier.cartDiscount.discount')}</span>
                  <span>-{rp(txDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>{t('cashier.cartDiscount.total')}</span>
                <span className="text-primary">{rp(total)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm font-semibold"
                  onClick={saveOpenBill}
                  disabled={cart.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('cashier.buttons.saveBill')}
                </Button>
                <Button
                  className="flex-1 h-12 text-sm font-semibold"
                  onClick={openCheckout}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('cashier.buttons.pay')}
                </Button>
              </div>

              <ProGate featureKey="split_bill">
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs mt-2"
                  onClick={handleOpenSplitBill}
                  disabled={cart.length === 0}
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                  Bagi Tagihan (Split Bill)
                </Button>
              </ProGate>

              {editingTxId && can('delete_transaction') && (
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={handleCancelFromCart}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {t('cashier.buttons.cancelBill')}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </div>{/* end mobile cart wrapper */}

      {/* Open Bills Sheet */}
      <Sheet open={openBillsOpen} onOpenChange={setOpenBillsOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl max-w-lg md:max-w-xl mx-auto flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {t('cashier.openBillsSheet.title', { count: openBillsCount })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto pb-6 space-y-2">
            {!openBills || openBills.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t('cashier.openBillsSheet.empty')}</p>
              </div>
            ) : (
              openBills.map(bill => (
                <Card key={bill.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{bill.receiptNumber}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {bill.openedAt ? format(new Date(bill.openedAt), 'dd/MM HH:mm', { locale: dateLocale }) : ''}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">{rp(bill.total)}</span>
                    </div>
                    <div className="flex gap-1.5 text-[10px] text-muted-foreground mb-2">
                      {bill.customerName && <span>👤 {bill.customerName}</span>}
                      {bill.tableNumber && <span>🪑 {t('cashier.openBillsSheet.tablePrefix', { number: bill.tableNumber })}</span>}
                      {bill.remarks && <span className="truncate max-w-[120px]">📝 {bill.remarks}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs flex-1" onClick={() => loadOpenBill(bill)}>
                        {t('cashier.openBillsSheet.continue')}
                      </Button>
                      {can('delete_transaction') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-destructive border-destructive/30"
                          onClick={() => handleCancelFromList(bill)}
                        >
                          {t('cashier.openBillsSheet.cancel')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog Split Bill */}
      <Dialog open={splitBillOpen} onOpenChange={setSplitBillOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-primary" />
              Bagi Tagihan (Split Bill)
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
            {/* Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all",
                  splitMode === 'equal'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bagi Rata (Equal Split)
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('item')}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all",
                  splitMode === 'item'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Per Item (Item Split)
              </button>
            </div>

            {splitMode === 'equal' ? (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Tagihan Asli</span>
                    <span className="text-sm font-bold">{rp(total)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-primary/10 pt-3">
                    <span className="text-xs text-muted-foreground">Jumlah Pembagian</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        disabled={numSplits <= 2}
                        onClick={() => setNumSplits(prev => Math.max(2, prev - 1))}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{numSplits}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        disabled={numSplits >= 10}
                        onClick={() => setNumSplits(prev => Math.min(10, prev + 1))}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-primary/10 pt-3">
                    <span className="text-xs text-muted-foreground font-semibold">Per Bagian</span>
                    <span className="text-base font-extrabold text-primary">
                      {rp(Math.round(total / numSplits))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Daftar Bagian Tagihan</p>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {paidSplits.map((isPaid, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-xl transition-all",
                          isPaid 
                            ? "bg-success/5 border-success/20 text-success-foreground" 
                            : "bg-background border-border text-foreground"
                        )}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold">Bagian {idx + 1} dari {numSplits}</p>
                          <p className="text-xs text-muted-foreground">{rp(Math.round(total / numSplits))}</p>
                        </div>
                        
                        {isPaid ? (
                          <div className="flex items-center gap-1.5 text-xs text-success font-semibold px-2.5 py-1 bg-success/10 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                            Lunas
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold"
                            onClick={() => {
                              setSplitPartCheckoutIndex(idx);
                              setCheckoutOpen(true);
                              setSplitBillOpen(false);
                              setUseDebt(false);
                              setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? '');
                              setPaymentAmount(Math.round(total / numSplits).toString());
                              setIsQuickAdding(false);
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Bayar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Per Item Mode
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pilih item dan jumlah yang ingin dipisahkan ke dalam transaksi baru.
                </p>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {cart.map((item, index) => {
                    const selectedQty = splitItemQtys[index] || 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-xl bg-background border-border">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-bold truncate">{item.product.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {rp(getItemBasePrice(item))} × {item.qty} item
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-md"
                            disabled={selectedQty <= 0}
                            onClick={() => {
                              setSplitItemQtys(prev => ({
                                ...prev,
                                [index]: Math.max(0, (prev[index] || 0) - 1)
                              }));
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-semibold w-5 text-center">{selectedQty}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-md"
                            disabled={selectedQty >= item.qty}
                            onClick={() => {
                              setSplitItemQtys(prev => ({
                                ...prev,
                                [index]: Math.min(item.qty, (prev[index] || 0) + 1)
                              }));
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between items-center bg-primary/5 p-3.5 rounded-xl">
                    <span className="text-xs font-semibold">Total Tagihan Terpisah</span>
                    <span className="text-base font-extrabold text-primary">{rp(splitCartTotal)}</span>
                  </div>

                  <Button
                    className="w-full h-11 text-xs font-bold"
                    disabled={currentSplitItems.length === 0}
                    onClick={() => {
                      setSplitCart(currentSplitItems);
                      setSplitPartCheckoutIndex(null);
                      setCheckoutOpen(true);
                      setSplitBillOpen(false);
                      setUseDebt(false);
                      setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? '');
                      setPaymentAmount(splitCartTotal.toString());
                      setIsQuickAdding(false);
                    }}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Bayar Tagihan Terpisah ({rp(splitCartTotal)})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>{t('cashier.checkout.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
            <div className="text-center py-3 bg-primary/5 rounded-xl">
              <p className="text-sm text-muted-foreground">{t('cashier.checkout.totalLabel')}</p>
              <p className="text-3xl font-bold text-primary">{rp(activeCheckoutTotal)}</p>
            </div>

            {storeSettings?.allowDebt && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-semibold">{t('cashier.checkout.debtLabel')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('cashier.checkout.debtDesc')}</p>
                </div>
                <Switch
                  checked={useDebt}
                  onCheckedChange={(checked) => {
                    setUseDebt(checked);
                    setPaymentAmount(checked ? '0' : activeCheckoutTotal.toString());
                    setIsQuickAdding(false);
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t('cashier.checkout.paymentMethod')}</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods?.map(pm => (
                  <button key={pm.id} onClick={() => setPaymentMethodId(pm.id!.toString())} className={cn('p-3 rounded-xl text-xs font-semibold border-2 transition-colors', paymentMethodId === pm.id!.toString() ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}>
                    {pm.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">{useDebt ? t('cashier.checkout.amountLabel.debt') : t('cashier.checkout.amountLabel.full')}</p>
              <NumberInput
                value={paymentAmount}
                onChange={val => { setPaymentAmount(val || '0'); setIsQuickAdding(true); }}
                placeholder={t('cashier.checkout.amountPlaceholder')}
                className="h-12 text-lg font-bold text-center"
              />
              <div className="flex flex-wrap gap-1.5">
                {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map(nom => (
                  <button
                    key={nom}
                    onClick={() => {
                      if (!isQuickAdding) {
                        setPaymentAmount(String(nom));
                        setIsQuickAdding(true);
                      } else {
                        setPaymentAmount(prev => String((Number(prev) || 0) + nom));
                      }
                    }}
                    className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-border bg-muted/50 text-xs font-semibold text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary active:scale-95 transition-all"
                  >
                    {nom >= 1000 ? `${(nom / 1000)}K` : nom}
                  </button>
                ))}
                <button
                  onClick={() => { setPaymentAmount(activeCheckoutTotal.toString()); setIsQuickAdding(false); }}
                  className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all"
                >
                  {t('cashier.checkout.exactMoney')}
                </button>
              </div>
              <button
                onClick={() => { setPaymentAmount('0'); setIsQuickAdding(false); }}
                className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
              >
                {t('cashier.checkout.reset')}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <CustomerPicker
                  customers={customers ?? []}
                  value={customerName}
                  customerId={customerId}
                  onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                  className="flex-1 [&_input]:h-10 [&_input]:text-sm"
                />
                <div className="relative flex-[0.7]">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t('cashier.checkout.table')}
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="pl-8 h-10 text-sm"
                  />
                </div>
              </div>
              <Input
                placeholder={t('cashier.checkout.notes')}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="h-10"
              />
            </div>

            {useDebt && debtAmount > 0 && (
              <div className="flex justify-between items-center bg-warning/10 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t('cashier.checkout.remainingDebt')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('cashier.checkout.remainingDebtHint')}</p>
                </div>
                <span className="text-lg font-bold text-warning">{rp(debtAmount)}</span>
              </div>
            )}

            {paidAmount >= activeCheckoutTotal && (
              <div className="flex justify-between items-center bg-success/10 p-3 rounded-xl">
                <span className="text-sm font-medium">{t('cashier.checkout.changeLabel')}</span>
                <span className="text-lg font-bold text-success">{rp(change)}</span>
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-semibold shrink-0"
              onClick={handleCheckout}
              disabled={
                useDebt
                  ? !customerId || paidAmount < 0 || paidAmount > activeCheckoutTotal || (checkoutPaidAmount > 0 && !paymentMethodId)
                  : !paymentMethodId || paidAmount < activeCheckoutTotal
              }
            >
              <Check className="w-5 h-5 mr-2" />
              {t('cashier.checkout.confirmButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('cashier.discountDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t('cashier.discountDialog.typeLabel')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTempDiscountType('nominal')}
                  className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', tempDiscountType === 'nominal' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                >
                  {t('cashier.discountDialog.type.nominal', { symbol: currencySymbol })}
                </button>
                <button
                  onClick={() => setTempDiscountType('percentage')}
                  className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', tempDiscountType === 'percentage' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                >
                  {t('cashier.discountDialog.type.percentage')}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">{tempDiscountType === 'percentage' ? t('cashier.discountDialog.amountLabel.percentage') : t('cashier.discountDialog.amountLabel.nominal')}</p>
              <Input
                type="number"
                value={tempDiscountValue}
                onChange={e => setTempDiscountValue(e.target.value)}
                placeholder={tempDiscountType === 'percentage' ? t('cashier.discountDialog.placeholder.percentage') : t('cashier.discountDialog.placeholder.nominal')}
                className="h-12 text-lg font-bold text-center"
              />
              {tempDiscountType === 'percentage' && Number(tempDiscountValue) > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('cashier.discountDialog.percentPreview', { symbol: currencySymbol, amount: (subtotal * Number(tempDiscountValue) / 100).toLocaleString(numberLocale), subtotal: subtotal.toLocaleString(numberLocale) })}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {txDiscountType && (
                <Button variant="outline" className="h-11 text-destructive border-destructive/30" onClick={() => {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                  setDiscountDialogOpen(false);
                }}>
                  {t('cashier.discountDialog.delete')}
                </Button>
              )}
              <Button className="flex-1 h-11 font-semibold" onClick={() => {
                if (Number(tempDiscountValue) > 0) {
                  setTxDiscountType(tempDiscountType);
                  setTxDiscountValue(tempDiscountValue);
                } else {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                }
                setDiscountDialogOpen(false);
              }}>
                {t('cashier.discountDialog.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Discount Dialog */}
      <Dialog open={itemDiscountTargetId !== null} onOpenChange={(open) => { if (!open) setItemDiscountTargetId(null); }}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('cashier.itemDiscountDialog.title')}</DialogTitle>
          </DialogHeader>
          {(() => {
            const target = cart.find(c => c.product.id === itemDiscountTargetId);
            if (!target) return null;
            const base = target.product.price * target.qty;
            const rawValue = Number(itemDiscountValue) || 0;
            const previewAmount = itemDiscountType === 'percentage'
              ? base * Math.min(100, Math.max(0, rawValue)) / 100
              : Math.min(base, Math.max(0, rawValue));
            const exceedsCap = itemDiscountType === 'percentage' ? rawValue > 100 : rawValue > base;
            return (
              <div className="space-y-4 mt-2">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{t('cashier.itemDiscountDialog.itemLabel')}</p>
                  <p className="text-sm font-semibold">{target.product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rp(target.product.price)} × {target.qty} = {rp(base)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t('cashier.itemDiscountDialog.typeLabel')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setItemDiscountType('nominal')}
                      className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', itemDiscountType === 'nominal' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                    >
                      {t('cashier.itemDiscountDialog.type.nominal', { symbol: currencySymbol })}
                    </button>
                    <button
                      onClick={() => setItemDiscountType('percentage')}
                      className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', itemDiscountType === 'percentage' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                    >
                      {t('cashier.itemDiscountDialog.type.percentage')}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{itemDiscountType === 'percentage' ? t('cashier.itemDiscountDialog.amountLabel.percentage') : t('cashier.itemDiscountDialog.amountLabel.nominal')}</p>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={itemDiscountValue}
                    onChange={e => setItemDiscountValue(e.target.value)}
                    placeholder={itemDiscountType === 'percentage' ? t('cashier.itemDiscountDialog.placeholder.percentage') : t('cashier.itemDiscountDialog.placeholder.nominal')}
                    className="h-12 text-lg font-bold text-center"
                    autoFocus
                  />
                  {rawValue > 0 && (
                    <p className={cn('text-xs text-center', exceedsCap ? 'text-destructive' : 'text-muted-foreground')}>
                      {exceedsCap
                        ? t('cashier.itemDiscountDialog.cappedPreview.exceeds', { cap: itemDiscountType === 'percentage' ? '100%' : rp(base) })
                        : t('cashier.itemDiscountDialog.cappedPreview.normal', { amount: rp(previewAmount), subtotal: rp(Math.max(0, base - previewAmount)) })}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {target.discountType && (
                    <Button
                      variant="outline"
                      className="h-11 text-destructive border-destructive/30"
                      onClick={clearItemDiscount}
                    >
                      {t('cashier.itemDiscountDialog.delete')}
                    </Button>
                  )}
                  <Button className="flex-1 h-11 font-semibold" onClick={saveItemDiscount}>
                    {t('cashier.itemDiscountDialog.save')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {lastTransaction && (
        <Receipt
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          transaction={lastTransaction}
          items={lastTxItems}
          storeSettings={storeSettings}
          paymentMethodName={
            lastTransaction.debtAmount
              ? (lastTransaction.paymentAmount > 0
                  ? `${paymentMethods?.find(pm => pm.id === lastTransaction.paymentMethodId)?.name || t('cashier.paymentMethod.initialPayment')} + ${t('cashier.paymentMethod.debt')}`
                  : t('cashier.paymentMethod.debt'))
              : paymentMethods?.find(pm => pm.id === lastTransaction.paymentMethodId)?.name || t('cashier.paymentMethod.cash')
          }
          cashierName={lastTransaction.createdBy ? allUsers?.find(u => u.id === lastTransaction.createdBy)?.name : undefined}
        />
      )}



      {/* Cancel Open Bill Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cashier.cancelDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cashier.cancelDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTargetTx(null)}>{t('cashier.cancelDialog.no')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelTargetTx && cancelOpenBill(cancelTargetTx)}
            >
              {t('cashier.cancelDialog.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sub-Menu Selection Dialog ── */}
      <Dialog open={!!subMenuProduct} onOpenChange={v => { if (!v) { setSubMenuProduct(null); setSubMenuGroups([]); setSubMenuSelections({}); } }}>
        <DialogContent className="max-w-[95vw] rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ListPlus className="w-4 h-4 text-primary" />
              {subMenuProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            {subMenuGroups.map(group => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{group.name}</p>
                  {group.isRequired === 1 && (
                    <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">Wajib</span>
                  )}
                  {group.isMultiSelect === 1 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Bisa pilih banyak</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map(opt => {
                    const isSelected = (subMenuSelections[group.id!] ?? []).includes(opt.id!);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSubMenuSelections(prev => {
                            const cur = prev[group.id!] ?? [];
                            if (group.isMultiSelect === 1) {
                              // Multi: toggle
                              return {
                                ...prev,
                                [group.id!]: isSelected
                                  ? cur.filter(id => id !== opt.id!)
                                  : [...cur, opt.id!],
                              };
                            } else {
                              // Single: replace
                              return { ...prev, [group.id!]: isSelected ? [] : [opt.id!] };
                            }
                          });
                        }}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary/40'
                        )}
                      >
                        <p className="text-sm font-medium truncate">{opt.name}</p>
                        {opt.additionalPrice > 0 && (
                          <p className="text-xs text-primary mt-0.5">+{rp(opt.additionalPrice)}</p>
                        )}
                        {opt.additionalPrice === 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">Gratis</p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pengatur jumlah untuk opsi terpilih pada grup multi-select (mis. sosis ×2) */}
                {group.isMultiSelect === 1 && (subMenuSelections[group.id!] ?? []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {(subMenuSelections[group.id!] ?? []).map(optId => {
                      const opt = group.options.find(o => o.id === optId);
                      if (!opt) return null;
                      const qty = Math.max(1, subMenuQty[optId] ?? 1);
                      return (
                        <div key={optId} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-1.5">
                          <span className="text-xs font-medium truncate flex-1">
                            {opt.name}{opt.additionalPrice > 0 ? ` (+${rp(opt.additionalPrice)})` : ''}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                              onClick={() => setSubMenuQty(prev => ({ ...prev, [optId]: Math.max(1, (prev[optId] ?? 1) - 1) }))}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-semibold w-5 text-center">{qty}</span>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                              onClick={() => setSubMenuQty(prev => ({ ...prev, [optId]: (prev[optId] ?? 1) + 1 }))}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Ringkasan harga tambahan */}
            {(() => {
              const totalExtra = subMenuGroups.flatMap(g =>
                (subMenuSelections[g.id!] ?? []).map(optId => {
                  const opt = g.options.find(o => o.id === optId);
                  const q = g.isMultiSelect === 1 ? Math.max(1, subMenuQty[optId] ?? 1) : 1;
                  return (opt?.additionalPrice ?? 0) * q;
                })
              ).reduce((s, v) => s + v, 0);
              return totalExtra > 0 ? (
                <div className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2">
                  <span className="text-sm text-muted-foreground">Harga dasar</span>
                  <span className="text-sm font-semibold">{rp((subMenuProduct?.price ?? 0) + totalExtra)}</span>
                </div>
              ) : null;
            })()}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setSubMenuProduct(null); setSubMenuGroups([]); setSubMenuSelections({}); setSubMenuQty({}); }}
              >
                Batal
              </Button>
              <Button className="flex-1 h-11 font-semibold" onClick={confirmSubMenuAndAdd}>
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Tambah ke Keranjang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
