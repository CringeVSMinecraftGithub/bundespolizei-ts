
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, addDoc } from '../firebase';
import { Evidence } from '../types';
import { useAuth } from '../App';

const EvidencePage: React.FC = () => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ caseNumber: '', itemName: '', description: '', location: '' });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.evidence, orderBy("timestamp", "desc")), (snap) => {
      setEvidence(snap.docs.map(d => ({ id: d.id, ...d.data() } as Evidence)));
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    if (!user) return;
    await addDoc(dbCollections.evidence, {
      ...newItem,
      seizedBy: `${user.rank} ${user.lastName}`,
      timestamp: new Date().toISOString()
    });
    setIsAdding(false);
    setNewItem({ caseNumber: '', itemName: '', description: '', location: '' });
  };

  const filtered = evidence.filter(e => 
    e.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PoliceOSWindow title="Asservatenkammer">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight">Asservaten <span className="text-orange-500 font-bold">Kammer</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Beweismittel-Datenbank Teamstadt</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20">Neues Beweismittel</button>
        </div>

        <div className="bg-[#1a1d24] border border-slate-700/50 p-6 rounded-sm flex items-center gap-4">
          <span className="text-slate-500">🔍</span>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nach Aktenzeichen oder Gegenstand suchen..." className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200" />
        </div>

        {isAdding && (
          <div className="bg-[#1f2937] border border-orange-500/30 p-8 rounded-sm space-y-6 animate-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Beweismittel erfassen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input placeholder="Aktenzeichen (z.B. ANZ-1234)" className="bg-black/40 border border-white/10 p-4 text-sm text-white outline-none" value={newItem.caseNumber} onChange={e => setNewItem({...newItem, caseNumber: e.target.value})} />
              <input placeholder="Bezeichnung (z.B. Pistole Kaliber .45)" className="bg-black/40 border border-white/10 p-4 text-sm text-white outline-none" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
              <input placeholder="Lagerort (z.B. Regal B-12)" className="bg-black/40 border border-white/10 p-4 text-sm text-white outline-none" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
              <textarea placeholder="Beschreibung / Zustand" className="bg-black/40 border border-white/10 p-4 text-sm text-white outline-none md:col-span-2 resize-none h-24" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleAdd} className="bg-orange-600 px-10 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest">Einlagern</button>
              <button onClick={() => setIsAdding(false)} className="bg-slate-700 px-10 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest">Abbrechen</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-[#1a1d24] border border-slate-700/50 rounded-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest border-b border-white/10">
              <tr>
                <th className="p-6">Aktenzeichen</th>
                <th className="p-6">Gegenstand</th>
                <th className="p-6">Lagerort</th>
                <th className="p-6">Beamter</th>
                <th className="p-6">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="p-6 font-mono text-orange-500 font-bold">{e.caseNumber}</td>
                  <td className="p-6 font-bold text-slate-200">{e.itemName}</td>
                  <td className="p-6"><span className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 border border-white/5">{e.location}</span></td>
                  <td className="p-6 text-slate-400">{e.seizedBy}</td>
                  <td className="p-6 text-slate-500 font-mono">{new Date(e.timestamp).toLocaleDateString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default EvidencePage;
