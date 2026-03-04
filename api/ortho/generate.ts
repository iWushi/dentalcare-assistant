import { analyzeOrthoFiles, OrthoInputFile } from '../../services/ortho/gemini';
import { parseReportJson, OrthoReport } from '../../services/ortho/report-builder';

export type { OrthoInputFile };
export type { OrthoReport };

/**
 * High-level orchestrator:
 * Sends files to Gemini and returns a validated, typed OrthoReport object.
 */
export const generateOrthoReport = async (
  files: OrthoInputFile[],
  context?: string
): Promise<OrthoReport> => {
  const rawText = await analyzeOrthoFiles(files, context);
  return parseReportJson(rawText);
};
