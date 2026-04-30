import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Play, Square, Plus, Minus, Clock, MapPin, Car, DollarSign, Wallet, TrendingDown, Wrench, CheckCircle2, X, Calendar, History, Trash2, ShieldCheck, AlertTriangle, Pause, Navigation, Fuel, Sparkles, ArrowLeft
} from 'lucide-react';

const LiveTimer = ({ startTime, isPaused, pauseStartTime, accumulatedPauseSeconds }) => {
  const [time, setTime] = useState('00:00:00');
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      let now = new Date().getTime();
      if (isPaused && pauseStartTime) now = new Date(pauseStartTime).getTime();
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

const getCoordinates = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: false, timeout: 4000 }
    );
  });
};

export const ShiftModule = () => {
  const { isPrivacyActive } = usePrivacy();
  const { data: vehiculos, loading: loadV, refetch: refetchVehiculos } = useSupabaseQuery('vehiculos');
  const { data: cuentas, loading: loadC, refetch: refetchCuentas } = useSupabaseQuery('nexus_cuentas');
  const { data: jornadasActivas, refetch: refetchJornadas } = useSupabaseQuery('nexus_jornadas');
  const { data: categoriasAll } = useSupabaseQuery('nexus_categories');
  const { data: checklistDB } = useSupabaseQuery('nexus_checklist'); 

  const activeShift = jornadasActivas?.find(j => j.estado === 'Activa' || j.estado === 'Pausada');
  const activeVehicle = vehiculos?.find(v => v.id === activeShift?.vehiculo_id);

  const [viewState, setViewState] = useState(1);
  const [startForm, setStartForm] = useState({ vehiculo_id: '', hora_inicio: '', odometro_inicial: '' });
  const [endForm, setEndForm] = useState({ hora_fin: '', odometro_final: '' });
  
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);

  const [txForm, setTxForm] = useState({ categoria_id: '', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });
  const [fuelForm, setFuelForm] = useState({ odometro_actual: '', galones: '', costo_total: '', cuenta_id: '' });

  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const isChecklistComplete = checklistDB?.length > 0 && checklistDB.every(item => checkedItems[item.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper Privacidad
  const renderMoney = (val) => isPrivacyActive ? '••••' : `$${Number(val || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

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
        hora_inicio: now.toISOString().slice(0, 19), 
        odometro_inicial: vehiculos[0].millaje_actual || ''
      });
    }
  }, [viewState, vehiculos]);

  const toggleCheck = (id) => {
    triggerHaptic('light');
    setCheckedItems(prev => ({...prev, [id]: !prev[id]}));
  };

  const handlePreStart = (e) => {
      e.preventDefault();
      triggerHaptic('light');
      setShowChecklist(true);
  };

  const handleStartShift = async () => {
    triggerHaptic('medium'); setIsSubmitting(true);
    try {
      if (!startForm.vehiculo_id) throw new Error("Selecciona un vehículo.");
      const selectedVehicle = vehiculos.find(v => v.id === startForm.vehiculo_id);
      const odometroIngresado = parseFloat(startForm.odometro_inicial) || 0;
      
      if (odometroIngresado > (parseFloat(selectedVehicle.millaje_actual) || 0)) {
          await supabase.from('vehiculos').update({ millaje_actual: odometroIngresado }).eq('id', selectedVehicle.id);
      }

      // INICIO INMEDIATO (Cero Lag)
      const { data, error } = await supabase.from('nexus_jornadas').insert([{
        vehiculo_id: startForm.vehiculo_id, hora_inicio: new Date(startForm.hora_inicio).toISOString(),
        odometro_inicial: odometroIngresado, estado: 'Activa'
      }]).select();
      
      if (error) throw error;

      // OBTENER GPS EN SEGUNDO PLANO
      getCoordinates().then(async (coords) => {
        if (coords.lat) {
           await supabase.from('nexus_jornadas').update({ lat_inicio: coords.lat, lng_inicio: coords.lng }).eq('id', data[0].id);
        }
      });

      triggerHaptic('heavy'); setShowChecklist(false); setCheckedItems({});
      refetchJornadas(); refetchVehiculos();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleTogglePause = async () => {
    triggerHaptic('heavy'); setIsSubmitting(true);
    try {
      if (activeShift.estado === 'Activa') {
        await supabase.from('nexus_jornadas').update({ estado: 'Pausada', inicio_pausa: new Date().toISOString() }).eq('id', activeShift.id);
      } else {
        const now = new Date().getTime(); const startPause = new Date(activeShift.inicio_pausa).getTime();
        const diffSeconds = Math.floor((now - startPause) / 1000);
        const newAccumulated = (activeShift.segundos_pausa || 0) + diffSeconds;
        await supabase.from('nexus_jornadas').update({ estado: 'Activa', inicio_pausa: null, segundos_pausa: newAccumulated }).eq('id', activeShift.id);
      }
      refetchJornadas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleTransaction = async (e, type) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const cuenta = cuentas.find(c => c.id === txForm.cuenta_id);
      const categoria = categoriasAll?.find(c => c.id === txForm.categoria_id);
      const monto = parseFloat(txForm.monto);

      // CÁLCULO DE CASHBACK AUTOMATIZADO CON PORCENTAJE DE LA BILLETERA
      const cbPercent = parseFloat(txForm.porcentaje_cashback) || 0;
      const cbGenerado = (type === 'egreso' && (cuenta.tipo === 'Crédito' || cuenta.tipo === 'Débito') && cbPercent > 0) 
        ? monto * (cbPercent / 100) : 0;

      const { error: movError } = await supabase.from('nexus_movimientos').insert([{
        cuenta_id: cuenta.id, jornada_id: activeShift.id, categoria_id: categoria.id,
        tipo: type === 'ingreso' ? 'Ingreso' : 'Egreso', monto: monto, cashback_generado: cbGenerado,
        descripcion: `Jornada: ${categoria.nombre}`
      }]);
      if (movError) throw movError;

      let nuevoSaldo = Number(cuenta.saldo_actual);
      nuevoSaldo = cuenta.tipo === 'Crédito' ? (type === 'ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto) : (type === 'ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto);
      const nuevoCashbackAcumulado = Number(cuenta.cashback_acumulado || 0) + cbGenerado;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado }).eq('id', cuenta.id);

      let updateData = {};
      const catNombre = categoria.nombre.toLowerCase();
      if (type === 'ingreso') {
        if (catNombre.includes('uber')) updateData = { ingresos_uber: Number(activeShift.ingresos_uber) + monto };
        else if (catNombre.includes('indrive')) updateData = { ingresos_indrive: Number(activeShift.ingresos_indrive) + monto };
        else updateData = { propinas: Number(activeShift.propinas) + monto };
      } else {
        updateData = { gastos_otros: Number(activeShift.gastos_otros) + monto };
      }
      await supabase.from('nexus_jornadas').update(updateData).eq('id', activeShift.id);

      triggerHaptic('heavy');
      setShowIncomeModal(false); setShowExpenseModal(false);
      setTxForm({ categoria_id: '', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });
      refetchJornadas(); refetchCuentas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const cuenta = cuentas.find(c => c.id === fuelForm.cuenta_id);
      if (!cuenta) throw new Error("Selecciona la cuenta con la que pagaste.");
      const odoActual = parseFloat(fuelForm.odometro_actual);
      const galones = parseFloat(fuelForm.galones);
      const costoTotal = parseFloat(fuelForm.costo_total);

      if (odoActual < parseFloat(activeShift.odometro_inicial)) throw new Error("El odómetro no puede ser menor al de inicio.");

      await supabase.from('nexus_repostajes').insert([{
        jornada_id: activeShift.id, vehiculo_id: activeShift.vehiculo_id,
        odometro_actual: odoActual, galones: galones, costo_total: costoTotal
      }]);

      const catGas = categoriasAll?.find(c => c.nombre.toLowerCase().includes('gasolina') || c.nombre.toLowerCase().includes('combustible'));
      await supabase.from('nexus_movimientos').insert([{
        cuenta_id: cuenta.id, jornada_id: activeShift.id, categoria_id: catGas?.id || null,
        tipo: 'Egreso', monto: costoTotal, descripcion: `Gasolina: ${galones} Gal`
      }]);

      let nuevoSaldo = Number(cuenta.saldo_actual);
      nuevoSaldo = cuenta.tipo === 'Crédito' ? nuevoSaldo + costoTotal : nuevoSaldo - costoTotal;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', cuenta.id);

      await supabase.from('nexus_jornadas').update({ gastos_combustible: Number(activeShift.gastos_combustible) + costoTotal }).eq('id', activeShift.id);
      if (activeVehicle && odoActual > Number(activeVehicle.millaje_actual)) {
        await supabase.from('vehiculos').update({ millaje_actual: odoActual }).eq('id', activeVehicle.id);
      }

      triggerHaptic('heavy'); setShowFuelModal(false); setFuelForm({ odometro_actual: '', galones: '', costo_total: '', cuenta_id: '' });
      refetchJornadas(); refetchVehiculos(); refetchCuentas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const prepareCheckout = () => {
    triggerHaptic('light');
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const odoIni = parseFloat(activeShift?.odometro_inicial) || 0;
    const odoAct = parseFloat(activeVehicle?.millaje_actual) || 0;
    const maxOdo = Math.max(odoIni, odoAct);
    
    setEndForm({ hora_fin: now.toISOString().slice(0, 19), odometro_final: maxOdo.toString() });
    setViewState(3);
  };

  const handleEndShift = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    if(parseFloat(endForm.odometro_final) < parseFloat(activeShift.odometro_inicial)) {
        setIsSubmitting(false); return alert("Error: El odómetro final no puede ser menor que el inicial.");
    }
    try {
      // CIERRE INMEDIATO (Cero Lag)
      await supabase.from('nexus_jornadas').update({
        hora_fin: new Date(endForm.hora_fin).toISOString(), odometro_final: parseFloat(endForm.odometro_final), 
        estado: 'Finalizada'
      }).eq('id', activeShift.id);
      await supabase.from('vehiculos').update({ millaje_actual: parseFloat(endForm.odometro_final) }).eq('id', activeShift.vehiculo_id);
      
      // GPS EN SEGUNDO PLANO
      getCoordinates().then(async (coords) => {
        if(coords.lat) {
          await supabase.from('nexus_jornadas').update({lat_fin: coords.lat, lng_fin: coords.lng}).eq('id', activeShift.id);
        }
      });

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
          const cuenta = cuentas?.find(c => c.id === mov.cuenta_id);
          if (cuenta) {
            let saldoRev = Number(cuenta.saldo_actual);
            saldoRev = cuenta.tipo === 'Crédito' ? (mov.tipo === 'Ingreso' ? saldoRev + Number(mov.monto) : saldoRev - Number(mov.monto)) : (mov.tipo === 'Ingreso' ? saldoRev - Number(mov.monto) : saldoRev + Number(mov.monto));
            let cbRev = Number(cuenta.cashback_acumulado);
            if (mov.cashback_generado) cbRev -= Number(mov.cashback_generado);
            await supabase.from('nexus_cuentas').update({ saldo_actual: saldoRev, cashback_acumulado: cbRev }).eq('id', cuenta.id);
          }
        }
      }
      await supabase.from('nexus_movimientos').delete().eq('jornada_id', shiftId);
      await supabase.from('nexus_repostajes').delete().eq('jornada_id', shiftId);
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
  
  let depreciacion = 0, millasRecorridas = 0, horasTrabajadas = 0, costoPorMilla = 0, fondoMantenimiento = 0;
  
  if (shiftToSummary && vehicleSummary) {
    millasRecorridas = (shiftToSummary.odometro_final || 0) - (shiftToSummary.odometro_inicial || 0);
    costoPorMilla = ((vehicleSummary.precio_compra || 0) - (vehicleSummary.valor_de_venta || 0)) / (vehicleSummary.millas_vida_util || 1);
    depreciacion = millasRecorridas * costoPorMilla;
    fondoMantenimiento = ((vehicleSummary.meta_mantenimiento || 0) / 30);
    
    const totalMs = new Date(shiftToSummary.hora_fin || new Date()) - new Date(shiftToSummary.hora_inicio);
    const pauseMs = (shiftToSummary.segundos_pausa || 0) * 1000;
    horasTrabajadas = (totalMs - pauseMs) / (1000 * 60 * 60);
  }

  const utilidadNeta = totalIngresos - totalGastos - depreciacion - fondoMantenimiento;
  const historialJornadas = jornadasActivas?.filter(j => j.estado === 'Finalizada').sort((a,b) => new Date(b.hora_fin) - new Date(a.hora_fin)) || [];
  const filteredCats = categoriasAll?.filter(c => c.tipo === (showIncomeModal ? 'Ingreso' : 'Egreso') && c.modulo === 'General') || [];

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      {/* VISTA 1: REPOSO */}
      {viewState === 1 && (
        <div className="max-w-xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-6 md:p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 group-hover:bg-white/10" />
            <div className="mb-8 md:mb-10 relative z-10">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Turno Operativo</h1>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Check-in Luis Mata</p>
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
                      }} className="w-full bg-transparent text-white font-bold outline-none appearance-none cursor-pointer truncate font-sans">
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
                      <input type="datetime-local" step="1" value={startForm.hora_inicio} onChange={e => setStartForm({...startForm, hora_inicio: e.target.value})} className="w-full bg-transparent text-white font-mono text-base md:text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer truncate" required />
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
          <div className="space-y-4 animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center gap-2 mb-6 px-2">
              <History size={16} className="text-white/30" />
              <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Historial de Jornadas</h3>
            </div>
            {historialJornadas.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-4xl text-white/20 text-[10px] font-mono uppercase tracking-widest animate-pulse">Sin registros</div>
            ) : (
              <div className="space-y-3">
                {historialJornadas.map((jornada, index) => {
                  const neto = (Number(jornada.ingresos_uber) + Number(jornada.ingresos_indrive) + Number(jornada.propinas)) - (Number(jornada.gastos_combustible) + Number(jornada.gastos_otros));
                  return (
                    <div key={jornada.id} style={{ animationDelay: `${index * 50}ms` }} className="bg-black/20 backdrop-blur-md border border-white/5 p-4 md:p-5 rounded-4xl flex justify-between items-center transition-all hover:bg-white/5 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-white font-bold text-sm truncate">{new Date(jornada.hora_inicio).toLocaleDateString(undefined, {weekday: 'short', day: '2-digit', month: 'short'})}</p>
                        <p className="text-[9px] text-white/40 font-mono tracking-widest uppercase mt-1 truncate">
                          {new Date(jornada.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(jornada.hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 md:gap-5 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mb-0.5">Balance</p>
                          <p className={`font-mono font-bold ${neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{renderMoney(neto)}</p>
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

      {/* VISTA 2: ACTIVA / PAUSADA */}
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
                {activeShift.lat_inicio && (
                   <div className="flex items-center gap-1 text-[8px] text-white/30 uppercase tracking-widest font-black animate-in fade-in duration-1000"><Navigation size={10} className="text-cyan-500" /> GPS OK</div>
                )}
            </div>
            <h1 className={`text-6xl md:text-7xl font-mono font-black tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] relative z-10 my-4 ${activeShift.estado === 'Pausada' ? 'text-orange-100 opacity-50' : 'text-white'}`}>
              <LiveTimer startTime={activeShift.hora_inicio} isPaused={activeShift.estado === 'Pausada'} pauseStartTime={activeShift.inicio_pausa} accumulatedPauseSeconds={activeShift.segundos_pausa} />
            </h1>
            <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase relative z-10">Odómetro Actual: <span className="text-white">{activeVehicle?.millaje_actual || activeShift.odometro_inicial} MI</span></p>
          </div>

          {activeShift.estado === 'Pausada' ? (
              <button onClick={handleTogglePause} disabled={isSubmitting} className="w-full py-12 bg-orange-500 text-black font-black uppercase tracking-widest text-sm rounded-[2.5rem] active:scale-95 transition-all shadow-[0_10px_40px_rgba(249,115,22,0.3)] flex flex-col justify-center items-center gap-3 animate-in fade-in duration-300">
                  <Play size={32} fill="currentColor" /> Volver al Volante
              </button>
          ) : (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => { triggerHaptic('light'); setTxForm({categoria_id: '', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowIncomeModal(true); }} className="flex-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 py-6 rounded-4xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl"><Plus size={24} strokeWidth={3} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ingreso</span>
              </button>
              <button onClick={() => { triggerHaptic('light'); setShowFuelModal(true); }} className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 py-6 rounded-4xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                <div className="w-12 h-12 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow-xl"><Fuel size={24} strokeWidth={3} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Gaso</span>
              </button>
              <button onClick={() => { triggerHaptic('light'); setTxForm({categoria_id: '', metodo: 'Tarjeta', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowExpenseModal(true); }} className="flex-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-6 rounded-4xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl"><Minus size={24} strokeWidth={3} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Gasto</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center bg-black/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5 animate-in slide-in-from-bottom-8 duration-500 delay-100">
            <div>
              <p className="text-[9px] text-emerald-400/60 uppercase font-black tracking-widest mb-1">Ganado</p>
              <p className="font-mono text-emerald-400 text-lg font-bold">{renderMoney(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas))}</p>
            </div>
            <div className="border-x border-white/5">
              <p className="text-[9px] text-red-400/60 uppercase font-black tracking-widest mb-1">Gastado</p>
              <p className="font-mono text-red-400 text-lg font-bold">-{renderMoney(Number(activeShift.gastos_combustible) + Number(activeShift.gastos_otros))}</p>
            </div>
            <div>
              <p className="text-[9px] text-cyan-400/60 uppercase font-black tracking-widest mb-1">Balance</p>
              <p className="font-mono text-cyan-400 text-lg font-bold">{renderMoney(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas) - Number(activeShift.gastos_combustible) - Number(activeShift.gastos_otros))}</p>
            </div>
          </div>

          <div className="flex gap-4 animate-in slide-in-from-bottom-10 duration-700 delay-200">
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
        <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500 ease-out">
          <div className="w-full bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
             <button onClick={() => { triggerHaptic('light'); setViewState(2); }} className="absolute top-6 left-6 text-white/40 hover:text-white bg-white/5 p-2 rounded-full active:scale-90 transition-all"><ArrowLeft size={20}/></button>
            <div className="text-center mb-10 mt-6 animate-in zoom-in-95 duration-500 delay-100">
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6"><Clock size={32} className="text-white" /></div>
              <h1 className="text-3xl font-black tracking-tighter text-white">Auditoría Final</h1>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-2">Cierre de Operaciones</p>
            </div>

            <form onSubmit={handleEndShift} className="space-y-6 relative z-10">
              <div className="relative bg-black/40 border border-white/5 rounded-3xl p-5 hover:border-cyan-500/30 transition-all animate-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 shrink-0"><Clock size={20}/></div>
                  <div className="flex-1 min-w-0 relative">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Hora de Cierre</label>
                    <input type="datetime-local" step="1" value={endForm.hora_fin} onChange={e => setEndForm({...endForm, hora_fin: e.target.value})} className="w-full bg-transparent text-white font-mono text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer truncate" required />
                  </div>
                </div>
              </div>

              <div className="relative bg-black/40 border border-white/5 rounded-3xl p-5 hover:border-white/20 transition-all animate-in slide-in-from-bottom-6 duration-500 delay-300">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/50 shrink-0"><TrendingDown size={20}/></div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Odómetro Final</label>
                    <input type="number" value={endForm.odometro_final} onChange={e => setEndForm({...endForm, odometro_final: e.target.value})} className="w-full bg-transparent text-white font-mono text-2xl outline-none truncate" required placeholder="00000" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.2)] mt-8 animate-in slide-in-from-bottom-8 duration-500 delay-500">
                {isSubmitting ? 'Procesando...' : 'Generar Recibo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ESTADO 4: TARJETA DE AUDITORÍA (RECIBO) */}
      {viewState === 4 && shiftToSummary && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-[0.98] duration-700 ease-out">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Recibo de Turno</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mt-2">{new Date(shiftToSummary.hora_fin).toLocaleDateString()}</p>
          </div>

          <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><CheckCircle2 size={120} className="text-white"/></div>
            
            <div className="grid grid-cols-2 gap-8 mb-8 border-b border-white/5 pb-8 relative z-10 animate-in slide-in-from-top-4 duration-500 delay-100">
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Horas Activas</p>
                <p className="text-3xl font-mono text-white font-bold">{horasTrabajadas.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Millas</p>
                <p className="text-3xl font-mono text-white font-bold">{millasRecorridas}</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10 animate-in slide-in-from-bottom-4 duration-500 delay-300">
              <MetricRow label="Ingresos Totales" value={`+${renderMoney(totalIngresos)}`} color="text-emerald-400" />
              <MetricRow label="Gastos Operativos" value={`-${renderMoney(totalGastos)}`} color="text-red-400" />
              <MetricRow label="Depreciación" value={`-${renderMoney(depreciacion)}`} color="text-yellow-400" subtext={`${renderMoney(costoPorMilla)} / mi`} />
              
              <div className="pt-8 mt-4 border-t border-white/10 animate-in zoom-in-95 duration-500 delay-500">
                <p className="text-[10px] text-white/50 uppercase font-black tracking-[0.2em] mb-2">Utilidad Neta</p>
                <p className={`text-6xl md:text-7xl font-mono font-black tracking-tighter drop-shadow-2xl ${utilidadNeta >= 0 ? 'text-white' : 'text-red-500'}`}>{renderMoney(utilidadNeta)}</p>
                <div className="inline-block bg-white/5 px-4 py-2 rounded-xl mt-4">
                  <p className="text-[10px] text-white/60 font-mono tracking-widest uppercase font-bold">Valor Hora: <span className="text-white ml-2">{renderMoney(utilidadNeta / (horasTrabajadas || 1))}/h</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={() => { triggerHaptic('light'); setViewState(1); }} className="w-full py-6 bg-white/5 hover:bg-white border border-white/10 hover:text-black text-white font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all animate-in slide-in-from-bottom-8 duration-500 delay-700">Cerrar Auditoría</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORMULARIOS FULL-SCREEN NEXUS (ANIMADOS)                 */}
      {/* ======================================================== */}

      {/* MODAL: CHECKLIST PRE-VUELO */}
      {showChecklist && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={() => setShowChecklist(false)}></div>
          <div className="w-full max-w-2xl bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Pre-Vuelo</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Confirma para arrancar el motor</p>
                </div>
                <button onClick={() => setShowChecklist(false)} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <div className="space-y-3">
                  {checklistDB?.map((item, idx) => (
                      <div 
                          key={item.id} 
                          onClick={() => toggleCheck(item.id)}
                          style={{ animationDelay: `${idx * 50}ms` }}
                          className={`p-5 rounded-2xl flex justify-between items-center cursor-pointer transition-all border animate-in slide-in-from-bottom-2 fade-in ${checkedItems[item.id] ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      >
                          <span className={`text-xs font-bold uppercase tracking-widest ${checkedItems[item.id] ? 'text-emerald-400' : 'text-white/60'}`}>{item.tarea}</span>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkedItems[item.id] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                              {checkedItems[item.id] && <CheckCircle2 size={14} className="text-black" />}
                          </div>
                      </div>
                  ))}
              </div>
            </div>

            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button 
                  onClick={handleStartShift} 
                  disabled={!isChecklistComplete || isSubmitting} 
                  className={`w-full py-6 font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all flex justify-center items-center gap-2 ${isChecklistComplete ? 'bg-emerald-500 text-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
              >
                  {isSubmitting ? 'Iniciando...' : 'Confirmar e Iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO MODAL FULL-SCREEN: REPOSTAJE DE COMBUSTIBLE */}
      {showFuelModal && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={() => { triggerHaptic('light'); setShowFuelModal(false); }}></div>
          <div className="w-full max-w-2xl bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div className="flex items-center gap-3">
                  <Fuel className="text-yellow-500" size={32} />
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Repostaje</h2>
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Control de Gasolina</p>
                  </div>
                </div>
                <button onClick={() => { triggerHaptic('light'); setShowFuelModal(false); }} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <form id="fuel-form" onSubmit={handleFuelSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Odómetro Actual</label>
                    <input type="number" step="0.1" required value={fuelForm.odometro_actual} onChange={e => setFuelForm({...fuelForm, odometro_actual: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-mono font-bold p-4 rounded-2xl outline-none focus:border-white/30 transition-all" placeholder={activeVehicle?.millaje_actual || "0"} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Galones</label>
                    <input type="number" step="0.01" required value={fuelForm.galones} onChange={e => setFuelForm({...fuelForm, galones: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-mono font-bold p-4 rounded-2xl outline-none focus:border-white/30 transition-all" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Cuenta a afectar</label>
                  <select required value={fuelForm.cuenta_id} onChange={e => setFuelForm({...fuelForm, cuenta_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none focus:border-white/30 font-sans">
                    <option value="" disabled className="bg-[#0A0A0A] text-white/40">Pagado con...</option>
                    {cuentas?.map(c => <option className="bg-[#0A0A0A]" key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>)}
                  </select>
                </div>

                <div className="flex flex-col items-center justify-center py-8 bg-black/40 rounded-3xl border border-white/5 mt-4">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest ml-1 mb-2">Costo Total ($)</label>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-yellow-500">$</span>
                    <input type="number" step="0.01" autoFocus required value={fuelForm.costo_total} onChange={e => setFuelForm({...fuelForm, costo_total: e.target.value})} className="w-32 bg-transparent text-white text-5xl font-black outline-none font-mono text-center placeholder:text-white/10" placeholder="0.00" />
                  </div>
                </div>
              </form>
            </div>

            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button form="fuel-form" type="submit" disabled={isSubmitting} className="w-full py-6 bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.3)]">
                {isSubmitting ? 'Procesando...' : 'Confirmar Llenado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES FULL-SCREEN DE TRANSACCIÓN (INGRESO / GASTO) */}
      {(showIncomeModal || showExpenseModal) && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={() => { triggerHaptic('light'); setShowIncomeModal(false); setShowExpenseModal(false); }}></div>
          <div className="w-full max-w-2xl bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 uppercase italic">
                    {showIncomeModal ? <><Plus className="text-emerald-400" /> Ingreso</> : <><Minus className="text-red-400" /> Gasto</>}
                  </h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Transacción Operativa</p>
                </div>
                <button onClick={() => { triggerHaptic('light'); setShowIncomeModal(false); setShowExpenseModal(false); }} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <form id="tx-form" onSubmit={(e) => handleTransaction(e, showIncomeModal ? 'ingreso' : 'egreso')} className="space-y-6">
                
                <div className="flex flex-col items-center justify-center py-8 bg-black/40 rounded-3xl border border-white/5 mb-6">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest ml-1 mb-2">Monto de Operación ($)</label>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-3xl font-black ${showIncomeModal ? 'text-emerald-400' : 'text-red-400'}`}>$</span>
                    <input type="number" step="0.01" autoFocus required value={txForm.monto} onChange={e => setTxForm({...txForm, monto: e.target.value})} className="w-32 bg-transparent text-white text-5xl font-black outline-none font-mono text-center placeholder:text-white/10" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Rubro</label>
                    <select required value={txForm.categoria_id} onChange={e => setTxForm({...txForm, categoria_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none focus:border-white/30 transition-all font-sans">
                      <option value="" disabled className="bg-[#0A0A0A] text-white/40">Selecciona...</option>
                      {filteredCats?.map(c => <option className="bg-[#0A0A0A]" key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{showIncomeModal ? 'Pago' : 'Método'}</label>
                    <select value={txForm.metodo} onChange={e => setTxForm({...txForm, metodo: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none font-sans">
                      <option className="bg-[#0A0A0A]" value="Efectivo">Efectivo</option>
                      <option className="bg-[#0A0A0A]" value="Tarjeta">Tarjeta</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Cuenta a afectar</label>
                  <select required value={txForm.cuenta_id} onChange={e => {
                      const cuentaSeleccionada = cuentas.find(c => c.id === e.target.value);
                      // Extraemos automáticamente la regla de cashback de la cuenta (si existe)
                      setTxForm({...txForm, cuenta_id: e.target.value, porcentaje_cashback: cuentaSeleccionada?.reglas_cashback || ''});
                    }} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none focus:border-white/30 font-sans">
                    <option value="" disabled className="bg-[#0A0A0A] text-white/40">Selecciona...</option>
                    {cuentas?.map(c => <option className="bg-[#0A0A0A]" key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>)}
                  </select>
                </div>

                {/* Cashback Automático (Visible solo para egresos con tarjeta) */}
                {showExpenseModal && txForm.cuenta_id && (cuentas.find(c => c.id === txForm.cuenta_id)?.tipo === 'Crédito' || cuentas.find(c => c.id === txForm.cuenta_id)?.tipo === 'Débito') && (
                  <div className="p-5 border border-purple-500/30 bg-purple-500/10 rounded-4xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="text-[9px] text-purple-400 font-black uppercase tracking-widest ml-1">% Cashback Aplicado (Autocompletado de Billetera)</label>
                    <input type="number" step="0.1" value={txForm.porcentaje_cashback} onChange={e => setTxForm({...txForm, porcentaje_cashback: e.target.value})} className="w-full mt-2 bg-black/40 border border-purple-500/20 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-purple-400 outline-none transition-all placeholder:text-purple-400/30" placeholder="Ej. 1.5"/>
                    {txForm.monto > 0 && txForm.porcentaje_cashback > 0 && (
                      <p className="text-[10px] text-purple-400 font-mono mt-3 text-right uppercase font-bold tracking-widest flex items-center justify-end gap-2">
                        <Sparkles size={12}/> Generando +${(parseFloat(txForm.monto) * (parseFloat(txForm.porcentaje_cashback)/100)).toFixed(2)} USD
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>

            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button form="tx-form" type="submit" disabled={isSubmitting} className={`w-full py-6 text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-lg ${showIncomeModal ? 'bg-emerald-400 hover:bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)]' : 'bg-red-400 hover:bg-red-500 shadow-[0_10px_30px_rgba(239,68,68,0.3)]'}`}>
                {isSubmitting ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN DE JORNADA */}
      {isDeleting && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300 ease-out">
          <div className="p-8 bg-[#050505] border border-red-500/30 rounded-[2.5rem] space-y-6 w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/20">
              <AlertCircle size={40}/>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">¿Destruir Jornada?</h3>
            <p className="text-[10px] text-white/40 leading-relaxed font-bold tracking-widest uppercase">Esta acción revertirá todos los ingresos, gastos y ajustará el millaje del vehículo.</p>
            <div className="flex flex-col gap-3 pt-4">
              <button onClick={() => handleDeleteShift(isDeleting)} disabled={isSubmitting} className="w-full py-5 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.3)]">
                {isSubmitting ? 'Borrando...' : 'Confirmar Destrucción'}
              </button>
              <button onClick={() => { triggerHaptic('light'); setIsDeleting(false); }} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white/50 font-black uppercase tracking-widest text-[11px] rounded-2xl border border-white/5 active:scale-95 transition-all">
                Cancelar
              </button>
            </div>
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