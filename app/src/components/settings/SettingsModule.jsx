import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { 
  User, Shield, Camera, Save, CheckCircle2, EyeOff, 
  UserCircle, Calendar, Briefcase, Image as ImageIcon, Lock
} from 'lucide-react';

export const SettingsModule = () => {
  const { data: profileData, loading, refetch } = useSupabaseQuery('nexus_profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    profesion: '',
    avatar_url: '',
    fecha_nacimiento: '',
    modo_privacidad: false
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
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('nexus_profile')
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          profesion: formData.profesion,
          avatar_url: formData.avatar_url,
          fecha_nacimiento: formData.fecha_nacimiento,
          modo_privacidad: formData.modo_privacidad,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileData[0].id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refetch();
    } catch (err) {
      alert("Error al sincronizar con Nexus: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 font-mono text-[10px] text-white/40 uppercase tracking-[0.3em]">Accediendo_al_Núcleo...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
      
      <header className="border-b border-white/5 pb-10">
        <h1 className="text-5xl font-bold tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">Ajustes</h1>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Configuración Global de Identidad</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECCIÓN: PERFIL DEL OPERADOR */}
        <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 space-y-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32" />
          
          <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
            <div className="p-3 bg-white/5 rounded-2xl text-white/40">
              <UserCircle size={20} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Identidad del Propietario</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-12 items-start relative z-10">
            {/* AVATAR DINÁMICO */}
            <div className="relative group mx-auto md:mx-0">
              <div className="w-44 h-44 rounded-[3.5rem] overflow-hidden border-2 border-white/10 group-hover:border-white/40 transition-all duration-700 shadow-2xl bg-[#111]">
                <img 
                  src={formData.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400'} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  alt="Perfil"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 p-4 bg-white text-black rounded-3xl shadow-2xl">
                <ImageIcon size={20} strokeWidth={3} />
              </div>
            </div>

            {/* INPUTS DE IDENTIDAD */}
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
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
                label="Fecha de Nacimiento" 
                type="date"
                value={formData.fecha_nacimiento} 
                onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} 
                style={{ colorScheme: 'dark' }}
              />
              <div className="md:col-span-2">
                <Input 
                  label="URL Fotografía (Link Directo)" 
                  placeholder="https://images.unsplash.com/..."
                  value={formData.avatar_url} 
                  onChange={e => setFormData({...formData, avatar_url: e.target.value})} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: PRIVACIDAD */}
        <div className="bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6 mb-8">
            <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
              <Lock size={20} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Seguridad Visual</h2>
          </div>

          <div className="flex items-center justify-between p-6 bg-white/5 rounded-4xl border border-white/5 group hover:bg-white/8 transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl transition-all duration-500 ${formData.modo_privacidad ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/20'}`}>
                <EyeOff size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Modo Privacidad Global</h3>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter mt-1">Afecta Dashboard, Billetera y Reportes</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({...formData, modo_privacidad: !formData.modo_privacidad})}
              className={`w-16 h-9 rounded-full transition-all duration-700 relative border border-white/10 ${formData.modo_privacidad ? 'bg-white' : 'bg-white/5'}`}
            >
              <div className={`absolute top-1.5 w-6 h-6 rounded-full transition-all duration-500 shadow-xl ${formData.modo_privacidad ? 'left-8.5 bg-black' : 'left-1.5 bg-white/20'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="group flex items-center gap-4 bg-white text-black px-12 py-6 rounded-4xl font-black uppercase tracking-[0.2em] text-[12px] hover:scale-105 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            {isSubmitting ? 'Sincronizando...' : <><Save size={20} strokeWidth={3} /> Guardar Perfil</>}
          </button>
        </div>
      </form>

      {showSuccess && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white text-black px-10 py-5 rounded-full flex items-center gap-4 animate-in slide-in-from-bottom-20 shadow-[0_20px_80px_rgba(255,255,255,0.4)] z-200">
          <CheckCircle2 size={24} strokeWidth={3} className="text-green-600" />
          <span className="text-[11px] font-black uppercase tracking-widest">Cambios Aplicados en Nexus</span>
        </div>
      )}

    </div>
  );
};

const Input = ({ label, type = "text", ...props }) => (
  <div className="space-y-2 w-full">
    <label className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] ml-2">{label}</label>
    <input 
      type={type} 
      className="w-full bg-[#111] border border-white/5 text-white text-sm p-5 rounded-3xl focus:border-white/40 focus:bg-[#151515] outline-none transition-all shadow-inner placeholder:text-white/10" 
      {...props} 
    />
  </div>
);