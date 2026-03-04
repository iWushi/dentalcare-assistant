import React, { useState, useCallback } from 'react';
import { generateOrthoReport, OrthoInputFile } from '../../api/ortho/generate';
import { OrthoReport as OrthoReportType } from '../../services/ortho/report-builder';
import ReviewForm from '../../components/ortho/ReviewForm';
import PDFPreview from '../../components/ortho/PDFPreview';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'analyzing' | 'review' | 'preview';

interface FileBucket {
  notas: File[];
  webceph: File[];
  fotos: File[];
}

// ── File drop zone ────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  hint: string;
  icon: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  label,
  hint,
  icon,
  accept,
  multiple = false,
  files,
  onFiles,
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      onFiles(multiple ? dropped : [dropped[0]]);
    },
    [multiple, onFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    onFiles(multiple ? selected : [selected[0]]);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const removeFile = (i: number) =>
    onFiles(files.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl
          border-2 border-dashed cursor-pointer transition-all text-center
          ${dragOver
            ? 'border-teal-500 bg-teal-50'
            : files.length > 0
            ? 'border-slate-300 bg-slate-50'
            : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/30'
          }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <span className="text-3xl leading-none">{icon}</span>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{hint}</span>
        {files.length > 0 && (
          <span className="text-xs font-medium text-teal-600 mt-1">
            {files.length} ficheiro{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}
          </span>
        )}
      </label>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-xs bg-white border border-slate-200
                rounded-lg px-3 py-1.5"
            >
              <span className="flex-1 truncate text-slate-600 font-medium">{f.name}</span>
              <span className="text-slate-400 flex-shrink-0">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={(e) => { e.preventDefault(); removeFile(i); }}
                className="text-slate-300 hover:text-red-400 transition-colors ml-1 flex-shrink-0"
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Test data (Bilga Masseque) ────────────────────────────────────────────────

const TEST_REPORT: OrthoReportType = {
  cabecalho: {
    nome: 'Bilga de Fátima Masseque',
    idade: '12 anos',
    data: new Date().toLocaleDateString('pt-PT'),
  },
  diagnostico:
    'Paciente do sexo feminino, 12 anos de idade, apresentando Classe II esquelética severa ' +
    'com perfil convexo acentuado e protrusão labial superior e inferior. Relação molar Classe II ' +
    'bilateralmente com overjet acentuado. A análise cefalométrica confirma discrepância ' +
    'esquelética de base com retrognatismo mandibular.',
  exame_clinico:
    'À análise facial frontal, simetria facial mantida com terços equilibrados. Em norma lateral, ' +
    'perfil convexo com protrusão labial e aumento do ângulo nasolabial. Intra-oralmente: ' +
    'arcadas com apinhamento moderado, overjet de aproximadamente 8 mm, overbite aumentado. ' +
    'Higiene oral satisfatória. Freio labial superior com inserção baixa — indicação para ' +
    'frenectomia após avaliação periodontal. ' +
    'Análise facial sujeita a confirmação após registo fotográfico definitivo.',
  plano_tratamento: [
    'Colocação de aparelho fixo autoligado — arcadas superior e inferior',
    'Sequência de arcos NiTi termoactivados: 0.014" → 0.016" → 0.018" × 0.025" CuNiTi',
    'Mola aberta entre dentes 33–31 para correcção de diastema',
    'Build-ups oclusais nos dentes 17 e 27 para desoclusão posterior transitória',
    'Frenectomia labial superior — após avaliação periodontal',
  ],
  notas_revisao: [
    'Confirmar valores cefalométricos exactos do relatório WebCeph após digitalização.',
    'Avaliar necessidade de extracções antes de iniciar mecânica correctiva.',
  ],
};

// ── Main page ─────────────────────────────────────────────────────────────────

const OrthoReport: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [buckets, setBuckets] = useState<FileBucket>({
    notas: [],
    webceph: [],
    fotos: [],
  });
  const [context, setContext] = useState('');
  const [report, setReport] = useState<OrthoReportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalFiles =
    buckets.notas.length + buckets.webceph.length + buckets.fotos.length;

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);

    const files: OrthoInputFile[] = [
      ...buckets.notas.map((f) => ({ file: f, role: 'notas' as const })),
      ...buckets.webceph.map((f) => ({ file: f, role: 'webceph' as const })),
      ...buckets.fotos.map((f) => ({ file: f, role: 'fotografia' as const })),
    ];

    try {
      const result = await generateOrthoReport(files, context || undefined);
      setReport(result);
      setStep('review');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro desconhecido. Verifica os ficheiros e tenta novamente.';
      setError(msg);
      setStep('upload');
    }
  };

  const handleLoadTestData = () => {
    setReport({ ...TEST_REPORT });
    setStep('review');
  };

  // ── Step: Upload ────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-light text-slate-900 tracking-wide mb-1">
            Relatório Ortodôntico
          </h1>
          <p className="text-sm text-slate-500">
            Carrega os documentos clínicos e a IA gera um relatório estruturado para revisão.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* File zones */}
        <div className="space-y-4 mb-6">
          <DropZone
            label="Notas Clínicas / Manuscritas"
            hint="PDF ou imagem das notas — fonte prioritária"
            icon="📋"
            accept="application/pdf,image/*"
            multiple
            files={buckets.notas}
            onFiles={(f) => setBuckets((b) => ({ ...b, notas: f }))}
          />
          <DropZone
            label="Análise WebCeph"
            hint="PDF com métricas cefalométricas"
            icon="📐"
            accept="application/pdf,image/*"
            files={buckets.webceph}
            onFiles={(f) => setBuckets((b) => ({ ...b, webceph: f }))}
          />
          <DropZone
            label="Fotografias Clínicas"
            hint="Frontal, perfil, intra-oral — vários ficheiros"
            icon="📷"
            accept="image/*"
            multiple
            files={buckets.fotos}
            onFiles={(f) => setBuckets((b) => ({ ...b, fotos: f }))}
          />
        </div>

        {/* Optional context */}
        <div className="mb-6">
          <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 block mb-2">
            Contexto adicional (opcional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="Ex: paciente já usou aparelho removível, prefer tratamento sem extracções..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAnalyze}
            disabled={totalFiles === 0}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
              totalFiles > 0
                ? 'bg-slate-900 text-white hover:bg-slate-700 shadow-lg hover:shadow-xl'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {totalFiles > 0
              ? `Analisar com IA (${totalFiles} ficheiro${totalFiles > 1 ? 's' : ''}) →`
              : 'Carrega pelo menos um ficheiro para continuar'}
          </button>

          <button
            onClick={handleLoadTestData}
            className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium
              text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
          >
            Usar dados de teste — Bilga Masseque
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Analyzing ─────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-12 h-12 border-2 border-teal-600 border-t-transparent rounded-full
          animate-spin mb-6" />
        <h2 className="text-lg font-medium text-slate-800 mb-2">
          A analisar os documentos...
        </h2>
        <p className="text-sm text-slate-500 max-w-xs">
          A IA está a ler os ficheiros clínicos e a construir o relatório.
          Isto pode demorar 10–30 segundos.
        </p>
      </div>
    );
  }

  // ── Step: Review ────────────────────────────────────────────────────────────
  if (step === 'review' && report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light text-slate-900 tracking-wide mb-1">
              Revisão do Relatório
            </h1>
            <p className="text-sm text-slate-500">
              Verifica e edita o conteúdo gerado pela IA. Resolve todas as marcações antes de exportar.
            </p>
          </div>
          <button
            onClick={() => { setStep('upload'); setError(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors flex-shrink-0 ml-4"
          >
            ← Novo relatório
          </button>
        </div>

        <ReviewForm
          report={report}
          onChange={setReport}
          onGeneratePdf={() => setStep('preview')}
        />
      </div>
    );
  }

  // ── Step: Preview ───────────────────────────────────────────────────────────
  if (step === 'preview' && report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
        <PDFPreview report={report} onBack={() => setStep('review')} />
      </div>
    );
  }

  return null;
};

export default OrthoReport;
