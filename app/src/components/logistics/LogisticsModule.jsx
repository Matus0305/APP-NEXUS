import React, { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { 
  Search, Plus, MapPin, Tag, CheckCircle2, X, Trash2, Edit2, Wallet, CreditCard, Building, TrendingUp, PackageCheck, Undo2
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
    direccion: '', categoria: '', metodo_pago: '', 
    estado: 'Pendiente', destino_fondos_id: '' 
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formMode, setFormMode] = useState(null); 
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Estados para el Flujo de Cobro Diferido
  const [collectingRecord, setCollectingRecord] = useState(null);
  const [destinoFondosId, setDestinoFondosId] = useState('');

  if (loadingLogistica || loadingCuentas) return <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Sincronizando_Ecosistema...</div>;

  // CÁLCULO DE MÉTRICAS (Solo cobrado)
  const metricas = envios.filter(i => i.estado === 'cobrado').reduce((acc, curr) => {
    acc.ventasNovia += (parseFloat(curr.precio_producto) || 0);
    acc.tusEnvios += (parseFloat(curr.costo_envio) || 0);
    return acc;
  }, { ventasNovia: 0, tusEnvios: 0 });

  const filteredEnvios = envios.filter(item => 
    item.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ⚡ GUARDADO INTELIGENTE (Cobro inmediato)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let cuentaDestino = null;
      
      if (formData.estado === 'cobrado') {
        if (!formData.destino_fondos_id) throw new Error("Debes seleccionar una cuenta destino para el cobro.");
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
        
        // 1. Movimiento en billetera
        const { error: movError } = await supabase.from('nexus_movimientos').insert([{
          cuenta_id: formData.destino_fondos_id,
          tipo: 'Ingreso',
          monto: montoTotal,
          descripcion: `Cobro Inmediato: ${payload.producto} (Logística)`
        }]);
        if (movError) throw movError;

        // 2. Actualizar saldo Billetera
        let nuevoSaldo = Number(cuentaDestino.saldo_actual);
        nuevoSaldo = cuentaDestino.tipo === 'Crédito' ? nuevoSaldo - montoTotal : nuevoSaldo + montoTotal;

        const { error: saldoError } = await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', formData.destino_fondos_id);
        if (saldoError) throw saldoError;
      }

      setFormMode(null);
      setFormData(initialFormState);
      refetch();

    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ⚡ COBRO DIFERIDO (De pendiente a cobrado)
  const confirmCollect = async (e) => {
    e.preventDefault();
    if (!destinoFondosId) {
      alert("Por favor, selecciona una cuenta de destino.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cuentaDestino = cuentasBilletera.find(c => c.id === destinoFondosId);
      if (!cuentaDestino) throw new Error("Cuenta no encontrada en la Billetera");

      const montoTotalCobrado = (parseFloat(collectingRecord.precio_producto) || 0) + (parseFloat(collectingRecord.costo_envio) || 0);

      // 1. Actualizar estado logística
      const { error: logisticaError } = await supabase.from('logistica').update({ 
        estado: 'cobrado',
        destino_fondos: cuentaDestino.nombre_cuenta
      }).eq('id', collectingRecord.id);
      
      if (logisticaError) throw logisticaError;

      // 2. Insertar movimiento
      const { error: movError } = await supabase.from('nexus_movimientos').insert([{
        cuenta_id: destinoFondosId,
        tipo: 'Ingreso',
        monto: montoTotalCobrado,
        descripcion: `Cobro Envío: ${collectingRecord.producto} (Logística)`
      }]);

      if (movError) throw movError;

      // 3. Modificar Saldo
      let nuevoSaldo = Number(cuentaDestino.saldo_actual);
      if (cuentaDestino.tipo === 'Crédito') {
         nuevoSaldo = nuevoSaldo - montoTotalCobrado;
      } else {
         nuevoSaldo = nuevoSaldo + montoTotalCobrado;
      }

      const { error: saldoError } = await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo }).eq('id', destinoFondosId);
      if (saldoError) throw saldoError;

      setCollectingRecord(null);
      setDestinoFondosId('');
      refetch();
      
    } catch (err) {
      alert(`Error al liquidar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ⚡ REVERSIÓN INTELIGENTE (NUEVO)
  const revertCollect = async (item) => {
    if(window.confirm(`¿Seguro que deseas revertir este cobro?\n\nEl sistema identificará el movimiento en tu billetera, lo borrará y ajustará tu saldo automáticamente para corregir el error.`)) {
      setIsSubmitting(true);
      
      try {
        const montoTotal = (parseFloat(item.precio_producto) || 0) + (parseFloat(item.costo_envio) || 0);
        
        // 1. Encontrar a qué cuenta se fue el dinero usando el nombre que guardamos
        const cuentaDestino = cuentasBilletera?.find(c => c.nombre_cuenta === item.destino_fondos);

        if (cuentaDestino) {
          // 2. Buscar el movimiento exacto que el sistema creó automáticamente
          const descripcionesPosibles = [
            `Cobro Inmediato: ${item.producto} (Logística)`,
            `Cobro Envío: ${item.producto} (Logística)`
          ];

          const { data: movs, error: movsError } = await supabase
            .from('nexus_movimientos')
            .select('*')
            .eq('cuenta_id', cuentaDestino.id)
            .eq('monto', montoTotal)
            .in('descripcion', descripcionesPosibles)
            .order('fecha', { ascending: false })
            .limit(1);

          if (!movsError && movs && movs.length > 0) {
            const movimientoBorrar = movs[0];

            // 3. Borrar el registro del historial de la billetera
            await supabase.from('nexus_movimientos').delete().eq('id', movimientoBorrar.id);

            // 4. Revertir las matemáticas del saldo
            let saldoRevertido = Number(cuentaDestino.saldo_actual);
            if (cuentaDestino.tipo === 'Crédito') {
              saldoRevertido = saldoRevertido + montoTotal; // Revertir un pago a crédito es sumar la deuda de nuevo
            } else {
              saldoRevertido = saldoRevertido - montoTotal; // Revertir un ahorro es restar el saldo
            }

            await supabase.from('nexus_cuentas').update({ saldo_actual: saldoRevertido }).eq('id', cuentaDestino.id);
          }
        }

        // 5. Devolver el envío a pendiente en logística
        const { error } = await supabase.from('logistica').update({ 
          estado: 'Pendiente',
          destino_fondos: null
        }).eq('id', item.id);
        
        if (error) throw error;
        
        refetch();

      } catch (err) {
        alert(`Error al revertir: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const deleteRecord = async (id) => {
    if(window.confirm('¿Eliminar registro permanentemente?')) {
      await supabase.from('logistica').delete().eq('id', id);
      refetch();
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* CABECERA CON MÉTRICAS */}
      <header className="flex justify-between items-start border-b border-white/5 pb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">Logística</h1>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Control de Entregas y Envíos</p>
          <button 
            onClick={() => { setFormData(initialFormState); setFormMode('add'); }}
            className="mt-8 flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          >
            <Plus size={16} strokeWidth={3} /> Nuevo Envío
          </button>
        </div>

        {/* CONTADORES */}
        <div className="flex gap-4">
          <div className="hidden md:block bg-[#0A0A0A] border border-white/5 p-6 rounded-4xl min-w-50 shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={40} className="text-white" />
            </div>
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Utilidad Ventas
            </p>
            <p className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              ${metricas.ventasNovia.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            <p className="text-[8px] text-white/20 font-bold uppercase mt-1 tracking-tighter">Neto acumulado de productos</p>
          </div>

          <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-4xl min-w-40 md:min-w-50 shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <PackageCheck size={40} className="text-white" />
            </div>
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full" /> Ganancia Envíos
            </p>
            <p className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              ${metricas.tusEnvios.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            <p className="text-[8px] text-white/20 font-bold uppercase mt-1 tracking-tighter">Total ingresos servicios</p>
          </div>
        </div>
      </header>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="BUSCAR POR PRODUCTO, ZONA O CATEGORÍA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/5 py-6 pl-16 pr-6 rounded-4xl text-white font-mono text-xs tracking-widest focus:outline-none focus:border-white/40 transition-all shadow-inner"
        />
      </div>

      {/* GRILLA DE ENVÍOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEnvios.map((item) => (
          <div key={item.id} className={`group bg-[#0A0A0A] border ${item.estado === 'cobrado' ? 'border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-white/5'} p-8 rounded-[2.5rem] hover:bg-[#111111] transition-all relative overflow-hidden flex flex-col`}>
            {item.estado === 'cobrado' && <div className="absolute top-0 right-0 p-6 opacity-10"><CheckCircle2 size={100} className="text-white" /></div>}
            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${item.estado === 'cobrado' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white/60 border border-white/10'}`}>
                {item.estado || 'Pendiente'}
              </span>
              <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {/* BOTÓN DESHACER COBRO MÁGICO */}
                {item.estado === 'cobrado' && (
                  <button onClick={() => revertCollect(item)} className="p-2 bg-[#111111] rounded-full text-white/40 hover:text-yellow-400 transition-all border border-white/5" title="Revertir y quitar fondos">
                    <Undo2 size={14} />
                  </button>
                )}
                <button onClick={() => { setFormData({...item, destino_fondos_id: ''}); setSelectedRecord(item); setFormMode('edit'); }} className="p-2 bg-[#111111] rounded-full text-white/40 hover:text-white transition-all border border-white/5"><Edit2 size={14} /></button>
                <button onClick={() => deleteRecord(item.id)} className="p-2 bg-[#111111] rounded-full text-white/40 hover:text-red-500 transition-all border border-white/5"><Trash2 size={14} /></button>
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tighter text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{item.producto}</h3>
            <div className="flex flex-wrap items-center gap-4 text-white/40 text-[10px] font-bold uppercase tracking-widest mb-8">
              <span className="flex items-center gap-1"><Tag size={12} /> {item.categoria || 'Sin Categoría'}</span>
              {item.metodo_pago && <span className="flex items-center gap-1"><CreditCard size={12} /> {item.metodo_pago}</span>}
            </div>
            <div className="space-y-4 border-t border-white/5 pt-6 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-2"><MapPin size={12} /> Destino</span>
                <span className="text-xs text-white/80 font-medium truncate max-w-37.5">{item.direccion || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[9px] text-white/30 uppercase font-bold mb-1">Tu Ganancia</p>
                  <p className="text-xl font-mono font-bold text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">${(item.costo_envio || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/30 uppercase font-bold mb-1">Precio Producto</p>
                  <p className="text-2xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">${(item.precio_producto || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
            {item.estado !== 'cobrado' && (
              <button onClick={() => setCollectingRecord(item)} className="w-full mt-6 py-4 bg-white/5 hover:bg-white hover:text-black border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex justify-center items-center gap-2"><Wallet size={14} /> Proceder al Cobro</button>
            )}
          </div>
        ))}
      </div>

      {/* MODAL COBRO INTELIGENTE (Flujo Diferido) */}
      {collectingRecord && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#050505] border border-white/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setCollectingRecord(null)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
            <div className="mb-8">
              <h3 className="text-2xl font-bold tracking-tighter text-white mb-2">Liquidar Envío</h3>
              <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Total a inyectar a Billetera</p>
              <p className="text-4xl font-mono text-white font-bold mt-2">${(parseFloat(collectingRecord.precio_producto) + parseFloat(collectingRecord.costo_envio)).toFixed(2)}</p>
            </div>
            <form onSubmit={confirmCollect} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] text-white/50 font-bold uppercase tracking-widest flex items-center gap-2"><Building size={12} /> Selecciona Cuenta Destino</label>
                <select 
                  required 
                  value={destinoFondosId} 
                  onChange={(e) => setDestinoFondosId(e.target.value)} 
                  className="w-full bg-[#111111] border border-white/10 text-white text-sm p-4 rounded-xl focus:border-white focus:bg-[#1a1a1a] outline-none transition-all shadow-inner appearance-none"
                >
                  <option value="" disabled>Elige la cuenta...</option>
                  {cuentasBilletera?.map(cuenta => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre_cuenta} ({cuenta.tipo}) - Saldo: ${Number(cuenta.saldo_actual).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                {isSubmitting ? 'Procesando...' : 'Confirmar Ingreso'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO PRINCIPAL */}
      {formMode && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-[#050505] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setFormMode(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-3xl font-bold tracking-tighter text-white mb-6">{formMode === 'edit' ? 'Editar Envío' : 'Registrar Envío'}</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              <Input label="Descripción del Producto" placeholder="Ej: Pastel de Bodas" value={formData.producto} onChange={e => setFormData({...formData, producto: e.target.value})} required />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Categoría" placeholder="Postres" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
                <Input label="Dirección / Zona" placeholder="San Salvador" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Costo Producto ($)" type="number" step="0.01" value={formData.precio_producto} onChange={e => setFormData({...formData, precio_producto: e.target.value})} required />
                <Input label="Costo Envío ($)" type="number" step="0.01" value={formData.costo_envio} onChange={e => setFormData({...formData, costo_envio: e.target.value})} required />
                <Input label="Forma de Pago" placeholder="Ej: Efectivo" value={formData.metodo_pago} onChange={e => setFormData({...formData, metodo_pago: e.target.value})} />
              </div>

              {/* ZONA DE COBRO INTEGRADO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1.5 w-full">
                  <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest ml-1">Estado del Envío</label>
                  <select 
                    value={formData.estado} 
                    onChange={e => setFormData({...formData, estado: e.target.value})} 
                    disabled={selectedRecord?.estado === 'cobrado'} 
                    className="w-full bg-[#111111] border border-white/5 text-white text-sm p-4 rounded-xl focus:border-white/40 outline-none appearance-none shadow-inner"
                  >
                    <option value="Pendiente">⏳ Pendiente de Cobro</option>
                    <option value="cobrado">✅ Cobrado Inmediatamente</option>
                  </select>
                </div>

                {formData.estado === 'cobrado' && selectedRecord?.estado !== 'cobrado' && (
                  <div className="space-y-1.5 w-full animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-[9px] text-green-400 font-bold uppercase tracking-widest ml-1">¿Hacia qué cuenta va el dinero?</label>
                    <select 
                      value={formData.destino_fondos_id} 
                      onChange={e => setFormData({...formData, destino_fondos_id: e.target.value})} 
                      required 
                      className="w-full bg-[#111111] border border-green-500/20 text-white text-sm p-4 rounded-xl focus:border-green-400 outline-none appearance-none shadow-inner"
                    >
                      <option value="" disabled>Selecciona la cuenta...</option>
                      {cuentasBilletera?.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre_cuenta} ({c.tipo})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:bg-gray-200 transition-colors">
                {isSubmitting ? 'Guardando...' : 'Confirmar Envío'}
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
    <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest ml-1">{label}</label>
    <input type={type} className="w-full bg-[#111111] border border-white/5 text-white text-sm p-4 rounded-xl focus:border-white/40 outline-none transition-all shadow-inner" {...props} />
  </div>
);