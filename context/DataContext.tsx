
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, Consultation, DbPrice, Procedure } from '../types';
import { supabase } from '../services/supabase';

interface DataContextType {
  patients: Patient[];
  consultations: Consultation[];
  availableProcedures: DbPrice[]; // Preços vindos da BD
  isLoading: boolean;
  error: string | null;
  getPatientById: (id: string) => Patient | undefined;
  getConsultationsByPatient: (patientId: string) => Consultation[];
  addConsultation: (consultation: Consultation) => Promise<void>;
  updateConsultation: (id: string, updates: Partial<Consultation>) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<void>;
  mergePatients: (targetId: string, sourceId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper para limpar números vindos da BD
const parseCurrency = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Converte para string e limpa espaços não quebráveis e normais
  let str = String(value).trim().replace(/\s/g, '').replace(/\u00A0/g, '');
  
  // Se for formato PT/MZ "1.500,00" ou "1 500,00"
  if (str.includes(',') && str.includes('.')) {
    // Assumindo que o ultimo separador é o decimal se for vírgula
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    // Se for formato "1500,00"
    str = str.replace(',', '.');
  }
  
  // Remove tudo que não for número, ponto ou menos
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper robusto para garantir Data YYYY-MM-DD consistente
const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  try {
    let isoStr = '';
    if (dateStr instanceof Date) {
       isoStr = dateStr.toISOString().split('T')[0];
       return isoStr;
    } 
    
    if (typeof dateStr === 'string') {
       let cleanDate = dateStr.trim();
       
       // Formato Excel/CSV DD/MM/YYYY ou DD-MM-YYYY
       if (cleanDate.includes('/')) {
          const parts = cleanDate.split('/');
          if (parts.length === 3) {
             // Assumindo DD/MM/YYYY
             const d = parts[0].padStart(2, '0');
             const m = parts[1].padStart(2, '0');
             const y = parts[2];
             // Se o ano for 2 digitos (ex: 25), assumir 2025
             const fullYear = y.length === 2 ? `20${y}` : y;
             return `${fullYear}-${m}-${d}`;
          }
       }

       // Formato YYYY-MM-DD
       const parts = cleanDate.split('T')[0].split('-');
       if (parts.length === 3) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
       }
       
       return cleanDate.split('T')[0];
    }
    return '';
  } catch (e) {
    console.warn("Erro parsing data", dateStr);
    return '';
  }
};

