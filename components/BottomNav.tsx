import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sparkles, BarChart2, Users } from 'lucide-react';

const BottomNav: React.FC = () => {
  // Reordered items: Home -> Chat -> Patients -> Reports
  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Início' },
    { path: '/chat', icon: <Sparkles size={24} />, label: 'AI Chat' },
    { path: '/patients', icon: <Users size={24} />, label: 'Pac.' },
    { path: '/reports', icon: <BarChart2 size={24} />, label: 'Rel.' },
  ];

  return (
    // Ajuste: Remove pb-safe class, add style with extra padding (16px) to lift icons above Home Bar
    <nav 
      className="bg-white/85 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] fixed bottom-0 left-0 right-0 z-50 transition-all duration-200"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform ${
                isActive ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;