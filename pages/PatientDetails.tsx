import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Phone, Calendar, Edit2, X, Save } from 'lucide-react';

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPatientById, getConsultationsByPatient, updatePatient } = useData();
  
  const patient = id ? getPatientById(id) : undefined;
  
  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data for editing
  useEffect(() => {
    if(patient) {
        setEditName(patient.name);
        setEditPhone(patient.phone);
        setEditNotes(patient.notes);
    }
  }, [patient, isEditing]);
  
  if (!patient) {
    return <Navigate to="/patients" />;
  }

  const history = getConsultationsByPatient(patient.id);
  const totalCommission = history.reduce((sum, c) => sum + c.doctorCommission, 0);

  // Manual format for spaces
  const formatMoney = (val: number) => {
     return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.length < 4 && !val.startsWith('+258')) {
        setEditPhone('+258 ');
        return;
    }
    const rawInput = val.replace(/[^\d+]/g, '');
    let digits = rawInput.replace(/^\+258/, '');
    let formatted = '+258 ';
    if (digits.length > 0) formatted += digits.substring(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.substring(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.substring(5, 9);
    setEditPhone(formatted);
  };

  const handleSave = async () => {
      if(!patient) return;
      setIsSaving(true);
      try {
          await updatePatient(patient.id, {
              name: editName,
              phone: editPhone,
              notes: editNotes
          });
          setIsEditing(false);
      } catch(e) {
          alert("Erro ao actualizar dados do paciente.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="pb-40 p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
         <Link to="/patients" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={24} />
         </Link>
         <h1 className="text-xl font-bold text-slate-800">Detalhes do Paciente</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
         <div className="flex justify-between items-start mb-4">
            <div>
               <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
               <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Phone size={16} />
                  <span>{patient.phone}</span>
               </div>
            </div>
            <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                title="Editar Paciente"
            >
               <Edit2 size={18} />
            </button>
         </div>
         
         {patient.notes && (
           <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 mt-2">
              <strong>Notas:</strong> {patient.notes}
           </div>
         )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="bg-white p-4 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500">Total Consultas</span>
            <div className="text-xl font-bold text-slate-800">{history.length}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500">Tua Comissão</span>
            <div className="text-xl font-bold text-teal-600">{formatMoney(totalCommission)}</div>
         </div>
      </div>

      {/* History */}
      <h3 className="font-bold text-slate-700 mb-3">Histórico Clínico</h3>
      <div className="space-y-4 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200">
         {history.length === 0 && (
             <div className="pl-10 text-gray-400 italic text-sm py-4">
                 Sem histórico de consultas.
             </div>
         )}
         {history.map((cons) => (
           <div key={cons.id} className="relative pl-10">
              <div className="absolute left-[11px] top-1 w-3 h-3 bg-teal-600 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                       <Calendar size={14} />
                       <span>{new Date(cons.date).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{cons.id}</span>
                 </div>
                 
                 <div className="space-y-1 mb-3">
                    {cons.procedures.map((proc, idx) => (
                       <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-700 font-medium">{proc.code} - {proc.name}</span>
                          <span className="text-gray-500">{formatMoney(proc.value)}</span>
                       </div>
                    ))}
                 </div>

                 <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Comissão:</span>
                    <span className="text-sm font-bold text-teal-600">{formatMoney(cons.doctorCommission)}</span>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Edit Modal */}
      {isEditing && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-slate-800">Editar Paciente</h3>
                  <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                     <X size={20} />
                  </button>
               </div>
               
               <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Nome Completo</label>
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Telefone</label>
                    <input 
                      type="tel"
                      inputMode="tel"
                      value={editPhone}
                      onChange={handlePhoneChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Notas Gerais</label>
                    <textarea 
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
               </div>
               
               <button 
                  onClick={handleSave}
                  disabled={!editName || isSaving}
                  className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 text-base shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
               >
                  {isSaving ? 'A guardar...' : (
                      <>
                         <Save size={18} /> Guardar Alterações
                      </>
                  )}
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default PatientDetails;