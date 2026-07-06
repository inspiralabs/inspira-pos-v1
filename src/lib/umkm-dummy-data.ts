import { db } from './db';

export type UmkmTypeId =
  | 'seblak'
  | 'fried-chicken'
  | 'bakso'
  | 'mie-ayam'
  | 'soto'
  | 'nasi-goreng'
  | 'kopi';

export const UMKM_TYPES: { id: UmkmTypeId; emoji: string }[] = [
  { id: 'seblak', emoji: '🌶️' },
  { id: 'fried-chicken', emoji: '🍗' },
  { id: 'bakso', emoji: '🍜' },
  { id: 'mie-ayam', emoji: '🍝' },
  { id: 'soto', emoji: '🥣' },
  { id: 'nasi-goreng', emoji: '🍛' },
  { id: 'kopi', emoji: '☕' },
];

type RawProduct = {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  hpp: number;
  stock: number;
  unit: string;
  description?: string;
};

type RawSupplier = { name: string; phone: string; address: string; notes: string };

type TxLine = { sku: string; qty: number };

type Profile = {
  products: RawProduct[];
  suppliers: RawSupplier[];
  transactions: { receiptNumber: string; paymentMethodId: number; lines: TxLine[]; hoursAgo: number }[];
};

const now = () => new Date();
const discNull: 'percentage' | 'nominal' | null = null;

function profile(products: RawProduct[], suppliers: RawSupplier[], transactions: Profile['transactions']): Profile {
  return { products, suppliers, transactions };
}

