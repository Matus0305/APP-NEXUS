import React from 'react';
import { LayoutGrid, Truck, Wallet, Car, Clock, PieChart, Settings } from 'lucide-react';

// Ahora recibe las propiedades desde App.jsx
export const NavigationBar = ({ activeTab, setActiveTab }) => {
  
  const navItems = [
    { id: 'Dashboard', icon: <LayoutGrid size={24} /> },
    { id: 'shift', icon: <Clock size={24} /> },
    { id: 'fleet', icon: <Car size={24} /> },
    { id: 'flow', icon: <Wallet size={24} /> },
    { id: 'logistics', icon: <Truck size={24} /> },
    { id: 'patrimony', icon: <PieChart size={24} /> },
    { id: 'settings', icon: <Settings size={24} /> },
  ];

  return (
    <div className="bg-[#0A0A0A]/90 backdrop-blur-lg border-t border-white/10 pb-safe w-full">
      <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center justify-center p-2 transition-all duration-300 outline-none"
            >
              <div className={`${isActive ? 'text-white scale-110' : 'text-white/30 hover:text-white/60'} transition-all`}>
                {item.icon}
              </div>
              
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full animate-in zoom-in" />
              )}
            </button>
          );
        })}

      </div>
    </div>
  );
};