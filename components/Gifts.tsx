
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gift, Product, Order, Customer } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Edit2, Trash2, X, Save, Search, Gift as GiftIcon, Package, Check, BarChart3, ChevronDown, ChevronRight, Calendar, Loader2, Image as ImageIcon, Sparkles, RefreshCcw } from 'lucide-react';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Button, Badge, EmptyState } from './ui/Base';
import { Modal } from './ui/Modal';

type Tab = 'list' | 'report';

export const Gifts: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isSavingRef = useRef(false);

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [expandedGiftId, setExpandedGiftId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Gift>>({
    name: '', pointsRequired: 0, stock: 0, description: '', image: '', productId: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const [g, p, o, c] = await Promise.all([
            StorageService.getGifts().catch(() => []),
            StorageService.getProducts().catch(() => []),
            StorageService.getOrders().catch(() => []),
            StorageService.getCustomers().catch(() => [])
        ]);
        setGifts(Array.isArray(g) ? g : []);
        setProducts(Array.isArray(p) ? p : []);
        setOrders(Array.isArray(o) ? o : []);
        setCustomers(Array.isArray(c) ? c : []);
    } finally { setIsProcessing(false); }
  };

  const handleOpenModal = (gift?: Gift) => {
    if (gift) {
      setEditingGift(gift);
      setFormData(gift);
    } else {
      setEditingGift(null);
      setFormData({ 
        name: '', pointsRequired: 0, stock: 0, description: '', 
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80',
        productId: ''
      });
    }
    setProductSearchTerm('');
    setShowProductDropdown(false);
    setIsModalOpen(true);
  };

  const handleSelectProduct = (product: Product) => {
      setFormData({
          ...formData,
          name: product.name,
          image: product.image,
          description: `Sản phẩm kho: ${product.categoryName}`,
          productId: product.id,
          stock: product.stock
      });
      setShowProductDropdown(false);
      setProductSearchTerm('');
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || isSavingRef.current) return;
    isSavingRef.current = true; setIsProcessing(true);

    try {
        const giftData: Gift = {
          id: editingGift ? editingGift.id : `G_${Date.now()}`,
          name: formData.name.trim(),
          pointsRequired: Math.max(0, Number(formData.pointsRequired || 0)),
          stock: Math.max(0, Number(formData.stock || 0)),
          description: formData.description || '',
          image: formData.image || 'https://via.placeholder.com/200',
          productId: formData.productId || undefined,
          createdAt: editingGift ? editingGift.createdAt : Date.now(),
          updatedAt: Date.now(),
          isActive: true
        };

        await StorageService.saveGift(giftData);
        await loadData();
        setIsModalOpen(false);
    } catch (e: any) {
        alert(e.message || "Lỗi khi lưu quà tặng.");
    } finally {
        setIsProcessing(false);
        isSavingRef.current = false;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xác nhận xóa vĩnh viễn món quà này?")) {
      setIsProcessing(true);
      try {
          await StorageService.deleteGift(id);
          await loadData();
      } catch (e) {
          alert("Lỗi khi xóa món quà.");
      } finally { setIsProcessing(false); }
    }
  };

  const stats = useMemo(() => {
    let totalLoyaltyValue = 0; // Quà đổi điểm
    let totalPromoValue = 0;    // Quà khuyến mãi 0đ

    const details = gifts.map(gift => {
        const linkedProduct = products.find(p => p.id === gift.productId);
        const costPrice = (linkedProduct ? linkedProduct.costPrice : 0) || (products.find(p => p.name === gift.name)?.costPrice || 0);
        
        let givenQty = 0;
        let givenValue = 0;
        const history: any[] = [];

        orders.forEach(o => {
            if (o.status === 'cancelled') return;
            o.items.forEach(i => {
                const isMatch = i.id === gift.productId || i.name === gift.name;
                const isActuallyGift = i.isGift || i.appliedPrice === 0;

                if (isMatch && isActuallyGift) {
                    const lineValue = i.quantity * (i.costPrice || costPrice);
                    givenQty += i.quantity;
                    givenValue += lineValue;

                    if (i.isGift) totalLoyaltyValue += lineValue;
                    else totalPromoValue += lineValue;

                    history.push({
                        code: o.code, date: o.createdAt, customer: o.customerName, 
                        qty: i.quantity, cost: i.costPrice || costPrice, total: lineValue,
                        type: i.isGift ? 'TRI_AN' : 'KHUYEN_MAI'
                    });
                }
            });
        });

        return { ...gift, givenQty, givenValue, costPrice, history: history.sort((a,b) => b.date - a.date) };
    });

    return { 
        totalValue: totalLoyaltyValue + totalPromoValue, 
        totalLoyaltyValue, 
        totalPromoValue,
        details: details.sort((a,b) => b.givenValue - a.givenValue) 
    };
  }, [gifts, products, orders]);

  const filtered = (activeTab === 'list' ? gifts : stats.details).filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            <button onClick={() => setActiveTab('list')} className={`flex-1 lg:flex-none px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Danh sách quà</button>
            <button onClick={() => setActiveTab('report')} className={`flex-1 lg:flex-none px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'report' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Chi phí quà tặng</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm tên món quà..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300"
                />
            </div>
            {activeTab === 'list' && (
                <button 
                  onClick={() => handleOpenModal()}
                  className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-8"
                >
                  <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm quà tặng</span>
                </button>
            )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
            <TableHead>
                <TableHeaderCell className="w-[40%]">Món quà tri ân</TableHeaderCell>
                <TableHeaderCell align="center">Điểm đổi</TableHeaderCell>
                <TableHeaderCell align="center">Liên kết kho</TableHeaderCell>
                <TableHeaderCell align="right">Tồn quà</TableHeaderCell>
                <TableHeaderCell align="right" className="w-[15%]"></TableHeaderCell>
            </TableHead>
            <TableBody>
                {filtered.map(gift => (
                    <TableRow key={gift.id} className="group transition-all">
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl border border-slate-100 overflow-hidden shrink-0 bg-slate-50">
                                  <img src={gift.image} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100')} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm uppercase leading-tight group-hover:text-primary-700 transition-colors">{gift.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight line-clamp-1">{gift.description || 'Chương trình tri ân khách hàng'}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell align="center">
                            <Badge variant="warning" className="px-4 py-1">
                                <GiftIcon className="w-3 h-3 mr-1.5 inline" /> {gift.pointsRequired} P
                            </Badge>
                        </TableCell>
                        <TableCell align="center">
                            {gift.productId ? (
                                <Badge variant="success" className="text-[9px]">ĐÃ NỐI KHO</Badge>
                            ) : (
                                <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Chưa liên kết</span>
                            )}
                        </TableCell>
                        <TableCell align="right">
                            <Badge variant={gift.stock <= 5 ? 'danger' : 'neutral'} className="text-[10px] py-0.5 px-3">
                                {gift.stock}
                            </Badge>
                        </TableCell>
                        <TableCell align="right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                                <button onClick={() => handleOpenModal(gift)} className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => handleDelete(gift.id)} className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </TableContainer>
        </>
      ) : (
        <div className="px-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm group hover:border-primary-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng chi phí quà tặng</p>
                    <h2 className="text-3xl font-black text-slate-800">{formatVND(stats.totalValue)}</h2>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm group hover:border-purple-200 transition-all">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Vốn quà Tri ân (Đổi điểm)</p>
                    <h2 className="text-2xl font-black text-purple-700">{formatVND(stats.totalLoyaltyValue)}</h2>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm group hover:border-emerald-200 transition-all">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Vốn quà Khuyến mãi (0đ)</p>
                    <h2 className="text-2xl font-black text-emerald-700">{formatVND(stats.totalPromoValue)}</h2>
                </div>
            </div>

            <TableContainer className="!px-0" rounded="rounded-2xl">
                <TableHead>
                    <TableHeaderCell className="w-12"></TableHeaderCell>
                    <TableHeaderCell>Tên món quà</TableHeaderCell>
                    <TableHeaderCell align="right">Giá vốn quà</TableHeaderCell>
                    <TableHeaderCell align="center" className="bg-primary-50/30">Số lượng đã tặng</TableHeaderCell>
                    <TableHeaderCell align="right" className="bg-rose-50/30">Tổng vốn xuất</TableHeaderCell>
                </TableHead>
                <TableBody>
                    {filtered.map((item: any) => (
                        <React.Fragment key={item.id}>
                            <TableRow onClick={() => setExpandedGiftId(expandedGiftId === item.id ? null : item.id)} className="cursor-pointer group">
                                <TableCell align="center">{expandedGiftId === item.id ? <ChevronDown className="w-4 h-4 text-primary-600"/> : <ChevronRight className="w-4 h-4 text-slate-300"/>}</TableCell>
                                <TableCell><p className="font-black text-slate-800 uppercase text-[13px]">{item.name}</p></TableCell>
                                <TableCell align="right" className="font-bold text-slate-500">{formatVND(item.costPrice)}</TableCell>
                                <TableCell align="center" className="font-black text-primary-700 bg-primary-50/10">{item.givenQty}</TableCell>
                                <TableCell align="right" className="font-black text-rose-600 bg-rose-50/10">{formatVND(item.givenValue)}</TableCell>
                            </TableRow>
                            {expandedGiftId === item.id && (
                                <TableRow className="bg-slate-50/50">
                                    <TableCell colSpan={5} className="!p-6">
                                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="p-3 bg-slate-100/50 font-black text-[9px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-200">Chi tiết lịch sử xuất quà</div>
                                            <table className="w-full text-xs">
                                                <thead><tr className="text-left border-b border-slate-100 text-slate-400 uppercase font-black text-[9px]"><th className="p-3">Ngày</th><th className="p-3">Hóa đơn</th><th className="p-3">Loại</th><th className="p-3 text-center">SL</th><th className="p-3 text-right">Vốn xuất</th></tr></thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {item.history.map((h: any, idx: number) => (
                                                        <tr key={idx}>
                                                            <td className="p-3 text-slate-500 font-bold">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                                                            <td className="p-3 text-primary-600 font-black uppercase">{h.code}</td>
                                                            <td className="p-3"><Badge variant={h.type === 'TRI_AN' ? 'warning' : 'success'} className="text-[8px]">{h.type === 'TRI_AN' ? 'TRI ÂN' : 'KHUYẾN MÃI'}</Badge></td>
                                                            <td className="p-3 text-center font-black">{h.qty}</td>
                                                            <td className="p-3 text-right text-slate-800 font-black">{formatVND(h.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))}
                </TableBody>
            </TableContainer>
        </div>
      )}

      {/* MODAL THÊM QUÀ TẶNG */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingGift ? "Cập nhật quà tặng" : "Thiết lập món quà mới"} maxWidth="4xl">
            <div className="space-y-6">
                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 relative group">
                    <label className="text-[10px] font-black text-primary-700 uppercase tracking-widest mb-2 block flex items-center gap-2"><Package className="w-3.5 h-3.5"/> Liên kết nhanh từ hàng hóa trong kho</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-300 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Tìm sản phẩm..." 
                          value={productSearchTerm} 
                          onChange={e => {setProductSearchTerm(e.target.value); setShowProductDropdown(true);}} 
                          className="w-full pl-11 pr-4 py-2.5 bg-white border border-primary-200 focus:border-primary-600 outline-none font-bold text-sm transition-all" 
                        />
                    </div>
                    {showProductDropdown && productSearchTerm && (
                        <div className="absolute left-4 right-4 top-full mt-2 bg-white border border-slate-200 z-[600] shadow-xl rounded-xl max-h-60 overflow-y-auto p-1">
                            {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b last:border-0 border-slate-100 rounded-lg">
                                    <div className="w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover" /></div>
                                    <div className="flex-1"><p className="font-black text-xs uppercase text-slate-800 leading-tight">{p.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Tồn: {p.stock} | Vốn: {formatVND(p.costPrice)}</p></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên món quà / Chương trình *</label><input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full font-black text-lg" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Điểm đổi (P)</label><input type="number" value={formData.pointsRequired || 0} onChange={e => setFormData({...formData, pointsRequired: Number(e.target.value)})} className="w-full font-black text-center text-xl text-amber-600 bg-amber-50 border-amber-100" /></div>
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tồn kho quà</label><input type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full font-black text-center text-xl" /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ảnh minh họa (URL)</label><input type="text" value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full font-mono text-[10px]" /></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả ngắn gọn</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full text-sm font-medium h-20" /></div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>HỦY BỔ</Button><Button variant="primary" onClick={handleSave} disabled={isProcessing} className="px-12">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}XÁC NHẬN LƯU</Button></div>
            </div>
        </Modal>
      )}
    </div>
  );
};
