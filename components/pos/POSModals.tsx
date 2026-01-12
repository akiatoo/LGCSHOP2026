
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Badge } from '../ui/Base';
import { 
  UserPlus, Search as SearchIcon, ChevronRight, Gift as GiftIcon, 
  Package, ScanBarcode, QrCode, Plus, X, Sparkles, Award, 
  AlertCircle, CheckCircle, AlertTriangle, Info, Trash2, Tag, Percent, Banknote
} from 'lucide-react';
import { Customer, Gift, CartItem } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  customers: Customer[];
  onSelect: (c: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, searchTerm, onSearchChange, customers, onSelect }) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title="Chọn khách hàng" 
    icon={<UserPlus className="w-5 h-5 text-primary-600" />}
  >
    <div className="space-y-6">
      <div className="relative group">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Tìm theo tên hoặc số điện thoại..." 
          value={searchTerm} 
          onChange={e => onSearchChange(e.target.value)} 
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-primary-500 outline-none font-bold text-sm transition-all" 
          autoFocus 
        />
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-none">
        {customers.map(c => (
          <button key={c.id} onClick={() => onSelect(c)} className="w-full p-4 flex items-center justify-between bg-white border border-slate-100 rounded-2xl hover:border-primary-300 hover:bg-primary-50/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black group-hover:bg-primary-600 group-hover:text-white transition-colors">{c.name.charAt(0).toUpperCase()}</div>
              <div className="text-left">
                <p className="font-black text-slate-800 text-sm uppercase leading-tight">{c.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">SĐT: {c.phone} | Điểm: {c.loyaltyPoints}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  </Modal>
);

interface SerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  cart: CartItem[]; // Thêm cart để check chéo
  onSave: (serials: string[]) => void;
}

export const SerialModal: React.FC<SerialModalProps> = ({ isOpen, onClose, item, cart, onSave }) => {
  const [serials, setSerials] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
        setSerials((item.serials || []).slice(0, item.quantity));
        setError(null);
        setShowIncompleteWarning(false);
    }
  }, [item]);

  const addSerial = () => {
    const val = currentInput.trim().toUpperCase();
    setError(null);
    setShowIncompleteWarning(false);

    if (!val) return;
    
    if (serials.length >= (item?.quantity || 0)) {
        setError(`Sản phẩm này chỉ yêu cầu tối đa ${item?.quantity} mã.`);
        return;
    }
    
    // Check trùng trong item hiện tại
    if (serials.includes(val)) {
        setError("Mã Serial này đã có trong danh sách hiện tại!");
        return;
    }

    // Check trùng chéo trong toàn bộ giỏ hàng
    const isDuplicateInCart = cart.some(cartItem => 
        cartItem.serials?.includes(val) && (cartItem.id !== item?.id || cartItem.isGift !== item?.isGift)
    );
    if (isDuplicateInCart) {
        setError("Mã Serial này đã được nhập cho một sản phẩm khác trong đơn!");
        return;
    }

    setSerials([...serials, val]);
    setCurrentInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSaveAttempt = () => {
    if (serials.length < (item?.quantity || 0)) {
        if (!showIncompleteWarning) {
            setShowIncompleteWarning(true);
            return;
        }
    }
    onSave(serials);
  };

  if (!item) return null;

  const isFull = serials.length === item.quantity;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản lý Serial / IMEI" icon={<ScanBarcode className="w-5 h-5 text-primary-600" />}>
      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sản phẩm:</p>
            <h4 className="font-black text-slate-800 uppercase leading-tight">{item.name}</h4>
            <div className="mt-2 flex justify-between items-center">
                <Badge variant="neutral">Yêu cầu: {item.quantity}</Badge>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase ${isFull ? 'text-emerald-600' : 'text-rose-500'}`}>
                        Đã nhập: {serials.length}/{item.quantity}
                    </span>
                    {isFull && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                </div>
            </div>
        </div>

        {!isFull ? (
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={currentInput}
                        onChange={e => { setCurrentInput(e.target.value); setError(null); }}
                        onKeyDown={e => e.key === 'Enter' && addSerial()}
                        placeholder="Quét hoặc nhập mã Serial..."
                        className={`flex-1 font-bold ${error ? 'border-rose-300 bg-rose-50' : ''}`}
                        autoFocus
                    />
                    <button onClick={addSerial} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
                {error && (
                    <div className="flex items-center gap-2 text-rose-600 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{error}</span>
                    </div>
                )}
            </div>
        ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 animate-in fade-in zoom-in duration-300">
                <CheckCircle className="w-5 h-5" />
                <p className="text-xs font-black uppercase tracking-tight">Đã nhập đủ số lượng mã cần thiết.</p>
            </div>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-none">
            {serials.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group hover:border-primary-200 transition-all">
                    <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black flex items-center justify-center text-slate-400">{idx + 1}</span>
                        <span className="font-mono font-black text-sm text-slate-700">{s}</span>
                    </div>
                    <button onClick={() => { setSerials(serials.filter((_, i) => i !== idx)); setError(null); setShowIncompleteWarning(false); }} className="text-slate-200 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            {serials.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chưa có mã nào được nhập</p>
                </div>
            )}
        </div>

        {showIncompleteWarning && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase">Cảnh báo thiếu mã</span>
                </div>
                <p className="text-[11px] text-amber-600 font-medium leading-tight">Bạn mới chỉ nhập {serials.length}/{item.quantity} mã. Việc lưu lại có thể ảnh hưởng đến dữ liệu bảo hành sau này.</p>
                <p className="text-[10px] font-bold text-amber-500 uppercase italic mt-1">Nhấn "XÁC NHẬN LƯU" một lần nữa để bỏ qua.</p>
            </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex gap-3">
            <Button variant="secondary" className="flex-1 py-3 text-[10px] font-black" onClick={onClose}>HỦY BỎ</Button>
            <Button 
                variant={showIncompleteWarning ? "warning" : "primary"} 
                className={`flex-1 py-3 text-[10px] font-black transition-all ${!isFull && !showIncompleteWarning ? 'opacity-90' : ''}`} 
                onClick={handleSaveAttempt}
            >
                {showIncompleteWarning ? 'VẪN LƯU THIẾU' : 'XÁC NHẬN LƯU'}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export const GiftModal: React.FC<any> = ({ isOpen, onClose, gifts, selectedCustomer, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filtered = gifts.filter((g: Gift) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Đổi quà tặng triân" icon={<GiftIcon className="w-6 h-6 text-purple-600" />} maxWidth="4xl">
            <div className="space-y-6">
                {selectedCustomer ? (
                    <div className="p-5 bg-purple-50 rounded-3xl border border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-purple-600"><Award className="w-6 h-6"/></div>
                            <div>
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Khách hàng đang chọn</p>
                                <h4 className="text-lg font-black text-purple-700 uppercase leading-none mt-1">{selectedCustomer.name}</h4>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Điểm tích lũy hiện có</p>
                            <span className="text-2xl font-black text-purple-700">{selectedCustomer.loyaltyPoints} P</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-center gap-4 text-amber-700">
                        <UserPlus className="w-6 h-6 shrink-0"/>
                        <p className="text-sm font-bold">Vui lòng chọn khách hàng trước khi thực hiện đổi quà tặng.</p>
                    </div>
                )}

                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4"/>
                    <input 
                        type="text" 
                        placeholder="Tìm món quà muốn tặng..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-11 bg-slate-50 border-slate-200 rounded-2xl font-bold text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
                    {filtered.map((g: Gift) => {
                        const canRedeem = selectedCustomer && selectedCustomer.loyaltyPoints >= g.pointsRequired && g.stock > 0;
                        return (
                            <div key={g.id} className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${canRedeem ? 'bg-white border-slate-100 hover:border-purple-300 cursor-pointer group' : 'bg-slate-50 border-transparent opacity-60'}`} onClick={() => canRedeem && onSelect(g)}>
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                                    <img src={g.image} className="w-full h-full object-cover"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-slate-800 uppercase leading-tight truncate">{g.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="warning" className="px-2 py-0.5 text-[9px]">{g.pointsRequired} P</Badge>
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Tồn: {g.stock}</span>
                                    </div>
                                </div>
                                {canRedeem && <div className="p-2 bg-purple-50 text-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Plus className="w-4 h-4"/></div>}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="col-span-2 py-10 text-center text-slate-300 uppercase font-black text-xs italic tracking-widest">Không có quà tặng khả dụng</div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button variant="secondary" className="px-10 py-3 text-[10px]" onClick={onClose}>ĐÓNG CỬA SỔ</Button>
                </div>
            </div>
        </Modal>
    );
};

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentValue: number;
    currentType: 'amount' | 'percent';
    subtotal: number;
    onApply: (value: number, type: 'amount' | 'percent') => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, currentValue, currentType, subtotal, onApply }) => {
    const [val, setVal] = useState(String(currentValue));
    const [type, setType] = useState<'amount' | 'percent'>(currentType);

    useEffect(() => {
        if (isOpen) {
            setVal(String(currentValue));
            setType(currentType);
        }
    }, [isOpen, currentValue, currentType]);

    const handleApply = () => {
        const num = Number(val) || 0;
        onApply(num, type);
        onClose();
    };

    const calculatedDiscount = type === 'percent' 
        ? (subtotal * (Number(val) || 0)) / 100 
        : (Number(val) || 0);

    const presets = type === 'percent' 
        ? [5, 10, 15, 20, 50] 
        : [10000, 20000, 50000, 100000, 500000];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cấu hình giảm giá" icon={<Tag className="w-5 h-5 text-rose-600" />} maxWidth="md">
            <div className="space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button 
                        onClick={() => { setType('amount'); setVal('0'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${type === 'amount' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Banknote className="w-4 h-4"/> Theo số tiền
                    </button>
                    <button 
                        onClick={() => { setType('percent'); setVal('0'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${type === 'percent' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Percent className="w-4 h-4"/> Theo phần trăm
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá trị giảm</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={val} 
                            onChange={e => setVal(e.target.value)}
                            className="w-full py-6 text-center text-4xl font-black text-rose-600 focus:border-rose-300" 
                            autoFocus
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">
                            {type === 'percent' ? '%' : 'đ'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {presets.map(p => (
                        <button 
                            key={p} 
                            onClick={() => setVal(String(p))}
                            className="py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                        >
                            {type === 'percent' ? `${p}%` : new Intl.NumberFormat('vi-VN').format(p)}
                        </button>
                    ))}
                    <button onClick={() => setVal('0')} className="py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-600">XÓA</button>
                </div>

                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiền được giảm thực tế</p>
                    <h4 className="text-xl font-black text-rose-600">-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculatedDiscount)}</h4>
                </div>

                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1 py-3 text-[10px]" onClick={onClose}>HỦY BỎ</Button>
                    <Button variant="primary" className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 border-none text-[10px]" onClick={handleApply}>XÁC NHẬN GIẢM</Button>
                </div>
            </div>
        </Modal>
    );
};
