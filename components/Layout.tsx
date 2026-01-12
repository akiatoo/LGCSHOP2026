
import { 
  ShoppingCart, ClipboardList, Package, Users, ShieldCheck, 
  BarChart3, Settings as SettingsIcon, User as UserIcon, LogOut, Bell,
  Hammer, Building2, Gift, ShieldAlert, Menu, X, Cloud, Database, 
  RefreshCcw, Wifi, WifiOff
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { View, User as UserType, UIConfig, SystemSettings } from '../types';
import { StorageService } from '../services/storageService';

interface LayoutProps {
  currentView: View;
  onChangeView: (view: View) => void;
  children: React.ReactNode;
  currentUser: UserType | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children, currentUser, onLogout }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [localStatus, setLocalStatus] = useState<'ready' | 'syncing' | 'error'>('ready');
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    StorageService.getSettings().then(s => setSettings(s));
    checkAllStatus();
    const interval = setInterval(checkAllStatus, 30000); // Kiểm tra mỗi 30s
    return () => clearInterval(interval);
  }, []);

  const checkAllStatus = async () => {
    try {
      const result = await StorageService.checkConnection();
      setDbStatus(result.success ? 'connected' : 'error');
    } catch (e) {
      setDbStatus('error');
    }
    try {
      const pending = await StorageService.getPendingOrders();
      setPendingCount(pending.length);
      setLocalStatus(pending.length > 0 ? 'syncing' : 'ready');
    } catch (e) {
      setLocalStatus('error');
    }
  };

  const allMenuItems = [
    { id: 'pos', label: 'Bán hàng', icon: ShoppingCart },
    { id: 'orders', label: 'Đơn hàng', icon: ClipboardList },
    { id: 'inventory', label: 'Kho hàng', icon: Package },
    { id: 'materials', label: 'Vật tư', icon: Hammer },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: Building2 },
    { id: 'gifts', label: 'Quà tặng', icon: Gift },
    { id: 'warranty', label: 'Bảo hành', icon: ShieldCheck },
    { id: 'dashboard', label: 'Thống kê', icon: BarChart3 },
    { id: 'audit', label: 'Nhật ký', icon: ShieldAlert },
    { id: 'settings', label: 'Cấu hình', icon: SettingsIcon },
  ];

  const allowedMenuItems = allMenuItems.filter(item => {
    if (!settings || !currentUser) return false;
    const rolePermissions = settings.rolePermissions[currentUser.role] || [];
    return rolePermissions.includes(item.id as View);
  });

  const mobileNavItems = allowedMenuItems.slice(0, 4);

  const ui = settings?.uiConfig || {
    sysBorderWidth: 1,
    sysRounding: 0,
    sysBorderColor: '#E5E7EB',
    sysSidebarWidth: 280,
    sysHeaderFontSize: 20,
    sysShowGrid: false,
    sysGridOpacity: 5
  };

  return (
    <div 
      style={{ 
        border: `${ui.sysBorderWidth}px solid ${ui.sysBorderColor}`,
        borderRadius: `${ui.sysRounding}px`,
        overflow: 'hidden'
      } as any}
      className="flex h-screen w-full bg-studio-bg font-sans text-studio-text overflow-hidden"
    >
      {/* SIDEBAR (Desktop) */}
      <aside 
        style={{ width: `${ui.sysSidebarWidth}px` }}
        className="hidden lg:flex bg-white border-r border-studio-border flex-col shrink-0 z-30 shadow-xl"
      >
        <div className="h-24 px-10 flex items-center">
          <div 
            style={{ fontSize: `${ui.sysHeaderFontSize}px` }}
            className="font-black tracking-tight text-black flex items-center gap-2"
          >
            <div className="w-3 h-3 bg-primary-600 rounded-full shadow-[0_0_15px_rgba(2,132,199,0.5)]"></div>
            LGC STUDIO
          </div>
        </div>

        <nav className="flex-1 px-6 mt-4 space-y-1 overflow-y-auto scrollbar-none pb-10">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id as View)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-studio group ${
                  isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-[1.02]' 
                  : 'text-studio-muted hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[14px] font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-studio-border bg-slate-50/50">
          <div className="bg-white p-4 rounded-3xl border border-studio-border mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black truncate text-slate-800 leading-tight">{currentUser?.fullName}</p>
                <p className="text-[9px] text-primary-500 font-bold tracking-tight leading-none mt-1">
                  {currentUser?.role === 'admin' ? 'Quản trị viên' : 
                   currentUser?.role === 'manager' ? 'Quản lý cửa hàng' : 
                   currentUser?.role === 'accountant' ? 'Kế toán tài chính' : 'Nhân viên bán hàng'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-[11px] font-black text-slate-400 hover:text-rose-500 transition-all tracking-widest"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {ui.sysShowGrid && (
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
              opacity: ui.sysGridOpacity / 100,
              backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
        )}
        
        {/* SYSTEM HEADER (AppBar) */}
        <header className="h-16 lg:h-24 px-6 lg:px-12 flex items-center justify-between lg:justify-end shrink-0 border-b border-studio-border z-20 bg-white/70 backdrop-blur-xl sticky top-0">
          <div className="lg:hidden font-black text-[18px] text-black flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(2,132,199,0.5)]"></div>
            LGC STUDIO
          </div>

          <div className="flex items-center gap-2 lg:gap-8">
             {/* STORAGE STATUS - COMMAND CENTER STYLE */}
             <div className="flex items-center gap-1 lg:gap-2 p-1 lg:p-1.5 bg-slate-900/5 rounded-2xl border border-slate-200 shadow-inner">
                {/* Cloud Status */}
                <div className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-xl transition-all ${
                  dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  {dbStatus === 'connected' ? <Cloud className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">
                    {dbStatus === 'connected' ? 'Cloud Live' : 'Offline Mode'}
                  </span>
                </div>
                
                {/* Local Status */}
                <div className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-xl transition-all ${
                  localStatus === 'ready' ? 'text-slate-500' : localStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Database className={`w-3.5 h-3.5 ${localStatus === 'syncing' ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">
                    {localStatus === 'syncing' ? `Sync: ${pendingCount}` : 'Terminal'}
                  </span>
                </div>
             </div>

             <button className="relative p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all group">
                <Bell className="w-6 h-6 group-hover:rotate-12" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary-600 border-2 border-white rounded-full"></span>
             </button>
             
             <div className="hidden lg:block h-10 w-[1px] bg-studio-border mx-2"></div>
             
             <div className="hidden lg:block text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Time check</p>
                <p className="text-[14px] font-black text-slate-800">
                  {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
             </div>

             <button onClick={onLogout} className="lg:hidden p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA - REMOVED Z-10 TO ALLOW POPUPS TO FLOAT OVER HEADER */}
        <main className="flex-1 overflow-hidden relative pb-20 lg:pb-0 bg-slate-50/30">
          {children}
        </main>

        {/* BOTTOM NAVIGATION (Mobile Only) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/80 backdrop-blur-xl border-t border-studio-border flex items-center justify-around px-2 z-[100] safe-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id as View)}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-all ${
                  isActive ? 'text-primary-600' : 'text-slate-400'
                }`}
              >
                <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 bg-primary-600 rounded-full shadow-[0_0_8px_rgba(2,132,199,0.5)]"></div>}
              </button>
            );
          })}
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-all ${isMobileMenuOpen ? 'text-primary-600' : 'text-slate-400'}`}
          >
            <Menu className="w-6 h-6" />
            <span className="text-[9px] font-bold tracking-tight">Hệ thống</span>
          </button>
        </div>

        {/* MOBILE MENU OVERLAY */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[48px] p-8 pb-32 animate-in slide-in-from-bottom-20 duration-500 shadow-2xl border-t-2 border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Danh mục đầy đủ</h3>
                  <p className="text-[14px] font-black text-slate-800 uppercase">Blue Edition Menu</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition-all"><X className="w-6 h-6 text-slate-800" /></button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {allowedMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onChangeView(item.id as View); setIsMobileMenuOpen(false); }}
                      className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-slate-50 hover:bg-primary-50 transition-all border border-transparent hover:border-primary-100 group"
                    >
                      <div className="w-14 h-14 bg-white rounded-3xl shadow-sm flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="text-[10px] font-bold text-center tracking-tight leading-tight text-slate-600">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
