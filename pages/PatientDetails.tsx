
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Phone, Calendar, Edit2 } from 'lucide-react';

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getPatientById, getConsultationsByPatient } = useData();
  
  const patient = id ? getPatientById(id) : undefined;
  
  if (!patient) {
    return <Navigate to="/patients" />;
  }

  const history = getConsultationsByPatient(patient.id);
  const totalCommission = history.reduce((sum, c) => sum + c.doctorCommission, 0);

  // Manual format for spaces
  const formatMoney = (val: number) => {
     return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
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
            <button className="p-2 text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100">
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

    </div>
  );
};

export default PatientDetails;
