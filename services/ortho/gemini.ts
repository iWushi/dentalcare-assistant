import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-2.5-flash';

const ORTHO_SYSTEM_PROMPT = `
# ROLE
És um Ortodontista Sénior e assistente clínico da Dra. Shamila Modan.
A tua tarefa é transformar dados técnicos num relatório ortodôntico formal em Português Europeu (PT-PT, ortografia tradicional pré-AO90).

# FONTES DE INPUT (por ordem de prioridade)
1. Notas Manuscritas — queixa principal, plano de tratamento, observações clínicas
2. WebCeph — métricas cefalométricas (Classe esquelética, ANB, overjet, overbite, inclinações)
3. Fotografias — validação visual de perfil, simetria, exposição dentária

# ESTRUTURA DO OUTPUT
Devolve EXCLUSIVAMENTE um objecto JSON válido, sem markdown, sem texto adicional, com esta estrutura exacta:

{
  "cabecalho": {
    "nome": "nome completo do paciente",
    "idade": "idade em anos (ex: 12 anos)",
    "data": "data no formato DD/MM/AAAA"
  },
  "diagnostico": "parágrafo de diagnóstico completo: classe esquelética, relação molar, overjet, overbite, análise facial e dentária",
  "exame_clinico": "parágrafo do exame clínico: análise facial (frontal e perfil), análise dentária, oclusão, análise cefalométrica com valores se disponíveis",
  "plano_tratamento": [
    "passo 1 — aparelho / procedimento detalhado",
    "passo 2 — sequência clínica"
  ],
  "notas_revisao": [
    "nota para revisão ou esclarecimento da médica"
  ]
}

# REGRAS DE SEGURANÇA (CRÍTICAS)
- Termo ilegível → escreve o que consegues interpretar + tag [CONFIRMAR: descreve dúvida]
- Dado em conflito entre fontes → usa as Notas Manuscritas como primárias + tag [REVISAR DADO]
- Nunca inventes diagnósticos, valores cefalométricos ou procedimentos não mencionados
- Inclui SEMPRE no campo exame_clinico: "Análise facial sujeita a confirmação após registo fotográfico definitivo."
- Se não houver fotografias, nota isso explicitamente

# TOM E ESTILO
Formal, clínico, directo. Terminologia ortodôntica correcta em PT-PT:
"classe II esquelética severa", "overjet acentuado", "arcos NiTi termoactivados",
"aparelho fixo autoligado", "build-ups oclusais", "frenectomia labial superior".
Sem linguagem comercial. Sem anglicismos desnecessários.
`.trim();

// ── Helpers ──────────────────────────────────────────────────────────────────

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error(
      'API_KEY_MISSING: define API_KEY ou VITE_API_KEY no ficheiro .env.local'
    );
  }
  return new GoogleGenAI({ apiKey });
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () =>
      reject(new Error(`Erro ao ler ficheiro: ${file.name}`));
    reader.readAsDataURL(file);
  });

const ROLE_LABEL: Record<OrthoInputFile['role'], string> = {
  notas: 'Notas Manuscritas / Registo Clínico',
  webceph: 'Análise Cefalométrica WebCeph',
  fotografia: 'Fotografia Clínica',
};

// ── Public types & function ───────────────────────────────────────────────────

export interface OrthoInputFile {
  file: File;
  /** Semantic role of this document — used to build the prompt context */
  role: 'notas' | 'webceph' | 'fotografia';
}

/**
 * Sends all provided clinical files to Gemini in a single multimodal prompt
 * and returns the raw text response (expected to be JSON).
 */
export const analyzeOrthoFiles = async (
  files: OrthoInputFile[],
  additionalContext?: string
): Promise<string> => {
  if (files.length === 0) throw new Error('Nenhum ficheiro fornecido para análise.');

  const ai = getClient();

  type TextPart = { text: string };
  type DataPart = { inlineData: { mimeType: string; data: string } };
  const parts: Array<TextPart | DataPart> = [];

  // Opening instruction
  parts.push({
    text: [
      'Analisa os documentos clínicos em anexo e gera o relatório ortodôntico em JSON.',
      additionalContext
        ? `\nContexto adicional fornecido pela médica:\n${additionalContext}`
        : '',
      '\nDocumentos fornecidos:',
      ...files.map((f, i) => `  ${i + 1}. ${ROLE_LABEL[f.role]} — ${f.file.name}`),
    ]
      .filter(Boolean)
      .join('\n'),
  });

  // Attach each file with its label
  for (const { file, role } of files) {
    const base64 = await fileToBase64(file);
    parts.push({ text: `\n=== ${ROLE_LABEL[role]} ===` });
    parts.push({ inlineData: { mimeType: file.type, data: base64 } });
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    config: {
      systemInstruction: ORTHO_SYSTEM_PROMPT,
      temperature: 0.2, // low temperature for clinical accuracy
    },
    contents: [{ role: 'user', parts }],
  });

  const text = response.text ?? '';
  if (!text.trim()) {
    throw new Error('Resposta vazia da IA. Verifica os ficheiros e tenta novamente.');
  }
  return text;
};
