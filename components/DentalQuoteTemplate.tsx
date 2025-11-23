import React, { forwardRef } from 'react';
import { Budget } from '../types';

interface DentalQuoteTemplateProps {
  budget: Budget;
  logoUrl?: string;
}

export const DentalQuoteTemplate = forwardRef<HTMLDivElement, DentalQuoteTemplateProps>(({ budget, logoUrl }, ref) => {
  
  const formatMoney = (val: number) => {
    return 'MT ' + (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const grandTotal = budget.totalValue;
  // Assumindo que o valor total já inclui IVA 5%
  const totalTax = grandTotal - (grandTotal / 1.05);
  const subTotal = grandTotal - totalTax;

  const formattedDate = new Date(budget.date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
  });

  return (
    <div ref={ref}>
      {/* Estilos específicos copiados do HTML fornecido */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin: 0;
            padding: 0;
        }

        .a4-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            position: relative;
            box-sizing: border-box;
            padding: 15mm 15mm;
        }

        /* Ajustes para visualização em ecrã dentro da app */
        .screen-preview-wrapper {
            background-color: #f3f4f6;
            padding: 2rem 0;
            display: flex;
            justify-content: center;
        }

        .screen-preview {
             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        /* Estilos de Impressão */
        @media print {
            @page { size: A4; margin: 0; }
            body { background-color: white; margin: 0; padding: 0; }
            .screen-preview-wrapper { padding: 0; background: white; display: block; }
            .a4-page {
                width: 100%; margin: 0; box-shadow: none; border: none; padding: 15mm;
                page-break-after: always;
            }
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="screen-preview-wrapper">
        <div className="a4-page screen-preview flex flex-col justify-between text-slate-800">
            
            {/* HEADER SECTION */}
            <div>
                <header className="flex flex-row justify-between items-start mb-12">
                    {/* Coluna Esquerda: Provider Info */}
                    <div className="flex flex-col items-start gap-4">
                        <div className="text-sm text-slate-600 leading-relaxed mt-4">
                            <h1 className="text-lg font-bold text-slate-900">Shamila Modan</h1>
                            <p className="font-medium text-slate-800">Médica Dentista</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ortodontia e Reabilitação Oral</p>
                            <p>OMD 12345</p>
                            <p>+258 84 616 6066 • contacto@shamilamodan.mz</p>
                        </div>
                    </div>

                    {/* Coluna Direita: Orçamento & Cliente */}
                    <div className="text-right flex flex-col items-end">
                        <div className="mb-6">
                            <h2 className="text-2xl font-light text-slate-900 mb-1">Orçamento</h2>
                            <p className="text-sm font-medium text-slate-500">#{budget.number}</p>
                            <p className="text-sm text-slate-500">Data: <span>{formattedDate}</span></p>
                        </div>

                        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-100 pl-4">
                            <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Exmo(a). Sr(a).</p>
                            <p className="font-semibold text-slate-900 text-base">{budget.patientName}</p>
                            <p>Maputo</p>
                        </div>
                    </div>
                </header>

                {/* MAIN CONTENT (PHASES) */}
                <main>
                    {budget.phases.map((phase, idx) => (
                        <div key={idx} className="mb-8 break-inside-avoid">
                            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1">
                                {phase.name}
                            </h3>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 font-medium border-b border-slate-200">
                                        <th className="py-2 pr-4 w-3/5 font-medium">Descrição do Procedimento</th>
                                        <th className="py-2 px-2 w-24 text-center font-medium whitespace-nowrap">Qtd.</th>
                                        <th className="py-2 px-2 w-24 text-right font-medium whitespace-nowrap">Valor Un.</th>
                                        <th className="py-2 pl-4 w-24 text-right font-medium whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700">
                                    {phase.procedures.map((proc, pIdx) => (
                                        <tr key={pIdx} className="border-b border-slate-100 last:border-0">
                                            <td className="py-3 pr-4 align-top">{proc.name}</td>
                                            <td className="py-3 px-2 text-center align-top text-slate-500 whitespace-nowrap">{proc.quantity}</td>
                                            <td className="py-3 px-2 text-right align-top text-slate-500 whitespace-nowrap">{formatMoney(proc.unitValue)}</td>
                                            <td className="py-3 pl-4 text-right align-top font-medium whitespace-nowrap">{formatMoney(proc.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="pt-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Subtotal {phase.name.split(':')[0]}
                                        </td>
                                        <td className="pt-3 pl-4 text-right text-sm font-semibold text-slate-800 whitespace-nowrap">
                                            {formatMoney(phase.subtotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ))}
                </main>
            </div>

            {/* FOOTER SECTION (Break Avoid) */}
            <div className="break-inside-avoid">
                
                {/* TOTALS */}
                <div className="flex justify-end mt-8 mb-12">
                    <div className="w-64">
                        <div className="flex justify-between py-2 text-sm text-slate-600 border-b border-slate-100">
                            <span>Subtotal</span>
                            <span className="whitespace-nowrap">{formatMoney(subTotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-sm text-slate-600 border-b border-slate-100">
                            <span>IVA (5%)</span>
                            <span className="whitespace-nowrap">{formatMoney(totalTax)}</span>
                        </div>
                        <div className="flex justify-between py-4 text-xl font-bold text-slate-900">
                            <span>Total</span>
                            <span className="whitespace-nowrap">{formatMoney(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* TERMS & SIGNATURE */}
                <footer className="mt-auto border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-end">
                        <div className="w-2/3 text-xs text-slate-400 leading-relaxed">
                            <p className="font-medium text-slate-600 mb-1">Condições e Notas:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Válido por 30 dias após a data de emissão.</li>
                                <li>O valor apresentado inclui IVA (à taxa de 5%).</li>
                                <li>Os valores apresentados podem sofrer alterações caso surjam necessidades clínicas não detetáveis no exame inicial.</li>
                                <li>Pagamento faseado de acordo com a realização dos tratamentos.</li>
                            </ul>
                        </div>
                        
                        <div className="flex flex-col items-center gap-4 w-48">
                            <div className="w-full h-12 border-b border-dashed border-slate-300"></div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-800">Dra. Shamila Modan</p>
                                <p className="text-[10px] text-slate-500">Médica Dentista</p>
                                <p className="text-[10px] text-slate-500">Pós-Graduanda em Ortodontia</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-12 text-xs font-medium text-slate-300 uppercase tracking-[0.2em]">
                        OBRIGADO PELA SUA CONFIANÇA
                    </div>
                </footer>
            </div>
        </div>
      </div>
    </div>
  );
});

export default DentalQuoteTemplate;