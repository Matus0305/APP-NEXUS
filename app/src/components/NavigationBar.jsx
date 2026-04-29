import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Truck, Wallet, Car, Clock, PieChart, Settings } from 'lucide-react';

export const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <LayoutGrid size={20} />, label: 'Home' },
    { path: '/logistics', icon: <Truck size={20} />, label: 'Log' },
    { path: '/flow', icon: <Wallet size={20} />, label: 'Flow' },
    { path: '/fleet', icon: <Car size={20} />, label: 'Fleet' },
    { path: '/shift', icon: <Clock size={20} />, label: 'Shift' },
    { path: '/patrimony', icon: <PieChart size={20} />, label: 'Pat' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Set' },
  ];

  return (
    <nav className="bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex justify-between items-center px-2 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 transition-all ${
                isActive ? 'text-white scale-110' : 'text-white/30'
              }`}
            >
              <div className={`${isActive ? 'bg-white/10 p-2 rounded-xl' : ''}`}>
                {item.icon}
              </div>
              {/* Solo mostramos el punto si está activo para no ocupar espacio con texto */}
              {isActive && <div className="w-1 h-1 bg-white rounded-full mt-1" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};