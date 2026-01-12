
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Order } from '../types';
import { StorageService } from '../services/storageService';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, EmptyState, Button, Badge } from './ui/Base';
import { Modal } from './ui/Modal';
import { Plus, Edit2, Trash2, X, Save, Search, User, ClipboardList, Calendar, ChevronRight, Award, Loader2, Phone, Mail, MapPin } from 'lucide-react';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<{customer: Customer, orders: Order[]} | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', phone: '', email: '', address: '', taxCode: '', companyName: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setIsProcessing(true);
      try {
        const c = await StorageService.getCustomers();
        setCustomers(c.sort((a, b) => b.createdAt - a.createdAt));
      } finally {
        setIsProcessing(false);
      }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', taxCode: '', companyName: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const name = formData.name?.trim();
    const rawPhone = formData.phone?.trim();

    if (!name || !rawPhone) return alert("Vui lòng điền tên và số điện thoại");
    
    // Chuẩn hóa số điện thoại trước khi gửi xuống repo
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) return alert("Số điện thoại không hợp lệ (phải có ít nhất 10 số).");

    setIsProcessing(true);
    try {
        const customerData: Customer = {
          id: editingCustomer ? editingCustomer.id : `C_${Date.now()}`,
          name: name,
          phone: cleanPhone,
          email: formData.email?.trim() || '',
          address: formData.address?.trim() || '',
          taxCode: formData.taxCode?.trim() || '',
          companyName: formData.companyName?.trim() || '',
          loyaltyPoints: editingCustomer ? editingCustomer.loyaltyPoints : 0,
          totalSpent: editingCustomer ? editingCustomer.totalSpent : 0,
          createdAt: editingCustomer ? editingCustomer.createdAt : Date.now(),
          updatedAt: Date.now(),
          isActive: true
        };

        await StorageService.saveCustomer(customerData);
        await loadData();
        setIsModalOpen(false);
    } catch (error: any) {
        alert(error.message || "Lỗi khi lưu khách hàng.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xác nhận xóa khách hàng này khỏi hệ thống? Thao tác này không thể hoàn tác.")) {
      setIsProcessing(true);
      try {
        await StorageService.deleteCustomer(id);
        await loadData();
        if (isHistoryModalOpen) setIsHistoryModalOpen(false);
      } catch (error: any) {
        alert("Lỗi khi xóa khách hàng.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleViewHistory = async (customer: Customer) => {
      setIsProcessing(true);
      try {
        // Tối ưu hóa: Chỉ lấy đơn hàng của khách hàng này thay vì lấy tất cả
        const customerOrders = await StorageService.getOrdersByCustomer(customer.id);
        setSelectedCustomerHistory({ customer, orders: customerOrders });
        setIsHistoryModalOpen(true);
      } catch (error) {
        alert("Không thể tải lịch sử mua hàng.");
      } finally {
        setIsProcessing(false);
      }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm.replace(/[^0-9]/g, ''))
  );
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatDate = (ts: number) => new Date(ts).toLocaleString('vi-VN');

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            <button className="px-8 py-2 bg-white text-primary-600 rounded-lg text-[10px] font-black uppercase shadow-sm tracking-widest">
                Tất cả khách hàng ({customers.length})
            </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm tên, SĐT khách hàng..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300" 
              />
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-6"
            >
                <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm khách</span>
            </button>
        </div>
      </div>

      <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
        <TableHead>
            <TableHeaderCell className="w-[20%]">Tên khách hàng</TableHeaderCell>
            <TableHeaderCell className="w-[15%]">Số điện thoại</TableHeaderCell>
            <TableHeaderCell className="w-[20%]">Địa chỉ Email</TableHeaderCell>
            <TableHeaderCell align="center" className="w-[12%]">Điểm tích lũy</TableHeaderCell>
            <TableHeaderCell className="w-[20%]">Địa chỉ</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[13%]"></TableHeaderCell>
        </TableHead>
        <TableBody>
          {filtered.map(item => (
            <TableRow key={item.id} onClick={() => handleViewHistory(item)} className="group transition-all">
              <TableCell>
                <span className="font-black text-slate-800 text-sm uppercase leading-tight group-hover:text-primary-700 transition-colors">
                  {item.name}
                </span>
                {item.companyName && <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{item.companyName}</p>}
              </TableCell>
              <TableCell><span className="font-black text-slate-600">{item.phone}</span></TableCell>
              <TableCell>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                  {item.email || '---'}
                </span>
              </TableCell>
              <TableCell align="center">
                <Badge variant="warning" className="px-4 py-1">
                    <Award className="w-3.5 h-3.5 mr-1.5 inline" /> {item.loyaltyPoints || 0}
                </Badge>
              </TableCell>
              <TableCell><span className="text-[13px] text-slate-500 font-medium italic truncate block max-w-[200px]">{item.address || '---'}</span></TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                    className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                    className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                    title="Xóa khách hàng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableContainer>

      {filtered.length === 0 && (
        <EmptyState 
            icon={<User className="w-16 h-16" />} 
            title="Chưa có khách hàng nào" 
            description={searchTerm ? `Không có kết quả nào cho "${searchTerm}"` : "Hãy thêm khách hàng mới để bắt đầu tích điểm và chăm sóc khách hàng."} 
        />
      )}

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Cập nhật khách hàng" : "Thêm khách hàng mới"} maxWidth="4xl">
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên khách hàng *</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full text-lg font-black" placeholder="Nguyễn Văn A" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại *</label>
                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full font-black text-lg" placeholder="0901234567" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full font-bold" placeholder="example@gmail.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã số thuế / Công ty</label>
                    <input type="text" value={formData.taxCode || ''} onChange={e => setFormData({...formData, taxCode: e.target.value})} className="w-full font-bold" placeholder="MST / Tên Công Ty" />
                  </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ liên hệ</label>
                <textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full h-24 text-sm font-medium leading-relaxed" placeholder="Số nhà, đường, phường/xã, quận/huyện..." />
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>HỦY BỔ</Button>
                <Button variant="primary" onClick={handleSave} disabled={isProcessing} className="px-12">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                    LƯU THÔNG TIN
                </Button>
              </div>
          </div>
        </Modal>
      )}

      {isHistoryModalOpen && selectedCustomerHistory && (
          <Modal isOpen={true} onClose={() => setIsHistoryModalOpen(false)} title={`Hồ sơ khách: ${selectedCustomerHistory.customer.name}`} maxWidth="5xl">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</span>
                        <span className="text-[13px] font-black text-slate-700 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {selectedCustomerHistory.customer.phone}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm hiện có</span>
                        <span className="text-2xl font-black text-amber-600">{selectedCustomerHistory.customer.loyaltyPoints || 0} P</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng chi tiêu</span>
                        <span className="text-2xl font-black text-primary-600">{formatCurrency(selectedCustomerHistory.customer.totalSpent || 0)}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lần mua cuối</span>
                        <span className="text-[13px] font-black text-slate-700 uppercase">{selectedCustomerHistory.customer.lastPurchaseDate ? formatDate(selectedCustomerHistory.customer.lastPurchaseDate) : 'Chưa có'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-300"/>
                      <span className="text-xs font-medium text-slate-600">{selectedCustomerHistory.customer.email || 'Chưa cập nhật Email'}</span>
                   </div>
                   <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-300"/>
                      <span className="text-xs font-medium text-slate-600 italic truncate">{selectedCustomerHistory.customer.address || 'Chưa cập nhật địa chỉ'}</span>
                   </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Lịch sử giao dịch chi tiết</h4>
                    <TableContainer rounded="rounded-xl" className="!px-0 !py-0 border border-slate-100">
                        <TableHead>
                            <TableHeaderCell className="text-[9px] py-2">Mã hóa đơn</TableHeaderCell>
                            <TableHeaderCell className="text-[9px] py-2">Ngày mua</TableHeaderCell>
                            <TableHeaderCell align="center" className="text-[9px] py-2">SL món</TableHeaderCell>
                            <TableHeaderCell align="right" className="text-[9px] py-2">Thanh toán</TableHeaderCell>
                            <TableHeaderCell align="center" className="text-[9px] py-2">Trạng thái</TableHeaderCell>
                        </TableHead>
                        <TableBody>
                            {selectedCustomerHistory.orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="!py-2.5"><span className="font-black text-primary-600 uppercase text-xs">{order.code}</span></TableCell>
                                    <TableCell className="!py-2.5"><span className="text-xs font-bold text-slate-500">{formatDate(order.timestamp)}</span></TableCell>
                                    <TableCell align="center" className="!py-2.5"><span className="font-black text-xs">{order.items.reduce((a,b) => a+b.quantity, 0)}</span></TableCell>
                                    <TableCell align="right" className={`!py-2.5 font-black text-xs ${order.status === 'cancelled' ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                                        {formatCurrency(order.total)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Badge variant={order.status === 'completed' ? 'success' : 'danger'} className="text-[8px] py-0.5 px-2">
                                            {order.status === 'completed' ? 'XONG' : 'HỦY'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {selectedCustomerHistory.orders.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic text-xs uppercase tracking-widest">Khách chưa phát sinh đơn hàng nào</TableCell></TableRow>
                            )}
                        </TableBody>
                    </TableContainer>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="danger" onClick={() => handleDelete(selectedCustomerHistory.customer.id)} className="!px-6 py-2 text-[9px]">XÓA KHÁCH</Button>
                    <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)} className="!px-8 py-2 text-[9px]">ĐÓNG</Button>
                </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
