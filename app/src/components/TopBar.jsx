import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export const TopBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const fullDate = time.toLocaleDateString('es-ES', dateOptions);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-8 flex justify-end pointer-events-none">
      <div className="flex items-center gap-8 bg-black/60 backdrop-blur-2xl border border-neutral-800 py-4 px-8 rounded-4xl pointer-events-auto shadow-2xl">
        
        {/* Fecha (Gris Carbón y Blanco) */}
        <div className="flex items-center gap-3 border-r border-neutral-800 pr-8">
          <Calendar size={18} className="text-neutral-400" />
          <span className="text-xs font-black tracking-[0.2em] text-neutral-300 uppercase italic">
            {fullDate}
          </span>
        </div>
        
        {/* Reloj (Blanco Eléctrico) */}
        <div className="flex items-center gap-4">
          <Clock size={18} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span className="text-2xl font-mono font-bold tracking-tighter text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            {time.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit', 
              hour12: true 
            }).toUpperCase()}
          </span>
        </div>
        
      </div>
    </div>
  );
};