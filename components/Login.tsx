
import { 
  Lock, User as UserIcon, AlertCircle, RefreshCw, 
  ShieldCheck, Wifi, WifiOff, Store, Eye, EyeOff, 
  ArrowRight, ShieldAlert, KeyRound, ArrowLeft, CheckCircle2
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'recovery'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      const result = await StorageService.checkConnection();
      setDbStatus(result.success ? 'connected' : 'error');
      setHasAdmin(result.hasAdmin);
    } catch (e) {
      setDbStatus('error');
    }
  };

  useEffect(() => { checkConnection(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (view === 'login') {
        const user = await StorageService.login(username, password);
        if (user) {
          onLogin(user);
        } else {
          setError('Thông tin đăng nhập không chính xác.');
        }
      } else {
        const resetSuccess = await StorageService.resetByRecoveryCode(username, recoveryCode);
        if (resetSuccess) {
          setSuccess('Mật khẩu đã được đặt lại thành "123". Vui lòng đăng nhập lại.');
          setView('login');
          setPassword('123');
          setRecoveryCode('');
        } else {
          setError('Tên tài khoản hoặc mã khôi phục không đúng.');
        }
      }
    } catch (err) {
        setError('Không thể kết nối với máy chủ Cloud.');
    } finally {
        setLoading(false);
    }
  };

  const handleInitializeAdmin = async () => {
      setLoading(true);
      try {
        await StorageService.createAdmin('admin', '123');
        setHasAdmin(true);
        setUsername('admin'); 
        setPassword('123');
        setSuccess('Đã tạo tài khoản quản trị mặc định: admin/123');
      } catch (err) {
        setError('Lỗi khi khởi tạo hệ thống.');
      } finally { 
        setLoading(false); 
      }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0284c7]/5 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-sky-200/20 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-700">
        {/* Status Indicators Above Card */}
        <div className="flex justify-between items-center px-8 mb-6">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'} transition-all duration-500`}></div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-studio-muted">
               {dbStatus === 'checking' ? 'Đang kiểm tra...' : dbStatus === 'connected' ? 'Cloud Online' : 'Cloud Offline'}
             </span>
          </div>
          {hasAdmin === false && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              <span className="text-[9px] font-black text-amber-700 uppercase">Hệ thống mới</span>
            </div>
          )}
        </div>

        {/* Main Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[48px] shadow-[0_40px_100px_-20px_rgba(2,132,199,0.15)] border border-white p-12 relative overflow-hidden">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[#0284c7] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-brand transform hover:rotate-6 transition-transform">
              <Store className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-[28px] font-black text-black tracking-tighter uppercase leading-none">
              {view === 'login' ? 'LGC Studio' : 'Khôi phục'}
            </h1>
            <p className="text-[11px] font-bold text-studio-muted uppercase tracking-[0.4em] mt-3">
              {view === 'login' ? 'Smart Retail Ecosystem' : 'Password Recovery System'}
            </p>
          </div>

          {/* Special Action: Init Admin */}
          {hasAdmin === false && view === 'login' && (
            <button 
              onClick={handleInitializeAdmin}
              className="w-full mb-8 py-4 bg-emerald-50 text-emerald-600 rounded-3xl border-2 border-emerald-100 font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-studio flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" /> Kích hoạt hệ thống
            </button>
          )}

          {/* Login / Recovery Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-studio-muted uppercase tracking-widest ml-5">Tài khoản</label>
              <div className="relative group">
                <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-studio-muted group-focus-within:text-[#0284c7] transition-colors" />
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-[#F9FAFB] border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#0284c7] outline-none font-bold text-black transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            {view === 'login' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-5">
                  <label className="text-[10px] font-black text-studio-muted uppercase tracking-widest">Mật khẩu</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('recovery'); setError(''); setSuccess(''); }}
                    className="text-[10px] font-black text-[#0284c7] uppercase tracking-widest hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-studio-muted group-focus-within:text-[#0284c7] transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-16 py-5 bg-[#F9FAFB] border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#0284c7] outline-none font-bold text-black transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-studio-muted hover:text-[#0284c7] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-studio-muted uppercase tracking-widest ml-5">Mã khôi phục hệ thống</label>
                <div className="relative group">
                  <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-studio-muted group-focus-within:text-[#0284c7] transition-colors" />
                  <input 
                    type="text"
                    value={recoveryCode}
                    onChange={e => setRecoveryCode(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-[#F9FAFB] border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#0284c7] outline-none font-bold text-black transition-all uppercase tracking-widest"
                    placeholder="LGC••••"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] text-red-600 text-[12px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-[20px] text-emerald-600 text-[12px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || dbStatus === 'checking'}
              className="w-full py-6 bg-[#0284c7] text-white rounded-[28px] font-black text-[14px] uppercase tracking-[0.2em] shadow-brand hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                view === 'login' ? (
                  <>Bắt đầu làm việc <ArrowRight className="w-6 h-6" /></>
                ) : (
                  <>Xác nhận khôi phục <KeyRound className="w-6 h-6" /></>
                )
              )}
            </button>

            {view === 'recovery' && (
              <button 
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-studio-muted uppercase tracking-widest hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
              </button>
            )}
          </form>

          {/* Footer inside card */}
          <div className="mt-10 pt-8 border-t border-studio-border text-center">
             <button 
               type="button"
               onClick={checkConnection}
               className="text-[10px] font-black text-studio-muted uppercase tracking-widest hover:text-[#0284c7] transition-colors flex items-center justify-center gap-2 mx-auto"
             >
               <RefreshCw className={`w-3 h-3 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} /> Làm mới kết nối
             </button>
          </div>
        </div>
        
        {/* Version & Copyright Outside */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-studio-muted uppercase tracking-[0.4em]">v2026.1.0 Cloud Powered</p>
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 bg-studio-border rounded-full"></div>
            <p className="text-[10px] font-bold text-studio-muted uppercase">Bảo mật đa lớp</p>
            <div className="w-1.5 h-1.5 bg-studio-border rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
