import React, { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { usePrivacy } from '../../hooks/usePrivacy'; // Manto de Privacidad
import { triggerHaptic } from '../../utils/haptics';
import {
  TrendingDown, Shield, X, Gauge, Plus, Edit2, Trash2, AlertTriangle, 
  Car, Target, ArrowLeft, Wrench, FileText, Settings2, Image as ImageIcon
} from 'lucide-react';

export const FleetManagement = () => {
  const { data: vehiculos, loading, refetch } = useSupabaseQuery('vehiculos');
  const { isPrivacyActive } = usePrivacy();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    marca: '', modelo: '', año: '', precio_compra: '',
    valor_venta: '', millas_vida_util: '', millaje_actual: '',
    meta_mantenimiento: '150',
    ultimo_cambio_aceite_motor: '', intervalo_aceite_motor: '5000',
    ultimo_cambio_aceite_caja: '', intervalo_aceite_caja: '30000',
    vencimiento_seguro: '', vencimiento_tarjeta_circulacion: '',
    imagen_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const DEFAULT_CAR_IMAGE = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80';

  const renderFinancial = (value, isCurrency = true) => {
    if (isPrivacyActive) return '••••';
    if (!value && value !== 0) return isCurrency ? '$0' : '0';
    return isCurrency 
      ? `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : parseInt(value).toLocaleString();
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    triggerHaptic('medium');

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

    try {
      let error;
      if (formMode === 'add') {
        const res = await supabase.from('vehiculos').insert([payload]);
        error = res.error;
      } else {
        const res = await supabase.from('vehiculos').update(payload).eq('id', selectedAsset.id);
        error = res.error;
      }

      if (!error) {
        setFormMode(null);
        setFormData(initialFormState);
        refetch();
        if (formMode === 'edit') setSelectedAsset({ ...selectedAsset, ...payload });
      } else {
        alert(`Error al guardar: ${error.message}`);
      }
    } catch (err) {
      alert(`Error crítico: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('vehiculos').delete().eq('id', selectedAsset.id);
    setIsSubmitting(false);
    if (!error) {
      setIsDeleting(false);
      setFormMode(null); // Aseguramos salir del formMode si estábamos ahí
      setSelectedAsset(null);
      refetch();
    }
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
    if (!lastChange && lastChange !== 0) return 0;
    const milesSinceChange = current - lastChange;
    const progress = (milesSinceChange / interval) * 100;
    return progress > 100 ? 100 : Math.max(0, progress);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">
        Sincronizando_Nexus...
      </div>
    </div>
  );

  return (
    <div className="w-full text-white font-sans relative pb-32">
      
      {/* VISTA 1: LISTADO PRINCIPAL */}
      {!formMode && !selectedAsset && (
        <div className="space-y-8 animate-in fade-in zoom-in-[0.98] duration-500 ease-out">
          <header className="flex justify-between items-end border-b border-white/5 pb-6">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              MI GARAJE
            </h1>
            <button
              onClick={() => { setFormData(initialFormState); setFormMode('add'); triggerHaptic('light'); }}
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
                  onClick={() => { setSelectedAsset(v); triggerHaptic('light'); }}
                  className="group bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 rounded-4xl hover:bg-white/5 transition-all duration-500 cursor-pointer hover:border-white/20 active:scale-[0.98] shadow-2xl flex flex-col min-h-64 overflow-hidden relative"
                >
                  <div className="w-full h-40 relative overflow-hidden">
                    <img src={v.imagen_url || DEFAULT_CAR_IMAGE} alt={v.modelo} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700 ease-out" />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/40 to-transparent"></div>
                  </div>
                  <div className="p-6 pt-0 flex flex-col flex-1 relative z-10">
                    <div className="mb-6 -mt-6">
                      <h3 className="text-2xl font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{v.marca} {v.modelo}</h3>
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

      {/* VISTA 2: DETALLE DEL VEHÍCULO */}
      {!formMode && selectedAsset && (
        <div className="animate-in slide-in-from-right-8 fade-in duration-500 w-full space-y-6">
          <div className="relative w-full h-64 md:h-80 rounded-4xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
              <button onClick={() => setSelectedAsset(null)} className="flex items-center text-[10px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black active:scale-90 transition-all duration-300">
                <ArrowLeft size={14} className="mr-2"/> Regresar
              </button>
              <button onClick={openEditModal} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black active:scale-90 rounded-full transition-all duration-300 text-white">
                <Edit2 size={16} />
              </button>
            </div>
            <img src={selectedAsset.imagen_url || DEFAULT_CAR_IMAGE} alt={selectedAsset.modelo} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 md:left-10 z-20">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                {selectedAsset.marca} <span className="text-white/60">{selectedAsset.modelo}</span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-xs text-white/60 font-bold uppercase tracking-widest font-mono">Año {selectedAsset.año}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Activo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Mantenimiento */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 md:p-8 hover:bg-white/2 transition-colors duration-500">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 bg-white/5 rounded-xl"><Wrench size={16} className="text-white"/></div>
                <h3 className="text-[11px] text-white/60 uppercase font-black tracking-widest">Mantenimiento Preventivo</h3>
              </div>
              <div className="space-y-8">
                {/* Aceite Motor */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">Aceite de Motor</span>
                    <span className="text-[10px] font-mono text-white/40">
                      {selectedAsset.ultimo_cambio_aceite_motor ? `${(selectedAsset.millaje_actual - selectedAsset.ultimo_cambio_aceite_motor).toLocaleString()} / ${(selectedAsset.intervalo_aceite_motor || 5000).toLocaleString()} mi` : 'No configurado'}
                    </span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000) >= 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 
                        getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000) >= 70 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                      }`}
                      style={{ width: `${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_motor, selectedAsset.intervalo_aceite_motor || 5000)}%` }}
                    />
                  </div>
                </div>
                {/* Aceite Caja */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">Aceite de Transmisión</span>
                    <span className="text-[10px] font-mono text-white/40">
                      {selectedAsset.ultimo_cambio_aceite_caja ? `${(selectedAsset.millaje_actual - selectedAsset.ultimo_cambio_aceite_caja).toLocaleString()} / ${(selectedAsset.intervalo_aceite_caja || 30000).toLocaleString()} mi` : 'No configurado'}
                    </span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000) >= 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 
                        getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000) >= 70 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                      }`}
                      style={{ width: `${getMaintenanceProgress(selectedAsset.millaje_actual, selectedAsset.ultimo_cambio_aceite_caja, selectedAsset.intervalo_aceite_caja || 30000)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Documentación */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 md:p-8 hover:bg-white/2 transition-colors duration-500">
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
                    <span className="text-xs font-mono text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">{selectedAsset.vencimiento_tarjeta_circulacion}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 ${!selectedAsset.vencimiento_seguro ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white">Póliza de Seguro</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">{selectedAsset.vencimiento_seguro ? 'Vigente' : 'Sin Seguro'}</span>
                  </div>
                  {selectedAsset.vencimiento_seguro && (
                    <span className="text-xs font-mono text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">{selectedAsset.vencimiento_seguro}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Patrimonio e Inteligencia */}
            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 md:p-8 hover:bg-white/2 transition-colors duration-500">
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Patrimonio del Activo</p>
              <p className="text-4xl md:text-5xl font-mono font-medium text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                {renderFinancial(
                  (selectedAsset.precio_compra || 0) - ((selectedAsset.millaje_actual || 0) * (((selectedAsset.precio_compra || 0) - (selectedAsset.valor_de_venta || 0)) / (selectedAsset.millas_vida_util || 1)))
                )}
              </p>
              <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Odómetro General</span>
                <span className="text-sm font-mono text-white/80">{renderFinancial(selectedAsset.millaje_actual, false)} <span className="text-[10px] text-white/30 ml-1">MI</span></span>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 md:p-8 hover:bg-white/2 transition-colors duration-500 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-all duration-700" />
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Reserva Mensual (Mtto)</p>
              <p className="text-4xl md:text-5xl font-mono font-medium text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                {renderFinancial(selectedAsset.meta_mantenimiento || 0)}
              </p>
              <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-center relative z-10">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest italic">Ahorro Diario Sugerido</span>
                <span className="text-sm font-mono text-white/80">
                  {isPrivacyActive ? '••••' : `$${((selectedAsset.meta_mantenimiento || 0) / 30).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: FORMULARIO PANTALLA COMPLETA (NUEVO ESTÁNDAR) */}
      {formMode && (
        <div className="animate-in slide-in-from-right-8 fade-in duration-500 w-full space-y-6">
          <header className="flex items-center gap-4 border-b border-white/5 pb-6">
            <button 
              onClick={() => setFormMode(null)} 
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">
                {formMode === 'edit' ? 'Editar Activo' : 'Nuevo Vehículo'}
              </h2>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Ingeniería de Flota Nexus</p>
            </div>
          </header>

          <form onSubmit={handleSaveVehicle} className="space-y-8 max-w-4xl pb-10">
            
            <div className="bg-[#0A0A0A]/40 backdrop-blur-2xl p-6 md:p-8 rounded-4xl border border-white/5 space-y-6">
              {/* Estética */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/60">
                  <ImageIcon size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Identidad Visual</h4>
                </div>
                <Input label="URL de Imagen del Vehículo" placeholder="https://..." value={formData.imagen_url} onChange={e => setFormData({...formData, imagen_url: e.target.value})} />
              </div>

              {/* Datos Base */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/60">
                  <Car size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Especificaciones</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Input label="Marca" placeholder="Ej. Nissan" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} required />
                  <Input label="Modelo" placeholder="Ej. Sentra" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} required />
                  <Input label="Año" type="number" value={formData.año} onChange={e => setFormData({...formData, año: e.target.value})} required />
                </div>
              </div>

              {/* Finanzas */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/60">
                  <TrendingDown size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Valuación Financiera</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Precio Compra ($)" type="number" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} required />
                  <Input label="Valor Rescate Venta ($)" type="number" value={formData.valor_venta} onChange={e => setFormData({...formData, valor_venta: e.target.value})} required />
                </div>
              </div>

              {/* Operativa y Mtto */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/60">
                  <Settings2 size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Estado y Mantenimiento</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Input label="Odómetro (Millas)" type="number" value={formData.millaje_actual} onChange={e => setFormData({...formData, millaje_actual: e.target.value})} required />
                  <Input label="Vida Útil (Millas)" type="number" value={formData.millas_vida_util} onChange={e => setFormData({...formData, millas_vida_util: e.target.value})} required />
                  <Input label="Reserva Mensual ($)" type="number" value={formData.meta_mantenimiento} onChange={e => setFormData({...formData, meta_mantenimiento: e.target.value})} required />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/40 p-5 rounded-3xl mt-4 border border-white/5">
                  <Input label="Últ. Aceite Motor" type="number" value={formData.ultimo_cambio_aceite_motor} onChange={e => setFormData({...formData, ultimo_cambio_aceite_motor: e.target.value})} />
                  <Input label="Int. Motor" type="number" value={formData.intervalo_aceite_motor} onChange={e => setFormData({...formData, intervalo_aceite_motor: e.target.value})} />
                  <Input label="Últ. Aceite Caja" type="number" value={formData.ultimo_cambio_aceite_caja} onChange={e => setFormData({...formData, ultimo_cambio_aceite_caja: e.target.value})} />
                  <Input label="Int. Caja" type="number" value={formData.intervalo_aceite_caja} onChange={e => setFormData({...formData, intervalo_aceite_caja: e.target.value})} />
                </div>
              </div>

              {/* Legal */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/60">
                  <Shield size={14} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Documentación</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Tarjeta de Circulación" type="date" value={formData.vencimiento_tarjeta_circulacion} onChange={e => setFormData({...formData, vencimiento_tarjeta_circulacion: e.target.value})} style={{ colorScheme: 'dark' }} />
                  <Input label="Póliza de Seguro" type="date" value={formData.vencimiento_seguro} onChange={e => setFormData({...formData, vencimiento_seguro: e.target.value})} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-row gap-4 pt-6">
              {formMode === 'edit' && (
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic('heavy'); setIsDeleting(true); }}
                  className="px-6 py-5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[11px] border border-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> <span className="hidden md:inline">Eliminar</span>
                </button>
              )}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 py-5 bg-white text-black hover:bg-neutral-200 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(255,255,255,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando...' : 'Guardar y Sincronizar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN (Este SÍ debe quedar como pequeño Modal/Overlay) */}
      {isDeleting && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="p-8 bg-[#050505] border border-red-500/30 rounded-[2.5rem] space-y-6 w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/20">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">¿Destruir Activo?</h3>
            <p className="text-[11px] text-white/40 leading-relaxed font-bold tracking-widest uppercase">¿Estás seguro de eliminar este activo permanentemente de la base de datos?</p>
            <div className="flex gap-3 pt-4">
              <button onClick={handleDeleteVehicle} disabled={isSubmitting} className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(239,68,68,0.3)]">
                Confirmar
              </button>
              <button onClick={() => setIsDeleting(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/50 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 border border-white/5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, type = "text", value, ...props }) => {
  const isNumber = type === 'number' || label?.includes('($)') || label?.includes('(Millas)');
  return (
    <div className="space-y-2">
      <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        className={`w-full bg-white/5 border border-white/5 text-white text-sm p-4 rounded-2xl focus:border-white/30 focus:bg-white/10 outline-none transition-all duration-300 shadow-inner ${isNumber ? 'font-mono' : 'font-sans'}`}
        {...props}
      />
    </div>
  );
};