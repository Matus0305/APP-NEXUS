import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Play, Square, Plus, Minus, Clock, MapPin, Car, DollarSign, Wallet, TrendingDown, Wrench, CheckCircle2, X, Calendar, History, Trash2, ShieldCheck, AlertTriangle, Pause, Navigation
} from 'lucide-react';

// ==========================================
// COMPONENTE: RELOJ INDEPENDIENTE (A PRUEBA DE PAUSAS)
// ==========================================
const LiveTimer = ({ startTime, isPaused, pauseStartTime, accumulatedPauseSeconds }) => {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      let now = new Date().getTime();
      // Si está en pausa, congelamos el tiempo en el momento que se pausó
      if (isPaused && pauseStartTime) {
        now = new Date(pauseStartTime).getTime();
      }
      // Calculamos la diferencia restando también los segundos de pausas anteriores
      const diff = now - new Date(startTime).getTime() - ((accumulatedPauseSeconds || 0) * 1000);
      
      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused, pauseStartTime, accumulatedPauseSeconds]);

  return <>{time}</>;
};

// ==========================================
// HELPER: CAPTURADOR DE GPS INVISIBLE
// ==========================================
const getCoordinates = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: false, timeout: 4000 } // Rápido, sin trabar la app
    );
  });
};

// ==========================================
// COMPONENTE PRINCIPAL: JORNADA
// ==========================================
export const ShiftModule = () => {
  const { data: vehiculos, loading: loadV, refetch: refetchVehiculos } = useSupabaseQuery('vehiculos');
  const { data: cuentas, loading: loadC } = useSupabaseQuery('nexus_cuentas');
  const { data: jornadasActivas, refetch: refetchJornadas } = useSupabaseQuery('nexus_jornadas');

  const activeShift = jornadasActivas?.find(j => j.estado === 'Activa' || j.estado === 'Pausada');
  const activeVehicle = vehiculos?.find(v => v.id === activeShift?.vehiculo_id);

  const [viewState, setViewState] = useState(1);
  const [startForm, setStartForm] = useState({ vehiculo_id: '', hora_inicio: '', odometro_inicial: '' });
  const [endForm, setEndForm] = useState({ hora_fin: '', odometro_final: '' });
  
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [txForm, setTxForm] = useState({ tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });

  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState({ aceite: false, refrigerante: false, llantas: false, limpieza: false });
  const isChecklistComplete = Object.values(checklistItems).every(Boolean);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeShift) setViewState(2);
    else setViewState(1);
  }, [activeShift]);

  useEffect(() => {
    if (viewState === 1 && vehiculos && vehiculos.length > 0) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartForm({
        vehiculo_id: vehiculos[0].id,
        hora_inicio: now.toISOString().slice(0, 16),
        odometro_inicial: vehiculos[0].millaje_actual || ''
      });
    }
  }, [viewState, vehiculos]);

  const handlePreStart = (e) => {
      e.preventDefault();
      triggerHaptic('light');
      setShowChecklist(true);
  };

  const handleStartShift = async () => {
    triggerHaptic('medium');
    setIsSubmitting(true);
    try {
      if (!startForm.vehiculo_id) throw new Error("No hay vehículo seleccionado.");
      
      const selectedVehicle = vehiculos.find(v => v.id === startForm.vehiculo_id);
      const odometroIngresado = parseFloat(startForm.odometro_inicial);
      const diffMillasPersonales = odometroIngresado - (selectedVehicle.millaje_actual || 0);

      // 1. AUDITORÍA DE MILLAS
      if (diffMillasPersonales > 0) {
          await supabase.from('vehiculos').update({ millaje_actual: odometroIngresado }).eq('id', selectedVehicle.id);
      } else if (diffMillasPersonales < 0) {
          throw new Error("El odómetro ingresado es menor al registrado en el garaje.");
      }

      // 2. CAPTURA GPS
      const coords = await getCoordinates();

      // 3. INICIAR JORNADA
      const { error } = await supabase.from('nexus_jornadas').insert([{
        vehiculo_id: startForm.vehiculo_id,
        hora_inicio: new Date(startForm.hora_inicio).toISOString(),
        odometro_inicial: odometroIngresado,
        estado: 'Activa',
        lat_inicio: coords.lat,
        lng_inicio: coords.lng
      }]);
      
      if (error) throw error;
      
      triggerHaptic('heavy');
      setShowChecklist(false);
      setChecklistItems({ aceite: false, refrigerante: false, llantas: false, limpieza: false });
      refetchJornadas();
      refetchVehiculos();
    } catch (err) {
      triggerHaptic('heavy');
      alert(`Error al iniciar: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  // HANDLER: PAUSA Y REANUDACIÓN
  const handleTogglePause = async () => {
    triggerHaptic('heavy');
    setIsSubmitting(true);
    try {
      if (activeShift.estado === 'Activa') {
        // Pausar
        await supabase.from('nexus_jornadas').update({
          estado: 'Pausada',
          inicio_pausa: new Date().toISOString()
        }).eq('id', activeShift.id);
      } else {
        // Reanudar
        const now = new Date().getTime();
        const startPause = new Date(activeShift.inicio_pausa).getTime();
        const diffSeconds = Math.floor((now - startPause) / 1000);
        const newAccumulated = (activeShift.segundos_pausa || 0) + diffSeconds;

        await supabase.from('nexus_jornadas').update({
          estado: 'Activa',
          inicio_pausa: null,
          segundos_pausa: newAccumulated
        }).eq('id', activeShift.id);
      }
      refetchJornadas();
    } catch (err) { alert(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleTransaction = async (e, type) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSubmitting(true);
    const monto = parseFloat(txForm.monto);

    try {
      const cuenta = cuentas.find(c => c.id === txForm.cuenta_id);
      if (!cuenta) throw new Error("Selecciona una cuenta válida");

      let cbGenerado = 0;
      if (type === 'egreso' && (cuenta.tipo === 'Crédito' || cuenta.tipo === 'Débito') && parseFloat(txForm.porcentaje_cashback) > 0) {
        cbGenerado = monto * (parseFloat(txForm.porcentaje_cashback) / 100);
      }

      const { error: movError } = await supabase.from('nexus_movimientos').insert([{
        cuenta_id: cuenta.id, jornada_id: activeShift.id, 
        tipo: type === 'ingreso' ? 'Ingreso' : 'Egreso', monto: monto,
        cashback_generado: cbGenerado, descripcion: `Jornada: ${txForm.tipo} (${txForm.metodo})`
      }]);
      if (movError) throw movError;

      let nuevoSaldo = Number(cuenta.saldo_actual);
      nuevoSaldo = cuenta.tipo === 'Crédito' 
        ? (type === 'ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto)
        : (type === 'ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto);
      
      const nuevoCashbackAcumulado = Number(cuenta.cashback_acumulado || 0) + cbGenerado;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado }).eq('id', cuenta.id);

      let updateData = {};
      if (type === 'ingreso') {
        if (txForm.tipo === 'Uber') updateData = { ingresos_uber: Number(activeShift.ingresos_uber) + monto };
        if (txForm.tipo === 'InDrive') updateData = { ingresos_indrive: Number(activeShift.ingresos_indrive) + monto };
        if (txForm.tipo === 'Propina') updateData = { propinas: Number(activeShift.propinas) + monto };
      } else {
        if (txForm.tipo === 'Gasolina') updateData = { gastos_combustible: Number(activeShift.gastos_combustible) + monto };
        if (txForm.tipo === 'Comida/Otro') updateData = { gastos_otros: Number(activeShift.gastos_otros) + monto };
      }
      
      await supabase.from('nexus_jornadas').update(updateData).eq('id', activeShift.id);

      triggerHaptic('heavy');
      setShowIncomeModal(false); setShowExpenseModal(false);
      setTxForm({ tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });
      refetchJornadas();
    } catch (err) { alert(err.message); } 
    finally { setIsSubmitting(false); }
  };

  const prepareCheckout = () => {
    triggerHaptic('light');
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEndForm({ hora_fin: now.toISOString().slice(0, 16), odometro_final: activeShift.odometro_inicial });
    setViewState(3);
  };

  const handleEndShift = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    
    if(parseFloat(endForm.odometro_final) < parseFloat(activeShift.odometro_inicial)) {
        setIsSubmitting(false);
        return alert("Error: El odómetro final no puede ser menor que el inicial.");
    }

    try {
      const coords = await getCoordinates(); // Captura GPS de cierre

      await supabase.from('nexus_jornadas').update({
        hora_fin: new Date(endForm.hora_fin).toISOString(), 
        odometro_final: parseFloat(endForm.odometro_final), 
        estado: 'Finalizada',
        lat_fin: coords.lat,
        lng_fin: coords.lng
      }).eq('id', activeShift.id);
      
      await supabase.from('vehiculos').update({ millaje_actual: parseFloat(endForm.odometro_final) }).eq('id', activeShift.vehiculo_id);
      triggerHaptic('heavy'); setViewState(4); refetchJornadas(); refetchVehiculos();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleDeleteShift = async (shiftId) => {
    triggerHaptic('heavy');
    if(!window.confirm('¿Eliminar esta jornada?\n\nSe revertirán ingresos, gastos y millaje del vehículo.')) return;
    setIsSubmitting(true);
    try {
      const jornadaAEliminar = jornadasActivas?.find(j => j.id === shiftId);
      const { data: movs } = await supabase.from('nexus_movimientos').select('*').eq('jornada_id', shiftId);

      if (movs && movs.length > 0) {
        for (const mov of movs) {
          const cuenta = cuentas.find(c => c.id === mov.cuenta_id);
          if (cuenta) {
            let saldoRev = Number(cuenta.saldo_actual);
            saldoRev = cuenta.tipo === 'Crédito' 
              ? (mov.tipo === 'Ingreso' ? saldoRev + Number(mov.monto) : saldoRev - Number(mov.monto))
              : (mov.tipo === 'Ingreso' ? saldoRev - Number(mov.monto) : saldoRev + Number(mov.monto));
            let cbRev = Number(cuenta.cashback_acumulado);
            if (mov.cashback_generado) cbRev -= Number(mov.cashback_generado);
            await supabase.from('nexus_cuentas').update({ saldo_actual: saldoRev, cashback_acumulado: cbRev }).eq('id', cuenta.id);
          }
        }
      }
      await supabase.from('nexus_movimientos').delete().eq('jornada_id', shiftId);
      if (jornadaAEliminar?.vehiculo_id) await supabase.from('vehiculos').update({ millaje_actual: parseFloat(jornadaAEliminar.odometro_inicial) }).eq('id', jornadaAEliminar.vehiculo_id);
      await supabase.from('nexus_jornadas').delete().eq('id', shiftId);
      
      triggerHaptic('heavy'); refetchJornadas(); refetchVehiculos();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  if (loadV || loadC) return <div className="flex h-full items-center justify-center p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Iniciando_Motor...</div>;

  const shiftToSummary = activeShift || jornadasActivas?.sort((a,b) => new Date(b.hora_fin) - new Date(a.hora_fin))[0];
  const vehicleSummary = vehiculos?.find(v => v.id === shiftToSummary?.vehiculo_id);
  
  const totalIngresos = Number(shiftToSummary?.ingresos_uber || 0) + Number(shiftToSummary?.ingresos_indrive || 0) + Number(shiftToSummary?.propinas || 0);
  const totalGastos = Number(shiftToSummary?.gastos_combustible || 0) + Number(shiftToSummary?.gastos_otros || 0);
  
  let depreciacion = 0; let fondoMantenimiento = 0; let millasRecorridas = 0; let horasTrabajadas = 0; let costoPorMilla = 0;

  if (shiftToSummary && vehicleSummary) {
    millasRecorridas = (shiftToSummary.odometro_final || 0) - (shiftToSummary.odometro_inicial || 0);
    costoPorMilla = ((vehicleSummary.precio_compra || 0) - (vehicleSummary.valor_de_venta || 0)) / (vehicleSummary.millas_vida_util || 1);
    depreciacion = millasRecorridas * costoPorMilla;
    fondoMantenimiento = ((vehicleSummary.meta_mantenimiento || 0) / 30);
    
    // Cálculo de horas reales (descontando pausas)
    const totalMs = new Date(shiftToSummary.hora_fin || new Date()) - new Date(shiftToSummary.hora_inicio);
    const pauseMs = (shiftToSummary.segundos_pausa || 0) * 1000;
    horasTrabajadas = (totalMs - pauseMs) / (1000 * 60 * 60);
  }

  const utilidadNeta = totalIngresos - totalGastos - depreciacion - fondoMantenimiento;
  const historialJornadas = jornadasActivas?.filter(j => j.estado === 'Finalizada').sort((a,b) => new Date(b.hora_fin) - new Date(a.hora_fin)) || [];

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      {/* ESTADO 1: REPOSO */}
      {viewState === 1 && (
        <div className="max-w-xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 group-hover:bg-white/10" />
            <div className="mb-8 md:mb-10 relative z-10">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Turno Operativo</h1>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Check-in de Sistema</p>
            </div>

            <form onSubmit={handlePreStart} className="space-y-4 relative z-10">
              <div className="relative bg-black/40 border border-white/5 rounded-3xl p-4 md:p-5 hover:border-white/20 transition-all">
                <div className="flex items-center gap-3 md:gap-4 w-full">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/50 shrink-0"><Car size={20}/></div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Vehículo a Operar</label>
                    <select value={startForm.vehiculo_id} onChange={e => {
                        const v = vehiculos.find(veh => veh.id === e.target.value);
                        setStartForm({...startForm, vehiculo_id: e.target.value, odometro_inicial: v?.millaje_actual || ''});
                    }} className="w-full bg-transparent text-white font-bold outline-none appearance-none cursor-pointer truncate">
                      {vehiculos?.map(v => <option key={v.id} value={v.id} className="bg-black text-sm">{v.marca} {v.modelo}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="relative bg-black/40 border border-white/5 rounded-3xl p-4 md:p-5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3 md:gap-4 w-full">
                  <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 shrink-0"><Calendar size={20}/></div>
                  <div className="flex-1 min-w-0 relative">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Inicio de Operaciones</label>
                    <input 
                      type="datetime-local" value={startForm.hora_inicio} onChange={e => setStartForm({...startForm, hora_inicio: e.target.value})} 
                      className="w-full bg-transparent text-white font-mono text-base md:text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer truncate" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="relative bg-black/40 border border-white/5 rounded-3xl p-4 md:p-5 hover:border-white/20 transition-all">
                <div className="flex items-center gap-3 md:gap-4 w-full">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/50 shrink-0"><TrendingDown size={20}/></div>
                  <div className="flex-1 min-w-0 flex justify-between items-center">
                    <div>
                        <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Millas Iniciales</label>
                        <input type="number" value={startForm.odometro_inicial} onChange={e => setStartForm({...startForm, odometro_inicial: e.target.value})} className="w-full bg-transparent text-white font-mono text-xl outline-none truncate" required placeholder="00000" />
                    </div>
                    {startForm.vehiculo_id && vehiculos?.find(v => v.id === startForm.vehiculo_id)?.millaje_actual < parseFloat(startForm.odometro_inicial || 0) && (
                        <div className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-yellow-500/30 flex items-center gap-1 animate-pulse">
                           <AlertTriangle size={10} /> Diferencia Personal
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.2)] flex justify-center items-center gap-2 mt-8">
                <ShieldCheck size={18} /> Protocolo de Seguridad
              </button>
            </form>
          </div>

          {/* HISTORIAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6 px-2">
              <History size={16} className="text-white/30" />
              <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Historial de Jornadas</h3>
            </div>
            {historialJornadas.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-4xl text-white/20 text-[10px] font-mono uppercase tracking-widest">Sin registros</div>
            ) : (
              <div className="space-y-3">
                {historialJornadas.map(jornada => {
                  const neto = (Number(jornada.ingresos_uber) + Number(jornada.ingresos_indrive) + Number(jornada.propinas)) - (Number(jornada.gastos_combustible) + Number(jornada.gastos_otros));
                  return (
                    <div key={jornada.id} className="bg-black/20 backdrop-blur-md border border-white/5 p-4 md:p-5 rounded-4xl flex justify-between items-center transition-all hover:bg-white/5">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-white font-bold text-sm truncate">{new Date(jornada.hora_inicio).toLocaleDateString(undefined, {weekday: 'short', day: '2-digit', month: 'short'})}</p>
                        <p className="text-[9px] text-white/40 font-mono tracking-widest uppercase mt-1 truncate">
                          {new Date(jornada.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(jornada.hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 md:gap-5 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mb-0.5">Balance</p>
                          <p className={`font-mono font-bold ${neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${neto.toFixed(2)}</p>
                        </div>
                        <button onClick={() => handleDeleteShift(jornada.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl transition-all hover:bg-red-500 hover:text-white active:scale-90 shrink-0">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ESTADO 2: JORNADA ACTIVA / PAUSADA */}
      {viewState === 2 && activeShift && (
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
          
          <div className={`backdrop-blur-3xl border rounded-[3rem] p-8 md:p-10 text-center relative overflow-hidden transition-all duration-700 ${activeShift.estado === 'Pausada' ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_20px_50px_rgba(249,115,22,0.1)]' : 'bg-black/40 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'}`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 blur-[80px] rounded-full animate-pulse ${activeShift.estado === 'Pausada' ? 'bg-orange-500/10' : 'bg-cyan-500/10'}`} />
            
            <div className="flex justify-between items-start w-full relative z-10 mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${activeShift.estado === 'Pausada' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${activeShift.estado === 'Pausada' ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {activeShift.estado === 'Pausada' ? 'En Descanso' : 'Turno Activo'}
                    </span>
                </div>
                {/* Indicador GPS */}
                {activeShift.lat_inicio && (
                   <div className="flex items-center gap-1 text-[8px] text-white/30 uppercase tracking-widest font-black">
                       <Navigation size={10} className="text-cyan-500" /> GPS OK
                   </div>
                )}
            </div>
            
            <h1 className={`text-6xl md:text-7xl font-mono font-black tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] relative z-10 my-4 ${activeShift.estado === 'Pausada' ? 'text-orange-100 opacity-50' : 'text-white'}`}>
              <LiveTimer 
                startTime={activeShift.hora_inicio} 
                isPaused={activeShift.estado === 'Pausada'} 
                pauseStartTime={activeShift.inicio_pausa} 
                accumulatedPauseSeconds={activeShift.segundos_pausa} 
              />
            </h1>
            
            <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase relative z-10">
              Odómetro: <span className="text-white">{activeShift.odometro_inicial} MI</span>
            </p>
          </div>

          {activeShift.estado === 'Pausada' ? (
              <button onClick={handleTogglePause} disabled={isSubmitting} className="w-full py-12 bg-orange-500 text-white font-black uppercase tracking-widest text-sm rounded-[2.5rem] active:scale-95 transition-all shadow-[0_10px_40px_rgba(249,115,22,0.3)] flex flex-col justify-center items-center gap-3">
                  <Play size={32} fill="currentColor" />
                  Volver al Volante
              </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { triggerHaptic('light'); setTxForm({tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowIncomeModal(true); }} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 py-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl"><Plus size={30} strokeWidth={3} /></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Ingreso</span>
              </button>
              <button onClick={() => { triggerHaptic('light'); setTxForm({tipo: 'Gasolina', metodo: 'Tarjeta', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowExpenseModal(true); }} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl"><Minus size={30} strokeWidth={3} /></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-red-400">Gasto</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center bg-black/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5">
            <div>
              <p className="text-[9px] text-emerald-400/60 uppercase font-black tracking-widest mb-1">Ganado</p>
              <p className="font-mono text-emerald-400 text-lg font-bold">${(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas)).toFixed(2)}</p>
            </div>
            <div className="border-x border-white/5">
              <p className="text-[9px] text-red-400/60 uppercase font-black tracking-widest mb-1">Gastado</p>
              <p className="font-mono text-red-400 text-lg font-bold">-${(Number(activeShift.gastos_combustible) + Number(activeShift.gastos_otros)).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-cyan-400/60 uppercase font-black tracking-widest mb-1">Balance</p>
              <p className="font-mono text-cyan-400 text-lg font-bold">${(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas) - Number(activeShift.gastos_combustible) - Number(activeShift.gastos_otros)).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-4">
              <button onClick={handleTogglePause} disabled={isSubmitting || activeShift.estado === 'Pausada'} className={`flex-1 py-5 border text-[10px] font-black uppercase tracking-widest rounded-3xl transition-all flex justify-center items-center gap-2 ${activeShift.estado === 'Pausada' ? 'bg-white/5 border-white/5 text-white/20' : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20 active:scale-95'}`}>
                  <Pause size={16} fill="currentColor" /> Descanso
              </button>
              <button onClick={prepareCheckout} disabled={activeShift.estado === 'Pausada'} className={`flex-1 py-5 border text-[10px] font-black uppercase tracking-widest rounded-3xl transition-all flex justify-center items-center gap-2 ${activeShift.estado === 'Pausada' ? 'bg-white/5 border-white/5 text-white/20' : 'bg-white text-black border-white hover:bg-neutral-200 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.2)]'}`}>
                  <Square size={16} fill="currentColor" /> Cierre
              </button>
          </div>
        </div>
      )}

      {/* ESTADO 3: CHECK-OUT */}
      {viewState === 3 && (
        <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-8">
          <div className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
             <button onClick={() => { triggerHaptic('light'); setViewState(2); }} className="absolute top-6 left-6 text-white/40 hover:text-white bg-white/5 p-2 rounded-full active:scale-90"><X size={20}/></button>
            <div className="text-center mb-10 mt-6">
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6"><Clock size={32} className="text-white" /></div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Auditoría Final</h1>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-2">Cierre de Operaciones</p>
            </div>

            <form onSubmit={handleEndShift} className="space-y-6 relative z-10">
              <div className="relative bg-[#111] border border-white/5 rounded-3xl p-5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 shrink-0"><Clock size={20}/></div>
                  <div className="flex-1 min-w-0 relative">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Hora de Cierre</label>
                    <input type="datetime-local" value={endForm.hora_fin} onChange={e => setEndForm({...endForm, hora_fin: e.target.value})} className="w-full bg-transparent text-white font-mono text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer truncate" required />
                  </div>
                </div>
              </div>

              <div className="relative bg-[#111] border border-white/5 rounded-3xl p-5 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/50 shrink-0"><TrendingDown size={20}/></div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Odómetro Final</label>
                    <input type="number" value={endForm.odometro_final} onChange={e => setEndForm({...endForm, odometro_final: e.target.value})} className="w-full bg-transparent text-white font-mono text-2xl outline-none truncate" required placeholder="00000" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.2)] mt-8">
                {isSubmitting ? 'Ubicando y Procesando...' : 'Generar Recibo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ESTADO 4: TARJETA DE AUDITORÍA */}
      {viewState === 4 && shiftToSummary && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Recibo de Turno</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mt-2">{new Date(shiftToSummary.hora_fin).toLocaleDateString()}</p>
          </div>

          <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><CheckCircle2 size={120} className="text-white"/></div>
            
            <div className="grid grid-cols-2 gap-8 mb-8 border-b border-white/5 pb-8 relative z-10">
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Horas Activas</p>
                <p className="text-3xl font-mono text-white font-bold">{horasTrabajadas.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Millas</p>
                <p className="text-3xl font-mono text-white font-bold">{millasRecorridas}</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <MetricRow label="Ingresos" value={`+$${totalIngresos.toFixed(2)}`} color="text-emerald-400" />
              <MetricRow label="Gastos" value={`-$${totalGastos.toFixed(2)}`} color="text-red-400" />
              <MetricRow label="Depreciación" value={`-$${depreciacion.toFixed(2)}`} color="text-yellow-400" subtext={`$${costoPorMilla?.toFixed(2)} / mi`} />
              <MetricRow label="Mantenimiento" value={`-$${fondoMantenimiento.toFixed(2)}`} color="text-purple-400" />
              
              <div className="pt-8 mt-4 border-t border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-black tracking-[0.2em] mb-2">Utilidad Neta</p>
                <p className={`text-6xl font-mono font-black tracking-tighter drop-shadow-2xl ${utilidadNeta >= 0 ? 'text-white' : 'text-red-500'}`}>${utilidadNeta.toFixed(2)}</p>
                <div className="inline-block bg-white/5 px-4 py-2 rounded-xl mt-4">
                  <p className="text-[10px] text-white/60 font-mono tracking-widest uppercase font-bold">Valor Hora: <span className="text-white ml-2">${(utilidadNeta / (horasTrabajadas || 1)).toFixed(2)}/h</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={() => { triggerHaptic('light'); setViewState(1); }} className="w-full py-6 bg-white/5 hover:bg-white border border-white/10 hover:text-black text-white font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all">Cerrar Auditoría</button>
        </div>
      )}

      {/* MODAL: CHECKLIST PRE-VUELO */}
      {showChecklist && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 overflow-hidden">
          <div className="absolute inset-0" onClick={() => setShowChecklist(false)}></div>
          <div className="w-full max-w-md bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 animate-slide-up-sheet">
            <h2 className="text-3xl font-black tracking-tighter text-white mb-2">Pre-Vuelo</h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-8 border-b border-white/5 pb-6">Confirma para arrancar el motor</p>
            
            <div className="space-y-3 mb-8">
                {Object.keys(checklistItems).map((key) => (
                    <div 
                        key={key} 
                        onClick={() => { triggerHaptic('light'); setChecklistItems(prev => ({...prev, [key]: !prev[key]})) }}
                        className={`p-5 rounded-2xl flex justify-between items-center cursor-pointer transition-all border ${checklistItems[key] ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}
                    >
                        <span className={`text-xs font-bold uppercase tracking-widest ${checklistItems[key] ? 'text-emerald-400' : 'text-white/60'}`}>{key}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checklistItems[key] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                            {checklistItems[key] && <CheckCircle2 size={14} className="text-black" />}
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={handleStartShift} 
                disabled={!isChecklistComplete || isSubmitting} 
                className={`w-full py-6 font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all flex justify-center items-center gap-2 ${isChecklistComplete ? 'bg-emerald-500 text-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
            >
                {isSubmitting ? 'Buscando Satélites...' : 'Confirmar e Iniciar'}
            </button>
            <button onClick={() => setShowChecklist(false)} className="w-full mt-4 py-4 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODALES RÁPIDOS DE TRANSACCIÓN */}
      {(showIncomeModal || showExpenseModal) && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md p-0 md:p-4 overflow-hidden">
          <div className="absolute inset-0" onClick={() => { triggerHaptic('light'); setShowIncomeModal(false); setShowExpenseModal(false); }}></div>
          <div className="w-full max-w-xl bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] relative animate-slide-up-sheet max-h-[90dvh] overflow-y-auto z-10 pb-16 md:pb-10">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8 md:hidden"></div>
            <button onClick={() => { triggerHaptic('light'); setShowIncomeModal(false); setShowExpenseModal(false); }} className="absolute top-6 right-6 text-white/40 hover:text-white bg-white/5 p-2 rounded-full hidden md:block active:scale-90"><X size={20} /></button>
            <h2 className="text-3xl font-black tracking-tighter text-white mb-8 flex items-center gap-3">{showIncomeModal ? <><Plus className="text-emerald-400" /> Ingreso</> : <><Minus className="text-red-400" /> Gasto</>}</h2>
            <form onSubmit={(e) => handleTransaction(e, showIncomeModal ? 'ingreso' : 'egreso')} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Tipo</label>
                  <select value={txForm.tipo} onChange={e => setTxForm({...txForm, tipo: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none">
                    {showIncomeModal ? <><option className="bg-black" value="Uber">Uber</option><option className="bg-black" value="InDrive">InDrive</option><option className="bg-black" value="Propina">Propina</option></> : <><option className="bg-black" value="Gasolina">Combustible</option><option className="bg-black" value="Comida/Otro">Comida</option></>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{showIncomeModal ? 'Pago' : 'Con'}</label>
                  <select value={txForm.metodo} onChange={e => setTxForm({...txForm, metodo: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none">
                    <option className="bg-black" value="Efectivo">Efectivo</option><option className="bg-black" value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Cuenta</label>
                <select required value={txForm.cuenta_id} onChange={e => setTxForm({...txForm, cuenta_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none focus:border-white/30">
                  <option value="" disabled className="bg-black text-white/40">Selecciona...</option>
                  {cuentas?.map(c => <option className="bg-black" key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>)}
                </select>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Monto ($)</label>
                <input type="number" step="0.01" autoFocus required value={txForm.monto} onChange={e => setTxForm({...txForm, monto: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white text-3xl font-black p-5 rounded-2xl outline-none font-mono focus:bg-white/10 transition-all" placeholder="0.00" />
              </div>
              <button type="submit" disabled={isSubmitting} className={`w-full py-5 mt-6 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-lg ${showIncomeModal ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-red-400 hover:bg-red-500'}`}>{isSubmitting ? 'Procesando...' : 'Confirmar'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const MetricRow = ({ label, value, color, subtext }) => (
  <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
    <div>
      <p className="text-white/60 font-black text-[9px] uppercase tracking-[0.2em]">{label}</p>
      {subtext && <p className="text-[10px] text-white/30 font-mono mt-1 font-bold">{subtext}</p>}
    </div>
    <span className={`font-mono font-black text-xl ${color}`}>{value}</span>
  </div>
);