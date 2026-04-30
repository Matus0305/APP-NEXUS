import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { triggerHaptic } from '../../utils/haptics';
import { 
  User, Shield, Camera, Save, CheckCircle2, EyeOff, 
  UserCircle, Lock, Bell, Tags, ListChecks, Plus, Trash2, TrendingUp, TrendingDown, Box, Target, DollarSign, Clock
} from 'lucide-react';

export const SettingsModule = () => {
  const { data: profileData, loading: loadP, refetch: refetchProfile } = useSupabaseQuery('nexus_profile');
  const { data: categories, loading: loadC, refetch: refetchCats } = useSupabaseQuery('nexus_categories');
  const { data: checklist, loading: loadCh, refetch: refetchChecks } = useSupabaseQuery('nexus_checklist');

  const [activeTab, setActiveTab] = useState('Identidad');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', profesion: '', 
    avatar_url: '', fecha_nacimiento: '', modo_privacidad: false, alertas_activadas: true,
    meta_ingreso_mensual: '', salario_hora_deseado: ''
  });
  
  const [catForm, setCatForm] = useState({ nombre: '', tipo: 'Egreso', presupuesto_mensual: '', modulo: 'General' });
  const [checkForm, setCheckForm] = useState({ tarea: '' });

  useEffect(() => {
    if (profileData?.length > 0) {
      const p = profileData[0];
      setFormData({
        nombre: p.nombre || '', apellido: p.apellido || '', profesion: p.profesion || '',
        avatar_url: p.avatar_url || '', fecha_nacimiento: p.fecha_nacimiento || '',
        modo_privacidad: p.modo_privacidad || false, alertas_activadas: p.alertas_activadas ?? true,
        meta_ingreso_mensual: p.meta_ingreso_mensual || '',
        salario_hora_deseado: p.salario_hora_deseado || ''
      });
    }
  }, [profileData]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const payload = {
          ...formData, 
          meta_ingreso_mensual: parseFloat(formData.meta_ingreso_mensual) || 0,
          salario_hora_deseado: parseFloat(formData.salario_hora_deseado) || 0,
          updated_at: new Date().toISOString() 
      };

      if (!profileData || profileData.length === 0) {
        await supabase.from('nexus_profile').insert([payload]);
      } else {
        await supabase.from('nexus_profile').update(payload).eq('id', profileData[0].id);
      }
      triggerSuccess(); refetchProfile();
    } catch (err) { alert("Error: " + err.message); } finally { setIsSubmitting(false); }
  };

  const togglePrivacy = () => { triggerHaptic('light'); setFormData(prev => ({...prev, modo_privacidad: !prev.modo_privacidad})); };
  const toggleAlerts = () => { triggerHaptic('light'); setFormData(prev => ({...prev, alertas_activadas: !prev.alertas_activadas})); };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    triggerHaptic('medium'); setIsSubmitting(true);
    try {
      await supabase.from('nexus_categories').insert([{
        nombre: catForm.nombre, tipo: catForm.tipo, modulo: catForm.modulo,
        presupuesto_mensual: parseFloat(catForm.presupuesto_mensual) || 0
      }]);
      setCatForm({ nombre: '', tipo: 'Egreso', presupuesto_mensual: '', modulo: 'General' });
      triggerSuccess(); refetchCats();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteCategory = async (id) => {
    triggerHaptic('heavy');
    if(!window.confirm('¿Borrar categoría?')) return;
    await supabase.from('nexus_categories').delete().eq('id', id);
    refetchCats();
  };

  const handleSaveChecklist = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      await supabase.from('nexus_checklist').insert([{ tarea: checkForm.tarea }]);
      setCheckForm({ tarea: '' }); triggerSuccess(); refetchChecks();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteChecklist = async (id) => {
    triggerHaptic('heavy'); await supabase.from('nexus_checklist').delete().eq('id', id); refetchChecks();
  };

  const triggerSuccess = () => {
    setShowSuccess(true); triggerHaptic('light'); setTimeout(() => setShowSuccess(false), 3000);
  };

  if (loadP || loadC || loadCh) return (
    <div className="w-full h-[80vh] flex items-center justify-center animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Accediendo_al_Núcleo...</div>
    </div>
  );

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-4xl mx-auto">
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase">Ajustes</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em] mt-2">Centro de Control</p>
          </div>
        </header>

        <div className="flex gap-2 p-1.5 bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-2xl w-full overflow-x-auto hide-scrollbar">
            {['Identidad', 'Finanzas', 'Operaciones'].map(tab => (
              <button key={tab} onClick={() => { triggerHaptic('light'); setActiveTab(tab); }} className={`flex-1 min-w-25 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>{tab}</button>
            ))}
        </div>

        {activeTab === 'Identidad' && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <form id="profileForm" onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 relative overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4 relative z-10">
                            <div className="p-2 bg-white/5 rounded-xl text-white/60"><UserCircle size={18} /></div>
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Operador Nexus</h2>
                        </div>
                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                            <div className="relative mx-auto md:mx-0 shrink-0">
                                <div className="w-36 h-36 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/50">
                                <img src={formData.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400'} className="w-full h-full object-cover opacity-80" alt="Perfil" />
                                </div>
                            </div>
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                <Input label="Apellido" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
                                <Input label="Profesión" value={formData.profesion} onChange={e => setFormData({...formData, profesion: e.target.value})} />
                                <Input label="Nacimiento" type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} style={{ colorScheme: 'dark' }} />
                                <div className="md:col-span-2">
                                <Input label="URL de Fotografía" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400"><Lock size={18} /></div>
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Sistema</h2>
                        </div>

                        <div onClick={togglePrivacy} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-all ${formData.modo_privacidad ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-white/40'}`}>
                                <EyeOff size={20} />
                                </div>
                                <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white tracking-tight">Modo Privacidad</h3>
                                <p className="text-[9px] text-white/40 uppercase font-black mt-1">Ocultar cifras sensibles</p>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full transition-colors relative border border-white/10 ${formData.modo_privacidad ? 'bg-cyan-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4.5 h-4.5 rounded-full bg-white transition-all shadow-md ${formData.modo_privacidad ? 'left-6.5' : 'left-1'}`} />
                            </div>
                        </div>

                        <div onClick={toggleAlerts} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-all ${formData.alertas_activadas ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/40'}`}>
                                <Bell size={20} />
                                </div>
                                <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white tracking-tight">Centro de Alertas</h3>
                                <p className="text-[9px] text-white/40 uppercase font-black mt-1">Avisos de presupuesto (Próximamente)</p>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full transition-colors relative border border-white/10 ${formData.alertas_activadas ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4.5 h-4.5 rounded-full bg-white transition-all shadow-md ${formData.alertas_activadas ? 'left-6.5' : 'left-1'}`} />
                            </div>
                        </div>
                    </div>
                </form>
                
                <div className="flex justify-end pt-4">
                    <button onClick={handleSaveProfile} disabled={isSubmitting} className="group flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] w-full hover:bg-neutral-200 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.15)]">
                        {isSubmitting ? 'Procesando...' : <><Save size={18} /> Guardar Ajustes</>}
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'Finanzas' && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 shadow-2xl relative mb-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><Target size={18} /></div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Metas y Expectativas</h2>
                    </div>
                    <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                         <div className="space-y-1.5 w-full">
                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1 flex items-center gap-2"><DollarSign size={10}/> Meta Ingreso Mensual ($)</label>
                            <input type="number" step="0.01" value={formData.meta_ingreso_mensual} onChange={e => setFormData({...formData, meta_ingreso_mensual: e.target.value})} className="w-full bg-black/40 border border-white/5 text-emerald-400 text-2xl font-mono font-black p-4 rounded-2xl focus:border-emerald-500/30 outline-none transition-all placeholder:text-white/10" placeholder="1500.00" />
                        </div>
                         <div className="space-y-1.5 w-full">
                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1 flex items-center gap-2"><Clock size={10}/> Valor Hora Esperado ($)</label>
                            <input type="number" step="0.01" value={formData.salario_hora_deseado} onChange={e => setFormData({...formData, salario_hora_deseado: e.target.value})} className="w-full bg-black/40 border border-white/5 text-cyan-400 text-2xl font-mono font-black p-4 rounded-2xl focus:border-cyan-500/30 outline-none transition-all placeholder:text-white/10" placeholder="10.00" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full md:col-span-2 py-5 bg-white/5 hover:bg-white border border-white/10 hover:text-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl active:scale-95 transition-all">
                           {isSubmitting ? 'Guardando...' : 'Fijar Objetivos'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 shadow-2xl relative">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><Tags size={18} /></div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Estructura de Flujo</h2>
                    </div>

                    <form onSubmit={handleSaveCategory} className="bg-white/5 p-5 rounded-3xl border border-white/5 mb-8">
                        <p className="text-[10px] text-white/40 font-black tracking-[0.2em] uppercase mb-4">Nueva Categoría</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <Input label="Nombre (Ej. Lavado)" value={catForm.nombre} onChange={e => setCatForm({...catForm, nombre: e.target.value})} required />
                            
                            <div className="space-y-1.5 w-full">
                                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Ámbito</label>
                                <select value={catForm.modulo} onChange={e => setCatForm({...catForm, modulo: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-sm font-bold p-4 rounded-2xl outline-none appearance-none">
                                    <option className="bg-black" value="General">Billetera / Jornada</option>
                                    <option className="bg-black" value="Logistica">Logística / Envíos</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 w-full">
                                <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Tipo</label>
                                <select value={catForm.tipo} onChange={e => setCatForm({...catForm, tipo: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-sm font-bold p-4 rounded-2xl outline-none appearance-none">
                                    <option className="bg-black" value="Egreso">Gasto (Egreso)</option>
                                    <option className="bg-black" value="Ingreso">Entrada (Ingreso)</option>
                                </select>
                            </div>

                            {catForm.tipo === 'Egreso' && catForm.modulo === 'General' ? (
                                <Input label="Presupuesto Mensual ($)" type="number" step="0.01" value={catForm.presupuesto_mensual} onChange={e => setCatForm({...catForm, presupuesto_mensual: e.target.value})} placeholder="0.00" />
                            ) : (
                                <button type="submit" disabled={isSubmitting} className={`w-full h-13 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 ${catForm.tipo === 'Egreso' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>
                                    <Plus size={16} /> Agregar
                                </button>
                            )}
                        </div>
                        {catForm.tipo === 'Egreso' && catForm.modulo === 'General' && (
                             <button type="submit" disabled={isSubmitting} className="w-full mt-4 h-13 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 bg-red-500 text-white">
                                 <Plus size={16} /> Agregar
                             </button>
                        )}
                    </form>

                    <div className="space-y-4">
                        <p className="text-[10px] text-white/40 font-black tracking-[0.2em] uppercase border-b border-white/5 pb-2">Diccionario Activo</p>
                        {categories?.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${cat.modulo === 'Logistica' ? 'bg-cyan-500/20 text-cyan-400' : (cat.tipo === 'Ingreso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}`}>
                                        {cat.modulo === 'Logistica' ? <Box size={16}/> : (cat.tipo === 'Ingreso' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white tracking-tight">{cat.nombre}</p>
                                        <div className="flex gap-2 mt-1">
                                           <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded text-white/50 uppercase font-black tracking-widest">{cat.modulo}</span>
                                           <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">{cat.tipo}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {cat.tipo === 'Egreso' && Number(cat.presupuesto_mensual) > 0 && (
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mb-0.5">Límite</p>
                                            <p className="font-mono text-white/80 font-bold">${Number(cat.presupuesto_mensual).toFixed(2)}</p>
                                        </div>
                                    )}
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-white/20 hover:text-red-500 transition-colors p-2 active:scale-90"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'Operaciones' && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 shadow-2xl relative">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                        <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500"><ListChecks size={18} /></div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Protocolos de Flota</h2>
                    </div>

                    <form onSubmit={handleSaveChecklist} className="flex gap-2 mb-8">
                        <Input placeholder="Ej. Verificar agua del limpiaparabrisas..." value={checkForm.tarea} onChange={e => setCheckForm({tarea: e.target.value})} required />
                        <button type="submit" disabled={isSubmitting} className="bg-white text-black px-6 rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all shadow-lg flex items-center justify-center">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="space-y-3">
                        <p className="text-[10px] text-white/40 font-black tracking-[0.2em] uppercase border-b border-white/5 pb-2">Checklist Obligatorio</p>
                        {checklist?.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                <p className="text-sm font-bold text-white tracking-tight">{item.tarea}</p>
                                <button onClick={() => handleDeleteChecklist(item.id)} className="text-white/20 hover:text-red-500 transition-colors p-2 active:scale-90"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {showSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-3xl text-black px-6 py-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 shadow-2xl z-200">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Base de Datos Actualizada</span>
          </div>
        )}

      </div>
    </div>
  );
};

const Input = ({ label, type = "text", value, ...props }) => {
  const isDate = type === 'date';
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>}
      <input 
        type={type} 
        value={value ?? ''} 
        className={`w-full bg-white/5 border border-white/5 text-white text-sm p-4 rounded-2xl focus:border-white/30 outline-none transition-all shadow-inner placeholder:text-white/20 ${isDate ? 'font-mono' : 'font-sans'}`} 
        {...props} 
      />
    </div>
  );
};