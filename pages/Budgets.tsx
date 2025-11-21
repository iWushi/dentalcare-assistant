
import React from 'react';
import { createRoot } from 'react-dom/client';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Plus, FileText, Calendar, Trash2, Printer } from 'lucide-react';
import BudgetPDF from '../components/BudgetPDF';
import { Budget } from '../types';

// Helper to print manually
const printBudget = (budget: Budget) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orçamento ${budget.number}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
           @page { margin: 0; }
        </style>
      </head>
      <body>
        <div id="print-mount"></div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
      const mountNode = doc.getElementById('print-mount');
      if (mountNode) {
          const root = createRoot(mountNode);
          const logoUrl = window.location.origin + "/logo.png";
          
          root.render(<BudgetPDF budget={budget} logoUrl={logoUrl} />);
          
          setTimeout(() => {
              // SET DOCUMENT TITLE FOR FILE NAMING
              const originalTitle = document.title;
              const safeDate = budget.date.replace(/-/g, '');
              const safeName = budget.patientName.replace(/[^a-zA-Z0-9]/g, '_');
              const safeStatus = budget.status.toUpperCase();
              
              const fileName = `ORC-${safeDate}-${safeName}-${safeStatus}`;
              
              // Override title on the main window (browsers often use main title for print name)
              document.title = fileName;
              if (iframe.contentDocument) iframe.contentDocument.title = fileName;

              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();

              // Restore title
              document.title = originalTitle;

              setTimeout(() => {
                 if (document.body.contains(iframe)) {
                   document.body.removeChild(iframe);
                 }
              }, 10000);
          }, 1500);
      }
  }, 500);
};

interface BudgetRowProps {
  budget: Budget;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const BudgetRow: React.FC<BudgetRowProps> = ({ budget, onDelete }) => {
  
  const handlePrint = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      printBudget(budget);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:border-teal-200 transition-colors p-4 relative group">
       <Link to={`/budgets/${budget.id}`} className="block">
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
                  <div className="text-lg font-bold text-teal-600">{(budget.totalValue || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MT</div>
                  <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-block mt-1 ${budget.status === 'finalizado' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-50 text-yellow-600'}`}>
                      {budget.status}
                  </div>
              </div>
          </div>
       </Link>
       
       <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
           <span className="text-xs text-gray-400">{budget.phases?.length || 0} fases incluídas</span>
           
           <div className="flex gap-2">
               {/* Quick Print Button */}
               <button 
                 onClick={handlePrint}
                 className="p-2 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" 
                 title="Imprimir PDF Rápido"
               >
                   <Printer size={16} />
               </button>

               <button 
                onClick={(e) => onDelete(e, budget.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
               >
                  <Trash2 size={16} />
               </button>
           </div>
       </div>
    </div>
  );
};

const Budgets: React.FC = () => {
  const { budgets, deleteBudget } = useData();

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
                  <BudgetRow key={budget.id} budget={budget} onDelete={handleDelete} />
              ))
          )}
      </div>
    </div>
  );
};

export default Budgets;
