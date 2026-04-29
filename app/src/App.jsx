import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';

// Componente temporal para probar que la navegación funciona
const DummyModule = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[60vh] border border-dashed border-white/10 rounded-3xl bg-white/5">
    <h1 className="text-xl md:text-3xl text-white/50 font-mono tracking-widest uppercase">{title}</h1>
  </div>
);

function App() {
  return (
    <HashRouter>
      {/* Contenedor Maestro: Ocupa toda la pantalla, bloquea el scroll general */}
      <div className="flex h-screen w-full bg-[#0A0A0A] text-white overflow-hidden selection:bg-white/20">
        
        {/* NAVEGACIÓN PC/TABLET: Visible desde pantallas medianas (md), oculto en móvil */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* ÁREA PRINCIPAL: Se ajusta al espacio restante */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          {/* BARRA SUPERIOR: Fecha y Hora */}
          <header className="flex-none z-40">
            <TopBar />
          </header>

          {/* ÁREA DE MÓDULOS: Aquí vivirán tus componentes reales. Tiene scroll independiente. */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
            <div className="max-w-5xl mx-auto h-full">
              <Routes>
                <Route path="/" element={<DummyModule title="DASHBOARD_ACTIVO" />} />
                <Route path="/shift" element={<DummyModule title="JORNADA" />} />
                <Route path="/fleet" element={<DummyModule title="FLOTA" />} />
                <Route path="/flow" element={<DummyModule title="FLUJO_DE_CAJA" />} />
                <Route path="/logistics" element={<DummyModule title="LOGÍSTICA" />} />
                <Route path="/patrimony" element={<DummyModule title="PATRIMONIO" />} />
                <Route path="/settings" element={<DummyModule title="AJUSTES" />} />
              </Routes>
            </div>
          </main>

          {/* NAVEGACIÓN MÓVIL: Visible en móvil, oculta en PC (md:hidden) */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-50">
            <BottomNav />
          </div>

        </div>
      </div>
    </HashRouter>
  );
}

export default App;