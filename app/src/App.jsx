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
// Asegúrate de que este componente reciba props correctamente
const Placeholder = ({ title }) => (
  <div className="h-[70vh] flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="inline-block p-4 bg-neutral-900 rounded-3xl border border-neutral-800 animate-pulse">
        <p className="text-[10px] font-black tracking-[0.5em] text-neutral-400 uppercase italic">NEXUS_CORE</p>
      </div>
      <h2 className="text-neutral-500 font-mono text-xs uppercase tracking-[0.3em]">
        {title} // MÓDULO_EN_DESARROLLO
      </h2>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden selection:bg-white/20 selection:text-white">
        
        <TopBar />

        <main className="flex-1 relative overflow-y-auto bg-linear-to-b from-black via-[#0a0a0a] to-[#111111] p-6 md:p-12 pt-32 pb-32">
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              {/* REVISA ESTO: El componente DEBE ir entre < /> en el prop element */}
              <Route path="/Dashboard" element={<DashboardModule />} />
              <Route path="/fleet" element={<FleetManagement />} />
              <Route path="/flow" element={<FlowModule />} />
              <Route path="/logistics" element={<LogisticsModule />} />
              <Route path="/shift" element={<ShiftModule />} />
              <Route path="/settings" element={<SettingsModule />} />
              {/* CORRECCIÓN: No pases la función Placeholder, pasa el componente ejecutado */}
              <Route path="/patrimony" element={<PatrimonyModule />} />
              
              
              {/* Ruta por defecto para evitar pantalla blanca si no hay match */}
              <Route path="/" element={<DashboardModule />} />
            </Routes>
          </div>
        </main>

        <NavigationBar />
      </div>
    </BrowserRouter>
  );
}

export default App;