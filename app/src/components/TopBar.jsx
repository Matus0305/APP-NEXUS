import React, { useState, useEffect } from 'react';

export const TopBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    // backdrop-blur-2xl y bg-black/40 crean el cristal perfecto
    <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-end px-6 md:px-8 bg-black/40 backdrop-blur-2xl border-b border-white/5 z-50">
      
      {/* Indicador de estado en vivo (Punto verde palpitante) */}
      <div className="absolute left-6 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[9px] text-white/30 font-bold tracking-[0.3em]">ONLINE</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] text-white/40 font-mono tracking-widest">{dateStr}</span>
        <span className="text-sm font-black tracking-wider text-white/90">{timeStr}</span>
      </div>
    </div>
  );
};