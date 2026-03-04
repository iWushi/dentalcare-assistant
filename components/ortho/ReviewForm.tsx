import React, { useState } from 'react';
import {
  OrthoReport,
  mkFlagRegex,
  extractFlags,
  countAllFlags,
} from '../../services/ortho/report-builder';

// ── Flag highlighting helpers ─────────────────────────────────────────────────

/**
 * Renders a string with [CONFIRMAR] / [REVISAR DADO] tags highlighted inline.
 * Tags of type CONFIRMAR → amber; REVISAR DADO → orange (higher urgency).
 */
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const regex = mkFlagRegex();
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`t-${last}`}>{text.slice(last, match.index)}</span>);
    }
    const isRevisar = match[0].toUpperCase().startsWith('[REVISAR');
    nodes.push(
      <mark
        key={`m-${match.index}`}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide mx-0.5 ${
          isRevisar
            ? 'bg-orange-200 text-orange-800 border border-orange-300'
            : 'bg-amber-200 text-amber-800 border border-amber-300'
        }`}
      >
        {match[0]}
      </mark>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(<span key={`t-${last}`}>{text.slice(last)}</span>);

  return <>{nodes}</>;
};

// ── Reusable flagged field (toggle display ↔ edit) ────────────────────────────

interface FlaggedFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

const FlaggedField: React.FC<FlaggedFieldProps> = ({
  label,
  value,
  onChange,
  rows = 5,
}) => {
  const [editing, setEditing] = useState(false);
  const flags = extractFlags(value);
  const hasFlag = flags.length > 0;

  return (
    <div className="mb-1">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {hasFlag && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-300">
              ⚠ {flags.length} marcação{flags.length > 1 ? 'ões' : ''}
            </span>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-[10px] text-teal-600 hover:text-teal-800 underline underline-offset-2 transition-colors"
          >
            {editing ? 'Pré-visualizar' : 'Editar'}
          </button>
        </div>
      </div>

      {/* Edit mode — plain textarea */}
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
          rows={rows}
          className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono leading-relaxed resize-y
            focus:outline-none focus:ring-2 transition-colors ${
              hasFlag
                ? 'border-amber-400 bg-amber-50/60 focus:ring-amber-300'
                : 'border-slate-200 bg-white focus:ring-teal-300'
            }`}
        />
      ) : (
        /* Display mode — rendered with highlighted flags */
        <div
          onClick={() => setEditing(true)}
          title="Clica para editar"
          className={`w-full px-3 py-2.5 rounded-lg border text-sm leading-relaxed cursor-text
            transition-colors ${
              hasFlag
                ? 'border-amber-400 bg-amber-50/60'
                : 'border-slate-200 bg-slate-50/50 hover:border-teal-300'
            }`}
          style={{ minHeight: `${rows * 1.65}rem` }}
        >
          {value.trim() ? (
            <HighlightedText text={value} />
          ) : (
            <span className="text-slate-300 italic text-xs">Vazio — clica para editar</span>
          )}
        </div>
      )}

      {/* Flag list — visible in display mode only */}
      {!editing && hasFlag && (
        <div className="mt-2 space-y-1">
          {flags.map((flag, i) => {
            const isRevisar = flag.toUpperCase().startsWith('[REVISAR');
            return (
              <div
                key={i}
                className={`flex items-center gap-2 text-[11px] rounded px-3 py-1.5 border ${
                  isRevisar
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span>{isRevisar ? '🔶' : '⚠'}</span>
                <code className="font-bold tracking-wide">{flag}</code>
                <span className="ml-auto italic opacity-60 text-[10px]">
                  edita o texto para resolver
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main ReviewForm ───────────────────────────────────────────────────────────

interface ReviewFormProps {
  report: OrthoReport;
  onChange: (updated: OrthoReport) => void;
  onGeneratePdf: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ report, onChange, onGeneratePdf }) => {
  const totalFlags = countAllFlags(report);
  const requiredFilled =
    report.cabecalho.nome.trim() &&
    report.diagnostico.trim() &&
    report.exame_clinico.trim() &&
    report.plano_tratamento.length > 0 &&
    report.plano_tratamento.some((s) => s.trim().length > 0);

  const canExport = totalFlags === 0 && !!requiredFilled;

  const update = <K extends keyof OrthoReport>(key: K, value: OrthoReport[K]) =>
    onChange({ ...report, [key]: value });

  const updatePlanItem = (i: number, value: string) => {
    const next = [...report.plano_tratamento];
    next[i] = value;
    update('plano_tratamento', next);
  };

  const addPlanItem = () =>
    update('plano_tratamento', [...report.plano_tratamento, '']);

  const removePlanItem = (i: number) =>
    update(
      'plano_tratamento',
      report.plano_tratamento.filter((_, idx) => idx !== i)
    );

  return (
    <div className="space-y-5">
      {/* ── Status banner ── */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          totalFlags > 0
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}
      >
        <span className="text-xl leading-none mt-0.5">
          {totalFlags > 0 ? '⚠' : '✓'}
        </span>
        <span>
          {totalFlags > 0
            ? `${totalFlags} marcação${totalFlags > 1 ? 'ões' : ''} pendente${
                totalFlags > 1 ? 's' : ''
              } — resolve os campos em amarelo antes de exportar.`
            : 'Sem marcações pendentes. O relatório está pronto para exportar.'}
        </span>
      </div>

      {/* ── Cabeçalho ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">
          Cabeçalho
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { key: 'nome', label: 'Paciente' },
              { key: 'idade', label: 'Idade' },
              { key: 'data', label: 'Data' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-1">
                {label}
              </label>
              <input
                type="text"
                value={report.cabecalho[key]}
                onChange={(e) =>
                  update('cabecalho', { ...report.cabecalho, [key]: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-300 transition-colors"
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Diagnóstico ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FlaggedField
          label="Diagnóstico"
          value={report.diagnostico}
          onChange={(v) => update('diagnostico', v)}
          rows={5}
        />
      </div>

      {/* ── Exame Clínico ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FlaggedField
          label="Exame Clínico"
          value={report.exame_clinico}
          onChange={(v) => update('exame_clinico', v)}
          rows={5}
        />
      </div>

      {/* ── Plano de Tratamento ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Plano de Tratamento
          </span>
          <button
            onClick={addPlanItem}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold
              flex items-center gap-1 transition-colors"
          >
            + Adicionar passo
          </button>
        </div>

        <div className="space-y-2.5">
          {report.plano_tratamento.map((item, i) => {
            const hasFlag = mkFlagRegex().test(item);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-xs font-bold text-slate-300 text-right flex-shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updatePlanItem(i, e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none
                    focus:ring-2 transition-colors ${
                      hasFlag
                        ? 'border-amber-400 bg-amber-50/60 focus:ring-amber-300'
                        : 'border-slate-200 focus:ring-teal-300'
                    }`}
                  placeholder={`Passo ${i + 1} do plano de tratamento`}
                />
                <button
                  onClick={() => removePlanItem(i)}
                  title="Remover passo"
                  className="flex-shrink-0 text-slate-300 hover:text-red-400
                    transition-colors text-xl leading-none w-6 text-center"
                >
                  ×
                </button>
              </div>
            );
          })}

          {report.plano_tratamento.length === 0 && (
            <p className="text-xs text-slate-400 italic py-2">
              Nenhum passo adicionado. Clica em "+ Adicionar passo".
            </p>
          )}
        </div>
      </div>

      {/* ── Notas de Revisão da IA ── */}
      {report.notas_revisao.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 mb-3">
            Notas de Revisão da IA
          </h3>
          <ul className="space-y-2">
            {report.notas_revisao.map((nota, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800 leading-relaxed">
                <span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>
                <span>{nota}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Generate PDF button ── */}
      <div className="flex justify-end pt-1 pb-4">
        <button
          onClick={onGeneratePdf}
          disabled={!canExport}
          className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
            canExport
              ? 'bg-slate-900 text-white hover:bg-slate-700 shadow-lg hover:shadow-xl'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {totalFlags > 0
            ? `⚠ Resolve ${totalFlags} marcação${totalFlags > 1 ? 'ões' : ''} primeiro`
            : !requiredFilled
            ? 'Preenche os campos obrigatórios'
            : 'Pré-visualizar e Gerar PDF →'}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;
