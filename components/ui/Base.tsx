
import React from 'react';

export const Button: React.FC<any> = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-[#0284c7] text-white hover:bg-[#0369a1] shadow-brand",
    secondary: "bg-white border border-studio-border text-black hover:bg-studio-bg",
    danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
    ghost: "text-studio-muted hover:bg-studio-bg hover:text-black"
  };
  return (
    <button className={`px-4 lg:px-8 py-3 lg:py-4 text-[12px] lg:text-[13px] font-extrabold rounded-xl lg:rounded-2xl transition-studio flex items-center justify-center gap-3 uppercase tracking-widest ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const TableContainer: React.FC<{ children: React.ReactNode; className?: string; rounded?: string }> = ({ 
  children, 
  className = '', 
  rounded = 'rounded-[20px] lg:rounded-[32px]' 
}) => (
  <div className={`w-full px-4 lg:px-12 py-4 lg:py-8 overflow-hidden ${className}`}>
    <div className={`bg-white ${rounded} border border-studio-border overflow-x-auto shadow-sm scrollbar-none`}>
      <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-0">
        {children}
      </table>
    </div>
  </div>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-studio-bg">
    <tr className="text-[10px] lg:text-[11px] font-black text-studio-muted uppercase tracking-[0.2em] lg:tracking-[0.25em] border-b border-studio-border">
      {children}
    </tr>
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => <tbody className="divide-y divide-studio-border">{children}</tbody>;

export const TableRow: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <tr onClick={onClick} className={`transition-studio ${onClick ? 'cursor-pointer hover:bg-studio-bg active:bg-studio-bg' : ''} ${className}`}>{children}</tr>
);

export const TableCell: React.FC<{ children?: React.ReactNode; className?: string; align?: string; colSpan?: number }> = ({ children, className = '', align = 'left', colSpan }) => (
  <td colSpan={colSpan} className={`py-3 lg:py-4 px-4 lg:px-6 text-[13px] lg:text-[14px] font-bold text-black ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${className}`}>{children}</td>
);

export const TableHeaderCell: React.FC<{ children?: React.ReactNode; className?: string; align?: string }> = ({ children, className = '', align = 'left' }) => (
  <th className={`py-3 lg:py-4 px-4 lg:px-6 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${className}`}>{children}</th>
);

export const Badge: React.FC<{children: React.ReactNode; variant?: string; className?: string; }> = ({ children, variant = 'neutral', className = '' }) => {
  const v = {
    success: "text-[#0284c7] bg-[#e0f2fe] border border-[#bae6fd]",
    danger: "text-red-700 bg-red-50 border border-red-100",
    warning: "text-amber-800 bg-amber-50 border border-amber-100",
    neutral: "text-black bg-studio-bg border border-studio-border",
    primary: "text-white bg-[#0284c7] border border-[#0284c7]",
  };
  return (
    <span className={`inline-flex items-center gap-1 lg:gap-2 text-[8px] lg:text-[10px] font-black uppercase tracking-widest px-2 lg:px-4 py-0.5 lg:py-1.5 rounded-full ${v[variant as keyof typeof v]} ${className}`}>
      {children}
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl lg:rounded-[32px] p-6 lg:p-10 border border-studio-border shadow-sm ${className}`}>{children}</div>
);

export const EmptyState: React.FC<{ title: string; icon?: React.ReactNode; description?: string }> = ({ title, icon, description }) => (
  <div className="py-20 lg:py-40 flex flex-col items-center justify-center text-center px-6">
    <div className="mb-4 lg:mb-8 scale-[1.5] lg:scale-[2] text-[#0284c7] opacity-20">{icon}</div>
    <h3 className="font-black text-[14px] lg:text-[16px] uppercase tracking-[0.3em] lg:tracking-[0.5em] mb-2 lg:mb-3 text-black">{title}</h3>
    {description && <p className="text-[10px] lg:text-[12px] font-bold text-studio-muted uppercase tracking-widest leading-relaxed">{description}</p>}
  </div>
);
