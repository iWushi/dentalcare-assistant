import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Search, Save, UserPlus, Calendar, X, ChevronDown } from 'lucide-react';
import { PROCEDURE_CATEGORIES, CLINICS } from '../constants';
import { Procedure, Consultation, Clinic } from '../types';

// Helper for local date string YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Função manual para forçar espaço como separador de milhar (PT-PT/MZ standard visual)
const formatMoney = (val: number) => {
  return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
};

// Flatten categories for easy search
const ALL_PROCEDURES = PROCEDURE_CATEGORIES.flatMap(cat => {
  const codes: {code: string, name: string, value: number}[] = [];
  
  // Populate sample codes based on category
  if (cat.code === 'A') {
      codes.push({code: 'A2', name: 'Consulta Programada', value: 2000});
      codes.push({code: 'A3', name: 'Consulta Controle', value: 1500});
      codes.push({code: 'A9', name: 'Domicílio', value: 5250});
  } else if (cat.code === 'B') {
      codes.push({code: 'B1', name: 'Trat. hemorragia bucal', value: 2000});
  } else if (cat.code === 'C') {
      codes.push({code: 'C1', name: 'Radiografia Periapical', value: 550});
  } else if (cat.code === 'D') {
      codes.push({code: 'D1', name: 'Destartarização Profilaxia', value: 2700});
  } else if (cat.code === 'F') {
      codes.push({code: 'F2', name: 'Endo Incisivo/Canino', value: 5200});
  } else if (cat.code === 'G') {
      codes.push({code: 'G15', name: 'Facetas resina', value: 7500});
  } else if (cat.code === 'I') {
      codes.push({code: 'I1', name: 'Extração uniradicular', value: 2800});
  } else if (cat.code === 'J') {
      codes.push({code: 'J-PA1', name: 'Prótese acrílica 1d', value: 14800});
      codes.push({code: 'J-MA', name: 'Moldes Alginato', value: 3250});
      codes.push({code: 'J-GB', name: 'Goteira bruxismo', value: 10500});
  } else if (cat.code === 'K') {
      codes.push({code: 'K1', name: 'Controle Aparelho', value: 3750});
  }
  
  return codes.map(p => ({...p, category: cat.code, commission: cat.commission}));
});

