import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertCircle, ChevronRight, 
  Building2, Map as MapIcon, Calendar, Target, Download, Info, FlaskConical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OBJETIVO_MENSAL, CLINICS, PROCEDURE_CATEGORIES } from '../constants';

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const YEARS = ['2025', '2024', '2026', '2027'];

const Reports: React.FC = () => {
  const { consultations } = useData();
  
  // --- State de Filtros ---
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [selMonth, setSelMonth] = useState(String(currentMonth));
  const [selYear, setSelYear] = useState(String(currentYear));

  const [dateRange, setDateRange] = useState({ 
    start: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`, 
    end: `${currentYear}-${String(currentMonth).padStart(2, '0')}-30` 
  });

  // --- Helpers ---
  // Standard Format: 000 000,00 MT
  const formatMoney = (val: number) => {
     return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const formatDateBr = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    
    // A data vem sempre YYYY-MM-DD do normalizeDate
    const parts = dateStr.split('-'); 
    if (parts.length < 3) return false;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);

    if (filterType === 'month') {
      const targetMonth = parseInt(selMonth);
      const targetYear = parseInt(selYear);
      return month === targetMonth && year === targetYear;
    } else {
      const normalizedDate = dateStr.substring(0, 10);
      return normalizedDate >= dateRange.start && normalizedDate <= dateRange.end;
    }
  };

  const getPeriodLabel = () => {
    if (filterType === 'month') {
      const monthName = MONTHS.find(m => m.value === selMonth)?.label || selMonth;
      return `${monthName} de ${selYear}`;
    } else {
      return `${formatDateBr(dateRange.start)} a ${formatDateBr(dateRange.end)}`;
    }
  };

  // --- Cálculo dos Dados ---
  const reportData = useMemo(() => {
    const safeConsultations = consultations || [];
    const filtered = safeConsultations.filter(c => isWithinPeriod(c.date));
    
    const totalCommission = filtered.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
    const percentGoal = OBJETIVO_MENSAL > 0 ? Math.min(100, Math.round((totalCommission / OBJETIVO_MENSAL) * 100)) : 0;
    
    // --- Variação ---
    let variation = 0;
    let isPositive = true;

    if (filterType === 'month') {
       try {
         const currYearNum = parseInt(selYear);
         const currMonthNum = parseInt(selMonth);
         
         let prevMonth = currMonthNum - 1;
         let prevYear = currYearNum;
         if (prevMonth === 0) {
             prevMonth = 12;
             prevYear = currYearNum - 1;
         }

         const prevTotal = safeConsultations
            .filter(c => {
                if(!c.date) return false;
                const parts = c.date.split('-');
                if (parts.length < 2) return false;
                const pYear = parseInt(parts[0]);
                const pMonth = parseInt(parts[1]);
                return pMonth === prevMonth && pYear === prevYear;
            })
            .reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
         
         if (prevTotal > 0) {
            variation = Math.round(((totalCommission - prevTotal) / prevTotal) * 100);
         } else if (totalCommission > 0) {
            variation = 100;
         }
         isPositive = variation >= 0;

       } catch (e) {
         variation = 0;
       }
    }

    // Clínicas
    const sommerschield = filtered.filter(c => c.clinic === CLINICS.SOMMERSCHIELD);
    const baixa = filtered.filter(c => c.clinic === CLINICS.BAIXA);
    const commSomm = sommerschield.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
    const commBaixa = baixa.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);

    // Pendências (Geral - Não apenas do periodo)
    // Pendência = Toggle ON mas Custo 0/Empty
    const pendingLabs = safeConsultations.filter(c => 
        c.procedures && c.procedures.some(p => p.isLabPending && (!p.labCost || p.labCost === 0))
    );

    // Top 5 com cores das Categorias
    const catMap: Record<string, { value: number, count: number, color: string }> = {};
    
    filtered.forEach(c => {
      if (c.procedures && Array.isArray(c.procedures)) {
        c.procedures.forEach(p => {
            if (!p) return;
            
            // New Formula for Reports too: ((Val - Lab) / 1.05) * 0.40
            const procValue = Number(p.value) || 0;
            const procLab = Number(p.labCost) || 0;
            const base = Math.max(0, procValue - procLab);
            const procComm = (base / 1.05) * 0.40;
            
            // Tentar determinar a Categoria
            let catName = 'Geral';
            if (p.name) {
                catName = p.name.split(' ')[0];
            }
             
            let catColor = '#14B8A6'; // Default Teal

            if (p.code) {
                const firstLetter = p.code.charAt(0).toUpperCase();
                const matchedCat = PROCEDURE_CATEGORIES.find(cat => cat.code === firstLetter);
                if (matchedCat) {
                    catName = matchedCat.name;
                    catColor = matchedCat.color;
                }
            }
            
            if (!catMap[catName]) {
                catMap[catName] = { value: 0, count: 0, color: catColor };
            }
            catMap[catName].value += procComm;
            catMap[catName].count += 1;
        });
      }
    });

    const top5 = Object.entries(catMap)
      .map(([name, data]) => ({ name, value: data.value, count: data.count, color: data.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
      
    // Daily Trend Data for Chart
    const dailyDataMap: Record<string, number> = {};
    filtered.forEach(c => {
       const day = c.date.split('-')[2]; // DD
       dailyDataMap[day] = (dailyDataMap[day] || 0) + (c.doctorCommission || 0);
    });
    
    const chartData = Object.keys(dailyDataMap)
       .sort((a,b) => parseInt(a) - parseInt(b))
       .map(day => ({
          day: `${day}/${selMonth}`,
          value: dailyDataMap[day]
       }));

    return {
      filtered,
      totalCommission,
      percentGoal,
      commSomm,
      commBaixa,
      countSomm: sommerschield.length,
      countBaixa: baixa.length,
      pendingLabs,
      top5,
      chartData,
      variation,
      isPositive
    };
  }, [consultations, filterType, selMonth, selYear, dateRange]);

  // --- Data for Comparison Chart (Year vs Last Year) ---
  const comparisonData = useMemo(() => {
    const curYearInt = parseInt(selYear);
    const prevYearInt = curYearInt - 1;
    
    // Initialize 12 months data structure
    const data = MONTHS.map((m) => ({
      name: m.label.substring(0, 3), // Jan, Fev...
      fullMonth: m.label,
      [prevYearInt]: 0,
      [curYearInt]: 0,
    }));

    consultations.forEach(c => {
      if (!c.date) return;
      const parts = c.date.split('-');
      if (parts.length < 2) return;
      
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1; // 0-based index in array
      
      if (m < 0 || m > 11) return;

      const val = Number(c.doctorCommission) || 0;

      if (y === curYearInt) {
         data[m][curYearInt] += val;
      } else if (y === prevYearInt) {
         data[m][prevYearInt] += val;
      }
    });

    return { data, curYearInt, prevYearInt };
  }, [consultations, selYear]);

  // --- CSV ---
  const generateCSV = () => {
    const periodLabel = getPeriodLabel();
    const sortedData = [...reportData.filtered].sort((a, b) => a.date.localeCompare(b.date));
    
    let csvContent = "\uFEFF";
    csvContent += `Relatório DentalCare;${periodLabel}\n\n`;
    csvContent += `Data;Paciente;Clínica;Tratamento;Valor;Comissão\n`;

    sortedData.forEach((c) => {
      const treatments = c.procedures.map(p => p.code).join(' + ');
      const valStr = (c.totalValue || 0).toFixed(2).replace('.', ',');
      const commStr = (c.doctorCommission || 0).toFixed(2).replace('.', ',');
      const dateStr = formatDateBr(c.date);
      csvContent += `${dateStr};${c.patientName};${c.clinic};${treatments};"${valStr}";"${commStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_${selYear}_${selMonth}.csv`);
    link.click();
  };

  // Custom Tooltips
  const CustomTooltipTop5 = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs z-50 text-slate-700">
          <span className="font-bold" style={{ color: data.color }}>{data.name}</span>
          <span className="mx-1.5 text-gray-300">—</span>
          <span className="font-bold text-slate-700">{formatMoney(data.value)}</span>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipComparison = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
       const prevYearVal = payload[0].value;
       const curYearVal = payload[1].value;
       const prevYearKey = payload[0].dataKey;
       const curYearKey = payload[1].dataKey;

       return (
         <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs z-50">
             <p className="font-bold text-slate-800 mb-2 border-b border-gray-50 pb-1">{payload[0].payload.fullMonth}</p>
             <div className="flex justify-between gap-4 mb-1">
                <span className="text-gray-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300"></div> {prevYearKey}:</span>
                <span className="font-mono">{formatMoney(prevYearVal)}</span>
             </div>
             <div className="flex justify-between gap-4">
                <span className="text-teal-700 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-600"></div> {curYearKey}:</span>
                <span className="font-mono font-bold text-teal-700">{formatMoney(curYearVal)}</span>
             </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="pb-32 pt-6 px-5 max-w-lg mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Relatórios</h1>
        <p className="text-xs text-gray-500">Gestão e Performance</p>
      </div>

      {/* Filtros */}
      <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
           <div className="bg-gray-200/50 p-1 rounded-xl flex shrink-0 w-full md:w-auto self-start">
              <button 
                onClick={() => setFilterType('month')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-lg transition-all ${filterType === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setFilterType('range')}
                className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-lg transition-all ${filterType === 'range' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Período
              </button>
           </div>

           <button 
              onClick={generateCSV}
              className="hidden md:flex bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs items-center justify-center gap-2 shadow-lg hover:bg-slate-700"
            >
              <Download size={16} />
              <span>Exportar CSV</span>
           </button>
        </div>

        <div>
            {filterType === 'month' ? (
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <select 
                          value={selMonth}
                          onChange={(e) => setSelMonth(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500 appearance-none shadow-sm"
                        >
                           {MONTHS.map(m => (
                             <option key={m.value} value={m.value}>{m.label}</option>
                           ))}
                        </select>
                        <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="relative w-28">
                        <select 
                          value={selYear}
                          onChange={(e) => setSelYear(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500 appearance-none shadow-sm"
                        >
                           {YEARS.map(y => (
                             <option key={y} value={y}>{y}</option>
                           ))}
                        </select>
                        <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                    </div>
                </div>
            ) : (
                <div className="flex gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm">
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                      className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                      className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none"
                    />
                </div>
            )}
        </div>
      </div>

      {/* KPI Principal */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Líquido (Comissão)</span>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${reportData.isPositive ? 'bg-teal-900/50 text-teal-400 border-teal-800/50' : 'bg-red-900/50 text-red-400 border-red-800/50'}`}>
              {reportData.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {filterType === 'month' ? `${Math.abs(reportData.variation)}%` : '--'}
            </div>
        </div>
          
        <div className="text-4xl font-bold text-white mb-6 tracking-tight">
           {formatMoney(reportData.totalCommission)}
        </div>

        <div className="space-y-2 relative">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1"><Target size={12}/> Objectivo: {formatMoney(OBJETIVO_MENSAL)}</span>
              <span className="font-bold text-white">{reportData.percentGoal}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.4)]" 
                style={{ width: `${reportData.percentGoal}%` }}
              ></div>
            </div>
        </div>
      </section>

      {/* ALERT CARD: Pending Lab Costs */}
      {reportData.pendingLabs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in">
           <div className="flex items-center gap-3 mb-2">
             <div className="bg-amber-100 p-2 rounded-full text-amber-600">
               <FlaskConical size={20} />
             </div>
             <div className="flex-1">
               <h3 className="text-sm font-bold text-amber-800">Custos de laboratório pendentes</h3>
               <p className="text-xs text-amber-600">{reportData.pendingLabs.length} consultas precisam de atenção</p>
             </div>
             <Link to="/consultations" className="text-xs bg-white text-amber-600 px-3 py-1 rounded-lg border border-amber-200 font-bold">
               Resolver
             </Link>
           </div>
        </div>
      )}

      {/* Gráfico de Comparação Anual */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-lg font-medium text-slate-800">Comparação Anual</h2>
           <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1">
                 <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                 <span className="text-gray-500">{comparisonData.prevYearInt}</span>
              </div>
              <div className="flex items-center gap-1">
                 <div className="w-3 h-3 rounded-full bg-teal-600"></div>
                 <span className="text-slate-700">{comparisonData.curYearInt}</span>
              </div>
           </div>
        </div>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData.data} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fontSize: 11, fill: '#94a3b8'}} 
                   dy={10}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fontSize: 10, fill: '#94a3b8'}} 
                   tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                 />
                 <Tooltip content={<CustomTooltipComparison />} cursor={{fill: '#f8fafc'}} />
                 <Bar dataKey={comparisonData.prevYearInt} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={12} />
                 <Bar dataKey={comparisonData.curYearInt} fill="#0d9488" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico de Evolução Diária */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
         <h2 className="text-lg font-medium text-slate-800 mb-4">Evolução Diária ({getPeriodLabel()})</h2>
         <div className="h-48 w-full">
            {reportData.chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.chartData}>
                     <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} minTickGap={20} />
                     <Tooltip 
                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px'}}
                        itemStyle={{color: '#0f172a', fontWeight: 'bold'}}
                        formatter={(val: number) => [formatMoney(val), 'Comissão']}
                     />
                     <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
               </ResponsiveContainer>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                  <Info size={24} className="mb-2 opacity-20" />
                  Sem dados para exibir
               </div>
            )}
         </div>
      </section>

      {/* Clínicas */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-slate-800 mb-5">Clínicas</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Building2 size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase">Sommerschield</span>
            </div>
            <div className="text-xl font-bold text-slate-800">{formatMoney(reportData.commSomm)}</div>
            <div className="text-xs text-gray-400">{reportData.countSomm} consultas</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-500 mb-1 justify-end">
              <span className="text-xs font-bold uppercase">Baixa</span>
              <MapIcon size={16} className="text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-800">{formatMoney(reportData.commBaixa)}</div>
            <div className="text-xs text-gray-400">{reportData.countBaixa} consultas</div>
          </div>
        </div>
      </section>

      {/* Gráfico Top 5 */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-slate-800 mb-6">Top 5 Categorias</h2>
        <div className="h-48 w-full mb-2">
           {reportData.top5.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={reportData.top5} margin={{ left: 0, right: 0, bottom: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     width={85}
                     tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} 
                   />
                   <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltipTop5 />} />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                     {reportData.top5.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                <Info size={24} className="mb-2 opacity-20" />
                Sem dados para exibir neste período
             </div>
           )}
        </div>
      </section>

      <div className="h-6"></div>
    </div>
  );
};

export default Reports;