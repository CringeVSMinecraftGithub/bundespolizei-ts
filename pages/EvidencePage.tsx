
import React, { useState, useEffect, useMemo } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, db } from '../firebase';
import { Evidence } from '../types';
import { useAuth } from '../App';

type SortKey = 'caseNumber' | 'itemName' | 'timestamp';
type SortOrder = 'asc' | 'desc';

const EvidencePage: React.FC = () => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'timestamp', order: 'desc' });
  const [isAdding, setIsAdding] = useState(false);
  
  const initialTimestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).replace(' ', 'T').slice(0, 16);
  const [newItem, setNewItem] = useState({ 
    caseNumber: '', 
    itemName: '', 
    description: '', 
    location: '',
    timestamp: initialTimestamp
  });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.evidence, orderBy("timestamp", "desc")), (snap) => {
      setEvidence(snap.docs.map(d => ({ id: d.id, ...d.data() } as Evidence)));
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    if (!user) return;
    if (!newItem.itemName.trim()) {
      alert("Die Bezeichnung des Gegenstands ist ein Pflichtfeld.");
      return;
    }

    try {
      await addDoc(dbCollections.evidence, {
        ...newItem,
        seizedBy: `${user.rank} ${user.lastName}`,
        timestamp: new Date(newItem.timestamp).toISOString()
      });
      setIsAdding(false);
      setNewItem({ 
        caseNumber: '', 
        itemName: '', 
        description: '', 
        location: '', 
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).replace(' ', 'T').slice(0, 16)
      });
    } catch (e) {
      console.error(e);
      alert("Fehler beim Speichern in der Datenbank.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Beweismittel unwiderruflich löschen möchten?")) {
      try {
        await deleteDoc(doc(db, "evidence", id));
      } catch (e) {
        console.error(e);
        alert("Fehler beim Löschen des Datensatzes.");
      }
    }
  };

  const toggleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const processedEvidence = useMemo(() => {
    let result = evidence.filter(e => 
      (e.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
       e.itemName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (locationFilter === '' || e.location.toLowerCase().includes(locationFilter.toLowerCase()))
    );

    result.sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      
      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [evidence, searchTerm, locationFilter, sortConfig]);

  const uniqueLocations = useMemo(() => {
    const locs = Array.from(new Set(evidence.map(e => e.location).filter(Boolean)));
    return locs.sort();
  }, [evidence]);

  return (
    <PoliceOSWindow title="Asservatenkammer">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight uppercase">Asservaten <span className="text-orange-500 font-bold">Kammer</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Beweismittel-Datenbank Teamstadt</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20">Neues Beweismittel</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 bg-[#1a1d24] border border-slate-700/50 p-6 rounded-sm flex items-center gap-4">
            <span className="text-slate-500">🔍</span>
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Nach Aktenzeichen oder Gegenstand suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200" 
            />
          </div>
          <div className="bg-[#1a1d24] border border-slate-700/50 p-6 rounded-sm flex items-center gap-4">
             <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Lagerort:</span>
             <select 
               value={locationFilter} 
               onChange={e => setLocationFilter(e.target.value)}
               className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 cursor-pointer"
             >
                <option value="" className="bg-slate-900">Alle Orte</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
                ))}
             </select>
          </div>
        </div>

        {isAdding && (
          <div className="bg-[#1f2937] border border-orange-500/30 p-8 rounded-sm space-y-6 animate-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Beweismittel erfassen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Aktenzeichen</label>
                <input placeholder="z.B. ANZ-1234" className="w-full bg-black/40 border border-white/10 p-4 text-sm text-white outline-none focus:border-orange-500 transition-all" value={newItem.caseNumber} onChange={e => setNewItem({...newItem, caseNumber: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Bezeichnung *</label>
                <input placeholder="Name des Gegenstands" className="w-full bg-black/40 border border-white/10 p-4 text-sm text-white outline-none focus:border-orange-500 transition-all" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Lagerort</label>
                <input placeholder="z.B. Regal B-12" className="w-full bg-black/40 border border-white/10 p-4 text-sm text-white outline-none focus:border-orange-500 transition-all" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Zeitpunkt der Sicherstellung</label>
                <input type="datetime-local" className="w-full bg-black/40 border border-white/10 p-4 text-sm text-white outline-none [color-scheme:dark] focus:border-orange-500 transition-all" value={newItem.timestamp} onChange={e => setNewItem({...newItem, timestamp: e.target.value})} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Beschreibung / Zustand</label>
                <textarea placeholder="Detaillierte Angaben zum Zustand des Gegenstands..." className="w-full bg-black/40 border border-white/10 p-4 text-sm text-white outline-none resize-none h-24 focus:border-orange-500 transition-all" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-500 px-10 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-950/20 active:scale-95">Einlagern</button>
              <button onClick={() => setIsAdding(false)} className="bg-slate-700 hover:bg-slate-600 px-10 py-3 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">Abbrechen</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-[#1a1d24] border border-slate-700/50 rounded-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 text-slate-500 uppercase font-black tracking-widest border-b border-white/10 select-none">
              <tr>
                <th className="p-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('caseNumber')}>
                  Aktenzeichen {sortConfig.key === 'caseNumber' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('itemName')}>
                  Gegenstand {sortConfig.key === 'itemName' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6">Lagerort</th>
                <th className="p-6">Beamter</th>
                <th className="p-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('timestamp')}>
                  Datum {sortConfig.key === 'timestamp' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processedEvidence.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="p-6 font-mono text-orange-500 font-bold">{e.caseNumber || 'N/A'}</td>
                  <td className="p-6 font-bold text-slate-200">{e.itemName}</td>
                  <td className="p-6">
                    <span className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 border border-white/5 uppercase font-black tracking-widest">
                      {e.location || 'UNBEKANNT'}
                    </span>
                  </td>
                  <td className="p-6 text-slate-400">{e.seizedBy}</td>
                  <td className="p-6 text-slate-500 font-mono">
                    {new Date(e.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleDelete(e.id)} 
                      className="text-red-500/50 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10"
                      title="Eintrag löschen"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {processedEvidence.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-600 italic uppercase tracking-widest text-[10px]">
                    Keine entsprechenden Beweismittel in der Datenbank gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default EvidencePage;
