
import { ProductRepo } from "../database/productRepo";
import { OrderRepo } from "../database/orderRepo";
import { CustomerRepo } from "../database/customerRepo";
import { SystemRepo } from "../database/systemRepo";
import { TemplateRepo } from "../database/templateRepo";
import { getCurrentUserSync, withTimestamp, cleanupData } from "../database/base";
import { db } from "../database/config";
import { LocalDB } from "../database/localDb";
// Fix: Use namespace import for firestore to bypass named export errors in specific TypeScript configurations
import * as firestore from "firebase/firestore";
const { collection, getDocs, writeBatch, doc, getDoc, setDoc, deleteDoc, query, orderBy } = firestore as any;
import { COLLECTIONS } from "../database/collections";
import { Order, WarrantyItem, SystemSettings, UIConfig, Expense, Category, Product, Supplier, Customer, User, Gift, PrintTemplate, AuditLog } from '../types';

export const DEFAULT_UI_CONFIG: UIConfig = {
  primaryColor: '#0284c7',
  secondaryColor: '#f1f5f9',
  borderColor: '#E5E7EB',
  borderWidth: '1px',
  
  // 1. Khung Bố cục Hệ thống
  sysBorderWidth: 1,
  sysRounding: 0,
  sysBorderColor: '#E5E7EB',
  sysSidebarWidth: 280,
  sysHeaderFontSize: 20,
  sysShowGrid: false,
  sysGridOpacity: 5,

  // 2. Khung Modal
  modalBorderWidth: 3,
  modalRounding: 40,
  modalBorderColor: '#cbd5e1',
  modalWidth: 640,
  modalMaxHeight: 90,
  modalLabelFontSize: 10,
  modalLabelColor: '#94a3b8',
  showGridPattern: false, 
  gridOpacity: 0, 

  // 3. Kích thước ô nhập TRONG MODAL
  modalInputHeight: 48,
  modalInputBorderWidth: 2,
  modalInputRounding: 16,
  modalInputBorderColor: '#e2e8f0',
  modalInputTextColor: '#000000',
  modalInputPaddingX: 20,
  modalInputPaddingY: 16,
  modalInputFontSize: 14,
  modalInputGap: 24,

  // 4. Ô nhập liệu toàn cục
  inputHeight: 44,
  inputBorderWidth: 2,
  inputBorderColor: '#e2e8f0',
  inputRounding: 16,
  inputFocusColor: '#0284c7',
  inputPaddingX: 16,
  inputPaddingY: 10,
  inputFontSize: 12,

  // Bố cục mặc định khác
  inputGap: 24,
  inputColumns: 2,
  labelFontSize: 10,
  shadowOffset: '10px',
  shadowColor: 'rgba(2,132,199,0.1)',
  borderRadius: '24px',
  fontWeight: '700',
  tableHeaderBg: '#F9FAFB',
  tableHeaderColor: '#6B7280',
  layoutMode: 'sidebar' 
};

