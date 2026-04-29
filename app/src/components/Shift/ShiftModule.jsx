import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { 
  Play, Square, Plus, Minus, Clock, MapPin, Car, DollarSign, Wallet, TrendingDown, Wrench, CheckCircle2, X, Calendar, History, Trash2
} from 'lucide-react';

export const ShiftModule = () => {
  // Datos del ecosistema (Añadimos refetchVehiculos para actualizar el garage al instante)
  const { data: vehiculos, loading: loadV, refetch: refetchVehiculos } = useSupabaseQuery('vehiculos');
  const { data: cuentas, loading: loadC } = useSupabaseQuery('nexus_cuentas');
  const { data: jornadasActivas, refetch: refetchJornadas } = useSupabaseQuery('nexus_jornadas');

  const activeShift = jornadasActivas?.find(j => j.estado === 'Activa');
  const activeVehicle = vehiculos?.find(v => v.id === activeShift?.vehiculo_id);

  const [viewState, setViewState] = useState(1);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const [startForm, setStartForm] = useState({ vehiculo_id: '', hora_inicio: '', odometro_inicial: '' });
  const [endForm, setEndForm] = useState({ hora_fin: '', odometro_final: '' });
  
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [txForm, setTxForm] = useState({ tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lógica del Cronómetro
  useEffect(() => {
    let interval;
    if (activeShift && viewState === 2) {
      interval = setInterval(() => {
        const start = new Date(activeShift.hora_inicio).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        setElapsedTime(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeShift, viewState]);

  useEffect(() => {
    if (activeShift) setViewState(2);
    else setViewState(1);
  }, [activeShift]);

  useEffect(() => {
    if (viewState === 1 && vehiculos?.length > 0) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartForm({
        vehiculo_id: vehiculos[0].id,
        hora_inicio: now.toISOString().slice(0, 16),
        odometro_inicial: vehiculos[0].millaje_actual || ''
      });
    }
  }, [viewState, vehiculos]);

  // ==============================
  // ACCIONES DE BASE DE DATOS
  // ==============================

  const handleStartShift = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!startForm.vehiculo_id) throw new Error("No hay vehículo seleccionado.");
      if (!startForm.hora_inicio) throw new Error("La hora de inicio no es válida.");

      const { error } = await supabase.from('nexus_jornadas').insert([{
        vehiculo_id: startForm.vehiculo_id,
        hora_inicio: new Date(startForm.hora_inicio).toISOString(),
        odometro_inicial: parseFloat(startForm.odometro_inicial),
        estado: 'Activa'
      }]);
      
      if (error) throw error;
      refetchJornadas();
    } catch (err) {
      alert(`Error al iniciar: ${err.message}`);
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleTransaction = async (e, type) => {
    e.preventDefault();
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
        cuenta_id: cuenta.id,
        jornada_id: activeShift.id, 
        tipo: type === 'ingreso' ? 'Ingreso' : 'Egreso',
        monto: monto,
        cashback_generado: cbGenerado,
        descripcion: `Jornada: ${txForm.tipo} (${txForm.metodo})`
      }]);
      if (movError) throw movError;

      let nuevoSaldo = Number(cuenta.saldo_actual);
      if (cuenta.tipo === 'Crédito') {
        nuevoSaldo = type === 'ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto;
      } else {
        nuevoSaldo = type === 'ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto;
      }
      
      const nuevoCashbackAcumulado = Number(cuenta.cashback_acumulado || 0) + cbGenerado;

      await supabase.from('nexus_cuentas').update({ 
        saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado 
      }).eq('id', cuenta.id);

      let updateData = {};
      if (type === 'ingreso') {
        if (txForm.tipo === 'Uber') updateData = { ingresos_uber: Number(activeShift.ingresos_uber) + monto };
        if (txForm.tipo === 'InDrive') updateData = { ingresos_indrive: Number(activeShift.ingresos_indrive) + monto };
        if (txForm.tipo === 'Propina') updateData = { propinas: Number(activeShift.propinas) + monto };
      } else {
        if (txForm.tipo === 'Gasolina') updateData = { gastos_combustible: Number(activeShift.gastos_combustible) + monto };
        if (txForm.tipo === 'Comida/Otro') updateData = { gastos_otros: Number(activeShift.gastos_otros) + monto };
      }
      
      const { error: updateJornadaError } = await supabase.from('nexus_jornadas').update(updateData).eq('id', activeShift.id);
      if (updateJornadaError) throw updateJornadaError;

      setShowIncomeModal(false);
      setShowExpenseModal(false);
      setTxForm({ tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: '' });
      refetchJornadas();
    } catch (err) { alert(err.message); } 
    finally { setIsSubmitting(false); }
  };

  const prepareCheckout = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEndForm({
      hora_fin: now.toISOString().slice(0, 16),
      odometro_final: activeShift.odometro_inicial
    });
    setViewState(3);
  };

  const handleEndShift = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('nexus_jornadas').update({
        hora_fin: new Date(endForm.hora_fin).toISOString(),
        odometro_final: parseFloat(endForm.odometro_final),
        estado: 'Finalizada'
      }).eq('id', activeShift.id);
      if (error) throw error;

      const { error: vError } = await supabase.from('vehiculos').update({ 
        millaje_actual: parseFloat(endForm.odometro_final) 
      }).eq('id', activeShift.vehiculo_id);
      if (vError) throw vError;

      setViewState(4); 
      refetchJornadas();
      refetchVehiculos(); // Sincronizamos el vehículo para otros módulos
    } catch (err) { alert(`Error al finalizar jornada: ${err.message}`); } 
    finally { setIsSubmitting(false); }
  };

  // ⚡ ELIMINAR JORNADA Y REVERTIR FONDOS + MILLAJE
  const handleDeleteShift = async (shiftId) => {
    if(!window.confirm('¿Eliminar esta jornada permanentemente?\n\nEl sistema revertirá todos los ingresos y gastos de tu billetera y devolverá el millaje de tu vehículo a como estaba antes de iniciar.')) return;
    setIsSubmitting(true);
    
    try {
      // Identificar la jornada que vamos a borrar para obtener su odómetro inicial
      const jornadaAEliminar = jornadasActivas?.find(j => j.id === shiftId);

      // 1. Buscar los movimientos de esta jornada
      const { data: movs, error: movsError } = await supabase.from('nexus_movimientos').select('*').eq('jornada_id', shiftId);
      if (movsError) throw movsError;

      // 2. Revertir saldos en las cuentas
      if (movs && movs.length > 0) {
        for (const mov of movs) {
          const cuenta = cuentas.find(c => c.id === mov.cuenta_id);
          if (cuenta) {
            let saldoRevertido = Number(cuenta.saldo_actual);
            
            if (cuenta.tipo === 'Crédito') {
              saldoRevertido = mov.tipo === 'Ingreso' ? saldoRevertido + Number(mov.monto) : saldoRevertido - Number(mov.monto);
            } else {
              saldoRevertido = mov.tipo === 'Ingreso' ? saldoRevertido - Number(mov.monto) : saldoRevertido + Number(mov.monto);
            }

            let cashbackRevertido = Number(cuenta.cashback_acumulado);
            if (mov.cashback_generado) cashbackRevertido -= Number(mov.cashback_generado);

            await supabase.from('nexus_cuentas').update({ 
              saldo_actual: saldoRevertido, 
              cashback_acumulado: cashbackRevertido 
            }).eq('id', cuenta.id);
          }
        }
      }

      // ✨ LA CORRECCIÓN: Borrado explícito de los movimientos de esta jornada
      const { error: deleteMovsError } = await supabase.from('nexus_movimientos').delete().eq('jornada_id', shiftId);
      if (deleteMovsError) throw deleteMovsError;

      // 3. Revertir el odómetro del vehículo
      if (jornadaAEliminar && jornadaAEliminar.vehiculo_id && jornadaAEliminar.odometro_inicial) {
        const { error: vError } = await supabase.from('vehiculos')
          .update({ millaje_actual: parseFloat(jornadaAEliminar.odometro_inicial) })
          .eq('id', jornadaAEliminar.vehiculo_id);
        if (vError) throw vError;
      }

      // 4. Eliminar la jornada (y los movimientos por cascada)
      const { error } = await supabase.from('nexus_jornadas').delete().eq('id', shiftId);
      if (error) throw error;

      refetchJornadas();
      refetchVehiculos(); // Actualizar el Garage al instante
    } catch (err) { alert(`Error al eliminar: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  if (loadV || loadC) return <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Iniciando_Motor...</div>;

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
    const start = new Date(shiftToSummary.hora_inicio);
    const end = new Date(shiftToSummary.hora_fin || new Date());
    horasTrabajadas = (end - start) / (1000 * 60 * 60);
  }

  const utilidadNeta = totalIngresos - totalGastos - depreciacion - fondoMantenimiento;
  const selectedCuentaParaTx = cuentas?.find(c => c.id === txForm.cuenta_id);

  // Filtrar jornadas finalizadas para el historial
  const historialJornadas = jornadasActivas?.filter(j => j.estado === 'Finalizada').sort((a,b) => new Date(b.hora_fin) - new Date(a.hora_fin)) || [];

  return (
    <div className="min-h-screen bg-transparent text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      {/* ========================================== */}
      {/* ESTADO 1: REPOSO (CHECK-IN) Y HISTORIAL */}
      {/* ========================================== */}
      {viewState === 1 && (
        <div className="max-w-xl mx-auto p-6 space-y-10 pt-10">
          
          {/* Tarjeta de Check-In */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
            <div className="mb-8 relative z-10">
              <h1 className="text-4xl font-bold tracking-tighter text-white">Turno Operativo</h1>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Check-in de Sistema</p>
            </div>

            <form onSubmit={handleStartShift} className="space-y-4 relative z-10">
              {/* Vehículo Selector Estilizado */}
              <div className="relative group bg-[#111111] border border-white/5 rounded-3xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-full text-white/50"><Car size={20}/></div>
                  <div className="flex-1">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Vehículo a Operar</label>
                    <select value={startForm.vehiculo_id} onChange={e => setStartForm({...startForm, vehiculo_id: e.target.value})} className="w-full bg-transparent text-white font-bold outline-none appearance-none cursor-pointer">
                      {vehiculos?.map(v => <option key={v.id} value={v.id} className="bg-black">{v.marca} {v.modelo} (Año {v.año})</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Fecha y Hora Minimalista */}
              <div className="relative group bg-[#111111] border border-white/5 rounded-3xl p-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400"><Calendar size={20}/></div>
                  <div className="flex-1 relative">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Inicio de Operaciones</label>
                    <input 
                      type="datetime-local" 
                      value={startForm.hora_inicio} 
                      onChange={e => setStartForm({...startForm, hora_inicio: e.target.value})} 
                      className="w-full bg-transparent text-white font-mono text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Odómetro Minimalista */}
              <div className="relative group bg-[#111111] border border-white/5 rounded-3xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-full text-white/50"><TrendingDown size={20}/></div>
                  <div className="flex-1">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Millas Iniciales (Odómetro)</label>
                    <input type="number" value={startForm.odometro_inicial} onChange={e => setStartForm({...startForm, odometro_inicial: e.target.value})} className="w-full bg-transparent text-white font-mono text-xl outline-none" required placeholder="00000" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-3xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex justify-center items-center gap-2 mt-6">
                {isSubmitting ? 'Iniciando...' : <><Play size={16} /> Arrancar Motor</>}
              </button>
            </form>
          </div>

          {/* Historial de Jornadas Anteriores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <History size={16} className="text-white/30" />
              <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Historial de Jornadas</h3>
            </div>
            
            {historialJornadas.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-4xl text-white/20 text-xs font-mono uppercase tracking-widest">
                Sin registros previos
              </div>
            ) : (
              <div className="space-y-3">
                {historialJornadas.map(jornada => {
                  const neto = (Number(jornada.ingresos_uber) + Number(jornada.ingresos_indrive) + Number(jornada.propinas)) - (Number(jornada.gastos_combustible) + Number(jornada.gastos_otros));
                  return (
                    <div key={jornada.id} className="bg-[#050505] border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-white/10 transition-all">
                      <div>
                        <p className="text-white font-bold">{new Date(jornada.hora_inicio).toLocaleDateString(undefined, {weekday: 'short', day: '2-digit', month: 'short'})}</p>
                        <p className="text-[9px] text-white/40 font-mono tracking-widest uppercase mt-1">
                          {new Date(jornada.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(jornada.hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mb-0.5">Balance</p>
                          <p className={`font-mono font-bold ${neto >= 0 ? 'text-green-400' : 'text-red-400'}`}>${neto.toFixed(2)}</p>
                        </div>
                        <button onClick={() => handleDeleteShift(jornada.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white" title="Eliminar Jornada y Revertir Saldos">
                          <Trash2 size={16} />
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

      {/* ========================================== */}
      {/* ESTADO 2: JORNADA ACTIVA */}
      {/* ========================================== */}
      {viewState === 2 && activeShift && (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-[#050505] border border-white/10 rounded-[3rem] p-8 text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/5 blur-[100px] rounded-full animate-pulse" />
            <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Turno Activo</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl relative z-10 my-4">
              {elapsedTime}
            </h1>
            <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase relative z-10">
              Odómetro Inicial: {activeShift.odometro_inicial} MI
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setTxForm({tipo: 'Uber', metodo: 'Efectivo', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowIncomeModal(true); }} className="bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 hover:border-green-500/50 p-6 rounded-4xl flex flex-col items-center justify-center gap-3 transition-all group">
              <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">Registrar Ingreso</span>
            </button>
            <button onClick={() => { setTxForm({tipo: 'Gasolina', metodo: 'Tarjeta', monto: '', cuenta_id: '', porcentaje_cashback: ''}); setShowExpenseModal(true); }} className="bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 hover:border-red-500/50 p-6 rounded-4xl flex flex-col items-center justify-center gap-3 transition-all group">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Minus size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">Registrar Gasto</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-[#0A0A0A] p-4 rounded-3xl border border-white/5">
            <div>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Uber/InDrive</p>
              <p className="font-mono text-white text-lg">${(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas)).toFixed(2)}</p>
            </div>
            <div className="border-l border-r border-white/5">
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Gastos</p>
              <p className="font-mono text-red-400 text-lg">-${(Number(activeShift.gastos_combustible) + Number(activeShift.gastos_otros)).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Balance</p>
              <p className="font-mono text-cyan-400 text-lg">${(Number(activeShift.ingresos_uber) + Number(activeShift.ingresos_indrive) + Number(activeShift.propinas) - Number(activeShift.gastos_combustible) - Number(activeShift.gastos_otros)).toFixed(2)}</p>
            </div>
          </div>

          <button onClick={prepareCheckout} className="w-full py-5 bg-white/5 hover:bg-white border border-white/10 hover:text-black text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex justify-center items-center gap-2 mt-8">
            <Square size={16} /> Finalizar Jornada
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* ESTADO 3: CHECK-OUT */}
      {/* ========================================== */}
      {viewState === 3 && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
             <button onClick={() => setViewState(2)} className="absolute top-6 left-6 text-white/40 hover:text-white"><X size={20}/></button>
            <div className="text-center mb-10 mt-4">
              <div className="w-20 h-20 bg-[#111111] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tighter text-white">Cierre de Turno</h1>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Auditoría Final</p>
            </div>

            <form onSubmit={handleEndShift} className="space-y-6 relative z-10">
              
              <div className="relative group bg-[#111111] border border-white/5 rounded-3xl p-4 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400"><Clock size={20}/></div>
                  <div className="flex-1 relative">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Hora de Cierre</label>
                    <input 
                      type="datetime-local" value={endForm.hora_fin} onChange={e => setEndForm({...endForm, hora_fin: e.target.value})} 
                      className="w-full bg-transparent text-white font-mono text-lg outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="relative group bg-[#111111] border border-white/5 rounded-3xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-full text-white/50"><TrendingDown size={20}/></div>
                  <div className="flex-1">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">Odómetro Final</label>
                    <input type="number" value={endForm.odometro_final} onChange={e => setEndForm({...endForm, odometro_final: e.target.value})} className="w-full bg-transparent text-white font-mono text-xl outline-none" required placeholder="00000" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-3xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] mt-6">
                {isSubmitting ? 'Procesando...' : 'Ver Resultados de Auditoría'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ESTADO 4: TARJETA DE AUDITORÍA (RESUMEN) */}
      {/* ========================================== */}
      {viewState === 4 && shiftToSummary && (
        <div className="p-6 max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Auditoría Diaria</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mt-2">{new Date(shiftToSummary.hora_fin).toLocaleDateString()}</p>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><CheckCircle2 size={120} className="text-white"/></div>
            
            <div className="grid grid-cols-2 gap-8 mb-8 border-b border-white/5 pb-8 relative z-10">
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Horas Operativas</p>
                <p className="text-3xl font-mono text-white">{horasTrabajadas.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Millas Recorridas</p>
                <p className="text-3xl font-mono text-white">{millasRecorridas} mi</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <MetricRow label="Ingresos Brutos" value={`+$${totalIngresos.toFixed(2)}`} color="text-green-400" />
              <MetricRow label="Gastos Operativos (Gasolina/Comida)" value={`-$${totalGastos.toFixed(2)}`} color="text-red-400" />
              <MetricRow label="Sangre del Auto (Depreciación)" value={`-$${depreciacion.toFixed(2)}`} color="text-yellow-400" subtext={`$${costoPorMilla?.toFixed(2)} / milla`} />
              <MetricRow label="Fondo Mantenimiento (Diario)" value={`-$${fondoMantenimiento.toFixed(2)}`} color="text-purple-400" />
              
              <div className="pt-6 border-t border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Utilidad Neta Real</p>
                <p className={`text-6xl font-mono font-bold tracking-tighter drop-shadow-2xl ${utilidadNeta >= 0 ? 'text-white' : 'text-red-500'}`}>
                  ${utilidadNeta.toFixed(2)}
                </p>
                <p className="text-xs text-white/40 font-mono tracking-widest mt-2 uppercase">Valor de tu Hora: <span className="text-white/80">${(utilidadNeta / (horasTrabajadas || 1)).toFixed(2)}/h</span></p>
              </div>
            </div>
          </div>
          
          <button onClick={() => setViewState(1)} className="w-full py-5 bg-white/5 hover:bg-white hover:text-black border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all">
            Cerrar Auditoría
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* MODALES RÁPIDOS DE TRANSACCIÓN */}
      {/* ========================================== */}
      {(showIncomeModal || showExpenseModal) && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="w-full max-w-sm bg-[#050505] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => {setShowIncomeModal(false); setShowExpenseModal(false);}} className="absolute top-6 right-6 text-white/40 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-bold tracking-tighter text-white mb-6">
              {showIncomeModal ? 'Registrar Ingreso' : 'Registrar Gasto'}
            </h2>
            
            <form onSubmit={(e) => handleTransaction(e, showIncomeModal ? 'ingreso' : 'egreso')} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest ml-1">Tipo</label>
                <select value={txForm.tipo} onChange={e => setTxForm({...txForm, tipo: e.target.value})} className="w-full bg-[#111111] border border-white/5 text-white text-sm p-4 rounded-xl outline-none appearance-none">
                  {showIncomeModal ? (
                    <><option value="Uber">Viaje Uber</option><option value="InDrive">Viaje InDrive</option><option value="Propina">Propina / Extra</option></>
                  ) : (
                    <><option value="Gasolina">Combustible</option><option value="Comida/Otro">Comida / Otro</option></>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest ml-1">{showIncomeModal ? 'Método de Pago' : 'Pagado Con'}</label>
                <select value={txForm.metodo} onChange={e => setTxForm({...txForm, metodo: e.target.value})} className="w-full bg-[#111111] border border-white/5 text-white text-sm p-4 rounded-xl outline-none appearance-none">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-green-400 font-bold uppercase tracking-widest ml-1">¿A qué cuenta va/sale?</label>
                <select required value={txForm.cuenta_id} onChange={e => setTxForm({...txForm, cuenta_id: e.target.value})} className="w-full bg-[#111111] border border-green-500/20 text-white text-sm p-4 rounded-xl outline-none appearance-none focus:border-green-400">
                  <option value="" disabled>Selecciona la cuenta...</option>
                  {cuentas?.map(c => <option key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>)}
                </select>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest ml-1">Monto ($)</label>
                <input type="number" step="0.01" autoFocus required value={txForm.monto} onChange={e => setTxForm({...txForm, monto: e.target.value})} className="w-full bg-[#111111] border border-white/5 text-white text-xl p-4 rounded-xl outline-none font-mono" placeholder="0.00" />
              </div>

              {showExpenseModal && selectedCuentaParaTx && (selectedCuentaParaTx.tipo === 'Crédito' || selectedCuentaParaTx.tipo === 'Débito') && (
                <div className="p-4 border border-purple-500/30 bg-purple-500/5 rounded-2xl animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-purple-400 font-bold uppercase tracking-widest ml-1">% Cashback Aplicado (Opcional)</label>
                    <input type="number" step="0.1" value={txForm.porcentaje_cashback} onChange={e => setTxForm({...txForm, porcentaje_cashback: e.target.value})} className="w-full bg-purple-500/10 border border-purple-500/30 text-purple-100 text-sm p-4 rounded-xl outline-none font-mono" placeholder={`Reglas: ${selectedCuentaParaTx.reglas_cashback || 'No definidas'}`} />
                  </div>
                  {txForm.monto > 0 && txForm.porcentaje_cashback > 0 && (
                    <p className="text-[10px] text-purple-400 font-mono mt-2 text-right uppercase font-bold tracking-widest">
                      Generando +${(parseFloat(txForm.monto) * (parseFloat(txForm.porcentaje_cashback)/100)).toFixed(2)} USD
                    </p>
                  )}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className={`w-full py-4 mt-2 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg ${showIncomeModal ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {isSubmitting ? 'Procesando...' : 'Confirmar'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const MetricRow = ({ label, value, color, subtext }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
    <div>
      <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest">{label}</p>
      {subtext && <p className="text-[8px] text-white/30 font-mono mt-0.5">{subtext}</p>}
    </div>
    <span className={`font-mono font-bold text-lg ${color}`}>{value}</span>
  </div>
);