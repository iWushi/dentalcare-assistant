
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Search, UserPlus, ChevronRight, User, X, ShieldAlert, Trash2, Merge } from 'lucide-react';
import { Link } from 'react-router-dom';

type SortType = 'name' | 'income' | 'count';

const Patients: React.FC = () => {
  const { patients, getConsultationsByPatient, addPatient, deletePatient, mergePatients, budgets } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState<SortType>('name');
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  
  // Create Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('+258 ');

  // Manage Data State
  const [manageTab, setManageTab] = useState<'ghosts' | 'duplicates'>('ghosts');

  const formatMoney = (val: number) => {
     return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  // --- Derived Data ---

  const patientsWithStats = useMemo(() => {
    return patients.map(p => {
        const history = getConsultationsByPatient(p.id);
        const totalSpent = history.reduce((sum, c) => sum + c.totalValue, 0);
        const hasBudgets = budgets && budgets.some(b => b.patientId === p.id);
        return { ...p, historyCount: history.length, totalSpent, hasBudgets };
    });
  }, [patients, getConsultationsByPatient, budgets]);

  const filteredAndSortedPatients = useMemo(() => {
    return [...patientsWithStats]
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.phone.includes(searchTerm)
      )
      .sort((a, b) => {
          if (sortType === 'name') {
              const nameA = a.name ? a.name.trim().toLowerCase() : '';
              const nameB = b.name ? b.name.trim().toLowerCase() : '';
              return nameA.localeCompare(nameB);
          }
          if (sortType === 'income') return b.totalSpent - a.totalSpent;
          if (sortType === 'count') return b.historyCount - a.historyCount;
          return 0;
      });
  }, [patientsWithStats, searchTerm, sortType]);

  // --- Management Logic ---
  
  const ghostPatients = useMemo(() => {
      return patientsWithStats.filter(p => p.historyCount === 0 && !p.hasBudgets);
  }, [patientsWithStats]);

  const duplicateGroups = useMemo(() => {
      const groups: Record<string, typeof patientsWithStats> = {};
      patientsWithStats.forEach(p => {
          const normalized = p.name.trim().toLowerCase();
          if (!groups[normalized]) groups[normalized] = [];
          groups[normalized].push(p);
      });
      // Return only entries with > 1 patient
      return Object.values(groups).filter(group => group.length > 1);
  }, [patientsWithStats]);

  // --- Handlers ---

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.length < 4 && !val.startsWith('+258')) {
        setNewPatientPhone('+258 ');
        return;
    }
    const rawInput = val.replace(/[^\d+]/g, '');
    let digits = rawInput.replace(/^\+258/, '');
    let formatted = '+258 ';
    if (digits.length > 0) formatted += digits.substring(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.substring(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.substring(5, 9);
    setNewPatientPhone(formatted);
  };

  const handleCreatePatient = () => {
    if (!newPatientName) return;
    const newP = {
      id: `p-${Date.now()}`,
      name: newPatientName,
      phone: newPatientPhone.trim(),
      notes: '',
      createdAt: new Date()
    };
    addPatient(newP);
    setShowCreateModal(false);
    setNewPatientName('');
    setNewPatientPhone('+258 ');
  };

  const handleDeleteGhost = async (id: string) => {
      if (window.confirm("Apagar este paciente sem histórico?")) {
          await deletePatient(id);
      }
  };

  const handleDeleteAllGhosts = async () => {
      if (window.confirm(`Tem a certeza que deseja apagar todos os ${ghostPatients.length} pacientes sem histórico?`)) {
          let successCount = 0;
          let errorCount = 0;
          for (const p of ghostPatients) {
              try {
                  await deletePatient(p.id);
                  successCount++;
              } catch (e) {
                  console.error("Failed to delete ghost patient", p.id, e);
                  errorCount++;
              }
          }
          if (errorCount > 0) {
              alert(`Apagados ${successCount} pacientes. Não foi possível apagar ${errorCount} pacientes (podem ter dados associados).`);
          }
      }
  };

  const handleMerge = async (targetId: string, sourceId: string) => {
      if (window.confirm("Tem a certeza? O paciente duplicado será apagado e as suas consultas movidas para o principal.")) {
          await mergePatients(targetId, sourceId);
      }
  };

  return (
    <div className="pb-40 p-4 max-w-3xl mx-auto min-h-screen">
       <div className="flex justify-between items-center mb-6">
        <div>
             <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
             <p className="text-xs text-gray-400">{patients.length} registados</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setShowManageModal(true)}
              className="bg-white text-amber-600 border border-amber-200 p-2.5 rounded-xl shadow-sm hover:bg-amber-50 active:scale-95 transition-all"
              title="Gestão de Dados"
            >
               <ShieldAlert size={20} />
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 text-white px-3 py-2.5 rounded-xl shadow-sm hover:bg-teal-700 flex items-center gap-2 active:scale-95 transition-transform"
            >
               <UserPlus size={18} />
               <span className="text-sm font-bold hidden sm:inline">Novo</span>
            </button>
        </div>
       </div>

       {/* Search */}
       <div className="relative mb-4">
         <input 
           type="text" 
           placeholder="Buscar por nome ou telefone..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
         />
         <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
       </div>

       {/* Filters / Sort */}
       <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          <button 
             onClick={() => setSortType('name')}
             className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${sortType === 'name' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
             A→Z
          </button>
          <button 
             onClick={() => setSortType('income')}
             className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${sortType === 'income' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
             Rendimento
          </button>
          <button 
             onClick={() => setSortType('count')}
             className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${sortType === 'count' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
             Consultas
          </button>
       </div>

       {/* List */}
       <div className="space-y-4">
         {filteredAndSortedPatients.map(patient => (
            <Link key={patient.id} to={`/patients/${patient.id}`} className="block bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-teal-200 transition-colors">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {patient.name.charAt(0)}
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800">{patient.name}</h3>
                        <p className="text-xs text-gray-500">{patient.phone}</p>
                     </div>
                  </div>
                  <ChevronRight className="text-gray-300 w-5 h-5" />
               </div>
               <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs">
                  <div className="text-gray-500">
                     <strong className="text-slate-700">{patient.historyCount}</strong> consultas
                  </div>
                  <div className="text-gray-500">
                     Total: <strong className="text-slate-700">{formatMoney(patient.totalSpent)}</strong>
                  </div>
               </div>
            </Link>
         ))}
         {filteredAndSortedPatients.length === 0 && (
             <div className="text-center py-10 text-gray-400 text-sm">Nenhum paciente encontrado.</div>
         )}
       </div>

       {/* Create Patient Modal */}
       {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Novo Paciente</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Nome Completo</label>
                   <input 
                     autoFocus
                     type="text"
                     value={newPatientName}
                     onChange={(e) => setNewPatientName(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base focus:ring-2 focus:ring-teal-500 outline-none"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Telefone (Moçambique)</label>
                   <input 
                     type="tel"
                     inputMode="tel"
                     value={newPatientPhone}
                     onChange={handlePhoneChange}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                   />
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3.5 text-slate-500 font-medium hover:bg-gray-50 rounded-xl text-base">Cancelar</button>
                 <button 
                   onClick={handleCreatePatient}
                   disabled={!newPatientName}
                   className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 text-base shadow-lg shadow-teal-600/20"
                 >
                   Criar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Data Management Modal */}
      {showManageModal && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <div>
                      <h3 className="font-bold text-xl text-slate-800">Gestão de Dados</h3>
                      <p className="text-xs text-gray-400">Limpeza e correcção de registos</p>
                   </div>
                   <button onClick={() => setShowManageModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                      <X size={20} />
                   </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-gray-50 border-b border-gray-100">
                   <button 
                     onClick={() => setManageTab('ghosts')}
                     className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${manageTab === 'ghosts' ? 'bg-white shadow text-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
                   >
                      Fantasmas ({ghostPatients.length})
                   </button>
                   <button 
                     onClick={() => setManageTab('duplicates')}
                     className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${manageTab === 'duplicates' ? 'bg-white shadow text-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
                   >
                      Duplicados ({duplicateGroups.length})
                   </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                   {manageTab === 'ghosts' ? (
                      <div className="space-y-3">
                         {ghostPatients.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">Tudo limpo! Sem pacientes vazios.</div>}
                         {ghostPatients.length > 0 && (
                            <div className="flex justify-end mb-2">
                               <button 
                                 onClick={handleDeleteAllGhosts}
                                 className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-1"
                               >
                                  <Trash2 size={14} /> Limpar Todos ({ghostPatients.length})
                               </button>
                            </div>
                         )}
                         {ghostPatients.map(p => (
                            <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                               <div>
                                  <div className="font-bold text-slate-700">{p.name}</div>
                                  <div className="text-xs text-gray-400">0 consultas • Criado em {new Date(p.createdAt).toLocaleDateString()}</div>
                               </div>
                               <button 
                                 onClick={() => handleDeleteGhost(p.id)}
                                 className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="space-y-4">
                         {duplicateGroups.length === 0 && <div className="text-center text-gray-400 py-8 text-sm">Sem duplicados detectados.</div>}
                         {duplicateGroups.map((group, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                               <h4 className="text-sm font-bold text-amber-800 mb-3 uppercase tracking-wider border-b border-amber-50 pb-2">Grupo: {group[0].name}</h4>
                               <div className="space-y-2">
                                  {group.map(p => (
                                     <div key={p.id} className="flex justify-between items-center bg-amber-50/50 p-2 rounded-lg">
                                        <div>
                                           <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                                           <span className="text-xs text-gray-500 ml-2">({p.historyCount} cons. | {formatMoney(p.totalSpent)})</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Botão para MERGE: Este paciente engole os outros */}
                                            <button
                                              onClick={async () => {
                                                  if (window.confirm(`Tem a certeza? Todos os outros registos de "${p.name}" serão apagados e o seu histórico será movido para este registo.`)) {
                                                      const others = group.filter(other => other.id !== p.id);
                                                      for (const other of others) {
                                                          await mergePatients(p.id, other.id);
                                                      }
                                                  }
                                              }}
                                              className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 flex items-center gap-1"
                                            >
                                               <Merge size={14} /> Manter este (Fundir outros)
                                            </button>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default Patients;
