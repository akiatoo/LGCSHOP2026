
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Materials } from './components/Materials';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Gifts } from './components/Gifts';
import { Warranty } from './components/Warranty';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { Audit } from './components/Audit';
import { View, User, UIConfig, SystemSettings } from './types';
import { StorageService } from './services/storageService';

function App() {
  const [currentView, setCurrentView] = useState<View>('pos');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = StorageService.getCurrentUserSync();
      if (user) setCurrentUser(user);
      
      const s = await StorageService.getSettings();
      setSettings(s);
      setIsLoading(false);
    };
    init();
  }, []);

  // Bảo vệ view dựa trên quyền hạn
  useEffect(() => {
    if (settings && currentUser) {
      const rolePermissions = settings.rolePermissions[currentUser.role] || [];
      // Nếu view hiện tại không nằm trong danh sách được phép, đưa về POS (nếu POS được phép)
      if (!rolePermissions.includes(currentView)) {
        if (rolePermissions.includes('pos')) {
          setCurrentView('pos');
        } else if (rolePermissions.length > 0) {
          setCurrentView(rolePermissions[0]);
        }
      }
    }
  }, [currentView, settings, currentUser]);

  useEffect(() => {
    if (settings?.uiConfig) {
      const uiConfig = settings.uiConfig;
      const root = document.documentElement;
      
      root.style.setProperty('--input-height', `${uiConfig.inputHeight}px`);
      root.style.setProperty('--input-border-width', `${uiConfig.inputBorderWidth}px`);
      root.style.setProperty('--input-border-color', uiConfig.inputBorderColor);
      root.style.setProperty('--input-rounding', `${uiConfig.inputRounding}px`);
      root.style.setProperty('--input-focus-color', uiConfig.inputFocusColor);
      root.style.setProperty('--input-padding-x', `${uiConfig.inputPaddingX}px`);
      root.style.setProperty('--input-font-size', `${uiConfig.inputFontSize}px`);

      root.style.setProperty('--modal-border-width', `${uiConfig.modalBorderWidth}px`);
      root.style.setProperty('--modal-rounding', `${uiConfig.modalRounding}px`);
      root.style.setProperty('--modal-border-color', uiConfig.modalBorderColor);
      root.style.setProperty('--modal-width', `${uiConfig.modalWidth}px`);
      root.style.setProperty('--modal-max-height', `${uiConfig.modalMaxHeight}vh`);
      root.style.setProperty('--modal-label-size', `${uiConfig.modalLabelFontSize}px`);
      root.style.setProperty('--modal-label-color', uiConfig.modalLabelColor);
      root.style.setProperty('--modal-grid-opacity', `${uiConfig.gridOpacity / 100}`);
      
      root.style.setProperty('--modal-input-height', `${uiConfig.modalInputHeight}px`);
      root.style.setProperty('--modal-input-border-width', `${uiConfig.modalInputBorderWidth}px`);
      root.style.setProperty('--modal-input-rounding', `${uiConfig.modalInputRounding}px`);
      root.style.setProperty('--modal-input-border-color', uiConfig.modalInputBorderColor);
      root.style.setProperty('--modal-input-text-color', uiConfig.modalInputTextColor);
      root.style.setProperty('--modal-input-padding-x', `${uiConfig.modalInputPaddingX}px`);
      root.style.setProperty('--modal-input-font-size', `${uiConfig.modalInputFontSize}px`);
      root.style.setProperty('--modal-input-gap', `${uiConfig.modalInputGap}px`);

      root.style.setProperty('--sys-border-width', `${uiConfig.sysBorderWidth}px`);
      root.style.setProperty('--sys-rounding', `${uiConfig.sysRounding}px`);
      root.style.setProperty('--sys-border-color', uiConfig.sysBorderColor);
      root.style.setProperty('--sys-sidebar-width', `${uiConfig.sysSidebarWidth}px`);
      root.style.setProperty('--sys-header-size', `${uiConfig.sysHeaderFontSize}px`);
    }
  }, [settings]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Sau khi login, load lại settings để đảm bảo quyền hạn mới nhất
    StorageService.getSettings().then(s => {
      setSettings(s);
      setCurrentView('pos');
    });
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'pos': return <POS />;
      case 'orders': return <Orders />;
      case 'inventory': return <Inventory />;
      case 'materials': return <Materials />;
      case 'customers': return <Customers />;
      case 'suppliers': return <Suppliers />;
      case 'gifts': return <Gifts />;
      case 'warranty': return <Warranty />;
      case 'dashboard': return <Dashboard />;
      case 'audit': return <Audit />;
      case 'settings': return <Settings />;
      default: return <POS />;
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
      <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-primary-400 font-black uppercase tracking-widest text-xs animate-pulse">LGC Studio Pro - Đang kiểm tra bảo mật...</p>
    </div>
  );

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView} currentUser={currentUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
}

export default App;
