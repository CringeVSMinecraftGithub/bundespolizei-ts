
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';
import { IncidentReport, Reminder } from '../types';

const CaseSearchPage: React.FC = () => {
  const [allCases, setAllCases] = useState<IncidentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('Alle');
  const [filterType, setFilterType] = useState('Alle');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedCase, setSelectedCase] = useState<IncidentReport | null>(null);

  // Reminder Input States
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.reports, orderBy("timestamp", "desc")), (snap) => {
      setAllCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport)));
    });
    return unsub;
  }, []);

  const filteredCases = allCases.filter(c => {
    const matchesSearch = 
      c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officerBadge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.applicant && c.applicant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const caseTime = new Date(c.timestamp).getTime();
    const matchesStartDate = !filterStartDate || caseTime >= new Date(filterStartDate).getTime();
    const matchesEndDate = !filterEndDate || caseTime <= new Date(filterEndDate).getTime() + 86400000;
    
    const matchesStatus = filterStatus === 'Alle' || c.status === filterStatus;
    const matchesType = filterType === 'Alle' || c.type === filterType;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus && matchesType;
  });

  const addReminder = async () => {
    if (!selectedCase || !newReminderText || !newReminderDate) return;
    const newRem: Reminder = { id: `rem-${Date.now()}`, text: newReminderText, dueDate: newReminderDate, completed: false };
    const updatedReminders = [...(selectedCase.reminders || []), newRem];
    try {
      await updateDoc(doc(db, "reports", selectedCase.id), { reminders: updatedReminders });
      setSelectedCase({ ...selectedCase, reminders: updatedReminders });
      setNewReminderText('');
      setNewReminderDate('');
    } catch (e) { console.error(e); }
  };

  const toggleReminder = async (remId: string) => {
    if (!selectedCase) return;
    const updated = (selectedCase.reminders || []).map(r => r.id === remId ? { ...r, completed: !r.completed } : r);
    await updateDoc(doc(db, "reports", selectedCase.id), { reminders: updated });
    setSelectedCase({ ...selectedCase, reminders: updated });
  };

  const deleteReminder = async (remId: string) => {
    if (!selectedCase) return;
    const updated = (selectedCase.reminders || []).filter(r => r.id !== remId);
    await updateDoc(doc(db, "reports", selectedCase.id), { reminders: updated });
    setSelectedCase({ ...selectedCase, reminders: updated });
  };

  return (
    <PoliceOSWindow title="Vorgangsverwaltung / Archiv">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Compact Search & Filter Bar */}
        <div className="shrink-0 bg-[#1a1c23]/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center text-xl">📁</div>
              <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Vorgangs <span className="text-blue-500">Archiv</span></h1>
            </div>
            <div className="flex gap-2">
               <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center gap-3 w-64 focus-within:border-blue-500 transition-all">
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Aktenzeichen / Titel..." className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 px-2 placeholder:text-slate-700" />
               </div>
               <button 
                 onClick={() => setShowFilters(!showFilters)}
                 className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
               >
                 Filter {showFilters ? '▲' : '▼'}
               </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-black/30 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Von</label>
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white text-[10px] [color-scheme:dark] outline-none" />
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Bis</label>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white text-[10px] [color-scheme:dark] outline-none" />
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white text-[10px] outline-none">
                    <option className="bg-slate-900">Alle</option>
                    <option className="bg-slate-900">Offen</option>
                    <option className="bg-slate-900">Abgeschlossen</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Typ</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white text-[10px] outline-none">
                    <option className="bg-slate-900">Alle</option>
                    <option className="bg-slate-900">Einsatzbericht</option>
                    <option className="bg-slate-900">Strafanzeige</option>
                  </select>
               </div>
            </div>
          )}
        </div>

        {/* Main Split View */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* List Panel */}
          <div className="w-80 flex flex-col gap-3 shrink-0">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Ergebnisse ({filteredCases.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {filteredCases.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-4 border rounded-2xl transition-all flex flex-col gap-2 ${selectedCase?.id === c.id ? 'bg-blue-600/10 border-blue-500/40' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${c.type === 'Einsatzbericht' ? 'text-blue-400 border-blue-400/30' : 'text-orange-400 border-orange-400/30'}`}>{c.type}</span>
                    <span className="text-[8px] font-mono text-slate-700">{c.reportNumber}</span>
                  </div>
                  <div className="text-[11px] font-black text-white uppercase truncate">{c.title || c.violation || 'Unbenannt'}</div>
                  <div className="flex justify-between items-center text-[8px] font-bold text-slate-500">
                    <span className="truncate max-w-[100px]">{c.officerName}</span>
                    <span>{new Date(c.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          <div className="flex-1 min-w-0">
            {selectedCase ? (
              <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[32px] border border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                
                {/* Fixed Details Top Bar */}
                <div className="p-8 border-b border-white/10 shrink-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase">{selectedCase.type}</span>
                        <span className="text-[8px] font-mono text-slate-600">{selectedCase.reportNumber}</span>
                      </div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedCase.title || selectedCase.violation}</h2>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black text-white uppercase">{selectedCase.officerName}</div>
                       <div className="text-[8px] text-blue-500 font-mono mt-1">{selectedCase.officerBadge}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Einsatzort</div>
                        <div className="text-[10px] font-bold text-slate-200 truncate">{selectedCase.location || 'N/A'}</div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
                        <div className="text-[10px] font-bold text-blue-400 uppercase">{selectedCase.status}</div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Erstellt am</div>
                        <div className="text-[10px] font-bold text-slate-200">{new Date(selectedCase.timestamp).toLocaleString('de-DE')}</div>
                     </div>
                  </div>
                </div>

                {/* Details Content Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] border-l-2 border-blue-500 pl-3">Dokumentation</h4>
                      <div className="bg-black/40 p-6 border border-white/5 rounded-2xl text-slate-300 text-xs leading-relaxed whitespace-pre-wrap min-h-[200px]" dangerouslySetInnerHTML={{ __html: selectedCase.content || selectedCase.incidentDetails || 'Keine Daten vorhanden' }}></div>
                    </div>

                    <div className="space-y-6">
                       <div className="bg-blue-600/5 p-6 rounded-2xl border border-blue-500/10 space-y-4">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Wiedervorlage</h4>
                          <div className="flex gap-2">
                             <input value={newReminderText} onChange={e => setNewReminderText(e.target.value)} placeholder="Aufgabe..." className="flex-1 bg-black/40 border border-white/10 p-2 rounded-lg text-[9px] text-white uppercase font-black outline-none" />
                             <input type="date" value={newReminderDate} onChange={e => setNewReminderDate(e.target.value)} className="bg-black/40 border border-white/10 p-2 rounded-lg text-[9px] text-white outline-none" />
                             <button onClick={addReminder} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase">OK</button>
                          </div>
                          <div className="space-y-2 mt-4">
                             {(selectedCase.reminders || []).map(r => (
                               <div key={r.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-white/5">
                                  <button onClick={() => toggleReminder(r.id)} className={`w-4 h-4 rounded border text-[10px] flex items-center justify-center ${r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>{r.completed && '✓'}</button>
                                  <div className="flex-1 min-w-0">
                                     <div className={`text-[10px] font-bold uppercase truncate ${r.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>{r.text}</div>
                                  </div>
                                  <button onClick={() => deleteReminder(r.id)} className="text-slate-700 hover:text-red-500">✕</button>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-2">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Interne Notizen</h4>
                          <textarea 
                             className="w-full bg-transparent border-none text-[10px] text-slate-400 leading-relaxed outline-none resize-none h-20 italic"
                             placeholder="Zusätzliche Vermerke..."
                             defaultValue={selectedCase.notes}
                             onBlur={async (e) => await updateDoc(doc(db, "reports", selectedCase.id), { notes: e.target.value })}
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center shrink-0 bg-black/20">
                   <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sicherheitsfreigabe Stufe {selectedCase.securityLevel || '0'}</div>
                   <button onClick={() => window.print()} className="bg-white/5 hover:bg-white/10 text-slate-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">Exportieren</button>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[32px] p-20 text-center space-y-4">
                 <div className="text-4xl opacity-20">📂</div>
                 <div className="text-slate-600 font-black uppercase tracking-widest text-[10px]">Wählen Sie eine Akte</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CaseSearchPage;
