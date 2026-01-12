
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { User, UserRole, PrintTemplate, SystemSettings, View, LayoutMode, UIConfig } from '../types';
import { Badge, Button, Card, TableContainer, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, EmptyState } from './ui/Base';
import { Modal } from './ui/Modal';
import { 
  Plus, Edit2, Trash2, Save, X, 
  Sparkles, Settings2, Palette, Type, Layout, Eye, MonitorSmartphone, 
  Columns, Layers, Maximize, MousePointer2, Move, Grip, ScreenShare,
  AppWindow, TextCursorInput, Settings as SettingsIcon, Bell,
  Maximize2, GripVertical, Palette as PaletteIcon, Scaling,
  MoveHorizontal, MoveVertical, Box, FileText, Printer, RefreshCcw, Code, 
  Receipt, ArrowDownToLine, ArrowUpFromLine, BarChart3, Loader2,
  ShieldCheck, Check, Database, Download, Upload, AlertTriangle, Trash,
  Building2, Phone, MapPin, Globe, CreditCard, ToggleLeft, CloudCog, FileSearch,
  Signature, UserCheck, QrCode, User as UserIcon, Landmark, Percent, DollarSign,
  ShieldAlert, KeyRound, AlertCircle, ChevronRight, Lock, Unlock, Zap, Laptop, Users,
  Wrench, Shield, Info, Search
} from 'lucide-react';
import { 
    DEFAULT_INVOICE_TEMPLATE, 
    DEFAULT_IMPORT_TEMPLATE, 
    DEFAULT_EXPORT_TEMPLATE, 
    DEFAULT_NXT_TEMPLATE,
    printInvoice,
    printImportReceipt,
    printExportReceipt,
    printNXTReport,
    printPreview
} from '../services/printService';

type ConfigSection = 'company' | 'invoice_options' | 'finance' | 'storage' | 'system' | 'modal' | 'modal_inputs' | 'global_inputs';

