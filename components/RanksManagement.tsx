import React, { useState, useEffect } from 'react';
import { Rank } from '../types';
import { dbCollections, onSnapshot, query, setDoc, doc, db, deleteDoc, addDoc } from '../firebase';
import { POLICE_RANKS } from '../constants';

const RanksManagement: React.FC = () => {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<Partial<Rank> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.ranks), (snap) => {
      const fetchedRanks = snap.docs.map(d => ({ ...d.data(), id: d.id } as Rank));
      setRanks(fetchedRanks);
      
      if (fetchedRanks.length === 0) {
          importDefaultRanks();
      }
    });
    return () => unsub();
  }, []);

  const importDefaultRanks = async () => {
      try {
          for (const rank of POLICE_RANKS) {
              await addDoc(dbCollections.ranks, {
                  name: rank.name,
                  group: rank.group,
                  level: rank.level,
                  short: rank.short
              });
          }
          showStatus("Standard-Dienstgrade importiert.", "success");
      } catch (e) {
          console.error("Error importing default ranks", e);
      }
  };

  const showStatus = (text: string, type: 'error' | 'success' = 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const saveRank = async () => {
    if (!editingRank || !editingRank.name || !editingRank.group || editingRank.level === undefined || !editingRank.short) {
        showStatus("Bitte alle Felder ausfüllen.");
        return;
    }
    try {
      const rankData = { ...editingRank };
      if (editingRank.id) {
        await setDoc(doc(db, "ranks", editingRank.id), rankData);
      } else {
        await addDoc(dbCollections.ranks, rankData);
      }
      setIsModalOpen(false);
      setEditingRank(null);
      showStatus("Dienstgrad gespeichert.", "success");
    } catch (e) {
      showStatus("Fehler beim Speichern.");
    }
  };

  const deleteRank = async (id: string) => {
    if (confirm("Dienstgrad wirklich löschen?")) {
      try {
        await deleteDoc(doc(db, "ranks", id));
        showStatus("Dienstgrad gelöscht.", "success");
      } catch (e) {
        showStatus("Fehler beim Löschen.");
      }
    }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-2">
      {statusMsg && (
        <div className={`px-4 py-2 rounded-lg ${statusMsg.type === 'error' ? 'bg-red-900/20 text-red-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
          {statusMsg.text}
        </div>
      )}
      <div className="flex justify-between items-center bg-[#1a1c23]/50 p-4 rounded-3xl border border-white/5">
        <h2 className="text-lg font-black text-white uppercase">Dienstgrade verwalten</h2>
        <button onClick={() => { setEditingRank({ name: '', group: 'Mittlerer Dienst', level: 1, short: '' }); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Dienstgrad anlegen</button>
      </div>
      <div className="bg-[#1a1c23] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest border-b border-white/5">
            <tr>
              <th className="p-5">Name</th>
              <th className="p-5">Gruppe</th>
              <th className="p-5">Level</th>
              <th className="p-5">Kürzel</th>
              <th className="p-5 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px]">
            {ranks.sort((a, b) => a.level - b.level).map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition-all">
                <td className="p-5 font-black text-white uppercase">{r.name}</td>
                <td className="p-5 text-slate-400">{r.group}</td>
                <td className="p-5 font-mono text-blue-400 font-black">{r.level}</td>
                <td className="p-5 font-mono text-indigo-400 font-black">{r.short}</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setEditingRank(r); setIsModalOpen(true); }} className="text-blue-500 text-[10px] font-black uppercase hover:text-white transition-colors">Edit</button>
                    <button onClick={() => deleteRank(r.id)} className="text-red-500 text-[10px] font-black uppercase hover:text-white transition-colors">Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingRank && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200">
           <div className="bg-[#0a0c10] border border-white/10 p-10 rounded-[40px] w-full max-w-xl space-y-8 shadow-2xl relative">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{editingRank.id ? 'Dienstgrad editieren' : 'Neuer Dienstgrad'}</h2>
              <div className="space-y-4">
                 <input value={editingRank.name || ''} onChange={e => setEditingRank({...editingRank, name: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="Name" />
                 <select value={editingRank.group || 'Mittlerer Dienst'} onChange={e => setEditingRank({...editingRank, group: e.target.value as any})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none">
                    <option value="Höherer Dienst">Höherer Dienst</option>
                    <option value="Gehobener Dienst">Gehobener Dienst</option>
                    <option value="Mittlerer Dienst">Mittlerer Dienst</option>
                 </select>
                 <input type="number" value={editingRank.level || 1} onChange={e => setEditingRank({...editingRank, level: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="Level" />
                 <input value={editingRank.short || ''} onChange={e => setEditingRank({...editingRank, short: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none" placeholder="Kürzel" />
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={() => { setIsModalOpen(false); setStatusMsg(null); }} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Abbrechen</button>
                 <button onClick={saveRank} className="flex-2 bg-blue-600 py-4 px-10 rounded-2xl font-black uppercase text-[9px] tracking-widest text-white shadow-xl active:scale-95 transition-all">Speichern</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default RanksManagement;
