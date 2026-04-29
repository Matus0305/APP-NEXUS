import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Reducimos a 1.2 segundos (1200ms) de carga para que sea veloz
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // El desvanecimiento ahora dura solo 300ms
      setTimeout(onFinish, 300); 
    }, 1200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-999 flex flex-col items-center justify-center bg-[#0A0A0A] transition-opacity duration-300 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
        {/* Cambiamos duration-1000 a duration-500 para un zoom más enérgico */}
        <img 
          src="/icon-512x512.png" 
          alt="NEXUS Logo" 
          className="w-24 h-24 object-contain relative z-10 animate-in zoom-in duration-500 ease-out"
        />
      </div>

      <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100 fill-mode-both">
        <h1 className="text-3xl md:text-4xl font-black tracking-[0.4em] text-white italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          NEXUS
        </h1>
        <p className="text-[10px] text-white/40 tracking-[0.5em] font-mono mt-3 uppercase">
          Core System
        </p>
      </div>

      <div className="absolute bottom-20 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
        {/* La barra de carga ahora es mucho más rápida */}
        <div className="h-full bg-white animate-loading-bar shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
      </div>

    </div>
  );
};