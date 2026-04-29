import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // La pantalla de carga dura 2 segundos, luego inicia el desvanecimiento
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      
      // Espera medio segundo a que termine de desvanecerse para quitarla del todo
      setTimeout(onFinish, 500); 
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    // z-[999] asegura que cubra TODA la aplicación
    <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0A0A0A] transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Logo Flotante con brillo detrás */}
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-white/10 rounded-full blur-[40px] animate-pulse"></div>
        <img 
          src="/icon-512x512.png" 
          alt="NEXUS Logo" 
          className="w-24 h-24 object-contain relative z-10 animate-in zoom-in duration-1000 ease-out"
        />
      </div>

      {/* Tipografía Corporativa */}
      <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150 fill-mode-both">
        <h1 className="text-3xl md:text-4xl font-black tracking-[0.4em] text-white italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          NEXUS
        </h1>
        <p className="text-[10px] text-white/40 tracking-[0.5em] font-mono mt-3 uppercase">
          Core System
        </p>
      </div>

      {/* Barra de Progreso Minimalista */}
      <div className="absolute bottom-20 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-white animate-loading-bar shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
      </div>

    </div>
  );
};