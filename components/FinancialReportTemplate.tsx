
import React, { forwardRef } from 'react';
import { Consultation } from '../types';

interface FinancialReportTemplateProps {
  consultations: Consultation[];
  periodLabel: string;
  totalValue: number;
  logoUrl?: string;
  doctorName?: string;
}

export const FinancialReportTemplate = forwardRef<HTMLDivElement, FinancialReportTemplateProps>(({ 
  consultations, 
  periodLabel, 
  totalValue,
  logoUrl,
  doctorName = "Dra. Shamila Modan"
}, ref) => {
  
  const formatMoney = (val: number) => {
    return (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

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
            color: #1e293b;
        }

        .report-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 15mm;
            box-sizing: border-box;
        }

        @media print {
            @page { 
                size: A4; 
                margin: 10mm 15mm; 
            }
            body { background-color: white; }
            .report-page { width: 100%; margin: 0; padding: 0; }
            .no-break { page-break-inside: avoid; }
            tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="report-page">
        {/* HEADER */}
        <header className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
            <div className="flex flex-col gap-1">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain mb-2" />
                ) : (
                    <h1 className="text-xl font-bold text-slate-900">{doctorName}</h1>
                )}
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Relatório Financeiro</p>
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-light text-slate-900 mb-1">Extrato de Produção</h2>
                <p className="text-sm font-bold text-teal-700">{periodLabel}</p>
                <p className="text-xs text-slate-400 mt-1">Gerado em: {new Date().toLocaleDateString('pt-PT')}</p>
            </div>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Total Consultas</p>
                <p className="text-xl font-bold text-slate-700">{consultations.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 col-span-2 flex flex-col items-end">
                <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Valor Total Apurado</p>
                <p className="text-2xl font-bold text-teal-700">{formatMoney(totalValue)} MT</p>
            </div>
        </div>

        {/* TABLE */}
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b-2 border-slate-800">
                    <th className="py-2 w-[12%] text-[10px] font-bold text-slate-900 uppercase tracking-wide">Data</th>
                    <th className="py-2 w-[25%] text-[10px] font-bold text-slate-900 uppercase tracking-wide">Paciente</th>
                    <th className="py-2 w-[30%] text-[10px] font-bold text-slate-900 uppercase tracking-wide">Tratamentos</th>
                    <th className="py-2 w-[15%] text-[10px] font-bold text-slate-900 uppercase tracking-wide">Clínica</th>
                    <th className="py-2 w-[18%] text-right text-[10px] font-bold text-slate-900 uppercase tracking-wide">Valor</th>
                </tr>
            </thead>
            <tbody className="text-slate-600">
                {consultations.map((c, idx) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 text-[11px] align-top font-medium">{formatDate(c.date)}</td>
                        <td className="py-3 text-[11px] align-top font-bold text-slate-700">{c.patientName}</td>
                        <td className="py-3 text-[10px] align-top leading-tight text-slate-500">
                            {c.procedures.map(p => p.code).join(', ')}
                            <div className="text-[9px] text-slate-400 italic mt-0.5 truncate max-w-[200px]">
                                {c.procedures.map(p => p.name).join(', ')}
                            </div>
                        </td>
                        <td className="py-3 text-[10px] align-top">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                                c.clinic === 'Sommerschield' 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'bg-orange-50 text-orange-700'
                            }`}>
                                {c.clinic}
                            </span>
                        </td>
                        <td className="py-3 text-[11px] align-top text-right font-medium text-slate-800">
                            {formatMoney(c.doctorCommission)}
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-50 no-break">
                    <td colSpan={4} className="py-4 text-right text-xs font-bold text-slate-900 uppercase tracking-widest pr-4">
                        Total Geral
                    </td>
                    <td className="py-4 text-right text-lg font-bold text-teal-700 whitespace-nowrap">
                        {formatMoney(totalValue)} MT
                    </td>
                </tr>
            </tfoot>
        </table>

        {/* FOOTER */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
             <p className="text-[10px] text-slate-400 uppercase tracking-widest">Documento Processado por DentalCare Assistant</p>
        </footer>
      </div>
    </div>
  );
});
