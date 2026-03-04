import React, { forwardRef } from 'react';
import { OrthoReport } from '../services/ortho/report-builder';

interface OrthoReportTemplateProps {
  report: OrthoReport;
}

// ── Inline SVG: Monogram "SM" ─────────────────────────────────────────────────
// Thin-stroke elegant letterforms inside a fine circle border
const MonogramSVG: React.FC = () => (
  <svg
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Monograma SM"
  >
    {/* Outer circle */}
    <circle cx="36" cy="36" r="34" stroke="#111111" strokeWidth="0.75" />

    {/* Letter S — thin flowing stroke */}
    <path
      d="M20 26
         C20 22.5 23 20 27.5 20
         C32 20 35 22.5 35 26
         C35 29.5 31 31 27 32.5
         C23 34 19 36 19 40
         C19 44 22.5 46 27 46
         C31.5 46 35 43.5 35 40"
      stroke="#111111"
      strokeWidth="1.35"
      strokeLinecap="round"
      fill="none"
    />

    {/* Letter M — structured thin strokes */}
    <path
      d="M39 46 L39 22 L48 36 L57 22 L57 46"
      stroke="#111111"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// ── Inline SVG: Signature ─────────────────────────────────────────────────────
// Fluid, manuscript-style "Dra. Shamila Modan" with decorative underline flourish
const SignatureSVG: React.FC = () => (
  <svg
    width="248"
    height="58"
    viewBox="0 0 248 58"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Assinatura Dra. Shamila Modan"
  >
    {/* "Dra." — small, regular italic */}
    <text
      x="4"
      y="28"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontSize="12"
      fontStyle="italic"
      fontWeight="400"
      fill="#111111"
      letterSpacing="0.4"
    >
      Dra.
    </text>

    {/* "Shamila Modan" — larger, light italic, signature-like */}
    <text
      x="38"
      y="32"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontSize="20"
      fontStyle="italic"
      fontWeight="300"
      fill="#111111"
      letterSpacing="0.7"
    >
      Shamila Modan
    </text>

    {/* Underline flourish — gently curved, tapered */}
    <path
      d="M2 43 Q62 40 130 43 Q185 45.5 243 42"
      stroke="#111111"
      strokeWidth="0.65"
      strokeLinecap="round"
      fill="none"
    />

    {/* Terminal dot at end of flourish */}
    <circle cx="244" cy="42" r="1.1" fill="#111111" />
  </svg>
);

// ── Template component ────────────────────────────────────────────────────────

const OrthoReportTemplate = forwardRef<HTMLDivElement, OrthoReportTemplateProps>(
  ({ report }, ref) => {
    const dateLabel =
      report.cabecalho.data || new Date().toLocaleDateString('pt-PT');

    return (
      <div ref={ref}>
        <style>{`
          /* ── Print page setup ── */
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: A4 portrait;
              margin: 2cm;
            }
          }

          /* ── Document shell ── */
          .ortho-doc {
            width: 210mm;
            min-height: 297mm;
            padding: 2cm 2.2cm;
            background: #ffffff;
            color: #111111;
            /* Body font: Georgia — available offline as system font */
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.75;
            box-sizing: border-box;
            margin: 0 auto;
            /* Screen shadow — suppressed in print */
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
          }

          @media print {
            .ortho-doc {
              box-shadow: none;
              padding: 0;
              width: 100%;
            }
          }

          /* ── Headings: Trebuchet MS ≈ Montserrat (offline, geometric sans) ── */
          .ortho-doc h1,
          .ortho-doc h2,
          .ortho-doc h3,
          .ortho-doc .label-caps {
            font-family: 'Trebuchet MS', 'Arial Narrow', Arial, sans-serif;
            letter-spacing: 0.06em;
          }

          /* ── Section titles with #F5F5F5 background + left rule ── */
          .section-title {
            background-color: #F5F5F5;
            font-family: 'Trebuchet MS', Arial, sans-serif;
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 0.20em;
            text-transform: uppercase;
            color: #333333;
            padding: 5px 10px 5px 10px;
            margin: 0 0 14px 0;
            border-left: 2.5px solid #111111;
            display: block;
          }

          /* ── Body paragraphs ── */
          .ortho-doc p {
            margin: 0 0 10px 0;
            text-align: justify;
            hyphens: auto;
          }

          /* ── Horizontal rules — no vertical borders ── */
          .h-rule {
            width: 100%;
            border: none;
            border-top: 0.5px solid #cccccc;
            margin: 20px 0;
          }

          /* ── Patient info grid ── */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 6px;
          }

          .info-label {
            font-family: 'Trebuchet MS', Arial, sans-serif;
            font-size: 7pt;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #888888;
            display: block;
            margin-bottom: 2px;
          }

          .info-value {
            font-size: 11.5pt;
            font-weight: 400;
            color: #111111;
          }

          /* ── Treatment plan list — no vertical borders ── */
          .plan-list {
            list-style: none;
            margin: 0;
            padding: 0;
          }

          .plan-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 6px 0;
            /* Only horizontal separator */
            border-bottom: 0.5px solid #eeeeee;
            font-size: 10pt;
            line-height: 1.6;
          }

          .plan-list li:last-child {
            border-bottom: none;
          }

          /* Numbered circle bullet */
          .plan-bullet {
            min-width: 20px;
            width: 20px;
            height: 20px;
            border: 1px solid #333333;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 7pt;
            font-weight: 700;
            font-family: 'Trebuchet MS', Arial, sans-serif;
            margin-top: 1px;
            color: #111111;
          }

          /* ── Disclaimer ── */
          .disclaimer {
            font-size: 8pt;
            color: #888888;
            font-style: italic;
            margin-top: 18px;
            padding-top: 14px;
            border-top: 0.5px solid #eeeeee;
            text-align: justify;
          }

          /* ── Footer grid ── */
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 24px;
            align-items: flex-end;
          }

          .footer-clinic {
            font-family: 'Trebuchet MS', Arial, sans-serif;
            font-size: 8pt;
            color: #888888;
            line-height: 1.6;
          }

          .footer-clinic strong {
            color: #555555;
          }
        `}</style>

        <div className="ortho-doc">
          {/* ── HEADER ──────────────────────────────────────────────── */}
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '26px',
            }}
          >
            {/* Left: SVG Monogram */}
            <MonogramSVG />

            {/* Right: Title + meta */}
            <div style={{ textAlign: 'right' }}>
              <h1
                style={{
                  fontFamily: "'Trebuchet MS', Arial, sans-serif",
                  fontSize: '21pt',
                  fontWeight: 200,
                  letterSpacing: '0.12em',
                  margin: '0 0 14px 0',
                  color: '#111111',
                  textTransform: 'uppercase',
                }}
              >
                Relatório Ortodôntico
              </h1>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '3px',
                  fontFamily: "'Trebuchet MS', Arial, sans-serif",
                  fontSize: '7.5pt',
                  color: '#888888',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                <span>
                  Data:{' '}
                  <strong style={{ color: '#111111' }}>{dateLabel}</strong>
                </span>
                <span>Dra. Shamila Modan — OrMM nº 3266</span>
              </div>
            </div>
          </header>

          <hr className="h-rule" />

          {/* ── PATIENT INFO ─────────────────────────────────────────── */}
          <div className="info-grid" style={{ marginBottom: '22px' }}>
            <div>
              <span className="info-label">Paciente</span>
              <span className="info-value">{report.cabecalho.nome || '—'}</span>
            </div>
            <div>
              <span className="info-label">Idade</span>
              <span className="info-value">{report.cabecalho.idade || '—'}</span>
            </div>
          </div>

          <hr className="h-rule" />

          {/* ── DIAGNÓSTICO ──────────────────────────────────────────── */}
          <section style={{ marginBottom: '22px' }}>
            <span className="section-title">Diagnóstico</span>
            <p>{report.diagnostico || '—'}</p>
          </section>

          {/* ── EXAME CLÍNICO ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '22px' }}>
            <span className="section-title">Exame Clínico</span>
            <p>{report.exame_clinico || '—'}</p>
          </section>

          {/* ── PLANO DE TRATAMENTO ───────────────────────────────────── */}
          <section style={{ marginBottom: '32px' }}>
            <span className="section-title">Plano de Tratamento</span>
            <ul className="plan-list">
              {report.plano_tratamento.length > 0 ? (
                report.plano_tratamento.map((step, i) => (
                  <li key={i}>
                    <span className="plan-bullet">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))
              ) : (
                <li>
                  <span style={{ color: '#888' }}>—</span>
                </li>
              )}
            </ul>
          </section>

          {/* ── DISCLAIMER ───────────────────────────────────────────── */}
          <p className="disclaimer">
            Análise facial sujeita a confirmação após registo fotográfico definitivo.
            Este relatório foi preparado com base nos dados clínicos disponíveis e
            deverá ser validado pela Dra. Shamila Modan antes de qualquer comunicação
            ao paciente ou início de tratamento.
          </p>

          {/* ── SPACER ───────────────────────────────────────────────── */}
          <div style={{ minHeight: '48px' }} />

          {/* ── FOOTER ───────────────────────────────────────────────── */}
          <footer
            style={{
              marginTop: '40px',
              paddingTop: '18px',
              borderTop: '0.5px solid #cccccc',
            }}
          >
            <div className="footer-grid">
              {/* Left: clinic info */}
              <div className="footer-clinic">
                <strong>Dra. Shamila Modan</strong>
                <br />
                Médica Dentista — Pós-Graduanda em Ortodontia
                <br />
                OrMM nº 3266 · +258 84 616 6066
                <br />
                modanshamila@gmail.com · Maputo, Moçambique
              </div>

              {/* Right: SVG signature */}
              <SignatureSVG />
            </div>
          </footer>
        </div>
      </div>
    );
  }
);

OrthoReportTemplate.displayName = 'OrthoReportTemplate';
export default OrthoReportTemplate;
