import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Search, Save, UserPlus, X, ChevronDown, Ban, FlaskConical, Calendar, ArrowDown, Bell, Landmark, Wallet, AlertCircle } from 'lucide-react';
import { CLINICS, calculateProcedureCommission } from '../constants';
import { Procedure, Consultation, Clinic } from '../types';

// Procedimento no formulário, com a divisão opcional convenção/beneficiário (só usada no modo parcial)
interface FormProcedure extends Procedure {
  convencao?: number;   // parte paga agora (seguradora/convenção)
  beneficiario?: number; // parte que fica pendente
}

// Helper for local date string YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

const formatMoney = (val: number) => {
  return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
};

// Só o número (sem sufixo MT), para caber dentro de campos e da grelha da guia
const formatNum = (val: number) => formatMoney(val || 0).replace(' MT', '');

// Interpreta o que a médica escreve num campo de dinheiro (aceita "20 952,38", "20952.38", etc.)
const parseMoneyInput = (str: string): number => {
  if (!str) return 0;
  let s = String(str).replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// UUID à prova de falhas (crypto.randomUUID pode não existir em contextos não seguros)
const makeUuid = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* ignora */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  const [selectedProcedures, setSelectedProcedures] = useState<FormProcedure[]>([]);
  const [notes, setNotes] = useState('');

  // --- Reminder State ---
  const [isReminderActive, setIsReminderActive] = useState(false);
  const [reminderText, setReminderText] = useState('');

  // --- Pagamento parcial (seguro / prestações) ---
  const [isPartialActive, setIsPartialActive] = useState(false);
  const [insurer, setInsurer] = useState('');   // seguradora
  const [guia, setGuia] = useState('');          // nº da guia

  // --- UI State ---
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('+258 ');
  const [submissionSuccess, setSubmissionSuccess] = useState<{id: string, value: number, pendente?: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW CALCULATION LOGIC (Mixed Rates) ---
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalLab = 0;
    let totalCommission = 0;
    let totalConvencao = 0;
    let totalBeneficiario = 0;

    selectedProcedures.forEach(p => {
        const val = p.value || 0;
        const lab = p.labCost || 0;
        totalGross += val;
        totalLab += lab;

        const code = String(p.code || '').trim().toUpperCase();

        if (isPartialActive) {
            const conv = p.convencao ?? val;
            const benef = p.beneficiario ?? 0;
            totalConvencao += conv;
            totalBeneficiario += benef;
            // Comissão apenas sobre o que é cobrado agora (parte convenção)
            totalCommission += calculateProcedureCommission(conv, lab, code);
        } else {
            // Uses centralized logic to guarantee consistency with DB
            totalCommission += calculateProcedureCommission(val, lab, code);
        }
    });

    return {
        totalGross,
        totalLab,
        totalCommission,
        totalConvencao,
        totalBeneficiario,
        totalTratamento: totalGross,                                  // valor cheio (referência)
        totalRecebidoAgora: isPartialActive ? totalConvencao : totalGross
    };
  }, [selectedProcedures, isPartialActive]);

  // Validação do modo parcial: convenção + beneficiário tem de bater certo com o total de cada procedimento
  const splitError = useMemo(() => {
    if (!isPartialActive) return null;
    for (const p of selectedProcedures) {
        const val = p.value || 0;
        const conv = p.convencao ?? val;
        const benef = p.beneficiario ?? 0;
        const diff = round2(conv + benef - val);
        if (Math.abs(diff) > 0.01) {
            return { code: p.code, name: p.name, total: val, conv, benef, diff };
        }
    }
    return null;
  }, [isPartialActive, selectedProcedures]);

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
    const value = dbPrice.valor_com_iva || dbPrice.value;

    const newProc: FormProcedure = {
      code: code,
      name: dbPrice.descricao || dbPrice.name,
      value: value,
      labCost: 0,
      isLabPending: isLabCode, // Starts ON only for J
      // No modo parcial, por defeito tudo é pago agora (convenção); a médica move o que fica pendente
      ...(isPartialActive ? { convencao: value, beneficiario: 0 } : {})
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

  // --- Pagamento parcial: activar e dividir cada procedimento ---
  const handleTogglePartial = (active: boolean) => {
    setIsPartialActive(active);
    if (active) {
      // Por defeito, tudo é pago agora (convenção); a médica move o que fica pendente
      setSelectedProcedures(prev => prev.map(p => ({
        ...p,
        convencao: p.convencao ?? p.value,
        beneficiario: p.beneficiario ?? 0
      })));
    }
  };

  const updateConvencao = (index: number, str: string) => {
    setSelectedProcedures(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const conv = Math.min(Math.max(round2(parseMoneyInput(str)), 0), p.value);
      return { ...p, convencao: conv, beneficiario: round2(p.value - conv) };
    }));
  };

  const updateBeneficiario = (index: number, str: string) => {
    setSelectedProcedures(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const benef = Math.min(Math.max(round2(parseMoneyInput(str)), 0), p.value);
      return { ...p, beneficiario: benef, convencao: round2(p.value - benef) };
    }));
  };

  const handleProcedureKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !procedureInput && selectedProcedures.length > 0) {
        e.preventDefault();
        notesInputRef.current?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || selectedProcedures.length === 0 || isSubmitting) return;
    // Em modo parcial, não deixa gravar enquanto as contas de cada procedimento não baterem certo
    if (isPartialActive && splitError) return;
    setIsSubmitting(true);

    const tempId = `2025-${Math.floor(Math.random() * 100000)}`;

    let newConsultation: Consultation;

    if (isPartialActive) {
      const valorPendente = round2(totals.totalBeneficiario);
      // Cada procedimento guarda a parte cobrada agora (convenção) como o seu valor
      const procedures: Procedure[] = selectedProcedures.map(p => ({
        code: p.code,
        name: p.name,
        value: round2(p.convencao ?? p.value),
        labCost: p.labCost,
        isLabPending: p.isLabPending
      }));

      newConsultation = {
        id: tempId,
        date,
        clinic,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        procedures,
        totalValue: round2(totals.totalConvencao),   // dinheiro cobrado agora
        doctorCommission: totals.totalCommission,
        hasPendingLab: false,
        notes,
        reminder: isReminderActive ? reminderText : undefined,
        hasReminder: isReminderActive,
        // Pagamento parcial
        pagamentoGrupoId: makeUuid(),
        tipoPagamento: 'convencao',
        valorTratamento: round2(totals.totalTratamento),
        valorPendente,
        estadoPagamento: valorPendente > 0.005 ? 'pendente' : 'liquidado',
        seguradora: insurer.trim() || undefined,
        guiaNumero: guia.trim() || undefined
      };
    } else {
      newConsultation = {
        id: tempId,
        date,
        clinic,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        procedures: selectedProcedures,
        totalValue: totals.totalGross,
        doctorCommission: totals.totalCommission,
        hasPendingLab: false, // Calculated by context
        notes: notes,
        reminder: isReminderActive ? reminderText : undefined,
        hasReminder: isReminderActive
      };
    }

    await addConsultation(newConsultation);
    setSubmissionSuccess({
      id: tempId,
      value: totals.totalCommission,
      pendente: isPartialActive ? round2(totals.totalBeneficiario) : undefined
    });
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
    setIsReminderActive(false);
    setReminderText('');
    setIsPartialActive(false);
    setInsurer('');
    setGuia('');
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
            {submissionSuccess.pendente != null && submissionSuccess.pendente > 0 && (
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-amber-600 font-medium">Ficou pendente</span>
                <span className="font-bold text-amber-600">{formatMoney(submissionSuccess.pendente)}</span>
              </div>
            )}
          </div>

          {submissionSuccess.pendente != null && submissionSuccess.pendente > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6 text-left flex items-start gap-2">
              <Wallet size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Guardámos <strong>{formatMoney(submissionSuccess.pendente)}</strong> por receber.
                Vais encontrá-lo no ecrã <strong>Pendentes</strong> (no Início) quando a paciente pagar o resto.
              </p>
            </div>
          )}

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
               <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Data</label>
               <div className="relative">
                 <input 
                     type="date"
                     value={date}
                     onChange={(e) => setDate(e.target.value)}
                     className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none transition-colors ${date === getTodayStr() ? 'text-transparent' : 'text-slate-800'}`}
                   />
                 {date === getTodayStr() && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                        <span className="text-teal-600 font-bold flex items-center gap-2">
                           <Calendar size={18} />
                           Hoje
                        </span>
                    </div>
                 )}
               </div>
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

        {/* 3.5 Pagamento Parcial (Seguro / Prestações) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                 <Landmark size={14} />
                 Pagamento parcial (seguro / prestações)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                 <div className={`w-9 h-5 rounded-full transition-colors relative ${isPartialActive ? 'bg-teal-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isPartialActive ? 'translate-x-4' : ''}`}></div>
                 </div>
                 <input
                    type="checkbox"
                    checked={isPartialActive}
                    onChange={(e) => handleTogglePartial(e.target.checked)}
                    className="hidden"
                 />
              </label>
           </div>

           {!isPartialActive && (
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                 Liga isto quando uma parte é paga agora (pela seguradora) e o resto fica para a paciente pagar mais tarde.
              </p>
           )}

           {isPartialActive && (
             <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                {/* Seguradora + Guia */}
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Seguradora</label>
                      <input
                        type="text"
                        value={insurer}
                        onChange={(e) => setInsurer(e.target.value)}
                        placeholder="Ex: MAXIMO"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-gray-400"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nº da guia</label>
                      <input
                        type="text"
                        value={guia}
                        onChange={(e) => setGuia(e.target.value)}
                        placeholder="Ex: 1.673/SMS"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder:text-gray-400"
                      />
                   </div>
                </div>

                {selectedProcedures.length === 0 ? (
                   <div className="text-center py-6 text-gray-300 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                      Adiciona procedimentos primeiro
                   </div>
                ) : (
                  <>
                    {/* Divisão de cada procedimento: paga agora vs. fica pendente */}
                    <div className="space-y-3">
                       {selectedProcedures.map((proc, idx) => {
                          const total = proc.value || 0;
                          const conv = proc.convencao ?? total;
                          const benef = proc.beneficiario ?? 0;
                          const balanced = Math.abs(round2(conv + benef - total)) <= 0.01;
                          return (
                            <div key={idx} className={`rounded-xl p-3 border ${balanced ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'}`}>
                               <div className="flex justify-between items-baseline mb-2">
                                  <div className="min-w-0 pr-2">
                                     <span className="text-xs font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-slate-500 mr-2">{proc.code}</span>
                                     <span className="text-sm text-slate-600">{proc.name}</span>
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">Total {formatNum(total)}</span>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                  <div>
                                     <label className="text-[10px] font-bold text-teal-600 uppercase mb-1 block">Paga agora</label>
                                     <div className="flex items-center gap-1 bg-white border border-teal-200 rounded-lg px-2 py-2">
                                        <input
                                           inputMode="decimal"
                                           value={formatNum(conv)}
                                           onChange={(e) => updateConvencao(idx, e.target.value)}
                                           className="w-full outline-none text-slate-800 font-bold text-sm min-w-0"
                                        />
                                        <span className="text-[10px] font-bold text-gray-400">MT</span>
                                     </div>
                                  </div>
                                  <div>
                                     <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Fica pendente</label>
                                     <div className="flex items-center gap-1 bg-white border border-amber-200 rounded-lg px-2 py-2">
                                        <input
                                           inputMode="decimal"
                                           value={formatNum(benef)}
                                           onChange={(e) => updateBeneficiario(idx, e.target.value)}
                                           className="w-full outline-none text-slate-800 font-bold text-sm min-w-0"
                                        />
                                        <span className="text-[10px] font-bold text-gray-400">MT</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>

                    {/* Resumo no formato da guia em papel */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                       <div className="grid grid-cols-4 gap-1 text-[10px] font-bold uppercase mb-2 pb-2 border-b border-slate-200">
                          <span></span>
                          <span className="text-right text-gray-400">Total</span>
                          <span className="text-right text-teal-600">Paga agora</span>
                          <span className="text-right text-amber-600">Pendente</span>
                       </div>
                       <div className="grid grid-cols-4 gap-1 text-xs py-1">
                          <span className="text-gray-500">Sub-total</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalTratamento / 1.05)}</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalConvencao / 1.05)}</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalBeneficiario / 1.05)}</span>
                       </div>
                       <div className="grid grid-cols-4 gap-1 text-xs py-1">
                          <span className="text-gray-500">IVA 5%</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalTratamento - totals.totalTratamento / 1.05)}</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalConvencao - totals.totalConvencao / 1.05)}</span>
                          <span className="text-right text-slate-600">{formatNum(totals.totalBeneficiario - totals.totalBeneficiario / 1.05)}</span>
                       </div>
                       <div className="grid grid-cols-4 gap-1 text-sm font-bold py-2 mt-1 border-t border-slate-200">
                          <span className="text-slate-700">Total</span>
                          <span className="text-right text-slate-800">{formatNum(totals.totalTratamento)}</span>
                          <span className="text-right text-teal-600">{formatNum(totals.totalConvencao)}</span>
                          <span className="text-right text-amber-600">{formatNum(totals.totalBeneficiario)}</span>
                       </div>
                    </div>

                    {/* Aviso quando as contas não batem certo */}
                    {splitError && (
                       <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-red-700 leading-relaxed">
                             No <strong>{splitError.code}</strong>: "paga agora" mais "fica pendente" ({formatNum(splitError.conv)} + {formatNum(splitError.benef)}) tem de dar o total {formatNum(splitError.total)}.
                             {' '}{splitError.diff > 0
                               ? `Estás ${formatNum(Math.abs(splitError.diff))} MT acima.`
                               : `Faltam ${formatNum(Math.abs(splitError.diff))} MT.`}
                          </p>
                       </div>
                    )}
                  </>
                )}
             </div>
           )}
        </div>

        {/* 4. Summary & Notes (Including Reminder Toggle) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
           
           {/* Lembrete Section */}
           <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                        <Bell size={14} />
                        Definir Lembrete
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-8 h-5 rounded-full transition-colors relative ${isReminderActive ? 'bg-teal-500' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${isReminderActive ? 'translate-x-3' : ''}`}></div>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={isReminderActive} 
                            onChange={(e) => {
                                setIsReminderActive(e.target.checked);
                                if(!e.target.checked) setReminderText('');
                            }}
                            className="hidden"
                        />
                    </label>
                </div>
                
                {isReminderActive && (
                    <div className="animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Ex: Ligar para marcar controlo em 3 dias"
                            value={reminderText}
                            onChange={(e) => setReminderText(e.target.value)}
                            className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500/50 focus:outline-none placeholder:text-amber-400"
                        />
                    </div>
                )}
           </div>

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
              {isPartialActive ? (
                <>
                  <div className="flex justify-between text-sm">
                     <span className="text-gray-500">Tratamento (total)</span>
                     <span className="font-medium text-slate-700">{formatMoney(totals.totalTratamento)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-teal-600">Recebido agora</span>
                     <span className="font-medium text-teal-700">{formatMoney(totals.totalConvencao)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-amber-600">Fica pendente</span>
                     <span className="font-medium text-amber-600">{formatMoney(totals.totalBeneficiario)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Valor Bruto</span>
                   <span className="font-medium text-slate-700">{formatMoney(totals.totalGross)}</span>
                </div>
              )}
              {totals.totalLab > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                   <span>- Custo Laboratório</span>
                   <span className="font-medium">{formatMoney(totals.totalLab)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                 <span className="font-bold text-slate-800">{isPartialActive ? 'Comissão (do recebido)' : 'Comissão Estimada'}</span>
                 <span className="text-2xl font-bold text-teal-600">{formatMoney(totals.totalCommission)}</span>
              </div>
              <div className="text-[10px] text-gray-400 text-right leading-tight mt-1">
                <p className="font-medium">*Base de cálculo: ((Valor - Lab) ÷ 1.05) × Taxa</p>
                <p className="mt-0.5">Códigos <strong className="text-indigo-500">K</strong> (Ortodontia): <span className="font-bold text-slate-600">65%</span> | Restantes: <span className="font-bold text-slate-600">40%</span></p>
              </div>
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
              disabled={!selectedPatient || selectedProcedures.length === 0 || isSubmitting || (isPartialActive && !!splitError)}
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