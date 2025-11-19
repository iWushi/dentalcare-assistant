import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

// Pages
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import Reports from './pages/Reports';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import NewConsultation from './pages/NewConsultation';
import Login from './pages/Login';

const Layout = () => (
  <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
    <main className="h-full">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);

// Componente de Protecção de Rotas
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-teal-600">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Layout />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <Routes>
            {/* Rotas Protegidas */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientDetails />} />
              <Route path="new-consultation" element={<NewConsultation />} />
            </Route>
          </Routes>
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;