
import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Order, Product, Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, DollarSign, RefreshCw, Landmark, Percent, FileText, ArrowUpRight, ArrowDownRight, BrainCircuit, Loader2, Lightbulb, Info } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setIsAiLoading(true);
      const [o, p, e] = await Promise.all([
          StorageService.getOrders(),
          StorageService.getProducts(),
          StorageService.getExpenses()
      ]);
      setOrders(o);
      setProducts(p);
      setExpenses(e);
      setIsAiLoading(false);
  };

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const stats = useMemo(() => {
    let netRevenue = 0;    // Doanh thu thực (sau chiết khấu, trước VAT)
    let totalCogs = 0;      // Giá vốn hàng bán (chỉ tính hàng bán)
    let totalGiftCost = 0;  // Giá vốn quà tặng (tri ân + khuyến mãi)
    let actualVat = 0;      // Tổng thuế VAT thực tế từ hóa đơn
    let manualExp = 0;      // Chi phí ngoài (chi phí vận hành)

    const currentYear = new Date().getFullYear();
    const validOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return o.status === 'completed' && 
               (d.getMonth() + 1) === selectedMonth && 
               d.getFullYear() === currentYear;
    });
    
    validOrders.forEach(o => {
        // Doanh thu thuần của 1 đơn = Tạm tính - Giảm giá
        const orderNetRev = (o.subtotal || 0) - (o.discountAmount || 0);
        netRevenue += orderNetRev;
        actualVat += (o.vatTotal || 0);

        o.items.forEach(i => {
            // Ưu tiên giá vốn được chốt tại thời điểm bán (i.costPrice)
            // Nếu là đơn cũ chưa có costPrice, dùng costPrice hiện tại của sản phẩm
            const productRef = products.find(p => p.id === i.id);
            const effectiveCost = i.costPrice ?? productRef?.costPrice ?? 0;
            const lineCost = effectiveCost * i.quantity;

            if (i.isGift || i.appliedPrice === 0) {
                totalGiftCost += lineCost;
            } else {
                totalCogs += lineCost;
            }
        });
    });

    // Tính chi phí vận hành trong tháng
    const startOfMonth = new Date(currentYear, selectedMonth - 1, 1).getTime();
    const endOfMonth = new Date(currentYear, selectedMonth, 0, 23, 59, 59, 999).getTime();
    expenses.filter(e => e.date >= startOfMonth && e.date <= endOfMonth).forEach(e => manualExp += e.amount);

    // Lợi nhuận ròng = Doanh thu thực - Giá vốn bán - Giá vốn quà - Chi phí vận hành
    const netProfit = netRevenue - totalCogs - totalGiftCost - manualExp;

    return { 
        rev: netRevenue, 
        netProfit,
        actualVat,
        manualExp, 
        giftCost: totalGiftCost,
        cogs: totalCogs
    };
  }, [orders, products, expenses, selectedMonth]);

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
        const dataContext = `Tháng: ${selectedMonth}, Doanh thu thuần: ${formatVND(stats.rev)}, Lợi nhuận ròng: ${formatVND(stats.netProfit)}, Chi phí quà tặng: ${formatVND(stats.giftCost)}, Thuế VAT: ${formatVND(stats.actualVat)}`;
        const insight = await StorageService.getSmartInsights(dataContext);
        setAiInsights(insight);
    } catch {
        setAiInsights("Lỗi kết nối AI.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 lg:p-10 space-y-6 lg:space-y-10 overflow-y-auto h-full scrollbar-none pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[20px] lg:text-[24px] font-black uppercase tracking-tight">Thống kê</h2>
          <p className="text-[9px] lg:text-[11px] font-black text-studio-muted uppercase tracking-[0.3em] lg:tracking-[0.4em] mt-1">Hệ thống Blue Edition</p>
        </div>
        <div className="flex gap-2 lg:gap-4 w-full sm:w-auto">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="flex-1 sm:flex-none h-11 lg:h-14 bg-white border border-studio-border rounded-xl lg:rounded-2xl px-4 lg:px-6 font-bold text-xs lg:text-sm outline-none shadow-sm">
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
          </select>
          <button onClick={loadData} className="w-11 h-11 lg:w-14 lg:h-14 bg-white border border-studio-border text-slate-400 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm"><RefreshCw className={`w-5 h-5 lg:w-6 lg:h-6 ${isAiLoading ? 'animate-spin' : ''}`} /></button>
          <button 
            onClick={handleAiAnalyze}
            disabled={isAnalyzing}
            className="h-11 lg:h-14 px-4 lg:px-8 bg-gradient-to-r from-[#0284c7] to-[#7c3aed] text-white rounded-xl lg:rounded-2xl font-black text-[9px] lg:text-[11px] uppercase tracking-widest flex items-center gap-2 lg:gap-3 shadow-brand disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <BrainCircuit className="w-4 h-4 lg:w-5 lg:h-5" />}
            AI Phân tích
          </button>
        </div>
      </div>

      { (isAnalyzing || aiInsights) && (
        <div className="bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100 p-6 lg:p-10 rounded-[30px] lg:rounded-[48px] animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
                <div className="shrink-0"><div className="w-12 h-12 lg:w-20 lg:h-20 bg-white rounded-2xl lg:rounded-[24px] shadow-xl flex items-center justify-center border border-primary-100"><BrainCircuit className={`w-6 h-6 lg:w-10 lg:h-10 text-primary-600 ${isAnalyzing ? 'animate-pulse' : ''}`} /></div></div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 lg:mb-4"><h3 className="text-[12px] lg:text-[14px] font-black uppercase tracking-[0.2em] text-primary-700">Studio Smart Advisory</h3></div>
                    {isAnalyzing ? (<div className="h-4 bg-primary-200/50 rounded-full w-3/4 animate-pulse"></div>) : (<p className="text-slate-700 font-bold text-sm lg:text-lg leading-relaxed italic">"{aiInsights}"</p>)}
                    {!isAnalyzing && (<button onClick={() => setAiInsights(null)} className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500">Đóng</button>)}
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-8">
          <StatCard title="Doanh số (Net)" value={formatVND(stats.rev)} icon={DollarSign} trend="up" />
          <StatCard title="Lợi nhuận ròng" value={formatVND(stats.netProfit)} icon={TrendingUp} trend={stats.netProfit > 0 ? 'up' : 'down'} color="#0284c7" />
          <StatCard title="Thuế VAT" value={formatVND(stats.actualVat)} icon={Percent} />
          <StatCard title="Tổng chi phí" value={formatVND(stats.manualExp + stats.giftCost)} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[40px] border border-studio-border shadow-sm overflow-hidden">
              <h3 className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                  <FileText className="w-4 h-4 text-[#0284c7]" /> Hiệu suất 6 đơn gần nhất
              </h3>
              <div className="h-[250px] lg:h-[350px] -ml-6 lg:ml-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orders.filter(o => o.status === 'completed' && new Date(o.createdAt).getMonth() + 1 === selectedMonth).slice(-6).map(o => ({ n: o.code.slice(-3), r: o.total }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="n" fontSize={9} axisLine={false} tickLine={false} stroke="#9CA3AF" />
                          <YAxis hide />
                          <Bar dataKey="r" fill="#0284c7" radius={[4, 4, 4, 4]} barSize={window.innerWidth < 1024 ? 20 : 32} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[40px] border border-studio-border shadow-sm flex flex-col items-center">
              <h3 className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] mb-6 self-start">Cơ cấu dòng tiền</h3>
              <div className="flex-1 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={window.innerWidth < 1024 ? 200 : 260}>
                      <PieChart>
                          <Pie 
                            data={[
                                { name: 'Lợi nhuận', value: Math.max(0, stats.netProfit) }, 
                                { name: 'Vốn/Chi phí', value: stats.cogs + stats.giftCost + stats.manualExp }
                            ]} 
                            innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none"
                          >
                              <Cell fill="#0284c7" />
                              <Cell fill="#e2e8f0" />
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6 w-full">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0284c7]"></div><span className="text-[9px] font-black uppercase text-black">Lợi nhuận</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#e2e8f0]"></div><span className="text-[9px] font-black uppercase text-studio-muted">Vốn & Phí</span></div>
              </div>
          </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ title, value, icon: Icon, trend, color = 'black' }) => (
    <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[40px] border border-studio-border shadow-sm transition-studio group">
        <div className="flex justify-between items-start mb-3 lg:mb-6">
            <div className="p-2 lg:p-4 bg-studio-bg rounded-xl lg:rounded-2xl group-hover:bg-[#0284c7] group-hover:text-white transition-studio">
              <Icon className="w-4 h-4 lg:w-6 lg:h-6"/>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 px-1.5 lg:px-3 py-0.5 lg:py-1 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest ${trend === 'up' ? 'bg-[#e0f2fe] text-[#0284c7]' : 'bg-red-50 text-red-600'}`}>
                    {trend === 'up' ? <ArrowUpRight className="w-2 h-2 lg:w-3 lg:h-3" /> : <ArrowDownRight className="w-2 h-2 lg:w-3 lg:h-3" />}
                </div>
            )}
        </div>
        <p className="text-[9px] lg:text-[11px] font-black text-studio-muted uppercase tracking-[0.1em] lg:tracking-[0.2em] mb-1">{title}</p>
        <h4 className={`text-xs lg:text-xl font-black tracking-tight ${color === '#0284c7' ? 'text-[#0284c7]' : 'text-black'} truncate`}>{value}</h4>
    </div>
);
