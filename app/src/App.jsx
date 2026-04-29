import React, { useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { SplashScreen } from './components/SplashScreen';
import { SettingsModule } from './components/settings/SettingsModule';
import { FleetManagement } from './components/fleet/FleetManagement';
import { ShiftModule} from './components/Shift/ShiftModule';
import { LogisticsModule } from './components/logistics/LogisticsModule';
import { FlowModule } from './components/flow/FlowModule';
import { PatrimonyModule } from './components/patrimony/PatrimonyModule';
import { AlertCircle } from '@phosphor-icons/react';
import './index.css';
import { triggerHaptic } from './utils/haptics';

// Componente temporal para los demás
const DummyModule = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[60vh] border border-dashed border-white/10 rounded-[2.5rem] bg-white/5 transition-all duration-500">
    <h1 className="text-xl md:text-3xl text-white/50 font-mono tracking-widest uppercase text-center px-4">
      {title}
    </h1>
  </div>
);

const MainContent = () => {
  const location = useLocation();

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      <header className="flex-none z-40">
        <TopBar />
      </header>

      {/* Añadimos pt-24 en móvil y md:pt-28 en PC para empujar el contenido por debajo de la barra */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-24 md:pt-28 pb-24 md:pb-8">
        <div key={location.pathname} className="max-w-5xl mx-auto h-full animate-fade-in-up">
          <Routes>
            <Route path="/" element={<DummyModule title="DASHBOARD_ACTIVO" />} />
            <Route path="/shift" element={<ShiftModule />} />
            <Route path="/fleet" element={<FleetManagement />} />
            <Route path="/flow" element={<FlowModule />} />
            <Route path="/logistics" element={<LogisticsModule />} />
            <Route path="/patrimony" element={<PatrimonyModule />} />
            <Route path="/settings" element={<SettingsModule />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

function App() {
  // Estado para controlar la pantalla de carga
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {/* Si showSplash es true, se muestra por encima de todo */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <HashRouter>
        <div className="flex h-dvh w-full bg-[#0A0A0A] text-white overflow-hidden selection:bg-white/20 relative">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-150 bg-white/3 rounded-[100%] blur-[120px] pointer-events-none z-0"></div>

          <div className="hidden md:flex z-50">
            <Sidebar />
          </div>

          <MainContent />

          <div className="md:hidden fixed bottom-0 left-0 w-full z-100">
            <BottomNav />
          </div>
        </div>
      </HashRouter>
    </>
  );
}

export default App;