import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { 
  LineChart, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  Car,
  TrendingDown,
  Percent
} from 'lucide-react';

// MiniStat mejorado con estilo "Cristal"
const MiniStat = ({ label, val, icon, color, subtext }) => (
  <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
    <div className="flex items-center gap-3 mb-4 relative z-10">
      <div className={`p-2 bg-white/5 rounded-xl ${color} flex items-center justify-center shadow-inner`}>
        {icon}
      </div>
      <p className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</p>
    </div>
    <div className="text-3xl font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] relative z-10">{val}</div>
    {subtext && <p className="text-[8px] font-bold uppercase text-white/30 tracking-widest mt-2 relative z-10">{subtext}</p>}
  </div>
);

export const PatrimonyModule = () => {
  const { privacyClass } = usePrivacy();
  const [loading, setLoading] = useState(true);
  
  // Estado con todas las variables financieras reales y auditadas
  const [data, setData] = useState({
    netWorth: 0,
    liquidAssets: 0,
    vehicleAssets: 0,
    totalDebt: 0,
    liquidityRatio: 0,
    opportunityCost: 0,
    roi: 0,
    netProfit: 0,
    totalVehicles: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. LIQUIDEZ Y DEUDA REAL (Billetera)
      const { data: cuentas } = await supabase.from('nexus_cuentas').select('saldo_actual, tipo');
      let liquidezDisponible = 0;
      let deudaAcumulada = 0;

      cuentas?.forEach(c => {
        if (c.tipo === 'Crédito') {
          deudaAcumulada += parseFloat(c.saldo_actual) || 0;
        } else {
          liquidezDisponible += parseFloat(c.saldo_actual) || 0;
        }
      });

      // 2. VALOR DE ACTIVOS FIJOS (Vehículos)
      // *NOTA: En un futuro, restaremos la depreciación acumulada a este valor. Por ahora usamos el precio de compra.
      const { data: vehiculos } = await supabase.from('vehiculos').select('precio_compra, valor_de_venta');
      let valorAutos = 0;
      vehiculos?.forEach(v => {
         // Usamos un promedio entre precio de compra y valor de reventa para ser conservadores
         const precioC = parseFloat(v.precio_compra) || 0;
         const precioV = parseFloat(v.valor_de_venta) || precioC;
         valorAutos += (precioC + precioV) / 2; 
      });
      const totalVehiculos = vehiculos?.length || 0;

      // 3. FLUJO DE CAJA (Rendimiento Operativo)
      const { data: movimientos } = await supabase.from('nexus_movimientos').select('monto, tipo');
      let ingresosTotales = 0;
      let gastosTotales = 0; 

      movimientos?.forEach(mov => {
        if (mov.tipo === 'Ingreso') ingresosTotales += parseFloat(mov.monto) || 0;
        if (mov.tipo === 'Egreso') gastosTotales += parseFloat(mov.monto) || 0;
      });

      // 4. MATEMÁTICAS NEXUS (AUDITADAS Y CORREGIDAS)
      
      // A. Utilidad Neta: Lo que realmente ha ganado el negocio (Ingresos - Egresos Operativos)
      const utilidadNetaReal = ingresosTotales - gastosTotales;

      // B. Patrimonio Neto (Net Worth): (Dinero en Banco + Valor de Autos) - Deudas de Tarjetas
      const patrimonioTotal = (liquidezDisponible + valorAutos) - deudaAcumulada;

      // C. Ratio de Liquidez (% del patrimonio que es dinero rápido)
      // Peligro: Si es > 60%, hay dinero estancado. Si es < 10%, riesgo de quiebra técnica.
      const ratioLiquidez = patrimonioTotal > 0 ? ((liquidezDisponible / (patrimonioTotal + deudaAcumulada)) * 100) : 0;

      // D. Costo de Oportunidad: Dinero inactivo perdiendo contra la inflación/inversión (5% anual / 12 meses)
      const costoOportunidadMensual = (liquidezDisponible * 0.05) / 12;

      // E. ROI (Retorno sobre Inversión): (Utilidad Neta / Valor de los Activos Comprados) * 100
      // *CORRECCIÓN: Los gastos operativos no se suman a la inversión, se restan de los ingresos.
      const roiCalculado = valorAutos > 0 ? ((utilidadNetaReal / valorAutos) * 100) : 0;

      setData({
        netWorth: Math.max(0, patrimonioTotal), // Nunca mostrar un patrimonio negativo sin contexto
        liquidAssets: liquidezDisponible,
        vehicleAssets: valorAutos,
        totalDebt: deudaAcumulada,
        liquidityRatio: ratioLiquidez,
        opportunityCost: costoOportunidadMensual,
        roi: roiCalculado,
        netProfit: utilidadNetaReal,
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
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Auditando_Capital...</div>
      </div>
    );
  }

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in fade-in duration-700">
      <div className="p-4 md:p-6 space-y-8 max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Patrimonio</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em] mt-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" /> Inteligencia Financiera
            </p>
          </div>
          <div className="hidden md:flex w-14 h-14 bg-black/40 backdrop-blur-md text-white rounded-2xl items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <LineChart size={28} strokeWidth={2} className="text-indigo-400" />
          </div>
        </header>

        {/* TARJETA PRINCIPAL: CAPITAL NETO GLOBAL (El número que importa) */}
        <div className="w-full bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Capital Neto</h2>
              <p className="text-[10px] font-mono text-indigo-400/80 font-bold tracking-[0.2em] uppercase mt-2">Valor de Liquidación Total</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Fórmula General</p>
              <p className="text-xs font-mono text-white/60 mt-1">(Liquidez + Activos) - Deudas</p>
            </div>
          </div>
          
          <div className="relative z-10 mt-4 border-t border-white/5 pt-8">
            <p className={`text-6xl md:text-8xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] ${privacyClass}`}>
              ${Number(data.netWorth).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>

        {/* GRID SUPERIOR: EL DESGLOSE DE LA RIQUEZA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={40} /></div>
            <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">Liquidez Bancaria</p>
            <p className={`text-3xl font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] ${privacyClass}`}>
              ${data.liquidAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
            <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mt-2">Dinero en Cuentas</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Car size={40} /></div>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">Valor Activos Fijos</p>
            <p className={`text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] ${privacyClass}`}>
              ${data.vehicleAssets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
            <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mt-2">Valor estimado del Garaje</p>
          </div>

          <div className="bg-black/40 backdrop-blur-2xl border border-red-500/10 p-8 rounded-[2.5rem] shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingDown size={40} className="text-red-500" /></div>
            <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">Deuda Comprometida</p>
            <p className={`text-3xl font-mono font-bold text-red-400 tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.2)] ${privacyClass}`}>
              -${data.totalDebt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
            <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mt-2">Tarjetas y Préstamos</p>
          </div>
        </div>

        {/* GRID DE RATIOS E INTELIGENCIA (LOS KPI DEL INVERSOR) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat 
            label="Ratio Liquidez" 
            val={<span className={privacyClass}>{data.liquidityRatio.toFixed(1)}%</span>} 
            icon={<Percent size={18}/>} 
            color="text-cyan-400" 
            subtext={data.liquidityRatio > 50 ? "Exceso de liquidez" : "Liquidez Óptima"}
          />
          <MiniStat 
            label="Utilidad Operativa" 
            val={<span className={privacyClass}>${data.netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>} 
            icon={<TrendingUp size={18}/>} 
            color="text-emerald-400"
            subtext="Ganancia Neta Real" 
          />
          <MiniStat 
            label="Rendimiento (ROI)" 
            val={<span className={privacyClass}>{data.roi.toFixed(1)}%</span>} 
            icon={<Target size={18}/>} 
            color={data.roi > 15 ? "text-green-400" : "text-yellow-400"}
            subtext="Retorno de Activos" 
          />
          <MiniStat 
            label="Activos (Flota)" 
            val={data.totalVehicles} 
            icon={<Car size={18}/>} 
            color="text-indigo-400"
            subtext="Vehículos Generando" 
          />
        </div>

        {/* PANEL DE ADVERTENCIAS / ESTRATEGIA */}
        <div className="bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
            <div className="p-3 bg-white/5 rounded-2xl text-white/50 shadow-inner">
              <Target size={18} />
            </div>
            <h3 className="text-[11px] font-black tracking-widest uppercase text-white/60">Análisis Estratégico</h3>
          </div>

          <div className="space-y-3">
            {/* Costo de Oportunidad */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white/5 border border-white/5 rounded-3xl group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-5 mb-4 md:mb-0">
                <div className="p-4 rounded-2xl bg-black border border-white/5 text-red-400 shadow-inner">
                  <ArrowDownRight size={20}/>
                </div>
                <div>
                  <p className="text-base font-bold text-white/90 tracking-tight">Costo de Oportunidad</p>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">Pérdida por inflación (Dinero en Banco)</p>
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto">
                <p className={`text-2xl font-mono font-bold text-red-400 ${privacyClass}`}>
                  -${data.opportunityCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} /mes
                </p>
              </div>
            </div>

            {/* Diagnóstico de Negocio */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white/5 border border-white/5 rounded-3xl group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-5 mb-4 md:mb-0">
                <div className={`p-4 rounded-2xl bg-black border border-white/5 shadow-inner ${data.roi >= 10 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {data.roi >= 10 ? <ArrowUpRight size={20}/> : <TrendingDown size={20}/>}
                </div>
                <div>
                  <p className="text-base font-bold text-white/90 tracking-tight">Diagnóstico de Capital</p>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">
                    {data.roi >= 10 ? 'Negocio Rentable' : 'El capital no rinde lo suficiente'}
                  </p>
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto">
                <p className={`text-2xl font-mono font-bold ${data.roi >= 10 ? 'text-emerald-400' : 'text-yellow-400'} ${privacyClass}`}>
                  {data.roi > 0 ? '+' : ''}{data.roi.toFixed(2)}% ROI
                </p>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};