const NewConsultation: React.FC = () => {
  const { patients, addConsultation, addPatient, consultations } = useData();
  
  // --- Refs for Focus Management ---
  const procedureInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);

  // --- Form State ---
  const [date, setDate] = useState(getTodayStr());
  const [clinic, setClinic] = useState<Clinic>(CLINICS.SOMMERSCHIELD);
  const [patientInput, setPatientInput] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{id: string, name: string} | null>(null);
  const [procedureInput, setProcedureInput] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<Procedure[]>([]);
  const [notes, setNotes] = useState('');
  
  // --- UI State ---
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState<{id: string, value: number} | null>(null);

  // --- Calculations ---
  const calculateCommission = (proc: Procedure) => {
    const commissionRate = proc.code.startsWith('K') ? 0.65 : 0.40;
    const baseValue = proc.value - (proc.labCost || 0);
    const valueWithoutIva = baseValue / 1.05;
    return valueWithoutIva * commissionRate;
  };

  const totals = useMemo(() => {
    let totalGross = 0;
    let totalCommission = 0;
    
    selectedProcedures.forEach(p => {
      totalGross += p.value;
      totalCommission += calculateCommission(p);
    });

    return { totalGross, totalCommission };
  }, [selectedProcedures]);

  // --- Top Used Codes Logic ---
  const topProcedures = useMemo(() => {
    const counts: Record<string, number> = {};
    consultations.forEach(c => {
        c.procedures.forEach(p => {
            counts[p.code] = (counts[p.code] || 0) + 1;
        });
    });

    const sortedCodes = Object.entries(counts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([code]) => code)
        .slice(0, 5);

    return sortedCodes
        .map(code => ALL_PROCEDURES.find(p => p.code === code))
        .filter((p): p is typeof ALL_PROCEDURES[0] => !!p);
  }, [consultations]);

  // --- Handlers ---

  const handlePatientSelect = (patient: {id: string, name: string}) => {
    setSelectedPatient(patient);
    setPatientInput(patient.name);
    // Move focus to procedure input for smooth mobile workflow
    setTimeout(() => procedureInputRef.current?.focus(), 100);
  };

  const handleCreatePatient = () => {
    if (!newPatientName) return;
    const newP = {
      id: `p-${Date.now()}`,
      name: newPatientName,
      phone: newPatientPhone,
      notes: '',
      createdAt: new Date()
    };
    addPatient(newP);
    setSelectedPatient(newP);
    setPatientInput(newP.name);
    setShowPatientModal(false);
    setNewPatientName('');
    setNewPatientPhone('');
    // Move focus to procedure input
    setTimeout(() => procedureInputRef.current?.focus(), 100);
  };

  const handleAddProcedure = (procTemplate: any) => {
    const newProc: Procedure = {
      code: procTemplate.code,
      name: procTemplate.name,
      value: procTemplate.value,
      labCost: 0,
      isLabPending: false
    };
    setSelectedProcedures([...selectedProcedures, newProc]);
    setProcedureInput('');
    // Keep focus to allow adding multiple procedures rapidly
    setTimeout(() => procedureInputRef.current?.focus(), 50);
  };

  const handleRemoveProcedure = (index: number) => {
    const newProcs = [...selectedProcedures];
    newProcs.splice(index, 1);
    setSelectedProcedures(newProcs);
  };

  const updateProcedureLab = (index: number, hasLab: boolean) => {
    const newProcs = [...selectedProcedures];
    newProcs[index].isLabPending = hasLab;
    if (!hasLab) newProcs[index].labCost = 0;
    setSelectedProcedures(newProcs);
  };

  const updateProcedureLabCost = (index: number, cost: string) => {
    const newProcs = [...selectedProcedures];
    newProcs[index].labCost = Number(cost);
    setSelectedProcedures(newProcs);
  };

  // Allow pressing Enter on empty procedure input to jump to notes
  const handleProcedureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !procedureInput && selectedProcedures.length > 0) {
        e.preventDefault();
        notesInputRef.current?.focus();
    }
  };

  const handleSubmit = () => {
    if (!selectedPatient || selectedProcedures.length === 0) return;

    // Generate Timestamp: AAAA-MM-DD HH:MM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hour}:${minute}`;

    const newConsultation: Consultation = {
      id: `2025-${Math.floor(Math.random() * 10000)}`,
      date,
      createdAt: timestamp, // Guardar hora exacta
      clinic,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      procedures: selectedProcedures,
      totalValue: totals.totalGross,
      doctorCommission: totals.totalCommission,
      hasPendingLab: selectedProcedures.some(p => p.isLabPending && (p.labCost === 0 || p.labCost === undefined))
    };

    addConsultation(newConsultation);
    setSubmissionSuccess({ id: newConsultation.id, value: newConsultation.doctorCommission });
  };

  const handleReset = () => {
    setDate(getTodayStr());
    setClinic(CLINICS.SOMMERSCHIELD);
    setSelectedPatient(null);
    setPatientInput('');
    setSelectedProcedures([]);
    setNotes('');
    setSubmissionSuccess(null);
  };

  // --- Autocomplete Lists ---
  const patientSuggestions = patientInput.length > 0 && !selectedPatient
    ? patients.filter(p => p.name.toLowerCase().includes(patientInput.toLowerCase()))
    : [];

  const procedureSuggestions = procedureInput.length > 0 
    ? ALL_PROCEDURES.filter(p => 
        p.code.toLowerCase().includes(procedureInput.toLowerCase()) || 
        p.name.toLowerCase().includes(procedureInput.toLowerCase())
      )
    : [];

  // --- Render Success State ---
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-teal-600 flex items-center justify-center p-6 pb-safe">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Save className="text-teal-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Consulta Registada!</h2>
          <p className="text-slate-500 mb-6">Os dados foram guardados com sucesso.</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">ID</span>
              <span className="font-mono font-bold text-slate-700">#{submissionSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tua Comissão</span>
              <span className="font-bold text-teal-600">{formatMoney(submissionSuccess.value)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleReset}
              className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 min-h-[50px]"
            >
              <Plus size={20} /> Nova Consulta
            </button>
            <Link 
              to="/"
              className="w-full bg-white text-slate-600 font-bold py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors block min-h-[50px] flex items-center justify-center"
            >
              Ver Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Form ---
  return (
    <div className="pb-48 bg-gray-50 min-h-screen">
      {/* Header - Sticky with Blur */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-4 py-3 flex items-center gap-3 pt-safe">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-semibold text-lg text-slate-800">Nova Consulta</h1>
      </header>

      <div className="p-4 max-w-xl mx-auto space-y-6">
        
        {/* 1. Basic Info - Vertical Stack for Mobile */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
           <div className="flex flex-col gap-4">
             <div>
               <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Data</label>
               <div className="relative">
                 <input 
                   type="date"
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
                 />
               </div>
             </div>
             <div>
               <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Clínica</label>
               <div className="relative">
                  <select 
                    value={clinic}
                    onChange={(e) => setClinic(e.target.value as Clinic)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
                  >
                    <option value={CLINICS.SOMMERSCHIELD}>Sommerschield</option>
                    <option value={CLINICS.BAIXA}>Baixa</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-4 text-gray-400 pointer-events-none" size={16} />
               </div>
             </div>
           </div>
        </div>

        {/* 2. Patient Selection */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Paciente</label>
              {!selectedPatient && (
                <button onClick={() => setShowPatientModal(true)} className="text-xs text-teal-600 font-bold flex items-center gap-1 px-3 py-1.5 bg-teal-50 rounded-lg hover:bg-teal-100 active:scale-95 transition-transform">
                  <UserPlus size={16} /> Novo
                </button>
              )}
           </div>
           
           <div className="relative">
              {selectedPatient ? (
                <div className="flex items-center justify-between bg-teal-50 border border-teal-100 p-3 rounded-xl animate-in fade-in">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div>
                         <span className="font-bold text-teal-900 block text-base">{selectedPatient.name}</span>
                         <span className="text-xs text-teal-600">Seleccionado</span>
                      </div>
                   </div>
                   <button 
                     onClick={() => {
                       setSelectedPatient(null);
                       setPatientInput('');
                       setTimeout(() => patientInputRef.current?.focus(), 100);
                     }}
                     className="p-3 text-teal-600 hover:bg-teal-100 rounded-xl active:scale-90 transition-transform"
                     aria-label="Remover paciente"
                   >
                     <X size={20} />
                   </button>
                </div>
              ) : (
                <div className="relative">
                   <input
                     ref={patientInputRef}
                     type="text"
                     value={patientInput}
                     onChange={(e) => setPatientInput(e.target.value)}
                     placeholder="Nome do paciente..."
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-gray-400"
                   />
                   <Search className="absolute left-3.5 top-4 text-gray-400 w-5 h-5" />
                   
                   {/* Suggestions */}
                   {patientSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                        {patientSuggestions.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handlePatientSelect(p)}
                            className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 active:bg-gray-100 transition-colors"
                          >
                            <div className="font-bold text-slate-700 text-base">{p.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{p.phone}</div>
                          </button>
                        ))}
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>

        {/* 3. Procedures */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
           <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Procedimentos</label>
           
           {/* Add Input */}
           <div className="relative mb-2">
              <input
                ref={procedureInputRef}
                type="text"
                value={procedureInput}
                onChange={(e) => setProcedureInput(e.target.value)}
                onKeyDown={handleProcedureKeyDown}
                placeholder="Código ou nome (ex: A2)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-gray-400"
              />
              <Plus className="absolute left-3.5 top-4 text-gray-400 w-5 h-5" />
              
              {/* Suggestions */}
              {procedureSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                   {procedureSuggestions.map((p, idx) => (
                     <button
                       key={`${p.code}-${idx}`}
                       onClick={() => handleAddProcedure(p)}
                       className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center active:bg-gray-100 transition-colors"
                     >
                       <div>
                         <span className="font-bold text-teal-600 mr-2 text-base">{p.code}</span>
                         <span className="text-slate-700 text-base">{p.name}</span>
                       </div>
                       <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{formatMoney(p.value)}</div>
                     </button>
                   ))}
                </div>
              )}
           </div>

           {/* Top Used Codes (Dynamic List) */}
           {topProcedures.length > 0 && (
             <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
               {topProcedures.map(proc => (
                 <button
                   key={proc.code}
                   onClick={() => handleAddProcedure(proc)}
                   className="text-xs font-semibold text-slate-600 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-200 active:scale-95 transition-all"
                 >
                   + {proc.code}
                 </button>
               ))}
             </div>
           )}

           {/* List */}
           <div className="space-y-3">
              {selectedProcedures.map((proc, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative animate-in slide-in-from-left-2 duration-200">
                   <div className="flex justify-between items-start pr-8">
                      <div>
                        <span className="text-xs font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-slate-500 mr-2">
                          {proc.code}
                        </span>
                        <span className="text-base font-medium text-slate-700">{proc.name}</span>
                        <div className="text-sm text-gray-400 mt-0.5">{formatMoney(proc.value)}</div>
                      </div>
                      <button 
                        onClick={() => handleRemoveProcedure(idx)} 
                        className="absolute -right-1 -top-1 p-4 text-gray-300 hover:text-red-500 transition-colors active:scale-90"
                        aria-label="Remover procedimento"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                   
                   {/* Lab Toggle - Larger Hit Area */}
                   <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                      <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer py-1 select-none">
                        <input 
                          type="checkbox" 
                          checked={proc.isLabPending}
                          onChange={(e) => updateProcedureLab(idx, e.target.checked)}
                          className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300" 
                        />
                        Requer Laboratório
                      </label>
                      
                      {proc.isLabPending && (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-gray-400">Custo:</span>
                          <input 
                            type="tel" 
                            inputMode="numeric"
                            placeholder="0"
                            value={proc.labCost || ''}
                            onChange={(e) => updateProcedureLabCost(idx, e.target.value)}
                            className="w-24 bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-right focus:border-teal-500 outline-none"
                          />
                          <span className="text-xs text-gray-400">MT</span>
                        </div>
                      )}
                   </div>
                </div>
              ))}
              
              {selectedProcedures.length === 0 && (
                <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                  Nenhum procedimento adicionado
                </div>
              )}
           </div>
        </div>

        {/* 4. Summary & Notes */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
           <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Notas (Opcional)</label>
           <textarea
             ref={notesInputRef}
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             rows={2}
             className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
           />

           <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Valor Bruto</span>
                 <span className="font-medium text-slate-700">{formatMoney(totals.totalGross)}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">IVA (5%)</span>
                 <span className="text-gray-400">Incluso</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                 <span className="font-bold text-slate-800">Tua Comissão Estimada</span>
                 <span className="text-2xl font-bold text-teal-600">{formatMoney(totals.totalCommission)}</span>
              </div>
           </div>
        </div>

      </div>

      {/* Fixed Bottom Button (iPhone optimized) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto">
            <button
            onClick={handleSubmit}
            disabled={!selectedPatient || selectedProcedures.length === 0}
            className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-800/20 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
            <Save size={22} />
            Registar Consulta
            </button>
        </div>
      </div>

      {/* New Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-xl text-slate-800 mb-6">Novo Paciente</h3>
              <div className="space-y-4 mb-6">
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Nome Completo</label>
                   <input 
                     autoFocus
                     type="text"
                     value={newPatientName}
                     onChange={(e) => setNewPatientName(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Telefone</label>
                   <input 
                     type="tel"
                     inputMode="tel"
                     value={newPatientPhone}
                     onChange={(e) => setNewPatientPhone(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base"
                   />
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowPatientModal(false)} className="flex-1 py-3.5 text-slate-500 font-medium hover:bg-gray-50 rounded-xl text-base">Cancelar</button>
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
    </div>
  );
};

export default NewConsultation;