
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WarrantyItem, User } from '../types';
import { StorageService } from '../services/storageService';
import { Search, Plus, Edit2, Trash2, ShieldCheck, Calendar, Clock, Package, ScanBarcode, Loader2, XCircle, Info, Save, ShieldAlert, User as UserIcon } from 'lucide-react';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Button, Badge, EmptyState } from './ui/Base';
import { Modal } from './ui/Modal';

type WarrantyStatusFilter = 'all' | 'active' | 'expired' | 'repairing';

export const Warranty: React.FC = () => {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WarrantyStatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarrantyItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isSavingRef = useRef(false);

  const [formData, setFormData] = useState<Partial<WarrantyItem>>({
    serialNumber: '', productName: '', customerName: '', customerPhone: '',
    purchaseDate: Date.now(), durationMonths: 12, status: 'active', notes: '', orderId: ''
  });

  useEffect(() => { 
    const user = StorageService.getCurrentUserSync();
    setCurrentUser(user);
    loadData(); 
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const data = await StorageService.getWarranties();
        const now = Date.now();
        const updatedData = data.map(item => {
          if (item.status === 'active' && now > item.expiryDate) {
            return { ...item, status: 'expired' as const };
          }
          return item;
        });
        setWarranties(updatedData.sort((a, b) => b.purchaseDate - a.purchaseDate));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOpenModal = (item?: WarrantyItem) => {
    if (!isAdmin && item) {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
        return;
    }

    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      if (!isAdmin) return; 
      setEditingItem(null);
      setFormData({
        serialNumber: '', productName: '', customerName: '', customerPhone: '',
        purchaseDate: Date.now(), durationMonths: 12, status: 'active', notes: '', orderId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin) return alert("Bạn không có quyền thực hiện thao tác này.");
    if (!formData.serialNumber?.trim() || !formData.productName?.trim() || !formData.customerName?.trim()) {
      alert("Vui lòng nhập các thông tin bắt buộc (*)");
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true; setIsProcessing(true);

    try {
        const pDate = new Date(formData.purchaseDate || Date.now());
        const eDate = new Date(pDate);
        eDate.setMonth(eDate.getMonth() + Number(formData.durationMonths || 12));

        const itemData: WarrantyItem = {
          id: editingItem ? editingItem.id : `W_${Date.now()}`,
          serialNumber: formData.serialNumber.trim().toUpperCase(),
          productId: formData.productId || '',
          productName: formData.productName.trim(),
          customerId: formData.customerId || '',
          customerName: formData.customerName.trim(),
          customerPhone: formData.customerPhone || '',
          purchaseDate: pDate.getTime(),
          expiryDate: eDate.getTime(),
          durationMonths: Number(formData.durationMonths || 12),
          status: (formData.status as any) || 'active',
          notes: formData.notes || '',
          orderId: formData.orderId || '',
          createdAt: editingItem ? editingItem.createdAt : Date.now(),
          updatedAt: Date.now(),
          isActive: true,
          history: editingItem ? editingItem.history : [
              { date: Date.now(), action: 'Khởi tạo', note: 'Lập phiếu bảo hành thủ công.' }
          ]
        };

        await StorageService.saveWarranty(itemData);
        await loadData();
        setIsModalOpen(false);
    } catch (e: any) {
        alert(e.message || "Lỗi khi lưu phiếu bảo hành.");
    } finally {
        setIsProcessing(false);
        isSavingRef.current = false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return alert("Chỉ quản trị viên mới có quyền xóa hồ sơ.");
    if (confirm("Thao tác này sẽ xóa vĩnh viễn hồ sơ bảo hành. Bạn có chắc chắn?")) {
      setIsProcessing(true);
      try {
          await StorageService.deleteWarranty(id);
          await loadData();
      } catch (e) {
          alert("Lỗi khi xóa phiếu bảo hành.");
      } finally {
          setIsProcessing(false);
      }
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('vi-VN');

  const filtered = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return warranties.filter(w => {
      const matchesSearch = 
        w.serialNumber.toLowerCase().includes(lowerSearch) || 
        w.customerPhone.includes(lowerSearch) ||
        w.productName.toLowerCase().includes(lowerSearch) ||
        w.customerName.toLowerCase().includes(lowerSearch);
      
      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [warranties, searchTerm, statusFilter]);

  // Helper tính số ngày còn lại
  const getRemainingDays = (expiryTs: number) => {
    const now = Date.now();
    const diff = expiryTs - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            {(['all', 'active', 'repairing', 'expired'] as const).map(s => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === s ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {s === 'all' ? 'Tất cả' : s === 'active' ? 'Còn hạn' : s === 'repairing' ? 'Đang sửa' : 'Hết hạn'}
                </button>
            ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Serial, tên SP, khách hàng..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300"
                />
            </div>
            {isAdmin && (
                <button 
                    onClick={() => handleOpenModal()}
                    className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-6"
                >
                    <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Lập phiếu mới</span>
                </button>
            )}
            {!isAdmin && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Chế độ xem</span>
                </div>
            )}
        </div>
      </div>

      <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
        <TableHead>
            <TableHeaderCell className="w-[16%]">Mã Serial</TableHeaderCell>
            <TableHeaderCell className="w-[18%]">Sản phẩm</TableHeaderCell>
            <TableHeaderCell className="w-[16%]">Khách hàng</TableHeaderCell>
            <TableHeaderCell className="w-[13%]">Kích hoạt</TableHeaderCell>
            <TableHeaderCell className="w-[13%]">Hết hạn</TableHeaderCell>
            <TableHeaderCell align="center" className="w-[14%]">Trạng thái</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[10%]"></TableHeaderCell>
        </TableHead>
        <TableBody>
          {filtered.map(item => {
            const daysLeft = getRemainingDays(item.expiryDate);
            return (
              <TableRow key={item.id} onClick={() => handleOpenModal(item)} className="group transition-all">
                <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border transition-colors ${item.status === 'expired' ? 'bg-slate-50 border-slate-200 text-slate-300' : 'bg-primary-50 border-primary-100 text-primary-600'}`}>
                          <ScanBarcode className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-800 text-[13px] uppercase tracking-tighter group-hover:text-primary-700 transition-colors">{item.serialNumber}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-300" />
                      <p className="font-bold text-slate-600 text-[13px] leading-tight truncate max-w-[150px]">{item.productName}</p>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <UserIcon className="w-3 h-3" />
                      </div>
                      <p className="font-black text-slate-700 text-[13px] leading-tight group-hover:text-primary-600 transition-colors uppercase truncate max-w-[120px]">{item.customerName}</p>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                      <Calendar className="w-3.5 h-3.5 opacity-50"/> {formatDate(item.purchaseDate)}
                    </div>
                </TableCell>
                <TableCell>
                    <div className={`flex items-center gap-2 text-[12px] font-black ${item.status === 'expired' ? 'text-slate-300' : 'text-emerald-600'}`}>
                      <Clock className="w-3.5 h-3.5 opacity-50"/> {formatDate(item.expiryDate)}
                    </div>
                </TableCell>
                <TableCell align="center">
                    <Badge variant={
                      item.status === 'active' ? (daysLeft < 30 ? 'warning' : 'success') : 
                      item.status === 'expired' ? 'danger' : 
                      item.status === 'repairing' ? 'warning' : 'neutral'
                    }>
                        {item.status === 'active' ? (daysLeft > 0 ? `CÒN ${daysLeft} NGÀY` : 'HẾT HẠN') : 
                         item.status === 'expired' ? 'HẾT HẠN' : 
                         item.status === 'repairing' ? 'ĐANG SỬA' : 'ĐÃ HỦY'}
                    </Badge>
                </TableCell>
                <TableCell align="right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                        {isAdmin ? (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                              className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Sửa hồ sơ"
                            >
                              <Edit2 className="w-4 h-4"/>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                              className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                            className="p-2.5 text-slate-400 hover:text-sky-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                            title="Xem chi tiết"
                          >
                            <Info className="w-4 h-4"/>
                          </button>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableContainer>

      {filtered.length === 0 && (
        <EmptyState 
          icon={<ShieldCheck className="w-16 h-16" />} 
          title="Không tìm thấy bảo hành" 
          description={searchTerm ? `Không có kết quả nào cho "${searchTerm}"` : "Hiện tại không có phiếu bảo hành nào trong danh sách."} 
        />
      )}

      {/* MODAL CHI TIẾT/THÊM MỚI */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingItem ? (isAdmin ? "Hồ sơ bảo hành thiết bị" : "Thông tin bảo hành (Chỉ xem)") : "Lập phiếu bảo hành mới"} maxWidth="4xl">
            <div className="space-y-6">
                {!isAdmin && (
                    <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <div className="p-2 bg-amber-600 text-white rounded-lg"><ShieldAlert className="w-5 h-5"/></div>
                        <div>
                            <h4 className="font-black text-amber-700 uppercase text-xs leading-tight">Chế độ giới hạn quyền hạn</h4>
                            <p className="text-[10px] text-amber-500 font-medium italic">Bạn chỉ có quyền xem lịch sử, không thể thay đổi thông tin hồ sơ này.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                           <ScanBarcode className="w-4 h-4 text-primary-600"/>
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin thiết bị</h3>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số Serial / IMEI *</label>
                          <input type="text" value={formData.serialNumber || ''} onChange={e => setFormData({...formData, serialNumber: e.target.value.toUpperCase()})} className="w-full text-lg font-black" placeholder="VD: LGC999222" disabled={!!editingItem || !isAdmin} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
                          <input type="text" value={formData.productName || ''} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full font-black text-base" disabled={!isAdmin} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tình trạng sửa chữa / Ghi chú</label>
                          <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-24 text-sm font-medium leading-relaxed" placeholder="Nhập tình trạng máy hoặc linh kiện đã thay thế..." disabled={!isAdmin} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                           <Calendar className="w-4 h-4 text-emerald-600"/>
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời hạn & Khách hàng</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kích hoạt</label>
                              <input type="date" value={formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : ''} onChange={e => setFormData({...formData, purchaseDate: e.target.valueAsNumber})} className="w-full font-black text-xs" disabled={!isAdmin} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest ml-1">BH (Tháng)</label>
                              <input type="number" value={formData.durationMonths || 12} onChange={e => setFormData({...formData, durationMonths: Number(e.target.value)})} className="w-full font-black text-center text-lg text-primary-600" disabled={!isAdmin} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ sở hữu thiết bị *</label>
                          <input type="text" value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full font-black text-base" disabled={!isAdmin} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại liên hệ</label>
                          <input type="text" value={formData.customerPhone || ''} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full font-black text-base" disabled={!isAdmin} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái bảo hành</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'active', label: 'CÒN HẠN', color: 'bg-emerald-600' },
                                    { id: 'repairing', label: 'ĐANG SỬA', color: 'bg-orange-50' },
                                    { id: 'expired', label: 'HẾT HẠN', color: 'bg-slate-400' },
                                    { id: 'void', label: 'HỦY PHIẾU', color: 'bg-rose-600' }
                                ].map(st => (
                                    <button 
                                      key={st.id} 
                                      onClick={() => isAdmin && setFormData({...formData, status: st.id as any})} 
                                      className={`py-3 px-2 rounded-xl border-2 text-[10px] font-black transition-all ${formData.status === st.id ? `${st.id === 'active' ? 'bg-emerald-600' : st.id === 'repairing' ? 'bg-orange-500' : st.id === 'expired' ? 'bg-slate-400' : 'bg-rose-600'} text-white border-transparent shadow-lg` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'} ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                                    >
                                      {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {editingItem && editingItem.history && editingItem.history.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3 px-1">
                          <Info className="w-4 h-4 text-slate-400" />
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử sự vụ (Repair Log)</h4>
                      </div>
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-xs">
                              <thead>
                                  <tr className="text-left border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                      <th className="p-3">Ngày thực hiện</th>
                                      <th className="p-3">Hành động / Nghiệp vụ</th>
                                      <th className="p-3">Nội dung chi tiết</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {editingItem.history.slice().reverse().map((h, idx) => (
                                      <tr key={idx} className="hover:bg-slate-100/30 transition-colors">
                                          <td className="p-3 font-bold text-slate-500 whitespace-nowrap">{formatDate(h.date)}</td>
                                          <td className="p-3"><span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-700">{h.action}</span></td>
                                          <td className="p-3 text-slate-600 font-medium italic">"{h.note}"</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-4">
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>HỦY BỔ</Button>
                        {isAdmin && (
                            <Button variant="primary" onClick={handleSave} disabled={isProcessing} className="px-12">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                                LƯU THAY ĐỔI
                            </Button>
                        )}
                        {!isAdmin && (
                            <Button variant="primary" onClick={() => setIsModalOpen(false)} className="px-12">ĐÓNG</Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};
