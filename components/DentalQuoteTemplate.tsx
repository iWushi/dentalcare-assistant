import React, { forwardRef } from 'react';
import { Budget } from '../types';

interface DentalQuoteTemplateProps {
  budget: Budget;
  logoUrl?: string;
  patientPhone?: string;
}

export const DentalQuoteTemplate = forwardRef<HTMLDivElement, DentalQuoteTemplateProps>(({ budget, logoUrl, patientPhone }, ref) => {
  
  const formatMoney = (val: number) => {
    return 'MT ' + (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const grossTotal = budget.totalValue;
  
  // Calculate Discount
  const discountPercentage = budget.discountPercentage || 0;
  const discountValue = grossTotal * (discountPercentage / 100);
  
  // Subtotal after discount
  const subTotalAfterDiscount = grossTotal - discountValue;
  
  // Tax Calculation (5%)
  // Assuming subTotalAfterDiscount is the gross amount including tax, we reverse calculate the tax base
  const taxBase = subTotalAfterDiscount / 1.05;
  const totalTax = subTotalAfterDiscount - taxBase;
  const netTotal = taxBase; // Or just display subTotalAfterDiscount as the total to pay?
  // Usually: Total to Pay = Subtotal (Services) + VAT.
  // If prices include VAT: Total to Pay = Sum of Prices.
  // If discount applied: Total to Pay = (Sum of Prices) - Discount.
  // Then we show how much of that Total to Pay is VAT.
  
  // Let's stick to the display logic:
  // Total Geral (Payable) = subTotalAfterDiscount
  const totalPayable = subTotalAfterDiscount;

  const formattedDate = new Date(budget.date).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
  });

  return (
    <div ref={ref}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin: 0;
            padding: 0;
            color: #1e293b; /* slate-800 */
        }

        /* Configuração de Base A4 para Ecrã */
        .a4-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            position: relative;
            box-sizing: border-box;
            padding: 15mm 15mm; /* Margem visual no ecrã */
        }

        /* Wrapper de visualização */
        .screen-preview-wrapper {
            background-color: #f3f4f6;
            padding: 2rem 0;
            display: flex;
            justify-content: center;
        }

        .screen-preview {
             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        /* --- ESTILOS DE IMPRESSÃO --- */
        @media print {
            @page { 
                size: A4; 
                /* Margens definidas na página física para garantir que a 
                   segunda página tenha margem no topo automaticamente */
                margin: 10mm 15mm 10mm 15mm; 
            }
            
            body { 
                background-color: white; 
                margin: 0; 
                padding: 0; 
            }
            
            .screen-preview-wrapper { 
                padding: 0; 
                background: white; 
                display: block; 
            }
            
            .a4-page {
                width: 100%; 
                margin: 0; 
                box-shadow: none; 
                border: none; 
                /* Removemos o padding do contentor porque a @page já tem margem */
                padding: 0; 
                page-break-after: always;
            }
            
            .no-print { display: none !important; }
            
            /* Ajuste de cores para impressão fiel */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="screen-preview-wrapper">
        <div className="a4-page screen-preview flex flex-col justify-between">
            
            {/* HEADER SECTION */}
            <div>
                <header className="flex flex-row justify-between items-start mb-10">
                    {/* Coluna Esquerda: Provider Info */}
                    <div className="flex flex-col items-start gap-1">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : (
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">Shamila Modan</h1>
                        )}
                        
                        <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {!logoUrl && <p className="font-semibold text-sm text-slate-800">Médica Dentista</p>}
                            <p className="uppercase tracking-wider text-[10px] text-slate-500 font-medium mb-0.5">Ortodontia e Reabilitação Oral</p>
                            <p className="font-medium">OMD 12345</p>
                            <p className="mt-1 text-slate-500">+258 84 616 6066 • modanshamila@gmail.com</p>
                        </div>
                    </div>

                    {/* Coluna Direita: Orçamento & Cliente */}
                    <div className="text-right flex flex-col items-end">
                        <div className="mb-8">
                            <h2 className="text-3xl font-light text-slate-900 mb-1">Orçamento</h2>
                            <p className="text-xs font-medium text-slate-500 tracking-wide">#{budget.number}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Data: <span className="font-medium text-slate-700">{formattedDate}</span></p>
                        </div>

                        <div className="text-sm text-slate-600 border-l-2 border-slate-100 pl-4 py-0.5">
                            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-1">EXMO(A). SR(A).</p>
                            <p className="font-bold text-slate-900 text-base leading-tight">{budget.patientName}</p>
                            {patientPhone ? (
                                <p className="text-xs text-slate-500 mt-0.5">{patientPhone}</p>
                            ) : (
                                <p className="text-xs text-slate-500 mt-0.5">Maputo</p>
                            )}
                        </div>
                    </div>
                </header>

                {/* MAIN CONTENT (PHASES) */}
                <main className="space-y-6">
                    {budget.phases.map((phase, idx) => (
                        <div key={idx} className="break-inside-avoid">
                            {/* Título da Fase */}
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                                {phase.name}
                            </h3>
                            
                            {/* Tabela de Procedimentos - FONTE REDUZIDA EM ~10% */}
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        {/* Cabeçalho Reduzido */}
                                        <th className="py-2 pr-4 w-[60%] font-semibold text-[9px] text-slate-500 uppercase tracking-wide">Descrição do Procedimento</th>
                                        <th className="py-2 px-2 w-[10%] text-center font-semibold text-[9px] text-slate-500 uppercase tracking-wide">Qtd.</th>
                                        <th className="py-2 px-2 w-[15%] text-right font-semibold text-[9px] text-slate-500 uppercase tracking-wide">Valor Un.</th>
                                        <th className="py-2 pl-4 w-[15%] text-right font-semibold text-[9px] text-slate-500 uppercase tracking-wide">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {phase.procedures.map((proc, pIdx) => (
                                        <tr key={pIdx} className="border-b border-slate-50 last:border-0">
                                            {/* Conteúdo Reduzido */}
                                            <td className="py-2.5 pr-4 align-top text-[11px] font-medium leading-relaxed">{proc.name}</td>
                                            <td className="py-2.5 px-2 text-center align-top text-[11px] text-slate-500">{proc.quantity}</td>
                                            <td className="py-2.5 px-2 text-right align-top text-[11px] text-slate-500 whitespace-nowrap">{formatMoney(proc.unitValue)}</td>
                                            <td className="py-2.5 pl-4 text-right align-top text-[11px] font-semibold text-slate-700 whitespace-nowrap">{formatMoney(proc.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="pt-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            Subtotal Fase {idx + 1}
                                        </td>
                                        <td className="pt-2.5 pl-4 text-right text-[11px] font-bold text-slate-800 whitespace-nowrap">
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
                <div className="flex justify-end mt-8 mb-10">
                    <div className="w-64">
                        {/* Discount Breakdown if Applicable */}
                        {discountPercentage > 0 && (
                           <>
                             <div className="flex justify-between py-1.5 text-xs text-slate-500 border-b border-slate-100">
                                <span className="font-medium">Total Bruto</span>
                                <span className="whitespace-nowrap">{formatMoney(grossTotal)}</span>
                             </div>
                             <div className="flex justify-between py-1.5 text-xs text-teal-600 border-b border-slate-100">
                                <span className="font-medium">Desconto ({discountPercentage}%)</span>
                                <span className="whitespace-nowrap">- {formatMoney(discountValue)}</span>
                             </div>
                           </>
                        )}

                        <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-slate-100">
                            <span className="font-medium">Subtotal Líquido</span>
                            <span className="whitespace-nowrap">{formatMoney(netTotal)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-slate-100">
                            <span className="font-medium">IVA (5%)</span>
                            <span className="whitespace-nowrap">{formatMoney(totalTax)}</span>
                        </div>
                        <div className="flex justify-between py-3 text-lg font-bold text-slate-900 items-baseline">
                            <span>Total a Pagar</span>
                            <span className="whitespace-nowrap">{formatMoney(totalPayable)}</span>
                        </div>
                    </div>
                </div>

                {/* TERMS & SIGNATURE */}
                <footer className="mt-auto border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-end">
                        <div className="w-2/3 text-[10px] text-slate-400 leading-relaxed">
                            <p className="font-bold text-slate-600 mb-1.5 text-xs">Condições e Notas:</p>
                            <ul className="list-disc pl-3 space-y-1">
                                <li>Válido por 30 dias após a data de emissão.</li>
                                <li>O valor apresentado inclui IVA (à taxa de 5%).</li>
                                <li>Os valores apresentados podem sofrer alterações caso surjam necessidades clínicas não detetáveis no exame inicial.</li>
                                <li>Pagamento faseado de acordo com a realização dos tratamentos.</li>
                            </ul>
                        </div>
                        
                        <div className="flex flex-col items-center gap-3 w-48">
                            <div className="w-full h-8 border-b border-dashed border-slate-300"></div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Dra. Shamila Modan</p>
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Médica Dentista</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-10 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                        Obrigado pela sua confiança
                    </div>
                </footer>
            </div>
        </div>
      </div>
    </div>
  );
});

export default DentalQuoteTemplate;