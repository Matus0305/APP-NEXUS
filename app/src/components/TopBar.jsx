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
    <div className="h-14 w-full border-b border-white/5 flex items-center justify-end px-4 md:px-8 bg-black/50 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-white/40 font-mono tracking-widest">{dateStr}</span>
        <span className="text-sm font-bold tracking-wider">{timeStr}</span>
      </div>
    </div>
  );
};