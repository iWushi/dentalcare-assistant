export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface ProcedureCategory {
  code: string;
  name: string;
  commission: number; // 0.40 or 0.65
  color: string;
}

export interface ChartDataPoint {
  name: string;
  doctor: number;
  clinic: number;
  lab: number;
}

export interface Patient {
  id: string; // UUID do Supabase
  name: string;
  phone: string;
  notes: string;
  createdAt: Date;
}

export interface Procedure {
  code: string;
  name: string;
  value: number;
  labCost?: number;
  isLabPending?: boolean;
}

// Interface nova para a tabela 'precos' da BD
export interface DbPrice {
  id: string; // ex: 'A1', 'B2'
  categoria: string;
  descricao: string;
  valor_sem_iva: number;
  valor_com_iva: number;
  observacao?: string;
  ativo: boolean;
}

export type Clinic = 'Sommerschield' | 'Baixa';

// --- PAGAMENTOS PARCIAIS ---
// Tipo de cada linha de pagamento:
//  integral      - consulta paga por inteiro (o caso normal)
//  convencao     - parte paga agora (seguradora/convenção) de um tratamento em partes
//  beneficiario  - parte do beneficiário (reservado; hoje fica registada como pendente na linha da convenção)
//  remanescente  - pagamento posterior que abate ao pendente
export type TipoPagamento = 'integral' | 'convencao' | 'beneficiario' | 'remanescente';
export type EstadoPagamento = 'pendente' | 'liquidado';

export interface Consultation {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  createdAt?: string; // ISO Timestamp
  patientId: string;
  patientName: string;
  clinic: Clinic;
  procedures: Procedure[];
  totalValue: number;
  doctorCommission: number; // Mapeado para valor_final_dra
  hasPendingLab: boolean; // Calculado via JSONB
  notes?: string; // Mapeado para observacoes

  // New Reminder Fields
  reminder?: string; // Mapped to 'lembrete' column
  hasReminder?: boolean; // Computed based on reminder text

  // --- Campos de Pagamentos Parciais (colunas novas em 'consultas') ---
  pagamentoGrupoId?: string;      // pagamento_grupo_id — liga as prestações do mesmo tratamento
  tipoPagamento?: TipoPagamento;  // tipo_pagamento
  valorTratamento?: number;       // valor_tratamento — valor cheio (referência; NUNCA somado em relatórios)
  valorPendente?: number;         // valor_pendente
  estadoPagamento?: EstadoPagamento; // estado_pagamento
  seguradora?: string;            // seguradora
  guiaNumero?: string;            // guia_numero
}

// --- NOVOS TIPOS PARA ORÇAMENTOS ---

export interface BudgetProcedure {
  code: string;
  name: string;
  unitValue: number;
  quantity: number;
  total: number;
}

export interface BudgetPhase {
  id: string;
  name: string;
  procedures: BudgetProcedure[];
  subtotal: number;
}

export interface Budget {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  number: string; // ORC-YYYYMMDD-XXX
  status: 'rascunho' | 'finalizado';
  phases: BudgetPhase[];
  totalValue: number;
  discountPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}