import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Wallet, X, Calendar, Landmark, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CLINICS } from '../constants';
import { Consultation, Clinic } from '../types';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatMoney = (val: number) =>
  (val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' MT';

const formatNum = (val: number) => formatMoney(val || 0).replace(' MT', '');

const formatDateBr = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Dias em aberto entre a data original e hoje
const diasEmAberto = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  return diff < 0 ? 0 : diff;
};

const parseMoneyInput = (str: string): number => {
  if (!str) return 0;
  let s = String(str).replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const Pendentes: React.FC = () => {
  const { consultations, registarPagamentoRemanescente } = useData();

  const [clinicFilter, setClinicFilter] = useState<'todas' | Clinic>('todas');

  // Modal de registo de pagamento
  const [paying, setPaying] = useState<Consultation | null>(null);
  const [payDate, setPayDate] = useState(getTodayStr());
  const [payValue, setPayValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendentes = useMemo(() => {
    return consultations
      .filter(c => c.estadoPagamento === 'pendente' && (c.valorPendente || 0) > 0.005)
      .filter(c => clinicFilter === 'todas' || c.clinic === clinicFilter)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')); // mais antigos primeiro
  }, [consultations, clinicFilter]);

  const totalEmAberto = useMemo(
    () => pendentes.reduce((sum, c) => sum + (c.valorPendente || 0), 0),
    [pendentes]
  );

  const recebidoAteAgora = (c: Consultation): number => {
    if (c.valorTratamento != null) return Math.max(0, Math.round((c.valorTratamento - (c.valorPendente || 0)) * 100) / 100);
    return c.totalValue || 0;
  };

  const openModal = (c: Consultation) => {
    setPaying(c);
    setPayDate(getTodayStr());
    setPayValue(c.valorPendente || 0);
    setModalError(null);
  };

  const closeModal = () => {
    setPaying(null);
    setIsSaving(false);
    setModalError(null);
  };

  const handleConfirm = async () => {
    if (!paying || isSaving) return;
    const valor = Math.round(payValue * 100) / 100;
    if (valor <= 0) {
      setModalError('Escreve o valor que recebeste (maior que zero).');
      return;
    }
    if (valor > (paying.valorPendente || 0) + 0.005) {
      setModalError(`Não podes receber mais do que o pendente (${formatMoney(paying.valorPendente || 0)}).`);
      return;
    }
    setIsSaving(true);
    setModalError(null);
    try {
      const nome = paying.patientName;
      const liquidou = valor >= (paying.valorPendente || 0) - 0.005;
      await registarPagamentoRemanescente(paying.id, payDate, valor);
      setFeedback(
        liquidou
          ? `Recebido ${formatMoney(valor)} de ${nome}. Conta liquidada.`
          : `Recebido ${formatMoney(valor)} de ${nome}. Ficam ${formatMoney((paying.valorPendente || 0) - valor)} por receber.`
      );
      closeModal();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      // As mensagens da função vêm já em linguagem simples
      setModalError(err?.message || 'Não foi possível registar o pagamento. Tenta outra vez.');
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-40 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-4 py-3 flex items-center gap-3 pt-safe">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-semibold text-lg text-slate-800">Pendentes</h1>
      </header>

      <div className="p-4 max-w-xl mx-auto space-y-4">

        {/* Feedback de sucesso */}
        {feedback && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-teal-600 mt-0.5 shrink-0" />
            <p className="text-sm text-teal-800 leading-relaxed">{feedback}</p>
          </div>
        )}

        {/* Total em aberto */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Wallet size={14} /> Total em aberto
          </div>
          <div className="text-3xl font-bold tracking-tight">{formatMoney(totalEmAberto)}</div>
          <p className="text-xs text-slate-400 mt-1">
            {pendentes.length} {pendentes.length === 1 ? 'conta por receber' : 'contas por receber'}
          </p>
        </div>

        {/* Filtro por clínica */}
        <div className="bg-gray-200/50 p-1 rounded-xl flex">
          {([
            { key: 'todas', label: 'Todas' },
            { key: CLINICS.SOMMERSCHIELD, label: 'Sommerschield' },
            { key: CLINICS.BAIXA, label: 'Baixa' }
          ] as { key: 'todas' | Clinic; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setClinicFilter(opt.key)}
              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                clinicFilter === opt.key ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {pendentes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-teal-200" />
            <p className="text-sm font-medium text-slate-500">Não há nada por receber.</p>
            <p className="text-xs mt-1">Está tudo em dia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map(c => {
              const dias = diasEmAberto(c.date);
              const alerta = dias > 60;
              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm ${alerta ? 'border-red-200' : 'border-gray-100'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{c.patientName}</h3>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {formatDateBr(c.date)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${c.clinic === CLINICS.SOMMERSCHIELD ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                          {c.clinic === CLINICS.SOMMERSCHIELD ? 'Somm.' : 'Baixa'}
                        </span>
                      </div>
                      {(c.seguradora || c.guiaNumero) && (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
                          <Landmark size={11} className="text-slate-400" />
                          <span className="font-medium">{c.seguradora || 'Seguro'}</span>
                          {c.guiaNumero && <span className="text-gray-400">· Guia {c.guiaNumero}</span>}
                        </div>
                      )}
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${alerta ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {alerta && <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />}
                      há {dias} {dias === 1 ? 'dia' : 'dias'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Já recebido</p>
                      <p className="text-sm font-medium text-slate-600">{formatMoney(recebidoAteAgora(c))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amber-500 uppercase font-bold">Falta receber</p>
                      <p className="text-base font-bold text-amber-600">{formatMoney(c.valorPendente || 0)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openModal(c)}
                    className="mt-3 w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet size={18} /> Registar pagamento
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Registar pagamento do remanescente */}
      {paying && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-xl text-slate-800">Registar pagamento</h3>
              <button onClick={closeModal} className="p-2 -mr-2 -mt-1 text-gray-400 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              {paying.patientName} — falta receber <strong className="text-amber-600">{formatMoney(paying.valorPendente || 0)}</strong>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Data do pagamento</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-base font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Valor recebido</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-teal-500">
                  <input
                    inputMode="decimal"
                    value={formatNum(payValue)}
                    onChange={(e) => setPayValue(parseMoneyInput(e.target.value))}
                    className="flex-1 bg-transparent outline-none text-slate-800 font-bold text-lg min-w-0"
                  />
                  <span className="text-sm font-bold text-gray-400">MT</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Já vem preenchido com o total em falta. Muda se a paciente pagou só uma parte.
                </p>
              </div>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 leading-relaxed">{modalError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3.5 text-slate-500 font-medium hover:bg-gray-50 rounded-xl text-base">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 text-base shadow-lg shadow-teal-600/20"
              >
                {isSaving ? 'A guardar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pendentes;
