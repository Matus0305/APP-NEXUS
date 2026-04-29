import React, { useState, useEffect } from 'react';

export const TopBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const formatted = date.toLocaleDateString('es-ES', options).toUpperCase();
    const parts = formatted.split(', ');
    return { dayName: parts[0], dateNum: parts[1] };
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();
  };

  const dateData = formatDate(time);

  return (
    <div className="h-16 w-full bg-[#0A0A0A] flex items-center justify-between px-4 border-b border-white/5">
      
      {/* Fecha (Izquierda) */}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] text-white/50 font-bold tracking-[0.2em] italic">
          {dateData.dayName},
        </span>
        <span className="text-xs text-white font-bold tracking-wider">
          {dateData.dateNum}
        </span>
      </div>

      {/* Separador sutil */}
      <div className="h-6 w-px bg-white/10 mx-2"></div>

      {/* Hora (Derecha) */}
      <div className="flex items-center">
        <span className="text-sm font-mono font-bold text-white tracking-widest">
          {formatTime(time)}
        </span>
      </div>

    </div>
  );
};