import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertCircle, ChevronRight, 
  Building2, Map as MapIcon, Calendar, Target, Download, Info
} from 'lucide-react';
import { OBJETIVO_MENSAL, CLINICS } from '../constants';

// --- Paleta de Cores Oficial (Teal/Verde Petróleo) ---
const COLORS_TOP5 = [
  '#0D9488', // Teal 600
  '#115E59', // Teal 800
  '#14B8A6', // Teal 500
  '#0F766E', // Teal 700
  '#5EEAD4'  // Teal 300
];

const COLORS_YOY = { current: '#0D9488', prev: '#CBD5E1' }; 
const COLORS_PATIENTS = { new: '#0D9488', returning: '#94A3B8' }; 

const Reports: React.FC = () => {
  const { consultations, patients } = useData();
  
  // --- State de Filtros ---
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState('2025-11');
  const [dateRange, setDateRange] = useState({ start: '2025-11-01', end: '2025-11-30' });

  // --- Helpers de Formatação ---
  const formatMoney = (val: number) => {
     return val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const formatDateBr = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // --- Lógica de Filtragem ---
  const isWithinPeriod = (dateStr: string) => {
    if (filterType === 'month') {
      return dateStr.startsWith(selectedMonth);
    } else {
      return dateStr >= dateRange.start && dateStr <= dateRange.end;
    }
  };

  const getPeriodLabel = () => {
    if (filterType === 'month') {
      const [y, m] = selectedMonth.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1);
      return dateObj.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    } else {
      return `${formatDateBr(dateRange.start)} a ${formatDateBr(dateRange.end)}`;
    }
  };

  // --- Cálculo dos Dados (Memoized) ---
  const reportData = useMemo(() => {
    const filtered = consultations.filter(c => isWithinPeriod(c.date));
    
    // 1. Total Mensal / Período
    const totalCommission = filtered.reduce((sum, c) => sum + c.doctorCommission, 0);
    const percentGoal = Math.min(100, Math.round((totalCommission / OBJETIVO_MENSAL) * 100));
    
    // --- Lógica de "Comparação Justa" (Fair Comparison) ---
    let variation = 0;
    let isPositive = true;

    if (filterType === 'month') {
       // Determinar mês anterior
       const [currYear, currMonth] = selectedMonth.split('-').map(Number);
       const prevDate = new Date(currYear, currMonth - 2); // JS months 0-indexed
       const prevYearStr = prevDate.getFullYear();
       const prevMonthStr = String(prevDate.getMonth() + 1).padStart(2, '0');
       const prevMonthKey = `${prevYearStr}-${prevMonthStr}`;

       // Dia atual para "Month to Date"
       const todayDay = new Date().getDate();
       
       // Filtrar dados do mês anterior até ao mesmo dia (Comparação Justa)
       const prevMonthConsultations = consultations.filter(c => {
          if (!c.date.startsWith(prevMonthKey)) return false;
          const day = parseInt(c.date.split('-')[2]);
          return day <= todayDay;
       });

       const prevTotal = prevMonthConsultations.reduce((sum, c) => sum + c.doctorCommission, 0);
       
       if (prevTotal > 0) {
          variation = Math.round(((totalCommission - prevTotal) / prevTotal) * 100);
       } else if (totalCommission > 0) {
          variation = 100;
       }
       isPositive = variation >= 0;
    }

    // 2. Clínicas
    const sommerschield = filtered.filter(c => c.clinic === CLINICS.SOMMERSCHIELD);
    const baixa = filtered.filter(c => c.clinic === CLINICS.BAIXA);
    const commSomm = sommerschield.reduce((sum, c) => sum + c.doctorCommission, 0);
    const commBaixa = baixa.reduce((sum, c) => sum + c.doctorCommission, 0);

    // 3. Pendências Lab
    const pendingLabs = consultations.filter(c => c.hasPendingLab);

    // 4. Top 5 Categorias
    const catMap: Record<string, { value: number, count: number }> = {};
    
    filtered.forEach(c => {
      c.procedures.forEach(p => {
        const catName = p.name.split(' ')[0]; // Nome curto
        const procComm = (p.value / 1.05) * (p.code.startsWith('K') ? 0.65 : 0.40);
        
        if (!catMap[catName]) {
            catMap[catName] = { value: 0, count: 0 };
        }
        catMap[catName].value += procComm;
        catMap[catName].count += 1;
      });
    });

    const top5 = Object.entries(catMap)
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. Novos vs Recorrentes
    let newPatientsCount = 0;
    let returningPatientsCount = 0;
    
    filtered.forEach(c => {
       const patient = patients.find(p => p.id === c.patientId);
       if (patient) {
          const pDate = patient.createdAt.toISOString().split('T')[0];
          if (isWithinPeriod(pDate)) {
            newPatientsCount++;
          } else {
            returningPatientsCount++;
          }
       }
    });

    const patientData = [
      { name: 'Novos', value: newPatientsCount },
      { name: 'Recorrentes', value: returningPatientsCount }
    ];

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
      patientData,
      variation,
      isPositive
    };
  }, [consultations, patients, filterType, selectedMonth, dateRange]);

  // --- Dados Mock para YoY ---
  const dataYoY = [
    { name: 'Jan', anterior: 120000, atual: 130000 },
    { name: 'Fev', anterior: 125000, atual: 128000 },
    { name: 'Mar', anterior: 140000, atual: 142000 },
    { name: 'Abr', anterior: 135000, atual: 150000 },
    { name: 'Mai', anterior: 150000, atual: 155000 },
    { name: 'Jun', anterior: 160000, atual: 158000 },
    { name: 'Jul', anterior: 155000, atual: 162000 },
    { name: 'Ago', anterior: 140000, atual: 155000 },
    { name: 'Set', anterior: 135000, atual: 160000 },
    { name: 'Out', anterior: 150000, atual: 145000 },
    { name: 'Nov', anterior: 160000, atual: reportData.totalCommission },
    { name: 'Dez', anterior: 180000, atual: 0 },
  ];

  // --- Gerar CSV ---
  const generateCSV = () => {
    const periodLabel = getPeriodLabel();
    const sortedData = [...reportData.filtered].sort((a, b) => a.date.localeCompare(b.date));
    
    let csvContent = "\uFEFF";
    csvContent += `Médico:;Shamila Modan\n`;
    csvContent += `Local:;Sommerschield / Baixa\n`;
    csvContent += `Período:;${periodLabel}\n`;
    csvContent += `\n`;
    csvContent += `Ordem;Paciente;Tratamento Feito;Valor (MT);Observação\n`;

    sortedData.forEach((c, index) => {
      const treatments = c.procedures.map(p => p.code).join(' + ');
      const valStr = c.totalValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      const patientName = c.patientName.replace(/;/g, ',');
      csvContent += `${index + 1};${patientName};${treatments};"${valStr}"; \n`;
    });

    const totalStr = reportData.filtered.reduce((acc, curr) => acc + curr.totalValue, 0)
      .toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    csvContent += `\n`;
    csvContent += `TOTAL;;;"${totalStr}";\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = filterType === 'month' 
      ? `Relatorio_${selectedMonth}_ShamilaModan.csv`
      : `Relatorio_${dateRange.start}_${dateRange.end}_ShamilaModan.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Tooltips Customizados (Light Theme) ---

  const CustomTooltipTop5 = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs z-50 text-slate-700">
          <span className="font-bold">{data.name}</span>
          <span className="mx-1.5 text-gray-300">—</span>
          <span className="font-bold text-teal-600">{formatMoney(data.value)}</span>
          <span className="mx-1.5 text-gray-300">—</span>
          <span className="text-slate-500">{data.count} consultas</span>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipGeneral = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs z-50 text-slate-700">
          <p className="font-bold mb-1 text-slate-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }}></div>
               <span className="text-slate-600">{entry.name}:</span>
               <span className="font-bold text-slate-800">{formatMoney(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
     if (active && payload && payload.length) {
        const data = payload[0];
        return (
          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs z-50 text-slate-700">
             <div className="font-bold text-teal-700 mb-0.5">{data.name}</div>
             <div>{data.value} pacientes</div>
          </div>
        );
     }
     return null;
  };

  return (
    <div className="pb-32 pt-6 px-5 max-w-lg mx-auto space-y-6 bg-gray-50 min-h-screen font-sans">
      
      {/* --- Cabeçalho e Título --- */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Relatórios</h1>
        <p className="text-xs text-gray-500">Gestão e Performance</p>
      </div>

      {/* --- Bloco de Controlo Unificado - LAYOUT OPTIMIZADO --- */}
      <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
        
        {/* Linha 1: Toggle (Esq) e Download (Dir - Desktop) */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
           {/* Toggle Selector */}
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

           {/* Download Button (DESKTOP) */}
           <button 
              onClick={generateCSV}
              className="hidden md:flex bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs items-center justify-center gap-2 shadow-lg shadow-slate-800/10 active:scale-95 transition-transform hover:bg-slate-700"
              title="Descarregar Relatório (CSV/Excel)"
            >
              <Download size={16} />
              <span>Descarregar</span>
           </button>
        </div>

        {/* Linha 2: Input Fields (Full Width) */}
        <div>
            {filterType === 'month' ? (
                <div className="relative bg-white border border-gray-300 rounded-xl px-3 py-2.5 flex items-center shadow-sm hover:border-teal-400 transition-colors group w-full">
                    <Calendar size={18} className="text-gray-400 mr-2 group-focus-within:text-teal-500" />
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                    />
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm hover:border-teal-400 transition-colors group w-full">
                    <div className="flex items-center w-full sm:w-auto flex-1">
                        <Calendar size={18} className="text-gray-400 mr-2 shrink-0 group-focus-within:text-teal-500" />
                        <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                        className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                        />
                    </div>
                    <span className="text-gray-400 font-bold hidden sm:inline">-</span>
                    <div className="flex items-center w-full sm:w-auto flex-1 sm:pl-0">
                        <span className="text-gray-400 font-bold sm:hidden mr-2 text-xs">Até</span>
                        <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                        className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Mobile Download Button (visible only on small screens) */}
        <button 
            onClick={generateCSV}
            className="md:hidden bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-800/10 active:scale-95 transition-transform w-full hover:bg-slate-700"
            title="Descarregar Relatório (CSV/Excel)"
        >
            <Download size={18} />
            <span>Descarregar</span>
        </button>
      </div>

      {/* 3. TOTAL MENSAL (KPI) */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Líquido (Comissão)</span>
            
            {/* Trend Indicator */}
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${reportData.isPositive ? 'bg-teal-900/50 text-teal-400 border-teal-800/50' : 'bg-red-900/50 text-red-400 border-red-800/50'}`}>
              {reportData.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {filterType === 'month' ? `${Math.abs(reportData.variation)}%` : '--'}
            </div>
        </div>
          
        <div className="text-4xl font-bold text-white mb-6 tracking-tight">
           {formatMoney(reportData.totalCommission)}
        </div>

        <div className="space-y-2 relative group">
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

            {/* Tooltip de Comparação Justa */}
            {filterType === 'month' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-[10px] p-2 rounded-lg border border-slate-600 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                   Comparação justa: este valor compara o desempenho do dia 1 até à data atual com o mesmo intervalo no mês anterior.
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-slate-500">
             <Info size={12} />
             <p className="text-[10px] italic">
                Passe o rato sobre a barra para ver a regra de comparação.
             </p>
        </div>
      </section>

      {/* 4. CLÍNICAS */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-slate-800 mb-5">Clínicas</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Sommerschield */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Building2 size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase">Sommerschield</span>
            </div>
            <div className="text-xl font-bold text-slate-800">{formatMoney(reportData.commSomm)}</div>
            <div className="text-xs text-gray-400">{reportData.countSomm} consultas</div>
          </div>
          
          {/* Baixa */}
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 text-slate-500 mb-1 justify-end">
              <span className="text-xs font-bold uppercase">Baixa</span>
              <MapIcon size={16} className="text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-800">{formatMoney(reportData.commBaixa)}</div>
            <div className="text-xs text-gray-400">{reportData.countBaixa} consultas</div>
          </div>
        </div>

        {/* Barra Comparativa */}
        <div className="flex h-2 rounded-full overflow-hidden w-full mb-3 bg-gray-100">
           <div className="h-full" style={{ width: `${reportData.totalCommission > 0 ? (reportData.commSomm / reportData.totalCommission) * 100 : 0}%`, backgroundColor: '#0D9488' }}></div>
           <div className="h-full flex-1" style={{ backgroundColor: '#CBD5E1' }}></div>
        </div>

        <p className="text-xs text-gray-400 italic">
           "Onde estou a gerar mais rendimento neste período?"
        </p>
      </section>

      {/* 5. PENDÊNCIAS DE LAB (Alerta Visual) */}
      {reportData.pendingLabs.length > 0 && (
        <section className="bg-orange-50/80 rounded-2xl p-6 shadow-sm border border-orange-100">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
               <AlertCircle className="text-orange-500" size={20} />
               Pendências Lab
             </h2>
             <span className="bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-orange-100">
               {reportData.pendingLabs.length}
             </span>
           </div>

           <div className="space-y-3">
             {reportData.pendingLabs.slice(0, 3).map(c => (
               <div key={c.id} className="flex justify-between items-center py-2 border-b border-orange-100/50 last:border-0">
                 <div>
                   <p className="text-sm font-bold text-slate-700">{c.patientName}</p>
                   <p className="text-xs text-slate-400">#{c.id}</p>
                 </div>
                 <button className="bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 active:scale-95 transition-all">
                   Corrigir <ChevronRight size={14} />
                 </button>
               </div>
             ))}
           </div>
           
           <p className="text-xs text-orange-400 italic mt-4">
             "Corrige estas pendências para garantir que a comissão fica correcta."
           </p>
        </section>
      )}

      {/* 6. PERFORMANCE POR CATEGORIA */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-slate-800 mb-6">Top 5 Categorias</h2>
        
        <div className="h-48 w-full mb-2">
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
                 <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={<CustomTooltipTop5 />}
                 />
                 <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                   {reportData.top5.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS_TOP5[index % COLORS_TOP5.length]} />
                   ))}
                 </Bar>
              </BarChart>
           </ResponsiveContainer>
        </div>

        <p className="text-xs text-gray-400 italic">
           "Quais os procedimentos que me estão a gerar maior rendimento neste período?"
        </p>
      </section>

      {/* 7. GRÁFICO ANUAL YoY */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-end mb-6">
           <h2 className="text-lg font-medium text-slate-800">Comparativo Anual</h2>
           <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1 text-gray-500">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS_YOY.current}}></div> 2025
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS_YOY.prev}}></div> 2024
              </div>
           </div>
        </div>

        <div className="h-48 w-full mb-2">
          <ResponsiveContainer width="100%" height="100%">
             <BarChart data={dataYoY} barGap={4}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} interval={0} />
                <Tooltip 
                   cursor={{fill: '#f1f5f9'}}
                   content={<CustomTooltipGeneral />}
                />
                <Bar dataKey="anterior" fill={COLORS_YOY.prev} radius={[2, 2, 0, 0]} name="2024" />
                <Bar dataKey="atual" fill={COLORS_YOY.current} radius={[2, 2, 0, 0]} name="2025" />
             </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-gray-400 italic">
           "Como está este ano comparado com o anterior?"
        </p>
      </section>

      {/* 8. NOVOS VS RECORRENTES */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
         <h2 className="text-lg font-medium text-slate-800 mb-2">Pacientes</h2>
         
         <div className="flex items-center justify-between">
            <div className="h-40 w-40 relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Tooltip content={<CustomTooltipPie />} />
                     <Pie
                        data={reportData.patientData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                     >
                        <Cell fill={COLORS_PATIENTS.new} name="Novos" />
                        <Cell fill={COLORS_PATIENTS.returning} name="Recorrentes" />
                     </Pie>
                  </PieChart>
               </ResponsiveContainer>
               {/* Centro do Donut */}
               <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-xl font-bold text-slate-700">{reportData.countSomm + reportData.countBaixa}</span>
                  <span className="text-[10px] text-gray-400 uppercase">Total</span>
               </div>
            </div>

            <div className="flex-1 pl-6 space-y-4">
               <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS_PATIENTS.new}}></div>
                     Novos
                  </div>
                  <div className="pl-5 text-xs text-gray-500">{reportData.patientData[0].value} pacientes</div>
               </div>
               <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS_PATIENTS.returning}}></div>
                     Recorrentes
                  </div>
                  <div className="pl-5 text-xs text-gray-500">{reportData.patientData[1].value} pacientes</div>
               </div>
            </div>
         </div>

         <p className="text-xs text-gray-400 italic mt-4">
           "Estou a atrair novos pacientes ou apenas a acompanhar os habituais?"
         </p>
      </section>

      {/* Footer Padding Safe Area */}
      <div className="h-6"></div>
    </div>
  );
};

export default Reports;