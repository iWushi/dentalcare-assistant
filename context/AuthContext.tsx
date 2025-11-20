import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  isLoading: boolean;
  login: (password: string) => boolean;
  enableBiometrics: () => void;
  unlockSession: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chave secreta e configurações
const APP_PASSWORD = 'Sh4mila_Sandra_08*94';
const TOKEN_KEY = 'dental_auth_token';
const EXPIRY_KEY = 'dental_auth_expiry';
const BIOMETRIC_KEY = 'dental_biometric_enabled';
const SESSION_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 dias em milissegundos

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    const bioEnabled = localStorage.getItem(BIOMETRIC_KEY) === 'true';

    setIsBiometricEnabled(bioEnabled);

    if (token && expiry) {
      const now = new Date().getTime();
      if (now < parseInt(expiry)) {
        // Token válido
        // Se biometria estiver ativa, NÃO autenticamos imediatamente, deixamos a UI de Login pedir o desbloqueio
        // Se biometria NÃO estiver ativa, entramos direto (comportamento "Manter sessão iniciada")
        if (!bioEnabled) {
           setIsAuthenticated(true);
        }
      } else {
        // Token expirado
        logout();
      }
    }
    setIsLoading(false);
  };

  const login = (password: string): boolean => {
    if (password === APP_PASSWORD) {
      const now = new Date().getTime();
      const expiry = now + SESSION_DURATION;
      
      localStorage.setItem(TOKEN_KEY, 'valid_session_' + now);
      localStorage.setItem(EXPIRY_KEY, expiry.toString());
      
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const enableBiometrics = () => {
    localStorage.setItem(BIOMETRIC_KEY, 'true');
    setIsBiometricEnabled(true);
  };

  // Usado quando o user volta à app e já tem token válido + biometria ativa
  const unlockSession = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        setIsAuthenticated(true);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(BIOMETRIC_KEY);
    setIsAuthenticated(false);
    setIsBiometricEnabled(false);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isBiometricEnabled,
      isLoading, 
      login, 
      enableBiometrics,
      unlockSession,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};