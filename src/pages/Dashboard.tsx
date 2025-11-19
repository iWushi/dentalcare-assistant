import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Calendar, Target, Building2, Map as MapIcon, Info, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OBJETIVO_MENSAL, CLINICS } from '../constants';

const Dashboard: React.FC = () => {
  const { consultations } = useData();
  const { logout } = useAuth();

  // Mocking current month as Nov 2025 (based on data context)
  const CURRENT_MONTH_STR = '2025-11';
  const PREV_MONTH_STR = '2025-10';

  const { 
    totalCommission, 
    pendingLabsCount, 
    percentGoal, 
    remainingGoal, 
    sommerschieldTotal, 
    baixaTotal,
    variation,
    recentConsultations
  } = useMemo(() => {
    // Current Month Data
    const monthlyConsultations = consultations.filter(c => c.date.startsWith(CURRENT_MONTH_STR));
    const totalCommission = monthlyConsultations.reduce((sum, c) => sum + c.doctorCommission, 0);
    const pendingLabsCount = consultations.filter(c => c.hasPendingLab).length;

    // Clinic Split
    const sommerschieldTotal = monthlyConsultations
      .filter(c => c.clinic === CLINICS.SOMMERSCHIELD)
      .reduce((sum, c) => sum + c.doctorCommission, 0);
      
    const baixaTotal = monthlyConsultations
      .filter(c => c.clinic === CLINICS.BAIXA)
      .reduce((sum, c) => sum + c.doctorCommission, 0);

    // Goal Logic
    const percentGoal = Math.min(100, Math.round((totalCommission / OBJETIVO_MENSAL) * 100));
    const remainingGoal = Math.max(0, OBJETIVO_MENSAL - totalCommission);

    // --- Variation Logic (Fair Comparison) ---
    // Compare: Accumulated until today's DAY in current month VS accumulated until same DAY in previous month
    const todayDay = new Date().getDate(); 
    
    const prevMonthConsultations = consultations.filter(c => {
        if (!c.date.startsWith(PREV_MONTH_STR)) return false;
        const day = parseInt(c.date.split('-')[2]);
        return day <= todayDay;
    });

    const prevMonthTotal = prevMonthConsultations.reduce((sum, c) => sum + c.doctorCommission, 0);
    
    // Variation calculation
    let variation = 0;
    if (prevMonthTotal > 0) {
        variation = Math.round(((totalCommission - prevMonthTotal) / prevMonthTotal) * 100);
    } else if (totalCommission > 0) {
        variation = 100; // If prev was 0 and now > 0
    }

    const recentConsultations = consultations.slice(0, 5);

    return {
        totalCommission,
        pendingLabsCount,
        percentGoal,
        remainingGoal,
        sommerschieldTotal,
        baixaTotal,
        variation,
        recentConsultations
    };
  }, [consultations]);

  // Simple format for currency manual space separator
  const formatMoney = (val: number) => {
     return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const handleLogout = () => {
      if (window.confirm("Pretende terminar a sessão segura?")) {
          logout();
      }
  };

  return (
    <div className="pb-20 p-4 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">DentalCare</h1>
          <p className="text-xs text-slate-500">Dra. Shamila Modan</p>
        </div>
        <button 
            onClick={handleLogout}
            className="bg-teal-50 w-8 h-8 rounded-full flex items-center justify-center text-teal-600 font-bold border border-teal-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors group"
            title="Terminar Sessão"
        >
          <span className="group-hover:hidden">S</span>
          <LogOut size={14} className="hidden group-hover:block" />
        </button>
      </header>

      {/* Quick Action */}
      <Link to="/new-consultation" className="block w-full bg-teal-600 text-white p-4 rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 font-medium hover:bg-teal-700 transition-colors">
        <Plus size={20} />
        Nova Consulta
      </Link>

      {/* Monthly Summary & Goal */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar size={16} />
                <span>Novembro 2025</span>
            </div>
            
            {/* Variation Arrow with Tooltip */}
            <div className="relative group">
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${variation >= 0 ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {variation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Math.abs(variation)}%</span>
                  <Info size={10} className="text-current opacity-50 ml-1" />
              </div>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 z-index-50">
                   Comparação ajustada ao período: mostra quanto foi gerado até ao dia de hoje vs o mesmo período do mês anterior.
                   <div className="absolute bottom-full right-3 border-4 border-transparent border-b-slate-800"></div>
              </div>
            </div>
        </div>

        <div className="mb-6">
          <div className="text-3xl font-bold text-slate-800 mb-1">
            {formatMoney(totalCommission)}
          </div>
          
          {/* Goal Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 flex items-center gap-1">
                <Target size={12} /> Objectivo: {formatMoney(OBJETIVO_MENSAL)}
              </span>
              <span className="font-bold text-teal-600">{percentGoal}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-teal-500 h-3 rounded-full transition-all duration-1000" 
                style={{ width: `${percentGoal}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right">
              Faltam {formatMoney(remainingGoal)}
            </p>
          </div>
        </div>

        {/* Clinic Breakdown Small */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider">
              <Building2 size={10} /> Sommerschield
            </span>
            <span className="font-bold text-slate-700">{formatMoney(sommerschieldTotal)}</span>
          </div>
          <div className="flex flex-col border-l border-gray-100 pl-3">
            <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider">
              <MapIcon size={10} /> Baixa
            </span>
            <span className="font-bold text-slate-700">{formatMoney(baixaTotal)}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {pendingLabsCount > 0 && (
        <Link to="/reports" className="block bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
           <div className="bg-amber-100 p-2 rounded-full text-amber-600">
             <AlertTriangle size={20} />
           </div>
           <div className="flex-1">
             <h3 className="text-sm font-bold text-amber-800">{pendingLabsCount} custos de lab pendentes</h3>
             <p className="text-xs text-amber-600">Toque para resolver nos relatórios</p>
           </div>
           <ChevronRight size={16} className="text-amber-400" />
        </Link>
      )}

      {/* Recent Consultations */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-lg font-medium text-slate-700">Últimas Consultas</h2>
          <Link to="/reports" className="text-xs text-teal-600 font-medium">Ver todas</Link>
        </div>
        <div className="space-y-3">
           {recentConsultations.map((cons) => (
             <div key={cons.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400">#{cons.id}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{new Date(cons.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                   </div>
                   <h3 className="font-medium text-slate-800">{cons.patientName}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cons.clinic === CLINICS.SOMMERSCHIELD ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                       {cons.clinic === CLINICS.SOMMERSCHIELD ? 'Somm.' : 'Baixa'}
                     </span>
                     <p className="text-xs text-slate-400 truncate max-w-[150px]">
                        {cons.procedures.map(p => p.code).join(', ')}
                     </p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="font-bold text-teal-600 text-sm">{formatMoney(cons.doctorCommission)}</div>
                   {cons.hasPendingLab && <span className="text-[10px] text-amber-500 font-medium">Lab pendente</span>}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;