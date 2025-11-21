
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Budget, BudgetPhase, BudgetProcedure, DbPrice } from '../types';
import { ArrowLeft, Plus, Save, Trash2, ChevronDown, ChevronUp, Printer, Search, X, Loader2, AlertCircle } from 'lucide-react';
import BudgetPDF from '../components/BudgetPDF';
import ReactToPrint from 'react-to-print';

const DEFAULT_PHASES = [
  "Fase 1: Consulta e realização de exames para estudo de caso",
  "Fase 2: Montagem do aparelho fixo",
  "Fase 3: Controlos para activação e manutenção do aparelho fixo",
  "Fase 4: Remoção e confeção do aparelho de contenção"
];

// Alterado para vazio para evitar erro de carregamento de imagem no PDF
// Se tiver um URL real de logo, coloque aqui.
const LOGO_URL = ""; 

const BudgetEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients, availableProcedures, saveBudget, budgets } = useData();

  const [status, setStatus] = useState<'rascunho' | 'finalizado'>('rascunho');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [phases, setPhases] = useState<BudgetPhase[]>([]);
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Patient Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  // Print Ref
  const printComponentRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    if (id && id !== 'new') {
       const existing = budgets.find(b => b.id === id);
       if (existing) {
          setDate(existing.date);
          setSelectedPatientId(existing.patientId);
          setPatientSearchTerm(existing.patientName);
          setStatus(existing.status);
          setPhases(existing.phases);
       }
    } else {
       if (phases.length === 0) {
         setPhases(DEFAULT_PHASES.map((name, idx) => ({
            id: `phase-${idx}`,
            name: name,
            procedures: [],
            subtotal: 0
         })));
       }
    }
  }, [id, budgets]);

  // --- Logic ---

  const generateBudgetNumber = () => {
      const dateStr = date.replace(/-/g, '');
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORC-${dateStr}-${rand}`;
  };

  const calculateTotal = () => {
      return phases.reduce((sum, phase) => sum + phase.subtotal, 0);
  };

  const handleAddPhase = () => {
      const newPhase: BudgetPhase = {
          id: `phase-${Date.now()}`,
          name: "Nova Fase",
          procedures: [],
          subtotal: 0
      };
      setPhases([...phases, newPhase]);
      setActivePhaseIdx(phases.length);
  };

  const handleRemovePhase = (idx: number) => {
      const newPhases = [...phases];
      newPhases.splice(idx, 1);
      setPhases(newPhases);
  };

  const handlePhaseNameChange = (idx: number, name: string) => {
      const newPhases = [...phases];
      newPhases[idx].name = name;
      setPhases(newPhases);
  };

  const handleAddProcedureToPhase = (phaseIdx: number, dbPrice: DbPrice) => {
      const newPhases = [...phases];
      const price = dbPrice.valor_com_iva || 0;
      
      newPhases[phaseIdx].procedures.push({
          code: dbPrice.id,
          name: dbPrice.descricao,
          unitValue: price,
          quantity: 1,
          total: price
      });
      
      newPhases[phaseIdx].subtotal = newPhases[phaseIdx].procedures.reduce((sum, p) => sum + p.total, 0);
      setPhases(newPhases);
      setProcSearchTerm('');
  };

  const updateProcedure = (phaseIdx: number, procIdx: number, field: keyof BudgetProcedure, value: any) => {
      const newPhases = [...phases];
      const proc = newPhases[phaseIdx].procedures[procIdx];
      
      if (field === 'quantity') {
          const qty = Number(value);
          proc.quantity = qty;
          proc.total = proc.unitValue * qty;
      }
      
      newPhases[phaseIdx].subtotal = newPhases[phaseIdx].procedures.reduce((sum, p) => sum + p.total, 0);
      setPhases(newPhases);
  };

  const removeProcedure = (phaseIdx: number, procIdx: number) => {
      const newPhases = [...phases];
      newPhases[phaseIdx].procedures.splice(procIdx, 1);
      newPhases[phaseIdx].subtotal = newPhases[phaseIdx].procedures.reduce((sum, p) => sum + p.total, 0);
      setPhases(newPhases);
  };

  const prepareBudgetForSave = (asFinal: boolean): Budget | null => {
      if (!selectedPatientId) return null;
      const patient = patients.find(p => p.id === selectedPatientId);
      
      return {
          id: (id && id !== 'new') ? id : `temp-${Date.now()}`,
          patientId: selectedPatientId,
          patientName: patient?.name || 'Desconhecido',
          date: date,
          number: (id && id !== 'new') ? (budgets.find(b => b.id === id)?.number || generateBudgetNumber()) : generateBudgetNumber(),
          status: asFinal ? 'finalizado' : 'rascunho',
          phases: phases,
          totalValue: calculateTotal()
      };
  };

  const validate = (): boolean => {
      const errors: string[] = [];
      
      if (!selectedPatientId) {
          errors.push("Selecione um paciente.");
      }
      
      const hasProcedures = phases.some(phase => phase.procedures.length > 0);
      if (!hasProcedures) {
          errors.push("Adicione pelo menos um procedimento ao orçamento.");
      }
      
      if (!date) {
          errors.push("A data de emissão é obrigatória.");
      }

      setFormErrors(errors);
      return errors.length === 0;
  };

  const handleSaveDraft = async () => {
      if (!validate()) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
      }

      const budget = prepareBudgetForSave(false);
      if (!budget) return; // Should be caught by validate

      setIsSubmitting(true);
      try {
         await saveBudget(budget);
         navigate('/budgets');
      } catch (e) {
         alert("Erro ao guardar orçamento");
      } finally {
         setIsSubmitting(false);
      }
  };

  // Called by ReactToPrint before printing
  const handleBeforePrint = async () => {
      if (!validate()) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          throw new Error("Validation failed"); // Stops print
      }

      const budget = prepareBudgetForSave(true);
      if (!budget) {
          return Promise.reject("No patient");
      }
      
      setIsSubmitting(true);
      try {
         await saveBudget(budget);
         // We don't navigate here, we wait for afterPrint
      } catch (e) {
         alert("Erro ao guardar orçamento");
         setIsSubmitting(false);
         throw e;
      }
  };

  // Computed
  const filteredProcedures = procSearchTerm 
    ? availableProcedures.filter(p => p.id.toLowerCase().includes(procSearchTerm.toLowerCase()) || p.descricao.toLowerCase().includes(procSearchTerm.toLowerCase()))
    : [];
  
  const filteredPatients = patientSearchTerm 
      ? patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()))
      : patients;

  const currentBudgetForPrint: Budget = prepareBudgetForSave(status === 'finalizado') || {
      id: id || 'new',
      patientId: selectedPatientId,
      patientName: patients.find(p => p.id === selectedPatientId)?.name || '',
      date: date,
      number: (id && id !== 'new') ? (budgets.find(b => b.id === id)?.number || generateBudgetNumber()) : generateBudgetNumber(),
      status: 'finalizado',
      phases: phases,
      totalValue: calculateTotal()
  };

  return (
    <div className="pb-40 p-4 max-w-5xl mx-auto min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
             <button onClick={() => navigate('/budgets')} className="p-2 -ml-2 hover:bg-gray-200 rounded-full text-gray-600">
                 <ArrowLeft size={24} />
             </button>
             <div>
                 <h1 className="text-2xl font-bold text-slate-800">{id !== 'new' ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
                 <p className="text-xs text-gray-500">{status === 'rascunho' ? 'Rascunho' : 'Finalizado'}</p>
             </div>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={handleSaveDraft} 
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-bold text-slate-600 text-sm hover:bg-gray-50 flex items-center gap-2"
             >
                <Save size={16} /> Rascunho
             </button>
             
             {/* ReactToPrint Wrapper for the Finalize Button */}
             <ReactToPrint
                trigger={() => (
                    <button 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 flex items-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                        Finalizar & PDF
                    </button>
                )}
                content={() => printComponentRef.current}
                onBeforeGetContent={handleBeforePrint}
                onAfterPrint={() => navigate('/budgets')}
                documentTitle={`Orcamento_${date}_${selectedPatientId}`}
             />
         </div>
      </header>

      {/* Error Banner */}
      {formErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                <AlertCircle size={20} />
                <h3>Atenção - Dados em falta</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1 pl-1">
                {formErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                ))}
            </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Column: Info */}
         <div className="space-y-6">
             <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                 <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Dados Gerais</h3>
                 
                 <div className="space-y-4">
                     <div className="relative">
                         <label className="block text-xs font-bold text-gray-500 mb-1">Paciente</label>
                         
                         {selectedPatientId ? (
                             <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                                      {patientSearchTerm.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="text-sm font-bold text-teal-900 truncate max-w-[150px]">
                                      {patientSearchTerm}
                                   </span>
                                </div>
                                <button 
                                  onClick={() => {
                                      setSelectedPatientId('');
                                      setPatientSearchTerm('');
                                  }}
                                  className="p-1 text-teal-600 hover:bg-teal-100 rounded-full"
                                >
                                   <X size={14} />
                                </button>
                             </div>
                         ) : (
                             <div className="relative">
                                <input 
                                   type="text"
                                   value={patientSearchTerm}
                                   onChange={(e) => {
                                       setPatientSearchTerm(e.target.value);
                                       setShowPatientSuggestions(true);
                                       setSelectedPatientId('');
                                   }}
                                   onFocus={() => setShowPatientSuggestions(true)}
                                   placeholder="Pesquisar nome..."
                                   className={`w-full pl-9 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all ${formErrors.some(e => e.includes("paciente")) ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}
                                />
                                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />

                                {showPatientSuggestions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                                        {filteredPatients.length > 0 ? (
                                            filteredPatients.map(p => (
                                                <button
                                                   key={p.id}
                                                   onClick={() => {
                                                       setSelectedPatientId(p.id);
                                                       setPatientSearchTerm(p.name);
                                                       setShowPatientSuggestions(false);
                                                       // Limpa erro de paciente se existir
                                                       if (formErrors.some(e => e.includes("paciente"))) {
                                                          setFormErrors(prev => prev.filter(e => !e.includes("paciente")));
                                                       }
                                                   }}
                                                   className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                                                >
                                                   <span className="text-sm font-bold text-slate-700">{p.name}</span>
                                                   <span className="text-xs text-gray-400">{p.phone}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-xs text-gray-400 italic">
                                                Nenhum paciente encontrado.
                                            </div>
                                        )}
                                    </div>
                                )}
                             </div>
                         )}
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Data Emissão</label>
                         <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-teal-500"
                         />
                     </div>

                     <div className="pt-4 border-t border-gray-100">
                         <div className="flex justify-between items-center">
                             <span className="text-slate-600 font-medium">Total Geral</span>
                             <span className="text-xl font-bold text-teal-600">
                                 {calculateTotal().toFixed(2).replace('.', ',')} MT
                             </span>
                         </div>
                     </div>
                 </div>
             </div>
         </div>

         {/* Right Column: Phases & Procedures */}
         <div className="lg:col-span-2 space-y-4">
             {phases.map((phase, idx) => (
                 <div key={phase.id} className={`bg-white rounded-2xl border transition-all ${activePhaseIdx === idx ? 'border-teal-500 ring-1 ring-teal-500 shadow-md' : 'border-gray-200'}`}>
                     {/* Phase Header */}
                     <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-t-2xl" onClick={() => setActivePhaseIdx(activePhaseIdx === idx ? null : idx)}>
                         <div className="flex-1 mr-4">
                             {activePhaseIdx === idx ? (
                                 <input 
                                    type="text" 
                                    value={phase.name} 
                                    onChange={(e) => handlePhaseNameChange(idx, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full font-bold text-slate-800 bg-transparent border-b border-dashed border-gray-300 focus:border-teal-500 outline-none pb-1"
                                 />
                             ) : (
                                 <h3 className="font-bold text-slate-800">{phase.name}</h3>
                             )}
                         </div>
                         <div className="flex items-center gap-3">
                             <span className="text-sm font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">
                                 {phase.subtotal.toFixed(2)} MT
                             </span>
                             {activePhaseIdx === idx ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                         </div>
                     </div>

                     {/* Phase Content */}
                     {activePhaseIdx === idx && (
                         <div className="p-4 pt-0 border-t border-gray-100">
                             {/* Procedure List */}
                             <div className="space-y-2 mt-4">
                                 {phase.procedures.map((proc, pIdx) => (
                                     <div key={pIdx} className="flex items-center gap-2 text-sm py-2 border-b border-gray-50 last:border-0">
                                         <div className="flex-1">
                                             <span className="font-bold text-teal-700 mr-2">{proc.code}</span>
                                             <span className="text-slate-700">{proc.name}</span>
                                         </div>
                                         <div className="w-20">
                                             <input 
                                                type="number" 
                                                min="1"
                                                value={proc.quantity}
                                                onChange={(e) => updateProcedure(idx, pIdx, 'quantity', e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center outline-none focus:border-teal-500"
                                             />
                                         </div>
                                         <div className="w-24 text-right font-medium text-slate-600">
                                             {proc.total.toFixed(2)}
                                         </div>
                                         <button onClick={() => removeProcedure(idx, pIdx)} className="text-gray-300 hover:text-red-500 p-1">
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                 ))}
                                 {phase.procedures.length === 0 && (
                                     <div className="text-center text-gray-400 text-xs py-4 italic">
                                         Adicione procedimentos abaixo
                                     </div>
                                 )}
                             </div>

                             {/* Add Procedure Input */}
                             <div className="mt-4 relative">
                                 <div className="relative">
                                     <input 
                                        type="text" 
                                        placeholder="Adicionar procedimento (código ou nome)..."
                                        value={procSearchTerm}
                                        onChange={(e) => setProcSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                     />
                                     <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                 </div>
                                 {procSearchTerm && filteredProcedures.length > 0 && (
                                     <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                                         {filteredProcedures.map(p => (
                                             <button 
                                                key={p.id}
                                                onClick={() => handleAddProcedureToPhase(idx, p)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex justify-between border-b border-gray-50 last:border-0"
                                             >
                                                 <span><span className="font-bold text-teal-600">{p.id}</span> {p.descricao}</span>
                                                 <span className="text-gray-500">{p.valor_com_iva} MT</span>
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>
                             
                             <div className="mt-4 flex justify-end">
                                 <button onClick={() => handleRemovePhase(idx)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                     <Trash2 size={12} /> Remover Fase
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             ))}

             <button 
                onClick={handleAddPhase}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold text-sm hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
             >
                 <Plus size={18} /> Nova Fase
             </button>
         </div>
      </div>

      {/* Hidden Print Component - Rendered off-screen via absolute positioning to ensure styles are captured */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
         <BudgetPDF ref={printComponentRef} budget={currentBudgetForPrint} logoUrl={LOGO_URL} />
      </div>

    </div>
  );
};

export default BudgetEditor;
