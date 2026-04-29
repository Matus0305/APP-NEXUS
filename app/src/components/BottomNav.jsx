import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Truck, Wallet, Car, Clock, PieChart, Settings } from 'lucide-react';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <LayoutGrid size={24} /> },
    { path: '/shift', icon: <Clock size={24} /> },
    { path: '/fleet', icon: <Car size={24} /> },
    { path: '/flow', icon: <Wallet size={24} /> },
    { path: '/logistics', icon: <Truck size={24} /> },
    { path: '/patrimony', icon: <PieChart size={24} /> },
    { path: '/settings', icon: <Settings size={24} /> },
  ];

  return (
    <div className="bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/5 pb-safe w-full shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              // El active:scale-90 crea el efecto de "hundirse" al tocar el cristal
              className="relative flex flex-col items-center justify-center p-2 transition-all duration-300 outline-none active:scale-90"
            >
              <div 
                className={`transition-all duration-500 ease-out ${
                  isActive 
                    ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {item.icon}
              </div>
              
              {/* Puntito blanco que entra con zoom */}
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full transition-all duration-300 animate-[fadeInUp_0.2s_ease-out]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};