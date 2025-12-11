import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, AlertCircle, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, resetPassword } = useAuth();
  
  // View State: 'login' or 'forgot'
  const [view, setView] = useState<'login' | 'forgot'>('login');
  
  // Estado local
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await login(email, password);
      
      if (error) {
        if (error.message === 'Invalid login credentials') {
           setErrorMsg('Email ou password incorrectos.');
        } else {
           setErrorMsg(error.message);
        }
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(true);

      try {
          const { error } = await resetPassword(email);
          if (error) {
              setErrorMsg(error.message);
          } else {
              setSuccessMsg('Email de recuperação enviado! Verifique a sua caixa de entrada (e spam).');
          }
      } catch (err) {
          setErrorMsg('Erro ao enviar email.');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-slate-800 p-8 text-center relative overflow-hidden transition-all duration-500">
           <div className="absolute top-0 left-0 w-full h-full bg-teal-600/10"></div>
           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                 <Lock className="text-white w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                  {view === 'login' ? 'Acesso Seguro' : 'Recuperar Senha'}
              </h1>
              <p className="text-teal-200/80 text-xs mt-1">Shamila Modan Assistant</p>
           </div>
        </div>

        {/* Form Container */}
        <div className="p-8">
          
          {view === 'login' ? (
              // LOGIN FORM
              <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email</label>
                    <div className="relative">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemplo@dentalcare.com"
                        className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                        required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Password</label>
                    <div className="relative">
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                        required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                    <div className="text-right mt-2">
                        <button 
                            type="button" 
                            onClick={() => { setView('forgot'); setErrorMsg(null); }}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold ml-1 animate-in slide-in-from-left-1 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                    </div>
                )}

                <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-800/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : (
                    <>Entrar <ArrowRight size={18} /></>
                    )}
                </button>
            </form>
          ) : (
              // FORGOT PASSWORD FORM
              <form onSubmit={handleResetRequest} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="text-sm text-gray-500 mb-4 leading-relaxed">
                      Insira o seu email. Enviaremos um link mágico para redefinir a sua senha.
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email</label>
                    <div className="relative">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemplo@dentalcare.com"
                        className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                        required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

                {errorMsg && (
                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold ml-1 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                    </div>
                )}
                
                {successMsg && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-bold ml-1 bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircle size={14} />
                    <span>{successMsg}</span>
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isSubmitting || !!successMsg}
                    className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : 'Enviar Link de Recuperação'}
                </button>

                <button 
                    type="button" 
                    onClick={() => { setView('login'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="w-full text-slate-500 font-bold py-3 text-sm hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={16} /> Voltar ao Login
                </button>
              </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;