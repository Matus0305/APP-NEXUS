import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { 
  LineChart, Wallet, ArrowUpRight, ArrowDownRight, Target, Car, TrendingDown, TrendingUp, Percent 
} from 'lucide-react';

// MiniStat optimizado para simetría total y prevención de cortes
const MiniStat = ({ label, val, icon, color, subtext }) => (
  <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 rounded-3xl md:rounded-4xl p-4 md:p-6 shadow-2xl relative overflow-hidden group flex flex-col justify-center min-h-27.5">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 relative z-10">
      <div className={`p-1.5 md:p-2 bg-white/5 rounded-lg md:rounded-xl ${color} flex items-center justify-center shadow-inner shrink-0`}>
        {React.cloneElement(icon, { size: 14 })}
      </div>
      <p className="text-[8px] md:text-[9px] font-black tracking-widest text-white/40 uppercase leading-tight line-clamp-1">
        {label}
      </p>
    </div>
    <div className="text-xl sm:text-2xl font-mono font-bold tracking-tighter text-white relative z-10 truncate">
      {val}
    </div>
    {subtext && (
      <p className="text-[7px] md:text-[8px] font-bold uppercase text-white/30 tracking-widest mt-1 md:mt-2 relative z-10 truncate">
        {subtext}
      </p>
    )}
  </div>
);

export const PatrimonyModule = () => {
  const { privacyClass } = usePrivacy();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    netWorth: 0, liquidAssets: 0, vehicleAssets: 0, totalDebt: 0,
    liquidityRatio: 0, opportunityCost: 0, roi: 0, netProfit: 0, totalVehicles: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cuentas } = await supabase.from('nexus_cuentas').select('saldo_actual, tipo');
      let liq = 0, deuda = 0;
      cuentas?.forEach(c => {
        if (c.tipo === 'Crédito') deuda += parseFloat(c.saldo_actual) || 0;
        else liq += parseFloat(c.saldo_actual) || 0;
      });

      const { data: vehiculos } = await supabase.from('vehiculos').select('precio_compra, valor_de_venta');
      let vAutos = 0;
      vehiculos?.forEach(v => {
         const pC = parseFloat(v.precio_compra) || 0;
         const pV = parseFloat(v.valor_de_venta) || pC;
         vAutos += (pC + pV) / 2; 
      });

      const { data: movs } = await supabase.from('nexus_movimientos').select('monto, tipo');
      let ing = 0, gas = 0;
      movs?.forEach(m => {
        if (m.tipo === 'Ingreso') ing += parseFloat(m.monto) || 0;
        if (m.tipo === 'Egreso') gas += parseFloat(m.monto) || 0;
      });

      const utNeta = ing - gas;
      const patTotal = (liq + vAutos) - deuda;
      const ratio = patTotal > 0 ? ((liq / (patTotal + deuda)) * 100) : 0;

      setData({
        netWorth: Math.max(0, patTotal), liquidAssets: liq, vehicleAssets: vAutos,
        totalDebt: deuda, liquidityRatio: ratio, opportunityCost: (liq * 0.05) / 12,
        roi: vAutos > 0 ? ((utNeta / vAutos) * 100) : 0, netProfit: utNeta, totalVehicles: vehiculos?.length || 0
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="w-full h-[80vh] flex items-center justify-center animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Auditando_Capital...</div>
    </div>
  );

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-6xl mx-auto">
        
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase">Patrimonio</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em] mt-2">Inteligencia Financiera</p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
            <LineChart size={20} className="text-indigo-400" />
          </div>
        </header>

        {/* CAPITAL NETO GLOBAL */}
        <div className="w-full bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-4xl p-6 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col group min-h-45">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700" />
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">Capital Neto</h2>
              <p className="text-[9px] font-mono text-indigo-400/80 font-bold tracking-widest uppercase mt-2">Valor de Liquidación</p>
            </div>
            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg shrink-0">
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Inmuebles + Cash - Deuda</p>
            </div>
          </div>
          <div className="relative z-10 border-t border-white/5 mt-6 pt-6">
            <p className={`text-4xl sm:text-6xl md:text-7xl font-mono font-black text-white tracking-tighter truncate ${privacyClass}`}>
              ${Number(data.netWorth).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* GRID DESGLOSE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 p-5 rounded-3xl relative overflow-hidden">
            <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-1">Liquidez</p>
            <p className={`text-2xl font-mono font-bold text-white truncate ${privacyClass}`}>${data.liquidAssets.toLocaleString()}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 p-5 rounded-3xl relative overflow-hidden">
            <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest mb-1">Flota</p>
            <p className={`text-2xl font-mono font-bold text-white truncate ${privacyClass}`}>${data.vehicleAssets.toLocaleString()}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-2xl border border-red-500/10 p-5 rounded-3xl relative overflow-hidden">
            <p className="text-[8px] text-red-400 font-black uppercase tracking-widest mb-1">Deuda</p>
            <p className={`text-2xl font-mono font-bold text-red-400 truncate ${privacyClass}`}>-${data.totalDebt.toLocaleString()}</p>
          </div>
        </div>

        {/* GRID RATIOS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Ratio Liq." val={`${data.liquidityRatio.toFixed(1)}%`} icon={<Percent />} color="text-cyan-400" subtext="Disponibilidad" />
          <MiniStat label="Utilidad" val={`$${data.netProfit.toLocaleString()}`} icon={<TrendingUp />} color="text-emerald-400" subtext="Ganancia Neta" />
          <MiniStat label="ROI" val={`${data.roi.toFixed(1)}%`} icon={<Target />} color="text-yellow-400" subtext="Rendimiento" />
          <MiniStat label="Unidades" val={data.totalVehicles} icon={<Car />} color="text-indigo-400" subtext="En Operación" />
        </div>

        {/* ESTRATEGIA */}
        <div className="bg-black/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-5 md:p-8">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-6 flex items-center gap-2">
             <Target size={14}/> Análisis Estratégico
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black rounded-xl text-red-400 shrink-0"><ArrowDownRight size={18}/></div>
                <div>
                  <p className="text-xs font-bold text-white">Inflación / Oportunidad</p>
                  <p className="text-[8px] font-mono text-white/40 uppercase">Pérdida mensual por ocio</p>
                </div>
              </div>
              <p className={`text-sm font-mono font-bold text-red-400 ${privacyClass}`}>-${data.opportunityCost.toFixed(0)}</p>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-black rounded-xl shrink-0 ${data.roi >= 10 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {data.roi >= 10 ? <ArrowUpRight size={18}/> : <TrendingDown size={18}/>}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Salud del Capital</p>
                  <p className="text-[8px] font-mono text-white/40 uppercase">{data.roi >= 10 ? 'Óptima' : 'Mejorable'}</p>
                </div>
              </div>
              <p className={`text-sm font-mono font-bold ${data.roi >= 10 ? 'text-emerald-400' : 'text-yellow-400'} ${privacyClass}`}>+{data.roi.toFixed(1)}%</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};