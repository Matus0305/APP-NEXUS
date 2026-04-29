import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavigationBar } from './components/NavigationBar';
import { TopBar } from './components/TopBar';
import { DashboardModule } from './components/Dashboard/DashboardModule';
import { LogisticsModule } from './components/logistics/LogisticsModule';
import { FlowModule } from './components/flow/FlowModule';
import { FleetManagement } from './components/fleet/FleetManagement';
import { ShiftModule } from './components/Shift/ShiftModule';
import { PatrimonyModule } from './components/patrimony/PatrimonyModule';
import { SettingsModule } from './components/settings/SettingsModule';

function App() {
  return (
    <BrowserRouter>
      {/* Contenedor principal: Ocupa el 100% de la altura visual del móvil */}
      <div className="h-screen w-full bg-[#0A0A0A] text-white flex flex-col overflow-hidden">
        
        {/* PISO 1: TOPBAR (Altura fija de 64px) */}
        <header className="h-16 flex-none z-50 border-b border-white/5">
          <TopBar />
        </header>

        {/* PISO 2: MÓDULOS (Área con scroll independiente) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24">
          <div className="max-w-md mx-auto h-full">
            <Routes>
              <Route path="/" element={<DashboardModule />} />
              <Route path="/Dashboard" element={<DashboardModule />} />
              <Route path="/logistics" element={<LogisticsModule />} />
              <Route path="/flow" element={<FlowModule />} />
              <Route path="/fleet" element={<FleetManagement />} />
              <Route path="/shift" element={<ShiftModule />} />
              <Route path="/patrimony" element={<PatrimonyModule />} />
              <Route path="/settings" element={<SettingsModule />} />
            </Routes>
          </div>
        </main>

        {/* PISO 3: NAVEGACIÓN (Fija abajo con desenfoque) */}
        <footer className="fixed bottom-0 left-0 right-0 z-50">
           <NavigationBar />
        </footer>

      </div>
    </BrowserRouter>
  );
}

export default App;