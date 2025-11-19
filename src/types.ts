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
  id: string;
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

export type Clinic = 'Sommerschield' | 'Baixa';

export interface Consultation {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  createdAt?: string; // YYYY-MM-DD HH:MM
  patientId: string;
  patientName: string;
  clinic: Clinic;
  procedures: Procedure[];
  totalValue: number;
  doctorCommission: number;
  hasPendingLab: boolean;
}