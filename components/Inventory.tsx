
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, InventoryTransaction, TransactionType, Category, Supplier, SystemSettings } from '../types';
import { StorageService } from '../services/storageService';
import { printImportReceipt, printExportReceipt, printNXTReport } from '../services/printService';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, EmptyState, Button, Badge, Card } from './ui/Base';
import { Modal } from './ui/Modal';
import { 
  Plus, Edit2, Trash2, Search, Package, ArrowDownToLine, Printer, RefreshCcw, ListPlus, Loader2, Building2, 
  History, BarChart3, ScanBarcode, Eye, ArrowUpFromLine, Minus, Sparkles, ClipboardCheck, Save, X, Calendar, FileText, Settings2, Check,
  ImageIcon, Filter, AlertTriangle, User, Info, ReceiptText, Clock, Hash, Tag, Trash, UserCheck, Hammer, ChevronDown, FileDigit,
  UserCircle, FileType, Notebook, Image as LucideImage, Wrench, ArrowRightLeft, MoveRight
} from 'lucide-react';
// Fix: Use namespace import for firestore to ensure member availability across build environments
import * as firestore from "firebase/firestore";
const { writeBatch, doc, runTransaction, getDoc } = firestore as any;
import { db } from '../database/config';
import { COLLECTIONS } from '../database/collections';
import { cleanupData } from '../database/base';

