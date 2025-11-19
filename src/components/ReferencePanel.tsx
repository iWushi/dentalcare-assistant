import React from 'react';
import { ArrowRight, Percent, Calculator } from 'lucide-react';
import { PROCEDURE_CATEGORIES as CATEGORIES } from '../constants';

const ReferencePanel: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6 border-l border-gray-200 w-full md:w-[350px] hidden lg:block">
      <div className="mb-8">
        <h2 className="text-lg font-medium text-slate-800 mb-1 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-600" />
          Regras de Comissão
        </h2>
        <p className="text-xs text-slate-500 mb-4">Distribuição padrão</p>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span className="text-slate-600">Procedimentos Gerais</span>
              <span className="text-teal-600">40%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-teal-500 h-2 rounded-full" style={{ width: '40%' }}></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Inclui A, B, C, D, E, F, G, H, I, J, L, M</p>
          </div>
          
          <div>
             <div className="flex justify-between text-sm font-medium mb-1">
              <span className="text-slate-600">Ortodontia (K)</span>
              <span className="text-indigo-600">65%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800">
          <strong>Fórmula:</strong> (Preço ÷ 1.05) × % Comissão
          <br/>
          <em>*Remover 5% IVA primeiro</em>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-teal-600" />
          Códigos de Procedimentos
        </h2>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.code} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between group hover:border-teal-200 transition-colors">
               <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 text-slate-700 font-bold text-sm group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                    {cat.code}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{cat.name}</p>
                    <p className="text-xs text-slate-400">Comissão: {(cat.commission * 100)}%</p>
                  </div>
               </div>
               <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
         {/* Chart removed as requested */}
      </div>
    </div>
  );
};

export default ReferencePanel;