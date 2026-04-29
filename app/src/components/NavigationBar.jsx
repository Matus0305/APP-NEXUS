import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutGrid, 
  Gauge, 
  Route, 
  LineChart, 
  SlidersHorizontal, 
  Wallet,
  NotebookPen
} from 'lucide-react';

export const NavigationBar = () => {
  const menuItems = [
    { path: '/Dashboard', icon: LayoutGrid, label: 'Resumen' },
    { path: '/shift', icon: NotebookPen, label: 'Jornada' },
    { path: '/fleet', icon: Gauge, label: 'Vehículos' },
    { path: '/flow', icon: Wallet, label: 'Billetera' },
    { path: '/logistics', icon: Route, label: 'Logística' },
    { path: '/patrimony', icon: LineChart, label: 'Patrimonio' },
    { path: '/settings', icon: SlidersHorizontal, label: 'Ajustes' },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-6">
      <nav className="bg-black/60 backdrop-blur-3xl border border-neutral-800 p-2 rounded-[2.5rem] flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center min-w-18.75 md:min-w-22.5 py-3 rounded-4xl transition-all duration-500 group
              ${isActive 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-105' 
                : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}
            `}
          >
            {/* Usamos una función anónima para renderizar el icono de forma segura */}
            {({ isActive }) => (
              <>
                {React.createElement(item.icon, {
                  size: 20,
                  strokeWidth: isActive ? 2.5 : 2,
                  className: `transition-transform duration-300 ${isActive ? '' : 'group-hover:-translate-y-0.5'}`
                })}
                
                <span className="text-[9px] font-black tracking-widest uppercase mt-1.5 opacity-80">
                  {item.label}
                </span>

                {/* El punto indicador ahora vive aquí, feliz y sin causar errores de anidación */}
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-black rounded-full animate-in zoom-in duration-300" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};