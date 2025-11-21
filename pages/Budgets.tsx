import React from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, ChevronRight, Calendar, Trash2 } from 'lucide-react';

const Budgets: React.FC = () => {
  const { budgets, deleteBudget } = useData();

  const formatMoney = (val: number) => {
    return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' MT';
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm("Tem a certeza que deseja apagar este orçamento?")) {
          await deleteBudget(id);
      }
  };

  return (
    <div className="pb-40 p-4 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <header className="flex justify-between items-center mb-6">
         <div>
             <h1 className="text-2xl font-bold text-slate-800">Orçamentos</h1>
             <p className="text-xs text-gray-500">Gestão de planos de tratamento</p>
         </div>
         <Link 
            to="/budgets/new" 
            className="bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 flex items-center gap-2 hover:bg-teal-700 transition-transform active:scale-95"
         >
             <Plus size={18} /> Novo Orçamento
         </Link>
      </header>

      <div className="space-y-4">
          {budgets.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                  <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                  <h3 className="text-slate-800 font-bold mb-1">Sem orçamentos</h3>
                  <p className="text-gray-400 text-sm">Crie o primeiro orçamento para começar.</p>
              </div>
          ) : (
              budgets.map(budget => (
                  <Link 
                    key={budget.id} 
                    to={`/budgets/${budget.id}`}
                    className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:border-teal-200 transition-colors p-4"
                  >
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${budget.status === 'finalizado' ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                                  <FileText size={20} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-800">{budget.patientName}</h3>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                      <span className="font-medium text-slate-500">{budget.number}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(budget.date).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-lg font-bold text-teal-600">{formatMoney(budget.totalValue)}</div>
                              <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-block mt-1 ${budget.status === 'finalizado' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-50 text-yellow-600'}`}>
                                  {budget.status}
                              </div>
                          </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                          <span className="text-xs text-gray-400">{budget.phases.length} fases incluídas</span>
                          <button 
                            onClick={(e) => handleDelete(e, budget.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </Link>
              ))
          )}
      </div>
    </div>
  );
};

export default Budgets;