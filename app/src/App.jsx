import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavigationBar } from './components/NavigationBar';
import { TopBar } from './components/TopBar';
import { FleetManagement } from './components/fleet/FleetManagement';
import { LogisticsModule } from './components/logistics/LogisticsModule';
import { FlowModule } from './components/flow/FlowModule';
import { DashboardModule } from './components/Dashboard/DashboardModule';
import { ShiftModule } from './components/Shift/ShiftModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { PatrimonyModule } from './components/patrimony/PatrimonyModule';

function App() {
  return (
    <BrowserRouter>
      {/* CONTENEDOR MAESTRO: Negro puro, ocupa toda la pantalla, evita el scroll horizontal */}
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden selection:bg-white/20">
        
        {/* Barra superior fija (TopBar) */}
        <TopBar />

        {/* ÁREA DE CONTENIDO: Ajustada para móvil con scroll suave */}
        <main className="flex-1 relative overflow-y-auto pt-20 pb-32 px-4">
          <div className="max-w-md mx-auto h-full">
            <Routes>
              <Route path="/" element={<DashboardModule />} />
              <Route path="/Dashboard" element={<DashboardModule />} />
              <Route path="/fleet" element={<FleetManagement />} />
              <Route path="/flow" element={<FlowModule />} />
              <Route path="/logistics" element={<LogisticsModule />} />
              <Route path="/shift" element={<ShiftModule />} />
              <Route path="/settings" element={<SettingsModule />} />
              <Route path="/patrimony" element={<PatrimonyModule />} />
            </Routes>
          </div>
        </main>

        {/* Navegación inferior fija */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
           <NavigationBar />
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;