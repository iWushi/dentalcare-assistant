// Types for the structured ortho report JSON

export interface OrthoReportHeader {
  nome: string;
  idade: string;
  data: string;
}

export interface OrthoReport {
  cabecalho: OrthoReportHeader;
  diagnostico: string;
  exame_clinico: string;
  plano_tratamento: string[];
  notas_revisao: string[];
}

// Factory — always returns a fresh RegExp to avoid stateful lastIndex issues
export const mkFlagRegex = () =>
  /\[(CONFIRMAR(?::[^\]]*)?|REVISAR DADO(?::[^\]]*)?)\]/gi;

export const extractFlags = (text: string): string[] =>
  [...text.matchAll(mkFlagRegex())].map((m) => m[0]);

export const hasFlags = (text: string): boolean => mkFlagRegex().test(text);

export const countAllFlags = (report: OrthoReport): number => {
  const texts = [
    report.diagnostico,
    report.exame_clinico,
    ...report.plano_tratamento,
    ...report.notas_revisao,
  ];
  return texts.reduce(
    (sum, t) => sum + (t.match(mkFlagRegex()) ?? []).length,
    0
  );
};

// ── JSON parsing ────────────────────────────────────────────────────────────

const extractJson = (raw: string): string => {
  // Strip markdown code-block wrapper if present
  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) return blockMatch[1];
  // Fall back to first {...} block
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];
  return raw;
};

export const parseReportJson = (raw: string): OrthoReport => {
  const jsonStr = extractJson(raw.trim());

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      'A IA não devolveu um JSON válido. Verifica os ficheiros e tenta novamente.\n\n' +
        'Resposta recebida:\n' +
        raw.slice(0, 600)
    );
  }

  const header = ((parsed.cabecalho ?? {}) as Record<string, string>);

  return {
    cabecalho: {
      nome: String(header.nome ?? ''),
      idade: String(header.idade ?? ''),
      data: String(header.data ?? new Date().toLocaleDateString('pt-PT')),
    },
    diagnostico: String(parsed.diagnostico ?? ''),
    exame_clinico: String(parsed.exame_clinico ?? ''),
    plano_tratamento: Array.isArray(parsed.plano_tratamento)
      ? parsed.plano_tratamento.map(String)
      : [],
    notas_revisao: Array.isArray(parsed.notas_revisao)
      ? parsed.notas_revisao.map(String)
      : [],
  };
};
