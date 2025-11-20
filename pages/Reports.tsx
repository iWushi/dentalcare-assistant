import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Download, ChevronRight, 
  Building2, Map as MapIcon, Calendar, Target, FlaskConical, Info
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

const YEARS = ['2024', '2025', '2026'];

const Reports: React.FC = () => {
  const { consultations, availableProcedures } = useData();
  
  // --- State de Filtros ---
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [selMonth, setSelMonth] = useState(String(currentMonth));
  const [selYear, setSelYear] = useState(String(currentYear));

  const [dateRange, setDateRange] = useState({ 
    start: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`, 
    end: `${currentYear}-${String(currentMonth).padStart(2, '0')}-30` 
  });

  // --- Helpers ---
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
    
    // --- Variação Mensal ---
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

    // Clínicas (usando valor_final_dra)
    const sommerschield = filtered.filter(c => c.clinic === CLINICS.SOMMERSCHIELD);
    const baixa = filtered.filter(c => c.clinic === CLINICS.BAIXA);
    const commSomm = sommerschield.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
    const commBaixa = baixa.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);

    // Pendências Lab (apenas futuras/hoje e que tenham itens de lab)
    // Regra: custo_lab NULL/0 && tem_lab = true && data >= hoje
    const pendingLabs = safeConsultations.filter(c => {
        if (c.date < todayStr) return false;
        return c.hasPendingLab; // Esta flag já é calculada no DataContext com base em procedimentos e custo
    });

    // Top 5 Categorias (baseado em Preços.categoria)
    const catMap: Record<string, { value: number, count: number, color: string }> = {};
    
    // Mapa rápido de Código -> Categoria (usando availableProcedures do DataContext)
    const codeToCatMap = new Map<string, string>();
    availableProcedures.forEach(price => {
        if (price.id) codeToCatMap.set(price.id, price.categoria || 'Geral');
    });

    filtered.forEach(c => {
       const totalValue = c.procedures.reduce((sum, p) => sum + (p.value || 0), 0);
       if (totalValue === 0) return;

       c.procedures.forEach(p => {
           if (!p.code) return;
           
           // Tenta encontrar categoria pelo código completo
           let catName = codeToCatMap.get(p.code);
           
           // Se não encontrar, tenta inferir pela primeira letra (Legacy fallback)
           if (!catName) {
               const firstLetter = p.code.charAt(0).toUpperCase();
               const matchedCat = PROCEDURE_CATEGORIES.find(cat => cat.code === firstLetter);
               catName = matchedCat ? matchedCat.name : 'Outros';
           }

           // Se a categoria vier da BD (ex: "Dentística"), vamos tentar mapear cor
           // Se não, usamos default
           let catColor = '#94a3b8';
           const knownCat = PROCEDURE_CATEGORIES.find(cat => cat.name.toLowerCase() === catName?.toLowerCase() || cat.code === p.code.charAt(0));
           if (knownCat) catColor = knownCat.color;

           // Proporção da comissão da Dra para este procedimento
           const weight = (p.value || 0) / totalValue;
           const procCommission = (c.doctorCommission || 0) * weight;

           if (!catMap[catName || 'Outros']) {
               catMap[catName || 'Outros'] = { value: 0, count: 0, color: catColor };
           }
           catMap[catName || 'Outros'].value += procCommission;
           catMap[catName || 'Outros'].count += 1;
       });
    });

    const top5 = Object.entries(catMap)
      .map(([name, data]) => ({ name, value: data.value, count: data.count, color: data.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

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
      variation,
      isPositive
    };
  }, [consultations, filterType, selMonth, selYear, dateRange, todayStr, availableProcedures]);

  // --- Patients Stats (Novos vs Recorrentes) ---
  const patientStats = useMemo(() => {
      const targetYear = parseInt(selYear);
      let newCount = 0;
      let recurringCount = 0;
      
      // Set of Patient IDs who visited in selected year
      const yearConsultations = consultations.filter(c => {
          const y = parseInt(c.date.split('-')[0]);
          return y === targetYear;
      });
      const visitorsThisYear = new Set(yearConsultations.map(c => c.patientId));

      visitorsThisYear.forEach(pid => {
          // Find history of this patient sorted by date
          const patientHistory = consultations
             .filter(c => c.patientId === pid)
             .sort((a,b) => a.date.localeCompare(b.date));
          
          if (patientHistory.length === 0) return;

          const firstVisitDate = patientHistory[0].date;
          const firstVisitYear = parseInt(firstVisitDate.split('-')[0]);

          // Novos: Primeira vez que aparece é neste ano
          if (firstVisitYear === targetYear) {
              newCount++;
          } else {
              // Recorrentes: Já apareceu antes deste ano, e voltou este ano
              recurringCount++;
          }
      });

      return [
          { name: 'Novos', value: newCount, color: '#0d9488' }, // Teal
          { name: 'Recorrentes', value: recurringCount, color: '#94a3b8' } // Slate
      ];
  }, [consultations, selYear]);


  // --- Comparison Data (Annual) ---
  const comparisonData = useMemo(() => {
    const curYearInt = parseInt(selYear);
    const prevYearInt = curYearInt - 1;
    
    const data = MONTHS.map((m) => ({
      name: m.label.substring(0, 3),
      fullMonth: m.label,
      [prevYearInt]: 0,
      [curYearInt]: 0,
    }));

    consultations.forEach(c => {
      if (!c.date) return;
      const parts = c.date.split('-');
      if (parts.length < 2) return;
      
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1; 
      
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
    csvContent += `Data;Paciente;Clínica;Tratamento;Valor Bruto;Comissão\n`;

    sortedData.forEach((c) => {
      const treatments = c.procedures
          .map(p => (p.code && p.code.length < 10) ? p.code : '')
          .filter(Boolean)
          .join(' + ');

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

  return (
    <div className="pb-40 pt-6 px-5 max-w-lg mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
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

      {/* 1. CARD TOTAL LÍQUIDO (Updated Title) */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Líquido</span>
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
            <p className="text-[10px] text-slate-500 mt-1">Passe o rato sobre a barra para ver a regra de comparação.</p>
        </div>
      </section>

      {/* 2. CARD CLÍNICAS */}
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
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
             <div className="bg-teal-500 h-full" style={{ width: `${(reportData.commSomm / (reportData.commSomm + reportData.commBaixa || 1)) * 100}%` }}></div>
             <div className="bg-slate-300 h-full flex-1"></div>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 italic">"Onde estou a gerar mais rendimento neste período?"</p>
      </section>

      {/* 3. CARD PENDÊNCIAS LAB (NEW) - Only show if pending labs exist */}
      {reportData.pendingLabs.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 relative">
             <div className="absolute top-4 right-4 text-xs font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
               {reportData.pendingLabs.length}
             </div>
             <div className="flex items-center gap-2 mb-4">
                 <FlaskConical className="text-amber-500" size={20} />
                 <h2 className="text-lg font-medium text-amber-900">Pendências Lab</h2>
             </div>
             
             <div className="space-y-3 mb-3">
                {reportData.pendingLabs.slice(0, 3).map(c => (
                  <div key={c.id} className="flex justify-between items-center bg-white/60 p-3 rounded-xl">
                      <div>
                          <div className="font-bold text-slate-800 text-sm">{c.patientName}</div>
                          <div className="text-[10px] text-gray-500">#{c.id}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-xs font-bold text-slate-600 mb-1">{formatMoney(c.totalValue)}</div>
                          <Link 
                            to={`/consultations?search=${c.id}`} 
                            className="px-3 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-1"
                          >
                            Corrigir <ChevronRight size={10}/>
                          </Link>
                      </div>
                  </div>
                ))}
             </div>
             
             <p className="text-[10px] text-amber-700 italic mt-2">"Corrige estas pendências para garantir que a comissão fica correcta."</p>
        </div>
      )}

      {/* 4. CARD TOP 5 CATEGORIAS (Updated) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-slate-800 mb-6">Top 5 Categorias</h2>
        <div className="h-48 w-full mb-2">
           {reportData.top5.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={reportData.top5} margin={{ left: 0, right: 20, bottom: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     width={70}
                     tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} 
                   />
                   <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltipTop5 />} />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                     {reportData.top5.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                <Info size={24} className="mb-2 opacity-20" />
                Sem dados
             </div>
           )}
        </div>
        <p className="text-[10px] text-gray-400 italic">"Quais os procedimentos que me estão a gerar maior rendimento neste período?"</p>
      </section>

      {/* 5. CARD COMPARATIVO ANUAL (Updated) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-lg font-medium text-slate-800">Comparativo Anual</h2>
           <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                 <span className="text-slate-700">{comparisonData.curYearInt}</span>
              </div>
              <div className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                 <span className="text-gray-400">{comparisonData.prevYearInt}</span>
              </div>
           </div>
        </div>
        <div className="h-48 w-full">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData.data} margin={{top: 5, right: 0, left: -25, bottom: 0}}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fontSize: 10, fill: '#94a3b8'}} 
                   dy={10}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fontSize: 9, fill: '#94a3b8'}} 
                   tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                 />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    formatter={(value: number) => formatMoney(value)}
                 />
                 <Bar dataKey={comparisonData.prevYearInt} fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={8} />
                 <Bar dataKey={comparisonData.curYearInt} fill="#0d9488" radius={[2, 2, 0, 0]} barSize={8} />
              </BarChart>
           </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 italic mt-4">"Como está este ano comparado com o anterior?"</p>
      </section>

      {/* 6. CARD PACIENTES (NEW Donut) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
         <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-medium text-slate-800">Pacientes</h2>
         </div>
         <div className="flex items-center justify-center gap-8">
             {/* Donut Chart */}
             <div className="h-32 w-32 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={patientStats}
                         innerRadius={40}
                         outerRadius={55}
                         paddingAngle={5}
                         dataKey="value"
                         stroke="none"
                       >
                         {patientStats.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-xl font-bold text-slate-800">
                         {patientStats.reduce((acc, curr) => acc + curr.value, 0)}
                     </span>
                     <span className="text-[8px] text-gray-400 uppercase tracking-widest">TOTAL</span>
                 </div>
             </div>
             
             {/* Legend */}
             <div className="space-y-3">
                 {patientStats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }}></div>
                            {stat.name}
                        </div>
                        <div className="text-[10px] text-gray-400 ml-4">{stat.value} pacientes</div>
                    </div>
                 ))}
             </div>
         </div>
         <p className="mt-6 text-center text-xs text-gray-400 italic">
             "Estou a atrair novos pacientes ou apenas a acompanhar os habituais?"
         </p>
      </section>

      <div className="h-6"></div>
    </div>
  );
};

export default Reports;