import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Save, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UpdatePassword: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
        setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    if (password !== confirmPassword) {
        setErrorMsg("As senhas não coincidem.");
        return;
    }

    setIsSubmitting(true);
    try {
        const { error } = await updatePassword(password);
        if (error) throw error;
        setSuccess(true);
        // Redirect after delay
        setTimeout(() => {
            navigate('/');
        }, 2000);
    } catch (err: any) {
        setErrorMsg(err.message || "Erro ao atualizar a senha.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (success) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
             <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center animate-in zoom-in-95">
                 <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <CheckCircle size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800 mb-2">Senha Atualizada!</h2>
                 <p className="text-gray-500 text-sm mb-4">A sua senha foi alterada com sucesso. A redirecionar...</p>
                 <button onClick={() => navigate('/')} className="text-teal-600 font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline">
                     Ir para Dashboard <ArrowRight size={14} />
                 </button>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-teal-600/10"></div>
           <div className="relative z-10">
              <h1 className="text-xl font-bold text-white tracking-wide">Nova Senha</h1>
              <p className="text-teal-200/80 text-xs mt-1">Defina a sua nova credencial de acesso.</p>
           </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Nova Senha</label>
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
             </div>

             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Confirmar Senha</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-gray-50 border border-gray-200 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
             </div>

             {errorMsg && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold ml-1 bg-red-50 p-3 rounded-lg border border-red-100">
                   <AlertCircle size={14} />
                   <span>{errorMsg}</span>
                </div>
             )}

             <button 
               type="submit"
               disabled={isSubmitting}
               className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
             >
                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : (
                  <>Atualizar Senha <Save size={18} /></>
                )}
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;