const PROFILES: Record<UmkmTypeId, Profile> = {
  seblak: profile(
    [
      { name: 'Seblak Original', sku: 'SB001', categoryId: 1, price: 12000, hpp: 5000, stock: 40, unit: 'porsi' },
      { name: 'Seblak Spesial', sku: 'SB002', categoryId: 1, price: 15000, hpp: 6500, stock: 35, unit: 'porsi' },
      { name: 'Seblak Mie', sku: 'SB003', categoryId: 1, price: 13000, hpp: 5500, stock: 30, unit: 'porsi' },
      { name: 'Ceker Mercon', sku: 'SB004', categoryId: 1, price: 10000, hpp: 4500, stock: 25, unit: 'porsi' },
      { name: 'Baso Aci', sku: 'SB005', categoryId: 1, price: 8000, hpp: 3000, stock: 50, unit: 'pcs' },
      { name: 'Es Teh Manis', sku: 'SB006', categoryId: 2, price: 5000, hpp: 1500, stock: 80, unit: 'gelas' },
      { name: 'Es Jeruk', sku: 'SB007', categoryId: 2, price: 7000, hpp: 2500, stock: 60, unit: 'gelas' },
      { name: 'Kerupuk', sku: 'SB008', categoryId: 3, price: 2000, hpp: 800, stock: 100, unit: 'bungkus' },
    ],
    [
      { name: 'Toko Bumbu Mak Nyonya', phone: '08111222333', address: 'Pasar Induk', notes: 'Bumbu seblak & kerupuk' },
      { name: 'Grosir Minuman Segar', phone: '08222333444', address: 'Jl. Raya', notes: 'Teh & jeruk' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 2, lines: [{ sku: 'SB001', qty: 2 }, { sku: 'SB006', qty: 2 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 3, hoursAgo: 1, lines: [{ sku: 'SB002', qty: 1 }, { sku: 'SB004', qty: 1 }] },
    ],
  ),
  'fried-chicken': profile(
    [
      { name: 'Ayam Goreng 1 Ekor', sku: 'FC001', categoryId: 1, price: 35000, hpp: 22000, stock: 20, unit: 'porsi' },
      { name: 'Ayam Goreng 1/2 Ekor', sku: 'FC002', categoryId: 1, price: 20000, hpp: 12000, stock: 25, unit: 'porsi' },
      { name: 'Paket Sayap 5 pcs', sku: 'FC003', categoryId: 1, price: 18000, hpp: 9000, stock: 30, unit: 'porsi' },
      { name: 'Paket Paha 3 pcs', sku: 'FC004', categoryId: 1, price: 22000, hpp: 11000, stock: 28, unit: 'porsi' },
      { name: 'Nasi Putih', sku: 'FC005', categoryId: 1, price: 5000, hpp: 2000, stock: 50, unit: 'porsi' },
      { name: 'Sambal Terasi', sku: 'FC006', categoryId: 1, price: 3000, hpp: 1000, stock: 40, unit: 'pcs' },
      { name: 'Es Teh Manis', sku: 'FC007', categoryId: 2, price: 5000, hpp: 1500, stock: 80, unit: 'gelas' },
      { name: 'Lalapan', sku: 'FC008', categoryId: 3, price: 4000, hpp: 1500, stock: 35, unit: 'porsi' },
    ],
    [
      { name: 'Supplier Ayam Potong Jaya', phone: '08123456789', address: 'Pasar Unggas', notes: 'Ayam segar harian' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 3, lines: [{ sku: 'FC002', qty: 1 }, { sku: 'FC005', qty: 1 }, { sku: 'FC007', qty: 1 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 1, hoursAgo: 1, lines: [{ sku: 'FC003', qty: 2 }] },
    ],
  ),
  bakso: profile(
    [
      { name: 'Bakso Urat', sku: 'BK001', categoryId: 1, price: 15000, hpp: 7000, stock: 40, unit: 'mangkok' },
      { name: 'Bakso Halus', sku: 'BK002', categoryId: 1, price: 12000, hpp: 5500, stock: 45, unit: 'mangkok' },
      { name: 'Mie Bakso', sku: 'BK003', categoryId: 1, price: 14000, hpp: 6000, stock: 35, unit: 'mangkok' },
      { name: 'Bakso Mercon', sku: 'BK004', categoryId: 1, price: 16000, hpp: 7500, stock: 30, unit: 'mangkok' },
      { name: 'Siomay Goreng (5 pcs)', sku: 'BK005', categoryId: 1, price: 10000, hpp: 4000, stock: 25, unit: 'porsi' },
      { name: 'Es Teh Manis', sku: 'BK006', categoryId: 2, price: 5000, hpp: 1500, stock: 100, unit: 'gelas' },
      { name: 'Kerupuk', sku: 'BK007', categoryId: 3, price: 2000, hpp: 800, stock: 120, unit: 'bungkus' },
    ],
    [
      { name: 'Pabrik Bakso Sentosa', phone: '08199887766', address: 'Kawasan Industri', notes: 'Bakso & siomay frozen' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 2, lines: [{ sku: 'BK001', qty: 2 }, { sku: 'BK006', qty: 2 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 3, hoursAgo: 0.5, lines: [{ sku: 'BK003', qty: 1 }, { sku: 'BK005', qty: 1 }] },
    ],
  ),
  'mie-ayam': profile(
    [
      { name: 'Mie Ayam Biasa', sku: 'MA001', categoryId: 1, price: 12000, hpp: 5000, stock: 50, unit: 'porsi' },
      { name: 'Mie Ayam Spesial', sku: 'MA002', categoryId: 1, price: 15000, hpp: 6500, stock: 40, unit: 'porsi' },
      { name: 'Mie Ayam Bakso', sku: 'MA003', categoryId: 1, price: 16000, hpp: 7000, stock: 35, unit: 'porsi' },
      { name: 'Pangsit Goreng (5 pcs)', sku: 'MA004', categoryId: 1, price: 8000, hpp: 3000, stock: 30, unit: 'porsi' },
      { name: 'Dimsum (3 pcs)', sku: 'MA005', categoryId: 1, price: 10000, hpp: 4000, stock: 25, unit: 'porsi' },
      { name: 'Es Teh Manis', sku: 'MA006', categoryId: 2, price: 5000, hpp: 1500, stock: 90, unit: 'gelas' },
      { name: 'Es Jeruk', sku: 'MA007', categoryId: 2, price: 7000, hpp: 2500, stock: 70, unit: 'gelas' },
    ],
    [
      { name: 'Grosir Mie Basah Pak Budi', phone: '08155667788', address: 'Pasar Pagi', notes: 'Mie & pangsit' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 1, lines: [{ sku: 'MA002', qty: 2 }, { sku: 'MA006', qty: 2 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 1, hoursAgo: 0.25, lines: [{ sku: 'MA001', qty: 1 }, { sku: 'MA004', qty: 1 }] },
    ],
  ),
  soto: profile(
    [
      { name: 'Soto Ayam', sku: 'ST001', categoryId: 1, price: 15000, hpp: 7000, stock: 40, unit: 'mangkok' },
      { name: 'Soto Betawi', sku: 'ST002', categoryId: 1, price: 18000, hpp: 9000, stock: 30, unit: 'mangkok' },
      { name: 'Soto Lamongan', sku: 'ST003', categoryId: 1, price: 16000, hpp: 7500, stock: 35, unit: 'mangkok' },
      { name: 'Tempe Goreng', sku: 'ST004', categoryId: 1, price: 3000, hpp: 1200, stock: 50, unit: 'pcs' },
      { name: 'Kerupuk Udang', sku: 'ST005', categoryId: 3, price: 2000, hpp: 800, stock: 80, unit: 'bungkus' },
      { name: 'Es Teh Manis', sku: 'ST006', categoryId: 2, price: 5000, hpp: 1500, stock: 100, unit: 'gelas' },
      { name: 'Teh Hangat', sku: 'ST007', categoryId: 2, price: 4000, hpp: 1000, stock: 60, unit: 'gelas' },
    ],
    [
      { name: 'Supplier Daging Sapi Segar', phone: '08166778899', address: 'Pasar Daging', notes: 'Daging soto & ayam' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 2, lines: [{ sku: 'ST001', qty: 2 }, { sku: 'ST006', qty: 2 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 3, hoursAgo: 1, lines: [{ sku: 'ST002', qty: 1 }, { sku: 'ST004', qty: 2 }] },
    ],
  ),
  'nasi-goreng': profile(
    [
      { name: 'Nasi Goreng Spesial', sku: 'NG001', categoryId: 1, price: 15000, hpp: 8000, stock: 50, unit: 'porsi' },
      { name: 'Nasi Goreng Seafood', sku: 'NG002', categoryId: 1, price: 20000, hpp: 11000, stock: 30, unit: 'porsi' },
      { name: 'Nasi Goreng Kampung', sku: 'NG003', categoryId: 1, price: 13000, hpp: 6500, stock: 40, unit: 'porsi' },
      { name: 'Mie Goreng', sku: 'NG004', categoryId: 1, price: 12000, hpp: 6000, stock: 40, unit: 'porsi' },
      { name: 'Telur Dadar', sku: 'NG005', categoryId: 1, price: 5000, hpp: 2000, stock: 60, unit: 'pcs' },
      { name: 'Es Teh Manis', sku: 'NG006', categoryId: 2, price: 5000, hpp: 1500, stock: 100, unit: 'gelas' },
      { name: 'Es Jeruk', sku: 'NG007', categoryId: 2, price: 7000, hpp: 2500, stock: 80, unit: 'gelas' },
      { name: 'Kerupuk', sku: 'NG008', categoryId: 3, price: 2000, hpp: 800, stock: 150, unit: 'bungkus' },
    ],
    [
      { name: 'PT Bahan Segar', phone: '08111222333', address: 'Jl. Pasar Baru No. 15', notes: 'Beras, telur, bumbu' },
      { name: 'UD Minuman Jaya', phone: '08222333444', address: 'Jl. Raya Industri', notes: 'Minuman' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 1, lines: [{ sku: 'NG001', qty: 2 }, { sku: 'NG006', qty: 2 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 3, hoursAgo: 0.5, lines: [{ sku: 'NG002', qty: 1 }, { sku: 'NG005', qty: 1 }] },
    ],
  ),
  kopi: profile(
    [
      { name: 'Kopi Susu', sku: 'KP001', categoryId: 2, price: 12000, hpp: 4500, stock: 60, unit: 'gelas' },
      { name: 'Es Kopi Susu', sku: 'KP002', categoryId: 2, price: 13000, hpp: 5000, stock: 55, unit: 'gelas' },
      { name: 'Kopi Hitam', sku: 'KP003', categoryId: 2, price: 8000, hpp: 2500, stock: 70, unit: 'gelas' },
      { name: 'Es Teh Manis', sku: 'KP004', categoryId: 2, price: 5000, hpp: 1500, stock: 100, unit: 'gelas' },
      { name: 'Es Jeruk', sku: 'KP005', categoryId: 2, price: 7000, hpp: 2500, stock: 80, unit: 'gelas' },
      { name: 'Roti Bakar Coklat', sku: 'KP006', categoryId: 1, price: 10000, hpp: 4000, stock: 25, unit: 'pcs' },
      { name: 'Pisang Goreng', sku: 'KP007', categoryId: 1, price: 8000, hpp: 3000, stock: 30, unit: 'porsi' },
      { name: 'Air Mineral', sku: 'KP008', categoryId: 2, price: 4000, hpp: 2000, stock: 120, unit: 'botol' },
    ],
    [
      { name: 'Distributor Kopi Nusantara', phone: '08133445566', address: 'Gudang Kopi', notes: 'Biji kopi & gula aren' },
    ],
    [
      { receiptNumber: 'TX-DEMO-001', paymentMethodId: 1, hoursAgo: 1, lines: [{ sku: 'KP001', qty: 2 }, { sku: 'KP006', qty: 1 }] },
      { receiptNumber: 'TX-DEMO-002', paymentMethodId: 3, hoursAgo: 0.5, lines: [{ sku: 'KP002', qty: 2 }, { sku: 'KP004', qty: 1 }] },
    ],
  ),
};

async function ensureUnits(units: string[]) {
  const existing = await db.units.toArray();
  const seen = new Set(existing.map((u) => u.name));
  const t = now();
  for (const name of units) {
    if (seen.has(name)) continue;
    try {
      await db.units.add({ name, isDefault: 1, createdAt: t, isDeleted: 0, deletedAt: null });
      seen.add(name);
    } catch {
      // race on unique — ignore
    }
  }
}

export async function seedUmkmDummy(typeId: UmkmTypeId): Promise<void> {
  const { products, suppliers, transactions } = PROFILES[typeId];
  const t = now();

  await ensureUnits([...new Set(products.map((p) => p.unit))]);

  const productRows = products.map((p) => ({
    ...p,
    createdAt: t,
    updatedAt: t,
    isDeleted: 0 as const,
    deletedAt: null,
  }));
  await db.products.bulkAdd(productRows);
  await db.suppliers.bulkAdd(
    suppliers.map((s) => ({ ...s, createdAt: t, isDeleted: 0, deletedAt: null })),
  );

  const saved = await db.products.toArray();
  const bySku = new Map(saved.map((p) => [p.sku, p]));

  for (const tx of transactions) {
    let subtotal = 0;
    let profit = 0;
    const items: { productId: number; productName: string; quantity: number; price: number; hpp: number; subtotal: number }[] = [];
    for (const line of tx.lines) {
      const p = bySku.get(line.sku);
      if (!p?.id) continue;
      const lineSub = p.price * line.qty;
      subtotal += lineSub;
      profit += (p.price - p.hpp) * line.qty;
      items.push({
        productId: p.id,
        productName: p.name,
        quantity: line.qty,
        price: p.price,
        hpp: p.hpp,
        subtotal: lineSub,
      });
    }
    if (items.length === 0) continue;

    const txId = await db.transactions.add({
      subtotal,
      discountType: discNull,
      discountValue: 0,
      discountAmount: 0,
      total: subtotal,
      paymentMethodId: tx.paymentMethodId,
      paymentAmount: subtotal,
      change: 0,
      profit,
      date: new Date(t.getTime() - tx.hoursAgo * 3600000),
      receiptNumber: tx.receiptNumber,
    });
    await db.transactionItems.bulkAdd(
      items.map((i) => ({
        transactionId: txId as number,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
        hpp: i.hpp,
        discountType: discNull,
        discountValue: 0,
        discountAmount: 0,
        subtotal: i.subtotal,
      })),
    );
  }
}
