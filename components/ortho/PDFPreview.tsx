import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import OrthoReportTemplate from '../../templates/OrthoReportTemplate';
import { OrthoReport } from '../../services/ortho/report-builder';
import { triggerPdfExport } from '../../api/ortho/export-pdf';

interface PDFPreviewProps {
  report: OrthoReport;
  onBack: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ report, onBack }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // react-to-print v2 API
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: `Relatorio_Ortodontico_${report.cabecalho.nome || 'Paciente'}`,
  });

  const handleExport = () => {
    triggerPdfExport(handlePrint, report.cabecalho.nome || 'Paciente');
  };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800
            transition-colors font-medium"
        >
          <span className="text-base leading-none">←</span>
          Voltar à revisão
        </button>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            Pré-visualização A4 — {report.cabecalho.nome || '—'}
          </span>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold
              rounded-xl hover:bg-slate-700 transition-colors shadow-md hover:shadow-lg
              flex items-center gap-2"
          >
            <span>↓</span>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Print hint ── */}
      <p className="text-xs text-slate-400 text-center mb-4">
        Na caixa de impressão, selecciona <strong>"Guardar como PDF"</strong> e
        desactiva os cabeçalhos e rodapés do browser.
      </p>

      {/* ── A4 preview ── */}
      <div className="overflow-auto bg-gray-100 rounded-2xl p-6">
        <OrthoReportTemplate ref={contentRef} report={report} />
      </div>
    </div>
  );
};

export default PDFPreview;
