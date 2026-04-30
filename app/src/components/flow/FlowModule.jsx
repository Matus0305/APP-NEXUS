import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { triggerHaptic } from '../../utils/haptics';
import { 
  Plus, Search, ArrowUpCircle, ArrowDownCircle, Filter, 
  MoreVertical, Trash2, Calendar, Tag, DollarSign, X 
} from 'lucide-react';

export const FlowModule = () => {
  const { data: flows, loading, refetch } = useSupabaseQuery('flujos_efectivo');
  const { isPrivacyActive } = usePrivacy();
  const [filter, setFilter] = useState('all'); // all, income, expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = {
    tipo: 'expense',
    monto: '',
    categoria: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialForm);

  // Lógica de Inteligencia Financiera
  const stats = useMemo(() => {
    if (!flows) return { income: 0, expense: 0, balance: 0 };
    return flows.reduce((acc, curr) => {
      const val = parseFloat(curr.monto) || 0;
      if (curr.tipo === 'income') acc.income += val;
      else acc.expense += val;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [flows]);

  const filteredFlows = flows?.filter(f => 
    filter === 'all' ? true : f.tipo === filter
  );

  const renderAmount = (amount, tipo) => {
    if (isPrivacyActive) return '••••';
    const prefix = tipo === 'income' ? '+' : '-';
    return `${prefix}$${parseFloat(amount).toLocaleString()}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    triggerHaptic('medium');

    const { error } = await supabase.from('flujos_efectivo').insert([{
      ...formData,
      monto: parseFloat(formData.monto)
    }]);

    if (!error) {
      setFormData(initialForm);
      setIsModalOpen(false);
      refetch();
    } else {
      alert(`Error: ${error.message}`);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">
        Sincronizando_Flujos...
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <header className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">CASH FLOW</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Gestión de liquidez nexus</p>
          </div>
          <button 
            onClick={() => { setIsModalOpen(true); triggerHaptic('light'); }}
            className="p-4 bg-white text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Ingresos" value={stats.income} color="text-emerald-400" isPrivacy={isPrivacyActive} />
          <StatCard label="Gastos" value={stats.expense} color="text-rose-400" isPrivacy={isPrivacyActive} />
          <StatCard label="Balance" value={stats.balance} color="text-white" isPrivacy={isPrivacyActive} />
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {['all', 'income', 'expense'].map((t) => (
          <button
            key={t}
            onClick={() => { setFilter(t); triggerHaptic('light'); }}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === t ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredFlows?.map((flow) => (
          <div 
            key={flow.id}
            className="group bg-[#0A0A0A]/40 backdrop-blur-xl border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${flow.tipo === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {flow.tipo === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white capitalize">{flow.descripcion || 'Sin descripción'}</h4>
                <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase">
                  <span>{flow.categoria}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10"></span>
                  <span>{flow.fecha}</span>
                </div>
              </div>
            </div>
            <div className={`text-lg font-mono font-bold ${flow.tipo === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {renderAmount(flow.monto, flow.tipo)}
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Bottom Sheet Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="w-full max-w-lg bg-[#0A0A0A] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8 md:hidden"></div>
            <h2 className="text-2xl font-black tracking-tighter text-white mb-6">REGISTRAR MOVIMIENTO</h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex bg-white/5 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'income'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.tipo === 'income' ? 'bg-emerald-500 text-white' : 'text-white/40'}`}
                >Ingreso</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'expense'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.tipo === 'expense' ? 'bg-rose-500 text-white' : 'text-white/40'}`}
                >Gasto</button>
              </div>

              <div className="space-y-4">
                <Input label="Monto ($)" type="number" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} placeholder="0.00" required />
                <Input label="Categoría" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} placeholder="Ej. Alimentación" required />
                <Input label="Descripción" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Opcional" />
                <Input label="Fecha" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required style={{ colorScheme: 'dark' }} />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-neutral-200 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Transacción'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, isPrivacy }) => (
  <div className="bg-[#0A0A0A]/40 border border-white/5 p-6 rounded-3xl">
    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-mono font-bold ${color}`}>
      {isPrivacy ? '••••' : `$${Math.abs(value).toLocaleString()}`}
    </p>
  </div>
);

const Input = ({ label, value, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] text-white/40 font-black uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-white/5 border border-white/5 text-white text-sm p-4 rounded-2xl focus:border-white/30 focus:bg-white/10 outline-none transition-all font-sans"
      value={value}
      {...props}
    />
  </div>
);