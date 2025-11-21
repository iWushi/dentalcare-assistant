
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

  // Garante que usa o logo local da pasta public se não for passado outro
  const finalLogoUrl = logoUrl || "/logo.png";

  const formattedDate = new Date(budget.date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  return (
    <div ref={ref}>
      <style>{`
           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&display=swap');
           
           @page {
              size: A4;
              margin: 0;
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
                 padding: 15mm 20mm; /* Margens laterais ligeiramente maiores para elegância */
                 margin: 0 auto;
                 background: white;
              }
              .no-break {
                 break-inside: avoid;
                 page-break-inside: avoid;
              }
           }
           .screen-preview {
               width: 210mm;
               min-height: 297mm;
               padding: 15mm 20mm;
               background: white;
               box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
               margin: 0 auto;
               font-family: 'Inter', sans-serif;
           }
      `}</style>

      <div className="print-container screen-preview text-slate-800">
        
        {/* HEADER ELEGANTE */}
        <header className="flex justify-between items-start mb-12 pt-4">
           {/* Logo Area */}
           <div className="w-1/2">
              <div className="h-20 flex items-center mb-4">
                 {!imgError ? (
                     <img 
                        src={finalLogoUrl} 
                        alt="Logotipo" 
                        className="h-full w-auto object-contain max-w-[220px]" 
                        onError={() => setImgError(true)}
                     />
                 ) : (
                    // Fallback elegante se a imagem falhar
                    <div className="h-full flex items-center">
                        <div className="text-2xl font-serif italic text-slate-800">Shamila Modan</div>
                    </div>
                 )}
              </div>
           </div>

           {/* Title & Meta */}
           <div className="w-1/2 text-right">
              <h1 className="text-4xl font-extralight text-slate-900 tracking-wide mb-4">ORÇAMENTO</h1>
              
              <div className="inline-block text-right">
                 <div className="flex justify-end items-baseline gap-4 mb-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Número</span>
                    <span className="text-sm font-medium text-slate-700">{budget.number}</span>
                 </div>
                 <div className="flex justify-end items-baseline gap-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Data</span>
                    <span className="text-sm font-medium text-slate-700">{formattedDate}</span>
                 </div>
              </div>
           </div>
        </header>

        {/* SEPARADOR FINO */}
        <div className="w-full h-px bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 mb-12 opacity-50"></div>

        {/* INFO GRID */}
        <section className="grid grid-cols-2 gap-12 mb-16 text-sm leading-relaxed no-break">
           {/* Prestador */}
           <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold mb-4">Prestador</h3>
              <div className="text-slate-600 space-y-1">
                 <p className="font-semibold text-slate-900 text-lg mb-2">Dra. Shamila Modan</p>
                 <p>Médica Dentista, OrMM nº 3266</p>
                 <p className="mb-4">Pós-Graduanda em Ortodontia</p>
                 
                 <p className="mt-4 text-xs text-slate-500">+258 84 616 6066</p>
                 <p className="text-xs text-slate-500">modanshamila@gmail.com</p>
                 <p className="text-xs text-slate-500">Maputo, Moçambique</p>
              </div>
           </div>

           {/* Cliente */}
           <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold mb-4">Paciente</h3>
              <div className="text-slate-600 space-y-1">
                 <p className="font-semibold text-slate-900 text-lg mb-2">{budget.patientName}</p>
                 <p>Consultório Médico</p>
                 <p>Maputo</p>
              </div>
           </div>
        </section>

        {/* FASES & TABELAS */}
        <div className="space-y-10 mb-12">
           {budget.phases.map((phase, idx) => (
              <div key={idx} className="no-break">
                 {/* Título da Fase */}
                 <div className="mb-4">
                    <h3 className="font-medium text-slate-800 text-base flex items-center gap-3">
                       <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                       {phase.name}
                    </h3>
                 </div>
                 
                 {/* Tabela Minimalista */}
                 <table className="w-full text-sm mb-4">
                    <thead>
                       <tr className="text-slate-400 border-b border-slate-200">
                          <th className="pb-3 font-medium text-left w-[55%] text-[10px] uppercase tracking-wider pl-2">Descrição</th>
                          <th className="pb-3 font-medium text-center w-[10%] text-[10px] uppercase tracking-wider">Qtd</th>
                          <th className="pb-3 font-medium text-right w-[15%] text-[10px] uppercase tracking-wider">Unitário</th>
                          <th className="pb-3 font-medium text-right w-[20%] text-[10px] uppercase tracking-wider pr-2">Total</th>
                       </tr>
                    </thead>
                    <tbody className="text-slate-600">
                       {phase.procedures.map((proc, pIdx) => (
                          <tr key={pIdx} className="border-b border-slate-50 last:border-transparent hover:bg-slate-50/50 transition-colors">
                             <td className="py-3 pl-2 align-top">
                                <div className="font-medium text-slate-700">{proc.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{proc.code}</div>
                             </td>
                             <td className="py-3 text-center align-top pt-3.5">{proc.quantity}</td>
                             <td className="py-3 text-right align-top pt-3.5 text-slate-500">{formatMoney(proc.unitValue)}</td>
                             <td className="py-3 text-right pr-2 align-top pt-3.5 font-semibold text-slate-700">{formatMoney(proc.total)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 
                 <div className="flex justify-end">
                    <div className="text-xs font-medium text-slate-500 bg-slate-50 px-4 py-1.5 rounded-full">
                       Subtotal: {formatMoney(phase.subtotal)} MT
                    </div>
                 </div>
              </div>
           ))}
        </div>

        {/* TOTAIS */}
        <div className="flex justify-end mb-20 no-break">
           <div className="w-72">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                 <span>Subtotal Geral</span>
                 <span>{formatMoney(subTotal)} MT</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-4 border-b border-slate-200 pb-4">
                 <span>IVA (5%)</span>
                 <span>{formatMoney(totalTax)} MT</span>
              </div>
              <div className="flex justify-between items-end">
                 <span className="text-sm font-bold text-slate-700 uppercase tracking-wider pb-1">Total Geral</span>
                 <span className="text-2xl font-light text-teal-700">{formatMoney(grandTotal)} <span className="text-sm font-bold">MT</span></span>
              </div>
           </div>
        </div>

        {/* RODAPÉ & ASSINATURA */}
        <footer className="no-break mt-auto">
           <div className="grid grid-cols-2 gap-12 mb-12">
              <div></div> {/* Espaço Vazio Esquerda */}
              
              {/* Linha Assinatura Direita */}
              <div className="text-center">
                 <div className="h-16 mb-2 border-b border-slate-300"></div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Assinatura</p>
              </div>
           </div>

           {/* Termos Legais */}
           <div className="border-t border-slate-100 pt-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Condições</p>
              <div className="grid grid-cols-2 gap-8 text-[9px] text-slate-400 leading-relaxed text-justify">
                 <p>
                    Este orçamento inclui IVA à taxa legal em vigor (5%). A validade desta proposta é de 60 dias a contar da data de emissão. 
                    Os valores apresentados representam uma estimativa baseada na avaliação clínica inicial.
                 </p>
                 <p>
                    O plano de tratamento pode sofrer alterações dependendo da resposta biológica. 
                    Caso o tratamento seja interrompido por mais de 60 dias sem aviso prévio, poderá ser necessário reavaliar o caso e os custos associados.
                 </p>
              </div>
           </div>
        </footer>

      </div>
    </div>
  );
});

export default BudgetPDF;
