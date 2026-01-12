
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl';
  icon?: React.ReactNode;
  hideGrid?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth,
  icon,
  hideGrid = true
}) => {
  if (!isOpen) return null;

  const maxWidthClass = maxWidth ? {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  }[maxWidth] : 'max-w-[95vw] lg:max-w-2xl';

  return (
    <div className="fixed inset-0 z-[500] flex items-end lg:items-center justify-center bg-slate-900/40 backdrop-blur-md p-0 lg:p-4 animate-in fade-in duration-200">
      <div 
        style={{ 
          borderWidth: window.innerWidth < 1024 ? '0px' : 'var(--modal-border-width)',
          borderColor: 'var(--modal-border-color)',
          borderRadius: window.innerWidth < 1024 ? '32px 32px 0 0' : 'var(--modal-rounding)',
          width: maxWidth ? '100%' : 'var(--modal-width)',
          maxHeight: window.innerWidth < 1024 ? '92vh' : 'var(--modal-max-height)',
        } as any}
        className={`bg-white flex flex-col overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border-solid animate-in slide-in-from-bottom lg:zoom-in duration-300 w-full ${maxWidthClass}`}
      >
        {/* HEADER */}
        <div className="h-16 lg:h-20 flex justify-between items-center px-6 lg:px-10 shrink-0 border-b-2 border-slate-100 bg-white z-20">
          <div className="flex items-center gap-3">
            {icon && <span className="text-[#0284c7]">{icon}</span>}
            <h3 className="text-[14px] lg:text-[15px] font-black text-black uppercase tracking-tight truncate max-w-[200px] lg:max-w-none">{title}</h3>
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }} 
            className="p-2 lg:p-2.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-2xl transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* BODY */}
        <div className="flex-1 overflow-y-auto relative scrollbar-none pb-12 lg:pb-0">
          {!hideGrid && (
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{ 
                opacity: 'var(--modal-grid-opacity)',
                backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
          )}
          <div className="relative z-10 px-6 lg:px-10 py-6 lg:py-8">
            <style>{`
              label {
                font-size: var(--modal-label-size) !important;
                color: var(--modal-label-color) !important;
              }
              .grid, .space-y-4, .space-y-6, .space-y-8 {
                gap: var(--modal-input-gap) !important;
              }
              @media (max-width: 1024px) {
                .grid, .space-y-4, .space-y-6, .space-y-8 {
                  gap: 16px !important;
                }
              }
              input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), 
              select, 
              textarea {
                height: var(--modal-input-height) !important;
                border-width: var(--modal-input-border-width) !important;
                border-color: var(--modal-input-border-color) !important;
                border-radius: var(--modal-input-rounding) !important;
                padding-left: var(--modal-input-padding-x) !important;
                padding-right: var(--modal-input-padding-x) !important;
                font-size: var(--modal-input-font-size) !important;
                color: var(--modal-input-text-color) !important;
              }
              textarea {
                height: auto !important;
                min-height: var(--modal-input-height) !important;
                padding-top: 12px !important;
              }
            `}</style>
            {children}
          </div>
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="p-6 lg:p-8 bg-slate-50/90 border-t-2 border-slate-100 flex justify-end gap-3 shrink-0 z-20 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
