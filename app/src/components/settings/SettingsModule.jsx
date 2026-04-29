import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { triggerHaptic } from '../../utils/haptics';
import { 
  User, Shield, Camera, Save, CheckCircle2, EyeOff, 
  UserCircle, Calendar, Briefcase, Image as ImageIcon, Lock
} from 'lucide-react';

export const SettingsModule = () => {
  const { data: profileData, loading, refetch } = useSupabaseQuery('nexus_profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', profesion: '', 
    avatar_url: '', fecha_nacimiento: '', modo_privacidad: false
  });

  useEffect(() => {
    if (profileData?.length > 0) {
      const p = profileData[0];
      setFormData({
        nombre: p.nombre || '',
        apellido: p.apellido || '',
        profesion: p.profesion || '',
        avatar_url: p.avatar_url || '',
        fecha_nacimiento: p.fecha_nacimiento || '',
        modo_privacidad: p.modo_privacidad || false
      });
    }
  }, [profileData]);

  const handleSave = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSubmitting(true);
    
    try {
      if (!profileData || profileData.length === 0) {
        const { error } = await supabase
          .from('nexus_profile')
          .insert([{ ...formData, updated_at: new Date().toISOString() }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('nexus_profile')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', profileData[0].id);
        if (error) throw error;
      }

      setShowSuccess(true);
      triggerHaptic('light');
      setTimeout(() => setShowSuccess(false), 3000);
      refetch();
    } catch (err) {
      triggerHaptic('heavy');
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivacy = () => {
    triggerHaptic('light');
    setFormData({...formData, modo_privacidad: !formData.modo_privacidad});
  };

  // Pantalla de carga con animación de entrada sincronizada
  if (loading) return (
    <div className="w-full h-[80vh] flex items-center justify-center animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">
        Accediendo_al_Núcleo...
      </div>
    </div>
  );

  return (
    <div className="w-full text-white font-sans relative pb-32 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-4xl mx-auto">
        
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase">Ajustes</h1>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em] mt-2">Identidad Global</p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <User size={20} className="text-white/60" />
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* SECCIÓN: PERFIL */}
          <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[60px] -mr-32 -mt-32 transition-all duration-700 group-hover:bg-white/10" />
            
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4 relative z-10">
              <div className="p-2 bg-white/5 rounded-xl text-white/60 shadow-inner">
                <UserCircle size={18} />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Operador Nexus</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              {/* AVATAR */}
              <div className="relative mx-auto md:mx-0 shrink-0">
                <div className="w-36 h-36 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/50">
                  <img 
                    src={formData.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400'} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" 
                    alt="Perfil"
                  />
                </div>
                <div className="absolute -bottom-3 -right-3 p-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl shadow-xl transition-transform group-hover:scale-110">
                  <Camera size={18} />
                </div>
              </div>

              {/* INPUTS GRID */}
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nombre" 
                  placeholder="Tu nombre"
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                />
                <Input 
                  label="Apellido" 
                  placeholder="Tu apellido"
                  value={formData.apellido} 
                  onChange={e => setFormData({...formData, apellido: e.target.value})} 
                />
                <Input 
                  label="Profesión" 
                  placeholder="CEO / Operador"
                  value={formData.profesion} 
                  onChange={e => setFormData({...formData, profesion: e.target.value})} 
                />
                <Input 
                  label="Nacimiento" 
                  type="date"
                  value={formData.fecha_nacimiento} 
                  onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} 
                  style={{ colorScheme: 'dark' }}
                />
                <div className="md:col-span-2">
                  <Input 
                    label="URL de Fotografía" 
                    placeholder="Enlace directo a imagen..."
                    value={formData.avatar_url} 
                    onChange={e => setFormData({...formData, avatar_url: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: PRIVACIDAD */}
          <div className="bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5 rounded-4xl p-6 md:p-10 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 shadow-inner">
                <Lock size={18} />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60">Seguridad Visual</h2>
            </div>

            <div 
              onClick={togglePrivacy}
              className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl transition-all duration-500 ${formData.modo_privacidad ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-white/40'}`}>
                  <EyeOff size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-tight">Modo Privacidad</h3>
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-tighter mt-1">Ocultar cifras sensibles</p>
                </div>
              </div>
              
              <div className={`w-12 h-7 rounded-full transition-colors duration-500 relative border border-white/10 ${formData.modo_privacidad ? 'bg-cyan-500' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-4.5 h-4.5 rounded-full bg-white transition-all duration-500 shadow-md ${formData.modo_privacidad ? 'left-6.5' : 'left-1'}`} />
              </div>
            </div>
          </div>

          {/* BOTÓN DE ACCIÓN */}
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="group flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] w-full md:w-auto hover:bg-neutral-200 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
            >
              {isSubmitting ? 'Sincronizando...' : <><Save size={18} /> Guardar Perfil</>}
            </button>
          </div>
        </form>

        {/* NOTIFICACIÓN ÉXITO */}
        {showSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-3xl text-black px-6 py-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 shadow-2xl z-200">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Identidad Actualizada</span>
          </div>
        )}

      </div>
    </div>
  );
};

const Input = ({ label, type = "text", value, ...props }) => {
  const isDate = type === 'date';
  return (
    <div className="space-y-2 w-full">
      <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        value={value ?? ''} 
        className={`w-full bg-white/5 border border-white/5 text-white text-sm p-4 rounded-2xl focus:border-white/30 outline-none transition-all duration-300 shadow-inner placeholder:text-white/20 ${isDate ? 'font-mono' : 'font-sans'}`} 
        {...props} 
      />
    </div>
  );
};