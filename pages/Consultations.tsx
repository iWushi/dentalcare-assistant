
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Search, Calendar, Edit2, Trash2, X, Save, Filter, FlaskConical, Plus } from 'lucide-react';
import { CLINICS } from '../constants';
import { Clinic, Consultation, Procedure, DbPrice } from '../types';

const Consultations: React.FC = () => {
  const { consultations, updateConsultation, deleteConsultation, availableProcedures } = useData();
  
  // --- Filters State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  // --- Editing State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Consultation>>({});
  const [procSearchTerm, setProcSearchTerm] = useState(''); // Search inside edit
  const [isSaving, setIsSaving] = useState(false);

  // --- Helpers ---
  const formatMoney = (val: number) => {
    return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const MONTHS = [
    { value: 'all', label: 'Todos' },
    { value: '1', label: 'Jan' }, { value: '2', label: 'Fev' }, { value: '3', label: 'Mar' },
    { value: '4', label: 'Abr' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Ago' }, { value: '9', label: 'Set' },
    { value: '10', label: 'Out' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' }
  ];

  // --- Filter Logic ---
  const filteredConsultations = useMemo(() => {
    return consultations.filter(c => {
      const matchesSearch = 
        c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.id.includes(searchTerm);

      if (!matchesSearch) return false;

      if (filterMonth !== 'all' && c.date) {
         const parts = c.date.split('-');
         if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1]).toString(); // remove zero padding logic
            
            if (year !== filterYear) return false;
            if (month !== filterMonth) return false;
         }
      }

      return true;
    });
  }, [consultations, searchTerm, filterMonth, filterYear]);

  // --- Search Logic for Procedures (Inside Edit) ---
  const procedureSuggestions = useMemo(() => {
    if (!procSearchTerm) return [];
    const lower = procSearchTerm.toLowerCase();
    return availableProcedures.filter(p => 
       p.id.toLowerCase().includes(lower) || 
       p.descricao.toLowerCase().includes(lower)
    );
  }, [procSearchTerm, availableProcedures]);

  // --- Calculation Helper ---
  const calculateTotals = (procedures: Procedure[]) => {
    let total = 0;
    let comm = 0;
    procedures.forEach(p => {
        const val = p.value || 0;
        const lab = p.labCost || 0;
        total += val;
        
        // Formula: ((Total - Lab) / 1.05) * 0.40
        const base = Math.max(0, val - lab);
        comm += (base / 1.05) * 0.40;
    });
    return { total, comm };
  };

  // --- Handlers ---
  const handleEdit = (c: Consultation) => {
    setEditingId(c.id);
    setProcSearchTerm('');
    // Deep copy procedures
    const proceduresCopy = c.procedures.map(p => ({...p}));
    setEditForm({
       date: c.date,
       clinic: c.clinic,
       totalValue: c.totalValue,
       doctorCommission: c.doctorCommission,
       notes: c.notes,
       procedures: proceduresCopy
    });
  };

  const handleAddProcedure = (dbProc: DbPrice) => {
     if (!editForm.procedures) return;
     
     const isJ = dbProc.id.toUpperCase().startsWith('J');
     const newProc: Procedure = {
        code: dbProc.id,
        name: dbProc.descricao,
        value: dbProc.valor_com_iva,
        isLabPending: isJ,
        labCost: 0
     };

     const newProcs = [...editForm.procedures, newProc];
     const { total, comm } = calculateTotals(newProcs);

     setEditForm(prev => ({
        ...prev,
        procedures: newProcs,
        totalValue: total,
        doctorCommission: comm
     }));
     setProcSearchTerm('');
  };

  const handleRemoveProcedure = (index: number) => {
     if (!editForm.procedures) return;
     const newProcs = [...editForm.procedures];
     newProcs.splice(index, 1);
     
     const { total, comm } = calculateTotals(newProcs);
     setEditForm(prev => ({
        ...prev,
        procedures: newProcs,
        totalValue: total,
        doctorCommission: comm
     }));
  };

  const updateProcedureInEdit = (idx: number, updatedProc: Procedure) => {
      if (!editForm.procedures) return;
      const newProcs = [...editForm.procedures];
      newProcs[idx] = updatedProc;

      const { total, comm } = calculateTotals(newProcs);

      setEditForm(prev => ({
          ...prev,
          procedures: newProcs,
          totalValue: total,
          doctorCommission: comm
      }));
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;
    setIsSaving(true);
    try {
       const hasPending = editForm.procedures?.some(p => p.isLabPending && (!p.labCost || p.labCost === 0));
       
       await updateConsultation(editingId, {
           ...editForm,
           hasPendingLab: hasPending
       });
       setEditingId(null);
    } catch (e) {
       console.error(e);
    } finally {
       setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem a certeza que deseja apagar esta consulta? Esta acção é irreversível.")) {
        await deleteConsultation(id);
    }
  };

  return (
    <div className="pb-32 p-4 max-w-4xl mx-auto min-h-screen bg-gray-50">
       <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Consultas</h1>
          <p className="text-sm text-gray-500">Editar, apagar e corrigir registos</p>
       </header>

       {/* Filters */}
       <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Pesquisar Paciente ou ID..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-teal-500 outline-none"
             />
          </div>
          
          <div className="flex gap-2">
             <select 
               value={filterMonth} 
               onChange={e => setFilterMonth(e.target.value)}
               className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium text-slate-700 outline-none"
             >
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
             </select>
             <select 
               value={filterYear} 
               onChange={e => setFilterYear(e.target.value)}
               className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium text-slate-700 outline-none"
             >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
             </select>
          </div>
       </div>

       {/* Table / List */}
       <div className="space-y-4">
          {filteredConsultations.length === 0 ? (
             <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <Filter className="mx-auto mb-2 opacity-20" size={32} />
                Nenhuma consulta encontrada com estes filtros.
             </div>
          ) : (
             filteredConsultations.map(cons => (
                <div key={cons.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible transition-all hover:shadow-md">
                   {editingId === cons.id ? (
                      // --- EDIT MODE ---
                      <div className="p-4 bg-teal-50/30 border-2 border-teal-500 rounded-xl">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-teal-800 flex items-center gap-2">
                               <Edit2 size={16} /> Editando #{cons.id}
                            </h3>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
                               <input 
                                 type="date" 
                                 value={editForm.date || ''} 
                                 onChange={e => setEditForm({...editForm, date: e.target.value})}
                                 className="w-full p-2 border rounded-lg mt-1"
                               />
                            </div>
                            <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Clínica</label>
                               <select 
                                 value={editForm.clinic} 
                                 onChange={e => setEditForm({...editForm, clinic: e.target.value as Clinic})}
                                 className="w-full p-2 border rounded-lg mt-1"
                               >
                                  <option value={CLINICS.SOMMERSCHIELD}>Sommerschield</option>
                                  <option value={CLINICS.BAIXA}>Baixa</option>
                               </select>
                            </div>
                         </div>

                         {/* PROCEDURE SEARCH */}
                         <div className="mb-4 relative">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Adicionar Procedimento</label>
                            <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="Digite o código (ex: A2) ou nome..." 
                                  value={procSearchTerm}
                                  onChange={(e) => setProcSearchTerm(e.target.value)}
                                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                                />
                                <Plus size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-500" />
                            </div>
                            
                            {/* Sugestões Dropdown */}
                            {procedureSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                   {procedureSuggestions.map(p => (
                                     <button
                                       key={p.id}
                                       onClick={() => handleAddProcedure(p)}
                                       className="w-full text-left px-4 py-2 hover:bg-teal-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                                     >
                                        <div>
                                           <span className="font-bold text-teal-600 mr-2">{p.id}</span>
                                           <span className="text-sm text-slate-700">{p.descricao}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">{formatMoney(p.valor_com_iva)} MT</span>
                                     </button>
                                   ))}
                                </div>
                            )}
                         </div>

                         <div className="mb-4 space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase">Procedimentos e Custos</label>
                            {editForm.procedures?.map((proc, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                                    <button 
                                        onClick={() => handleRemoveProcedure(idx)}
                                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"
                                        title="Remover procedimento"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="flex justify-between mb-2 pr-6">
                                        <span className="font-bold text-sm">{proc.code}</span>
                                        <span className="text-xs text-gray-500">{proc.name}</span>
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-400">Valor</label>
                                            {/* Read-Only Value Display */}
                                            <div className="w-full p-1.5 bg-gray-50 border border-transparent rounded text-sm font-bold text-slate-600 cursor-not-allowed">
                                                {formatMoney(proc.value)} MT
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border border-gray-200">
                                             <label className="text-[10px] text-gray-500 flex items-center gap-1 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={proc.isLabPending || false}
                                                    onChange={(e) => updateProcedureInEdit(idx, {
                                                        ...proc, 
                                                        isLabPending: e.target.checked,
                                                        labCost: e.target.checked ? (proc.labCost || 0) : 0
                                                    })}
                                                />
                                                Lab?
                                             </label>
                                             {proc.isLabPending && (
                                                 <div className="flex items-center">
                                                     <input 
                                                        type="number"
                                                        placeholder="0"
                                                        value={proc.labCost || ''}
                                                        onChange={(e) => updateProcedureInEdit(idx, {...proc, labCost: Number(e.target.value)})}
                                                        className="w-20 p-1 text-right text-sm border rounded-l outline-none font-bold text-slate-700"
                                                     />
                                                     <span className="bg-gray-100 border border-l-0 rounded-r px-1 text-[10px] text-gray-500 h-[26px] flex items-center">MT</span>
                                                 </div>
                                             )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </div>
                         
                         <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-teal-100 mb-4">
                            <div>
                               <div className="text-xs text-gray-500">Valor Total</div>
                               <div className="font-bold">{formatMoney(editForm.totalValue || 0)} MT</div>
                            </div>
                            <div className="text-right">
                               <div className="text-xs text-gray-500">Nova Comissão</div>
                               <div className="font-bold text-teal-600 text-lg">{formatMoney(editForm.doctorCommission || 0)} MT</div>
                            </div>
                         </div>
                         
                         <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button 
                              onClick={handleSave} 
                              disabled={isSaving}
                              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700"
                            >
                               <Save size={16} /> {isSaving ? 'A guardar...' : 'Guardar Alterações'}
                            </button>
                         </div>
                      </div>
                   ) : (
                      // --- VIEW MODE ---
                      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                               <Calendar size={12} />
                               {cons.date}
                               <span className={`px-1.5 rounded ${cons.clinic === CLINICS.SOMMERSCHIELD ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {cons.clinic}
                               </span>
                            </div>
                            <h3 className="font-bold text-slate-800">{cons.patientName}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                               {cons.procedures.map((p, idx) => (
                                   <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                       {p.code}
                                       {p.isLabPending && (
                                           <FlaskConical size={8} className={(!p.labCost || p.labCost === 0) ? "text-red-500" : "text-teal-500"} />
                                       )}
                                   </span>
                               ))}
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                            <div className="text-right">
                               <div className="text-xs text-gray-400">Comissão</div>
                               <div className="font-bold text-teal-600">{formatMoney(cons.doctorCommission)} MT</div>
                            </div>
                            
                            <div className="flex gap-1">
                               <button 
                                 onClick={() => handleEdit(cons)} 
                                 className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                 title="Editar"
                               >
                                  <Edit2 size={18} />
                               </button>
                               <button 
                                 onClick={() => handleDelete(cons.id)}
                                 className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                 title="Apagar"
                               >
                                  <Trash2 size={18} />
                               </button>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             ))
          )}
       </div>
    </div>
  );
};

export default Consultations;
