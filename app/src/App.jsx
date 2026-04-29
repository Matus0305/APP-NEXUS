import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';

// Componente temporal de prueba con efecto de "latido" suave
const DummyModule = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[60vh] border border-dashed border-white/10 rounded-3xl bg-white/5 transition-all duration-500 hover:bg-white/10 hover:border-white/20">
    <h1 className="text-xl md:text-3xl text-white/50 font-mono tracking-widest uppercase text-center px-4">
      {title}
    </h1>
  </div>
);

// Extraemos el contenido para poder usar useLocation()
const MainContent = () => {
  const location = useLocation();

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      <header className="flex-none z-40">
        <TopBar />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {/* LA MAGIA ESTÁ AQUÍ: El key hace que React reinicie la animación al cambiar de ruta */}
        <div key={location.pathname} className="max-w-5xl mx-auto h-full animate-fade-in-up">
          <Routes>
            <Route path="/" element={<DummyModule title="DASHBOARD_ACTIVO" />} />
            <Route path="/shift" element={<DummyModule title="MÓDULO_JORNADA" />} />
            <Route path="/fleet" element={<DummyModule title="MÓDULO_FLOTA" />} />
            <Route path="/flow" element={<DummyModule title="MÓDULO_FLUJO_CAJA" />} />
            <Route path="/logistics" element={<DummyModule title="MÓDULO_LOGÍSTICA" />} />
            <Route path="/patrimony" element={<DummyModule title="MÓDULO_PATRIMONIO" />} />
            <Route path="/settings" element={<DummyModule title="MÓDULO_AJUSTES" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <HashRouter>
      <div className="flex h-dvh w-full bg-[#0A0A0A] text-white overflow-hidden selection:bg-white/20 relative">
        
        {/* LUZ AMBIENTAL VOLUMÉTRICA (El toque maestro) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-150 bg-white/3 rounded-[100%] blur-[120px] pointer-events-none z-0"></div>

        {/* NAVEGACIÓN PC/TABLET */}
        <div className="hidden md:flex z-50">
          <Sidebar />
        </div>

        {/* ... (mantén el MainContent y el BottomNav exactamente igual que antes) */}
        {/* ÁREA PRINCIPAL ANIMADA */}
        <MainContent />

        {/* NAVEGACIÓN MÓVIL */}
        <div className="md:hidden fixed bottom-0 left-0 w-full z-100">
          <BottomNav />
        </div>
      </div>
    </HashRouter>
  );
}

export default App;