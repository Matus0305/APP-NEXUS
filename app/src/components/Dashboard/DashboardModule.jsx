import React from 'react';
import { LayoutGrid } from 'lucide-react';

export const DashboardModule = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 pb-32">
      <div className="p-6 bg-[#0A0A0A] border border-white/5 rounded-[3rem] flex flex-col items-center shadow-2xl">
        <div className="p-4 bg-white/5 rounded-2xl mb-6">
          <LayoutGrid size={40} className="text-white/20 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">
          Nexo Central
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase italic text-center">
            En_Construcción...
          </p>
        </div>
      </div>
    </div>
  );
};
