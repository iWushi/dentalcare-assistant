import React, { createContext, useContext, useState } from 'react';
import { Patient, Consultation } from '../types';
import { MOCK_PATIENTS, MOCK_CONSULTATIONS } from '../data/mockData';

interface DataContextType {
  patients: Patient[];
  consultations: Consultation[];
  getPatientById: (id: string) => Patient | undefined;
  getConsultationsByPatient: (patientId: string) => Consultation[];
  addConsultation: (consultation: Consultation) => void;
  addPatient: (patient: Patient) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [consultations, setConsultations] = useState<Consultation[]>(MOCK_CONSULTATIONS);

  // Sort consultations by date descending
  const sortedConsultations = [...consultations].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getPatientById = (id: string) => patients.find(p => p.id === id);
  
  const getConsultationsByPatient = (patientId: string) => 
    sortedConsultations.filter(c => c.patientId === patientId);

  const addConsultation = (consultation: Consultation) => {
    setConsultations(prev => [consultation, ...prev]);
  };

  const addPatient = (patient: Patient) => {
    setPatients(prev => [...prev, patient]);
  };

  return (
    <DataContext.Provider value={{
      patients,
      consultations: sortedConsultations,
      getPatientById,
      getConsultationsByPatient,
      addConsultation,
      addPatient
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};