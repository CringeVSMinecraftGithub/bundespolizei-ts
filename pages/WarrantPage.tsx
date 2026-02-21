
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db } from '../firebase';
import { Warrant, IncidentReport } from '../types';
import { useAuth } from '../App';

const WarrantPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [allReports, setAllReports] = useState<IncidentReport[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDanger, setFilterDanger] = useState('Alle');
  const [filterStatus, setFilterStatus] = useState('Aktiv');
  const [selectedWarrant, setSelectedWarrant] = useState<Warrant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Warrant State
  const [newWarrant, setNewWarrant] = useState<Partial<Warrant>>({ 
    targetName: '', 
    reason: '', 
    dangerLevel: 'Mittel', 
    lastSeen: '',
    age: '',
    height: '',
    weight: '',
    hairColor: '',
    eyeColor: '',
    features: '',
    caseNumber: ''
  });
  
  const [caseSearch, setCaseSearch] = useState('');
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);

  useEffect(() => {
    const unsubWarrants = onSnapshot(query(dbCollections.warrants, orderBy("timestamp", "desc")), (snap) => {
      const ws = snap.docs.map(d => ({ id: d.id, ...d.data() } as Warrant));
      setWarrants(ws);
    });
    const unsubReports = onSnapshot(dbCollections.reports, (snap) => {
      setAllReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport)));
    });
    return () => { unsubWarrants(); unsubReports(); };
  }, []);

  const handleAdd = async () => {
    if (!newWarrant.targetName || !newWarrant.reason) {
      alert("Name und Grund sind Pflichtfelder.");
      return;
    }
    await addDoc(dbCollections.warrants, {
      ...newWarrant,
      active: true,
      timestamp: new Date().toISOString()
    });
    setIsAdding(false);
    setNewWarrant({ 
      targetName: '', reason: '', dangerLevel: 'Mittel', lastSeen: '',
      age: '', height: '', weight: '', hairColor: '', eyeColor: '', features: '', caseNumber: '' 
    });
  };

  const toggleWarrant = async (w: Warrant) => {
    await updateDoc(doc(db, "warrants", w.id), { active: !w.active });
    if (selectedWarrant?.id === w.id) {
      setSelectedWarrant({ ...selectedWarrant, active: !w.active });
    }
  };

  const filteredWarrants = warrants.filter(w => {
    const matchesSearch = w.targetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (w.caseNumber && w.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDanger = filterDanger === 'Alle' || w.dangerLevel === filterDanger;
    const matchesStatus = filterStatus === 'Alle' || (filterStatus === 'Aktiv' ? w.active : !w.active);
    return matchesSearch && matchesDanger && matchesStatus;
  });

  const filteredReports = allReports.filter(r => 
    r.reportNumber.toLowerCase().includes(caseSearch.toLowerCase()) || 
    (r.title && r.title.toLowerCase().includes(caseSearch.toLowerCase()))
  ).slice(0, 5);

  const handleOpenWarrant = (w: Warrant) => {
    setSelectedWarrant(w);
    setIsModalOpen(true);
  };

  const getDangerBadge = (level: string) => {
    switch (level) {
      case 'Extrem': return "bg-red-600 text-white";
      case 'Hoch': return "bg-red-900 text-red-200 border border-red-500";
      case 'Mittel': return "bg-amber-600/20 text-amber-500 border border-amber-500/30";
      default: return "bg-blue-600/20 text-blue-400 border border-blue-500/30";
    }
  };

  return (
    <PoliceOSWindow title="Fahndungsliste / Zugriffsberechtigungen">
      <div className="h-full flex flex-col gap-4 overflow-hidden">
        
        {/* Header & Controls */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/60 backdrop-blur-md p-4 rounded-[24px] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center text-xl">⚠️</div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Fahndungs <span className="text-red-600">Zentrale</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
                <button onClick={() => setFilterStatus('Aktiv')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Aktiv' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Aktiv</button>
                <button onClick={() => setFilterStatus('Inaktiv')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Inaktiv' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>Aufgehoben</button>
             </div>
             <button onClick={() => setIsAdding(true)} className="bg-red-700 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">+ Ausschreiben</button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2 focus-within:border-red-500 transition-all">
              <span className="text-slate-600 text-xs">🔍</span>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name oder Aktenzeichen..." className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white placeholder:text-slate-700 flex-1" />
           </div>
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Gefahrenstufe:</span>
              <select value={filterDanger} onChange={e => setFilterDanger(e.target.value)} className="bg-transparent border-none outline-none text-[9px] font-black uppercase text-white flex-1 cursor-pointer">
                 <option className="bg-slate-900" value="Alle">Alle</option>
                 <option className="bg-slate-900" value="Niedrig">Niedrig</option>
                 <option className="bg-slate-900" value="Mittel">Mittel</option>
                 <option className="bg-slate-900" value="Hoch">Hoch</option>
                 <option className="bg-slate-900" value="Extrem">Extrem</option>
              </select>
           </div>
        </div>

        {isAdding && (
          <div className="shrink-0 bg-red-950/10 border border-red-500/30 p-6 rounded-[32px] space-y-4 animate-in slide-in-from-top-4 backdrop-blur-md shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="text-red-500 animate-pulse text-lg">⚠️</span> Personenfahndung Ausschreiben
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Vollständiger Name</label>
                <input placeholder="Name der Zielperson..." className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-red-500 transition-all" value={newWarrant.targetName} onChange={e => setNewWarrant({...newWarrant, targetName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Gefahrenstufe</label>
                <select className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none" value={newWarrant.dangerLevel} onChange={e => setNewWarrant({...newWarrant, dangerLevel: e.target.value as any})}>
                  <option value="Niedrig">Niedrig</option>
                  <option value="Mittel">Mittel</option>
                  <option value="Hoch">Hoch</option>
                  <option value="Extrem">Extrem</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Zuletzt gesehen</label>
                <input placeholder="Ort / Zeit..." className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none" value={newWarrant.lastSeen} onChange={e => setNewWarrant({...newWarrant, lastSeen: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAdd} className="bg-red-700 hover:bg-red-600 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Veröffentlichen</button>
              <button onClick={() => setIsAdding(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Abbrechen</button>
            </div>
          </div>
        )}

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {filteredWarrants.map(w => (
              <div 
                key={w.id} 
                className={`bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all ${!w.active ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xl ${w.active ? 'bg-red-600/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
                    {w.dangerLevel === 'Extrem' && w.active ? '💀' : '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getDangerBadge(w.dangerLevel)}`}>{w.dangerLevel}</span>
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">#{w.caseNumber || 'N/A'}</span>
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">{new Date(w.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{w.targetName}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 truncate max-w-md">{w.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Status</div>
                    <div className={`text-[10px] font-black uppercase ${w.active ? 'text-red-500' : 'text-slate-500'}`}>{w.active ? 'Aktiv' : 'Aufgehoben'}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenWarrant(w)}
                    className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {filteredWarrants.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Fahndungen gefunden</div>
              </div>
            )}
          </div>
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedWarrant?.targetName || 'Fahndungsdetails'}
          subtitle={`Gefahrenstufe: ${selectedWarrant?.dangerLevel || 'N/A'}`}
          icon={selectedWarrant?.dangerLevel === 'Extrem' ? '💀' : '👤'}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic">Fahndungsdatenbank BTS-ZENTRALE • Letzte Aktualisierung: {new Date().toLocaleTimeString()}</div>
              <div className="flex gap-4">
                {selectedWarrant && (
                  <button onClick={() => toggleWarrant(selectedWarrant)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedWarrant.active ? 'bg-red-900/10 border-red-900 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white'}`}>
                    {selectedWarrant.active ? 'Ausschreibung aufheben' : 'Re-Aktivieren'}
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedWarrant && (
            <div className="space-y-8">
              {/* Section: Personal Characteristics */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-red-600"></span> 
                  Personenbeschreibung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Zuletzt gesehen</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedWarrant.lastSeen || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Alter</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedWarrant.age || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Größe / Gewicht</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedWarrant.height || 'N/A'} {selectedWarrant.weight ? `(${selectedWarrant.weight})` : ''}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Haare / Augen</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedWarrant.hairColor || 'N/A'} / {selectedWarrant.eyeColor || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Reason */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-red-600"></span> 
                  Fahndungsgrund / Delikte
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedWarrant.reason}
                  </div>
                </div>
              </div>

              {/* Section: Features */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-slate-600"></span> 
                  Besondere Merkmale
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner italic text-slate-400 text-sm leading-relaxed">
                  {selectedWarrant.features || 'Keine besonderen Merkmale hinterlegt.'}
                </div>
              </div>

              {/* Section: Case Link & Security */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedWarrant.caseNumber && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Verknüpfte Akte</h4>
                    <div className="bg-blue-600/5 border border-blue-500/10 p-6 rounded-xl space-y-4 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-mono font-black text-white tracking-tighter">#{selectedWarrant.caseNumber}</div>
                        <button 
                          onClick={() => navigate('/cases', { state: { selectedReportNumber: selectedWarrant.caseNumber } })}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                        >
                          Öffnen 📁
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2">Sicherheitshinweis</h4>
                  <div className="bg-red-600/5 border border-red-500/10 p-6 rounded-xl shadow-inner h-full flex items-center justify-center text-center">
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">
                      {selectedWarrant.dangerLevel === 'Extrem' ? 'Eigensicherung beachten. Zielperson gilt als bewaffnet und gefährlich.' : 'Standard-Eigensicherung gemäß PDV 100.'}
                    </p>
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

export default WarrantPage;
