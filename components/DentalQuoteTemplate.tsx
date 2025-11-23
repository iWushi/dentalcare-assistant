import React, { forwardRef, useState } from 'react';
import { Budget } from '../types';

interface DentalQuoteTemplateProps {
  budget: Budget;
  logoUrl?: string;
}

export const DentalQuoteTemplate = forwardRef<HTMLDivElement, DentalQuoteTemplateProps>(({ budget, logoUrl }, ref) => {
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
           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
           
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
                 padding: 15mm 20mm;
                 margin: 0 auto;
                 background: white;
                 position: relative;
                 display: flex;
                 flex-direction: column;
              }
              .no-break {
                 break-inside: avoid;
                 page-break-inside: avoid;
              }
              .footer-spacer {
                 flex-grow: 1;
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
               display: flex;
               flex-direction: column;
           }
      `}</style>

      <div className="print-container screen-preview text-slate-900">
        
        {/* HEADER */}
        <header className="flex justify-between items-start mb-16">
           {/* Left: Doctor Info */}
           <div className="w-1/2">
              <div className="h-16 mb-6">
                 {!imgError ? (
                     <img 
                        src={finalLogoUrl} 
                        alt="Logotipo" 
                        className="h-full w-auto object-contain" 
                        onError={() => setImgError(true)}
                     />
                 ) : (
                    <div className="h-full flex items-center text-2xl font-serif italic text-slate-800">
                        Shamila Modan
                    </div>
                 )}
              </div>
              
              <div className="text-sm leading-relaxed text-slate-600">
                 <h2 className="font-bold text-slate-900 text-lg">Dra. Shamila Modan</h2>
                 <p className="font-medium">Médica Dentista</p>
                 <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Ortodontia e Reabilitação Oral</p>
                 <p className="text-xs text-slate-400 mb-4">OMD 12345</p>
                 
                 <div className="space-y-0.5 text-xs">
                    <p>+258 84 616 6066</p>
                    <p>modanshamila@gmail.com</p>
                    <p>Maputo, Moçambique</p>
                 </div>
              </div>
           </div>

           {/* Right: Quote Info */}
           <div className="w-1/2 text-right">
              <h1 className="text-3xl font-light text-slate-900 mb-6">Orçamento</h1>
              
              <div className="space-y-1 mb-8">
                 <p className="text-sm font-medium text-slate-400">#{budget.number}</p>
                 <p className="text-sm text-slate-600">Data: {formattedDate}</p>
              </div>

              <div className="inline-block text-right bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[200px]">
                 <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Exmo(a). Sr(a).</p>
                 <p className="text-lg font-bold text-slate-800">{budget.patientName}</p>
                 <p className="text-xs text-slate-500 mt-1">Maputo</p>
              </div>
           </div>
        </header>

        {/* CONTENT */}
        <div className="space-y-12">
           {budget.phases.map((phase, idx) => (
              <div key={idx} className="no-break">
                 <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3 border-b border-slate-200 pb-2">
                    {phase.name}
                 </h3>
                 
                 <table className="w-full text-sm mb-2">
                    <thead>
                       <tr className="text-slate-400 text-xs">
                          <th className="font-medium text-left py-2 w-[50%]">Descrição do Procedimento</th>
                          <th className="font-medium text-center py-2 w-[10%]">Qtd.</th>
                          <th className="font-medium text-right py-2 w-[20%]">Valor Un.</th>
                          <th className="font-medium text-right py-2 w-[20%]">Total</th>
                       </tr>
                    </thead>
                    <tbody className="text-slate-600">
                       {phase.procedures.map((proc, pIdx) => (
                          <tr key={pIdx} className="border-b border-slate-100 last:border-0">
                             <td className="py-3 pr-2 align-top">
                                {proc.name}
                             </td>
                             <td className="py-3 text-center align-top">{proc.quantity}</td>
                             <td className="py-3 text-right align-top">{formatMoney(proc.unitValue)} MTn</td>
                             <td className="py-3 text-right align-top font-medium text-slate-800">{formatMoney(proc.total)} MTn</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 
                 <div className="flex justify-end pt-2">
                    <div className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-1 rounded">
                       SUBTOTAL {phase.name.split(':')[0].toUpperCase()} &nbsp;&nbsp; {formatMoney(phase.subtotal)} MTn
                    </div>
                 </div>
              </div>
           ))}
        </div>

        {/* Spacer to push footer down if content is short, but let it flow if long */}
        <div className="footer-spacer h-12"></div>

        {/* TOTALS */}
        <div className="flex justify-end mb-12 no-break">
           <div className="w-80 border-t-2 border-slate-900 pt-4">
              <div className="flex justify-between text-sm text-slate-500 mb-2">
                 <span>Subtotal</span>
                 <span>{formatMoney(subTotal)} MTn</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 mb-4">
                 <span>IVA (5%)</span>
                 <span>{formatMoney(totalTax)} MTn</span>
              </div>
              <div className="flex justify-between items-end">
                 <span className="text-lg font-bold text-slate-900">Total</span>
                 <span className="text-2xl font-bold text-slate-900">{formatMoney(grandTotal)} MTn</span>
              </div>
           </div>
        </div>

        {/* FOOTER & SIGNATURE */}
        <footer className="no-break mt-auto bg-slate-50 p-8 rounded-xl border border-slate-100">
           <div className="grid grid-cols-2 gap-12">
              {/* Notes */}
              <div className="text-[10px] text-slate-500 leading-relaxed space-y-1.5 text-justify">
                 <p><strong>Condições e Notas:</strong></p>
                 <ul className="list-disc list-outside pl-3 space-y-1">
                    <li>O valor apresentado inclui IVA (à taxa de 5%).</li>
                    <li>A presente cotação tem validade de dois meses.</li>
                    <li>O plano de tratamento está sujeito a alterações conforme os achados clínicos de cada fase.</li>
                    <li>Caso o seguimento do tratamento não seja comunicado no prazo de dois meses, os registos fotográficos e os modelos de gesso serão eliminados dos nossos arquivos.</li>
                 </ul>
              </div>

              {/* Signature */}
              <div className="flex flex-col items-center justify-end text-center">
                 <div className="w-48 border-b border-slate-300 mb-3"></div>
                 <p className="font-bold text-slate-800 text-sm">Dra. Shamila Modan</p>
                 <p className="text-xs text-slate-500">Médica Dentista</p>
                 <p className="text-xs text-slate-500">Pós-Graduanda em Ortodontia</p>
              </div>
           </div>
           
           <div className="text-center mt-6 pt-4 border-t border-slate-200/50">
              <p className="text-[9px] font-bold text-teal-600/40 uppercase tracking-[0.3em]">Obrigado pela sua confiança</p>
           </div>
        </footer>

      </div>
    </div>
  );
});

export default DentalQuoteTemplate;
