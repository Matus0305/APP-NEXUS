import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Truck, Wallet, Car, Clock, PieChart, Settings } from 'lucide-react';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutGrid size={20} /> },
    { path: '/shift', label: 'Jornada', icon: <Clock size={20} /> },
    { path: '/fleet', label: 'Flota', icon: <Car size={20} /> },
    { path: '/flow', label: 'Caja', icon: <Wallet size={20} /> },
    { path: '/logistics', label: 'Logística', icon: <Truck size={20} /> },
    { path: '/patrimony', label: 'Patrimonio', icon: <PieChart size={20} /> },
    { path: '/settings', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <div className="w-64 h-full bg-[#0A0A0A] border-r border-white/5 flex flex-col p-4">
      {/* Logo Nexus */}
      <div className="mb-10 px-4 py-2 mt-4">
        <h2 className="text-xl font-black tracking-[0.3em] text-white italic">NEXUS</h2>
        <p className="text-[10px] text-white/40 tracking-widest font-mono">CORE SYSTEM</p>
      </div>

      {/* Botones */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                isActive ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};