import { Patient, Consultation } from '../types';

export const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', name: 'Isidro Caetano', phone: '843210987', notes: 'Alergia a penicilina', createdAt: new Date('2025-01-10') },
  { id: 'p2', name: 'Maria Costa', phone: '841234567', notes: '', createdAt: new Date('2025-02-15') },
  { id: 'p3', name: 'Pedro Santos', phone: '847654321', notes: 'Sensibilidade dentária', createdAt: new Date('2025-03-20') },
  { id: 'p4', name: 'Ana Silva', phone: '849876543', notes: 'Preferência por tardes', createdAt: new Date('2025-05-05') },
  { id: 'p5', name: 'João Pereira', phone: '842345678', notes: 'Bruxismo severo', createdAt: new Date('2025-06-12') },
];

export const MOCK_CONSULTATIONS: Consultation[] = [
  // Isidro (4 consultations) - Sommerschield
  {
    id: '2025-052',
    date: '2025-11-18',
    patientId: 'p1',
    patientName: 'Isidro Caetano',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'A2', name: 'Consulta Programada', value: 2000 },
      { code: 'B1', name: 'Trat. hemorragia bucal', value: 2000 }
    ],
    totalValue: 4000,
    doctorCommission: 1523.81,
    hasPendingLab: false
  },
  {
    id: '2025-045',
    date: '2025-11-15',
    patientId: 'p1',
    patientName: 'Isidro Caetano',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'F2', name: 'Endo Incisivo/Canino', value: 5200 }
    ],
    totalValue: 5200,
    doctorCommission: 1980.95,
    hasPendingLab: false
  },
  {
    id: '2025-030',
    date: '2025-11-10',
    patientId: 'p1',
    patientName: 'Isidro Caetano',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'D1', name: 'Destartarização Profilaxia', value: 2700 }
    ],
    totalValue: 2700,
    doctorCommission: 1028.57,
    hasPendingLab: false
  },
  {
    id: '2025-015',
    date: '2025-11-05',
    patientId: 'p1',
    patientName: 'Isidro Caetano',
    clinic: 'Baixa',
    procedures: [
      { code: 'A2', name: 'Consulta Programada', value: 2000 }
    ],
    totalValue: 2000,
    doctorCommission: 761.90,
    hasPendingLab: false
  },

  // Maria (2 consultations, 1 ortho) - Baixa Focus
  {
    id: '2025-051',
    date: '2025-11-17',
    patientId: 'p2',
    patientName: 'Maria Costa',
    clinic: 'Baixa',
    procedures: [
      { code: 'K1', name: 'Controle Aparelho', value: 3750 }
    ],
    totalValue: 3750,
    doctorCommission: 2321.43,
    hasPendingLab: false
  },
  {
    id: '2025-048',
    date: '2025-11-01',
    patientId: 'p2',
    patientName: 'Maria Costa',
    clinic: 'Baixa',
    procedures: [
      { code: 'K1', name: 'Controle Aparelho', value: 3750 }
    ],
    totalValue: 3750,
    doctorCommission: 2321.43,
    hasPendingLab: false
  },

  // Pedro (3 consultations, 1 pending lab) - Mixed
  {
    id: '2025-050',
    date: '2025-11-17',
    patientId: 'p3',
    patientName: 'Pedro Santos',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'G15', name: 'Facetas resina', value: 7500, isLabPending: true }
    ],
    totalValue: 7500,
    doctorCommission: 2857.14, // Temporary value without lab
    hasPendingLab: true
  },
  {
    id: '2025-040',
    date: '2025-11-12',
    patientId: 'p3',
    patientName: 'Pedro Santos',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'A2', name: 'Consulta Programada', value: 2000 }
    ],
    totalValue: 2000,
    doctorCommission: 761.90,
    hasPendingLab: false
  },
  {
    id: '2025-035',
    date: '2025-11-08',
    patientId: 'p3',
    patientName: 'Pedro Santos',
    clinic: 'Baixa',
    procedures: [
      { code: 'C1', name: 'Radiografia Periapical', value: 550 }
    ],
    totalValue: 550,
    doctorCommission: 209.52,
    hasPendingLab: false
  },

  // Ana (1 consultation)
  {
    id: '2025-049',
    date: '2025-11-16',
    patientId: 'p4',
    patientName: 'Ana Silva',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'A9', name: 'Domicílio', value: 5250 }
    ],
    totalValue: 5250,
    doctorCommission: 2000.00,
    hasPendingLab: false
  },

  // João (Prosthesis with lab) - Sommerschield Major
  {
    id: '2025-044',
    date: '2025-11-14',
    patientId: 'p5',
    patientName: 'João Pereira',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'J-PA1', name: 'Prótese acrílica 1d', value: 14800, labCost: 5000 }
    ],
    totalValue: 14800,
    doctorCommission: 3733.33,
    hasPendingLab: false
  },
  {
    id: '2025-042',
    date: '2025-11-14',
    patientId: 'p5',
    patientName: 'João Pereira',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'I1', name: 'Extração uniradicular', value: 2800 }
    ],
    totalValue: 2800,
    doctorCommission: 1066.67,
    hasPendingLab: false
  },
  {
    id: '2025-043',
    date: '2025-11-14',
    patientId: 'p5',
    patientName: 'João Pereira',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'J-MA', name: 'Moldes Alginato', value: 3250, labCost: 1000 }
    ],
    totalValue: 3250,
    doctorCommission: 857.14,
    hasPendingLab: false
  },
  {
    id: '2025-041',
    date: '2025-11-12',
    patientId: 'p5',
    patientName: 'João Pereira',
    clinic: 'Baixa',
    procedures: [
      { code: 'K1', name: 'Controle Aparelho', value: 3750 }
    ],
    totalValue: 3750,
    doctorCommission: 2321.43,
    hasPendingLab: false
  },
  {
    id: '2025-038',
    date: '2025-11-09',
    patientId: 'p5',
    patientName: 'João Pereira',
    clinic: 'Sommerschield',
    procedures: [
      { code: 'J-GB', name: 'Goteira bruxismo', value: 10500, isLabPending: true }
    ],
    totalValue: 10500,
    doctorCommission: 4000, // Temp
    hasPendingLab: true
  }
];