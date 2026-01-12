
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Category, Order } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Edit2, Trash2, X, Save, Search, Hammer, ArrowDownToLine, Wrench, Loader2, Sparkles, AlertCircle, CheckCircle2, Filter, Package, History, BarChart3, Printer, RefreshCcw, Settings2, Tag } from 'lucide-react';
import { writeBatch, doc, runTransaction, getDoc } from "firebase/firestore";
import { db } from '../database/config';
import { COLLECTIONS } from '../database/collections';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Button, Badge, Card, EmptyState } from './ui/Base';
import { Modal } from './ui/Modal';

type Tab = 'list' | 'report';

export const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const isSavingRef = useRef(false);

  const [formData, setFormData] = useState<Partial<Product>>({});
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  const [stockForm, setStockForm] = useState({
    productId: '', productName: '', type: 'import', quantity: 1, currentStock: 0, note: '', importPrice: 0
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const [allP, allC, allO] = await Promise.all([
            StorageService.getProducts().catch(() => []),
            StorageService.getCategories().catch(() => []),
            StorageService.getOrders().catch(() => [])
        ]);
        setMaterials(Array.isArray(allP) ? allP.filter(p => p.type === 'material') : []);
        setCategories(Array.isArray(allC) ? allC : []);
        setOrders(Array.isArray(allO) ? allO : []);
    } finally { setIsProcessing(false); }
  };

  const handleFormatInput = (val: string, key: keyof Product) => {
    const numericValue = val.replace(/\D/g, '');
    setFormData({ ...formData, [key]: numericValue ? parseInt(numericValue, 10) : 0 });
  };

  const getDisplayValue = (val: number | undefined) => {
    if (val === undefined || val === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAiGenerate = async () => {
      if (!formData.name) return alert("Vui lòng nhập tên vật tư");
      setIsAiGenerating(true);
      try {
          const desc = await StorageService.generateProductDescription(
              formData.name,
              'Linh kiện vật tư',
              formData.specifications || ''
          );
          setFormData({ ...formData, description: desc });
      } finally { setIsAiGenerating(false); }
  };

  const handleSave = async () => {
    if (!formData.name || isSavingRef.current) return;
    isSavingRef.current = true; setIsProcessing(true);
    try {
        const now = Date.now();
        const materialId = editingItem ? editingItem.id : `MAT_${now}`;
        const isNew = !editingItem;

        const materialData: Product = {
            id: materialId,
            sku: editingItem?.sku || `MAT-${now}`,
            name: formData.name!,
            categoryId: formData.categoryId || (categories[0]?.id || 'vattu'),
            categoryName: categories.find(c => c.id === formData.categoryId)?.name || 'Vật tư',
            price: Number(formData.price || 0),
            costPrice: Number(formData.costPrice || 0),
            stock: Number(formData.stock || 0),
            minStock: Number(formData.minStock || 5),
            unit: formData.unit || 'Cái',
            image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80',
            type: 'material',
            warrantyPeriod: 0,
            hasSerial: false,
            vatRate: 10,
            description: formData.description || '',
            specifications: formData.specifications || '',
            createdAt: editingItem ? editingItem.createdAt : now,
            updatedAt: now,
            isActive: true
        };

        await runTransaction(db, async (transaction) => {
            const matRef = doc(db, COLLECTIONS.PRODUCTS, materialId);
            transaction.set(matRef, materialData);

            if (isNew && materialData.stock > 0) {
                const txId = `TX_INIT_${now}_${materialId}`;
                transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txId), {
                    id: txId,
                    code: 'TON-DAU',
                    productId: materialId,
                    productName: materialData.name,
                    sku: materialData.sku,
                    type: 'import',
                    quantity: materialData.stock,
                    balance: materialData.stock,
                    oldStock: 0,
                    newStock: materialData.stock,
                    timestamp: now,
                    unitPrice: materialData.costPrice,
                    note: 'Khởi tạo tồn kho đầu kỳ',
                    createdAt: now,
                    updatedAt: now,
                    isActive: true
                });
            }
        });

        await loadData();
        setIsModalOpen(false);
    } finally { setIsProcessing(false); isSavingRef.current = false; }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xác nhận xóa vĩnh viễn vật tư này?")) {
      setIsProcessing(true);
      try {
        await StorageService.deleteProduct(id);
        await loadData();
      } catch (error) {
        alert("Lỗi khi xóa vật tư.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSaveStock = async () => {
    if (!stockForm.productId || isSavingRef.current) return;

    isSavingRef.current = true; setIsProcessing(true);
    try {
        const now = Date.now();
        const code = await StorageService.getNextDocumentNumber(stockForm.type as any);

        await runTransaction(db, async (transaction) => {
            const matRef = doc(db, COLLECTIONS.PRODUCTS, stockForm.productId);
            const matSnap = await transaction.get(matRef);
            
            if (!matSnap.exists()) throw new Error("Vật tư không tồn tại trên hệ thống.");
            
            const currentData = matSnap.data() as Product;
            const realCurrentStock = Math.max(0, currentData.stock || 0); 
            const realCurrentCost = currentData.costPrice || 0;
            const isImport = stockForm.type === 'import';

            if (!isImport && realCurrentStock < stockForm.quantity) {
                throw new Error(`Kho vật tư hiện tại chỉ còn ${realCurrentStock} món, không đủ để thực hiện xuất dùng.`);
            }

            const change = isImport ? stockForm.quantity : -stockForm.quantity;
            const newStock = realCurrentStock + change;

            let newWeightedCost = realCurrentCost;
            if (isImport && stockForm.importPrice > 0) {
                const totalOldValue = realCurrentStock * realCurrentCost;
                const totalNewValue = stockForm.quantity * stockForm.importPrice;
                const totalQty = realCurrentStock + stockForm.quantity;
                if (totalQty > 0) {
                  newWeightedCost = Math.round((totalOldValue + totalNewValue) / totalQty);
                }
            }

            transaction.update(matRef, { 
                stock: newStock, 
                costPrice: newWeightedCost,
                updatedAt: now 
            });

            const txId = `TX_${code}_${stockForm.productId}_${now}`;
            transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txId), {
                id: txId, code, 
                productId: stockForm.productId, 
                productName: stockForm.productName,
                sku: currentData.sku || '', 
                type: stockForm.type, 
                quantity: change, 
                balance: newStock,
                oldStock: realCurrentStock, 
                newStock, 
                timestamp: now, 
                unitPrice: isImport ? stockForm.importPrice : realCurrentCost,
                note: stockForm.note || (change < 0 ? 'Xuất dùng vật tư sửa chữa' : 'Nhập kho vật tư linh kiện (BQGQ)'),
                createdAt: now, updatedAt: now, isActive: true
            });
        });

        await loadData();
        setIsStockModalOpen(false);
    } catch (error: any) {
        alert(error.message || "Lỗi khi cập nhật kho vật tư.");
    } finally { setIsProcessing(false); isSavingRef.current = false; }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setIsProcessing(true);
    try {
        const catData: Category = {
            id: editingCategory ? editingCategory.id : `CAT_${Date.now()}`,
            name: categoryForm.name.trim(),
            createdAt: editingCategory ? editingCategory.createdAt : Date.now(),
            updatedAt: Date.now(),
            isActive: true
        };
        await StorageService.saveCategory(catData);
        setCategoryForm({ name: '' });
        setEditingCategory(null);
        await loadData();
    } finally { setIsProcessing(false); }
  };

  const handleDeleteCategory = async (id: string) => {
      if (confirm("Xác nhận xóa phân loại này?")) {
          setIsProcessing(true);
          try {
              await StorageService.deleteCategory(id);
              await loadData();
          } finally { setIsProcessing(false); }
      }
  };

  const stats = useMemo(() => {
    let totalRev = 0; 
    let totalGiftCost = 0; 
    let totalCOGS = 0;

    const items = materials.map(mat => {
        let sold = 0; 
        let gift = 0; 
        let rev = 0; 
        let costOfGoodsSold = 0;
        let giftCostForThisMat = 0;

        orders.forEach(o => {
            if (o.status === 'cancelled') return;
            o.items.forEach(it => {
                if (it.id === mat.id) {
                    const effectiveCost = (it as any).costPrice ?? mat.costPrice ?? 0;
                    const isActuallyGift = it.isGift || it.appliedPrice === 0;
                    
                    if (isActuallyGift) {
                        gift += it.quantity;
                        giftCostForThisMat += (it.quantity * effectiveCost);
                    } else { 
                        sold += it.quantity; 
                        rev += (it.quantity * (it.appliedPrice ?? it.price));
                        costOfGoodsSold += (it.quantity * effectiveCost);
                    }
                }
            });
        });

        totalRev += rev; 
        totalGiftCost += giftCostForThisMat; 
        totalCOGS += costOfGoodsSold;

        return { 
            ...mat, sold, gift, rev, gCost: giftCostForThisMat, costOfGoodsSold 
        };
    });

    return { 
        summary: { totalRev, totalGift: totalGiftCost, totalCOGS }, 
        details: items.sort((a, b) => b.rev - a.rev) 
    };
  }, [materials, orders]);

  const filtered = materials.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLow = filterLowStock ? p.stock <= (p.minStock || 5) : true;
    return matchSearch && matchLow;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
             <button onClick={() => setActiveTab('list')} className={`flex-1 lg:flex-none px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Danh sách vật tư</button>
             <button onClick={() => setActiveTab('report')} className={`flex-1 lg:flex-none px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'report' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Phân tích lợi nhuận</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button 
              onClick={() => setFilterLowStock(!filterLowStock)} 
              className={`p-2.5 rounded-xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 px-4 ${filterLowStock ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-white text-slate-400 border-slate-200'}`}
            >
              <Filter className="w-4 h-4" /> {filterLowStock ? 'Đang lọc tồn thấp' : 'Lọc tồn thấp'}
            </button>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm tên, SKU vật tư..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300" 
              />
            </div>
            {activeTab === 'list' && (
                <button 
                  onClick={() => { setEditingItem(null); setFormData({ unit: 'Cái', stock: 0, minStock: 5, categoryId: categories[0]?.id }); setIsModalOpen(true); }}
                  className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-8"
                >
                  <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm vật tư</span>
                </button>
            )}
        </div>
      </div>

      {activeTab === 'list' ? (
          <>
            <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
              <TableHead>
                  <TableHeaderCell className="w-[30%]">Vật tư / Linh kiện</TableHeaderCell>
                  <TableHeaderCell>Phân loại</TableHeaderCell>
                  <TableHeaderCell align="center">ĐVT</TableHeaderCell>
                  <TableHeaderCell align="right">Giá vốn</TableHeaderCell>
                  <TableHeaderCell align="right">Giá bán</TableHeaderCell>
                  <TableHeaderCell align="right">Tồn kho</TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[15%]"></TableHeaderCell>
              </TableHead>
              <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id} className="group transition-all">
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-[13px] uppercase leading-tight group-hover:text-primary-700 transition-colors">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-[10px] font-black text-slate-400 tracking-widest">{item.categoryName}</span></TableCell>
                      <TableCell align="center"><span className="text-[10px] font-black text-slate-400">{item.unit}</span></TableCell>
                      <TableCell align="right" className="font-black text-slate-500 text-xs">{getDisplayValue(item.costPrice)}</TableCell>
                      <TableCell align="right" className="font-black text-primary-700 text-xs">{getDisplayValue(item.price)}</TableCell>
                      <TableCell align="right">
                          <Badge variant={item.stock <= (item.minStock || 5) ? 'danger' : 'success'} className="text-[10px] py-0.5 px-3">
                              {item.stock}
                          </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                            <button 
                              onClick={() => { setStockForm({ productId: item.id, productName: item.name, type: 'import', quantity: 1, currentStock: item.stock, note: '', importPrice: item.costPrice }); setIsStockModalOpen(true); }} 
                              className="p-2.5 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Nhập kho"
                            >
                                <ArrowDownToLine className="w-4 h-4"/>
                            </button>
                            <button 
                              onClick={() => { setStockForm({ productId: item.id, productName: item.name, type: 'export', quantity: 1, currentStock: item.stock, note: '', importPrice: 0 }); setIsStockModalOpen(true); }} 
                              className="p-2.5 text-slate-400 hover:text-orange-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Xuất dùng"
                            >
                                <Hammer className="w-4 h-4"/>
                            </button>
                            <button 
                              onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} 
                              className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Chỉnh sửa"
                            >
                                <Edit2 className="w-4 h-4"/>
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)} 
                              className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Xóa vật tư"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </TableContainer>
            {filtered.length === 0 && (
                <EmptyState 
                    icon={<Wrench className="w-16 h-16" />} 
                    title="Không tìm thấy vật tư" 
                    description={searchTerm ? `Không có kết quả cho "${searchTerm}"` : "Danh mục vật tư sửa chữa đang trống."} 
                />
            )}
          </>
      ) : (
          <div className="px-12 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center gap-6 group hover:border-primary-200 transition-all">
                      <div className="p-5 bg-primary-50 text-primary-600 rounded-[1.5rem] group-hover:scale-110 transition-transform"><Wrench className="w-8 h-8"/></div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doanh thu linh kiện</p>
                          <h4 className="text-2xl font-black text-slate-800">{formatCurrency(stats.summary.totalRev)}</h4>
                      </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-all">
                      <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[1.5rem] group-hover:scale-110 transition-transform"><BarChart3 className="w-8 h-8"/></div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lợi nhuận ròng vật tư</p>
                          <h4 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.summary.totalRev - stats.summary.totalCOGS - stats.summary.totalGift)}</h4>
                      </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center gap-6 group hover:border-rose-200 transition-all">
                      <div className="p-5 bg-rose-50 text-rose-600 rounded-[1.5rem] group-hover:scale-110 transition-transform"><ArrowDownToLine className="w-8 h-8"/></div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi phí linh kiện tặng</p>
                          <h4 className="text-2xl font-black text-rose-600">{formatCurrency(stats.summary.totalGift)}</h4>
                      </div>
                  </div>
              </div>
              <TableContainer className="!px-0" rounded="rounded-2xl">
                <TableHead>
                    <TableHeaderCell>Tên vật tư</TableHeaderCell>
                    <TableHeaderCell align="center" className="bg-primary-50/30">SL Bán</TableHeaderCell>
                    <TableHeaderCell align="right" className="bg-primary-50/30">Doanh thu</TableHeaderCell>
                    <TableHeaderCell align="center" className="bg-rose-50/30">SL Tặng</TableHeaderCell>
                    <TableHeaderCell align="right" className="bg-rose-50/30">Vốn xuất tặng</TableHeaderCell>
                    <TableHeaderCell align="right">Lợi nhuận ròng</TableHeaderCell>
                </TableHead>
                <TableBody>
                    {stats.details.map(it => {
                        const grossProfit = it.rev - it.costOfGoodsSold;
                        const netProfit = grossProfit - it.gCost;
                        if (it.sold === 0 && it.gift === 0) return null;
                        return (
                            <TableRow key={it.id}>
                                <TableCell className="font-black uppercase text-slate-700 text-xs">{it.name}</TableCell>
                                <TableCell align="center" className="font-bold text-primary-700 bg-primary-50/10 text-xs">{it.sold}</TableCell>
                                <TableCell align="right" className="font-black text-primary-600 bg-primary-50/10 text-xs">{getDisplayValue(it.rev).replace('₫', '')}</TableCell>
                                <TableCell align="center" className="font-bold text-rose-700 bg-rose-50/10 text-xs">{it.gift}</TableCell>
                                <TableCell align="right" className="font-black text-rose-600 bg-rose-50/10 text-xs">{getDisplayValue(it.gCost).replace('₫', '')}</TableCell>
                                <TableCell align="right" className={`font-black text-xs ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(netProfit)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
              </TableContainer>
          </div>
      )}

      {/* MODAL THÊM VẬT TƯ */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingItem ? "Cập nhật linh kiện" : "Khai báo vật tư mới"} maxWidth="4xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên vật tư / linh kiện *</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full text-lg font-black" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại</label>
                                    <button onClick={() => setIsCategoryModalOpen(true)} className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-all">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <select value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full font-bold text-xs">
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị tính</label>
                                <input type="text" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full font-bold text-xs" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá vốn</label>
                                <input type="text" value={getDisplayValue(formData.costPrice).replace('₫', '').trim()} onChange={e => handleFormatInput(e.target.value, 'costPrice')} className="w-full font-black text-right text-slate-600" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest ml-1">Giá bán</label>
                                <input type="text" value={getDisplayValue(formData.price).replace('₫', '').trim()} onChange={e => handleFormatInput(e.target.value, 'price')} className="w-full font-black text-right text-primary-600 text-lg" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tồn kho hiện tại</label>
                                <input type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full font-black text-center text-lg" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Định mức</label>
                                <input type="number" value={formData.minStock || 0} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full font-black text-center text-rose-600 text-lg" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả vật tư</label>
                                <button onClick={handleAiGenerate} disabled={isAiGenerating} className="text-[10px] font-black text-primary-600 uppercase flex items-center gap-1 hover:text-primary-800 disabled:opacity-50 transition-all">
                                    {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                                    Viết bằng AI
                                </button>
                            </div>
                            <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-32 text-sm font-medium leading-relaxed" placeholder="Chi tiết vật tư..." />
                        </div>
                    </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>HỦY BỔ</Button>
                    <Button variant="primary" onClick={handleSave} disabled={isProcessing} className="px-12">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                        {editingItem ? 'CẬP NHẬT' : 'THÊM MỚI'}
                    </Button>
                </div>
            </div>
        </Modal>
      )}

      {/* MODAL THAO TÁC KHO */}
      {isStockModalOpen && (
          <Modal isOpen={true} onClose={() => setIsStockModalOpen(false)} title={stockForm.type === 'import' ? 'Nhập kho vật tư' : 'Xuất dùng sửa chữa'} maxWidth="md">
              <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vật tư thao tác:</p>
                      <h4 className="text-lg font-black text-primary-700 uppercase leading-tight">{stockForm.productName}</h4>
                      <Badge variant="neutral" className="mt-2 text-[9px]">Tồn hiện tại: {stockForm.currentStock}</Badge>
                      {stockForm.type === 'export' && stockForm.quantity > stockForm.currentStock && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-rose-600 animate-pulse">
                              <AlertCircle className="w-3 h-3"/>
                              <span className="text-[9px] font-black uppercase">Vượt tồn kho!</span>
                          </div>
                      )}
                  </div>
                  
                  {stockForm.type === 'import' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá nhập lần này</label>
                      <input type="number" value={stockForm.importPrice} onChange={e => setStockForm({...stockForm, importPrice: Number(e.target.value)})} className="w-full font-black text-primary-600" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng {stockForm.type === 'import' ? 'nhập' : 'xuất'}</label>
                      <input type="number" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: Number(e.target.value)})} className={`w-full py-6 text-center text-4xl font-black focus:border-primary-600 ${stockForm.type === 'export' && stockForm.quantity > stockForm.currentStock ? 'text-rose-600 border-rose-200' : ''}`} min="1" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú lý do</label>
                      <textarea value={stockForm.note} onChange={e => setStockForm({...stockForm, note: e.target.value})} className="w-full h-24 font-medium text-sm" placeholder="Nhập lý do xuất/nhập..." />
                  </div>
                  <Button variant={stockForm.type === 'import' ? 'primary' : 'danger'} onClick={handleSaveStock} disabled={isProcessing} className="w-full py-4 text-sm">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      XÁC NHẬN THỰC HIỆN
                  </Button>
              </div>
          </Modal>
      )}

      {/* MODAL QUẢN LÝ PHÂN LOẠI NHANH */}
      {isCategoryModalOpen && (
          <Modal isOpen={true} onClose={() => setIsCategoryModalOpen(false)} title="Quản lý Phân loại vật tư" maxWidth="md" icon={<Tag className="w-5 h-5 text-primary-600" />}>
              <div className="space-y-6">
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={categoryForm.name} 
                        onChange={e => setCategoryForm({ name: e.target.value })} 
                        placeholder="Tên phân loại mới..." 
                        className="flex-1 font-bold"
                        onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                      />
                      <button 
                        onClick={handleSaveCategory} 
                        disabled={isProcessing || !categoryForm.name.trim()} 
                        className="p-3 bg-primary-600 text-white rounded-xl shadow-md disabled:opacity-50"
                      >
                        {editingCategory ? <CheckCircle2 className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
                      </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-none">
                      {categories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-primary-200 transition-all">
                              <span className="font-black text-slate-700 text-xs tracking-tight">{cat.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name }); }} className="p-1.5 text-slate-400 hover:text-sky-600 bg-white border border-slate-200 rounded-lg"><Edit2 className="w-3.5 h-3.5"/></button>
                                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                          </div>
                      ))}
                      {categories.length === 0 && (
                          <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-xl">
                              <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Danh sách đang trống</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                      <Button variant="secondary" className="w-full py-3 text-[10px]" onClick={() => setIsCategoryModalOpen(false)}>ĐÓNG CỬA SỔ</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
