
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { AuditLog } from '../types';
import { ShieldAlert, Clock, User, Info, Search, Calendar } from 'lucide-react';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fix line 11: StorageService.getAuditLogs is async
  useEffect(() => {
    const loadData = async () => {
        const l = await StorageService.getAuditLogs();
        setLogs(l);
    };
    loadData();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (ts: number) => new Date(ts).toLocaleString('vi-VN');

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><ShieldAlert className="w-6 h-6"/></div>
              <div>
                  <h2 className="font-bold text-slate-800 text-lg">Nhật ký hệ thống (Audit Trail)</h2>
                  <p className="text-xs text-slate-500">Ghi lại toàn bộ thao tác quan trọng để phục vụ hậu kiểm.</p>
              </div>
          </div>
          <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" placeholder="Tìm kiếm nhật ký..." 
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                          <th className="p-4">Thời gian</th>
                          <th className="p-4">Người thực hiện</th>
                          <th className="p-4">Hành động</th>
                          <th className="p-4">Chi tiết nội dung</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 text-sm">
                              <td className="p-4 whitespace-nowrap text-slate-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3"/> {formatDate(log.timestamp)}
                              </td>
                              <td className="p-4 font-medium text-slate-700">
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]"><User className="w-3 h-3"/></div>
                                      {log.userName}
                                  </div>
                              </td>
                              <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      log.action.includes('CREATE') ? 'bg-green-100 text-green-700' :
                                      log.action.includes('CANCEL') || log.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                                      log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {log.action}
                                  </span>
                              </td>
                              <td className="p-4 text-slate-600 italic">
                                  <div className="flex items-start gap-2">
                                      <Info className="w-3 h-3 mt-0.5 text-slate-300"/>
                                      {log.details}
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                          <tr><td colSpan={4} className="p-10 text-center text-slate-400">Không tìm thấy nhật ký thao tác</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
