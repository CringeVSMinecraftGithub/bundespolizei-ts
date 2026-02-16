
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db } from '../firebase';
import { Warrant } from '../types';
import { useAuth } from '../App';

const WarrantPage: React.FC = () => {
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newWarrant, setNewWarrant] = useState<Partial<Warrant>>({ targetName: '', reason: '', dangerLevel: 'Mittel', lastSeen: '' });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.warrants, orderBy("timestamp", "desc")), (snap) => {
      setWarrants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warrant)));
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    await addDoc(dbCollections.warrants, {
      ...newWarrant,
      active: true,
      timestamp: new Date().toISOString()
    });
    setIsAdding(false);
    setNewWarrant({ targetName: '', reason: '', dangerLevel: 'Mittel', lastSeen: '' });
  };

  const toggleWarrant = async (w: Warrant) => {
    await updateDoc(doc(db, "warrants", w.id), { active: !w.active });
  };

  return (
    <PoliceOSWindow title="Fahndungsliste">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end border-b border-red-500/30 pb-6">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Fahndung <span className="text-red-600">Teamstadt</span></h1>
            <p className="text-[10px] text-red-500/70 font-black uppercase tracking-[0.3em] mt-2">Aktive Zugriffsberechtigungen & Haftbefehle</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-red-700 hover:bg-red-600 text-white px-8 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all">Fahndung ausschreiben</button>
        </div>

        {isAdding && (
          <div className="bg-red-950/10 border border-red-500/30 p-8 rounded-sm space-y-6 animate-in slide-in-from-top-4 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter flex items-center gap-3"><span className="text-red-500 animate-pulse">⚠️</span> Neue Personenfahndung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input placeholder="Vollständiger Name der Zielperson" className="bg-black/60 border border-white/10 p-4 text-sm text-white outline-none" value={newWarrant.targetName} onChange={e => setNewWarrant({...newWarrant, targetName: e.target.value})} />
              <select className="bg-black/60 border border-white/10 p-4 text-sm text-white outline-none" value={newWarrant.dangerLevel} onChange={e => setNewWarrant({...newWarrant, dangerLevel: e.target.value as any})}>
                <option value="Niedrig">Gefahrenstufe: NIEDRIG</option>
                <option value="Mittel">Gefahrenstufe: MITTEL</option>
                <option value="Hoch">Gefahrenstufe: HOCH</option>
                <option value="Extrem">Gefahrenstufe: EXTREM</option>
              </select>
              <input placeholder="Zuletzt gesehen (Ort/Zeit)" className="bg-black/60 border border-white/10 p-4 text-sm text-white outline-none" value={newWarrant.lastSeen} onChange={e => setNewWarrant({...newWarrant, lastSeen: e.target.value})} />
              <textarea placeholder="Fahndungsgrund / Delikte" className="bg-black/60 border border-white/10 p-4 text-sm text-white outline-none md:col-span-2 resize-none h-24" value={newWarrant.reason} onChange={e => setNewWarrant({...newWarrant, reason: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleAdd} className="bg-red-700 px-12 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest">Eintrag veröffentlichen</button>
              <button onClick={() => setIsAdding(false)} className="bg-slate-700 px-12 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest">Abbrechen</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {warrants.map(w => (
            <div key={w.id} className={`bg-[#1a1c23] border ${w.active ? 'border-red-950' : 'border-slate-800'} rounded-sm p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all`}>
              <div className="flex gap-8 items-center">
                 <div className={`w-16 h-16 rounded-sm flex items-center justify-center text-3xl ${w.active ? 'bg-red-900/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>👤</div>
                 <div className="space-y-1">
                   <div className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                     {w.targetName}
                     <span className={`text-[9px] px-2 py-0.5 rounded-full border ${w.dangerLevel === 'Extrem' ? 'bg-red-600 border-red-400 text-white' : 'bg-red-900/20 border-red-900 text-red-500'}`}>{w.dangerLevel}</span>
                   </div>
                   <div className="text-xs text-slate-400 max-w-xl">{w.reason}</div>
                   <div className="text-[10px] text-slate-500 italic mt-2">Zuletzt gesehen: {w.lastSeen}</div>
                 </div>
              </div>
              
              <div className="text-right space-y-4">
                <div className="text-[9px] text-slate-600 font-mono">{new Date(w.timestamp).toLocaleString('de-DE')}</div>
                <button onClick={() => toggleWarrant(w)} className={`px-6 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest border transition-all ${w.active ? 'bg-red-900/10 border-red-900 text-red-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-red-600 hover:text-white'}`}>
                  {w.active ? 'AUFGEHOBEN' : 'AKTIVIEREN'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default WarrantPage;