type Tab = 'products' | 'history' | 'report';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedTxCode, setSelectedTxCode] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const isSavingRef = useRef(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  
  const [categoryForm, setCategoryForm] = useState({ name: '', id: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [bulkType, setBulkType] = useState<TransactionType>('import');
  const [bulkItems, setBulkItems] = useState<any[]>([]);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkProductSearch, setBulkProductSearch] = useState('');
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [importMeta, setImportMeta] = useState({
      supplierName: '',
      supplierId: '',
      supplierAddress: '',
      supplierPhone: '',
      warehouse: 'Kho tổng LGC',
      receiver: '',
      refDocNumber: '', 
      refDocDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isBulkModalOpen && !importMeta.refDocDate) {
        setImportMeta(prev => ({ ...prev, refDocDate: new Date().toISOString().split('T')[0] }));
    }
  }, [isBulkModalOpen]);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const [p, c, t, s, sup] = await Promise.all([
            StorageService.getProducts().catch(() => []),
            StorageService.getCategories().catch(() => []),
            StorageService.getTransactions().catch(() => []),
            StorageService.getSettings().catch(() => null),
            StorageService.getSuppliers().catch(() => [])
        ]);
        setProducts(Array.isArray(p) ? p : []); 
        setCategories(Array.isArray(c) ? c : []); 
        setTransactions(Array.isArray(t) ? t : []); 
        setSettings(s);
        setSuppliers(Array.isArray(sup) ? sup : []);
    } finally { setIsProcessing(false); }
  };

  const handlePriceChange = (val: string, key: 'price' | 'costPrice') => {
    const numericValue = val.replace(/\D/g, '');
    setProductForm({ ...productForm, [key]: numericValue ? parseInt(numericValue, 10) : 0 });
  };

  const handleAiGenerateDescription = async () => {
      if (!productForm.name) return alert("Vui lòng nhập tên sản phẩm trước");
      setIsAiGenerating(true);
      try {
          const desc = await StorageService.generateProductDescription(
              productForm.name, 
              categories.find(c => c.id === productForm.categoryId)?.name || 'Hàng hóa',
              productForm.specifications || ''
          );
          setProductForm({ ...productForm, description: desc });
      } finally { setIsAiGenerating(false); }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name?.trim()) return alert("Vui lòng nhập tên sản phẩm.");
    if (isSavingRef.current) return;
    
    isSavingRef.current = true; setIsProcessing(true);
    try {
        const now = Date.now();
        const productId = editingProduct ? editingProduct.id : `P_${now}`;

        const productObj: Product = {
            id: productId,
            sku: productForm.sku || `SKU-${now}`,
            name: productForm.name!.trim(),
            categoryId: productForm.categoryId || (categories[0]?.id || 'khac'),
            categoryName: '', 
            price: Number(productForm.price || 0),
            costPrice: Number(productForm.costPrice || 0),
            stock: Number(productForm.stock || 0),
            minStock: Number(productForm.minStock || 5),
            unit: productForm.unit || 'Cái',
            image: productForm.image || 'https://images.unsplash.com/photo-1558981403-c5f91cbcf523?w=400&q=80',
            type: productForm.type || 'product',
            warrantyPeriod: Number(productForm.warrantyPeriod || 0),
            hasSerial: !!productForm.hasSerial,
            vatRate: productForm.vatRate ?? settings?.defaultVatRate ?? 10,
            description: productForm.description || '',
            specifications: productForm.specifications || '',
            createdAt: editingProduct ? editingProduct.createdAt : now,
            updatedAt: now,
            isActive: true
        };

        await StorageService.saveProduct(productObj);
        await loadData();
        setIsProductModalOpen(false);
    } catch (e: any) { 
        alert(e.message || "Lỗi khi lưu sản phẩm."); 
    } finally { 
        setIsProcessing(false); 
        isSavingRef.current = false; 
    }
  };

  const addProductToBulk = (p: Product) => {
    if (bulkItems.find(item => item.productId === p.id)) return;
    const isInternalUse = ['scrap', 'internal', 'production', 'import'].includes(bulkType);
    const appliedPrice = isInternalUse ? p.costPrice : p.price;
    
    setBulkItems([...bulkItems, { 
      productId: p.id, 
      name: p.name, 
      sku: p.sku, 
      quantity: 1, 
      price: appliedPrice, 
      currentStock: p.stock, 
      unit: p.unit, 
      type: p.type 
    }]);
    setBulkProductSearch('');
    setShowBulkDropdown(false);
  };

  const selectSupplier = (s: Supplier) => {
    setImportMeta({
        ...importMeta,
        supplierName: s.name,
        supplierId: s.id,
        supplierAddress: s.address || '',
        supplierPhone: s.phone || ''
    });
    setSupplierSearch(s.name);
    setShowSupplierDropdown(false);
  };

  const handleSaveBulk = async () => {
    if (bulkItems.length === 0 || isSavingRef.current) return;
    isSavingRef.current = true; setIsProcessing(true);
    try {
      const now = Date.now();
      const code = await StorageService.getNextDocumentNumber(bulkType as any);
      
      await runTransaction(db, async (transaction: any) => {
          const itemsToProcess = [];
          for (const item of bulkItems) {
              const pRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
              const pSnap = await transaction.get(pRef);
              if (!pSnap.exists()) throw new Error(`Sản phẩm "${item.name}" không tồn tại.`);
              itemsToProcess.push({ ref: pRef, currentData: pSnap.data() as Product, item });
          }
          
          for (const entry of itemsToProcess) {
              const { ref, currentData, item } = entry;
              const currentStock = Math.max(0, currentData.stock || 0);
              const currentCost = currentData.costPrice || 0;
              const isImport = bulkType === 'import';
              const change = isImport ? item.quantity : -item.quantity;
              
              if (!isImport && currentStock < item.quantity) {
                  throw new Error(`Sản phẩm "${item.name}" không đủ tồn kho (Cần: ${item.quantity}, Có: ${currentStock}).`);
              }

              const newStock = currentStock + change;
              
              let newWeightedCost = currentCost;
              if (isImport && item.price > 0) {
                  if (currentStock === 0) {
                      newWeightedCost = item.price;
                  } else {
                      const totalOldValue = currentStock * currentCost;
                      const totalNewValue = item.quantity * item.price;
                      const totalQty = currentStock + item.quantity;
                      if (totalQty > 0) newWeightedCost = Math.round((totalOldValue + totalNewValue) / totalQty);
                  }
              }

              transaction.update(ref, { stock: newStock, costPrice: newWeightedCost, updatedAt: now });
              
              const txId = `TX_${code}_${item.productId}_${now}`;
              transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txId), cleanupData({
                  id: txId, code, productId: item.productId, productName: item.name, sku: item.sku || '', 
                  type: bulkType, quantity: change, balance: newStock, oldStock: currentStock, newStock, 
                  timestamp: now, unitPrice: item.price, note: bulkNote || "Giao dịch kho lô", 
                  supplierName: importMeta.supplierName || (isImport ? 'N/A' : 'Hệ thống'), 
                  receiver: importMeta.receiver || null, 
                  referenceId: isImport ? (importMeta.refDocNumber || null) : null,
                  refDocDate: (isImport && importMeta.refDocDate) ? new Date(importMeta.refDocDate).getTime() : null,
                  createdAt: now, updatedAt: now, isActive: true
              }));
          }
      });
      await loadData();
      
      setBulkItems([]);
      setBulkNote('');
      setSupplierSearch('');
      setBulkProductSearch('');
      setImportMeta({
          supplierName: '',
          supplierId: '',
          supplierAddress: '',
          supplierPhone: '',
          warehouse: 'Kho tổng LGC',
          receiver: '',
          refDocNumber: '', 
          refDocDate: new Date().toISOString().split('T')[0]
      });

      setIsBulkModalOpen(false);
      alert(`Đã lưu phiếu thành công: ${code}.`);
    } catch (error: any) { alert(error.message); } finally { setIsProcessing(false); isSavingRef.current = false; }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Xác nhận xóa vĩnh viễn sản phẩm này?")) {
      setIsProcessing(true);
      try { await StorageService.deleteProduct(id); await loadData(); } finally { setIsProcessing(false); }
    }
  };

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return (products || []).filter(p => {
      const matchSearch = (p.name || "").toLowerCase().includes(search) || (p.sku || "").toLowerCase().includes(search);
      const matchLow = filterLowStock ? p.stock <= p.minStock : true;
      return matchSearch && matchLow;
    });
  }, [products, searchTerm, filterLowStock]);

  const filteredTransactions = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const groups: Record<string, InventoryTransaction[]> = {};
    transactions.forEach(t => {
      const codeKey = t.code.trim().toUpperCase();
      if (!groups[codeKey]) groups[codeKey] = [];
      groups[codeKey].push(t);
    });

    return Object.keys(groups).map(code => {
      const items = groups[code];
      if (code.includes(search.toUpperCase()) || items.some(it => it.productName.toLowerCase().includes(search))) {
        return { ...items[0], _itemCount: items.length, _hasMaterial: items.some(it => products.find(p => p.id === it.productId)?.type === 'material') };
      }
      return null;
    }).filter(Boolean).sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [transactions, searchTerm, products]);

  const transactionDetails = useMemo(() => {
      if (!selectedTxCode) return null;
      const items = transactions.filter(t => t.code.trim().toUpperCase() === selectedTxCode.trim().toUpperCase());
      if (items.length === 0) return null;
      return { 
          code: selectedTxCode, 
          type: items[0].type, 
          timestamp: items[0].timestamp, 
          supplierName: items[0].supplierName, 
          receiver: items[0].receiver, 
          note: items[0].note || '', 
          referenceId: items[0].referenceId, 
          refDocDate: items[0].refDocDate, 
          items: items.map(it => ({ 
              id: it.productId, 
              name: it.productName, 
              sku: it.sku, 
              quantity: Math.abs(it.quantity), 
              price: it.unitPrice, 
              total: Math.abs(it.quantity) * it.unitPrice, 
              unit: products.find(prod => prod.id === it.productId)?.unit || 'Cái', 
              type: products.find(prod => prod.id === it.productId)?.type || 'product' 
          })) 
      };
  }, [selectedTxCode, transactions, products]);

  const handlePrintTransaction = () => {
      if (!transactionDetails) return;
      const total = transactionDetails.items.reduce((sum, i) => sum + i.total, 0);
      const printData = {
          id: transactionDetails.code,
          timestamp: transactionDetails.timestamp,
          supplier_name: transactionDetails.supplierName,
          receiver: transactionDetails.receiver,
          reason: transactionDetails.note,
          refDocNumber: transactionDetails.referenceId,
          refDocDate: transactionDetails.refDocDate,
          items: transactionDetails.items,
          total: total
      };

      if (transactionDetails.type === 'import') {
          printImportReceipt(printData);
      } else {
          printExportReceipt(printData);
      }
  };

  const nxtReport = useMemo(() => {
    const startDate = new Date(reportYear, reportMonth - 1, 1).getTime();
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999).getTime();
    return products.map(p => {
        const pTxs = transactions.filter(t => t.productId === p.id);
        const allChangesSinceStart = pTxs.filter(t => t.timestamp >= startDate).reduce((sum, t) => sum + (t.quantity || 0), 0);
        const opening = (p.stock || 0) - allChangesSinceStart;
        const currentTxs = pTxs.filter(t => t.timestamp >= startDate && t.timestamp <= endDate);
        const imp = currentTxs.filter(t => (t.quantity || 0) > 0).reduce((sum, t) => sum + t.quantity, 0);
        const exp = Math.abs(currentTxs.filter(t => (t.quantity || 0) < 0).reduce((sum, t) => sum + t.quantity, 0));
        return { ...p, opening, imp, exp, closing: opening + imp - exp };
    }).filter(p => (p.opening !== 0 || p.imp !== 0 || p.exp !== 0) && (searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true));
  }, [products, transactions, reportMonth, reportYear, searchTerm]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            {(['products', 'history', 'report'] as Tab[]).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t === 'products' ? 'Sản phẩm' : t === 'history' ? 'Chứng từ' : 'Báo cáo NXT'}</button>
            ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Tìm tên, mã chứng từ, SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
            </div>
            {activeTab === 'products' && (
              <div className="flex gap-2">
                  <button onClick={() => setIsBulkModalOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 px-4"><ListPlus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase">Phiếu lô</span></button>
                  <button onClick={() => { setEditingProduct(null); setProductForm({ unit: 'Cái', vatRate: 10, stock: 0 }); setIsProductModalOpen(true); }} className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all flex items-center gap-2 px-8"><Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm mới</span></button>
              </div>
            )}
        </div>
      </div>

      {activeTab === 'products' && (
        <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
          <TableHead>
            <TableHeaderCell className="w-[30%]">Hàng hóa / Sản phẩm</TableHeaderCell>
            <TableHeaderCell>Danh mục</TableHeaderCell>
            <TableHeaderCell align="center">ĐVT</TableHeaderCell>
            <TableHeaderCell align="right">Giá vốn (BQ)</TableHeaderCell>
            <TableHeaderCell align="right">Giá bán</TableHeaderCell>
            <TableHeaderCell align="right">Tồn kho</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[15%]"></TableHeaderCell>
          </TableHead>
          <TableBody>
              {filteredProducts?.map(p => (
                <TableRow key={p.id} className="group transition-all">
                    <TableCell><div className="flex items-center gap-2"><span className="font-black text-slate-800 text-sm leading-tight">{p.name}</span>{p.hasSerial && <ScanBarcode className="w-3.5 h-3.5 text-primary-600" /> }</div></TableCell>
                    <TableCell><span className="text-[10px] font-black text-slate-400 tracking-widest">{p.categoryName}</span></TableCell>
                    <TableCell align="center"><span className="text-[10px] font-black text-slate-400">{p.unit}</span></TableCell>
                    <TableCell align="right" className="font-black text-slate-500 text-sm">{formatCurrency(p.costPrice)}</TableCell>
                    <TableCell align="right" className="font-black text-primary-700 text-sm">{formatCurrency(p.price)}</TableCell>
                    <TableCell align="right"><Badge variant={p.stock <= p.minStock ? 'danger' : 'success'} className="text-[10px] py-0.5 px-3">{p.stock}</Badge></TableCell>
                    <TableCell align="right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingProduct(p); setProductForm(p); setIsProductModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl transition-all"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </TableContainer>
      )}

      {activeTab === 'history' && (
        <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
          <TableHead>
            <TableHeaderCell>Mã phiếu</TableHeaderCell>
            <TableHeaderCell>Hàng hóa / Nội dung</TableHeaderCell>
            <TableHeaderCell align="center">Nghiệp vụ</TableHeaderCell>
            <TableHeaderCell align="right">Tồn kho</TableHeaderCell>
            <TableHeaderCell align="right">Thời gian</TableHeaderCell>
          </TableHead>
          <TableBody>
            {filteredTransactions?.map((t: any) => (
                <TableRow key={t.id} onClick={() => setSelectedTxCode(t.code)} className="cursor-pointer group">
                  <TableCell><span className="font-black text-primary-600 text-[13px] uppercase">{t.code}</span></TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-black text-slate-800 text-[13px]">{t.productName} {t._itemCount > 1 ? `(+ ${t._itemCount - 1} món)` : ''}</span><span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-md">{t.note}</span></div></TableCell>
                  <TableCell align="center"><Badge variant={t.type === 'import' ? 'success' : 'primary'} className="text-[9px] uppercase">{t.type}</Badge></TableCell>
                  <TableCell align="right"><span className="font-black text-slate-800">{t.balance}</span></TableCell>
                  <TableCell align="right"><span className="text-[12px] font-bold text-slate-700">{new Date(t.timestamp).toLocaleString('vi-VN')}</span></TableCell>
                </TableRow>
            ))}
          </TableBody>
        </TableContainer>
      )}

      {activeTab === 'report' && (
        <div className="px-12 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
                <div className="flex items-center gap-4"><div className="p-4 bg-primary-50 text-primary-600 rounded-2xl"><BarChart3 className="w-8 h-8"/></div><div><h3 className="text-lg font-black text-slate-800 uppercase">Báo cáo Nhập - Xuất - Tồn</h3><p className="text-[10px] text-slate-400 font-bold uppercase">Tháng {reportMonth}/{reportYear}</p></div></div>
                <div className="flex gap-4"><select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className="bg-slate-50 border-none rounded-xl font-bold text-sm px-6">{Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}</select><button onClick={() => printNXTReport({ month: reportMonth, year: reportYear, items: nxtReport })} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg transition-all"><Printer className="w-5 h-5"/></button></div>
            </div>
            <TableContainer className="!px-0" rounded="rounded-2xl">
              <TableHead><TableHeaderCell>Sản phẩm</TableHeaderCell><TableHeaderCell align="center">Đầu kỳ</TableHeaderCell><TableHeaderCell align="center">Nhập</TableHeaderCell><TableHeaderCell align="center">Xuất</TableHeaderCell><TableHeaderCell align="center">Cuối kỳ</TableHeaderCell><TableHeaderCell align="right">Giá trị tồn</TableHeaderCell></TableHead>
              <TableBody>{nxtReport?.map(item => (<TableRow key={item.id}><TableCell><p className="font-black text-slate-800 text-[13px]">{item.name}</p></TableCell><TableCell align="center">{item.opening}</TableCell><TableCell align="center" className="font-black text-emerald-600">{item.imp}</TableCell><TableCell align="center" className="font-black text-rose-600">{item.exp}</TableCell><TableCell align="center" className="font-black text-primary-700">{item.closing}</TableCell><TableCell align="right" className="font-black">{formatCurrency((item.closing || 0) * (item.costPrice || 0))}</TableCell></TableRow>))}</TableBody>
            </TableContainer>
        </div>
      )}

      {isBulkModalOpen && (
          <Modal isOpen={true} onClose={() => setIsBulkModalOpen(false)} title="Lập phiếu Kho lô hàng" maxWidth="6xl" icon={<ListPlus className="w-6 h-6 text-primary-600" />}>
              <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-2 space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nghiệp vụ</label>
                          <div className="flex flex-col gap-2">
                              {[
                                  { id: 'import', label: 'Nhập kho', icon: ArrowDownToLine },
                                  { id: 'export', label: 'Xuất trả', icon: ArrowUpFromLine },
                                  { id: 'scrap', label: 'Xuất hủy', icon: Trash },
                                  { id: 'internal', label: 'Điều chuyển', icon: ArrowRightLeft }
                              ].map(type => (
                                  <button 
                                    key={type.id} 
                                    onClick={() => { setBulkType(type.id as TransactionType); setBulkItems([]); }} 
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase ${bulkType === type.id ? 'bg-primary-600 text-white border-transparent shadow-md' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-100'}`}
                                  >
                                      <type.icon className="w-4 h-4" /> {type.label}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="lg:col-span-10 space-y-6">
                          <div className="relative">
                              <div className="relative p-1 bg-slate-100 rounded-2xl border border-slate-200">
                                  <input 
                                    type="text" 
                                    placeholder="Tìm tên sản phẩm hoặc SKU..." 
                                    value={bulkProductSearch}
                                    onChange={e => { setBulkProductSearch(e.target.value); setShowBulkDropdown(true); }}
                                    className="w-full px-6 bg-white border-none font-black text-base py-3.5 rounded-xl outline-none shadow-sm"
                                  />
                                  {showBulkDropdown && bulkProductSearch && (
                                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 z-[600] shadow-xl rounded-2xl max-h-64 overflow-y-auto p-1.5 animate-in slide-in-from-top-2">
                                          {products.filter(p => p.name.toLowerCase().includes(bulkProductSearch.toLowerCase()) || p.sku.toLowerCase().includes(bulkProductSearch.toLowerCase())).map(p => (
                                              <div key={p.id} onClick={() => addProductToBulk(p)} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-4 border-b last:border-0 border-slate-50 rounded-xl transition-colors">
                                                  <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover" /></div>
                                                  <div className="flex-1"><p className="font-black text-xs text-slate-800 leading-tight">{p.name}</p><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tồn: {p.stock} | Giá: {formatCurrency(bulkType === 'import' ? p.costPrice : p.price)}</p></div>
                                                  <Plus className="w-4 h-4 text-primary-500" />
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Người giao/nhận</label>
                                  <input type="text" value={importMeta.receiver} onChange={e => setImportMeta({...importMeta, receiver: e.target.value})} className="w-full font-black bg-slate-50 border-none text-xs px-4 h-11 rounded-lg" placeholder="Họ tên..." />
                              </div>
                              <div className="space-y-1 relative">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Đối tác/Nhà CC</label>
                                  <input 
                                    type="text" 
                                    value={importMeta.supplierName} 
                                    onChange={e => {
                                        setImportMeta({...importMeta, supplierName: e.target.value, supplierId: ''});
                                        setSupplierSearch(e.target.value);
                                        setShowSupplierDropdown(true);
                                    }} 
                                    className="w-full font-black bg-slate-50 border-none text-xs px-4 h-11 rounded-lg" 
                                    placeholder="Chọn hoặc nhập tên..." 
                                    disabled={bulkType !== 'import'} 
                                  />
                                  {showSupplierDropdown && bulkType === 'import' && supplierSearch && (
                                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 z-[700] shadow-2xl rounded-xl max-h-48 overflow-y-auto p-1 animate-in slide-in-from-top-1">
                                          {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                                              <div 
                                                key={s.id} 
                                                onClick={() => selectSupplier(s)} 
                                                className="p-2.5 hover:bg-primary-50 cursor-pointer flex items-center justify-between rounded-lg transition-colors border-b last:border-0 border-slate-50"
                                              >
                                                  <div className="flex flex-col">
                                                      <span className="font-black text-[11px] text-slate-800 uppercase">{s.name}</span>
                                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{s.phone}</span>
                                                  </div>
                                                  <Check className={`w-3.5 h-3.5 text-primary-500 ${importMeta.supplierId === s.id ? 'opacity-100' : 'opacity-0'}`} />
                                              </div>
                                          ))}
                                          {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                                              <div className="p-4 text-center text-slate-300 font-bold text-[10px] uppercase italic">Đối tác mới (Chưa lưu)</div>
                                          )}
                                      </div>
                                  )}
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Số chứng từ</label>
                                  <input type="text" value={importMeta.refDocNumber} onChange={e => setImportMeta({...importMeta, refDocNumber: e.target.value})} className="w-full font-black bg-slate-50 border-none text-xs px-4 h-11 rounded-lg" placeholder="HĐ/Phiếu..." disabled={bulkType !== 'import'} />
                              </div>
                              <div className="space-y-1">
                                  <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${bulkType === 'import' ? 'text-primary-600' : 'text-slate-400'}`}>Ngày lập</label>
                                  <div className="relative group/date">
                                      <input 
                                        type="date" 
                                        value={importMeta.refDocDate} 
                                        onChange={e => setImportMeta({...importMeta, refDocDate: e.target.value})} 
                                        className={`w-full font-black text-xs px-4 h-11 rounded-lg transition-all outline-none border-2 ${bulkType === 'import' ? 'bg-white border-primary-50 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10' : 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed'}`} 
                                        disabled={bulkType !== 'import'} 
                                      />
                                  </div>
                              </div>
                              <div className="md:col-span-4 space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú nội dung</label>
                                  <input type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)} className="w-full font-bold bg-slate-50 border-none text-xs px-4 h-11 rounded-lg" placeholder="Lý do nhập/xuất hoặc nội dung bổ sung..." />
                              </div>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                              <div className="overflow-x-auto max-h-72">
                                <table className="w-full font-bold">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr className="text-slate-400 uppercase font-black text-[9px] tracking-widest">
                                            <th className="px-5 py-3 text-left">Mặt hàng</th>
                                            <th className="px-5 py-3 text-center w-40">Đơn giá</th>
                                            <th className="px-5 py-3 text-center w-48">Số lượng</th>
                                            <th className="px-5 py-3 text-right">Thành tiền</th>
                                            <th className="px-5 py-3 w-14"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {bulkItems.map((item, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-3">
                                                    <p className="font-black text-xs text-slate-800 leading-tight">{item.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-black tracking-widest">Tồn: {item.currentStock} {item.unit}</p>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <input 
                                                      type="number" 
                                                      value={item.price} 
                                                      onChange={e => setBulkItems(bulkItems.map((it, i) => i === idx ? {...it, price: Number(e.target.value)} : it))} 
                                                      className="w-36 bg-slate-50 border-none rounded-lg font-black text-center text-primary-700 py-2 text-xs"
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button onClick={() => setBulkItems(bulkItems.map((it, i) => i === idx ? {...it, quantity: Math.max(1, it.quantity - 1)} : it))} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"><Minus className="w-3.5 h-3.5"/></button>
                                                        <input 
                                                          type="number" 
                                                          value={item.quantity} 
                                                          onChange={e => setBulkItems(bulkItems.map((it, i) => i === idx ? {...it, quantity: Number(e.target.value)} : it))} 
                                                          className="w-20 bg-white border border-slate-200 rounded font-black text-center py-1.5 text-xs outline-none"
                                                        />
                                                        <button onClick={() => setBulkItems(bulkItems.map((it, i) => i === idx ? {...it, quantity: it.quantity + 1} : it))} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"><Plus className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-slate-800 text-xs">
                                                    {formatCurrency(item.quantity * item.price).replace('₫', '')}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <button onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4.5 h-4.5"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {bulkItems.length === 0 && (
                                            <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Danh sách đang trống</td></tr>
                                        )}
                                    </tbody>
                                </table>
                              </div>
                              
                              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                      <div className="p-2 bg-white/10 rounded-lg"><MoveRight className="w-5 h-5 text-primary-400"/></div>
                                      <div>
                                          <p className="text-[8px] font-black text-primary-300 uppercase tracking-widest leading-none mb-1">Loại phiếu</p>
                                          <h4 className="text-sm font-black uppercase leading-none">{bulkType === 'import' ? 'Nhập kho lô hàng' : bulkType === 'export' ? 'Xuất trả lô hàng' : 'Giao dịch nội bộ'}</h4>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng cộng (VNĐ)</p>
                                      <h2 className="text-2xl font-black text-primary-400 leading-none">{formatCurrency(bulkItems.reduce((sum, it) => sum + (it.quantity * it.price), 0))}</h2>
                                  </div>
                              </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-2">
                              <button 
                                onClick={() => setIsBulkModalOpen(false)} 
                                className="px-8 py-3 text-[10px] tracking-widest border-2 rounded-xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase"
                              >
                                HỦY BỔ
                              </button>
                              <Button 
                                variant="primary" 
                                onClick={handleSaveBulk} 
                                disabled={isProcessing || bulkItems.length === 0} 
                                className="px-14 py-3 shadow-md text-[10px] tracking-widest bg-primary-600 hover:bg-primary-700"
                              >
                                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                                  LƯU PHIẾU
                              </Button>
                          </div>
                      </div>
                  </div>
              </div>
          </Modal>
      )}

      {isProductModalOpen && (
          <Modal 
            isOpen={true} 
            onClose={() => setIsProductModalOpen(false)} 
            title={editingProduct ? "Cập nhật sản phẩm" : "Khai báo sản phẩm mới"} 
            maxWidth="5xl"
            icon={<Package className="w-6 h-6 text-primary-600" />}
          >
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-5">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
                              <input 
                                type="text" 
                                value={productForm.name || ''} 
                                onChange={e => setProductForm({...productForm, name: e.target.value})} 
                                className="w-full text-lg font-black" 
                                placeholder="VD: iPhone 15 Pro Max"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Danh mục</label>
                                  <select 
                                    value={productForm.categoryId || ''} 
                                    onChange={e => setProductForm({...productForm, categoryId: e.target.value})}
                                    className="w-full font-bold text-sm"
                                  >
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã SKU / Barcode</label>
                                  <input 
                                    type="text" 
                                    value={productForm.sku || ''} 
                                    onChange={e => setProductForm({...productForm, sku: e.target.value})} 
                                    className="w-full font-bold" 
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá vốn (Nhập)</label>
                                  <input 
                                    type="text" 
                                    value={formatCurrency(productForm.costPrice || 0).replace('₫', '').trim()} 
                                    onChange={e => handlePriceChange(e.target.value, 'costPrice')}
                                    className="w-full font-black text-right text-slate-500" 
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest ml-1">Giá bán lẻ</label>
                                  <input 
                                    type="text" 
                                    value={formatCurrency(productForm.price || 0).replace('₫', '').trim()} 
                                    onChange={e => handlePriceChange(e.target.value, 'price')}
                                    className="w-full font-black text-right text-primary-600 text-lg" 
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tồn kho</label>
                                  <input type="number" value={productForm.stock || 0} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full font-black text-center" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị</label>
                                  <input type="text" value={productForm.unit || 'Cái'} onChange={e => setProductForm({...productForm, unit: e.target.value})} className="w-full font-bold text-center" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest ml-1">Bảo hành (T)</label>
                                  <input type="number" value={productForm.warrantyPeriod || 12} onChange={e => setProductForm({...productForm, warrantyPeriod: Number(e.target.value)})} className="w-full font-black text-center text-primary-600" />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-5">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                              <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ScanBarcode className="w-3 h-3"/> Quản lý theo Serial</label>
                                  <button 
                                    onClick={() => setProductForm({...productForm, hasSerial: !productForm.hasSerial})}
                                    className={`w-10 h-5 rounded-full relative transition-all ${productForm.hasSerial ? 'bg-primary-600' : 'bg-slate-300'}`}
                                  >
                                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${productForm.hasSerial ? 'left-6' : 'left-1'}`}></div>
                                  </button>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ảnh sản phẩm (URL)</label>
                                  <div className="flex gap-3">
                                      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                          {productForm.image ? <img src={productForm.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-200" />}
                                      </div>
                                      <input type="text" value={productForm.image || ''} onChange={e => setProductForm({...productForm, image: e.target.value})} className="flex-1 font-mono text-[10px]" placeholder="https://..." />
                                  </div>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between items-center px-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả giới thiệu</label>
                                  <button onClick={handleAiGenerateDescription} disabled={isAiGenerating} className="text-[10px] font-black text-primary-600 uppercase flex items-center gap-1 hover:text-primary-800 disabled:opacity-50">
                                      {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Viết bằng AI
                                  </button>
                              </div>
                              <textarea value={productForm.description || ''} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full h-32 text-sm font-medium leading-relaxed" placeholder="Chi tiết sản phẩm..." />
                          </div>
                      </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>HỦY BỔ</Button>
                      <Button variant="primary" onClick={handleSaveProduct} disabled={isProcessing} className="px-12">
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                          {editingProduct ? 'CẬP NHẬT' : 'THÊM MỚI'}
                      </Button>
                  </div>
              </div>
          </Modal>
      )}

      {selectedTxCode && transactionDetails && (
          <Modal isOpen={true} onClose={() => setSelectedTxCode(null)} title={`Chứng từ: ${selectedTxCode}`} maxWidth="5xl" icon={<ReceiptText className="w-6 h-6 text-primary-600"/>}>
              <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5"><span className="text-[8px] font-black text-slate-400 uppercase">Thời gian</span><span className="text-[12px] font-black text-slate-800">{new Date(transactionDetails.timestamp).toLocaleString('vi-VN')}</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5"><span className="text-[8px] font-black text-slate-400 uppercase">Đối tác</span><span className="text-[12px] font-black text-slate-800 uppercase">{transactionDetails.supplierName || 'Hệ thống'}</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5"><span className="text-[8px] font-black text-slate-400 uppercase">Người nhận</span><span className="text-[12px] font-black text-primary-700">{transactionDetails.receiver || '---'}</span></div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5"><span className="text-[8px] font-black text-slate-400 uppercase">Loại</span><Badge variant="success" className="text-[8px] py-0.5 uppercase">{transactionDetails.type}</Badge></div>
                  </div>
                  <TableContainer rounded="rounded-md" className="!px-0 !py-0 border border-slate-100">
                      <TableHead><TableHeaderCell className="text-[9px] py-2">Sản phẩm</TableHeaderCell><TableHeaderCell align="center" className="text-[9px] py-2">SL</TableHeaderCell><TableHeaderCell align="right" className="text-[9px] py-2">Đơn giá</TableHeaderCell><TableHeaderCell align="right" className="text-[9px] py-2">Thành tiền</TableHeaderCell></TableHead>
                      <TableBody>{transactionDetails.items.map((it, idx) => (<TableRow key={idx}><TableCell className="!py-2.5"><span className="font-black text-slate-800 text-xs">{it.name}</span></TableCell><TableCell align="center" className="!py-2.5"><span className="font-black text-slate-700 text-xs">{it.quantity} {it.unit}</span></TableCell><TableCell align="right" className="!py-2.5"><span className="font-bold text-slate-500 text-xs">{formatCurrency(it.price).replace('₫', '')}</span></TableCell><TableCell align="right" className="!py-2.5"><span className="font-black text-primary-700 text-xs">{formatCurrency(it.total)}</span></TableCell></TableRow>))}</TableBody>
                  </TableContainer>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <Button variant="secondary" onClick={handlePrintTransaction} className="py-2.5 px-8 shadow-sm hover:shadow-md transition-all active:scale-95 text-[10px] tracking-widest bg-white border-slate-200 text-slate-600">
                          <Printer className="w-4 h-4 mr-2 text-primary-600" />
                          IN CHỨNG TỪ
                      </Button>
                      <Button variant="primary" onClick={() => setSelectedTxCode(null)} className="py-2.5 px-10 uppercase text-[10px] tracking-widest">Đóng</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
