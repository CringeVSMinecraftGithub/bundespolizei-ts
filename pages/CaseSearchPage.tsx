
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';
import { IncidentReport, Reminder } from '../types';

const CaseSearchPage: React.FC = () => {
  const location = useLocation();
  const [allCases, setAllCases] = useState<IncidentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('Alle');
  const [filterType, setFilterType] = useState('Alle');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedCase, setSelectedCase] = useState<IncidentReport | null>(null);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.reports, orderBy("timestamp", "desc")), (snap) => {
      const cases = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport));
      setAllCases(cases);

      if (location.state && (location.state as any).selectedReportNumber) {
        const targetNumber = (location.state as any).selectedReportNumber;
        setSearchTerm(targetNumber);
        const targetCase = cases.find(c => c.reportNumber === targetNumber);
        if (targetCase) setSelectedCase(targetCase);
      }
    });
    return unsub;
  }, [location.state]);

  const filteredCases = allCases.filter(c => {
    const matchesSearch = 
      c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officerBadge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.applicant && c.applicant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'Alle' || c.status === filterStatus;
    const matchesType = filterType === 'Alle' || c.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleReminder = async (remId: string) => {
    if (!selectedCase) return;
    const updated = (selectedCase.reminders || []).map(r => r.id === remId ? { ...r, completed: !r.completed } : r);
    await updateDoc(doc(db, "reports", selectedCase.id), { reminders: updated });
    setSelectedCase({ ...selectedCase, reminders: updated });
  };

  return (
    <PoliceOSWindow title="Vorgangsverwaltung / Archiv">
      <div className="h-full flex flex-col gap-4 overflow-hidden">
        
        {/* Compact Search & Filter Bar */}
        <div className="shrink-0 bg-[#1a1c23]/60 backdrop-blur-md p-4 rounded-[24px] border border-white/5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center text-xl">🔍</div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tighter">Vorgangs <span className="text-blue-500">Archiv</span></h1>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center gap-3 w-64 focus-within:border-blue-500 transition-all">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Aktenzeichen / Name..." className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 px-2 placeholder:text-slate-700" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}>Filter</button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-black/30 rounded-[20px] border border-white/5 animate-in slide-in-from-top-2 duration-300 shrink-0">
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-black/40 border border-white/10 p-2 rounded-lg text-white text-[9px] uppercase font-black">
                <option value="Alle">Status: Alle</option>
                <option value="Offen">Offen</option>
                <option value="Abgeschlossen">Abgeschlossen</option>
             </select>
             <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-black/40 border border-white/10 p-2 rounded-lg text-white text-[9px] uppercase font-black">
                <option value="Alle">Typ: Alle</option>
                <option value="Einsatzbericht">Einsatzbericht</option>
                <option value="Strafanzeige">Strafanzeige</option>
             </select>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          
          {/* Results Sidebar (Condensed) */}
          <div className="w-72 flex flex-col gap-2 shrink-0">
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
              {filteredCases.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-4 border rounded-[20px] transition-all flex flex-col gap-1 relative ${selectedCase?.id === c.id ? 'bg-blue-600/10 border-blue-500/40 shadow-lg' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">#{c.reportNumber}</div>
                  <div className="text-[10px] font-black text-white uppercase truncate tracking-tight">{c.title || c.violation || 'Unbenannt'}</div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase">{c.officerName}</div>
                  {selectedCase?.id === c.id && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-xs">➔</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel (The optimized "Form Sheet") */}
          <div className="flex-1 min-w-0">
            {selectedCase ? (
              <div className="h-full flex flex-col bg-[#111317] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
                
                {/* Header: Compact & Info-Dense */}
                <div className="p-6 bg-[#1a1c23] border-b border-white/10 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-6">
                    <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-2xl flex flex-col items-center min-w-[100px]">
                      <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Aktenzeichen</span>
                      <span className="text-sm font-mono font-black text-white">{selectedCase.reportNumber}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{selectedCase.title || selectedCase.violation}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${selectedCase.type === 'Strafanzeige' ? 'text-orange-400 border-orange-400/20' : 'text-blue-400 border-blue-400/20'}`}>{selectedCase.type}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase">{new Date(selectedCase.timestamp).toLocaleString('de-DE')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Signature integrated in Header */}
                  <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                    <div className="text-right">
                       <div className="text-[8px] font-black text-slate-600 uppercase">Zuständiger Beamter</div>
                       <div className="text-[10px] font-black text-white uppercase">{selectedCase.officerName}</div>
                       <div className="text-[8px] font-bold text-blue-500/60 uppercase">{selectedCase.officerBadge}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                      👮
                    </div>
                  </div>
                </div>

                {/* Main Content Area: Compact Matrix View */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0a0c10]">
                  
                  {/* The Fact Sheet Grid - Everything at a glance */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                     <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Ereignisort</div>
                        <div className="text-[10px] font-bold text-slate-200 uppercase truncate">{selectedCase.location || 'N/A'}</div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Einsatzzeit</div>
                        <div className="text-[10px] font-bold text-slate-200 uppercase">{selectedCase.incidentTime || '--:--'} {selectedCase.incidentEnd ? `bis ${selectedCase.incidentEnd}` : ''}</div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status / Priorität</div>
                        <div className="flex items-center gap-2">
                           <div className="text-[10px] font-black text-blue-500 uppercase">{selectedCase.status}</div>
                           <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                           <div className="text-[10px] font-black text-slate-400 uppercase">LVL {selectedCase.securityLevel || '0'}</div>
                        </div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Kräfte / Einheiten</div>
                        <div className="text-[10px] font-bold text-slate-200 uppercase truncate">{selectedCase.involvedUnits || 'N/A'}</div>
                     </div>

                     {/* Second Row of Metadata */}
                     <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1 col-span-2">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Involvierte Personen / Zeugen</div>
                        <div className="text-[10px] font-medium text-slate-300 truncate">{selectedCase.witnesses || selectedCase.applicant || 'Keine Angaben'}</div>
                     </div>
                     {selectedCase.type === 'Strafanzeige' ? (
                       <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1 col-span-2">
                          <div className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Beweismittel / Schadenswert</div>
                          <div className="text-[10px] font-medium text-slate-300 truncate">{selectedCase.evidenceList || 'Keine'} {selectedCase.propertyValue ? `| Wert: ${selectedCase.propertyValue}` : ''}</div>
                       </div>
                     ) : (
                       <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 space-y-1 col-span-2">
                          <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Maßnahmen & Ergebnis</div>
                          <div className="text-[10px] font-medium text-slate-300 truncate">{selectedCase.measures || 'N/A'} ➔ {selectedCase.result || 'Offen'}</div>
                       </div>
                     )}
                  </div>

                  {/* Main Content Area: 2-Column for longer Text vs Notes */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                     
                     {/* The Documentation (Sachverhalt) - High Readability */}
                     <div className="xl:col-span-2 space-y-3">
                        <h4 className="text-[9px] font-black text-white uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                           <span className="w-4 h-0.5 bg-blue-600"></span> 
                           Dokumentierter Sachverhalt
                        </h4>
                        <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-[32px] shadow-inner">
                           <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              {selectedCase.content || selectedCase.incidentDetails || 'Kein Text hinterlegt.'}
                           </div>
                        </div>
                     </div>

                     {/* Side Sidebar: Internals & Tasks */}
                     <div className="space-y-6">
                        
                        {/* Tasks / Reminders */}
                        <div className="bg-blue-600/5 border border-blue-500/10 p-6 rounded-[28px] space-y-4 shadow-inner">
                           <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Wiedervorlage</h4>
                           <div className="space-y-2">
                              {(selectedCase.reminders || []).map(r => (
                                <button key={r.id} onClick={() => toggleReminder(r.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${r.completed ? 'bg-black/20 border-white/5 opacity-50' : 'bg-blue-600/10 border-blue-500/20'}`}>
                                   <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>{r.completed && '✓'}</div>
                                   <div className="text-left flex-1 min-w-0">
                                      <div className={`text-[10px] font-bold uppercase truncate ${r.completed ? 'line-through' : 'text-white'}`}>{r.text}</div>
                                      <div className="text-[7px] text-slate-500 font-black">{new Date(r.dueDate).toLocaleDateString('de-DE')}</div>
                                   </div>
                                </button>
                              ))}
                              {(!selectedCase.reminders || selectedCase.reminders.length === 0) && (
                                <div className="text-[9px] font-bold text-slate-600 uppercase text-center py-4 italic">Keine Aufgaben</div>
                              )}
                           </div>
                        </div>

                        {/* Internal Notes */}
                        <div className="bg-black/30 border border-white/5 p-6 rounded-[28px] space-y-4 shadow-inner">
                           <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Dienstliche Notizen</h4>
                           <div className="text-[10px] text-slate-400 italic leading-relaxed whitespace-pre-wrap">
                              {selectedCase.notes || 'Keine internen Notizen vorhanden.'}
                           </div>
                        </div>
                        
                        {/* Download / Print */}
                        <button onClick={() => window.print()} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl">
                           <span>🖨️</span> Dossier Exportieren
                        </button>
                     </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="h-10 bg-black/60 border-t border-white/5 flex items-center justify-between px-8 shrink-0">
                   <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Datenbank-Synchronisiert am {new Date().toLocaleTimeString()} • AES-256 Active</div>
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[8px] font-black text-slate-600 uppercase">Systemzugriff gesichert</span>
                   </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[32px] p-20 text-center space-y-4 opacity-20">
                 <div className="text-5xl animate-pulse">📂</div>
                 <div className="text-slate-600 font-black uppercase tracking-widest text-xs">Vorgang auswählen um Details anzuzeigen</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CaseSearchPage;
