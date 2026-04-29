import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';

// Componente temporal
const DummyModule = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[60vh] border border-dashed border-white/10 rounded-3xl bg-white/5">
    <h1 className="text-xl md:text-3xl text-white/50 font-mono tracking-widest uppercase text-center px-4">{title}</h1>
  </div>
);

function App() {
  return (
    <HashRouter>
      {/* CAMBIO CLAVE: Usamos h-[100dvh] (Dynamic Viewport) para que ignore la barra del navegador de Chrome/Safari */}
      <div className="flex h-dvh w-full bg-[#0A0A0A] text-white overflow-hidden selection:bg-white/20 relative">
        
        {/* NAVEGACIÓN PC/TABLET */}
        <div className="hidden md:flex z-50">
          <Sidebar />
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          
          <header className="flex-none z-40">
            <TopBar />
          </header>

          {/* Aumentamos un poco el padding-bottom (pb-24) para que la barra no tape el contenido final */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-5xl mx-auto h-full">
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

        {/* CAMBIO CLAVE: Sacamos la BottomNav del contenedor principal y le damos posición FIXED pura */}
        <div className="md:hidden fixed bottom-0 left-0 w-full z-100">
          <BottomNav />
        </div>

      </div>
    </HashRouter>
  );
}

export default App;