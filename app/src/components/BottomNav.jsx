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
    <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/10 pb-safe w-full">
      <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center p-2 transition-all outline-none"
            >
              <div className={`${isActive ? 'text-white scale-110' : 'text-white/30'} transition-all`}>
                {item.icon}
              </div>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};