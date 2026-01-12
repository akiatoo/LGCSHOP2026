
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, CartItem, Customer, Order, Gift, SystemSettings } from '../types';
import { StorageService } from '../services/storageService';
import { printInvoice } from '../services/printService';
import { Badge } from './ui/Base';
import { 
  Minus, Plus, Trash2, ArrowRight, UserPlus, 
  Package2, Search as SearchIcon, 
  Loader2, CreditCard, Wallet, Sparkles,
  ShoppingBag, Tag, Edit2, ScanBarcode, Gift as GiftIcon,
  Receipt
} from 'lucide-react';
import { CustomerModal, SerialModal, GiftModal, DiscountModal } from './pos/POSModals';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-primary-600 text-white'
  };

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 ${styles[type]}`}>
      <span className="text-[12px] font-black uppercase tracking-widest">{message}</span>
    </div>
  );
};

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [activeSerialItem, setActiveSerialItem] = useState<CartItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');

  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadBaseData(); }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  const loadBaseData = async () => {
    const [p, c, g, s] = await Promise.all([
        StorageService.getProducts(),
        StorageService.getCustomers(),
        StorageService.getGifts(),
        StorageService.getSettings()
    ]);
    setProducts(p);
    setCustomers(c);
    setGifts(g);
    setSettings(s);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    if (delta > 0) {
      if (item.quantity >= item.stock) {
        showToast("Hết hàng trong kho", "error");
        return;
      }
      
      // Nếu là quà tri ân đổi điểm, kiểm tra điểm trước khi tăng SL
      if (item.isGift && selectedCustomer) {
        const totalPointsRequired = cart.reduce((sum, i) => sum + (i.isGift ? (i.pointsRequired || 0) * i.quantity : 0), 0) + (item.pointsRequired || 0);
        if (totalPointsRequired > selectedCustomer.loyaltyPoints) {
          showToast("Khách hàng không đủ điểm", "error");
          return;
        }
      }
      
      item.quantity += 1;
    } else {
      if (item.quantity > 1) {
        item.quantity -= 1;
        if (item.hasSerial && item.serials && item.serials.length > item.quantity) {
          item.serials = item.serials.slice(0, item.quantity);
        }
      }
      else newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const toggleGiftStatus = (index: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    // Lưu ý: Chỉ áp dụng toggle cho sản phẩm thường thành Quà KM (0đ)
    // Quà tri ân (đổi điểm) phải thêm từ Modal quà tặng chuyên biệt
    if (item.isGift) {
        showToast("Quà tri ân đổi điểm không thể chuyển thành hàng bán", "info");
        return;
    }

    const isNowPromoGift = item.appliedPrice !== 0;
    item.appliedPrice = isNowPromoGift ? 0 : item.price;
    item.isGift = false; // Luôn là false vì đây là quà khuyến mãi 0đ, không phải quà đổi điểm
    setCart(newCart);
    showToast(isNowPromoGift ? "Đã chuyển thành Quà khuyến mãi" : "Đã khôi phục giá bán", "info");
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast("Sản phẩm đã hết hàng", "error");
      return;
    }
    // Tìm SP thường cùng ID (không phải quà tri ân)
    const existingIndex = cart.findIndex(item => item.id === product.id && !item.isGift);
    if (existingIndex > -1) {
      updateCartQuantity(existingIndex, 1);
    } else {
      setCart([...cart, { ...product, quantity: 1, vatAmount: 0, serials: [], isGift: false, appliedPrice: product.price }]);
    }
  };

  const addGiftToCart = (gift: Gift) => {
    if (!selectedCustomer) {
        showToast("Vui lòng chọn khách hàng trước", "error");
        return;
    }
    const currentPointsSpent = cart.reduce((sum, i) => sum + (i.isGift ? (i.pointsRequired || 0) * i.quantity : 0), 0);
    if (currentPointsSpent + gift.pointsRequired > selectedCustomer.loyaltyPoints) {
        showToast("Khách hàng không đủ điểm tích lũy", "error");
        return;
    }

    const linkedProduct = products.find(p => p.id === gift.productId);
    const existingIndex = cart.findIndex(item => item.id === gift.productId && item.isGift);

    if (existingIndex > -1) {
        updateCartQuantity(existingIndex, 1);
    } else {
        setCart([...cart, { 
            id: gift.productId || `G_${gift.id}`,
            sku: gift.productId ? (linkedProduct?.sku || '') : `GIFT-${gift.id}`,
            name: gift.name,
            price: 0,
            appliedPrice: 0,
            costPrice: linkedProduct?.costPrice || 0,
            stock: gift.stock,
            minStock: 0,
            unit: linkedProduct?.unit || 'Món',
            image: gift.image,
            type: linkedProduct?.type || 'product',
            warrantyPeriod: linkedProduct?.warrantyPeriod || 0,
            hasSerial: linkedProduct?.hasSerial || false,
            vatRate: 0,
            quantity: 1,
            isGift: true, // ĐÁNH DẤU LÀ QUÀ TRI ÂN ĐỔI ĐIỂM
            serials: [],
            vatAmount: 0,
            pointsRequired: gift.pointsRequired,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            categoryId: 'gift',
            categoryName: 'Quà tặng'
        }]);
        showToast("Đã thêm Quà tri ân vào đơn hàng", "success");
    }
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.appliedPrice * item.quantity), 0);
    let discountValue = discountType === 'percent' ? (subtotal * discount) / 100 : discount;
    const afterDiscount = Math.max(0, subtotal - discountValue);
    const vatRate = settings?.defaultVatRate ?? 10;
    const vat = afterDiscount * (vatRate / 100);
    return { subtotal, discountValue, afterDiscount, vat, total: afterDiscount + vat, vatRate };
  }, [cart, discount, discountType, settings]);

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v);

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;

    const incompleteItem = cart.find(item => item.hasSerial && (item.serials?.length || 0) < item.quantity);
    if (incompleteItem) {
      showToast(`Nhập đủ Serial cho "${incompleteItem.name}"`, "error");
      setActiveSerialItem(incompleteItem);
      return;
    }

    if (selectedCustomer) {
        const totalPointsNeeded = cart.reduce((sum, i) => sum + (i.isGift ? (i.pointsRequired || 0) * i.quantity : 0), 0);
        if (totalPointsNeeded > selectedCustomer.loyaltyPoints) {
            showToast("Điểm tích lũy không đủ", "error");
            return;
        }
    }

    setIsProcessing(true);
    try {
      const user = StorageService.getCurrentUserSync();
      const orderData: Order = {
        id: `ORD_${Date.now()}`,
        code: '',
        customerId: selectedCustomer?.id || 'walk-in',
        customerName: selectedCustomer?.name || 'Khách lẻ',
        customerPhone: selectedCustomer?.phone || '',
        items: cart,
        subtotal: totals.subtotal,
        discountAmount: totals.discountValue,
        vatTotal: totals.vat,
        total: totals.total,
        paymentMethod: paymentMethod,
        status: 'completed',
        staffName: user?.fullName || 'N/A',
        timestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true
      };
      const savedOrder = await StorageService.saveOrder(orderData);
      printInvoice(savedOrder);
      setCart([]);
      setDiscount(0);
      setSelectedCustomer(null);
      showToast("Thanh toán thành công", "success");
      loadBaseData();
    } catch (error: any) {
      showToast(error.message || "Lỗi thanh toán", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-[#F9FAFB] flex-col lg:flex-row overflow-hidden relative font-sans">
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className={`flex-1 flex flex-col p-6 lg:p-10 overflow-hidden ${activeTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6 shrink-0">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">Cửa hàng</h2>
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm sản phẩm..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white pl-12 pr-4 !h-11 rounded-2xl border border-slate-200 focus:border-primary-500 font-bold text-slate-700 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none pb-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="flex flex-col group cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-center transition-all group-hover:border-primary-400 group-hover:shadow-lg relative overflow-hidden">
                    <img src={p.image} className="max-w-full max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110" />
                </div>
                <div className="mt-4 px-1 text-center">
                  <h4 className="text-[13px] font-bold text-slate-800 uppercase leading-tight truncate mb-1">{p.name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[14px] font-black text-primary-600 tracking-tight">{formatVND(p.price)}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${p.stock <= 5 ? 'text-rose-500' : 'text-slate-400'}`}>| Tồn: {p.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`w-full lg:w-[600px] xl:w-[680px] flex flex-col bg-white border-l border-slate-100 shadow-xl z-20 ${activeTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Đơn hàng</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsGiftModalOpen(true)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all"><Sparkles className="w-4 h-4"/></button>
            <button onClick={() => setIsCustomerModalOpen(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black border transition-all ${selectedCustomer ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><UserPlus className="w-3.5 h-3.5" /> {selectedCustomer ? selectedCustomer.name.toUpperCase() : 'CHỌN KHÁCH'}</button>
          </div>
        </div>

        <div className="px-6 py-2 bg-slate-50/50 border-b border-slate-100 grid grid-cols-[1fr_90px_110px_100px_40px] items-center text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
            <span>Sản phẩm</span><span className="text-right">Đơn giá</span><span className="text-center">Số lượng</span><span className="text-right">Thành tiền</span><span></span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none divide-y divide-slate-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <Package2 className="w-16 h-16 mb-4 text-slate-400" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Trống</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="grid grid-cols-[1fr_90px_110px_100px_40px] items-center gap-2 px-6 py-4 hover:bg-slate-50/50 transition-all group">
                <div className="min-w-0 flex items-center gap-2">
                    <h5 className="text-[13px] font-bold uppercase truncate text-slate-800 flex-1">{item.name}</h5>
                    <div className="flex items-center gap-1 shrink-0">
                        {item.hasSerial && (<button onClick={() => setActiveSerialItem(item)} className={`p-1 rounded border transition-all ${item.serials?.length === item.quantity ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-primary-50 text-primary-600 border-primary-100'}`}><ScanBarcode className="w-3 h-3" /></button>)}
                        <button onClick={() => toggleGiftStatus(idx)} className={`p-1 rounded border transition-all ${item.isGift ? 'bg-purple-600 text-white border-purple-600' : (item.appliedPrice === 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-300')}`} title={item.isGift ? "Quà tri ân" : (item.appliedPrice === 0 ? "Quà khuyến mãi" : "Hàng bán")}><GiftIcon className="w-3 h-3" /></button>
                    </div>
                </div>
                <div className="text-right"><span className="text-[13px] font-bold text-slate-400">{formatVND(item.appliedPrice).replace('₫', '')}</span></div>
                <div className="flex items-center justify-center"><div className="flex items-center gap-2 bg-white border border-slate-200 p-0.5 rounded-lg"><button onClick={() => updateCartQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500"><Minus className="w-3.5 h-3.5"/></button><span className="font-black text-[13px] text-slate-700 w-5 text-center">{item.quantity}</span><button onClick={() => updateCartQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-500"><Plus className="w-3.5 h-3.5"/></button></div></div>
                <div className="text-right"><span className={`text-[13px] font-black ${item.isGift ? 'text-purple-600' : (item.appliedPrice === 0 ? 'text-emerald-600' : 'text-slate-900')}`}>{formatVND(item.appliedPrice * item.quantity).replace('₫', '')}</span></div>
                <div className="flex justify-end"><button onClick={() => updateCartQuantity(idx, -item.quantity)} className="p-1 text-slate-200 hover:text-rose-500"><Trash2 className="w-4.5 h-4.5" /></button></div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 shrink-0">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Tạm tính</span><span className="text-slate-700 font-black">{formatVND(totals.subtotal)}</span></div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest"><button onClick={() => setIsDiscountModalOpen(true)} className="flex items-center gap-1.5 hover:text-rose-500">Giảm giá <Edit2 className="w-2.5 h-2.5 opacity-50" /></button><span className="text-rose-500 font-black">-{formatVND(totals.discountValue)}</span></div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Thuế VAT ({totals.vatRate}%)</span><span className="text-amber-600 font-black">+{formatVND(totals.vat)}</span></div>
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Tổng thanh toán</p><h4 className="text-2xl font-black text-primary-600 tracking-tight">{formatVND(totals.total)}</h4></div>
              <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 mb-1">
                <button onClick={() => setPaymentMethod('cash')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMethod === 'cash' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400'}`}>Tiền mặt</button>
                <button onClick={() => setPaymentMethod('transfer')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMethod === 'transfer' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400'}`}>C.Khoản</button>
              </div>
            </div>
          </div>
          <button disabled={cart.length === 0 || isProcessing} onClick={handleCheckout} className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg disabled:opacity-50">{isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Xác nhận thanh toán <ArrowRight className="w-5 h-5" /></>}</button>
        </div>
      </div>

      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} searchTerm="" onSearchChange={() => {}} customers={customers} onSelect={(c) => { setSelectedCustomer(c); setIsCustomerModalOpen(false); }} />
      <GiftModal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} gifts={gifts} selectedCustomer={selectedCustomer} onSelect={addGiftToCart} />
      <DiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} currentValue={discount} currentType={discountType} subtotal={totals.subtotal} onApply={(v, t) => { setDiscount(v); setDiscountType(t); }} />
      <SerialModal isOpen={!!activeSerialItem} onClose={() => setActiveSerialItem(null)} item={activeSerialItem} cart={cart} onSave={(s) => { setCart(cart.map(item => (item.id === activeSerialItem?.id && item.isGift === activeSerialItem?.isGift) ? { ...item, serials: s } : item)); setActiveSerialItem(null); }} />
    </div>
  );
};
