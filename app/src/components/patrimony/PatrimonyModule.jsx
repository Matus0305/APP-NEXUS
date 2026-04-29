import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { 
  LineChart, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  Car
} from 'lucide-react';

// MiniStat clonado de Billetera
const MiniStat = ({ label, val, icon, color }) => (
  <div className="bg-[#0A0A0A] border border-white/5 rounded-4xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 bg-white/5 rounded-xl ${color} flex items-center justify-center`}>
        {icon}
      </div>
      <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</p>
    </div>
    <div className="text-2xl font-mono font-bold tracking-tighter text-white">{val}</div>
  </div>
);

export const PatrimonyModule = () => {
  const { privacyClass } = usePrivacy();
  const [loading, setLoading] = useState(true);
  
  // Estado con todas las variables financieras reales
  const [data, setData] = useState({
    netWorth: 0,
    liquidAssets: 0,
    investedAssets: 0,
    liquidityRatio: 0,
    opportunityCost: 0,
    roi: 0,
    totalVehicles: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. OBTENER LIQUIDEZ REAL (Desde nexus_cuentas igual que en Billetera)
      const { data: cuentas } = await supabase.from('nexus_cuentas').select('saldo_actual, tipo');
      const liquidez = cuentas?.filter(c => c.tipo !== 'Crédito')
                               .reduce((acc, curr) => acc + (parseFloat(curr.saldo_actual) || 0), 0) || 0;

      // 2. OBTENER PRECIO BASE DEL VEHÍCULO
      const { data: vehiculos } = await supabase.from('vehiculos').select('precio_compra');
      const precioVehiculos = vehiculos?.reduce((acc, curr) => acc + (parseFloat(curr.precio_compra) || 0), 0) || 0;
      const totalVehiculos = vehiculos?.length || 0;

      // 3. OBTENER FLUJO DE CAJA (Ingresos y Egresos desde nexus_movimientos)
      const { data: movimientos } = await supabase.from('nexus_movimientos').select('monto, tipo');
      let ingresosTotales = 0;
      let gastosTotales = 0; // Esto representará mantenimientos, gasolina, etc.

      movimientos?.forEach(mov => {
        if (mov.tipo === 'Ingreso') ingresosTotales += parseFloat(mov.monto) || 0;
        if (mov.tipo === 'Egreso') gastosTotales += parseFloat(mov.monto) || 0;
      });

      // 4. MATEMÁTICAS NEXUS (La Inteligencia Financiera)
      
      // A. Capital Invertido = Lo que costó el carro + Lo que has gastado en mantenerlo y operarlo
      const capitalInvertido = precioVehiculos + gastosTotales;

      // B. Patrimonio Neto = Dinero en mano + Dinero Invertido en el negocio
      const patrimonioTotal = liquidez + capitalInvertido;

      // C. Ratio de Liquidez (%)
      const ratio = patrimonioTotal > 0 ? ((liquidez / patrimonioTotal) * 100) : 0;

      // D. Costo de Oportunidad (Calculado al 5% anual, dividido entre 12 para mostrar pérdida mensual)
      const costoOportunidadMensual = (liquidez * 0.05) / 12;

      // E. Rendimiento Estimado (ROI) = (Ganancia Total / Capital Invertido) * 100
      const roiCalculado = capitalInvertido > 0 ? ((ingresosTotales / capitalInvertido) * 100) : 0;

      setData({
        netWorth: patrimonioTotal,
        liquidAssets: liquidez,
        investedAssets: capitalInvertido,
        liquidityRatio: ratio,
        opportunityCost: costoOportunidadMensual,
        roi: roiCalculado,
        totalVehicles: totalVehiculos
      });

    } catch (error) {
      console.error('Error sincronizando activos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase text-center mt-20 animate-pulse">Analizando_Activos...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans relative pb-32 animate-in fade-in duration-700">
      <div className="p-6 space-y-10 max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-white">Patrimonio</h1>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-2">Inteligencia Financiera</p>
          </div>
          <div className="w-12 h-12 bg-white/5 text-white rounded-full flex items-center justify-center border border-white/10 hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <LineChart size={24} strokeWidth={2} />
          </div>
        </header>

        {/* TARJETA PRINCIPAL: CAPITAL NETO GLOBAL */}
        <div style={{ background: `linear-gradient(135deg, #151515aa, #000000)` }} className="w-full h-64 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
          <div className="z-10 flex justify-between items-start">
            <div>
              <h2 className="text-4xl font-bold text-white tracking-tighter">Capital Neto Global</h2>
              <p className="text-xs font-mono text-white/40 tracking-[0.2em] uppercase mt-2">Valoración Total del Negocio</p>
            </div>
          </div>
          <div className="z-10">
            <p className="text-xs text-white/50 uppercase font-black tracking-widest mb-1">Activos + Liquidez</p>
            <p className={`text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl ${privacyClass}`}>
              ${Number(data.netWorth).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* GRID SUPERIOR: DESGLOSE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-4xl">
            <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Liquidez Real</p>
            <p className={`text-3xl font-mono font-bold tracking-tighter ${privacyClass}`}>
              ${data.liquidAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
          <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-4xl">
            <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Capital Invertido (Autos + Gastos)</p>
            <p className={`text-3xl font-mono font-bold text-white/40 tracking-tighter ${privacyClass}`}>
              ${data.investedAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* GRID DE RATIOS */}
        <div className="grid grid-cols-2 gap-4">
          <MiniStat 
            label="Ratio de Liquidez" 
            val={<span className={privacyClass}>{data.liquidityRatio.toFixed(1)}%</span>} 
            icon={<Wallet size={16}/>} 
            color="text-blue-400" 
          />
          <MiniStat 
            label="Vehículos Registrados" 
            val={data.totalVehicles} 
            icon={<Car size={16}/>} 
            color="text-emerald-400" 
          />
        </div>

        {/* PANEL ESTRATÉGICO */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col max-h-150">
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-white/30" />
              <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Plan Estratégico</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-2">
            <div className="space-y-1">
              
              <div className="flex justify-between items-center py-4 px-5 bg-white/2 border border-white/3 rounded-2xl group hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-black border border-white/5 text-red-400"><ArrowDownRight size={16}/></div>
                  <div>
                    <p className="text-sm font-bold text-white/90">Costo de Oportunidad</p>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Pérdida mensual por dinero inactivo</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <p className={`font-mono font-bold text-lg text-red-400 ${privacyClass}`}>
                    -${data.opportunityCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center py-4 px-5 bg-white/2 border border-white/3 rounded-2xl group hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-black border border-white/5 ${data.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.roi >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/90">Rendimiento Histórico (ROI)</p>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Ganancia vs Capital Invertido</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <p className={`font-mono font-bold text-lg ${privacyClass} ${data.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.roi > 0 ? '+' : ''}{data.roi.toFixed(2)}%
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};