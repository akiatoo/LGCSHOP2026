
import React, { useState, useEffect, useMemo } from 'react';
import { Supplier } from '../types';
import { StorageService } from '../services/storageService';
import { TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, EmptyState, Button, Badge } from './ui/Base';
import { Modal } from './ui/Modal';
import { Plus, Edit2, Trash2, X, Save, Search, Building2, Phone, Mail, MapPin, Loader2, Globe, Contact2 } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', contactPerson: '', phone: '', email: '', address: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        const s = await StorageService.getSuppliers();
        setSuppliers(Array.isArray(s) ? s.sort((a, b) => b.createdAt - a.createdAt) : []);
    } finally { setIsProcessing(false); }
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const name = formData.name?.trim();
    const phone = formData.phone?.trim();

    if (!name || !phone) return alert("Vui lòng điền tên công ty và số điện thoại liên hệ");
    
    setIsProcessing(true);
    try {
        const supplierData: Supplier = { 
          id: editingSupplier ? editingSupplier.id : `SUP_${Date.now()}`, 
          name: name,
          contactPerson: formData.contactPerson?.trim() || '',
          phone: phone,
          email: formData.email?.trim() || '',
          address: formData.address?.trim() || '',
          debt: editingSupplier ? editingSupplier.debt : 0,
          createdAt: editingSupplier ? editingSupplier.createdAt : Date.now(),
          updatedAt: Date.now(),
          isActive: true
        };

        await StorageService.saveSupplier(supplierData);
        await loadData();
        setIsModalOpen(false);
    } catch (error: any) {
        alert(error.message || "Lỗi khi lưu nhà cung cấp.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xác nhận xóa nhà cung cấp này? Thao tác này có thể khiến các chứng từ nhập kho cũ mất liên kết thông tin đối tác.")) {
      setIsProcessing(true);
      try {
        await StorageService.deleteSupplier(id);
        await loadData();
      } catch (error: any) {
        alert("Lỗi khi xóa đối tác.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const filtered = suppliers.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const cleanSearchPhone = searchTerm.replace(/[^0-9]/g, '');
    
    return (c.name || "").toLowerCase().includes(searchLower) || 
           (c.phone || "").includes(cleanSearchPhone) ||
           (c.contactPerson || "").toLowerCase().includes(searchLower);
  });

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      {/* TOOLBAR ĐỒNG NHẤT */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            <button className="px-8 py-2 bg-white text-primary-600 rounded-lg text-[10px] font-black uppercase shadow-sm tracking-widest">
                Tất cả nhà cung cấp ({suppliers.length})
            </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm tên, SĐT nhà cung cấp..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300"
                />
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-8"
            >
                <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm đối tác</span>
            </button>
        </div>
      </div>

      {/* DANH SÁCH BẢNG */}
      <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
        <TableHead>
            <TableHeaderCell className="w-[20%]">Nhà cung cấp</TableHeaderCell>
            <TableHeaderCell className="w-[18%]">Địa chỉ Email</TableHeaderCell>
            <TableHeaderCell className="w-[15%]">Người liên hệ</TableHeaderCell>
            <TableHeaderCell className="w-[12%]">Số điện thoại</TableHeaderCell>
            <TableHeaderCell className="w-[25%]">Địa chỉ</TableHeaderCell>
            <TableHeaderCell align="right" className="w-[10%]"></TableHeaderCell>
        </TableHead>
        <TableBody>
          {filtered.map(item => (
            <TableRow key={item.id} className="group transition-all">
              <TableCell>
                <span className="font-black text-slate-800 text-sm uppercase leading-tight group-hover:text-primary-700 transition-colors">
                  {item.name}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                  {item.email || '---'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-slate-600">
                    <Contact2 className="w-3.5 h-3.5 text-slate-300" />
                    <span className="font-bold text-sm">{item.contactPerson || '---'}</span>
                </div>
              </TableCell>
              <TableCell><span className="font-black text-slate-700">{item.phone}</span></TableCell>
              <TableCell>
                <div className="flex items-start gap-2 max-w-[250px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-slate-500 font-medium italic truncate">{item.address || '---'}</span>
                </div>
              </TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                  <button 
                    onClick={() => handleOpenModal(item)} 
                    className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)} 
                    className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"
                    title="Xóa đối tác"
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
          icon={<Building2 className="w-16 h-16" />} 
          title="Chưa có đối tác" 
          description={searchTerm ? `Không có kết quả nào cho "${searchTerm}"` : "Hãy thêm nhà cung cấp để bắt đầu quản lý nguồn hàng tập trung."} 
        />
      )}

      {/* MODAL NHẬP LIỆU */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingSupplier ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp mới"} maxWidth="4xl">
            <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên công ty / Cửa hàng *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full text-lg font-black" 
                    placeholder="VD: Công ty TNHH Samsung Vina" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Người đại diện / Liên hệ</label>
                      <input 
                        type="text" 
                        value={formData.contactPerson} 
                        onChange={e => setFormData({...formData, contactPerson: e.target.value})} 
                        className="w-full font-bold" 
                        placeholder="Nguyễn Văn A" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại *</label>
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        className="w-full font-black text-lg" 
                        placeholder="028 1234 5678" 
                      />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email liên hệ</label>
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        className="w-full font-medium" 
                        placeholder="contact@company.com" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Website / Fanpage</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text" 
                          className="w-full pl-11 font-medium" 
                          placeholder="www.company.com" 
                        />
                      </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ kinh doanh</label>
                  <textarea 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="w-full h-24 text-sm font-medium leading-relaxed" 
                    placeholder="Số nhà, đường, phường/xã, quận/huyện..." 
                  />
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
    </div>
  );
};
