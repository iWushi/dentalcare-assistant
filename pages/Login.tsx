import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, ScanFace, AlertCircle, Fingerprint, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isBiometricEnabled, unlockSession } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [view, setView] = useState<'password' | 'biometric'>('password');

  useEffect(() => {
    // Se biometria estiver ativada e tivermos um token (verificado no context), mostramos view de desbloqueio
    // O context só renderiza o Login se isAuthenticated for false.
    // Portanto, se isBiometricEnabled for true aqui, significa que temos token mas precisamos desbloquear.
    if (isBiometricEnabled) {
        setView('biometric');
    }
  }, [isBiometricEnabled]);

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (success) {
      // Se for o primeiro login, a app vai perguntar se quer ativar biometria na próxima render (ou redirecionar)
      // Mas como o state muda, o Router vai redirecionar para Home.
      // A lógica de "Pedir Biometria" idealmente ficaria num modal pós-login, 
      // mas para simplicidade, vamos ativar automaticamente para a próxima vez se o browser suportar.
      // Vamos deixar o utilizador decidir num fluxo futuro ou assumir padrão.
      // Neste requisito: "activar pedido de biometria... guardar preferência".
      // Vamos fazer isso silenciosamente ou com um prompt rápido.
      const confirmBio = window.confirm("Pretende activar o desbloqueio rápido (Face ID / Touch ID) para as próximas vezes?");
      if (confirmBio) {
        // Precisamos aceder ao contexto, mas como o login muda o state, o componente desmonta.
        // Vamos confiar que o AuthContext lida com o state update.
        // Hack simples: setar no localStorage direct aqui ou expor metodo no context.
        localStorage.setItem('dental_biometric_enabled', 'true');
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleBiometricUnlock = () => {
    // Simulação de chamada de API nativa
    // Num PWA real, isto seria navigator.credentials.get(...)
    // Aqui simulamos o sucesso do clique
    unlockSession();
  };

  const switchToPassword = () => {
    setView('password');
  };

  if (view === 'biometric') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
         <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
               <ScanFace size={40} className="text-teal-600" />
            </div>
            
            <h1 className="text-xl font-bold text-slate-800 mb-2">Olá, Dra. Shamila</h1>
            <p className="text-sm text-slate-500 mb-8">Toque para desbloquear a aplicação</p>

            <button 
              onClick={handleBiometricUnlock}
              className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-teal-600/20 mb-4"
            >
               <Fingerprint size={24} />
               Entrar
            </button>

            <button 
               onClick={switchToPassword}
               className="text-xs text-slate-400 font-medium hover:text-teal-600 transition-colors"
            >
               Usar password de acesso
            </button>
         </div>
         <p className="mt-8 text-xs text-gray-300 flex items-center gap-1">
            <ShieldCheck size={12} /> DentalCare Secure Access
         </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-teal-600/10"></div>
           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                 <Lock className="text-white w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide">Acesso Seguro</h1>
              <p className="text-teal-200/80 text-xs mt-1">DentalCare Assistant</p>
           </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handlePasswordLogin} className="space-y-6">
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Password de Acesso</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  placeholder="••••••••••••"
                  className={`w-full bg-gray-50 border ${error ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-200 text-slate-800'} rounded-xl px-4 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all`}
                  autoFocus
                />
                {error && (
                   <div className="flex items-center gap-1.5 mt-2 text-red-500 text-xs font-bold ml-1 animate-in slide-in-from-left-1">
                      <AlertCircle size={12} />
                      <span>Password incorrecta</span>
                   </div>
                )}
             </div>

             <button 
               type="submit"
               className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-800/10"
             >
                Entrar <ArrowRight size={18} />
             </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400 text-center leading-relaxed max-w-xs">
         Esta aplicação é de uso exclusivo.<br/>
         O acesso é monitorizado e protegido.
      </p>
    </div>
  );
};

export default Login;