// Helper Crítico: Parse Robust de Procedimentos
// Lida com: Array de Strings, Array de Objectos, String JSON, String Suja
const parseProceduresRobust = (raw: any, totalValue: number, codeToNameMap: Map<string, string>): Procedure[] => {
  let items: any[] = [];

  try {
    // 1. Normalizar entrada para array
    if (Array.isArray(raw)) {
      items = raw;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
         try {
           const parsed = JSON.parse(trimmed);
           items = Array.isArray(parsed) ? parsed : [parsed];
         } catch {
           // JSON parse falhou (string malformada ou cortada).
           // Tentar extrair códigos via Regex (pinça cirúrgica)
           // Procura padrões como "code":"A1" ou code:'A1' ou code: A1
           const regex = /["']?code["']?\s*:\s*["']?([^"'},\]\s]+)["']?/gi;
           let match;
           const extracted = [];
           while ((match = regex.exec(trimmed)) !== null) {
               if (match[1] && match[1].length < 10) {
                   extracted.push({ code: match[1], name: 'Recuperado' });
               }
           }
           
           if (extracted.length > 0) {
               items = extracted;
           } else if (!trimmed.includes(':') && !trimmed.includes('{')) {
               // Se não tem cara de JSON, assume separado por vírgula
               items = trimmed.split(',');
           } else {
               // É lixo JSON irrecuperável
               items = []; 
           }
         }
      } else {
         items = trimmed.split(',');
      }
    } else if (raw) {
      items = [raw];
    }
  } catch (e) {
    console.error("Erro crítico a normalizar procedimentos", e);
    items = [];
  }

  // 2. Mapear cada item para a estrutura Procedure
  return items.map((item, index) => {
      if (!item) return null;

      // Caso A: Objecto
      if (typeof item === 'object' && item !== null) {
          let code = item.code || item.id;
          
          // Validação rígida: Se o código for um objecto ou muito longo, é lixo
          if (!code || typeof code !== 'string' || code.length > 15 || code.includes('{') || code.includes('[')) {
              return null; 
          }

          const name = item.name || item.descricao || codeToNameMap.get(String(code).toUpperCase()) || String(code);
          
          return {
             code: String(code),
             name: String(name),
             value: Number(item.value) || (index === 0 ? totalValue : 0),
             labCost: Number(item.labCost) || 0,
             isLabPending: !!item.isLabPending
          };
      }

      // Caso B: String
      if (typeof item === 'string') {
          let cleanStr = item.trim();

          // Se a string começar por { ou [, é um JSON stringificado que sobreviveu
          if (cleanStr.startsWith('{') || cleanStr.startsWith('[')) {
              // Tentar regex na string individual
              const match = cleanStr.match(/["']?code["']?\s*:\s*["']?([^"'},\]\s]+)["']?/i);
              if (match && match[1] && match[1].length < 10) {
                  const c = match[1].toUpperCase();
                  const n = codeToNameMap.get(c) || c;
                  return { code: c, name: n, value: 0, labCost: 0, isLabPending: false };
              }
              return null; // Lixo
          }

          // Limpeza final de aspas e brackets
          cleanStr = cleanStr.replace(/['"\[\]]/g, ''); 
          
          // Se ainda tiver caracteres de JSON ou for muito longa, ignorar
          if (cleanStr.length > 15 || cleanStr.includes(':') || cleanStr.includes('{')) return null;

          const code = cleanStr.toUpperCase();
          const description = codeToNameMap.get(code) || cleanStr;

          return {
              code: code,
              name: description,
              value: index === 0 ? totalValue : 0, // Legado assume valor total no primeiro
              labCost: 0,
              isLabPending: false
          };
      }

      return null;
  }).filter(Boolean) as Procedure[];
};


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availableProcedures, setAvailableProcedures] = useState<DbPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Data from Supabase ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Preços
        const { data: pricesData, error: pricesError } = await supabase
          .from('precos')
          .select('*')
          .eq('ativo', true)
          .order('id');

        if (pricesError) throw pricesError;
        
        // Criar mapa de códigos
        const codeToNameMap = new Map<string, string>();
        pricesData?.forEach((p: any) => {
            if(p.id) codeToNameMap.set(p.id.trim().toUpperCase(), p.descricao);
        });

        setAvailableProcedures(pricesData || []);

        // 2. Fetch Pacientes
        const { data: patientsData, error: patientsError } = await supabase
          .from('pacientes')
          .select('*')
          .order('nome');

        if (patientsError) throw patientsError;

        const formattedPatients: Patient[] = (patientsData || []).map((p: any) => ({
          id: p.id,
          name: p.nome,
          phone: p.telefone || '',
          notes: p.notas_gerais || '',
          createdAt: new Date(p.criado_em)
        }));

        // 3. Fetch Consultas
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultas')
          .select('*')
          .order('data', { ascending: false });

        if (consultationsError) throw consultationsError;

        const formattedConsultations: Consultation[] = (consultationsData || []).map((c: any) => {
          const safeTotalValue = parseCurrency(c.valor_total);
          const safeDoctorCommission = parseCurrency(c.valor_final_dra);
          const safeDate = normalizeDate(c.data);

          // Parse Robusto dos Procedimentos
          const proceduresList = parseProceduresRobust(
              c.procedimentos, 
              safeTotalValue, 
              codeToNameMap
          );

          // Check pending based on object flags
          const hasPendingLab = Array.isArray(proceduresList) 
            ? proceduresList.some(p => p.isLabPending && (!p.labCost || p.labCost === 0))
            : false;

          return {
            id: c.id,
            date: safeDate,
            createdAt: c.criado_em,
            patientId: c.paciente_id,
            patientName: c.paciente_nome, 
            clinic: c.clinica,
            procedures: proceduresList,
            totalValue: safeTotalValue,
            doctorCommission: safeDoctorCommission,
            hasPendingLab: hasPendingLab,
            notes: c.observacoes
          };
        });

        setPatients(formattedPatients);
        setConsultations(formattedConsultations);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPatientById = (id: string) => patients.find(p => p.id === id);
  
  const getConsultationsByPatient = (patientId: string) => 
    consultations.filter(c => c.patientId === patientId);

  const addConsultation = async (consultation: Consultation) => {
    try {
      // Calculate total lab cost to store in numeric column
      const totalLabCost = consultation.procedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
      
      // Re-calculate to be safe for DB consistency
      const totalVal = consultation.totalValue;
      const valorSemIva = (totalVal - totalLabCost) / 1.05; 

      const dbPayload = {
        id: consultation.id,
        data: consultation.date,
        clinica: consultation.clinic,
        paciente_id: consultation.patientId,
        paciente_nome: consultation.patientName,
        procedimentos: consultation.procedures, // Save objects to JSONB
        valor_total: totalVal,
        custo_lab: totalLabCost, // New Column
        valor_sem_iva: valorSemIva,
        valor_final_dra: consultation.doctorCommission,
        observacoes: consultation.notes || '',
        criado_em: new Date().toISOString()
      };

      const { error } = await supabase
        .from('consultas')
        .insert([dbPayload]);

      if (error) throw error;
      setConsultations(prev => [consultation, ...prev]);
      
    } catch (err: any) {
      console.error('Error adding consultation:', err);
      alert(`Erro ao guardar consulta: ${err.message}`);
      throw err;
    }
  };

  const updateConsultation = async (id: string, updates: Partial<Consultation>) => {
    try {
      const dbUpdates: any = {};
      
      // Helper to get current consultation state to merge procedures if needed
      const current = consultations.find(c => c.id === id);
      
      if (updates.date) dbUpdates.data = updates.date;
      if (updates.clinic) dbUpdates.clinica = updates.clinic;
      if (updates.patientName) dbUpdates.paciente_nome = updates.patientName;
      if (updates.patientId) dbUpdates.paciente_id = updates.patientId;
      
      if (updates.procedures) {
          dbUpdates.procedimentos = updates.procedures;
          // Recalculate lab cost sum
          const totalLabCost = updates.procedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
          dbUpdates.custo_lab = totalLabCost;
      }

      if (updates.totalValue !== undefined) {
          dbUpdates.valor_total = updates.totalValue;
          // We need totalLabCost to calculate sem_iva correctly
          const totalLabCost = updates.procedures 
             ? updates.procedures.reduce((sum, p) => sum + (p.labCost || 0), 0) 
             : (current?.procedures || []).reduce((sum, p) => sum + (p.labCost || 0), 0);
             
          dbUpdates.valor_sem_iva = (updates.totalValue - totalLabCost) / 1.05;
      }

      if (updates.doctorCommission !== undefined) dbUpdates.valor_final_dra = updates.doctorCommission;
      if (updates.notes !== undefined) dbUpdates.observacoes = updates.notes;

      const { error } = await supabase
        .from('consultas')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    } catch (err: any) {
       console.error('Error updating consultation:', err);
       alert(`Erro ao actualizar: ${err.message}`);
       throw err;
    }
  };

  const deleteConsultation = async (id: string) => {
    try {
        const { error } = await supabase
          .from('consultas')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setConsultations(prev => prev.filter(c => c.id !== id));

    } catch (err: any) {
        console.error('Error deleting consultation:', err);
        alert(`Erro ao apagar: ${err.message}`);
        throw err;
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient | null> => {
    try {
      const dbPayload = {
        nome: patientData.name,
        telefone: patientData.phone,
        notas_gerais: patientData.notes
      };

      const { data, error } = await supabase
        .from('pacientes')
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newPatient: Patient = {
          id: data.id,
          name: data.nome,
          phone: data.telefone,
          notes: data.notas_gerais,
          createdAt: new Date(data.criado_em)
        };
        setPatients(prev => [...prev, newPatient]);
        return newPatient;
      }
      return null;

    } catch (err: any) {
      console.error('Error adding patient:', err);
      alert(`Erro ao criar paciente: ${err.message}`);
      return null;
    }
  };

  const deletePatient = async (id: string) => {
    try {
        const { error } = await supabase
          .from('pacientes')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
        console.error('Error deleting patient:', err);
        throw err;
    }
  };

  const mergePatients = async (targetId: string, sourceId: string) => {
    try {
      const targetPatient = patients.find(p => p.id === targetId);
      if (!targetPatient) throw new Error("Paciente destino não encontrado");

      // 1. Actualizar todas as consultas do source para o target
      const { error: updateError } = await supabase
        .from('consultas')
        .update({ 
          paciente_id: targetId,
          paciente_nome: targetPatient.name 
        })
        .eq('paciente_id', sourceId);

      if (updateError) throw updateError;

      // 2. Apagar o paciente antigo
      await deletePatient(sourceId);

      // 3. Actualizar estado local (consultas)
      setConsultations(prev => prev.map(c => 
         c.patientId === sourceId 
           ? { ...c, patientId: targetId, patientName: targetPatient.name }
           : c
      ));

    } catch (err: any) {
      console.error('Error merging patients:', err);
      alert(`Erro ao fundir pacientes: ${err.message}`);
      throw err;
    }
  };

  return (
    <DataContext.Provider value={{
      patients,
      consultations,
      availableProcedures,
      isLoading,
      error,
      getPatientById,
      getConsultationsByPatient,
      addConsultation,
      updateConsultation,
      deleteConsultation,
      addPatient,
      deletePatient,
      mergePatients
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within an DataProvider');
  }
  return context;
};
