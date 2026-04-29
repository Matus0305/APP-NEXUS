import React, { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { 
  TrendingDown, Shield, X, Gauge, Plus, Edit2, Trash2, AlertTriangle, Car, Target, ArrowLeft, Wrench, FileText, Settings2, Image as ImageIcon 
} from 'lucide-react';

export const FleetManagement = () => {
  const { data: vehiculos, loading, refetch } = useSupabaseQuery('vehiculos');
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const initialFormState = { 
    marca: '', modelo: '', año: '', precio_compra: '', 
    valor_venta: '', millas_vida_util: '', millaje_actual: '',
    meta_mantenimiento: '150',
    ultimo_cambio_aceite_motor: '', 
    intervalo_aceite_motor: '5000',
    ultimo_cambio_aceite_caja: '',
    intervalo_aceite_caja: '30000',
    vencimiento_seguro: '',   
    vencimiento_tarjeta_circulacion: '',
    imagen_url: ''
  };
  
  const [formMode, setFormMode] = useState(null); 
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const DEFAULT_CAR_IMAGE = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80';

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">
        Sincronizando_Nexus...
      </div>
    </div>
  );

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      marca: formData.marca.trim(),
      modelo: formData.modelo.trim(),
      año: parseInt(formData.año) || 0,
      precio_compra: parseFloat(formData.precio_compra) || 0,
      valor_de_venta: parseFloat(formData.valor_venta) || 0,
      millas_vida_util: parseInt(formData.millas_vida_util) || 0,
      millaje_actual: parseInt(formData.millaje_actual) || 0,
      meta_mantenimiento: parseFloat(formData.meta_mantenimiento) || 0,
      ultimo_cambio_aceite_motor: parseInt(formData.ultimo_cambio_aceite_motor) || 0,
      intervalo_aceite_motor: parseInt(formData.intervalo_aceite_motor) || 5000,
      ultimo_cambio_aceite_caja: parseInt(formData.ultimo_cambio_aceite_caja) || 0,
      intervalo_aceite_caja: parseInt(formData.intervalo_aceite_caja) || 30000,
      vencimiento_seguro: formData.vencimiento_seguro || null,
      vencimiento_tarjeta_circulacion: formData.vencimiento_tarjeta_circulacion || null,
      imagen_url: formData.imagen_url.trim() || null
    };

    let error;
    try {
      if (formMode === 'add') {
        const res = await supabase.from('vehiculos').insert([payload]);
        error = res.error;
      } else if (formMode === 'edit') {
        const res = await supabase.from('vehiculos').update(payload).eq('id', selectedAsset.id);
        error = res.error;
      }
    } catch (err) { error = err; }

    setIsSubmitting(false);

    if (!error) {
      setFormMode(null);
      setFormData(initialFormState);
      refetch(); 
      if (formMode === 'edit') setSelectedAsset({ ...selectedAsset, ...payload });
    } else {
      alert(`Error al guardar: ${error.message}`);
    }
  };

  const handleDeleteVehicle = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('vehiculos').delete().eq('id', selectedAsset.id);
    setIsSubmitting(false);
    if (!error) { setIsDeleting(false); setSelectedAsset(null); refetch(); }
  };

  const openEditModal = () => {
    setFormData({
      marca: selectedAsset.marca || '',
      modelo: selectedAsset.modelo || '',
      año: selectedAsset.año || '',
      precio_compra: selectedAsset.precio_compra || '',
      valor_venta: selectedAsset.valor_de_venta || '',
      millas_vida_util: selectedAsset.millas_vida_util || '',
      millaje_actual: selectedAsset.millaje_actual || '',
      meta_mantenimiento: selectedAsset.meta_mantenimiento || '150',
      ultimo_cambio_aceite_motor: selectedAsset.ultimo_cambio_aceite_motor || '',
      intervalo_aceite_motor: selectedAsset.intervalo_aceite_motor || '5000',
      ultimo_cambio_aceite_caja: selectedAsset.ultimo_cambio_aceite_caja || '',
      intervalo_aceite_caja: selectedAsset.intervalo_aceite_caja || '30000',
      vencimiento_seguro: selectedAsset.vencimiento_seguro || '',
      vencimiento_tarjeta_circulacion: selectedAsset.vencimiento_tarjeta_circulacion || '',
      imagen_url: selectedAsset.imagen_url || ''
    });
    setFormMode('edit');
  };

  const getMaintenanceProgress = (current, lastChange, interval) => {
    if (!lastChange || !interval) return 0;
    const milesSinceChange = current - lastChange;
    const progress = (milesSinceChange / interval) * 100;
    return progress > 100 ? 100 : Math.max(0, progress);
  };

  return (
    <div className="w-full text-white font-sans relative">
      
      {/* VISTA PRINCIPAL: LISTA DE VEHÍCULOS */}
      {!selectedAsset && (
        <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-500 ease-out">
          <header className="flex justify-between items-end border-b border-white/5 pb-6">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              MI GARAJE
            </h1>
            <button 
              onClick={() => { setFormData(initialFormState); setFormMode('add'); }} 
              className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300"
            >
              <Plus size={16} strokeWidth={3} /> <span className="hidden md:inline">Añadir Activo</span>
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehiculos?.map((v) => {
              const healthRaw = Math.round(((v.millas_vida_util - v.millaje_actual) / (v.millas_vida_util || 1)) * 100);
              const health = healthRaw > 0 ? healthRaw : 0;

              return (
                <div 
                  key={v.id} 
                  onClick={() => setSelectedAsset(v)} 
                  className="group bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] hover:bg-white/5 transition-all duration-500 cursor-pointer hover:border-white/20 active:scale-[0.98] shadow-2xl flex flex-col min-h-[16rem] overflow-hidden relative"
                >
                  {/* Imagen con Zoom Hover */}
                  <div className="w-full h-40 relative overflow-hidden">
                      <img 
                        src={v.imagen_url || DEFAULT_CAR_IMAGE} 
                        alt={v.modelo} 
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/40 to-transparent"></div>
                  </div>

                  {/* Datos de la Tarjeta */}
                  <div className="p-6 pt-0 flex flex-col flex-1 relative z-10">
                    <div className="mb-6 -mt-6">
                      <h3 className="text-2xl font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        {v.marca} {v.modelo}
                      </h3>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1 font-mono">Año {v.año || '---'}</p>
                    </div>

                    <div className="space-y-4 mt-auto">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-white/40">Vida Útil</span>
                        <span className="text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{health}%</span>
                      </div>
                      <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-white transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: `${health}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA DE DETALLE: ACTIVO SELECCIONADO */}
      {selectedAsset && (
        <div className="animate-in slide-in-from-right-8 fade-in duration-500 w-full space-y-6">
          
          {/* Cabecera / Imagen */}
          <div className="relative w-full h-64 md:h-80 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shrink-0">
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
              <button 
                onClick={() => setSelectedAsset(null)}
                className="flex items-center text-[10px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black active:scale-90 transition-all duration-300"
              >
                <ArrowLeft size={14} className="mr-2"/> Regresar
              </button>
              
              <button 
                onClick={openEditModal} 
                className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black active:scale-90 rounded-full transition-all duration-300 text-white"
              >
                <Edit2 size={16} />
              </button>
            </div>

            <img 
              src={selectedAsset.imagen_url || DEFAULT_CAR_IMAGE} 
              alt={selectedAsset.modelo} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent"></div>
            
            {/* Título flotando sobre la imagen */}
            <div className="absolute bottom-6 left-6 md:left-10 z-20">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                {selectedAsset.marca} <span className="text-white/60">{selectedAsset.modelo}</span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-xs text-white/60 font-bold uppercase tracking-widest font-mono shadow-black drop-shadow-md">Año {selectedAsset.año}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Activo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* MANTENIMIENTO PREVENTIVO */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 md:p-8 hover:bg-white/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 bg-white/5 rounded-xl"><Wrench size={16} className="text-white"/></div>
                <h3 className="text-[11px] text-white/60 uppercase font-black tracking-widest">Mantenimiento Preventivo</h3>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">Aceite de Motor</span>
                    <span className="text-[10px] font-mono text-white/40">
                      {selectedAsset.ultimo_cambio_aceite_motor ? `${(selectedAsset.millaje_actual - selectedAsset.ultimo_cambio_aceite_motor).toLocaleString()} / ${(selectedAsset.intervalo_aceite_motor || 5000).toLocaleString()} mi` : 'No configurado'}
                    </span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000) >= 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000) >= 70 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'}`}
                      style={{ width: `${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000)}%` }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">Aceite de Transmisión</span>
                    <span className="text-[10px] font-mono text-white/40">
                      {selectedAsset.ultimo_cambio_aceite_caja ? `${(selectedAsset.millaje_actual - selectedAsset.ultimo_cambio_aceite_caja).toLocaleString()} / ${(selectedAsset.intervalo_aceite_caja || 30000).toLocaleString()} mi` : 'No configurado'}
                    </span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000) >= 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000) >= 70 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`}
                      style={{ width: `${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* DOCUMENTACIÓN */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 md:p-8 hover:bg-white/[0.02] transition-colors duration-500">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 bg-white/5 rounded-xl"><FileText size={16} className="text-white"/></div>
                <h3 className="text-[11px] text-white/60 uppercase font-black tracking-widest">Documentación Legal</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white">Tarjeta de Circulación</span>
                    <span className="text-xs font-mono text-white/40 mt-1">{selectedAsset.vencimiento_tarjeta_circulacion ? 'Vigente' : 'No configurado'}</span>
                  </div>
                  {selectedAsset.vencimiento_tarjeta_circulacion && (
                    <span className="text-xs font-mono text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                      {selectedAsset.vencimiento_tarjeta_circulacion}
                    </span>
                  )}
                </div>

                <div className={`flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 ${!selectedAsset.vencimiento_seguro ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white">Póliza de Seguro</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">
                      {selectedAsset.vencimiento_seguro ? 'Vigente' : 'Sin Seguro'}
                    </span>
                  </div>
                  {selectedAsset.vencimiento_seguro && (
                    <span className="text-xs font-mono text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                      {selectedAsset.vencimiento_seguro}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FINANZAS Y PATRIMONIO */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 md:p-8 hover:bg-white/[0.02] transition-colors duration-500">
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Patrimonio del Activo</p>
              <p className="text-4xl md:text-5xl font-mono font-medium text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                ${((selectedAsset.precio_compra || 0) - ((selectedAsset.millaje_actual || 0) * (((selectedAsset.precio_compra || 0) - (selectedAsset.valor_de_venta || 0)) / (selectedAsset.millas_vida_util || 1)))).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
              </p>
              <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Odómetro General</span>
                <span className="text-sm font-mono text-white/80">{selectedAsset.millaje_actual?.toLocaleString()} <span className="text-[10px] text-white/30 ml-1">MI</span></span>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 md:p-8 hover:bg-white/[0.02] transition-colors duration-500 relative overflow-hidden group">
              {/* Glow sutil en el fondo de esta tarjeta */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-all duration-700" />
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Reserva Mensual (Mtto)</p>
              <p className="text-4xl md:text-5xl font-mono font-medium text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                ${(selectedAsset.meta_mantenimiento || 0).toLocaleString()}
              </p>
              <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-center relative z-10">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest italic">Ahorro Diario Sugerido</span>
                <span className="text-sm font-mono text-white/80">${((selectedAsset.meta_mantenimiento || 0) / 30).toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN/CREACIÓN */}
      {formMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 overflow-y-auto py-10 animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-[#050505] border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-500 my-auto">
            <button 
              onClick={() => setFormMode(null)} 
              className="absolute top-6 right-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all active:scale-90"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-2">
              {formMode === 'edit' ? 'Actualizar Activo' : 'Nuevo Vehículo'}
            </h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-8">
              Configuración técnica e inteligencia financiera
            </p>

            <form onSubmit={handleSaveVehicle} className="space-y-6">
              
              {/* Sección de Imagen */}
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-white/60" />
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black">Estética Personalizada</h4>
                </div>
                <Input label="URL de Imagen del Vehículo" placeholder="Pega el enlace de la foto aquí..." value={formData.imagen_url} onChange={e => setFormData({...formData, imagen_url: e.target.value})} />
              </div>

              {/* Identidad */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Car size={14} className="text-white/40" />
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black">Identidad y Finanzas</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Marca" placeholder="Ej. Nissan" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} required />
                  <Input label="Modelo" placeholder="Ej. Sentra" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} required />
                  <Input label="Año" type="number" value={formData.año} onChange={e => setFormData({...formData, año: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Precio Compra ($)" type="number" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} required />
                  <Input label="Rescate Venta ($)" type="number" value={formData.valor_venta} onChange={e => setFormData({...formData, valor_venta: e.target.value})} required />
                </div>
              </div>

              {/* Mecánica */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Settings2 size={14} className="text-white/40" />
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black">Mecánica y Operación</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Odómetro (Millas)" type="number" value={formData.millaje_actual} onChange={e => setFormData({...formData, millaje_actual: e.target.value})} required />
                  <Input label="Vida Útil (Millas)" type="number" value={formData.millas_vida_util} onChange={e => setFormData({...formData, millas_vida_util: e.target.value})} required />
                  <Input label="Reserva Mensual ($)" type="number" value={formData.meta_mantenimiento} onChange={e => setFormData({...formData, meta_mantenimiento: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/40 p-5 rounded-3xl border border-white/5 mt-2">
                  <Input label="Últ. Aceite Motor" type="number" value={formData.ultimo_cambio_aceite_motor} onChange={e => setFormData({...formData, ultimo_cambio_aceite_motor: e.target.value})} />
                  <Input label="Int. Motor" type="number" value={formData.intervalo_aceite_motor} onChange={e => setFormData({...formData, intervalo_aceite_motor: e.target.value})} />
                  <Input label="Últ. Aceite Caja" type="number" value={formData.ultimo_cambio_aceite_caja} onChange={e => setFormData({...formData, ultimo_cambio_aceite_caja: e.target.value})} />
                  <Input label="Int. Caja" type="number" value={formData.intervalo_aceite_caja} onChange={e => setFormData({...formData, intervalo_aceite_caja: e.target.value})} />
                </div>
              </div>

              {/* Documentación */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Shield size={14} className="text-white/40" />
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black">Documentación Legal</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Tarjeta Circulación" type="date" value={formData.vencimiento_tarjeta_circulacion} onChange={e => setFormData({...formData, vencimiento_tarjeta_circulacion: e.target.value})} style={{ colorScheme: 'dark' }} />
                  <Input label="Seguro" type="date" value={formData.vencimiento_seguro} onChange={e => setFormData({...formData, vencimiento_seguro: e.target.value})} style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Controles del Formulario */}
              <div className="pt-8 flex justify-between gap-4">
                {formMode === 'edit' && (
                  <button 
                    type="button" 
                    onClick={() => setIsDeleting(true)} 
                    className="px-6 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[11px] rounded-2xl border border-red-500/20 transition-all active:scale-95"
                  >
                    Eliminar
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-4 bg-white text-black hover:bg-neutral-200 font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Guardar y Sincronizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {isDeleting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="p-8 bg-[#050505] border border-red-500/30 rounded-[2.5rem] space-y-6 w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={24} />
              <span className="text-[11px] font-black tracking-widest uppercase">Destrucción de Datos</span>
            </div>
            <p className="text-sm text-white/60 font-sans">¿Estás seguro de eliminar este activo permanentemente de la base de datos?</p>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleDeleteVehicle} 
                disabled={isSubmitting} 
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95"
              >
                Confirmar
              </button>
              <button 
                onClick={() => setIsDeleting(false)} 
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponente de Input perfeccionado
const Input = ({ label, type = "text", value, ...props }) => {
  // Verificamos si es un input de número para aplicarle la fuente 'mono'
  const isNumber = type === 'number' || label.includes('($)') || label.includes('(Millas)');
  
  return (
    <div className="space-y-2">
      <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        value={value ?? ''} 
        className={`w-full bg-white/5 border border-white/5 text-white text-sm p-4 rounded-2xl focus:border-white/30 focus:bg-white/10 outline-none transition-all duration-300 shadow-inner ${isNumber ? 'font-mono' : 'font-sans'}`} 
        {...props} 
      />
    </div>
  );
};