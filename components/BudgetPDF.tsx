
import React, { forwardRef, useState } from 'react';
import { Budget } from '../types';

interface BudgetPDFProps {
  budget: Budget;
  logoUrl?: string;
}

const BudgetPDF = forwardRef<HTMLDivElement, BudgetPDFProps>(({ budget, logoUrl }, ref) => {
  const [imgError, setImgError] = useState(false);
  
  const formatMoney = (val: number) => {
    return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const grandTotal = budget.totalValue;
  const totalTax = grandTotal - (grandTotal / 1.05);
  const subTotal = grandTotal - totalTax;

  const finalLogoUrl = logoUrl || "/logo.png";

  // Formatação de datas
  const formattedDate = new Date(budget.date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  return (
    <div ref={ref}>
      {/* 
          Global Print Styles 
      */}
      <style>{`
           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
           
           @page {
              size: A4;
              margin: 0; /* Controlamos a margem via CSS do container para ter mais controlo */
           }
           @media print {
              body {
                 background-color: white;
                 -webkit-print-color-adjust: exact;
                 print-color-adjust: exact;
                 font-family: 'Inter', sans-serif;
              }
              .print-container {
                 width: 210mm;
                 min-height: 297mm;
                 padding: 15mm 15mm 15mm 15mm; /* Margens seguras */
                 margin: 0 auto;
                 background: white;
              }
              /* Evita quebrar elementos importantes ao meio */
              .no-break {
                 break-inside: avoid;
                 page-break-inside: avoid;
              }
              /* Esconder elementos de UI se vazarem para o print */
              .hide-print {
                 display: none;
              }
           }
           /* Estilos para visualização em ecrã */
           .screen-preview {
               width: 210mm;
               min-height: 297mm;
               padding: 15mm;
               background: white;
               box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
               margin: 0 auto;
               font-family: 'Inter', sans-serif;
           }
      `}</style>

      <div className="print-container screen-preview text-slate-800 text-sm leading-relaxed">
        
        {/* HEADER */}
        <header className="flex justify-between items-start border-b-2 border-teal-600/20 pb-8 mb-8">
           {/* Esquerda: Logo e Dados Clínicos */}
           <div className="flex flex-col gap-4">
              <div className="h-16 flex items-center">
                 {!imgError ? (
                     <img 
                        src={finalLogoUrl} 
                        alt="Logo Dra Shamila" 
                        className="h-full w-auto object-contain max-w-[180px]" 
                        onError={() => setImgError(true)}
                     />
                 ) : (
                    <div className="border-2 border-dashed border-slate-200 px-4 py-3 flex flex-col items-center justify-center text-slate-400 rounded bg-slate-50">
                        <span className="font-bold text-[10px] uppercase tracking-wider">Logo em falta</span>
                     </div>
                 )}
              </div>
              
              <div className="text-xs text-slate-500 space-y-0.5 font-medium">
                 <p>Maputo, Moçambique</p>
                 <p>+258 84 123 4567</p>
                 <p className="text-teal-600">modanshamila@gmail.com</p>
              </div>
           </div>

           {/* Direita: Título e Identificadores */}
           <div className="text-right">
              <h1 className="text-3xl font-light text-slate-800 tracking-tight mb-1">ORÇAMENTO</h1>
              <p className="text-teal-600 font-bold text-sm uppercase tracking-wider mb-6">Dental Care</p>
              
              <div className="space-y-1 text-sm">
                 <div className="flex justify-end gap-3">
                    <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider pt-0.5">Número</span>
                    <span className="font-semibold text-slate-700">{budget.number}</span>
                 </div>
                 <div className="flex justify-end gap-3">
                    <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider pt-0.5">Data</span>
                    <span className="font-semibold text-slate-700">{formattedDate}</span>
                 </div>
              </div>
           </div>
        </header>

        {/* CLIENTE INFO BOX */}
        <section className="bg-slate-50 rounded-lg border border-slate-100 p-6 mb-10 no-break">
           <div className="grid grid-cols-2 gap-8">
              <div>
                 <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Paciente</span>
                 <p className="text-lg font-bold text-slate-800">{budget.patientName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                     <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Local</span>
                     <p className="text-sm font-medium text-slate-600">Consultório Médico</p>
                  </div>
                  <div>
                     <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Cidade</span>
                     <p className="text-sm font-medium text-slate-600">Maputo</p>
                  </div>
              </div>
           </div>
        </section>

        {/* FASES & PROCEDIMENTOS */}
        <div className="space-y-8 mb-10">
           {budget.phases.map((phase, idx) => (
              <div key={idx} className="no-break">
                 <div className="flex items-end justify-between mb-3 border-b border-slate-200 pb-2">
                    <h3 className="font-semibold text-slate-800 text-base">
                       {phase.name}
                    </h3>
                 </div>
                 
                 <table className="w-full text-xs mb-2 table-fixed">
                    <thead>
                       <tr className="text-slate-400 text-left uppercase tracking-wider text-[10px]">
                          <th className="pb-2 font-bold w-[50%] pl-2">Procedimento</th>
                          <th className="pb-2 font-bold text-center w-[10%]">Qtd</th>
                          <th className="pb-2 font-bold text-right w-[20%]">Unitário</th>
                          <th className="pb-2 font-bold text-right w-[20%] pr-2">Total</th>
                       </tr>
                    </thead>
                    <tbody className="text-slate-600">
                       {phase.procedures.map((proc, pIdx) => (
                          <tr key={pIdx} className="border-b border-slate-100 last:border-0 odd:bg-slate-50/60">
                             <td className="py-2.5 pl-2 align-top">
                                <div className="flex flex-col">
                                   <span className="font-semibold text-slate-700 text-sm mb-0.5">{proc.name}</span>
                                   <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded w-max">
                                      Cód: {proc.code}
                                   </span>
                                </div>
                             </td>
                             <td className="py-2.5 text-center align-middle font-medium">{proc.quantity}</td>
                             <td className="py-2.5 text-right align-middle whitespace-nowrap">{formatMoney(proc.unitValue)} MT</td>
                             <td className="py-2.5 text-right pr-2 font-bold text-slate-800 align-middle whitespace-nowrap">{formatMoney(proc.total)} MT</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 
                 <div className="flex justify-end mt-2">
                    <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded">
                       Subtotal Fase: {formatMoney(phase.subtotal)} MT
                    </div>
                 </div>
              </div>
           ))}
        </div>

        {/* TOTALS BLOCK */}
        <div className="flex justify-end mb-16 no-break">
           <div className="w-80 bg-slate-50 rounded-xl border border-slate-100 p-5">
              <div className="space-y-2 mb-4 border-b border-slate-200 pb-4">
                 <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal Geral</span>
                    <span className="font-medium">{formatMoney(subTotal)} MT</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-500">
                    <span>IVA (5%)</span>
                    <span className="font-medium">{formatMoney(totalTax)} MT</span>
                 </div>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-base font-bold text-slate-700 uppercase tracking-wide">Total Geral</span>
                 <span className="text-xl font-bold text-teal-700">{formatMoney(grandTotal)} MT</span>
              </div>
           </div>
        </div>

        {/* FOOTER & SIGNATURE */}
        <footer className="no-break mt-auto pt-8 border-t-2 border-slate-100">
           <div className="flex justify-between items-end mb-10">
              <div className="w-1/2">
                 <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-1">Dra. Shamila Modan</h4>
                 <p className="text-xs text-slate-500">Médica Dentista, OrMM nº 3266</p>
                 <p className="text-xs text-slate-500 text-teal-600">Pós-Graduanda em Ortodontia</p>
              </div>
              <div className="w-48 border-t border-slate-300 pt-2 text-center">
                 <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Assinatura</p>
              </div>
           </div>

           {/* Legal Notes */}
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                 Notas Importantes
              </h5>
              <ul className="text-[9px] text-slate-500 space-y-1.5 list-disc pl-3 leading-relaxed text-justify">
                 <li>O valor apresentado inclui IVA à taxa legal em vigor (5%).</li>
                 <li>A presente cotação tem validade de dois meses a partir da data de emissão.</li>
                 <li>O plano de tratamento está sujeito a alterações conforme os achados clínicos de cada fase e resposta biológica do paciente.</li>
                 <li>Caso o seguimento do tratamento não seja comunicado no prazo de dois meses, os registos poderão ser eliminados da base de dados ativa.</li>
              </ul>
           </div>
        </footer>

      </div>
    </div>
  );
});

export default BudgetPDF;
