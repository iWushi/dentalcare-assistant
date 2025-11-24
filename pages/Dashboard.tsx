import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Calendar, Target, Building2, Map as MapIcon, Info, LogOut, FlaskConical, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { OBJETIVO_MENSAL, CLINICS } from '../constants';

const Dashboard: React.FC = () => {
  const { consultations } = useData();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Datas actuais
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayStr = now.toISOString().split('T')[0];
  const todayDay = now.getDate();
  
  const { 
    totalCommission, 
    pendingLabsList,
    activeRemindersList,
    percentGoal, 
    remainingGoal, 
    sommerschieldTotal, 
    baixaTotal,
    variation,
    recentConsultations
  } = useMemo(() => {
    // Filtro Robusto para Mês Corrente
    const monthlyConsultations = consultations.filter(c => {
        if (!c.date) return false;
        const parts = c.date.split('-');
        if (parts.length < 3) return false;
        return parseInt(parts[0]) === currentYear && parseInt(parts[1]) === currentMonth;
    });
    
    const totalCommission = monthlyConsultations.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
    
    // PENDING LAB LOGIC: Consultations marked with hasPendingLab AND date >= today
    const pendingLabsList = consultations.filter(c => c.hasPendingLab && c.date >= todayStr).slice(0, 5);

    // REMINDERS LOGIC: Consultations with active reminders
    const activeRemindersList = consultations.filter(c => c.hasReminder && c.reminder).slice(0, 5);

    // Clínicas
    const sommerschieldTotal = monthlyConsultations
      .filter(c => c.clinic === CLINICS.SOMMERSCHIELD)
      .reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
      
    const baixaTotal = monthlyConsultations
      .filter(c => c.clinic === CLINICS.BAIXA)
      .reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);

    // Metas
    const percentGoal = Math.min(100, Math.round((totalCommission / OBJETIVO_MENSAL) * 100));
    const remainingGoal = Math.max(0, OBJETIVO_MENSAL - totalCommission);

    // Variação Mês Anterior (até ao dia de hoje)
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }

    const prevMonthConsultations = consultations.filter(c => {
        if (!c.date) return false;
        const parts = c.date.split('-');
        if (parts.length < 3) return false;
        const cYear = parseInt(parts[0]);
        const cMonth = parseInt(parts[1]);
        const cDay = parseInt(parts[2]);

        return cYear === prevYear && cMonth === prevMonth && cDay <= todayDay;
    });

    const prevMonthTotal = prevMonthConsultations.reduce((sum, c) => sum + (Number(c.doctorCommission) || 0), 0);
    
    let variation = 0;
    if (prevMonthTotal > 0) {
        variation = Math.round(((totalCommission - prevMonthTotal) / prevMonthTotal) * 100);
    } else if (totalCommission > 0) {
        variation = 100;
    }

    const recentConsultations = consultations.slice(0, 5);

    return {
        totalCommission,
        pendingLabsList,
        activeRemindersList,
        percentGoal,
        remainingGoal,
        sommerschieldTotal,
        baixaTotal,
        variation,
        recentConsultations
    };
  }, [consultations, currentYear, currentMonth, todayDay]);

  const formatMoney = (val: number) => {
     return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const handleLogout = () => {
      if (window.confirm("Pretende terminar a sessão segura?")) {
          logout();
      }
  };

  const handleViewConsultation = (id: string) => {
      navigate(`/consultations?search=${id}`);
  };

  return (
    <div className="pb-40 p-4 max-w-lg mx-auto space-y-6">
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

      <Link to="/new-consultation" className="block w-full bg-teal-600 text-white p-4 rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 font-medium hover:bg-teal-700 transition-colors">
        <Plus size={20} />
        Nova Consulta
      </Link>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm overflow-visible z-10 relative">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar size={16} />
                <span>Este Mês</span>
            </div>
             
            {/* TOOLTIP CONTAINER */}
            <div className="relative group cursor-help">
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${variation >= 0 ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {variation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Math.abs(variation)}%</span>
                  <Info size={10} className="text-current opacity-50 ml-1" />
              </div>

              {/* TOOLTIP CONTENT */}
              <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 rotate-45"></div>
                  <p className="font-bold text-slate-200 mb-1 uppercase tracking-wide">Variação Homóloga</p>
                  <p className="text-slate-300 leading-relaxed">
                    Compara a tua facturação de <strong>1 a {todayDay} deste mês</strong> com o mesmo período do mês passado.
                  </p>
              </div>
            </div>
        </div>

        <div className="mb-6">
          <div className="text-3xl font-bold text-slate-800 mb-1">
            {formatMoney(totalCommission)}
          </div>
          
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

      {/* ALERT CARD: Custos de laboratório pendentes */}
      {pendingLabsList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
           <div className="flex items-center gap-3 mb-3">
             <div className="bg-amber-100 p-2 rounded-full text-amber-600">
               <FlaskConical size={20} />
             </div>
             <div className="flex-1">
               <h3 className="text-sm font-bold text-amber-800">Custos de laboratório pendentes</h3>
               <p className="text-xs text-amber-600">{pendingLabsList.length} consultas a aguardar valor.</p>
             </div>
             <Link to="/consultations" className="text-xs bg-white text-amber-600 px-3 py-1 rounded-lg border border-amber-200 font-bold hover:bg-amber-50">
               Resolver
             </Link>
           </div>
           <div className="space-y-2">
               {pendingLabsList.slice(0, 3).map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => handleViewConsultation(c.id)}
                   className="w-full bg-white/60 p-2.5 rounded-lg flex justify-between items-center text-xs border border-amber-100 hover:bg-white transition-colors text-left"
                 >
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-semibold text-amber-900">{c.patientName}</span>
                     <span className="text-amber-300">•</span>
                     <span className="text-xs text-amber-600">{c.date}</span>
                   </div>
                   <ChevronRight size={14} className="text-amber-400" />
                 </button>
               ))}
           </div>
        </div>
      )}

      {/* ALERT CARD: LEMBRETES / FOLLOW-UPS */}
      {activeRemindersList.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
           <div className="flex items-center gap-3 mb-3">
             <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
               <Bell size={20} />
             </div>
             <div className="flex-1">
               <h3 className="text-sm font-bold text-indigo-800">Lembretes Activos</h3>
               <p className="text-xs text-indigo-600">{activeRemindersList.length} consultas com notas.</p>
             </div>
             <Link to="/consultations" className="text-xs bg-white text-indigo-600 px-3 py-1 rounded-lg border border-indigo-200 font-bold hover:bg-indigo-50">
               Ver
             </Link>
           </div>
           <div className="space-y-2">
               {activeRemindersList.slice(0, 3).map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => handleViewConsultation(c.id)}
                   className="w-full bg-white/60 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs border border-indigo-100 hover:bg-white transition-colors text-left"
                 >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-indigo-900">{c.patientName}</span>
                        <span className="text-indigo-300">•</span>
                        <span className="text-xs text-indigo-600">{c.date}</span>
                    </div>
                    <div className="text-xs text-indigo-700 leading-relaxed">
                        {c.reminder}
                    </div>
                 </button>
               ))}
           </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-lg font-medium text-slate-700">Últimas Consultas</h2>
          <Link to="/consultations" className="text-xs text-teal-600 font-medium flex items-center gap-0.5">
             Ver todas <ChevronRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
           {recentConsultations.map((cons) => (
             <button 
               key={cons.id} 
               onClick={() => handleViewConsultation(cons.id)}
               className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-teal-200 transition-colors text-left"
             >
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs text-gray-500 flex items-center gap-1">
                       <Calendar size={10} />
                       {new Date(cons.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                     </span>
                  </div>
                  <h3 className="font-medium text-slate-800">{cons.patientName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cons.clinic === CLINICS.SOMMERSCHIELD ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                      {cons.clinic === CLINICS.SOMMERSCHIELD ? 'Somm.' : 'Baixa'}
                    </span>
                    <p className="text-xs text-slate-400 truncate max-w-[150px]">
                       {cons.procedures.map(p => {
                          if (!p.code || p.code.length > 10) return '??';
                          return p.code;
                       }).join(', ')}
                    </p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="font-bold text-teal-600 text-sm">{formatMoney(Number(cons.doctorCommission))}</div>
                  {cons.hasPendingLab && <span className="text-[10px] text-amber-500 font-medium flex justify-end items-center gap-1"><FlaskConical size={10}/> Pendente</span>}
               </div>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;