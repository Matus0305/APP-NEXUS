import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { usePrivacy } from '../../hooks/usePrivacy'; // Hook de privacidad inyectado
import { 
  Wallet, CreditCard, Landmark, ArrowLeft, Plus, 
  ArrowUpRight, ArrowDownRight, X, History, TrendingUp, AlertCircle, 
  Target, Trash2, PiggyBank, Sparkles
} from 'lucide-react';

const StatsCard = ({ title, amount, icon }) => (
  <div className="bg-[#0A0A0A] border border-white/5 rounded-4xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-white/5 rounded-xl text-white/60 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase italic">{title}</p>
    </div>
    <h3 className="text-2xl font-black italic tracking-tighter text-white">{amount}</h3>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest">{label}</label>}
    <input 
      className="w-full bg-[#111111] border border-white/10 text-white text-sm p-4 rounded-xl focus:border-white/40 outline-none transition-all placeholder:text-white/20"
      {...props}
    />
  </div>
);
export const FlowModule = () => {
  // 1. DATA FETCHING & PRIVACY
  const { privacyClass } = usePrivacy(); // Obtenemos la clase CSS mágica
  const { data: cuentas, loading: loadingCuentas, refetch: refetchCuentas } = useSupabaseQuery('nexus_cuentas');
  
  // 2. NAVEGACIÓN Y ESTADOS
  const [activeTab, setActiveTab] = useState('Ahorro');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

  // 3. ESTADOS DE MODALES Y FORMULARIOS
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialAccountState = {
    nombre_cuenta: '', tipo: 'Ahorro', banco: '', ultimos_digitos: '', color_tarjeta: '#111111',
    saldo_actual: '', limite_credito: '', tasa_rendimiento: '', reglas_cashback: '', fecha_corte: '', fecha_pago: ''
  };
  const [accountForm, setAccountForm] = useState(initialAccountState);
  const [movForm, setMovForm] = useState({ tipo: 'Egreso', monto: '', descripcion: '', porcentaje_cashback: '' });

  // 4. EFECTOS
  useEffect(() => {
    if (selectedAccount) fetchMovimientos(selectedAccount.id);
  }, [selectedAccount]);

  const fetchMovimientos = async (cuentaId) => {
    setLoadingMovs(true);
    const { data, error } = await supabase
      .from('nexus_movimientos')
      .select('*')
      .eq('cuenta_id', cuentaId)
      .order('fecha', { ascending: false });
    if (!error) setMovimientos(data);
    setLoadingMovs(false);
  };

  // 5. INTELIGENCIA FINANCIERA (CÁLCULOS MACRO)
  const liquidezTotal = cuentas?.filter(c => c.tipo !== 'Crédito').reduce((acc, curr) => acc + Number(curr.saldo_actual), 0) || 0;
  const deudaTotal = cuentas?.filter(c => c.tipo === 'Crédito').reduce((acc, curr) => acc + Number(curr.saldo_actual), 0) || 0;
  const filtradas = cuentas?.filter(c => c.tipo === activeTab) || [];

  // 6. HANDLERS (SE MANTIENEN IGUAL)
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...accountForm,
        saldo_actual: parseFloat(accountForm.saldo_actual) || 0,
        limite_credito: parseFloat(accountForm.limite_credito) || 0,
        tasa_rendimiento: parseFloat(accountForm.tasa_rendimiento) || 0,
        fecha_corte: accountForm.fecha_corte ? parseInt(accountForm.fecha_corte) : null,
        fecha_pago: accountForm.fecha_pago ? parseInt(accountForm.fecha_pago) : null,
      };
      const { error } = await supabase.from('nexus_cuentas').insert([payload]);
      if (error) throw error;
      setShowAccountForm(false);
      setAccountForm(initialAccountState);
      refetchCuentas();
    } catch (err) { alert(`Error al guardar: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleSaveMovement = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const monto = parseFloat(movForm.monto);
      let cbGenerado = 0;
      if ((selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && movForm.tipo === 'Egreso' && parseFloat(movForm.porcentaje_cashback) > 0) {
        cbGenerado = monto * (parseFloat(movForm.porcentaje_cashback) / 100);
      }
      const { error } = await supabase.from('nexus_movimientos').insert([{
        tipo: movForm.tipo, monto: monto, descripcion: movForm.descripcion,
        cashback_generado: cbGenerado, cuenta_id: selectedAccount.id
      }]);
      if (error) throw error;

      let nuevoSaldo = Number(selectedAccount.saldo_actual);
      if (selectedAccount.tipo === 'Crédito') {
        nuevoSaldo = movForm.tipo === 'Egreso' ? nuevoSaldo + monto : nuevoSaldo - monto;
      } else {
        nuevoSaldo = movForm.tipo === 'Ingreso' ? nuevoSaldo + monto : nuevoSaldo - monto;
      }
      const nuevoCashbackAcumulado = Number(selectedAccount.cashback_acumulado || 0) + cbGenerado;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado }).eq('id', selectedAccount.id);
      
      setShowMovForm(false);
      setMovForm({ tipo: 'Egreso', monto: '', descripcion: '', porcentaje_cashback: '' });
      fetchMovimientos(selectedAccount.id);
      refetchCuentas();
      setSelectedAccount({ ...selectedAccount, saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashbackAcumulado });
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleDeleteMovement = async (mov) => {
    if (!window.confirm('¿Eliminar este registro? El saldo se ajustará automáticamente.')) return;
    try {
      const monto = Number(mov.monto);
      let nuevoSaldo = Number(selectedAccount.saldo_actual);
      if (selectedAccount.tipo === 'Crédito') {
        nuevoSaldo = mov.tipo === 'Egreso' ? nuevoSaldo - monto : nuevoSaldo + monto;
      } else {
        nuevoSaldo = mov.tipo === 'Ingreso' ? nuevoSaldo - monto : nuevoSaldo + monto;
      }
      let nuevoCashback = Number(selectedAccount.cashback_acumulado || 0) - Number(mov.cashback_generado || 0);
      const { error } = await supabase.from('nexus_movimientos').delete().eq('id', mov.id);
      if (error) throw error;
      await supabase.from('nexus_cuentas').update({ saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashback }).eq('id', selectedAccount.id);
      fetchMovimientos(selectedAccount.id);
      refetchCuentas();
      setSelectedAccount({ ...selectedAccount, saldo_actual: nuevoSaldo, cashback_acumulado: nuevoCashback });
    } catch (err) { alert(err.message); }
  };

  const handleDeleteAccount = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('nexus_cuentas').delete().eq('id', selectedAccount.id);
      if (error) throw error;
      setIsDeleting(false);
      setSelectedAccount(null);
      refetchCuentas();
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  if (loadingCuentas) return <div className="p-10 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">Sincronizando_Billetera...</div>;

  return (
    <div className="min-h-screen bg-transparent text-white font-sans relative pb-32 animate-in fade-in duration-700">
      
      {!selectedAccount && (
        <div className="p-6 space-y-10 max-w-6xl mx-auto">
          <header className="flex justify-between items-end border-b border-white/5 pb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tighter text-white">Billetera</h1>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-2">Centro de Mando de Liquidez</p>
            </div>
            <button onClick={() => setShowAccountForm(true)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              <Plus size={24} strokeWidth={3} />
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-4xl">
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Liquidez Real</p>
              {/* PRIVACIDAD APLICADA */}
              <p className={`text-3xl font-mono font-bold tracking-tighter ${privacyClass}`}>
                ${liquidezTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
            <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-4xl">
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Deuda Comprometida</p>
              {/* PRIVACIDAD APLICADA */}
              <p className={`text-3xl font-mono font-bold text-white/40 tracking-tighter ${privacyClass}`}>
                ${deudaTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>

          <div className="flex gap-2 p-1.5 bg-[#0A0A0A]/80 border border-white/5 rounded-full w-full overflow-x-auto no-scrollbar">
            {['Ahorro', 'Crédito', 'Débito'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtradas.length === 0 ? (
              <div className="col-span-full py-16 text-center text-white/20 text-xs font-mono border border-dashed border-white/5 rounded-[2.5rem]">No hay activos financieros</div>
            ) : (
              filtradas.map(c => (
                <div key={c.id} onClick={() => setSelectedAccount(c)} style={{ background: `linear-gradient(135deg, ${c.color_tarjeta}aa, #000000)` }} className="group relative h-52 rounded-[2.5rem] p-8 cursor-pointer hover:-translate-y-2 transition-all duration-500 border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-all duration-700" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{c.nombre_cuenta}</h3>
                      <p className="text-[9px] font-mono text-white/50 tracking-[0.2em] uppercase mt-1">{c.banco}</p>
                    </div>
                    {c.tipo === 'Ahorro' ? <PiggyBank size={22} className="text-white/40" /> : <CreditCard size={22} className="text-white/40" />}
                  </div>
                  <div className="z-10">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">{c.tipo === 'Crédito' ? 'Deuda Actual' : 'Saldo Disponible'}</p>
                    <div className="flex justify-between items-end">
                      {/* PRIVACIDAD APLICADA EN TARJETAS */}
                      <p className={`text-3xl font-mono font-bold text-white tracking-tighter ${privacyClass}`}>
                        ${Number(c.saldo_actual).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                      <p className="text-[10px] font-mono text-white/30 tracking-widest">{c.tipo === 'Ahorro' ? c.ultimos_digitos : (c.ultimos_digitos ? `•••• ${c.ultimos_digitos}` : '')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <button onClick={() => setSelectedAccount(null)} className="flex items-center text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all bg-white/5 px-5 py-3 rounded-full border border-white/5">
              <ArrowLeft size={14} className="mr-2"/> Regresar
            </button>
            <button onClick={() => setIsDeleting(true)} className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all">
              <Trash2 size={18} />
            </button>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${selectedAccount.color_tarjeta}aa, #000000)` }} className="w-full h-64 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
            <div className="z-10 flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-bold text-white tracking-tighter">{selectedAccount.nombre_cuenta}</h2>
                <p className="text-xs font-mono text-white/40 tracking-[0.2em] uppercase mt-2">{selectedAccount.banco} {selectedAccount.tipo === 'Ahorro' ? selectedAccount.ultimos_digitos : (selectedAccount.ultimos_digitos ? `• •••• ${selectedAccount.ultimos_digitos}` : '')}</p>
              </div>
            </div>
            <div className="z-10">
              <p className="text-xs text-white/50 uppercase font-black tracking-widest mb-1">{selectedAccount.tipo === 'Crédito' ? 'Deuda al día' : 'Liquidez disponible'}</p>
              {/* PRIVACIDAD APLICADA EN VISTA DETALLE */}
              <p className={`text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl ${privacyClass}`}>
                ${Number(selectedAccount.saldo_actual).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedAccount.tipo === 'Ahorro' && (
              <StatsCard label="Rendimiento (TEA)" val={selectedAccount.tasa_rendimiento ? `${selectedAccount.tasa_rendimiento}%` : '--'} icon={<TrendingUp size={14}/>} color="text-green-400" />
            )}
            {(selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && (
              <StatsCard 
                label="Alcancía Cashback" 
                // PRIVACIDAD APLICADA EN STATS
                val={<span className={privacyClass}>${Number(selectedAccount.cashback_acumulado || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>} 
                icon={<Sparkles size={14}/>} 
                color="text-purple-400" 
              />
            )}
            {selectedAccount.tipo === 'Crédito' && (
              <>
                <StatsCard 
                  label="Límite Restante" 
                  val={<span className={privacyClass}>${(selectedAccount.limite_credito - selectedAccount.saldo_actual).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>} 
                  icon={<Wallet size={14}/>} 
                  color="text-cyan-400" 
                />
                <StatsCard label="Corte/Pago" val={selectedAccount.fecha_corte ? `${selectedAccount.fecha_corte}/${selectedAccount.fecha_pago}` : '--'} icon={<AlertCircle size={14}/>} color="text-red-400" />
              </>
            )}
          </div>

          <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col max-h-150">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="text-white/30" />
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white/50">Historial de Transacciones</h3>
              </div>
              <button onClick={() => setShowMovForm(true)} className="bg-white text-black p-2.5 rounded-full hover:scale-110 transition-all"><Plus size={18} strokeWidth={3} /></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-2">
              {loadingMovs ? <p className="text-[10px] font-mono text-white/20 text-center py-20 uppercase tracking-widest animate-pulse">Analizando_Registros...</p> : 
                movimientos.length === 0 ? <p className="text-xs font-mono text-white/20 text-center py-20 border border-dashed border-white/5 rounded-3xl">Sin movimientos registrados</p> : (
                <div className="space-y-1">
                  {movimientos.map(m => {
                    const isPos = selectedAccount.tipo === 'Crédito' ? m.tipo === 'Ingreso' : m.tipo === 'Ingreso';
                    return (
                      <div key={m.id} className="flex justify-between items-center py-4 px-5 bg-white/2 border border-white/3 rounded-2xl group hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl bg-black border border-white/5 ${isPos ? 'text-green-400' : 'text-white/20'}`}>{isPos ? <ArrowDownRight size={16}/> : <ArrowUpRight size={16}/>}</div>
                          <div>
                            <p className="text-sm font-bold text-white/90">{m.descripcion}</p>
                            <div className="flex gap-3 mt-0.5">
                              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{new Date(m.fecha).toLocaleDateString(undefined, {day:'2-digit', month:'short'})}</p>
                              {/* PRIVACIDAD EN CASHBACK DEL HISTORIAL */}
                              {Number(m.cashback_generado) > 0 && <p className={`text-[9px] font-mono text-purple-400 uppercase tracking-widest ${privacyClass}`}>+{Number(m.cashback_generado).toFixed(2)} CB</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {/* PRIVACIDAD EN MONTOS DEL HISTORIAL */}
                          <p className={`font-mono font-bold text-lg ${privacyClass} ${isPos ? 'text-green-400' : 'text-white'}`}>
                            {isPos ? '+' : '-'}${Number(m.monto).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </p>
                          <button onClick={() => handleDeleteMovement(m)} className="p-2 text-white/10 group-hover:text-red-500/50 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
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

     {/* FORMULARIO PARA NUEVA CUENTA */}
      {showAccountForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#050505] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 my-auto">
            <button onClick={() => setShowAccountForm(false)} className="absolute top-8 right-8 text-white/30 hover:text-white"><X size={24} /></button>
            <h2 className="text-3xl font-bold tracking-tighter text-white mb-2">Nuevo Activo Financiero</h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mb-8 border-b border-white/5 pb-4">Configuración del Tarjetero Digital</p>
            <form onSubmit={handleSaveAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Identidad de Cuenta" placeholder="Ej. Ahorro Premium" value={accountForm.nombre_cuenta} onChange={e => setAccountForm({...accountForm, nombre_cuenta: e.target.value})} required />
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Tipo de Producto</label>
                  <select value={accountForm.tipo} onChange={e => setAccountForm({...accountForm, tipo: e.target.value})} className="w-full bg-[#111111] border border-white/10 text-white text-sm p-4 rounded-xl focus:border-white/40 outline-none appearance-none">
                    <option value="Ahorro">Cta. Ahorro</option>
                    <option value="Crédito">T. Crédito</option>
                    <option value="Débito">T. Débito</option>
                  </select>
                </div>
                <Input label="Color Estético" type="color" value={accountForm.color_tarjeta} onChange={e => setAccountForm({...accountForm, color_tarjeta: e.target.value})} className="h-13.5 p-1.5 cursor-pointer bg-[#111111]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Institución / Banco" placeholder="Ej. MultiMoney" value={accountForm.banco} onChange={e => setAccountForm({...accountForm, banco: e.target.value})} required />
                <Input 
                  label={accountForm.tipo === 'Ahorro' ? 'Nº de Cuenta Completo' : 'Últimos 4 Dígitos'} 
                  placeholder={accountForm.tipo === 'Ahorro' ? 'Ej. 0000012345678' : '4567'} 
                  maxLength={accountForm.tipo === 'Ahorro' ? '30' : '4'} 
                  value={accountForm.ultimos_digitos} 
                  onChange={e => setAccountForm({...accountForm, ultimos_digitos: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <Input label={accountForm.tipo === 'Crédito' ? 'Deuda Inicial ($)' : 'Saldo de Apertura ($)'} type="number" step="0.01" value={accountForm.saldo_actual} onChange={e => setAccountForm({...accountForm, saldo_actual: e.target.value})} required />
                {accountForm.tipo === 'Crédito' ? <Input label="Límite Autorizado ($)" type="number" value={accountForm.limite_credito} onChange={e => setAccountForm({...accountForm, limite_credito: e.target.value})} /> : 
                 accountForm.tipo === 'Ahorro' ? <Input label="Rendimiento (TEA %)" type="number" step="0.1" placeholder="Ej. 3.5" value={accountForm.tasa_rendimiento} onChange={e => setAccountForm({...accountForm, tasa_rendimiento: e.target.value})} /> : null}
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-gray-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {isSubmitting ? 'Procesando...' : 'Crear Activo Financiero'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FORMULARIO DE MOVIMIENTO (REGISTRO DE FLUJO) */}
      {showMovForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="w-full max-w-sm bg-[#050505] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowMovForm(false)} className="absolute top-8 right-8 text-white/30 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-bold tracking-tighter text-white mb-6">Registro de Flujo</h2>
            <form onSubmit={handleSaveMovement} className="space-y-5">
              <div className="flex bg-[#111111] p-1.5 rounded-2xl border border-white/5">
                {['Egreso', 'Ingreso'].map(t => (
                  <button key={t} type="button" onClick={() => setMovForm({...movForm, tipo: t})} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${movForm.tipo === t ? 'bg-white/10 text-white shadow-inner' : 'text-white/30'}`}>{t === 'Egreso' ? 'Salida' : 'Entrada'}</button>
                ))}
              </div>
              <Input label="Monto de Operación ($)" type="number" step="0.01" placeholder="0.00" autoFocus value={movForm.monto} onChange={e => setMovForm({...movForm, monto: e.target.value})} required />
              <Input label="Concepto / Descripción" placeholder="Ej. Pago Combustible" value={movForm.descripcion} onChange={e => setMovForm({...movForm, descripcion: e.target.value})} required />
              
              {(selectedAccount.tipo === 'Crédito' || selectedAccount.tipo === 'Débito') && movForm.tipo === 'Egreso' && (
                <div className="p-4 border border-purple-500/30 bg-purple-500/5 rounded-2xl animate-in fade-in duration-300">
                  <Input label="% Cashback Aplicado" type="number" step="0.1" placeholder="Ej. 1.0" value={movForm.porcentaje_cashback} onChange={e => setMovForm({...movForm, porcentaje_cashback: e.target.value})} />
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl mt-4 shadow-2xl transition-all">
                {isSubmitting ? 'Registrando...' : 'Confirmar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {isDeleting && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="p-10 bg-[#050505] border border-red-500/20 rounded-[2.5rem] space-y-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20"><AlertCircle size={32} /></div>
            <h3 className="text-xl font-bold text-white tracking-tighter uppercase">¿Eliminar Cuenta?</h3>
            <p className="text-xs text-white/40 leading-relaxed uppercase font-bold tracking-widest">Esta acción borrará todo el historial asociado.</p>
            <div className="flex gap-3 pt-4">
              <button onClick={handleDeleteAccount} disabled={isSubmitting} className="flex-1 py-4 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg">{isSubmitting ? 'Borrando...' : 'Confirmar'}</button>
              <button onClick={() => setIsDeleting(false)} className="flex-1 py-4 bg-white/5 text-white/50 font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/5">Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};