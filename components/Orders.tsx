
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, User as UserType } from '../types';
import { StorageService } from '../services/storageService';
import { printInvoice } from '../services/printService';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, EmptyState, Button, Badge } from './ui/Base';
import { Modal } from './ui/Modal';
import { 
  FileText, User, XCircle, ScanBarcode, Printer, Hammer,
  Wallet, ReceiptText, Clock, Trash2, Search as SearchIcon,
  ArrowUpFromLine, Gift as GiftIcon, Package2, AlertTriangle, Loader2, RefreshCcw,
  Edit, Save, ShieldCheck, Calendar, UserCheck
} from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // State chỉnh sửa cho Admin
  const [isAdminEditMode, setIsAdminEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ date: '', time: '', staffName: '', note: '' });

  useEffect(() => {
    setCurrentUser(StorageService.getCurrentUserSync());
    loadData();
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const o = await StorageService.getOrders();
      setOrders(Array.isArray(o) ? o.sort((a, b) => b.createdAt - a.createdAt) : []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      const success = await StorageService.cancelOrder(selectedOrder.id);
      if (success) { 
        await loadData(); 
        setSelectedOrder(null); 
        setShowCancelConfirm(false);
      }
    } catch (err: any) {
        alert(err.message || "Không thể hủy đơn hàng.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeletePermanently = async () => {
      if (!selectedOrder || !isAdmin || isProcessing) return;
      setIsProcessing(true);
      try {
          await StorageService.deleteOrderPermanently(selectedOrder.id);
          await loadData();
          setSelectedOrder(null);
          setShowDeleteConfirm(false);
      } catch (err: any) {
          alert(err.message || "Lỗi xóa đơn hàng.");
      } finally {
          setIsProcessing(true);
      }
  };

  const handleSaveAdminEdit = async () => {
      if (!selectedOrder || !isAdmin || isProcessing) return;
      
      const newTimestamp = new Date(`${editForm.date}T${editForm.time}`).getTime();
      if (isNaN(newTimestamp)) return alert("Ngày giờ không hợp lệ");

      setIsProcessing(true);
      try {
          await StorageService.updateOrderMetadata(selectedOrder.id, {
              createdAt: newTimestamp,
              staffName: editForm.staffName,
              note: editForm.note
          });
          await loadData();
          setIsAdminEditMode(false);
          setSelectedOrder(null);
      } catch (err: any) {
          alert(err.message || "Lỗi cập nhật đơn hàng.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleOpenDetail = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowCancelConfirm(false);
    setShowDeleteConfirm(false);
    setIsAdminEditMode(false);

    // Init edit form
    const d = new Date(order.createdAt);
    setEditForm({
        date: d.toISOString().split('T')[0],
        time: d.toTimeString().split(' ')[0].slice(0, 5),
        staffName: order.staffName,
        note: order.note || ''
    });
  }, []);

  const filteredOrders = useMemo(() => {
    const ordersList = orders || [];
    return ordersList.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (order.code || "").toLowerCase().includes(searchLower) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
        (order.customerPhone && order.customerPhone.includes(searchLower));
      
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatDate = (ts: number) => new Date(ts).toLocaleString('vi-VN');

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
          {(['all', 'completed', 'cancelled'] as const).map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === s ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {s === 'all' ? 'Tất cả đơn' : s === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, tên, SĐT..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300"
              />
            </div>
            <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-primary-600 transition-all active:scale-90 shadow-sm">
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
        <TableHead>
            <TableHeaderCell className="w-[18%]">Mã hóa đơn</TableHeaderCell>
            <TableHeaderCell className="w-[20%]">Thời gian</TableHeaderCell>
            <TableHeaderCell className="w-[22%]">Khách hàng</TableHeaderCell>
            <TableHeaderCell align="center" className="w-[10%]">SL món</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[15%]">Thanh toán</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[15%]"></TableHeaderCell>
        </TableHead>
        <TableBody>
          {filteredOrders?.map(order => (
            <TableRow 
              key={order.id} 
              onClick={() => handleOpenDetail(order)} 
              className={`group transition-all ${order.status === 'cancelled' ? 'bg-rose-50/30' : ''}`}
            >
              <TableCell>
                <div className="flex items-center">
                  <span className={`font-black text-sm uppercase tracking-tighter ${order.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-primary-600'}`}>{order.code}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-[13px] text-slate-700 font-bold">{(formatDate(order.createdAt) || "").split(', ')[0]}</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase">{(formatDate(order.createdAt) || "").split(', ')[1]}</span>
                </div>
              </TableCell>
              <TableCell>
                  <p className="font-black text-slate-800 text-sm uppercase truncate max-w-[180px]">{order.customerName || 'Khách lẻ'}</p>
              </TableCell>
              <TableCell align="center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-black text-xs text-slate-600 border border-slate-200">
                  {order.items?.reduce((a,b) => a + (b.quantity || 0), 0) || 0}
                </div>
              </TableCell>
              <TableCell align="right">
                <div className="flex flex-col items-end">
                  <span className={`font-black text-base ${order.status === 'cancelled' ? 'text-slate-300 line-through' : 'text-primary-700'}`}>{formatCurrency(order.total)}</span>
                  {order.status === 'cancelled' && (
                    <Badge variant="danger" className="text-[8px] py-0 px-2 mt-1">
                      Đã hủy
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell align="right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); printInvoice(order); }} 
                        className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90" 
                        title="In lại"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                  </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableContainer>

      {(!filteredOrders || filteredOrders.length === 0) && (
        <EmptyState 
          icon={<FileText className="w-16 h-16" />} 
          title="Không tìm thấy đơn hàng" 
          description={searchTerm ? `Không có kết quả nào cho "${searchTerm}"` : "Hiện tại chưa có đơn hàng nào trong mục này."}
        />
      )}

      {selectedOrder && (
        <Modal 
          key={selectedOrder.id}
          isOpen={true} 
          onClose={() => !isProcessing && setSelectedOrder(null)} 
          title={`Chứng từ điện tử: ${selectedOrder.code}`} 
          maxWidth="5xl" 
          icon={<ReceiptText className="w-6 h-6" />}
          hideGrid={true}
        >
            <div className="space-y-4">
                {/* ADMIN EDIT PANEL */}
                {isAdmin && (
                    <div className={`p-5 rounded-2xl border-2 transition-all ${isAdminEditMode ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-600 text-white rounded-lg"><ShieldCheck className="w-4 h-4"/></div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Điều khiển Quản trị viên</h4>
                            </div>
                            {!isAdminEditMode ? (
                                <button onClick={() => setIsAdminEditMode(true)} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                    <Edit className="w-3 h-3"/> Chỉnh sửa Metadata
                                </button>
                            ) : (
                                <button onClick={() => setIsAdminEditMode(false)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500">Hủy sửa</button>
                            )}
                        </div>

                        {isAdminEditMode && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Ngày lập đơn</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400"/>
                                        <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full pl-9 !h-10 text-xs font-black border-indigo-100 focus:border-indigo-400 bg-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Giờ lập</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400"/>
                                        <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="w-full pl-9 !h-10 text-xs font-black border-indigo-100 focus:border-indigo-400 bg-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nhân viên thực hiện</label>
                                    <div className="relative">
                                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400"/>
                                        <input type="text" value={editForm.staffName} onChange={e => setEditForm({...editForm, staffName: e.target.value})} className="w-full pl-9 !h-10 text-xs font-black border-indigo-100 focus:border-indigo-400 bg-white" />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleSaveAdminEdit} disabled={isProcessing} className="w-full !h-10 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>} Lưu thay đổi
                                    </button>
                                </div>
                                <div className="lg:col-span-4 space-y-1">
                                    <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">Ghi chú nội bộ</label>
                                    <input type="text" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} className="w-full !h-10 text-xs font-bold border-indigo-100 focus:border-indigo-400 bg-white" placeholder="Sửa lý do hoặc bổ sung thông tin..." />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {selectedOrder.status === 'cancelled' && (
                  <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-2">
                    <div className="p-2 bg-rose-600 text-white rounded-lg"><XCircle className="w-6 h-6"/></div>
                    <div>
                      <h4 className="font-black text-rose-700 uppercase text-md leading-tight">Đơn hàng này đã bị hủy bỏ</h4>
                      <p className="text-xs text-rose-500 font-medium">Hệ thống đã tự động hoàn kho và cân đối sổ sách.</p>
                    </div>
                  </div>
                )}

                {!isAdminEditMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Thời gian giao dịch</span>
                            <span className="text-[13px] font-black text-slate-800 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400"/> {formatDate(selectedOrder.createdAt)}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</span>
                            <span className="text-[13px] font-black text-slate-800 flex items-center gap-1.5 uppercase"><User className="w-3.5 h-3.5 text-slate-400"/> {selectedOrder.customerName}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mã phiếu xuất</span>
                            <span className="text-[13px] font-black text-slate-800 flex items-center gap-1.5 uppercase"><ArrowUpFromLine className="w-3.5 h-3.5 text-slate-400"/> {selectedOrder.code}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hình thức thanh toán</span>
                            <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-slate-400"/>
                            <Badge variant="neutral" className="text-[8px] py-0.5 px-2 font-black uppercase bg-white border-slate-200">
                                {selectedOrder.paymentMethod === 'cash' ? 'Tiền mặt' : (selectedOrder.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ')}
                            </Badge>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chi tiết sản phẩm đã mua</h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Nhân viên lập: <span className="text-slate-800 font-black">{selectedOrder.staffName}</span></span>
                    </div>
                    <TableContainer rounded="rounded-md" className="!px-0 !py-0 border border-slate-100">
                        <TableHead>
                            <TableHeaderCell className="text-[9px] py-2">Mặt hàng</TableHeaderCell>
                            <TableHeaderCell align="center" className="text-[9px] py-2">Số lượng</TableHeaderCell>
                            <TableHeaderCell align="right" className="text-[9px] py-2">Đơn giá</TableHeaderCell>
                            <TableHeaderCell align="right" className="text-[9px] py-2">Thành tiền</TableHeaderCell>
                        </TableHead>
                        <TableBody>
                            {selectedOrder.items?.map((item, idx) => {
                                const isLoyaltyGift = item.isGift;
                                const isPromotionalGift = item.appliedPrice === 0 && !item.isGift;
                                const isAnyGift = isLoyaltyGift || isPromotionalGift;
                                const isMaterial = (item as any).type === 'material';
                                
                                return (
                                    <TableRow key={idx}>
                                        <TableCell className="!py-2.5">
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                {isMaterial && <Hammer className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                <p className="font-black text-slate-800 text-[13px] uppercase leading-tight">{item.name}</p>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                  {isMaterial && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[7px] font-black uppercase border border-amber-100">Linh kiện vật tư</span>}
                                                  {isLoyaltyGift && (
                                                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[8px] font-black uppercase border border-purple-100 flex items-center gap-1">
                                                          <GiftIcon className="w-2  h-2" /> QUÀ TRI ÂN
                                                      </span>
                                                  )}
                                                  {isPromotionalGift && (
                                                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase border border-emerald-100 flex items-center gap-1">
                                                          <Package2 className="w-2 h-2" /> QUÀ TẶNG
                                                      </span>
                                                  )}
                                                  {item.hasSerial && item.serials && item.serials.length > 0 && (
                                                      <div className="flex items-center gap-1 text-[9px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full border border-primary-100">
                                                          <ScanBarcode className="w-2.5 h-2.5" /> {item.serials.join(', ')}
                                                      </div>
                                                  )}
                                              </div>
                                            </div>
                                        </TableCell>
                                        <TableCell align="center" className="!py-2.5"><span className="font-black text-slate-700 text-xs">{item.quantity}</span></TableCell>
                                        <TableCell align="right" className="!py-2.5">
                                            <span className="font-bold text-slate-500 text-xs">
                                                {isAnyGift ? '0 ₫' : formatCurrency(item.appliedPrice ?? item.price)}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right" className="!py-2.5">
                                            <span className={`font-black text-[13px] ${isLoyaltyGift ? 'text-purple-600' : isPromotionalGift ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {isAnyGift ? '0 ₫' : formatCurrency((item.appliedPrice ?? item.price) * item.quantity)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </TableContainer>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ghi chú nội bộ</span>
                    <p className="text-xs text-slate-600 font-medium italic">"{selectedOrder.note || 'Không có ghi chú thêm.'}"</p>
                  </div>

                  <div className="w-full lg:w-72 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-2">
                      <span>Tạm tính:</span>
                      <span className="text-slate-800">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-2">
                      <span>Giảm giá:</span>
                      <span className="text-rose-500">-{formatCurrency(selectedOrder.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-2">
                      <span>Thuế VAT:</span>
                      <span className="text-amber-600">+{formatCurrency(selectedOrder.vatTotal)}</span>
                    </div>
                    <div className={`p-3 rounded-xl border-2 flex flex-col items-center gap-0.5 ${selectedOrder.status === 'cancelled' ? 'bg-slate-100 border-slate-200' : 'bg-primary-600 border-primary-700 shadow-md shadow-primary-600/10'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${selectedOrder.status === 'cancelled' ? 'text-slate-400' : 'text-primary-100'}`}>TỔNG THANH TOÁN</span>
                        <span className={`text-xl font-black ${selectedOrder.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-white'}`}>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
                    <div className="flex gap-2 w-full sm:w-auto relative">
                        {selectedOrder.status !== 'cancelled' && !showCancelConfirm && !showDeleteConfirm && (
                            <button 
                              onClick={() => setShowCancelConfirm(true)} 
                              className="px-4 py-2 bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> HỦY GIAO DỊCH
                            </button>
                        )}

                        {isAdmin && !showCancelConfirm && !showDeleteConfirm && (
                            <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" /> XÓA VĨNH VIỄN
                            </button>
                        )}

                        {showCancelConfirm && (
                            <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-200 animate-in slide-in-from-left-2 duration-300">
                                <span className="text-[9px] font-black text-rose-700 px-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> CHẮC CHẮN HỦY?
                                </span>
                                <button 
                                    onClick={handleCancelOrder}
                                    disabled={isProcessing}
                                    className="px-3 py-1 bg-rose-600 text-white rounded-lg font-black text-[9px] uppercase hover:bg-rose-700 transition-all flex items-center gap-1"
                                >
                                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : 'CÓ, HỦY NGAY'}
                                </button>
                                <button 
                                    onClick={() => setShowCancelConfirm(false)}
                                    disabled={isProcessing}
                                    className="px-3 py-1 bg-white text-slate-400 rounded-lg font-black text-[9px] uppercase border border-slate-200"
                                >
                                    KHÔNG
                                </button>
                            </div>
                        )}

                        {showDeleteConfirm && (
                            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-rose-500 animate-in slide-in-from-left-2 duration-300">
                                <span className="text-[9px] font-black text-rose-400 px-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> XÓA MẤT DỮ LIỆU KHO?
                                </span>
                                <button 
                                    onClick={handleDeletePermanently}
                                    disabled={isProcessing}
                                    className="px-3 py-1 bg-rose-600 text-white rounded-lg font-black text-[9px] uppercase hover:bg-rose-700"
                                >
                                    XÓA TRẮNG
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isProcessing}
                                    className="px-3 py-1 bg-white text-slate-400 rounded-lg font-black text-[9px] uppercase"
                                >
                                    HỦY
                                </button>
                            </div>
                        )}

                        {selectedOrder.status === 'cancelled' && !showDeleteConfirm && <Badge variant="danger" className="py-2 px-4 text-[9px] uppercase tracking-widest">Đơn hàng đã vô hiệu</Badge>}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); printInvoice(selectedOrder); }} className="gap-1.5 flex-1 sm:flex-none py-2 px-4 shadow-sm hover:shadow-md transition-all active:scale-95 text-[9px] tracking-widest">
                            <Printer className="w-3.5 h-3.5" /> IN LẠI
                        </Button>
                        <Button variant="primary" onClick={(e) => { e.stopPropagation(); setSelectedOrder(null); }} className="flex-1 sm:flex-none py-2 px-6 shadow-sm hover:shadow-md transition-all active:scale-95 uppercase text-[9px] tracking-widest" disabled={isProcessing}>ĐÓNG</Button>
                    </div>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};
