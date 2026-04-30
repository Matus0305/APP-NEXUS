import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { usePrivacy } from '../../hooks/usePrivacy';
import { triggerHaptic } from '../../utils/haptics';
import {
  Wallet, CreditCard, Landmark, ArrowLeft, Plus,
  ArrowUpRight, ArrowDownRight, X, History, TrendingUp, AlertCircle,
  Target, Trash2, PiggyBank, Sparkles, Banknote, Calendar, ArrowRightLeft, Pencil, Tags
} from 'lucide-react';

const StatsCard = ({ title, amount, icon, color }) => (
  <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-4xl p-6 shadow-inner hover:bg-white/5 transition-all duration-300 hover:-translate-y-1">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-white/5 rounded-xl text-white/60 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">{title}</p>
    </div>
    <h3 className={`text-2xl md:text-3xl font-mono font-bold tracking-tighter ${color || 'text-white'}`}>
      {amount}
    </h3>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">{label}</label>}
    <input
      className="w-full bg-white/5 border border-white/5 text-white text-sm font-medium p-4 rounded-2xl focus:border-white/30 outline-none transition-all shadow-inner placeholder:text-white/20"
      {...props}
    />
  </div>
);

export const FlowModule = () => {
  const { isPrivacyActive } = usePrivacy(); 
  const { data: cuentas, loading: loadingCuentas, refetch: refetchCuentas } = useSupabaseQuery('nexus_cuentas');
  const { data: categoriasAll } = useSupabaseQuery('nexus_categories');

  const [activeTab, setActiveTab] = useState('Efectivo');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialAccountState = {
    id: null, nombre_cuenta: '', tipo: 'Efectivo', banco: 'Efectivo', ultimos_digitos: '',
    color_tarjeta: '#10b981', saldo_actual: '', limite_credito: '', tasa_rendimiento: '', 
    reglas_cashback: '', fecha_corte: '', fecha_pago: '', cashback_acumulado: ''
  };
  const [accountForm, setAccountForm] = useState(initialAccountState);

  const [movForm, setMovForm] = useState({ 
    tipo: 'Egreso', monto: '', descripcion: '', porcentaje_cashback: '', categoria_id: '' 
  });
  const [transferForm, setTransferForm] = useState({ 
    origen_id: '', destino_id: '', monto: '', descripcion: 'Transferencia interna' 
  });

  const renderMoney = (val) => isPrivacyActive ? '••••' : `$${Number(val || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

  useEffect(() => {
    if (selectedAccount) fetchMovimientos(selectedAccount.id);
  }, [selectedAccount]);

  const fetchMovimientos = async (cuentaId) => {
    setLoadingMovs(true);
    const { data, error } = await supabase
      .from('nexus_movimientos')
      .select('*, nexus_categories(nombre)')
      .eq('cuenta_id', cuentaId)
      .order('fecha', { ascending: false });
    if (!error) setMovimientos(data);
    setLoadingMovs(false);
  };

  const liquidezTotal = cuentas?.filter(c => c.tipo !== 'Crédito').reduce((acc, curr) => acc + Number(curr.saldo_actual), 0) || 0;
  const deudaTotal = cuentas?.filter(c => c.tipo === 'Crédito').reduce((acc, curr) => acc + Number(curr.saldo_actual), 0) || 0;
  const filtradas = cuentas?.filter(c => c.tipo === activeTab) || [];
  const categoriasFiltradas = categoriasAll?.filter(c => c.tipo === movForm.tipo && c.modulo === 'General') || [];

  const handleEditClick = () => {
    triggerHaptic('light');
    setAccountForm({
      id: selectedAccount.id, nombre_cuenta: selectedAccount.nombre_cuenta || '', tipo: selectedAccount.tipo || 'Efectivo',
      banco: selectedAccount.banco || '', ultimos_digitos: selectedAccount.ultimos_digitos || '', color_tarjeta: selectedAccount.color_tarjeta || '#10b981',
      saldo_actual: selectedAccount.saldo_actual || '', limite_credito: selectedAccount.limite_credito || '',
      tasa_rendimiento: selectedAccount.tasa_rendimiento || '', cashback_acumulado: selectedAccount.cashback_acumulado || '',
      fecha_corte: selectedAccount.fecha_corte || '', fecha_pago: selectedAccount.fecha_pago || ''
    });
    setShowAccountForm(true);
  };

  const closeAccountForm = () => {
    triggerHaptic('light');
    setShowAccountForm(false);
    setAccountForm(initialAccountState);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const payload = {
        nombre_cuenta: accountForm.nombre_cuenta, tipo: accountForm.tipo, banco: accountForm.banco,
        ultimos_digitos: accountForm.ultimos_digitos, color_tarjeta: accountForm.color_tarjeta,
        saldo_actual: parseFloat(accountForm.saldo_actual) || 0, limite_credito: parseFloat(accountForm.limite_credito) || 0,
        tasa_rendimiento: parseFloat(accountForm.tasa_rendimiento) || 0, cashback_acumulado: parseFloat(accountForm.cashback_acumulado) || 0,
        fecha_corte: accountForm.fecha_corte ? parseInt(accountForm.fecha_corte) : null, fecha_pago: accountForm.fecha_pago ? parseInt(accountForm.fecha_pago) : null,
      };
      if (accountForm.id) {
        await supabase.from('nexus_cuentas').update(payload).eq('id', accountForm.id);
        setSelectedAccount({ ...selectedAccount, ...payload });
      } else {
        await supabase.from('nexus_cuentas').insert([payload]);
      }
      triggerHaptic('heavy'); setShowAccountForm(false); setAccountForm(initialAccountState); refetchCuentas();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault(); triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const monto = parseFloat(movForm.monto);
      let cbGenerado = 0;
      if ((selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && movForm.tipo === 'Egreso' && parseFloat(movForm.porcentaje_cashback) > 0) {
        cbGenerado = monto * (parseFloat(movForm.porcentaje_cashback) / 100);
      }
      await supabase.from('nexus_movimientos').insert([{
        tipo: movForm.tipo, monto: monto, descripcion: movForm.descripcion,
        categoria_id: movForm.categoria_id || null, cashback_generado: cbGenerado, cuenta_id: selectedAccount.id
      }]);
      
      let nuevoSaldo = Number(selectedAccount.saldo_actual);
      if (selectedAccount.tipo === 'Crédito') nuevoSaldo = movForm.tipo === 'Egreso' ? nuevoSaldo + monto : nuevoSaldo - monto;
      else nuevoSaldo = movForm.tipo === 'Ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto;
      
      const nuevoCashbackAcumulado = Number(selectedAccount.cashback_acumulado || 0) + cbGenerado;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado }).eq('id', selectedAccount.id);
      
      triggerHaptic('heavy'); setShowMovForm(false);
      setMovForm({ tipo: 'Egreso', monto: '', descripcion: '', porcentaje_cashback: '', categoria_id: '' });
      fetchMovimientos(selectedAccount.id); refetchCuentas();
      setSelectedAccount({ ...selectedAccount, saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado });
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (transferForm.origen_id === transferForm.destino_id) return alert("Las cuentas deben ser diferentes");
    triggerHaptic('medium'); setIsSubmitting(true);
    try {
      const monto = parseFloat(transferForm.monto);
      const origen = cuentas.find(c => c.id === transferForm.origen_id);
      const destino = cuentas.find(c => c.id === transferForm.destino_id);
      
      await supabase.from('nexus_movimientos').insert([{ tipo: 'Egreso', monto: monto, descripcion: `[TRANSF] A ${destino.nombre_cuenta}`, cuenta_id: origen.id }]);
      await supabase.from('nexus_movimientos').insert([{ tipo: 'Ingreso', monto: monto, descripcion: `[TRANSF] DESDE ${origen.nombre_cuenta}`, cuenta_id: destino.id }]);
      
      const nuevoSaldoOrigen = origen.tipo === 'Crédito' ? Number(origen.saldo_actual) + monto : Number(origen.saldo_actual) - monto;
      const nuevoSaldoDestino = destino.tipo === 'Crédito' ? Number(destino.saldo_actual) - monto : Number(destino.saldo_actual) + monto;
      
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldoOrigen }).eq('id', origen.id);
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldoDestino }).eq('id', destino.id);
      
      triggerHaptic('heavy'); setShowTransferForm(false);
      setTransferForm({ origen_id: '', destino_id: '', monto: '', descripcion: '' }); refetchCuentas();
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteMovement = async (mov) => {
    triggerHaptic('heavy');
    if (!window.confirm('¿Eliminar este registro? El saldo se ajustará automáticamente.')) return;
    try {
      const monto = Number(mov.monto);
      let nuevoSaldo = Number(selectedAccount.saldo_actual);
      if (selectedAccount.tipo === 'Crédito') nuevoSaldo = mov.tipo === 'Egreso' ? nuevoSaldo - monto : nuevoSaldo + monto;
      else nuevoSaldo = mov.tipo === 'Ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto;
      
      let nuevoCashback = Number(selectedAccount.cashback_acumulado || 0) - Number(mov.cashback_generado || 0);
      await supabase.from('nexus_movimientos').delete().eq('id', mov.id);
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashback }).eq('id', selectedAccount.id);
      
      triggerHaptic('light'); fetchMovimientos(selectedAccount.id); refetchCuentas();
      setSelectedAccount({ ...selectedAccount, saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashback });
    } catch (err) { alert(err.message); }
  };

  const handleDeleteAccount = async () => {
    triggerHaptic('heavy'); setIsSubmitting(true);
    try {
      await supabase.from('nexus_cuentas').delete().eq('id', selectedAccount.id);
      triggerHaptic('heavy'); setIsDeleting(false); setSelectedAccount(null); refetchCuentas();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  if (loadingCuentas) return <div className="flex items-center justify-center h-full p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Sincronizando_Bóveda...</div>;

  return (
    <div className="w-full text-white font-sans relative pb-32">
      {/* VISTA 1: LISTADO DE CUENTAS (Animación Fade & Slide up) */}
      {!selectedAccount && !showAccountForm && !showTransferForm && !showMovForm && (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">BILLETERA</h1>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Gestor de Activos</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => { triggerHaptic('light'); setShowTransferForm(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
                <ArrowRightLeft size={16} strokeWidth={3} /> Transferir
              </button>
              <button onClick={() => { triggerHaptic('light'); setAccountForm(initialAccountState); setShowAccountForm(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                <Plus size={16} strokeWidth={3} /> Nuevo activo
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:bg-white/5 transition-all cursor-pointer hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all" />
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2 relative z-10">Liquidez</p>
              <p className="text-4xl font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] relative z-10">
                {renderMoney(liquidezTotal)}
              </p>
            </div>
            <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:bg-white/5 transition-all cursor-pointer hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] -mr-10 -mt-10 group-hover:bg-red-500/20 transition-all" />
              <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-2 relative z-10">Deuda Actual</p>
              <p className="text-4xl font-mono font-bold text-white tracking-tighter relative z-10">
                {renderMoney(deudaTotal)}
              </p>
            </div>
          </div>

          <div className="flex gap-2 p-1.5 bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-2xl w-full overflow-x-auto hide-scrollbar">
            {['Efectivo', 'Cuentas', 'Crédito', 'Débito'].map(tab => (
              <button
                key={tab}
                onClick={() => { triggerHaptic('light'); setActiveTab(tab); }}
                className={`flex-1 min-w-24 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-md scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtradas.length === 0 ? (
              <div className="col-span-full py-20 text-center text-white/20 text-[10px] font-mono uppercase tracking-widest border border-dashed border-white/5 rounded-[3rem] animate-pulse">No hay activos en esta categoría</div>
            ) : (
              filtradas.map((c, index) => (
                <div
                  key={c.id}
                  onClick={() => { triggerHaptic('light'); setSelectedAccount(c); }}
                  style={{ background: `linear-gradient(135deg, ${c.color_tarjeta}cc, #000000)`, animationDelay: `${index * 50}ms` }}
                  className="group relative h-56 rounded-[2.5rem] p-8 cursor-pointer hover:-translate-y-2 active:scale-[0.98] transition-all duration-500 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-[0.95]"
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-500" />
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-700 group-hover:scale-110" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">{c.nombre_cuenta}</h3>
                      <p className="text-[10px] font-mono text-white/60 tracking-[0.2em] uppercase mt-1">{c.banco}</p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl group-hover:scale-110 transition-transform">
                      {c.tipo === 'Efectivo' ? <Banknote size={20} className="text-white" /> : c.tipo === 'Cuentas' ? <PiggyBank size={20} className="text-white" /> : <CreditCard size={20} className="text-white" />}
                    </div>
                  </div>
                  <div className="z-10">
                    <p className="text-[9px] text-white/60 uppercase font-black tracking-widest mb-1">{c.tipo === 'Crédito' ? 'Deuda Actual' : 'Saldo Disponible'}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">
                        {renderMoney(c.saldo_actual)}
                      </p>
                      <p className="text-[10px] font-mono text-white/50 tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                        {c.tipo === 'Efectivo' ? 'CASH' : (c.tipo === 'Cuentas' ? c.ultimos_digitos : (c.ultimos_digitos ? `•••• ${c.ultimos_digitos}` : ''))}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: DETALLE DE CUENTA (Animación Slide from right & Zoom) */}
      {selectedAccount && !showAccountForm && !showTransferForm && !showMovForm && (
        <div className="animate-in slide-in-from-right-8 fade-in zoom-in-[0.98] duration-500 ease-out max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => { triggerHaptic('light'); setSelectedAccount(null); }} className="flex items-center text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-5 py-3 rounded-2xl border border-white/5 active:scale-95 hover:-translate-x-1">
              <ArrowLeft size={14} className="mr-2"/> Billetera
            </button>
            <div className="flex gap-2">
              <button onClick={handleEditClick} className="p-3 bg-white/5 text-white/50 rounded-2xl border border-white/5 hover:bg-white/10 hover:text-white transition-all active:scale-90">
                <Pencil size={16} />
              </button>
              <button onClick={() => { triggerHaptic('heavy'); setIsDeleting(true); }} className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div style={{ background: `linear-gradient(135deg, ${selectedAccount.color_tarjeta}dd, #000000)` }} className="w-full h-72 rounded-[3rem] p-10 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-1000 group-hover:scale-110" />
            <div className="z-10 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-xl">{selectedAccount.nombre_cuenta}</h2>
              <p className="text-[10px] font-mono text-white/60 tracking-[0.3em] uppercase mt-2">
                {selectedAccount.banco} {selectedAccount.tipo === 'Efectivo' ? '' : (selectedAccount.tipo === 'Cuentas' ? selectedAccount.ultimos_digitos : (selectedAccount.ultimos_digitos ? `• •••• ${selectedAccount.ultimos_digitos}` : ''))}
              </p>
            </div>
            <div className="z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <p className="text-[10px] text-white/60 uppercase font-black tracking-widest mb-1">{selectedAccount.tipo === 'Crédito' ? 'Deuda al día' : 'Liquidez disponible'}</p>
              <p className="text-5xl md:text-6xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl">
                {renderMoney(selectedAccount.saldo_actual)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            {selectedAccount.tipo === 'Cuentas' && <StatsCard title="Rendimiento Anual" amount={selectedAccount.tasa_rendimiento ? `${selectedAccount.tasa_rendimiento}%` : '--'} icon={<TrendingUp size={16}/>} color="text-emerald-400" />}
            {(selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && <StatsCard title="Alcancía Cashback" amount={renderMoney(selectedAccount.cashback_acumulado)} icon={<Sparkles size={16}/>} color="text-purple-400" />}
            {selectedAccount.tipo === 'Crédito' && (
              <>
                <StatsCard title="Límite Restante" amount={renderMoney(selectedAccount.limite_credito - selectedAccount.saldo_actual)} icon={<Wallet size={16}/>} color="text-cyan-400" />
                <StatsCard title="Corte / Pago" amount={selectedAccount.fecha_corte ? `${selectedAccount.fecha_corte} / ${selectedAccount.fecha_pago}` : '--'} icon={<Calendar size={16}/>} color="text-red-400" />
              </>
            )}
            {selectedAccount.tipo === 'Efectivo' && <StatsCard title="Estado Físico" amount="Caja" icon={<Banknote size={16}/>} color="text-emerald-400" />}
          </div>

          <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-6 md:p-10 flex flex-col min-h-100 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <History size={18} className="text-white/30" />
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Historial</h3>
              </div>
              <button onClick={() => { triggerHaptic('light'); setShowMovForm(true); }} className="bg-white text-black px-5 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl font-black uppercase tracking-widest text-[10px]">
                <Plus size={14} strokeWidth={3} /> Registrar
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
              {loadingMovs ? <p className="text-[10px] font-mono text-white/20 text-center py-20 uppercase tracking-widest animate-pulse">Analizando_Registros...</p> :
              movimientos.length === 0 ? <p className="text-[10px] font-mono text-white/20 text-center py-20 border border-dashed border-white/5 rounded-4xl uppercase tracking-widest">Sin movimientos registrados</p> : (
                <div className="space-y-2">
                  {movimientos.map((m, idx) => {
                    const isPos = selectedAccount.tipo === 'Crédito' ? m.tipo === 'Ingreso' : m.tipo === 'Ingreso';
                    return (
                      <div key={m.id} style={{animationDelay: `${idx * 50}ms`}} className="flex justify-between items-center py-4 px-5 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-black/50 border border-white/5 ${isPos ? 'text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-white/30'}`}>
                            {isPos ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white/90 tracking-tight flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                              {m.descripcion}
                            </p>
                            <div className="flex gap-3 mt-1 items-center">
                              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{new Date(m.fecha).toLocaleDateString(undefined, {day:'2-digit', month:'short'})}</p>
                              {m.nexus_categories?.nombre && <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest">{m.nexus_categories.nombre}</span>}
                              {Number(m.cashback_generado) > 0 && <p className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold">+{Number(m.cashback_generado).toFixed(2)} CB</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <p className={`font-mono font-bold text-xl ${isPos ? 'text-emerald-400' : 'text-white'}`}>
                            {isPos ? '+' : '-'}{renderMoney(m.monto)}
                          </p>
                          <button onClick={() => handleDeleteMovement(m)} className="p-2 text-white/10 md:opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all active:scale-90"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORMULARIOS FULL-SCREEN NEXUS (ANIMADOS)                 */}
      {/* ======================================================== */}

      {/* MODAL: TRANSFERENCIA */}
      {showTransferForm && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={() => { triggerHaptic('light'); setShowTransferForm(false); }}></div>
          <div className="w-full max-w-md bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white">Mover Fondos</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Transferencia Interna</p>
                </div>
                <button onClick={() => setShowTransferForm(false)} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <form id="transfer-form" onSubmit={handleTransfer} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Origen (Sale)</label>
                    <select required value={transferForm.origen_id} onChange={e => setTransferForm({...transferForm, origen_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white p-4 rounded-2xl focus:border-white/30 outline-none appearance-none font-sans">
                      <option value="" disabled className="bg-[#0A0A0A]">Seleccionar cuenta...</option>
                      {cuentas?.map(c => <option key={c.id} value={c.id} className="bg-[#0A0A0A]">{c.nombre_cuenta} (${c.saldo_actual})</option>)}
                    </select>
                  </div>
                  <div className="flex justify-center -my-2">
                    <div className="p-2 bg-white text-black rounded-full shadow-lg z-10"><ArrowRightLeft size={16} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Destino (Entra)</label>
                    <select required value={transferForm.destino_id} onChange={e => setTransferForm({...transferForm, destino_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white p-4 rounded-2xl focus:border-white/30 outline-none appearance-none font-sans">
                      <option value="" disabled className="bg-[#0A0A0A]">Seleccionar destino...</option>
                      {cuentas?.map(c => <option key={c.id} value={c.id} className="bg-[#0A0A0A]">{c.nombre_cuenta}</option>)}
                    </select>
                  </div>
                  <Input label="Monto a Transferir" type="number" step="0.01" required value={transferForm.monto} onChange={e => setTransferForm({...transferForm, monto: e.target.value})} placeholder="0.00" className="w-full bg-white/5 border border-white/5 text-white p-4 rounded-2xl focus:border-white/30 outline-none font-mono" />
                </div>
              </form>
            </div>
            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button form="transfer-form" type="submit" disabled={isSubmitting} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all disabled:opacity-50">
                {isSubmitting ? 'Procesando...' : 'Confirmar Transferencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR ACTIVO FINANCIERO */}
      {showAccountForm && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={closeAccountForm}></div>
          <div className="w-full max-w-2xl bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">
                    {accountForm.id ? 'Editar Activo' : 'Nuevo Activo'}
                  </h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Configuración del Tarjetero Digital</p>
                </div>
                <button onClick={closeAccountForm} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <form id="account-form" onSubmit={handleSaveAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Identidad de Cuenta" placeholder="Ej. Caja Principal" value={accountForm.nombre_cuenta} onChange={e => setAccountForm({...accountForm, nombre_cuenta: e.target.value})} required autoFocus />
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Tipo de Producto</label>
                    <select value={accountForm.tipo} onChange={e => {
                      const val = e.target.value;
                      setAccountForm({ ...accountForm, tipo: val, banco: val === 'Efectivo' ? 'Efectivo' : accountForm.banco, color_tarjeta: val === 'Efectivo' ? '#10b981' : accountForm.color_tarjeta });
                    }} className="w-full bg-white/5 border border-white/5 text-white font-medium p-4 rounded-2xl focus:border-white/30 outline-none appearance-none transition-all font-sans">
                      <option className="bg-[#0A0A0A]" value="Efectivo">Efectivo (Cash)</option>
                      <option className="bg-[#0A0A0A]" value="Cuentas">Cuenta Bancaria</option>
                      <option className="bg-[#0A0A0A]" value="Crédito">Tarjeta de Crédito</option>
                      <option className="bg-[#0A0A0A]" value="Débito">Tarjeta de Débito</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1">Color Estético</label>
                    <input type="color" value={accountForm.color_tarjeta} onChange={e => setAccountForm({...accountForm, color_tarjeta: e.target.value})} className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl p-1 cursor-pointer transition-all" />
                  </div>
                </div>
                {accountForm.tipo !== 'Efectivo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <Input label="Institución Bancaria" placeholder="Ej. Bank of America" value={accountForm.banco} onChange={e => setAccountForm({...accountForm, banco: e.target.value})} required />
                    <Input label={accountForm.tipo === 'Cuentas' ? 'Nº Completo / CLABE' : 'Últimos 4 Dígitos'} type="number" placeholder={accountForm.tipo === 'Cuentas' ? 'Ej. 0000012345678' : 'Ej. 1234'} maxLength={accountForm.tipo === 'Cuentas' ? 30 : 4} value={accountForm.ultimos_digitos} onChange={e => setAccountForm({...accountForm, ultimos_digitos: e.target.value})} />
                  </div>
                )}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                  <Input label={accountForm.tipo === 'Crédito' ? 'Deuda Inicial ($)' : 'Saldo de Apertura ($)'} type="number" step="0.01" value={accountForm.saldo_actual} onChange={e => setAccountForm({...accountForm, saldo_actual: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-emerald-400/50 outline-none transition-all" placeholder="0.00" required/>
                  {accountForm.tipo === 'Crédito' && <Input label="Límite Autorizado ($)" type="number" step="0.01" value={accountForm.limite_credito} onChange={e => setAccountForm({...accountForm, limite_credito: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-cyan-400/50 outline-none transition-all" placeholder="0.00" required/>}
                  {accountForm.tipo === 'Cuentas' && <Input label="Rendimiento Anual (TEA %)" type="number" step="0.01" value={accountForm.tasa_rendimiento} onChange={e => setAccountForm({...accountForm, tasa_rendimiento: e.target.value})} className="w-full bg-black/40 border border-white/5 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-emerald-400/50 outline-none transition-all" placeholder="3.5"/>}
                  {(accountForm.tipo === 'Crédito' || accountForm.tipo === 'Débito') && <Input label="Cashback Inicial ($)" type="number" step="0.01" value={accountForm.cashback_acumulado} onChange={e => setAccountForm({...accountForm, cashback_acumulado: e.target.value})} className="w-full bg-black/40 border border-purple-500/20 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-purple-400/50 outline-none transition-all placeholder:text-purple-400/30" placeholder="0.00"/>}
                </div>
                {accountForm.tipo === 'Crédito' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Día de Corte" type="number" min="1" max="31" value={accountForm.fecha_corte} onChange={e => setAccountForm({...accountForm, fecha_corte: e.target.value})} placeholder="15" />
                    <Input label="Día de Pago" type="number" min="1" max="31" value={accountForm.fecha_pago} onChange={e => setAccountForm({...accountForm, fecha_pago: e.target.value})} placeholder="5" />
                  </div>
                )}
              </form>
            </div>
            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button form="account-form" type="submit" disabled={isSubmitting} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)] disabled:opacity-50">
                {isSubmitting ? 'Procesando...' : (accountForm.id ? 'Guardar Cambios' : 'Crear Activo Financiero')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE FLUJO */}
      {showMovForm && (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-300 ease-out">
          <div className="absolute inset-0 hidden md:block" onClick={() => { triggerHaptic('light'); setShowMovForm(false); }}></div>
          <div className="w-full max-w-md bg-[#0A0A0A] md:bg-[#0A0A0A]/95 md:backdrop-blur-3xl border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col h-full md:h-auto md:max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-12 md:zoom-in-[0.98] duration-500 ease-out">
            <div className="shrink-0 p-6 md:p-10 pb-4 border-b border-white/5 bg-[#0A0A0A] z-20">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex justify-between items-start md:items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white">Registro de Flujo</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Transacción Diaria</p>
                </div>
                <button onClick={() => { triggerHaptic('light'); setShowMovForm(false); }} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full md:rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-6 hide-scrollbar relative z-10 pb-10">
              <form id="mov-form" onSubmit={handleSaveMovement} className="space-y-6">
                <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
                  <button type="button" onClick={() => { triggerHaptic('light'); setMovForm({...movForm, tipo: 'Egreso', categoria_id: ''}); }} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${movForm.tipo === 'Egreso' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-white/40 hover:text-white/60'}`}>
                    Gasto / Salida
                  </button>
                  <button type="button" onClick={() => { triggerHaptic('light'); setMovForm({...movForm, tipo: 'Ingreso', categoria_id: ''}); }} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${movForm.tipo === 'Ingreso' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-white/40 hover:text-white/60'}`}>
                    Ingreso / Entrada
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center py-8 bg-black/40 rounded-3xl border border-white/5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-2">Monto de Operación ($)</label>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-3xl font-black ${movForm.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>$</span>
                    <input type="number" step="0.01" autoFocus required value={movForm.monto} onChange={e => setMovForm({...movForm, monto: e.target.value})} className="w-32 bg-transparent text-white text-5xl font-black outline-none font-mono text-center placeholder:text-white/10" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest ml-1 flex items-center gap-2"><Tags size={12}/> Categoría</label>
                  <select required value={movForm.categoria_id} onChange={e => setMovForm({...movForm, categoria_id: e.target.value})} className="w-full bg-white/5 border border-white/5 text-white font-bold p-4 rounded-2xl outline-none appearance-none focus:border-white/30 transition-all font-sans">
                    <option value="" disabled className="bg-[#0A0A0A]">Selecciona el rubro...</option>
                    {categoriasFiltradas?.map(cat => <option className="bg-[#0A0A0A]" key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                  </select>
                </div>
                <Input label="Nota Opcional" placeholder="Detalles de la compra..." value={movForm.descripcion} onChange={e => setMovForm({...movForm, descripcion: e.target.value})} />
                {(selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && movForm.tipo === 'Egreso' && (
                  <div className="p-5 border border-purple-500/30 bg-purple-500/10 rounded-4xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="text-[9px] text-purple-400 font-black uppercase tracking-widest ml-1">% Cashback Aplicado (Opcional)</label>
                    <input type="number" step="0.1" value={movForm.porcentaje_cashback} onChange={e => setMovForm({...movForm, porcentaje_cashback: e.target.value})} className="w-full mt-2 bg-black/40 border border-purple-500/20 text-white text-xl font-mono font-bold p-4 rounded-xl focus:border-purple-400 outline-none transition-all placeholder:text-purple-400/30" placeholder="Ej. 1.5"/>
                    {movForm.monto > 0 && movForm.porcentaje_cashback > 0 && (
                      <p className="text-[10px] text-purple-400 font-mono mt-3 text-right uppercase font-bold tracking-widest">
                        Generando +${(parseFloat(movForm.monto) * (parseFloat(movForm.porcentaje_cashback)/100)).toFixed(2)} USD
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>
            <div className="shrink-0 p-6 md:p-10 border-t border-white/5 bg-[#0A0A0A] z-20">
              <button form="mov-form" type="submit" disabled={isSubmitting} className={`w-full py-5 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-lg disabled:opacity-50 ${movForm.tipo === 'Ingreso' ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-[0_10px_30px_rgba(16,185,129,0.3)]' : 'bg-red-500 hover:bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.3)]'}`}>
                {isSubmitting ? 'Procesando...' : 'Confirmar Transacción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {isDeleting && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300 ease-out">
          <div className="p-8 bg-[#050505] border border-red-500/30 rounded-[2.5rem] space-y-6 w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in zoom-in-90 fade-in duration-300 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/20">
              <AlertCircle size={40}/>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">¿Destruir Activo?</h3>
            <p className="text-[10px] text-white/40 leading-relaxed font-bold tracking-widest uppercase">Esta acción borrará la cuenta y todo su historial de forma irreversible.</p>
            <div className="flex flex-col gap-3 pt-4">
              <button onClick={handleDeleteAccount} disabled={isSubmitting} className="w-full py-5 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.3)]">
                {isSubmitting ? 'Borrando...' : 'Confirmar Destrucción'}
              </button>
              <button onClick={() => { triggerHaptic('light'); setIsDeleting(false); }} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white/50 font-black uppercase tracking-widest text-[11px] rounded-2xl border border-white/5 active:scale-95 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};