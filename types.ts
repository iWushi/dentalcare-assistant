
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
  createdAt?: string;
  updatedAt?: string;
}