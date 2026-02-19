
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
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
  const [expandedWarrant, setExpandedWarrant] = useState<string | null>(null);

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
      setWarrants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warrant)));
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

  const getDangerStyles = (level: string, active: boolean) => {
    if (!active) return "border-slate-800 opacity-60";
    switch (level) {
      case 'Extrem': return "border-red-600 bg-red-900/10 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-pulse-subtle";
      case 'Hoch': return "border-red-500 bg-red-950/5";
      case 'Mittel': return "border-amber-500/50 bg-amber-900/5";
      case 'Niedrig': return "border-blue-500/30 bg-blue-900/5";
      default: return "border-slate-800";
    }
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
    <PoliceOSWindow title="Fahndungsliste">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/10 pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase">Fahndung <span className="text-red-600">Zentrale</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Aktive Zugriffsberechtigungen & Haftbefehle</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex bg-black/40 border border-white/5 p-1.5 rounded-2xl">
                <button onClick={() => setFilterStatus('Aktiv')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Aktiv' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Aktiv</button>
                <button onClick={() => setFilterStatus('Inaktiv')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Inaktiv' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>Aufgehoben</button>
                <button onClick={() => setFilterStatus('Alle')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Alle' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500'}`}>Alle</button>
             </div>
             <button onClick={() => setIsAdding(true)} className="bg-red-700 hover:bg-red-600 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-red-900/30 active:scale-95">+ Fahndung ausschreiben</button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#1a1c23]/60 p-6 rounded-3xl border border-white/5 shadow-xl">
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl px-5 py-3 focus-within:border-red-500 transition-all">
              <span className="text-slate-600">🔍</span>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name oder Aktenzeichen..." className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-white placeholder:text-slate-700 flex-1" />
           </div>
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl px-5 py-3">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Gefahrenstufe:</span>
              <select value={filterDanger} onChange={e => setFilterDanger(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-white flex-1 cursor-pointer">
                 <option className="bg-slate-900" value="Alle">Alle Stufen</option>
                 <option className="bg-slate-900" value="Niedrig">Niedrig</option>
                 <option className="bg-slate-900" value="Mittel">Mittel</option>
                 <option className="bg-slate-900" value="Hoch">Hoch</option>
                 <option className="bg-slate-900" value="Extrem">Extrem</option>
              </select>
           </div>
           <div className="flex items-center justify-end">
              <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">{filteredWarrants.length} Einträge gefunden</span>
           </div>
        </div>

        {isAdding && (
          <div className="bg-red-950/10 border border-red-500/30 p-10 rounded-[40px] space-y-8 animate-in slide-in-from-top-4 backdrop-blur-md shadow-2xl">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              <span className="text-red-500 animate-pulse text-3xl">⚠️</span> Personenfahndung Ausschreiben
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Vollständiger Name</label>
                <input placeholder="Name der Zielperson..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-red-500 transition-all" value={newWarrant.targetName} onChange={e => setNewWarrant({...newWarrant, targetName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Gefahrenstufe</label>
                <select className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-white outline-none" value={newWarrant.dangerLevel} onChange={e => setNewWarrant({...newWarrant, dangerLevel: e.target.value as any})}>
                  <option value="Niedrig">Niedrig</option>
                  <option value="Mittel">Mittel</option>
                  <option value="Hoch">Hoch</option>
                  <option value="Extrem">Extrem (Schusswaffengebrauch möglich)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Zuletzt gesehen</label>
                <input placeholder="Ort / Zeit..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-white outline-none" value={newWarrant.lastSeen} onChange={e => setNewWarrant({...newWarrant, lastSeen: e.target.value})} />
              </div>

              {/* Physical Details */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Alter</label>
                <input placeholder="ca. 25 Jahre" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-white outline-none" value={newWarrant.age} onChange={e => setNewWarrant({...newWarrant, age: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Größe/Gewicht</label>
                <input placeholder="180cm, 85kg" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-white outline-none" value={newWarrant.height} onChange={e => setNewWarrant({...newWarrant, height: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Haarfarbe</label>
                <input placeholder="z.B. Blond, Glatze" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-white outline-none" value={newWarrant.hairColor} onChange={e => setNewWarrant({...newWarrant, hairColor: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Augenfarbe</label>
                <input placeholder="z.B. Blau" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-white outline-none" value={newWarrant.eyeColor} onChange={e => setNewWarrant({...newWarrant, eyeColor: e.target.value})} />
              </div>

              <div className="lg:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Besondere Merkmale</label>
                <input placeholder="Tattoos, Narben, Brille..." className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-white outline-none" value={newWarrant.features} onChange={e => setNewWarrant({...newWarrant, features: e.target.value})} />
              </div>

              <div className="lg:col-span-2 space-y-2 relative">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Aktenzeichen Verknüpfung</label>
                <div className="flex bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
                  <span className="p-4 text-slate-600">📁</span>
                  <input 
                    placeholder="Suchen..." 
                    className="bg-transparent p-4 text-xs text-white outline-none flex-1 font-mono" 
                    value={newWarrant.caseNumber || caseSearch} 
                    onFocus={() => setShowCaseDropdown(true)}
                    onChange={e => {
                      setCaseSearch(e.target.value);
                      if (!e.target.value) setNewWarrant({...newWarrant, caseNumber: ''});
                    }} 
                  />
                </div>
                {showCaseDropdown && caseSearch && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredReports.map(r => (
                      <button 
                        key={r.id} 
                        onClick={() => {
                          setNewWarrant({...newWarrant, caseNumber: r.reportNumber});
                          setCaseSearch(r.reportNumber);
                          setShowCaseDropdown(false);
                        }} 
                        className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 flex flex-col gap-1 transition-colors"
                      >
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{r.reportNumber}</div>
                        <div className="text-[11px] font-bold text-white truncate">{r.title || r.violation}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Fahndungsgrund / Delikte</label>
                <textarea placeholder="Detaillierte Schilderung der vorgeworfenen Taten..." className="w-full bg-black/60 border border-white/10 p-6 rounded-2xl text-sm text-white outline-none resize-none h-32 focus:border-red-500 transition-all" value={newWarrant.reason} onChange={e => setNewWarrant({...newWarrant, reason: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleAdd} className="bg-red-700 hover:bg-red-600 text-white px-16 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">Eintrag Veröffentlichen</button>
              <button onClick={() => setIsAdding(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">Abbrechen</button>
            </div>
          </div>
        )}

        {/* Warrant List */}
        <div className="space-y-4">
          {filteredWarrants.map(w => {
            const isExpanded = expandedWarrant === w.id;
            return (
              <div key={w.id} className={`bg-[#1a1c23]/80 border-2 rounded-[32px] overflow-hidden transition-all duration-300 ${getDangerStyles(w.dangerLevel, w.active)}`}>
                <div className="p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                  <div className="flex gap-8 items-center flex-1">
                     <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl shrink-0 ${w.active ? 'bg-black/60' : 'bg-slate-800'}`}>
                        {w.dangerLevel === 'Extrem' && w.active ? '💀' : '👤'}
                     </div>
                     <div className="space-y-1">
                       <div className="flex items-center flex-wrap gap-4">
                         <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{w.targetName}</h2>
                         <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getDangerBadge(w.dangerLevel)}`}>
                           {w.dangerLevel}
                         </span>
                         {w.caseNumber && (
                           <span className="text-[8px] font-black bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 uppercase font-mono">
                             #{w.caseNumber}
                           </span>
                         )}
                       </div>
                       <div className="text-sm text-slate-400 font-bold line-clamp-1 max-w-2xl">{w.reason}</div>
                       <div className="flex items-center gap-6 mt-3">
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Zuletzt gesehen:</span>
                             <span className="text-[10px] text-slate-300 font-bold uppercase">{w.lastSeen}</span>
                          </div>
                          <button 
                            onClick={() => setExpandedWarrant(isExpanded ? null : w.id)} 
                            className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors"
                          >
                            {isExpanded ? 'Details ausblenden ▲' : 'Details einblenden ▼'}
                          </button>
                       </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {w.caseNumber && (
                      <button 
                        onClick={() => navigate('/cases', { state: { selectedReportNumber: w.caseNumber } })}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                      >
                        Vorgang öffnen 📁
                      </button>
                    )}
                    <button onClick={() => toggleWarrant(w)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${w.active ? 'bg-red-900/10 border-red-900 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white'}`}>
                      {w.active ? 'Ausschreibung aufheben' : 'Re-Aktivieren'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-black/40 p-8 rounded-3xl border border-white/5">
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Alter</div>
                          <div className="text-xs font-bold text-white uppercase">{w.age || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Größe/Gewicht</div>
                          <div className="text-xs font-bold text-white uppercase">{w.height || 'N/A'} {w.weight ? `(${w.weight})` : ''}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Haare / Augen</div>
                          <div className="text-xs font-bold text-white uppercase">{w.hairColor || 'N/A'} / {w.eyeColor || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Aktenzeichen</div>
                          <div className="text-xs font-bold text-blue-500 font-mono">{w.caseNumber || 'Keine Akte'}</div>
                        </div>
                        <div className="md:col-span-2 space-y-1 pt-4 border-t border-white/5">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Besondere Merkmale</div>
                          <div className="text-xs font-bold text-slate-300 italic">{w.features || 'Keine besonderen Merkmale hinterlegt'}</div>
                        </div>
                        <div className="md:col-span-2 space-y-1 pt-4 border-t border-white/5">
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vollständiger Grund</div>
                          <div className="text-xs font-medium text-slate-300 leading-relaxed">{w.reason}</div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredWarrants.length === 0 && (
            <div className="py-32 text-center space-y-6 opacity-20 grayscale">
               <div className="text-8xl">🔍</div>
               <div className="text-xl font-black uppercase tracking-widest">Keine Übereinstimmungen im Archiv</div>
            </div>
          )}
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default WarrantPage;
