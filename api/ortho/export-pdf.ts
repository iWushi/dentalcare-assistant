/**
 * Triggers the browser print dialog (→ Save as PDF) with a patient-specific
 * document title so the browser suggests a meaningful filename.
 */
export const triggerPdfExport = (printFn: () => void, patientName: string): void => {
  const prev = document.title;
  const safeName = patientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const date = new Date().toISOString().split('T')[0];
  document.title = `Relatorio_Ortodontico_${safeName}_${date}`;
  printFn();
  setTimeout(() => {
    document.title = prev;
  }, 1500);
};
