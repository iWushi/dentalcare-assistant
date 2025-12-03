import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, Consultation, DbPrice, Procedure, Budget } from '../types';
import { supabase } from '../services/supabase';
import { calculateProcedureCommission } from '../constants';

interface DataContextType {
  patients: Patient[];
  consultations: Consultation[];
  budgets: Budget[];
  availableProcedures: DbPrice[]; // Preços vindos da BD
  isLoading: boolean;
  error: string | null;
  getPatientById: (id: string) => Patient | undefined;
  getConsultationsByPatient: (patientId: string) => Consultation[];
  addConsultation: (consultation: Consultation) => Promise<void>;
  updateConsultation: (id: string, updates: Partial<Consultation>) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  mergePatients: (targetId: string, sourceId: string) => Promise<void>;
  
  // Métodos de Orçamentos
  saveBudget: (budget: Budget) => Promise<string>; // Retorna ID
  deleteBudget: (id: string) => Promise<void>;
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
  const [budgets, setBudgets] = useState<Budget[]>([]);
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
          const reminderText = c.lembrete || ''; // Coluna lembrete

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

          // Calcular estado de Pendência
          const hasItemsWithLab = proceduresList.some(p => p.isLabPending);
          const isPending = hasItemsWithLab && (safeLabCost === 0 || !c.custo_lab);