const ToggleOption: React.FC<{ label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, desc, checked, onChange }) => (
    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-sky-200 transition-all">
        <div className="flex flex-col gap-1">
            <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{label}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{desc}</span>
        </div>
        <button 
            onClick={() => onChange(!checked)}
            className={`w-14 h-8 rounded-full relative transition-all duration-300 ${checked ? 'bg-sky-600' : 'bg-slate-200'}`}
        >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${checked ? 'left-7' : 'left-1'}`}></div>
        </button>
    </div>
);

const ConfigInput: React.FC<{ label: string; value: any; onChange: (v: any) => void; type?: string; unit?: string; icon?: any }> = ({ label, value, onChange, type = 'number', unit, icon: Icon }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            {Icon && <Icon className="w-3 h-3"/>} {label} {unit && `(${unit})`}
        </label>
        <div className="relative">
            <input 
                type={type} 
                value={value} 
                onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full font-black text-sm"
            />
        </div>
    </div>
);

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'templates' | 'config' | 'data'>('users');
  const [activeConfigSection, setActiveConfigSection] = useState<ConfigSection>('company');
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<UserRole>('staff');
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [resetLevel, setResetLevel] = useState<'partial' | 'full' | null>(null);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [recoveryError, setRecoveryError] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ 
    username: '', fullName: '', role: 'staff', isActive: true, password: '', phone: '', email: ''
  });

  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState('');

  const ROLES: { id: UserRole; label: string; color: string; icon: any; desc: string }[] = [
    { id: 'admin', label: 'Quản trị viên', color: 'bg-rose-500', icon: ShieldCheck, desc: 'Toàn quyền điều hành hệ thống' },
    { id: 'manager', label: 'Quản lý', color: 'bg-sky-600', icon: UserCheck, desc: 'Giám sát vận hành & nhân sự' },
    { id: 'accountant', label: 'Kế toán', color: 'bg-emerald-600', icon: Landmark, desc: 'Kiểm soát tài chính & kho hàng' },
    { id: 'staff', label: 'Nhân viên', color: 'bg-slate-500', icon: UserIcon, desc: 'Thực hiện bán hàng & dịch vụ' },
  ];

  const PERMISSION_LIST = [
    { id: 'pos' as View, label: 'Bán hàng (POS)', icon: Zap, desc: 'Lập hóa đơn và thu ngân tại quầy' },
    { id: 'orders' as View, label: 'Quản lý Đơn hàng', icon: FileText, desc: 'Tra cứu, in lại và hủy đơn hàng' },
    { id: 'inventory' as View, label: 'Kho hàng & Nhập xuất', icon: Box, desc: 'Quản lý tồn kho, nhập hàng NCC' },
    { id: 'materials' as View, label: 'Vật tư sửa chữa', icon: Wrench, desc: 'Linh kiện thay thế và giá vốn dịch vụ' },
    { id: 'customers' as View, label: 'Hồ sơ Khách hàng', icon: Users, desc: 'Quản lý thông tin và điểm tích lũy' },
    { id: 'suppliers' as View, label: 'Nhà cung cấp', icon: Building2, desc: 'Quản lý đối tác cung ứng' },
    { id: 'warranty' as View, label: 'Bảo hành điện tử', icon: ShieldCheck, desc: 'Lập và tra cứu IMEI/Serial' },
    { id: 'gifts' as View, label: 'Chương trình Quà tặng', icon: Sparkles, desc: 'Đổi điểm triân khách hàng' },
    { id: 'dashboard' as View, label: 'Báo cáo Thống kê', icon: BarChart3, desc: 'Xem doanh thu và phân tích lợi nhuận' },
    { id: 'audit' as View, label: 'Nhật ký hệ thống', icon: FileSearch, desc: 'Truy vết thao tác của nhân viên' },
    { id: 'settings' as View, label: 'Cấu hình Studio', icon: Laptop, desc: 'Thiết kế giao diện và quản trị dữ liệu' },
  ];

  const configMenu = [
    { id: 'company', label: 'Thông tin đơn vị', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'invoice_options', label: 'Tùy chọn hóa đơn', icon: Receipt, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'finance', label: 'Thuế & Tài chính', icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'storage', label: 'Lưu trữ & Bảo mật', icon: CloudCog, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'system', label: 'Bố cục hệ thống', icon: MonitorSmartphone, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'modal', label: 'Khung Modal', icon: AppWindow, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'modal_inputs', label: 'Ô nhập Modal', icon: TextCursorInput, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'global_inputs', label: 'Ô nhập toàn cục', icon: MousePointer2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setIsProcessing(true);
    try {
        if (activeTab === 'users') {
            const u = await StorageService.getUsers();
            setUsers(u.sort((a, b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'templates') {
            const t = await StorageService.getTemplates();
            setTemplates(t);
        }
        const s = await StorageService.getSettings();
        setSettings(s);
    } catch (e) {
        console.error("Load settings error:", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.fullName || (!editingUser && !userForm.password)) {
      alert("Vui lòng nhập đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    setIsProcessing(true);
    try {
      const userData: User = {
        id: editingUser ? editingUser.id : `U_${Date.now()}`,
        username: userForm.username!.toLowerCase().trim(),
        fullName: userForm.fullName!,
        role: userForm.role as UserRole,
        isActive: userForm.isActive ?? true,
        phone: userForm.phone || '',
        email: userForm.email || '',
        password: userForm.password || editingUser?.password || '123',
        createdAt: editingUser ? editingUser.createdAt : Date.now(),
        updatedAt: Date.now()
      };
      await StorageService.saveUser(userData);
      await loadData();
      setIsUserModalOpen(false);
    } catch (e) {
      alert("Lỗi khi lưu thông tin người dùng.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const currentUser = StorageService.getCurrentUserSync();
    if (user.id === currentUser?.id) return alert("Bạn không thể tự xóa tài khoản của chính mình!");
    if (user.id === 'admin_root') return alert("Không thể xóa tài khoản Quản trị viên gốc!");
    
    if (confirm(`Xác nhận xóa tài khoản "${user.fullName}"?`)) {
      setIsProcessing(true);
      try {
        await StorageService.deleteUser(user.id);
        await loadData();
      } catch (e) {
        alert("Lỗi khi xóa nhân viên.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const saveConfig = async () => {
      if (!settings) return;
      setIsProcessing(true);
      try {
          await StorageService.saveSettings(settings);
          alert("Đã lưu cấu hình thành công!");
      } finally { setIsProcessing(false); }
  };

  const updateUI = (updates: Partial<UIConfig>) => {
    if (!settings) return;
    setSettings({ ...settings, uiConfig: { ...settings.uiConfig, ...updates } });
  };

  const togglePermission = (roleId: UserRole, viewId: View) => {
    if (!settings || roleId === 'admin') return;
    const currentPerms = settings.rolePermissions[roleId] || [];
    const newPerms = currentPerms.includes(viewId) ? currentPerms.filter(v => v !== viewId) : [...currentPerms, viewId];
    setSettings({ ...settings, rolePermissions: { ...settings.rolePermissions, [roleId]: newPerms } });
  };

  const handlePreview = (type: string, contentOverride?: string) => {
      printPreview(type, contentOverride);
  };

  const handleEditTemplate = (t: PrintTemplate) => {
      setEditingTemplate(t);
      setTemplateContent(t.content || '');
      setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setIsProcessing(true);
    try {
        await StorageService.saveTemplate({ ...editingTemplate, content: templateContent, updatedAt: Date.now() });
        await loadData();
        setIsTemplateModalOpen(false);
    } finally { setIsProcessing(false); }
  };

  const handleBackup = async () => {
      setIsProcessing(true);
      try { await StorageService.exportAllData(); } 
      finally { setIsProcessing(false); }
  };

  const filteredUsers = users.filter(u => 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const templateTypes = [
    { id: 'invoice', label: 'Hóa đơn bán hàng', icon: Receipt, color: 'text-sky-600', bg: 'bg-sky-50', desc: 'Sử dụng cho bán lẻ và sỉ.' },
    { id: 'import', label: 'Phiếu nhập kho', icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Dùng cho nhập linh kiện NCC.' },
    { id: 'export', label: 'Phiếu xuất kho', icon: ArrowUpFromLine, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Dùng xuất dùng hoặc trả hàng.' },
    { id: 'report', label: 'Báo cáo NXT', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Báo cáo Nhập-Xuất-Tồn định kỳ.' },
  ];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-none pb-12">
      {/* TOOLBAR ĐỒNG NHẤT VỚI KHO HÀNG */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm mt-2 mx-12 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            {(['users', 'permissions', 'templates', 'config', 'data'] as const).map(t => (
                <button 
                    key={t}
                    onClick={() => setActiveTab(t)} 
                    className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${activeTab === t ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t === 'users' ? 'Nhân viên' : t === 'permissions' ? 'Phân quyền' : t === 'templates' ? 'Mẫu in' : t === 'config' ? 'Cài đặt' : 'Dữ liệu'}
                </button>
            ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {activeTab === 'users' && (
                <>
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Tìm nhân viên..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none placeholder:text-slate-300"
                        />
                    </div>
                    <button 
                        onClick={() => { setEditingUser(null); setUserForm({ role: 'staff', isActive: true }); setIsUserModalOpen(true); }} 
                        className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-8"
                    >
                        <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thêm nhân viên</span>
                    </button>
                </>
            )}

            {(activeTab === 'config' || activeTab === 'permissions') && (
                <button 
                    onClick={saveConfig} 
                    disabled={isProcessing}
                    className="p-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition-all active:scale-95 flex items-center gap-2 px-10"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
                    <span className="text-[10px] font-black uppercase tracking-widest">Lưu cấu hình</span>
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
          {activeTab === 'users' && (
                <TableContainer className="flex-1 shadow-sm" rounded="rounded-2xl">
                    <TableHead>
                        <TableHeaderCell className="w-[35%]">Nhân viên / Tài khoản</TableHeaderCell>
                        <TableHeaderCell>Vai trò</TableHeaderCell>
                        <TableHeaderCell align="center">Trạng thái</TableHeaderCell>
                        <TableHeaderCell align="right" className="w-[15%]"></TableHeaderCell>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map(u => (
                            <TableRow key={u.id} className="group transition-all">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <p className="font-black text-slate-800 text-sm uppercase leading-none mb-1 group-hover:text-primary-700 transition-colors">{u.fullName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">@{u.username}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase text-white ${ROLES.find(r => r.id === u.role)?.color || 'bg-slate-400'}`}>
                                        {ROLES.find(r => r.id === u.role)?.label || u.role}
                                    </span>
                                </TableCell>
                                <TableCell align="center">
                                    <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px] py-0.5 px-3">{u.isActive ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}</Badge>
                                </TableCell>
                                <TableCell align="right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                                        <button onClick={() => { setEditingUser(u); setUserForm(u); setIsUserModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-primary-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteUser(u)} className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TableContainer>
          )}

          {activeTab === 'permissions' && settings && (
              <div className="px-12 h-full flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
                  <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-2 shrink-0">
                      {ROLES.map(role => {
                          const Icon = role.icon;
                          const isActive = selectedRoleForPerms === role.id;
                          return (
                              <button
                                  key={role.id}
                                  onClick={() => setSelectedRoleForPerms(role.id)}
                                  className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isActive ? 'bg-primary-600 text-white shadow-lg scale-[1.02]' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}
                              >
                                  <Icon className="w-4 h-4" />
                                  {role.label}
                              </button>
                          );
                      })}
                  </div>

                  <div className="bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                      <div className="px-10 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3 shrink-0">
                          <Shield className="w-5 h-5 text-primary-600"/>
                          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-800">Ma trận quyền truy cập</h3>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
                          {selectedRoleForPerms === 'admin' ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-4 border-2 border-emerald-100"><ShieldCheck className="w-8 h-8" /></div>
                                  <h4 className="text-lg font-black uppercase text-slate-800 mb-1">QUẢN TRỊ VIÊN TỐI CAO</h4>
                                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest max-w-xs">Tài khoản Admin có toàn quyền truy cập hệ thống để đảm bảo vận hành không bị gián đoạn.</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {PERMISSION_LIST.map(perm => {
                                      const Icon = perm.icon;
                                      const isAllowed = settings.rolePermissions[selectedRoleForPerms]?.includes(perm.id);
                                      return (
                                          <div key={perm.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${isAllowed ? 'bg-white border-primary-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-80'}`}>
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isAllowed ? 'bg-primary-50 text-primary-600' : 'bg-white text-slate-300'}`}><Icon className="w-5 h-5" /></div>
                                                  <div className="min-w-0">
                                                      <h5 className={`font-black text-[12px] uppercase tracking-tight truncate ${isAllowed ? 'text-slate-800' : 'text-slate-400'}`}>{perm.label}</h5>
                                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">{perm.desc}</p>
                                                  </div>
                                              </div>
                                              <button onClick={() => togglePermission(selectedRoleForPerms, perm.id)} className={`w-12 h-6 rounded-full relative transition-all duration-300 shrink-0 shadow-inner ${isAllowed ? 'bg-primary-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${isAllowed ? 'left-7' : 'left-1'}`}></div></button>
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'templates' && (
              <div className="px-12 h-full animate-in fade-in duration-500 overflow-y-auto pr-1 pb-20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {templateTypes.map(type => {
                          const existing = templates.find(t => t.type === type.id);
                          const Icon = type.icon;
                          return (
                              <Card key={type.id} className="!p-6 flex flex-col gap-4 group">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-3 rounded-xl ${type.bg} ${type.color}`}><Icon className="w-6 h-6" /></div>
                                          <div><h3 className="text-sm font-black text-slate-800 uppercase">{type.label}</h3><p className="text-[9px] font-bold text-slate-400 uppercase">{existing ? 'Đã chỉnh sửa' : 'Hệ thống'}</p></div>
                                      </div>
                                      <Badge variant={existing ? 'success' : 'neutral'}>{existing ? 'CUSTOM' : 'DEFAULT'}</Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium">{type.desc}</p>
                                  <div className="flex gap-2 pt-4">
                                      <button onClick={() => handlePreview(type.id)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase transition-all">Xem mẫu</button>
                                      <button onClick={() => handleEditTemplate(existing || { id: `TPL_${type.id}`, type: type.id, name: type.label, content: '', description: '', createdAt: 0, updatedAt: 0, isActive: true })} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-[9px] font-black uppercase shadow-lg transition-all">Cấu hình mã</button>
                                  </div>
                              </Card>
                          );
                      })}
                  </div>
              </div>
          )}

          {activeTab === 'config' && settings && (
              <div className="px-12 flex h-full gap-8 animate-in fade-in duration-500 pb-20">
                  <div className="w-[260px] flex flex-col gap-2 shrink-0">
                      <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex flex-col gap-1">
                        {configMenu.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeConfigSection === item.id;
                            return (
                                <button 
                                    key={item.id} 
                                    onClick={() => setActiveConfigSection(item.id as ConfigSection)} 
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-white shadow-md text-primary-700' : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'}`}
                                >
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary-50 text-primary-600' : 'bg-slate-50'}`}><Icon className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                                </button>
                            );
                        })}
                      </div>
                  </div>

                  <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm overflow-y-auto scrollbar-none p-10">
                      <div className="max-w-3xl mx-auto space-y-10">
                          {activeConfigSection === 'company' && (
                              <div className="space-y-6">
                                  <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 className="w-6 h-6"/></div>
                                      <div><h3 className="text-lg font-black text-slate-800 uppercase">Thông tin thương hiệu</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Thông tin in trên hóa đơn bán lẻ</p></div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-5">
                                      <ConfigInput label="Tên đơn vị chủ quản *" value={settings.companyInfo?.name || ''} onChange={e => setSettings({...settings, companyInfo: {...settings.companyInfo!, name: e}})} type="text" icon={Building2}/>
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin className="w-3 h-3"/> Địa chỉ văn phòng</label><textarea value={settings.companyInfo?.address || ''} onChange={e => setSettings({...settings, companyInfo: {...settings.companyInfo!, address: e.target.value}})} className="w-full font-bold text-sm" /></div>
                                      <div className="grid grid-cols-2 gap-5">
                                          <ConfigInput label="Hotline hỗ trợ" value={settings.companyInfo?.phone || ''} onChange={e => setSettings({...settings, companyInfo: {...settings.companyInfo!, phone: e}})} type="text" icon={Phone}/>
                                          <ConfigInput label="Mã số thuế" value={settings.companyInfo?.taxCode || ''} onChange={e => setSettings({...settings, companyInfo: {...settings.companyInfo!, taxCode: e}})} type="text" icon={CreditCard}/>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {activeConfigSection === 'invoice_options' && (
                              <div className="space-y-6">
                                  <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                                      <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><Receipt className="w-6 h-6"/></div>
                                      <div><h3 className="text-lg font-black text-slate-800 uppercase">Thiết lập bản in</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tùy chỉnh hiển thị nội dung in</p></div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-4">
                                      <ToggleOption label="Thông tin đơn vị" desc="Hiển thị tên, địa chỉ, hotline đơn vị" checked={settings.invoiceOptions?.showCompanyInfo ?? true} onChange={val => setSettings({...settings, invoiceOptions: {...settings.invoiceOptions!, showCompanyInfo: val}})} />
                                      <ToggleOption label="Thông tin khách hàng" desc="Hiển thị tên và SĐT khách hàng" checked={settings.invoiceOptions?.showCustomerInfo ?? true} onChange={val => setSettings({...settings, invoiceOptions: {...settings.invoiceOptions!, showCustomerInfo: val}})} />
                                      <ToggleOption label="Mã QR tra cứu" desc="In mã QR dẫn đến trang bảo hành" checked={settings.invoiceOptions?.showQRCode ?? true} onChange={val => setSettings({...settings, invoiceOptions: {...settings.invoiceOptions!, showQRCode: val}})} />
                                      <ToggleOption label="Tên nhân viên lập" desc="Ghi nhận nhân viên thực hiện đơn" checked={settings.invoiceOptions?.showStaffName ?? true} onChange={val => setSettings({...settings, invoiceOptions: {...settings.invoiceOptions!, showStaffName: val}})} />
                                  </div>
                              </div>
                          )}

                          {activeConfigSection === 'finance' && (
                              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Landmark className="w-6 h-6"/></div>
                                      <div><h3 className="text-lg font-black text-slate-800 uppercase">Tham số tài chính</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cấu hình thuế và tiền tệ</p></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-8">
                                      <ConfigInput label="Thuế suất VAT (%)" value={settings.defaultVatRate} onChange={v => setSettings({...settings, defaultVatRate: v})} unit="%" icon={Percent}/>
                                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><DollarSign className="w-3 h-3"/> Ký hiệu tiền tệ</label><input type="text" value={settings.currencySymbol || '₫'} onChange={e => setSettings({...settings, currencySymbol: e.target.value})} className="w-full font-black text-sm" /></div>
                                  </div>
                              </div>
                          )}

                          {activeConfigSection === 'system' && (
                              <div className="space-y-6">
                                  <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                                      <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><MonitorSmartphone className="w-6 h-6"/></div>
                                      <div><h3 className="text-lg font-black text-slate-800 uppercase">Khung hệ thống</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bố cục màn hình Workspace</p></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-5">
                                      <ConfigInput label="Độ dày viền" value={settings.uiConfig.sysBorderWidth} onChange={v => updateUI({ sysBorderWidth: v })} unit="px" icon={Scaling}/>
                                      <ConfigInput label="Bo góc tổng thể" value={settings.uiConfig.sysRounding} onChange={v => updateUI({ sysRounding: v })} unit="px" icon={Grip}/>
                                      <ConfigInput label="Độ rộng Sidebar" value={settings.uiConfig.sysSidebarWidth} onChange={v => updateUI({ sysSidebarWidth: v })} unit="px" icon={MoveHorizontal}/>
                                      <ConfigInput label="Màu sắc viền" value={settings.uiConfig.sysBorderColor} onChange={v => updateUI({ sysBorderColor: v })} type="color" icon={PaletteIcon}/>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'data' && (
              <div className="px-12 h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto pr-1 pb-20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="!p-8 group">
                          <div className="flex items-center gap-4 mb-4"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Download className="w-8 h-8"/></div><div><h3 className="text-sm font-black text-slate-800 uppercase leading-none">Xuất dữ liệu</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lưu trữ ngoại tuyến</p></div></div>
                          <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">Tải xuống toàn bộ cơ sở dữ liệu (Sản phẩm, Đơn hàng, Khách hàng) dưới dạng file JSON.</p>
                          <Button variant="primary" onClick={handleBackup} disabled={isProcessing} className="w-full !py-3 bg-emerald-600 hover:bg-emerald-700 text-[10px]">TẢI FILE SAO LƯU</Button>
                      </Card>

                      <Card className="!p-8 group !border-rose-100 bg-rose-50/20">
                          <div className="flex items-center gap-4 mb-4"><div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><RefreshCcw className="w-8 h-8"/></div><div><h3 className="text-sm font-black text-slate-800 uppercase leading-none">Xóa giao dịch</h3><p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1">Làm sạch số liệu</p></div></div>
                          <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">Xóa toàn bộ lịch sử đơn hàng, kho và bảo hành. Thông tin danh mục & nhân viên được giữ lại.</p>
                          <button onClick={() => { setResetLevel('partial'); setIsRecoveryModalOpen(true); }} className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-[9px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all shadow-sm">XÓA TOÀN BỘ GIAO DỊCH</button>
                      </Card>

                      <Card className="!p-8 group !bg-slate-900 !border-slate-800">
                          <div className="flex items-center gap-4 mb-4"><div className="p-4 bg-white/10 text-white rounded-2xl"><ShieldAlert className="w-8 h-8"/></div><div><h3 className="text-sm font-black text-white uppercase leading-none">Factory Reset</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cài đặt gốc</p></div></div>
                          <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">Xóa sạch toàn bộ hệ thống về trạng thái ban đầu. Thao tác này không thể hoàn tác.</p>
                          <button onClick={() => { setResetLevel('full'); setIsRecoveryModalOpen(true); }} className="w-full py-3 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-rose-700 transition-all shadow-lg">KHÔI PHỤC CÀI ĐẶT GỐC</button>
                      </Card>
                  </div>
              </div>
          )}
      </div>

      {isRecoveryModalOpen && (
          <Modal isOpen={true} onClose={() => setIsRecoveryModalOpen(false)} title="Xác thực bảo mật cao" maxWidth="md" icon={<Lock className="w-5 h-5 text-rose-600"/>}>
              <div className="space-y-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhập mã khôi phục hệ thống (Recovery Code)</p>
                  <input type="text" value={recoveryCodeInput} onChange={e => { setRecoveryCodeInput(e.target.value.toUpperCase()); setRecoveryError(false); }} placeholder="LGC••••" className={`w-full py-5 text-center text-2xl font-black tracking-widest ${recoveryError ? 'border-rose-500 bg-rose-50' : ''}`} />
                  <button onClick={async () => {
                      if (recoveryCodeInput !== 'LGC2026') return setRecoveryError(true);
                      setIsProcessing(true);
                      try {
                          await StorageService.factoryReset(resetLevel === 'full');
                          alert("Hệ thống đã được dọn dẹp.");
                          window.location.reload();
                      } finally { setIsProcessing(false); }
                  }} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'XÁC NHẬN THỰC THI'}
                  </button>
              </div>
          </Modal>
      )}

      {isUserModalOpen && (
          <Modal isOpen={true} onClose={() => setIsUserModalOpen(false)} title={editingUser ? "Cập nhật nhân viên" : "Tạo tài khoản mới"} maxWidth="4xl" icon={<UserIcon className="w-6 h-6 text-primary-600" />}>
              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <ConfigInput label="Tên đăng nhập *" value={userForm.username || ''} onChange={e => setUserForm({...userForm, username: e})} type="text" />
                          <ConfigInput label={editingUser ? 'Thay mật khẩu' : 'Mật khẩu *'} value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e})} type="text" />
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vai trò hệ thống *</label><select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full font-black text-sm uppercase">{ROLES.map(role => (<option key={role.id} value={role.id}>{role.label}</option>))}</select></div>
                      </div>
                      <div className="space-y-4">
                          <ConfigInput label="Họ tên nhân viên *" value={userForm.fullName || ''} onChange={e => setUserForm({...userForm, fullName: e})} type="text" />
                          <ConfigInput label="Số điện thoại" value={userForm.phone || ''} onChange={e => setUserForm({...userForm, phone: e})} type="text" />
                          <ConfigInput label="Trạng thái" value={userForm.isActive ? 1 : 0} onChange={e => setUserForm({...userForm, isActive: e === 1})} type="number" unit="1: Mở, 0: Khóa" />
                      </div>
                  </div>
                  <div className="pt-6 border-t flex justify-end gap-3"><Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>HỦY BỔ</Button><Button variant="primary" onClick={handleSaveUser} disabled={isProcessing} className="px-12">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />} LƯU HỒ SƠ</Button></div>
              </div>
          </Modal>
      )}

      {isTemplateModalOpen && (
          <Modal isOpen={true} onClose={() => setIsTemplateModalOpen(false)} title={`Biên tập mẫu in: ${editingTemplate?.name}`} maxWidth="7xl" hideGrid={true}>
              <div className="flex flex-col gap-4 h-[70vh]">
                  <textarea value={templateContent} onChange={e => setTemplateContent(e.target.value)} className="flex-1 w-full bg-slate-900 text-emerald-400 p-8 font-mono text-xs rounded-xl outline-none resize-none border-none shadow-inner" spellCheck={false}/>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic">Hỗ trợ các thẻ: {"{{company_name}}"}, {"{{order_code}}"}, {"{{customer_name}}"}, {"{{items_table}}"}...</p>
                      <div className="flex gap-2">
                          <button onClick={() => handlePreview(editingTemplate?.type || '', templateContent)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-slate-100 transition-all">Xem trước mẫu</button>
                          <Button variant="primary" onClick={handleSaveTemplate} disabled={isProcessing} className="!px-10 !py-3 text-[10px]">CẬP NHẬT MÃ NGUỒN</Button>
                      </div>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
