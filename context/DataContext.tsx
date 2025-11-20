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
  
  let str = String(value).trim().replace(/\s/g, '').replace(/\u00A0/g, '');
  
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
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
       if (cleanDate.includes('/')) {
          const parts = cleanDate.split('/');
          if (parts.length === 3) {
             const d = parts[0].padStart(2, '0');
             const m = parts[1].padStart(2, '0');
             const y = parts[2];
             const fullYear = y.length === 2 ? `20${y}` : y;
             return `${fullYear}-${m}-${d}`;
          }
       }
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availableProcedures, setAvailableProcedures] = useState<DbPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Prices
        const { data: pricesData, error: pricesError } = await supabase
          .from('precos')
          .select('*')
          .eq('ativo', true)
          .order('id');
        if (pricesError) throw pricesError;
        
        // Map for fast lookup
        const pricesMap = new Map<string, DbPrice>();
        pricesData?.forEach((p: any) => {
            if(p.id) pricesMap.set(p.id.trim().toUpperCase(), p);
        });
        setAvailableProcedures(pricesData || []);

        // 2. Fetch Patients
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

        // 3. Fetch Consultations
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultas')
          .select('*')
          .order('data', { ascending: false });

        if (consultationsError) throw consultationsError;

        const formattedConsultations: Consultation[] = (consultationsData || []).map((c: any) => {
          const safeTotalValue = parseCurrency(c.valor_total);
          const safeDoctorCommission = parseCurrency(c.valor_final_dra);
          const safeDate = normalizeDate(c.data);
          const safeLabCost = parseCurrency(c.custo_lab); // Coluna custo_lab

          // Parse JSONB Procedures
          let rawProcs = c.procedimentos;
          let parsedProcs: any[] = [];

          if (Array.isArray(rawProcs)) {
             parsedProcs = rawProcs;
          } else if (typeof rawProcs === 'string') {
             try {
                // Tenta parsear se for JSON string ou trata como CSV antigo
                if (rawProcs.trim().startsWith('[')) {
                   parsedProcs = JSON.parse(rawProcs);
                } else {
                   // Legacy CSV string
                   parsedProcs = rawProcs.split(',').map(s => ({ codigo: s.trim() }));
                }
             } catch {
                parsedProcs = rawProcs.split(',').map(s => ({ codigo: s.trim() }));
             }
          }

          // Rehydrate Procedures List
          const proceduresList: Procedure[] = parsedProcs.map((p: any) => {
             // Suporte híbrido: p pode ser string ou objecto
             const code = typeof p === 'string' ? p : (p.codigo || p.code || '');
             const cleanCode = String(code).trim().toUpperCase();
             
             // Se o objecto JSONB tem 'tem_lab', usamos isso.
             let hasLab = false;
             if (typeof p === 'object' && p !== null && 'tem_lab' in p) {
                 hasLab = p.tem_lab;
             } else {
                 // Fallback legado ou nova inserção
                 hasLab = cleanCode.startsWith('J');
             }

             if (!cleanCode) return null;
             
             const priceInfo = pricesMap.get(cleanCode);
             const name = priceInfo ? priceInfo.descricao : (p.descricao || cleanCode);
             // Preço: Preferir o histórico guardado no JSON se existir, senão tabela actual
             const value = (typeof p === 'object' && p.valor) ? p.valor : (priceInfo ? priceInfo.valor_com_iva : 0);

             return {
                 code: cleanCode,
                 name: name,
                 value: value,
                 labCost: 0, // Visual placeholder, o custo real está na coluna da consulta
                 isLabPending: hasLab
             };
          }).filter(Boolean) as Procedure[];

          // Calcular estado de Pendência (Lógica Pedida)
          // Pendência se: Existe algum procedimento com 'tem_lab' = true E 'custo_lab' da consulta é 0 ou NULL
          const hasItemsWithLab = proceduresList.some(p => p.isLabPending);
          const isPending = hasItemsWithLab && (safeLabCost === 0 || !c.custo_lab);

          // Se tiver custo de laboratório e itens de laboratório, distribuímos visualmente para a UI
          // Apenas para UX, para o utilizador ver onde está o custo quando editar
          if (safeLabCost > 0) {
              const labItems = proceduresList.filter(p => p.isLabPending);
              if (labItems.length > 0) {
                  // Atribuir tudo ao primeiro item de Lab encontrado para simplificar edição
                  labItems[0].labCost = safeLabCost;
              } else if (proceduresList.length > 0) {
                  // Fallback
                  proceduresList[0].labCost = safeLabCost;
              }
          }

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
            hasPendingLab: isPending,
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
      // 1. Calcular Custo Lab Total a partir da UI
      const totalLabCost = consultation.procedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
      
      // 2. Preparar JSONB array: [{ codigo, descricao, tem_lab }]
      const procedimentosJson = consultation.procedures.map(p => ({
          codigo: p.code,
          descricao: p.name,
          tem_lab: p.isLabPending || false,
          valor: p.value // Guardar histórico de preço
      }));
      
      // 3. Calcular Valores Finais
      // FÓRMULA: ((Total - Lab) / 1.05) * 0.40
      const baseCalc = Math.max(0, consultation.totalValue - totalLabCost);
      const valorSemIva = baseCalc / 1.05;
      const valorFinalDra = valorSemIva * 0.40;

      const dbPayload = {
        id: consultation.id,
        data: consultation.date,
        clinica: consultation.clinic,
        paciente_id: consultation.patientId,
        paciente_nome: consultation.patientName,
        procedimentos: procedimentosJson, // JSONB
        valor_total: consultation.totalValue,
        custo_lab: totalLabCost, // Coluna numérica
        valor_sem_iva: valorSemIva,
        valor_final_dra: valorFinalDra,
        observacoes: consultation.notes || '',
        criado_em: new Date().toISOString()
      };

      const { error } = await supabase
        .from('consultas')
        .insert([dbPayload]);

      if (error) throw error;
      
      // Atualizar estado local com os valores calculados
      const newConsLocal = { ...consultation, doctorCommission: valorFinalDra, hasPendingLab: (totalLabCost === 0 && consultation.procedures.some(p => p.isLabPending)) };
      setConsultations(prev => [newConsLocal, ...prev]);
      
    } catch (err: any) {
      console.error('Error adding consultation:', err);
      alert(`Erro ao guardar consulta: ${err.message}`);
      throw err;
    }
  };

  const updateConsultation = async (id: string, updates: Partial<Consultation>) => {
    try {
      const dbUpdates: any = {};
      
      // Recuperar estado actual para merge
      const current = consultations.find(c => c.id === id);
      if (!current) throw new Error("Consulta não encontrada localmente");

      const mergedProcedures = updates.procedures || current.procedures;
      const mergedTotalValue = updates.totalValue !== undefined ? updates.totalValue : current.totalValue;

      // Se houver alterações que afectam valores
      if (updates.procedures || updates.totalValue !== undefined) {
          // Recalcular tudo
          const totalLabCost = mergedProcedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
          const baseCalc = Math.max(0, mergedTotalValue - totalLabCost);
          const valorSemIva = baseCalc / 1.05;
          const valorFinalDra = valorSemIva * 0.40;

          dbUpdates.valor_total = mergedTotalValue;
          dbUpdates.custo_lab = totalLabCost;
          dbUpdates.valor_sem_iva = valorSemIva;
          dbUpdates.valor_final_dra = valorFinalDra;

          // Preparar JSONB
          dbUpdates.procedimentos = mergedProcedures.map(p => ({
             codigo: p.code,
             descricao: p.name,
             tem_lab: p.isLabPending || false,
             valor: p.value
          }));
      }

      if (updates.date) dbUpdates.data = updates.date;
      if (updates.clinic) dbUpdates.clinica = updates.clinic;
      if (updates.patientName) dbUpdates.paciente_nome = updates.patientName;
      if (updates.notes !== undefined) dbUpdates.observacoes = updates.notes;

      const { error } = await supabase
        .from('consultas')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar UI localmente
      setConsultations(prev => prev.map(c => {
          if (c.id !== id) return c;
          
          // Merge updates
          let updated = { ...c, ...updates };
          
          // Garantir que valores calculados reflectem o que foi para a BD
          if (dbUpdates.valor_final_dra !== undefined) {
              updated.doctorCommission = dbUpdates.valor_final_dra;
              // Check pendency
              const labCost = dbUpdates.custo_lab;
              const hasLabItems = (updates.procedures || c.procedures).some(p => p.isLabPending);
              updated.hasPendingLab = hasLabItems && (labCost === 0);
          }
          return updated;
      }));

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

      const { error: updateError } = await supabase
        .from('consultas')
        .update({ 
          paciente_id: targetId,
          paciente_nome: targetPatient.name 
        })
        .eq('paciente_id', sourceId);

      if (updateError) throw updateError;

      await deletePatient(sourceId);

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