          if (safeLabCost > 0) {
              const labItems = proceduresList.filter(p => p.isLabPending);
              if (labItems.length > 0) {
                  labItems[0].labCost = safeLabCost;
              } else if (proceduresList.length > 0) {
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
            notes: c.observacoes,
            reminder: reminderText,
            hasReminder: reminderText.length > 0
          };
        });

        // 4. Fetch Budgets (Orçamentos)
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('orcamentos')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Se a tabela não existir ainda, não falha a app toda, apenas avisa
        if (budgetsError && budgetsError.code !== '42P01') {
             console.error("Erro fetching budgets:", budgetsError);
        }

        const formattedBudgets: Budget[] = (budgetsData || []).map((b: any) => ({
            id: b.id,
            patientId: b.paciente_id,
            patientName: b.paciente_nome,
            date: normalizeDate(b.data_emissao),
            number: b.numero,
            status: b.estado,
            phases: b.fases || [],
            totalValue: parseCurrency(b.valor_total),
            discountPercentage: b.desconto_percentagem ? parseCurrency(b.desconto_percentagem) : undefined, // New field
            createdAt: b.created_at,
            updatedAt: b.updated_at
        }));

        setPatients(formattedPatients);
        setConsultations(formattedConsultations);
        setBudgets(formattedBudgets);

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
      const totalLabCost = consultation.procedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
      
      const procedimentosJson = consultation.procedures.map(p => ({
          codigo: p.code ? p.code.trim() : '',
          descricao: p.name,
          tem_lab: p.isLabPending || false,
          valor: p.value 
      }));
      
      // Mixed Commission Calculation (Centralized)
      let totalCommission = 0;
      consultation.procedures.forEach(p => {
          const val = p.value || 0;
          const lab = p.labCost || 0;
          const code = String(p.code || '').trim().toUpperCase();
          
          totalCommission += calculateProcedureCommission(val, lab, code);
      });

      // Valor sem IVA estimado (apenas informativo para BD, o real da comissão é o totalCommission)
      const baseCalc = Math.max(0, consultation.totalValue - totalLabCost);
      const valorSemIva = baseCalc / 1.05;

      const dbPayload = {
        id: consultation.id,
        data: consultation.date,
        clinica: consultation.clinic,
        paciente_id: consultation.patientId,
        paciente_nome: consultation.patientName,
        procedimentos: procedimentosJson,
        valor_total: consultation.totalValue,
        custo_lab: totalLabCost,
        valor_sem_iva: valorSemIva,
        valor_final_dra: totalCommission, // Stores the precise calculated commission
        observacoes: consultation.notes || '',
        lembrete: consultation.reminder || null, // New Reminder Column
        criado_em: new Date().toISOString()
      };

      const { error } = await supabase
        .from('consultas')
        .insert([dbPayload]);

      if (error) throw error;
      
      const newConsLocal: Consultation = { 
        ...consultation, 
        doctorCommission: totalCommission, 
        hasPendingLab: (totalLabCost === 0 && consultation.procedures.some(p => p.isLabPending)),
        hasReminder: !!consultation.reminder
      };
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
      
      const current = consultations.find(c => c.id === id);
      if (!current) throw new Error("Consulta não encontrada localmente");

      const mergedProcedures = updates.procedures || current.procedures;
      const mergedTotalValue = updates.totalValue !== undefined ? updates.totalValue : current.totalValue;

      if (updates.procedures || updates.totalValue !== undefined) {
          const totalLabCost = mergedProcedures.reduce((sum, p) => sum + (p.labCost || 0), 0);
          
          // Mixed Commission Calculation (Centralized)
          let totalCommission = 0;
          mergedProcedures.forEach(p => {
              const val = p.value || 0;
              const lab = p.labCost || 0;
              const code = String(p.code || '').trim().toUpperCase();
              
              totalCommission += calculateProcedureCommission(val, lab, code);
          });

          const baseCalc = Math.max(0, mergedTotalValue - totalLabCost);
          const valorSemIva = baseCalc / 1.05;

          dbUpdates.valor_total = mergedTotalValue;
          dbUpdates.custo_lab = totalLabCost;
          dbUpdates.valor_sem_iva = valorSemIva;
          dbUpdates.valor_final_dra = totalCommission;

          dbUpdates.procedimentos = mergedProcedures.map(p => ({
             codigo: p.code ? p.code.trim() : '',
             descricao: p.name,
             tem_lab: p.isLabPending || false,
             valor: p.value
          }));
      }

      if (updates.date) dbUpdates.data = updates.date;
      if (updates.clinic) dbUpdates.clinica = updates.clinic;
      if (updates.patientName) dbUpdates.paciente_nome = updates.patientName;
      if (updates.notes !== undefined) dbUpdates.observacoes = updates.notes;
      
      // Handle Reminder Update
      if (updates.reminder !== undefined) {
          dbUpdates.lembrete = updates.reminder || null;
      }

      const { error } = await supabase
        .from('consultas')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      
      setConsultations(prev => prev.map(c => {
          if (c.id !== id) return c;
          
          let updated = { ...c, ...updates };
          
          if (dbUpdates.valor_final_dra !== undefined) {
              updated.doctorCommission = dbUpdates.valor_final_dra;
              const labCost = dbUpdates.custo_lab;
              const hasLabItems = (updates.procedures || c.procedures).some(p => p.isLabPending);
              updated.hasPendingLab = hasLabItems && (labCost === 0);
          }
          
          if (updates.reminder !== undefined) {
              updated.hasReminder = !!updates.reminder;
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
  
  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.nome = updates.name;
      if (updates.phone) dbUpdates.telefone = updates.phone;
      if (updates.notes !== undefined) dbUpdates.notas_gerais = updates.notes;

      const { error } = await supabase
        .from('pacientes')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      // 1. Atualizar Estado Local dos Pacientes
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

      // 2. Propagar mudança de nome para Consultas e Orçamentos (Database & Local)
      if (updates.name) {
         // Database (Parallel)
         const p1 = supabase.from('consultas').update({ paciente_nome: updates.name }).eq('paciente_id', id);
         const p2 = supabase.from('orcamentos').update({ paciente_nome: updates.name }).eq('paciente_id', id);
         
         // Não bloqueamos a UI pelo update secundário, mas fazemos em background
         Promise.all([p1, p2]).catch(err => console.error("Erro propagando nome:", err));

         // Local State Updates (Instant UI Feedback)
         setConsultations(prev => prev.map(c => c.patientId === id ? { ...c, patientName: updates.name! } : c));
         setBudgets(prev => prev.map(b => b.patientId === id ? { ...b, patientName: updates.name! } : b));
      }

    } catch (err: any) {
      console.error('Error updating patient:', err);
      throw err;
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

  // --- GESTÃO DE ORÇAMENTOS ---

  const saveBudget = async (budget: Budget): Promise<string> => {
      try {
          const dbPayload = {
              paciente_id: budget.patientId,
              paciente_nome: budget.patientName,
              data_emissao: budget.date,
              numero: budget.number,
              estado: budget.status,
              fases: budget.phases, // JSONB
              valor_total: budget.totalValue,
              desconto_percentagem: budget.discountPercentage || 0, // Save discount
              updated_at: new Date().toISOString()
          };

          let savedBudget = null;

          // Se já tiver ID válido e não temporário, é update
          if (budget.id && !budget.id.startsWith('temp-')) {
             const { data, error } = await supabase
                .from('orcamentos')
                .update(dbPayload)
                .eq('id', budget.id)
                .select()
                .single();
             if (error) throw error;
             savedBudget = data;
          } else {
             // Insert
             const { data, error } = await supabase
                .from('orcamentos')
                .insert([dbPayload])
                .select()
                .single();
             if (error) throw error;
             savedBudget = data;
          }
          
          const newBudgetLocal: Budget = {
              id: savedBudget.id,
              patientId: savedBudget.paciente_id,
              patientName: savedBudget.paciente_nome,
              date: normalizeDate(savedBudget.data_emissao),
              number: savedBudget.numero,
              status: savedBudget.estado,
              phases: savedBudget.fases,
              totalValue: parseCurrency(savedBudget.valor_total),
              discountPercentage: parseCurrency(savedBudget.desconto_percentagem),
              createdAt: savedBudget.created_at,
              updatedAt: savedBudget.updated_at
          };

          setBudgets(prev => {
              // Remove versão anterior se existir (update) ou adiciona (create)
              const filtered = prev.filter(b => b.id !== savedBudget.id && b.id !== budget.id);
              return [newBudgetLocal, ...filtered];
          });

          return savedBudget.id;

      } catch (err: any) {
          console.error("Erro ao guardar orçamento", err);
          alert(`Erro ao guardar orçamento: ${err.message || err.details || JSON.stringify(err)}`);
          throw err;
      }
  };

  const deleteBudget = async (id: string) => {
      try {
          const { error } = await supabase.from('orcamentos').delete().eq('id', id);
          if (error) throw error;
          setBudgets(prev => prev.filter(b => b.id !== id));
      } catch (err: any) {
          console.error("Erro ao apagar orçamento", err);
          throw err;
      }
  };

  return (
    <DataContext.Provider value={{
      patients,
      consultations,
      budgets,
      availableProcedures,
      isLoading,
      error,
      getPatientById,
      getConsultationsByPatient,
      addConsultation,
      updateConsultation,
      deleteConsultation,
      addPatient,
      updatePatient,
      deletePatient,
      mergePatients,
      saveBudget,
      deleteBudget
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