export const StorageService = {
  getCurrentUserSync,
  getNextDocumentNumber: SystemRepo.getNextDocumentNumber,
  
  getPendingOrders: () => LocalDB.getAll<Order>(COLLECTIONS.PENDING_ORDERS),
  savePendingOrder: async (order: Order) => LocalDB.put(COLLECTIONS.PENDING_ORDERS, { ...order }),

  syncPendingOrders: async () => {
    const pending = await StorageService.getPendingOrders();
    let successCount = 0;
    for (const order of pending) {
        try {
            await OrderRepo.saveOrder(order);
            await LocalDB.delete(COLLECTIONS.PENDING_ORDERS, order.id);
            successCount++;
        } catch {}
    }
    return successCount;
  },

  syncAllFromCloud: async () => {
    const collectionsToSync = [
      COLLECTIONS.PRODUCTS, COLLECTIONS.CATEGORIES, COLLECTIONS.ORDERS, 
      COLLECTIONS.CUSTOMERS, COLLECTIONS.SUPPLIERS, COLLECTIONS.GIFTS, 
      COLLECTIONS.TRANSACTIONS, COLLECTIONS.WARRANTIES, COLLECTIONS.USERS, 
      COLLECTIONS.TEMPLATES, COLLECTIONS.SETTINGS, COLLECTIONS.EXPENSES
    ];
    for (const col of collectionsToSync) {
      // Fix: Use direct function calls for modular firestore access
      const snap = await getDocs(collection(db, col));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      await LocalDB.putBatch(col, items);
    }
  },

  importAllData: async (data: any) => {
    // Fix: Use writeBatch from destructured firestore
    const batch = writeBatch(db);
    const collectionsMap: Record<string, any[]> = {
      [COLLECTIONS.PRODUCTS]: data.p,
      [COLLECTIONS.ORDERS]: data.o,
      [COLLECTIONS.CUSTOMERS]: data.c,
      [COLLECTIONS.SUPPLIERS]: data.s,
      [COLLECTIONS.WARRANTIES]: data.w,
      [COLLECTIONS.USERS]: data.u,
      [COLLECTIONS.GIFTS]: data.g,
      [COLLECTIONS.TEMPLATES]: data.t,
      [COLLECTIONS.SETTINGS]: data.settings ? [data.settings] : [],
      [COLLECTIONS.EXPENSES]: data.expenses,
    };

    for (const [col, items] of Object.entries(collectionsMap)) {
      if (!items) continue;
      items.forEach(item => {
        if (item) {
          const docId = col === COLLECTIONS.SETTINGS ? 'global' : item.id;
          // Fix: Use doc from destructured firestore
          if (docId) batch.set(doc(db, col, docId), item);
        }
      });
    }
    await batch.commit();
    await SystemRepo.logAction('IMPORT_DATA', 'Thực hiện khôi phục dữ liệu từ file backup.');
  },

  getExpenses: async (): Promise<Expense[]> => {
    try {
        // Fix: Use modular query components
        const snap = await getDocs(query(collection(db, COLLECTIONS.EXPENSES), orderBy('date', 'desc')));
        return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[];
    } catch { return []; }
  },

  saveExpense: async (exp: Expense) => {
    const isNew = !exp.createdAt;
    // Fix: Use modular setDoc and doc
    await setDoc(doc(db, COLLECTIONS.EXPENSES, exp.id), withTimestamp(exp, isNew));
    await SystemRepo.logAction(isNew ? 'CREATE_EXPENSE' : 'UPDATE_EXPENSE', `${isNew ? 'Ghi nhận' : 'Cập nhật'} chi phí: ${exp.description} (${exp.amount}đ)`);
  },

  deleteExpense: async (id: string) => {
    // Fix: Use modular Firestore functions
    const ref = doc(db, COLLECTIONS.EXPENSES, id);
    const snap = await getDoc(ref);
    const desc = snap.exists() ? snap.data().description : id;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_EXPENSE', `Xóa phiếu chi phí: ${desc}`);
  },

  getSettings: async (): Promise<SystemSettings> => {
    const defaultS: SystemSettings = {
        id: 'global', vatRates: [0, 5, 8, 10], defaultVatRate: 10, currencySymbol: '₫', localPersistenceEnabled: false,
        rolePermissions: {
            admin: ['pos', 'inventory', 'materials', 'orders', 'customers', 'suppliers', 'gifts', 'warranty', 'dashboard', 'settings', 'audit'],
            manager: ['pos', 'inventory', 'materials', 'orders', 'customers', 'suppliers', 'gifts', 'warranty', 'dashboard', 'settings', 'audit'],
            accountant: ['inventory', 'materials', 'orders', 'customers', 'suppliers', 'dashboard'],
            staff: ['pos', 'orders', 'customers', 'gifts', 'warranty']
        },
        uiConfig: DEFAULT_UI_CONFIG,
        createdAt: Date.now(), updatedAt: Date.now(), isActive: true
    };
    try {
        // Fix: Use modular getDoc
        const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'global'));
        return snap.exists() ? { ...defaultS, ...snap.data() } : defaultS;
    } catch { return defaultS; }
  },

  saveSettings: async (s: SystemSettings) => {
    // Fix: Use modular setDoc
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), withTimestamp(s, false));
    await SystemRepo.logAction('UPDATE_SETTINGS', 'Cập nhật cấu hình hệ thống/giao diện.');
  },

  getProducts: ProductRepo.getProducts,
  saveProduct: ProductRepo.saveProduct,
  deleteProduct: ProductRepo.deleteProduct,
  getCategories: ProductRepo.getCategories,
  saveCategory: ProductRepo.saveCategory,
  deleteCategory: ProductRepo.deleteCategory,

  getOrders: OrderRepo.getOrders,
  getOrdersByCustomer: OrderRepo.getOrdersByCustomer, 
  saveOrder: OrderRepo.saveOrder,
  cancelOrder: OrderRepo.cancelOrder,
  updateOrderMetadata: OrderRepo.updateOrderMetadata,
  deleteOrderPermanently: OrderRepo.deleteOrderPermanently,
  getTransactions: OrderRepo.getTransactions,

  getCustomers: CustomerRepo.getCustomers,
  saveCustomer: CustomerRepo.saveCustomer,
  saveCustomers: CustomerRepo.saveCustomers,
  deleteCustomer: CustomerRepo.deleteCustomer,
  getSuppliers: CustomerRepo.getSuppliers,
  saveSupplier: CustomerRepo.saveSupplier,
  saveSuppliers: CustomerRepo.saveSuppliers,
  deleteSupplier: CustomerRepo.deleteSupplier,

  getWarranties: OrderRepo.getWarranties,
  saveWarranty: OrderRepo.saveWarranty, 
  deleteWarranty: OrderRepo.deleteWarranty, 

  getUsers: SystemRepo.getUsers,
  saveUser: SystemRepo.saveUser,
  deleteUser: SystemRepo.deleteUser,
  login: SystemRepo.login,
  logout: async () => {
    await SystemRepo.logAction('LOGOUT', 'Người dùng đăng xuất khỏi phiên làm việc.');
    localStorage.removeItem('vietpos_session_user');
  },
  changePassword: (old: string, next: string) => SystemRepo.updateUserPassword(old, next),

  getTemplates: TemplateRepo.getTemplates,
  getTemplateByType: TemplateRepo.getTemplateByType,
  saveTemplate: async (t: PrintTemplate) => {
    await TemplateRepo.saveTemplate(t);
    await SystemRepo.logAction('UPDATE_TEMPLATE', `Cập nhật mẫu in: ${t.name}`);
  },
  deleteTemplate: TemplateRepo.deleteTemplate,

  getGifts: SystemRepo.getGifts,
  saveGift: SystemRepo.saveGift,
  deleteGift: SystemRepo.deleteGift,

  getAuditLogs: SystemRepo.getAuditLogs,

  exportAllData: async () => {
    const [p, o, c, s, w, u, g, t, settings, expenses] = await Promise.all([
      ProductRepo.getProducts(), OrderRepo.getOrders(), CustomerRepo.getCustomers(),
      CustomerRepo.getSuppliers(), OrderRepo.getWarranties(), SystemRepo.getUsers(),
      SystemRepo.getGifts(), TemplateRepo.getTemplates(), StorageService.getSettings(),
      StorageService.getExpenses()
    ]);
    const blob = new Blob([JSON.stringify({p, o, c, s, w, u, g, t, settings, expenses})], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lgc_backup_${new Date().getTime()}.json`; a.click();
    await SystemRepo.logAction('EXPORT_DATA', 'Thực hiện sao lưu toàn bộ dữ liệu hệ thống ra file.');
  },

  checkConnection: SystemRepo.checkConnection,
  createAdmin: SystemRepo.createAdmin,
  getSmartInsights: SystemRepo.getSmartInsights,
  generateProductDescription: SystemRepo.generateProductDescription,
  resetByRecoveryCode: SystemRepo.resetByRecoveryCode,
  factoryReset: SystemRepo.factoryReset
};
