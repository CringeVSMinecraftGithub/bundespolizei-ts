
import React, { useState, useEffect, useMemo } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
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
  const [selectedItem, setSelectedItem] = useState<Evidence | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
        setIsModalOpen(false);
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

  const handleOpenItem = (e: Evidence) => {
    setSelectedItem(e);
    setIsModalOpen(true);
  };

  return (
    <PoliceOSWindow title="Asservatenkammer • Beweismittelverwaltung">
      <div className="h-full flex flex-col gap-4 overflow-hidden">
        
        {/* Header & Controls */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/60 backdrop-blur-md p-4 rounded-[24px] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600/10 border border-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center text-xl">📦</div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Asservaten <span className="text-orange-500 font-bold">Kammer</span></h1>
            </div>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">Neues Beweismittel</button>
        </div>

        {/* Search & Filter Bar */}
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2 focus-within:border-orange-500 transition-all">
              <span className="text-slate-600 text-xs">🔍</span>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Aktenzeichen oder Gegenstand..." className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white placeholder:text-slate-700 flex-1" />
           </div>
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Lagerort:</span>
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white flex-1 cursor-pointer">
                 <option className="bg-slate-900" value="">Alle Orte</option>
                 {uniqueLocations.map(loc => (
                   <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
                 ))}
              </select>
           </div>
        </div>

        {isAdding && (
          <div className="shrink-0 bg-orange-950/10 border border-orange-500/30 p-6 rounded-[32px] space-y-4 animate-in slide-in-from-top-4 backdrop-blur-md shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-tighter">Beweismittel erfassen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Aktenzeichen</label>
                <input placeholder="z.B. ANZ-1234" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-orange-500 transition-all" value={newItem.caseNumber} onChange={e => setNewItem({...newItem, caseNumber: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Bezeichnung *</label>
                <input placeholder="Name des Gegenstands" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-orange-500 transition-all" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Lagerort</label>
                <input placeholder="z.B. Regal B-12" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-orange-500 transition-all" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Zeitpunkt</label>
                <input type="datetime-local" className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none [color-scheme:dark]" value={newItem.timestamp} onChange={e => setNewItem({...newItem, timestamp: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Einlagern</button>
              <button onClick={() => setIsAdding(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Abbrechen</button>
            </div>
          </div>
        )}

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {processedEvidence.map(e => (
              <div 
                key={e.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-orange-600/10 text-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl">📦</div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[7px] font-mono text-orange-500 font-bold uppercase tracking-widest">#{e.caseNumber || 'N/A'}</span>
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">{new Date(e.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{e.itemName}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Lagerort: {e.location || 'Kein Ort'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Sichergestellt von</div>
                    <div className="text-[10px] font-black text-orange-500 uppercase">{e.seizedBy || 'N/A'}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenItem(e)}
                    className="px-6 py-2.5 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {processedEvidence.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">📦</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Kein Bestand gefunden</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal for Details */}
        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedItem?.itemName || 'Beweismitteldetails'}
          subtitle={`Aktenzeichen: ${selectedItem?.caseNumber || 'N/A'}`}
          icon="📦"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">Zentrales Asservatenregister BTS-KAMMER • AES-256 Verschlüsselt</div>
              <div className="flex gap-4">
                {selectedItem && (
                  <button 
                    onClick={() => handleDelete(selectedItem.id)} 
                    className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                  >
                    🗑️ Beweismittel vernichten
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/20"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedItem && (
            <div className="space-y-8">
              {/* Section: Storage Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-orange-600"></span> 
                  Lagerinformationen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sichergestellt von</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedItem.seizedBy || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Einlagerungsdatum</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{new Date(selectedItem.timestamp).toLocaleDateString('de-DE')}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Lagerort-Sektor</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedItem.location || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Description */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-orange-600"></span> 
                  Beschreibung & Zustand
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedItem.description || 'Keine detaillierte Beschreibung hinterlegt.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DataModal>

      </div>
    </PoliceOSWindow>
  );
};

export default EvidencePage;
