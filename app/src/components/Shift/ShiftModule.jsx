import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Play, Square, Plus, Minus, Clock, MapPin, Car, DollarSign, Wallet, TrendingDown, Wrench, CheckCircle2, X, Calendar, History, Trash2, ShieldCheck, AlertTriangle, Pause, Navigation, Fuel
} from 'lucide-react';

// ==========================================
// COMPONENTE: RELOJ INDEPENDIENTE
// ==========================================
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

  const [txForm, setTxForm] = useState({ categoria_id: '', metodo: 'Efectivo', monto: '', cuenta_id: '' });
  const [fuelForm, setFuelForm] = useState({ odometro_actual: '', galones: '', costo_total: '', cuenta_id: '' });

  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const isChecklistComplete = checklistDB?.length > 0 && checklistDB.every(item => checkedItems[item.id]);

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
        hora_inicio: now.toISOString().slice(0, 19), 
        odometro_inicial: vehiculos[0].millaje_actual || ''
      });
    }
  }, [viewState, vehiculos]);

  const toggleCheck = (id) => { setCheckedItems(prev => ({...prev, [id]: !prev[id]})); };

  const handlePreStart = (e) => { e.preventDefault(); triggerHaptic('light'); setShowChecklist(true); };

  const handleStartShift = async () => {
    triggerHaptic('medium'); setIsSubmitting(true);
    try {
      if (!startForm.vehiculo_id) throw new Error("Selecciona un vehículo.");
      const selectedVehicle = vehiculos.find(v => v.id === startForm.vehiculo_id);
      const odometroIngresado = parseFloat(startForm.odometro_inicial);
      
      if (odometroIngresado > (selectedVehicle.millaje_actual || 0)) {
          await supabase.from('vehiculos').update({ millaje_actual: odometroIngresado }).eq('id', selectedVehicle.id);
      }

      const coords = await getCoordinates();
      const { error } = await supabase.from('nexus_jornadas').insert([{
        vehiculo_id: startForm.vehiculo_id, hora_inicio: new Date(startForm.hora_inicio).toISOString(),
        odometro_inicial: odometroIngresado, estado: 'Activa', lat_inicio: coords.lat, lng_inicio: coords.lng
      }]);
      
      if (error) throw error;
      setShowChecklist(false); refetchJornadas(); refetchVehiculos();
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

      const { error: movError } = await supabase.from('nexus_movimientos').insert([{
        cuenta_id: cuenta.id, jornada_id: activeShift.id, categoria_id: categoria.id,
        tipo: type === 'ingreso' ? 'Ingreso' : 'Egreso', monto: monto,
        descripcion: `Jornada: ${categoria.nombre}`
      }]);
      if (movError) throw movError;

      let nuevoSaldo = Number(cuenta.saldo_actual);
      nuevoSaldo = cuenta.tipo === 'Crédito' ? (type === 'ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto) : (type === 'ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto);
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', cuenta.id);

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

      setShowIncomeModal(false); setShowExpenseModal(false);
      setTxForm({ categoria_id: '', metodo: 'Efectivo', monto: '', cuenta_id: '' });
      refetchJornadas(); refetchCuentas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const cuenta = cuentas.find(c => c.id === fuelForm.cuenta_id);
      const odoActual = parseFloat(fuelForm.odometro_actual);
      const galones = parseFloat(fuelForm.galones);
      const costoTotal = parseFloat(fuelForm.costo_total);

      await supabase.from('nexus_repostajes').insert([{
        jornada_id: activeShift.id, vehiculo_id: activeShift.vehiculo_id,
        odometro_actual: odoActual, galones: galones, costo_total: costoTotal
      }]);

      const catGas = categoriasAll?.find(c => c.nombre.toLowerCase().includes('gasolina'));
      await supabase.from('nexus_movimientos').insert([{
        cuenta_id: cuenta.id, jornada_id: activeShift.id, categoria_id: catGas?.id || null,
        tipo: 'Egreso', monto: costoTotal, descripcion: `Gasolina: ${galones} Gal`
      }]);

      let nuevoSaldo = Number(cuenta.saldo_actual);
      nuevoSaldo = cuenta.tipo === 'Crédito' ? nuevoSaldo + costoTotal : nuevoSaldo - costoTotal;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', cuenta.id);

      await supabase.from('nexus_jornadas').update({ gastos_combustible: Number(activeShift.gastos_combustible) + costoTotal }).eq('id', activeShift.id);
      if (odoActual > Number(activeVehicle?.millaje_actual)) {
        await supabase.from('vehiculos').update({ millaje_actual: odoActual }).eq('id', activeVehicle.id);
      }

      setShowFuelModal(false); setFuelForm({ odometro_actual: '', galones: '', costo_total: '', cuenta_id: '' });
      refetchJornadas(); refetchVehiculos(); refetchCuentas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const prepareCheckout = () => {
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const maxOdo = Math.max(parseFloat(activeShift.odometro_inicial), parseFloat(activeVehicle?.millaje_actual || 0));
    setEndForm({ hora_fin: now.toISOString().slice(0, 19), odometro_final: maxOdo.toString() });
    setViewState(3);
  };

  const handleEndShift = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const coords = await getCoordinates();
      await supabase.from('nexus_jornadas').update({
        hora_fin: new Date(endForm.hora_fin).toISOString(), odometro_final: parseFloat(endForm.odometro_final), 
        estado: 'Finalizada', lat_fin: coords.lat, lng_fin: coords.lng
      }).eq('id', activeShift.id);
      await supabase.from('vehiculos').update({ millaje_actual: parseFloat(endForm.odometro_final) }).eq('id', activeShift.vehiculo_id);
      setViewState(4); refetchJornadas(); refetchVehiculos();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const shiftToSummary = activeShift || jornadasActivas?.sort((a,b) => new Date(b.hora_fin) - new Date(a.hora_fin))[0];
  const vehicleSummary = vehiculos?.find(v => v.id === shiftToSummary?.vehiculo_id);
  const totalIngresos = Number(shiftToSummary?.ingresos_uber || 0) + Number(shiftToSummary?.ingresos_indrive || 0) + Number(shiftToSummary?.propinas || 0);
  const totalGastos = Number(shiftToSummary?.gastos_combustible || 0) + Number(shiftToSummary?.gastos_otros || 0);
  
  let depreciacion = 0, millasRecorridas = 0, horasTrabajadas = 0;
  if (shiftToSummary && vehicleSummary) {
    millasRecorridas = (shiftToSummary.odometro_final || 0) - (shiftToSummary.odometro_inicial || 0);
    depreciacion = millasRecorridas * (((vehicleSummary.precio_compra || 0) - (vehicleSummary.valor_de_venta || 0)) / (vehicleSummary.millas_vida_util || 1));
    const totalMs = new Date(shiftToSummary.hora_fin || new Date()) - new Date(shiftToSummary.hora_inicio);
    horasTrabajadas = (totalMs - ((shiftToSummary.segundos_pausa || 0) * 1000)) / (1000 * 60 * 60);
  }

  const filteredCats = categoriasAll?.filter(c => c.tipo === (showIncomeModal ? 'Ingreso' : 'Egreso') && c.modulo === 'General') || [];

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      {/* VISTA 1: REPOSO */}
      {viewState === 1 && (
        <div className="max-w-xl mx-auto space-y-10">
          <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
            <div className="mb-8 relative z-10">
              <h1 className="text-4xl font-black tracking-tighter">Turno Activo</h1>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-2">Check-in Johnnathan Matus</p>
            </div>
            <form onSubmit={handlePreStart} className="space-y-4 relative z-10">
              <select value={startForm.vehiculo_id} onChange={e => {
                  const v = vehiculos.find(veh => veh.id === e.target.value);
                  setStartForm({...startForm, vehiculo_id: e.target.value, odometro_inicial: v?.millaje_actual || ''});
              }} className="w-full bg-white/5 border border-white/10 text-white font-bold p-5 rounded-3xl outline-none appearance-none">
                {vehiculos?.map(v => <option key={v.id} value={v.id} className="bg-black">{v.marca} {v.modelo}</option>)}
              </select>
              <input type="datetime-local" step="1" value={startForm.hora_inicio} onChange={e => setStartForm({...startForm, hora_inicio: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-mono p-5 rounded-3xl outline-none" required />
              <input type="number" value={startForm.odometro_inicial} onChange={e => setStartForm({...startForm, odometro_inicial: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-mono text-xl p-5 rounded-3xl outline-none" required placeholder="Millas Iniciales" />
              <button type="submit" className="w-full py-6 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-xl">Iniciar Protocolo</button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA 2: ACTIVA / PAUSADA */}
      {viewState === 2 && activeShift && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className={`backdrop-blur-3xl border rounded-[3rem] p-10 text-center relative overflow-hidden transition-all duration-700 ${activeShift.estado === 'Pausada' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/10'}`}>
            <h1 className="text-7xl font-mono font-black tracking-tighter mb-4">
              <LiveTimer startTime={activeShift.hora_inicio} isPaused={activeShift.estado === 'Pausada'} pauseStartTime={activeShift.inicio_pausa} accumulatedPauseSeconds={activeShift.segundos_pausa} />
            </h1>
            <p className="text-[10px] text-white/40 uppercase font-black">Odómetro: {activeVehicle?.millaje_actual || activeShift.odometro_inicial} MI</p>
          </div>

          {!activeShift.estado === 'Pausada' ? (
             <button onClick={handleTogglePause} className="w-full py-10 bg-orange-500 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex flex-col items-center gap-2"><Play size={30} fill="currentColor"/> Reanudar</button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setShowIncomeModal(true)} className="flex-2 bg-emerald-500/10 border border-emerald-500/20 py-8 rounded-4xl flex flex-col items-center gap-2"><Plus size={24} className="text-emerald-400"/><span className="text-[10px] font-black text-emerald-400 uppercase">Ingreso</span></button>
              <button onClick={() => setShowFuelModal(true)} className="flex-1 bg-yellow-500/10 border border-yellow-500/20 py-8 rounded-4xl flex flex-col items-center gap-2"><Fuel size={24} className="text-yellow-500"/><span className="text-[10px] font-black text-yellow-500 uppercase">Gaso</span></button>
              <button onClick={() => setShowExpenseModal(true)} className="flex-2 bg-red-500/10 border border-red-500/20 py-8 rounded-4xl flex flex-col items-center gap-2"><Minus size={24} className="text-red-400"/><span className="text-[10px] font-black text-red-400 uppercase">Gasto</span></button>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={handleTogglePause} className="flex-1 py-5 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black rounded-3xl">Pausa</button>
            <button onClick={prepareCheckout} className="flex-1 py-5 bg-white text-black font-black rounded-3xl">Cierre</button>
          </div>
        </div>
      )}

      {/* MODAL FUEL (GASOLINA) */}
      {showFuelModal && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4 overflow-hidden">
          <div className="absolute inset-0" onClick={() => setShowFuelModal(false)}></div>
          <div className="w-full max-w-md bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-10 relative animate-slide-up-sheet">
            <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-2"><Fuel className="text-yellow-500" /> Registro de Repostaje</h2>
            <form onSubmit={handleFuelSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-black ml-1">Odómetro</label>
                  <input type="number" step="0.1" required value={fuelForm.odometro_actual} onChange={e => setFuelForm({...fuelForm, odometro_actual: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-mono p-4 rounded-2xl outline-none" placeholder={activeVehicle?.millaje_actual || "0"} />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-black ml-1">Galones</label>
                  <input type="number" step="0.01" required value={fuelForm.galones} onChange={e => setFuelForm({...fuelForm, galones: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-mono p-4 rounded-2xl outline-none" placeholder="0.00" />
                </div>
              </div>
              <select required value={fuelForm.cuenta_id} onChange={e => setFuelForm({...fuelForm, cuenta_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-bold p-4 rounded-2xl outline-none appearance-none">
                  <option value="" disabled className="bg-black">Pagado con...</option>
                  {cuentas?.map(c => <option key={c.id} value={c.id} className="bg-black">{c.nombre_cuenta} ({c.tipo})</option>)}
              </select>
              <input type="number" step="0.01" required value={fuelForm.costo_total} onChange={e => setFuelForm({...fuelForm, costo_total: e.target.value})} className="w-full bg-white/5 border border-white/10 text-yellow-500 text-3xl font-black p-5 rounded-2xl outline-none text-center" placeholder="$0.00" />
              <button type="submit" className="w-full py-5 bg-yellow-500 text-black font-black uppercase text-[11px] rounded-2xl">Confirmar Llenado</button>
            </form>
          </div>
        </div>
      )}

      {/* CHECKLIST (RESTAURADO) */}
      {showChecklist && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-hidden">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-10 relative">
            <h2 className="text-2xl font-black text-white mb-6">Pre-Vuelo</h2>
            <div className="space-y-3 mb-8">
                {checklistDB?.map((item) => (
                    <div key={item.id} onClick={() => toggleCheck(item.id)} className={`p-5 rounded-2xl flex justify-between items-center cursor-pointer border ${checkedItems[item.id] ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}>
                        <span className={`text-xs font-bold uppercase ${checkedItems[item.id] ? 'text-emerald-400' : 'text-white/60'}`}>{item.tarea}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkedItems[item.id] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>{checkedItems[item.id] && <CheckCircle2 size={14} className="text-black" />}</div>
                    </div>
                ))}
            </div>
            <button onClick={handleStartShift} disabled={!isChecklistComplete} className={`w-full py-6 font-black uppercase rounded-4xl ${isChecklistComplete ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/30'}`}>Confirmar e Iniciar</button>
          </div>
        </div>
      )}

      {/* INCOME/EXPENSE MODALS (IGUALES PERO CON CATEGORIAS) */}
      {(showIncomeModal || showExpenseModal) && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-10 animate-slide-up-sheet">
            <h2 className="text-2xl font-black text-white mb-8">{showIncomeModal ? 'Nuevo Ingreso' : 'Nuevo Gasto'}</h2>
            <form onSubmit={(e) => handleTransaction(e, showIncomeModal ? 'ingreso' : 'egreso')} className="space-y-5">
              <select required value={txForm.categoria_id} onChange={e => setTxForm({...txForm, categoria_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-bold p-4 rounded-2xl outline-none appearance-none">
                <option value="" disabled className="bg-black">Rubro...</option>
                {filteredCats?.map(c => <option className="bg-black" key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select required value={txForm.cuenta_id} onChange={e => setTxForm({...txForm, cuenta_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white font-bold p-4 rounded-2xl outline-none appearance-none">
                <option value="" disabled className="bg-black">Cuenta...</option>
                {cuentas?.map(c => <option className="bg-black" key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>)}
              </select>
              <input type="number" step="0.01" required value={txForm.monto} onChange={e => setTxForm({...txForm, monto: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white text-3xl font-black p-5 rounded-2xl outline-none text-center" placeholder="$0.00" />
              <button type="submit" className={`w-full py-5 font-black uppercase rounded-2xl ${showIncomeModal ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>Confirmar</button>
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