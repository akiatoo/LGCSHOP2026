
export type UserRole = 'admin' | 'staff' | 'accountant' | 'manager';
export type LayoutMode = 'sidebar' | 'hybrid';

export interface UIConfig {
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  borderWidth: string;
  
  // 1. Khung Bố cục Hệ thống (Mới)
  sysBorderWidth: number;
  sysRounding: number;
  sysBorderColor: string;
  sysSidebarWidth: number;
  sysHeaderFontSize: number;
  sysShowGrid: boolean;
  sysGridOpacity: number;

  // 2. Khung Modal
  modalBorderWidth: number;
  modalRounding: number;
  modalBorderColor: string;
  modalWidth: number;
  modalMaxHeight: number;
  modalLabelFontSize: number;
  modalLabelColor: string;
  showGridPattern: boolean;
  gridOpacity: number;
  
  // 3. Kích thước ô nhập TRONG MODAL
  modalInputHeight: number;
  modalInputBorderWidth: number;
  modalInputRounding: number;
  modalInputBorderColor: string;
  modalInputTextColor: string;
  modalInputPaddingX: number;
  modalInputPaddingY: number;
  modalInputFontSize: number;
  modalInputGap: number;

  // 4. Ô nhập liệu toàn cục (ngoài Modal)
  inputHeight: number;
  inputBorderWidth: number; 
  inputBorderColor: string;
  inputRounding: number;
  inputFocusColor: string;
  inputPaddingX: number;
  inputPaddingY: number;
  inputFontSize: number;
  
  // Bố cục chung khác
  inputGap: number;
  inputColumns: number;
  labelFontSize: number;
  shadowOffset: string;
  shadowColor: string;
  borderRadius: string;
  fontWeight: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  layoutMode: LayoutMode;
}

export interface BaseModel {
  id: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface SystemSettings extends BaseModel {
  vatRates: number[];
  defaultVatRate: number;
  currencySymbol: string;
  localPersistenceEnabled: boolean;
  rolePermissions: Record<UserRole, View[]>;
  uiConfig: UIConfig;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    taxCode: string;
    website: string;
  };
  invoiceOptions?: {
    showCompanyInfo: boolean;
    showCustomerInfo: boolean;
    showQRCode: boolean;
    showSignatures: boolean;
    showStaffName: boolean;
  };
}

export interface Category extends BaseModel {
  name: string;
}

export interface ProductComponent {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Product extends BaseModel {
  sku: string;           
  name: string;
  categoryId: string;    
  categoryName: string;  
  category?: string; 
  price: number;         
  costPrice: number;     
  stock: number;         
  minStock: number;      
  unit: string;          
  image: string;
  type: 'product' | 'service' | 'material';
  warrantyPeriod: number; 
  hasSerial: boolean;
  vatRate: number;
  description?: string;
  specifications?: string;
  components?: ProductComponent[];
}

export interface CartItem extends Product {
  quantity: number;
  isGift: boolean;
  serials: string[];
  appliedPrice: number;  
  vatAmount: number;
  pointsRequired?: number;
}

export interface Order extends BaseModel {
  code: string;          
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;      
  discountAmount: number; 
  vatTotal: number;      
  total: number;         
  paymentMethod: 'cash' | 'transfer' | 'credit';
  status: 'completed' | 'cancelled' | 'returned';
  staffName: string;
  timestamp: number;
  note?: string;
}

export interface Customer extends BaseModel {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  taxCode?: string;
  companyName?: string;
  lastPurchaseDate?: number;
}

export interface Supplier extends BaseModel {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  debt: number;
}

export interface User extends BaseModel {
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export interface Gift extends BaseModel {
  name: string;
  pointsRequired: number;
  stock: number;
  description: string;
  image: string;
  productId?: string;
}

export interface WarrantyItem extends BaseModel {
  serialNumber: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  purchaseDate: number;
  expiryDate: number;
  durationMonths: number;
  status: 'active' | 'expired' | 'repairing' | 'void';
  notes: string;
  orderId: string;
  history: Array<{
    date: number;
    action: string;
    note: string;
  }>;
}

export type TransactionType = 'import' | 'export' | 'sale' | 'return' | 'scrap' | 'internal' | 'production';

export interface InventoryTransaction extends BaseModel {
  code: string;
  productId: string;
  productName: string;
  sku: string;
  type: TransactionType;
  quantity: number;
  balance: number;
  oldStock: number;
  newStock: number;
  timestamp: number;
  unitPrice: number;
  referenceId?: string;
  refDocDate?: number;
  receiver?: string; // Mới: Họ tên người giao/nhận hàng
  supplierName?: string;
  note?: string;
}

export interface PrintTemplate extends BaseModel {
  name: string;
  type: string;
  content: string;
  description: string;
}

export interface AuditLog extends BaseModel {
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface Expense extends BaseModel {
  amount: number;
  description: string;
  date: number;
}

export type View = 'pos' | 'inventory' | 'materials' | 'orders' | 'customers' | 'suppliers' | 'gifts' | 'warranty' | 'dashboard' | 'settings' | 'audit';
