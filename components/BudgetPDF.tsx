
import React, { forwardRef, useState } from 'react';
import { Budget } from '../types';

interface BudgetPDFProps {
  budget: Budget;
  logoUrl?: string; // URL para o logo
}

const BudgetPDF = forwardRef<HTMLDivElement, BudgetPDFProps>(({ budget, logoUrl }, ref) => {
  const [imgError, setImgError] = useState(false);
  
  const formatMoney = (val: number) => {
    return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const grandTotal = budget.totalValue;
  const totalTax = grandTotal - (grandTotal / 1.05);
  const subTotal = grandTotal - totalTax;

  // Fallback para o logo se o prop vier vazio
  const finalLogoUrl = logoUrl || "/logo.png";

  return (
    <div ref={ref}>
      {/* 
          Configuração de Impressão:
          - @page: Define margens físicas de 20mm em todas as bordas da folha A4.
          - .print-container: Remove paddings HTML na impressão (já geridos pelo @page)
            mas mantém paddings no ecrã para simular a folha.
      */}
      <style>{`
           @page {
              size: A4;
              margin: 20mm;
           }
           @media print {
              body {
                 background-color: white;
                 -webkit-print-color-adjust: exact;
                 print-color-adjust: exact;
              }
              .print-reset-p {
                 padding: 0 !important;
                 margin: 0 !important;
                 box-shadow: none !important;
                 min-height: auto !important;
              }
              .no-print {
                 display: none !important;
              }
              /* Rodapé fixo no fundo da área de impressão */
              .footer-absolute {
                 position: absolute;
                 bottom: 0;
                 left: 0;
                 right: 0;
              }
           }
      `}</style>

      <div className="print-reset-p bg-white text-slate-900 font-sans mx-auto relative"
           style={{ 
             width: '210mm', 
             minHeight: '297mm', 
             padding: '20mm', 
             boxSizing: 'border-box',
             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' // Sombra apenas para ecrã
           }}
      >
        
        {/* HEADER */}
        <header className="flex justify-between items-start mb-12">
           <div className="flex flex-col gap-4">
              {/* Logo */}
              <div className="h-20 mb-2 flex items-center">
                 {!imgError ? (
                     <img 
                        src={finalLogoUrl} 
                        alt="Logo Dra Shamila" 
                        className="h-full w-auto object-contain max-w-[200px]" 
                        onError={(e) => {
                            setImgError(true);
                            console.warn("Logo não encontrado em", finalLogoUrl);
                        }}
                     />
                 ) : (
                     <div className="border-2 border-dashed border-gray-300 px-4 py-2 flex flex-col items-center justify-center text-gray-400 text-xs rounded bg-gray-50">
                        <span className="font-bold">LOGO EM FALTA</span>
                        <span className="text-[8px]">Coloque 'logo.png' na pasta public</span>
                     </div>
                 )}
              </div>
              
              <div className="text-sm text-slate-500 space-y-1 leading-tight">
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
                 <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-100 text-left w-56 ml-auto">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Paciente</p>
                    <p className="font-bold text-slate-800 text-base truncate">{budget.patientName}</p>
                 </div>
              </div>
           </div>
        </header>

        {/* CONTENT - Padding bottom extra para não bater no rodapé */}
        <div className="space-y-8 mb-12 pb-32">
           {budget.phases.map((phase, idx) => (
              <section key={idx} className="break-inside-avoid">
                 <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mb-3 text-sm uppercase tracking-wider">
                    {phase.name}
                 </h3>
                 <table className="w-full text-sm mb-2">
                    <thead>
                       <tr className="text-xs text-gray-400 text-left border-b border-gray-100">
                          <th className="pb-2 font-medium w-[55%]">Procedimento</th>
                          <th className="pb-2 font-medium text-right w-[10%]">Qtd</th>
                          <th className="pb-2 font-medium text-right w-[15%]">Unitário</th>
                          <th className="pb-2 font-medium text-right w-[20%]">Total</th>
                       </tr>
                    </thead>
                    <tbody className="text-slate-600">
                       {phase.procedures.map((proc, pIdx) => (
                          <tr key={pIdx} className="border-b border-gray-50 last:border-0">
                             <td className="py-2 pr-2 align-top">
                                <span className="font-bold text-slate-700">{proc.code}</span> 
                                <span className="text-slate-500 block text-xs sm:inline sm:text-sm sm:ml-1">{proc.name}</span>
                             </td>
                             <td className="py-2 text-right align-top">{proc.quantity}</td>
                             <td className="py-2 text-right align-top whitespace-nowrap">{formatMoney(proc.unitValue)}</td>
                             <td className="py-2 text-right font-bold text-slate-800 align-top whitespace-nowrap">{formatMoney(proc.total)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 <div className="flex justify-end mt-2">
                    <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded border border-teal-100">
                       Subtotal Fase: {formatMoney(phase.subtotal)} MT
                    </div>
                 </div>
              </section>
           ))}

            {/* TOTALS SECTION - Keep together to avoid split */}
            <div className="flex justify-end mt-8 break-inside-avoid">
               <div className="w-72 space-y-2 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
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
        </div>

        {/* FOOTER - Absolute positioning at bottom of container (page 1 or last page depending on flow) */}
        <footer className="footer-absolute border-t border-gray-200 pt-6 w-full" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
           <div className="grid grid-cols-2 gap-8">
              <div>
                 <h4 className="font-bold text-slate-800 text-sm mb-1">Dra. Shamila Modan</h4>
                 <p className="text-xs text-slate-500">Médica Dentista, OrMM nº 3266</p>
                 <p className="text-xs text-slate-500">Pós-Graduanda em Ortodontia</p>
              </div>
              
              <div className="text-[9px] text-gray-400 space-y-1 text-justify leading-relaxed">
                 <p>• O valor apresentado inclui IVA (à taxa de 5%).</p>
                 <p>• A presente cotação tem validade de dois meses.</p>
                 <p>• O plano de tratamento está sujeito a alterações conforme os achados clínicos de cada fase.</p>
                 <p>• Caso o seguimento do tratamento não seja comunicado no prazo de dois meses, os registos serão eliminados.</p>
              </div>
           </div>
        </footer>

      </div>
    </div>
  );
});

export default BudgetPDF;
