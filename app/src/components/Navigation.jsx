import React from 'react';
import { Home, Wallet, Truck, Settings, PieChart } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics'; // Importamos tu nuevo paso 1

const NavItem = ({ icon: Icon, label, active, onClick }) => {
  const { triggerHaptic } = useHaptics();

  return (
    <button 
      onClick={() => {
        triggerHaptic(15); // Vibra al tocar
        onClick();
      }}
      className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
        active ? 'text-white' : 'text-white/30'
      }`}
    >
      <div className={`p-2 rounded-2xl ${active ? 'bg-white/10' : ''}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[9px] mt-1 font-semibold uppercase tracking-tighter">{label}</span>
    </button>
  );
};

export const Navigation = ({ currentTab, setTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-2 z-100 pb-safe">
      <NavItem icon={Home} label="Nexus" active={currentTab === 'dashboard'} onClick={() => setTab('dashboard')} />
      <NavItem icon={Truck} label="Logística" active={currentTab === 'logistics'} onClick={() => setTab('logistics')} />
      <NavItem icon={Wallet} label="Flujo" active={currentTab === 'flow'} onClick={() => setTab('flow')} />
      <NavItem icon={PieChart} label="Patrimonio" active={currentTab === 'patrimony'} onClick={() => setTab('patrimony')} />
      <NavItem icon={Settings} label="Perfil" active={currentTab === 'settings'} onClick={() => setTab('settings')} />
    </nav>
  );
};