
import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Search, Save, UserPlus, X, ChevronDown, Ban, FlaskConical, Calendar, ArrowDown } from 'lucide-react';
import { CLINICS } from '../constants';
import { Procedure, Consultation, Clinic } from '../types';

// Helper for local date string YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (val: number) => {
  return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
};

const NewConsultation: React.FC = () => {
  const { patients, addConsultation, addPatient, consultations, availableProcedures } = useData();
  const navigate = useNavigate();
  
  const procedureInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const clinicSelectRef = useRef<HTMLSelectElement>(null);

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
  const [newPatientPhone, setNewPatientPhone] = useState('+258 ');
  const [submissionSuccess, setSubmissionSuccess] = useState<{id: string, value: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW CALCULATION LOGIC ---
  // Formula: ((Total Gross - Total Lab) / 1.05) * 0.40
  const totals = useMemo(() => {
    const totalGross = selectedProcedures.reduce((sum, p) => sum + (p.value || 0), 0);
    const totalLab = selectedProcedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
    
    const baseCalc = Math.max(0, totalGross - totalLab);
    const valueWithoutIva = baseCalc / 1.05;
    const totalCommission = valueWithoutIva * 0.40;

    return { totalGross, totalLab, totalCommission };
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

    if (sortedCodes.length === 0) {
       return availableProcedures.filter(p => ['A2', 'D1', 'C1'].includes(p.id)).map(p => ({
         code: p.id,
         name: p.descricao,
         value: p.valor_com_iva
       }));
    }

    return sortedCodes
        .map(code => availableProcedures.find(p => p.id === code))
        .filter(p => !!p)
        .map(p => ({
           code: p!.id,
           name: p!.descricao,
           value: p!.valor_com_iva
        }));
  }, [consultations, availableProcedures]);

  // --- Handlers ---

  const handleSetToday = () => {
    setDate(getTodayStr());
    // Auto focus patient input directly to speed up flow
    setTimeout(() => patientInputRef.current?.focus(), 50);
  };

  const handlePatientSelect = (patient: {id: string, name: string}) => {
    setSelectedPatient(patient);
    setPatientInput(patient.name);
    // Auto focus procedure input
    setTimeout(() => procedureInputRef.current?.focus(), 100);
  };

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

  const handleCreatePatient = async () => {
    if (!newPatientName) return;
    const tempId = `temp-${Date.now()}`;
    setSelectedPatient({ id: tempId, name: newPatientName });
    setPatientInput(newPatientName);
    setShowPatientModal(false);

    const created = await addPatient({
      name: newPatientName,
      phone: newPatientPhone.trim(),
      notes: ''
    });

    if (created) {
      setSelectedPatient({ id: created.id, name: created.name });
    }

    setNewPatientName('');
    setNewPatientPhone('+258 ');
    setTimeout(() => procedureInputRef.current?.focus(), 100);
  };

  // Add from Autocomplete
  const handleAddProcedure = (dbPrice: any) => {
    const code = dbPrice.id || dbPrice.code;
    // Auto-activate Lab Toggle ONLY for 'J' codes (Prótese)
    const isLabCode = code.trim().toUpperCase().startsWith('J');

    const newProc: Procedure = {
      code: code,
      name: dbPrice.descricao || dbPrice.name,
      value: dbPrice.valor_com_iva || dbPrice.value,
      labCost: 0,
      isLabPending: isLabCode // Starts ON only for J
    };
    setSelectedProcedures([...selectedProcedures, newProc]);
    setProcedureInput('');
    // Keep focus on procedure input to allow adding multiple
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

  const updateProcedureLabCost = (index: number, costStr: string) => {
    const newProcs = [...selectedProcedures];
    const cost = parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0;
    newProcs[index].labCost = cost;
    setSelectedProcedures(newProcs);
  };

  const handleProcedureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !procedureInput && selectedProcedures.length > 0) {
        e.preventDefault();
        notesInputRef.current?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || selectedProcedures.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    const tempId = `2025-${Math.floor(Math.random() * 100000)}`;

    const newConsultation: Consultation = {
      id: tempId,
      date,
      clinic,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      procedures: selectedProcedures,
      totalValue: totals.totalGross,
      doctorCommission: totals.totalCommission,
      hasPendingLab: false, // Calculated by context
      notes: notes
    };

    await addConsultation(newConsultation);
    setSubmissionSuccess({ id: tempId, value: totals.totalCommission });
    setIsSubmitting(false);
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

  const patientSuggestions = patientInput.length > 0 && !selectedPatient
    ? patients.filter(p => p.name.toLowerCase().includes(patientInput.toLowerCase()))
    : [];

  const procedureSuggestions = procedureInput.length > 0 
    ? availableProcedures.filter(p => 
        p.id.toLowerCase().includes(procedureInput.toLowerCase()) || 
        p.descricao.toLowerCase().includes(procedureInput.toLowerCase())
      )
    : [];

  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-teal-600 flex items-center justify-center p-6 pb-safe">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Save className="text-teal-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Consulta Registada!</h2>
          <p className="text-slate-500 mb-6">Dados guardados na base de dados.</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">ID</span>
              <span className="font-mono font-bold text-slate-700">#{submissionSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Comissão Dra.</span>
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
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-4 py-3 flex items-center gap-3 pt-safe">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-semibold text-lg text-slate-800">Nova Consulta</h1>
      </header>

      <div className="p-4 max-w-xl mx-auto space-y-6">
        
        {/* 1. Basic Info */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
           <div className="flex flex-col gap-4">
             <div>
               <div className="flex justify-between items-end mb-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                  <button 
                    onClick={handleSetToday}
                    className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <Calendar size={12} />
                    HOJE
                  </button>
               </div>
               <input 
                   type="date"
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
                 />
             </div>
             <div>
               <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Clínica</label>
               <div className="relative">
                  <select 
                    ref={clinicSelectRef}
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
           
           <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                  <input
                    ref={procedureInputRef}
                    type="text"
                    value={procedureInput}
                    onChange={(e) => setProcedureInput(e.target.value)}
                    onKeyDown={handleProcedureKeyDown}
                    placeholder="Cód ou nome (ex: A2)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-gray-400"
                  />
                  <Plus className="absolute left-3 top-4 text-gray-400 w-5 h-5" />
                  
                  {procedureSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                      {procedureSuggestions.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleAddProcedure(p)}
                          className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center active:bg-gray-100 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-teal-600 mr-2 text-base">{p.id}</span>
                            <span className="text-slate-700 text-base">{p.descricao}</span>
                          </div>
                          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{formatMoney(p.valor_com_iva)}</div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Mobile Next Button to Skip to Notes */}
              <button
                onClick={() => notesInputRef.current?.focus()}
                className="bg-gray-100 text-gray-500 px-4 rounded-xl border border-gray-200 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center"
                title="Saltar para Observações"
              >
                  <ArrowDown size={20} />
              </button>
           </div>

           {topProcedures.length > 0 && (
             <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in">
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

           <div className="space-y-3">
              {selectedProcedures.map((proc, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative transition-all">
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
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                   
                   <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 text-sm text-gray-700 font-medium cursor-pointer select-none">
                            <div className={`w-10 h-6 rounded-full transition-colors relative ${proc.isLabPending ? 'bg-teal-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${proc.isLabPending ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={proc.isLabPending || false}
                                onChange={(e) => updateProcedureLab(idx, e.target.checked)}
                                className="hidden" 
                            />
                            <div className="flex flex-col">
                                <span>Requer Laboratório?</span>
                                <span className="text-[10px] text-gray-400 font-normal">Marque para indicar custo pendente</span>
                            </div>
                        </label>
                      </div>

                      {/* Input Field for Lab Cost */}
                      {proc.isLabPending && (
                        <div className="mt-3 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 bg-white border border-teal-200 rounded-lg px-3 py-2 shadow-sm">
                                <FlaskConical size={16} className="text-teal-500" />
                                <input 
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="000 000,00"
                                    value={proc.labCost ? formatMoney(proc.labCost).replace(' MT', '') : ''}
                                    onChange={(e) => updateProcedureLabCost(idx, e.target.value)}
                                    className="flex-1 outline-none text-slate-800 font-bold placeholder:font-normal"
                                />
                                <span className="text-xs font-bold text-gray-400">MT</span>
                            </div>
                            {(!proc.labCost || proc.labCost === 0) && (
                                <p className="text-[10px] text-amber-500 mt-1 pl-1 flex items-center gap-1">
                                  <FlaskConical size={10} /> 
                                  Pendente (será registado como 0 se vazio)
                                </p>
                            )}
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
           <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Observações</label>
           <textarea
             ref={notesInputRef}
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             rows={2}
             placeholder="Notas clínicas..."
             className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
           />

           <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Valor Bruto</span>
                 <span className="font-medium text-slate-700">{formatMoney(totals.totalGross)}</span>
              </div>
              {totals.totalLab > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                   <span>- Custo Laboratório</span>
                   <span className="font-medium">{formatMoney(totals.totalLab)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                 <span className="font-bold text-slate-800">Comissão (40%)</span>
                 <span className="text-2xl font-bold text-teal-600">{formatMoney(totals.totalCommission)}</span>
              </div>
              <p className="text-[10px] text-gray-400 text-right">
                *Fórmula: ((Total - Lab) / 1.05) x 0.40
              </p>
           </div>
        </div>
      </div>

      {/* BARRA FIXA DE ACÇÕES */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe z-[60] shadow-[0_-5px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-xl mx-auto flex gap-3">
           <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-50 text-slate-600 font-bold py-4 rounded-2xl border border-gray-200 hover:bg-gray-100 hover:text-red-600 transition-colors flex items-center justify-center gap-2 active:scale-98"
            >
              <Ban size={20} />
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedPatient || selectedProcedures.length === 0 || isSubmitting}
              className="flex-[2] bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-98"
            >
            {isSubmitting ? 'A guardar...' : (
                <>
                    <Save size={22} />
                    Registar Consulta
                </>
            )}
            </button>
        </div>
      </div>

      {/* New Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Novo Paciente</h3>
                <button onClick={() => setShowPatientModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
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
