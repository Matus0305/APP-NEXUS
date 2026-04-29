import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { NavigationBar } from './components/NavigationBar';

// Tus módulos
import { DashboardModule } from './components/Dashboard/DashboardModule';
import { LogisticsModule } from './components/logistics/LogisticsModule';
import { FlowModule } from './components/flow/FlowModule';
import { FleetManagement } from './components/fleet/FleetManagement';
import { ShiftModule } from './components/Shift/ShiftModule';
import { PatrimonyModule } from './components/patrimony/PatrimonyModule';
import { SettingsModule } from './components/settings/SettingsModule';

function App() {
  // Empezamos siempre en el Dashboard
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Función que decide qué módulo mostrar
  const renderModule = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardModule />;
      case 'logistics': return <LogisticsModule />;
      case 'flow': return <FlowModule />;
      case 'fleet': return <FleetManagement />;
      case 'shift': return <ShiftModule />;
      case 'patrimony': return <PatrimonyModule />;
      case 'settings': return <SettingsModule />;
      default: return <DashboardModule />;
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white flex flex-col overflow-hidden">
      
      {/* PISO 1: TOPBAR */}
      <header className="h-16 flex-none z-50 border-b border-white/5">
        <TopBar />
      </header>

      {/* PISO 2: EL MÓDULO ACTIVO */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24">
        <div className="max-w-md mx-auto h-full">
          {renderModule()}
        </div>
      </main>

      {/* PISO 3: NAVEGACIÓN */}
      <footer className="fixed bottom-0 left-0 right-0 z-50">
         <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </footer>

    </div>
  );
}

export default App;