export type PlanTier = 'LITE' | 'PRO';

export const PLAN_FEATURES: Record<PlanTier, Record<string, boolean>> = {
  LITE: {
    // Transaksi
    void_transaction: false,
    split_bill: false,
    // Stok
    supplier_management: false,
    // User & Akses
    multi_user: false,
    pin_login: false,
    granular_permissions: false,
    shift_management: false,
    // Pelanggan & Hutang
    customer_database: false,
    debt_management: false,
    // Pengeluaran
    expense_tracking: false,
    // Laporan
    report_30_days: true,
    report_per_cashier: false,
    profit_loss_report: false,
    export_pdf: true,
    export_excel: true,
  },
  PRO: {
    // Transaksi
    void_transaction: true,
    split_bill: true,
    // Stok
    supplier_management: true,
    // User & Akses
    multi_user: true,
    pin_login: true,
    granular_permissions: true,
    shift_management: true,
    // Pelanggan & Hutang
    customer_database: true,
    debt_management: true,
    // Pengeluaran
    expense_tracking: true,
    // Laporan
    report_30_days: true,
    report_per_cashier: true,
    profit_loss_report: true,
    export_pdf: true,
    export_excel: true,
  },
};
