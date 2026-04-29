import React, { useState, useEffect } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Search, Plus, MapPin, Tag, CheckCircle2, X, Trash2, Edit2, Wallet, CreditCard, Building, TrendingUp, PackageCheck, Undo2, Banknote
} from 'lucide-react';

export const LogisticsModule = () => {
  // 1. DATA FETCHING (Logística + Cuentas de la Billetera)
  const { data: envios, loading: loadingLogistica, refetch } = useSupabaseQuery('logistica');
  const { data: cuentasBilletera, loading: loadingCuentas } = useSupabaseQuery('nexus_cuentas'); 

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Formulario
  const initialFormState = { 
    producto: '', precio_producto: '', costo_envio: '', 
    direccion: '', categoria: '', metodo_pago: 'Efectivo', 
    estado: 'Pendiente', destino_fondos_id: '' 
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formMode, setFormMode] = useState(null); 
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Estados para el Flujo de Cobro Diferido
  const [collectingRecord, setCollectingRecord] = useState(null);
  const [destinoFondosId, setDestinoFondosId] = useState('');

  // Auto-seleccionar la primera cuenta
  useEffect(() => {
    if ((formMode || collectingRecord) && cuentasBilletera?.length > 0) {
       if (!formData.destino_fondos_id) setFormData(prev => ({...prev, destino_fondos_id: cuentasBilletera[0].id}));
       if (!destinoFondosId) setDestinoFondosId(cuentasBilletera[0].id);
    }
  }, [formMode, collectingRecord, cuentasBilletera]);

  if (loadingLogistica || loadingCuentas) return <div className="flex items-center justify-center h-full p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Sincronizando_Ecosistema...</div>;

  // CÁLCULO DE MÉTRICAS (Solo cobrado)
  const metricas = envios?.filter(i => i.estado === 'cobrado').reduce((acc, curr) => {
    acc.ventasNovia += (parseFloat(curr.precio_producto) || 0);
    acc.tusEnvios += (parseFloat(curr.costo_envio) || 0);
    return acc;
  }, { ventasNovia: 0, tusEnvios: 0 }) || { ventasNovia: 0, tusEnvios: 0 };

  const filteredEnvios = envios?.filter(item => 
    item.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) || [];

  // ⚡ GUARDADO INTELIGENTE (Cobro inmediato o Creación)
  const handleSave = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSubmitting(true);
    
    try {
      let cuentaDestino = null;
      
      if (formData.estado === 'cobrado') {
        if (!formData.destino_fondos_id) throw new Error("Debes seleccionar una billetera destino para el cobro.");
        cuentaDestino = cuentasBilletera.find(c => c.id === formData.destino_fondos_id);
      }

      const payload = {
        producto: formData.producto.trim(),
        precio_producto: parseFloat(formData.precio_producto) || 0,
        costo_envio: parseFloat(formData.costo_envio) || 0,
        direccion: formData.direccion.trim(),
        categoria: formData.categoria.trim(),
        metodo_pago: formData.metodo_pago.trim(),
        estado: formData.estado,
        destino_fondos: cuentaDestino ? cuentaDestino.nombre_cuenta : (selectedRecord ? selectedRecord.destino_fondos : null)
      };

      if (formMode === 'add') {
        const { error } = await supabase.from('logistica').insert([payload]);
        if (error) throw error;
      } else if (formMode === 'edit') {
        const { error } = await supabase.from('logistica').update(payload).eq('id', selectedRecord.id);
        if (error) throw error;
      }

      // Si recién pasa a estado 'cobrado', inyectamos el dinero
      if (formData.estado === 'cobrado' && (!selectedRecord || selectedRecord.estado !== 'cobrado')) {
        const montoTotal = payload.precio_producto + payload.costo_envio;
        
        const { error: movError } = await supabase.from('nexus_movimientos').insert([{
          cuenta_id: formData.destino_fondos_id,
          tipo: 'Ingreso',
          monto: montoTotal,
          descripcion: `Venta & Envío: ${payload.producto}`
        }]);
        if (movError) throw movError;

        let nuevoSaldo = Number(cuentaDestino.saldo_actual);
        nuevoSaldo = cuentaDestino.tipo === 'Crédito' ? nuevoSaldo - montoTotal : nuevoSaldo + montoTotal;

        const { error: saldoError } = await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', formData.destino_fondos_id);
        if (saldoError) throw saldoError;
      }

      triggerHaptic('heavy');
      setFormMode(null);
      setFormData(initialFormState);
      refetch();
    } catch (err) {
      triggerHaptic('heavy');
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ⚡ COBRO DIFERIDO (De pendiente a cobrado)
  const confirmCollect = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    if (!destinoFondosId) return alert("Selecciona una billetera de destino.");
    setIsSubmitting(true);
    
    try {
      const cuentaDestino = cuentasBilletera.find(c => c.id === destinoFondosId);
      if (!cuentaDestino) throw new Error("Billetera no encontrada");

      const montoTotalCobrado = (parseFloat(collectingRecord.precio_producto) || 0) + (parseFloat(collectingRecord.costo_envio) || 0);

      const { error: logisticaError } = await supabase.from('logistica').update({ 
        estado: 'cobrado', destino_fondos: cuentaDestino.nombre_cuenta
      }).eq('id', collectingRecord.id);
      if (logisticaError) throw logisticaError;

      const { error: movError } = await supabase.from('nexus_movimientos').insert([{
        cuenta_id: destinoFondosId, tipo: 'Ingreso', monto: montoTotalCobrado,
        descripcion: `Venta & Envío: ${collectingRecord.producto}`
      }]);
      if (movError) throw movError;

      let nuevoSaldo = Number(cuentaDestino.saldo_actual);
      nuevoSaldo = cuentaDestino.tipo === 'Crédito' ? nuevoSaldo - montoTotalCobrado : nuevoSaldo + montoTotalCobrado;

      const { error: saldoError } = await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', destinoFondosId);
      if (saldoError) throw saldoError;

      triggerHaptic('heavy');
      setCollectingRecord(null); setDestinoFondosId(''); refetch();
    } catch (err) { alert(`Error: ${err.message}`); } 
    finally { setIsSubmitting(false); }
  };

  // ⚡ REVERSIÓN INTELIGENTE
  const revertCollect = async (item) => {
    triggerHaptic('heavy');
    if(!window.confirm(`¿Revertir este cobro?\nSe restarán los fondos de la billetera automáticamente.`)) return;
    setIsSubmitting(true);
    
    try {
      const montoTotal = (parseFloat(item.precio_producto) || 0) + (parseFloat(item.costo_envio) || 0);
      const cuentaDestino = cuentasBilletera?.find(c => c.nombre_cuenta === item.destino_fondos);

      if (cuentaDestino) {
        const { data: movs } = await supabase.from('nexus_movimientos').select('*')
          .eq('cuenta_id', cuentaDestino.id).eq('monto', montoTotal).in('descripcion', [`Venta & Envío: ${item.producto}`, `Cobro Inmediato: ${item.producto} (Logística)`, `Cobro Envío: ${item.producto} (Logística)`]).order('fecha', { ascending: false }).limit(1);

        if (movs && movs.length > 0) {
          await supabase.from('nexus_movimientos').delete().eq('id', movs[0].id);
          let saldoRev = Number(cuentaDestino.saldo_actual);
          saldoRev = cuentaDestino.tipo === 'Crédito' ? saldoRev + montoTotal : saldoRev - montoTotal;
          await supabase.from('nexus_cuentas').update({ saldo_actual: saldoRev }).eq('id', cuentaDestino.id);
        }
      }

      const { error } = await supabase.from('logistica').update({ estado: 'Pendiente', destino_fondos: null }).eq('id', item.id);
      if (error) throw error;
      
      triggerHaptic('heavy');
      refetch();
    } catch (err) { alert(`Error al revertir: ${err.message}`); } 
    finally { setIsSubmitting(false); }
  };

  const deleteRecord = async (id) => {
    triggerHaptic('heavy');
    if(window.confirm('¿Eliminar registro permanentemente?')) {
      await supabase.from('logistica').delete().eq('id', id);
      refetch();
    }
  };

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
        
        {/* CABECERA CON MÉTRICAS */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">LOGÍSTICA</h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Control de Entregas & Ventas</p>
            <button 
              onClick={() => { triggerHaptic('light'); setFormData(initialFormState); setFormMode('add'); }}
              className="mt-6 flex items-center gap-2 bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
            >
              <Plus size={16} strokeWidth={3} /> Nuevo Paquete
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 md:p-6 rounded-4xl min-w-35 md:min-w-48 shadow-inner">
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Ventas Producto</p>
              <p className="text-2xl md:text-3xl font-mono font-bold text-white">${metricas.ventasNovia.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 md:p-6 rounded-4xl min-w-35 md:min-w-48 shadow-inner">
              <p className="text-[9px] text-cyan-400 font-black uppercase tracking-widest mb-1">Ganancia Envíos</p>
              <p className="text-2xl md:text-3xl font-mono font-bold text-white">${metricas.tusEnvios.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
          </div>
        </header>

        {/* BARRA DE BÚSQUEDA */}
        <div className="relative group max-w-xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={18} />
          <input 
            type="text" placeholder="Buscar por producto, zona..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-xl border border-white/5 py-4 pl-14 pr-6 rounded-2xl text-white font-mono text-sm tracking-wide focus:outline-none focus:border-white/20 transition-all shadow-inner"
          />
        </div>

        {/* GRILLA DE ENVÍOS */}
        {filteredEnvios.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/5 rounded-[3rem] text-white/20 text-[10px] font-mono uppercase tracking-widest">No hay paquetes registrados</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEnvios.map((item) => (
              <div key={item.id} className={`group bg-black/40 backdrop-blur-xl border ${item.estado === 'cobrado' ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-white/5'} p-6 rounded-4xl hover:bg-white/5 transition-all relative overflow-hidden flex flex-col`}>
                
                {item.estado === 'cobrado' && <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 size={80} className="text-emerald-500" /></div>}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${item.estado === 'cobrado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                    {item.estado}
                  </span>
                  
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {item.estado === 'cobrado' && (
                      <button onClick={() => revertCollect(item)} className="p-2 bg-black/40 rounded-full text-white/40 hover:text-yellow-400 transition-all border border-white/5" title="Revertir">
                        <Undo2 size={14} />
                      </button>
                    )}
                    <button onClick={() => { triggerHaptic('light'); setFormData({...item, destino_fondos_id: ''}); setSelectedRecord(item); setFormMode('edit'); }} className="p-2 bg-black/40 rounded-full text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"><Edit2 size={14} /></button>
                    <button onClick={() => deleteRecord(item.id)} className="p-2 bg-black/40 rounded-full text-white/40 hover:text-red-500 transition-all border border-white/5 active:scale-90"><Trash2 size={14} /></button>
                  </div>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white mb-2 pr-10">{item.producto}</h3>
                
                <div className="flex flex-wrap items-center gap-3 text-white/40 text-[9px] font-bold uppercase tracking-widest mb-6">
                  {item.categoria && <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg"><Tag size={10} /> {item.categoria}</span>}
                  {item.metodo_pago && <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg"><CreditCard size={10} /> {item.metodo_pago}</span>}
                </div>

                <div className="space-y-4 border-t border-white/5 pt-4 mt-auto">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                    <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-2"><MapPin size={12} /> Zona</span>
                    <span className="text-xs text-white/80 font-medium truncate max-w-30">{item.direccion || 'Sin zona'}</span>
                  </div>
                  
                  <div className="flex justify-between items-end px-1">
                    <div>
                      <p className="text-[8px] text-cyan-400 uppercase font-black tracking-widest mb-0.5">Envío</p>
                      <p className="text-lg font-mono font-bold text-white/90">${(item.costo_envio || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mb-0.5">Producto</p>
                      <p className="text-2xl font-mono font-black text-white">${(item.precio_producto || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {item.estado !== 'cobrado' && (
                  <button onClick={() => { triggerHaptic('light'); setCollectingRecord(item); }} className="w-full mt-5 py-4 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-black font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Wallet size={14} /> Liquidar Pago
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL COBRO DIFERIDO (BOTTOM SHEET) */}
      {/* ========================================== */}
      {collectingRecord && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md p-0 md:p-4 overflow-hidden">
          <div className="absolute inset-0" onClick={() => { triggerHaptic('light'); setCollectingRecord(null); }}></div>
          <div className="w-full max-w-md bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-x md:border-b border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] relative animate-slide-up-sheet z-10 pb-16 md:pb-8">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
            <button onClick={() => { triggerHaptic('light'); setCollectingRecord(null); }} className="absolute top-6 right-6 text-white/40 hover:text-white hidden md:block active:scale-90"><X size={20} /></button>
            
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-black tracking-tighter text-white mb-2">Liquidar Paquete</h3>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Inyectar a Billetera</p>
              <p className="text-5xl font-mono text-emerald-400 font-black mt-3 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">${(parseFloat(collectingRecord.precio_producto) + parseFloat(collectingRecord.costo_envio)).toFixed(2)}</p>
            </div>
            
            <form onSubmit={confirmCollect} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest flex items-center gap-2 ml-1"><Building size={12} /> Billetera Destino</label>
                <select required value={destinoFondosId} onChange={(e) => setDestinoFondosId(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white font-bold p-4 rounded-2xl focus:border-white outline-none transition-all shadow-inner appearance-none">
                  <option value="" disabled className="bg-black">Elige la cuenta...</option>
                  {cuentasBilletera?.map(cuenta => <option key={cuenta.id} value={cuenta.id} className="bg-black">{cuenta.nombre_cuenta} ({cuenta.tipo})</option>)}
                </select>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-emerald-400 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                {isSubmitting ? 'Procesando...' : 'Confirmar Ingreso'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL FORMULARIO PRINCIPAL (BOTTOM SHEET) */}
      {/* ========================================== */}
      {formMode && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md p-0 md:p-4 overflow-hidden">
          <div className="absolute inset-0" onClick={() => { triggerHaptic('light'); setFormMode(null); }}></div>
          
          <div className="w-full max-w-2xl bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-x md:border-b border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] relative animate-slide-up-sheet max-h-[95dvh] overflow-y-auto z-10 pb-16 md:pb-10">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
            <button onClick={() => { triggerHaptic('light'); setFormMode(null); }} className="absolute top-6 right-6 text-white/40 hover:text-white bg-white/5 p-2 rounded-full hidden md:block active:scale-90"><X size={20} /></button>
            
            <h2 className="text-3xl font-black tracking-tighter text-white mb-6">{formMode === 'edit' ? 'Editar Paquete' : 'Nuevo Paquete'}</h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              
              <Input label="Descripción del Producto" placeholder="Ej: Set de Postres" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} required autoFocus />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Categoría / Tipo" placeholder="Postres" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
                <Input label="Zona de Entrega" placeholder="Santa Tecla" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              </div>
              
              {/* INPUTS DE DINERO GIGANTES (Fat Fingers) */}
              <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-4xl border border-white/5">
                <div className="space-y-1.5 w-full">
                  <label className="text-[9px] text-emerald-400/80 font-black uppercase tracking-widest ml-1">Costo Producto ($)</label>
                  <input type="number" step="0.01" required value={formData.precio_producto} onChange={e => setFormData({...formData, precio_producto: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-2xl font-mono font-bold p-4 rounded-xl focus:border-white/30 outline-none transition-all placeholder:text-white/10" placeholder="0.00"/>
                </div>
                <div className="space-y-1.5 w-full">
                  <label className="text-[9px] text-cyan-400/80 font-black uppercase tracking-widest ml-1">Tu Envío ($)</label>
                  <input type="number" step="0.01" required value={formData.costo_envio} onChange={e => setFormData({...formData, costo_envio: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-2xl font-mono font-bold p-4 rounded-xl focus:border-white/30 outline-none transition-all placeholder:text-white/10" placeholder="0.00"/>
                </div>
              </div>

              {/* BOTONES DE MÉTODO DE PAGO (Fat Fingers) */}
              <div className="space-y-2 pt-2">
                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-2">Método de Pago</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { triggerHaptic('light'); setFormData({...formData, metodo_pago: 'Efectivo'}); }} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex justify-center items-center gap-2 ${formData.metodo_pago === 'Efectivo' ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                    <Banknote size={16} /> Efectivo
                  </button>
                  <button type="button" onClick={() => { triggerHaptic('light'); setFormData({...formData, metodo_pago: 'Transferencia'}); }} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex justify-center items-center gap-2 ${formData.metodo_pago === 'Transferencia' ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                    <Smartphone size={16} /> Transferencia
                  </button>
                </div>
              </div>

              {/* ESTADO Y COBRO INTEGRADO (FAT FINGERS) */}
              <div className="pt-4 border-t border-white/5">
                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-2 block mb-2">Estado de Liquidación</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button type="button" disabled={selectedRecord?.estado === 'cobrado'} onClick={() => { triggerHaptic('light'); setFormData({...formData, estado: 'Pendiente', destino_fondos_id: ''}); }} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 ${formData.estado === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                    ⏳ Pendiente
                  </button>
                  <button type="button" disabled={selectedRecord?.estado === 'cobrado'} onClick={() => { triggerHaptic('light'); setFormData({...formData, estado: 'cobrado', destino_fondos_id: cuentasBilletera?.[0]?.id || ''}); }} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 ${formData.estado === 'cobrado' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                    ✅ Ya Cobrado
                  </button>
                </div>

                {formData.estado === 'cobrado' && selectedRecord?.estado !== 'cobrado' && (
                  <div className="space-y-1.5 w-full animate-in fade-in slide-in-from-top-4 duration-300 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                    <label className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest ml-1">Inyectar fondos a:</label>
                    <select required value={formData.destino_fondos_id} onChange={e => setFormData({...formData, destino_fondos_id: e.target.value})} className="w-full bg-black/40 border border-emerald-500/20 text-white font-bold text-sm p-4 rounded-xl focus:border-emerald-400 outline-none appearance-none">
                      <option value="" disabled className="bg-black text-white/40">Selecciona la billetera...</option>
                      {cuentasBilletera?.map(c => <option key={c.id} value={c.id} className="bg-black">{c.nombre_cuenta} ({c.tipo})</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-5 mt-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-4xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)] flex justify-center items-center gap-2">
                {isSubmitting ? 'Procesando...' : <><Plus strokeWidth={3} size={16} /> Guardar Paquete</>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const Input = ({ label, type = "text", ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>
    <input type={type} className="w-full bg-white/5 border border-white/5 text-white text-sm font-medium p-4 rounded-2xl focus:border-white/30 outline-none transition-all shadow-inner placeholder:text-white/20" {...props} />
  </div>
);