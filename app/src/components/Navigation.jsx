import React from 'react';
import { Home, Wallet, Truck, Settings, PieChart } from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
      active ? 'text-white scale-110' : 'text-white/40'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] mt-1 font-medium">{label}</span>
    {active && <div className="w-1 h-1 bg-white rounded-full mt-1 animate-pulse" />}
  </button>
);

export const Navigation = ({ currentTab, setTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-6 pb-4 flex items-center justify-around z-50">
      <NavItem icon={Home} label="Nexus" active={currentTab === 'dashboard'} onClick={() => setTab('dashboard')} />
      <NavItem icon={Truck} label="Logística" active={currentTab === 'logistics'} onClick={() => setTab('logistics')} />
      <NavItem icon={Wallet} label="Flujo" active={currentTab === 'flow'} onClick={() => setTab('flow')} />
      <NavItem icon={PieChart} label="Patrimonio" active={currentTab === 'patrimony'} onClick={() => setTab('patrimony')} />
      <NavItem icon={Settings} label="Ajustes" active={currentTab === 'settings'} onClick={() => setTab('settings')} />
    </nav>
  );
};