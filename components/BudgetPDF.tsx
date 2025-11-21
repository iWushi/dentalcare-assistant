
import React, { forwardRef, useState } from 'react';
import { Budget } from '../types';

interface BudgetPDFProps {
  budget: Budget;
  logoUrl?: string; // URL para o logo
}

// Este componente usa HTML/CSS puro para layout A4 preciso.
// As classes 'print:' são usadas para garantir que só aparece na impressão.

const BudgetPDF = forwardRef<HTMLDivElement, BudgetPDFProps>(({ budget, logoUrl }, ref) => {
  const [imgError, setImgError] = useState(false);
  
  const formatMoney = (val: number) => {
    return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const grandTotal = budget.totalValue;
  // Cálculo do IVA inverso para mostrar o breakdown (assumindo que os preços unitários já têm IVA)
  // Valor com IVA = Valor Sem IVA * 1.05
  // IVA = Valor Com IVA - (Valor Com IVA / 1.05)
  const totalTax = grandTotal - (grandTotal / 1.05);
  const subTotal = grandTotal - totalTax;

  return (
    <div ref={ref}>
      <div className="a4-page bg-white text-slate-900 font-sans p-10 mx-auto max-w-[210mm] min-h-[297mm] relative">
        
        {/* HEADER */}
        <header className="flex justify-between items-start mb-12">
           <div className="flex flex-col gap-4">
              {/* Logo Placeholder */}
              <div className="w-48 h-20 mb-2 flex items-center">
                 {logoUrl && !imgError ? (
                     <img 
                        src={logoUrl} 
                        alt="Logo Dra Shamila" 
                        className="h-full w-auto object-contain" 
                        onError={() => setImgError(true)}
                     />
                 ) : (
                     <div className="border-2 border-dashed border-gray-300 w-full h-full flex items-center justify-center text-gray-400 text-xs rounded">
                        [LOGO AQUI]
                     </div>
                 )}
              </div>
              
              <div className="text-sm text-slate-500 space-y-1">
                 <p>Maputo, Moçambique</p>
                 <p>+258 84 123 4567</p>
                 <p>consultas@drashamila.com</p>
              </div>
           </div>

           <div className="text-right">
              <h1 className="text-2xl font-light text-slate-800 uppercase tracking-widest mb-2">Orçamento</h1>
              <div className="text-sm space-y-1">
                 <p><span className="font-bold text-slate-600">Nº:</span> {budget.number}</p>
                 <p><span className="font-bold text-slate-600">Data:</span> {new Date(budget.date).toLocaleDateString('pt-PT')}</p>
                 <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-100 text-left w-48 ml-auto">
                    <p className="text-xs text-gray-500 uppercase font-bold">Paciente</p>
                    <p className="font-bold text-slate-800">{budget.patientName}</p>
                 </div>
              </div>
           </div>
        </header>

        {/* CONTENT */}
        <div className="space-y-8 mb-12">
           {budget.phases.map((phase, idx) => (
              <section key={idx} className="break-inside-avoid">
                 <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mb-3 text-sm uppercase tracking-wider">
                    {phase.name}
                 </h3>
                 <table className="w-full text-sm mb-2">
                    <thead>
                       <tr className="text-xs text-gray-400 text-left border-b border-gray-100">
                          <th className="pb-2 font-medium w-[60%]">Procedimento</th>
                          <th className="pb-2 font-medium text-right">Qtd</th>
                          <th className="pb-2 font-medium text-right">Unitário</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody>
                       {phase.procedures.map((proc, pIdx) => (
                          <tr key={pIdx} className="border-b border-gray-50 last:border-0">
                             <td className="py-3 pr-2">
                                <span className="font-medium text-slate-700">{proc.code}</span> <span className="text-slate-500">- {proc.name}</span>
                             </td>
                             <td className="py-3 text-right text-slate-600">{proc.quantity}</td>
                             <td className="py-3 text-right text-slate-600">{formatMoney(proc.unitValue)}</td>
                             <td className="py-3 text-right font-medium text-slate-800">{formatMoney(proc.total)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 <div className="flex justify-end">
                    <div className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded">
                       Subtotal Fase: {formatMoney(phase.subtotal)} MT
                    </div>
                 </div>
              </section>
           ))}
        </div>

        {/* TOTALS */}
        <div className="flex justify-end mb-16 break-inside-avoid">
           <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                 <span>Subtotal</span>
                 <span>{formatMoney(subTotal)} MT</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                 <span>IVA (5%)</span>
                 <span>{formatMoney(totalTax)} MT</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-800 border-t border-gray-200 pt-3 mt-2">
                 <span>Total Geral</span>
                 <span>{formatMoney(grandTotal)} MT</span>
              </div>
           </div>
        </div>

        {/* FOOTER */}
        <footer className="absolute bottom-10 left-10 right-10 border-t border-gray-200 pt-8">
           <div className="grid grid-cols-2 gap-8">
              <div>
                 <h4 className="font-bold text-slate-800 text-sm mb-1">Dra. Shamila Modan</h4>
                 <p className="text-xs text-slate-500">Médica Dentista, OrMM nº 3266</p>
                 <p className="text-xs text-slate-500">Pós-Graduanda em Ortodontia</p>
              </div>
              
              <div className="text-[10px] text-gray-400 space-y-1 text-justify">
                 <p>• O valor apresentado inclui IVA (à taxa de 5%).</p>
                 <p>• A presente cotação tem validade de dois meses.</p>
                 <p>• O plano de tratamento está sujeito a alterações conforme os achados clínicos de cada fase.</p>
                 <p>• Caso o seguimento do tratamento não seja comunicado no prazo de dois meses, os registos fotográficos e os modelos de gesso serão eliminados dos nossos arquivos.</p>
              </div>
           </div>
        </footer>

        {/* PRINT STYLES INLINE (Ensures formatting works correctly) */}
        <style>{`
           @page {
              size: A4;
              margin: 0;
           }
           @media print {
              body {
                 background-color: white;
                 -webkit-print-color-adjust: exact;
                 print-color-adjust: exact;
              }
              .no-print {
                 display: none !important;
              }
           }
        `}</style>
      </div>
    </div>
  );
});

export default BudgetPDF;
