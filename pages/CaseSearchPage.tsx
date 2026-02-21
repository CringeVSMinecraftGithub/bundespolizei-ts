
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        if (targetCase) {
          setSelectedCase(targetCase);
          setIsModalOpen(true);
        }
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

  const handleOpenCase = (c: IncidentReport) => {
    setSelectedCase(c);
    setIsModalOpen(true);
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

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {filteredCases.map(c => (
              <div 
                key={c.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center text-2xl">📁</div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">#{c.reportNumber}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${c.type === 'Strafanzeige' ? 'text-orange-400 border-orange-400/20' : 'text-blue-400 border-blue-400/20'}`}>{c.type}</span>
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">{new Date(c.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{c.title || c.violation || 'Unbenannt'}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Beamter: {c.officerName} ({c.officerBadge})</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Status</div>
                    <div className="text-[10px] font-black text-blue-500 uppercase">{c.status}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenCase(c)}
                    className="px-6 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {filteredCases.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">📂</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Vorgänge gefunden</div>
              </div>
            )}
          </div>
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedCase?.title || selectedCase?.violation || 'Vorgangsdetails'}
          subtitle={`Aktenzeichen: ${selectedCase?.reportNumber || 'N/A'}`}
          icon={selectedCase?.type === 'Strafanzeige' ? '⚖️' : '🚔'}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Datenbank-Synchronisiert am {new Date().toLocaleTimeString()} • AES-256 Active</div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all active:scale-95 flex items-center gap-2">
                  <span>🖨️</span> Dossier Exportieren
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedCase && (
            <div className="space-y-8">
              {/* Section: Basic Information */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Stammdaten & Einsatzdetails
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Ereignisort</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedCase.location || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Einsatzzeit</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedCase.incidentTime || '--:--'} {selectedCase.incidentEnd ? `bis ${selectedCase.incidentEnd}` : ''}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status / Priorität</div>
                    <div className="flex items-center gap-2">
                       <div className="text-[11px] font-black text-blue-500 uppercase">{selectedCase.status}</div>
                       <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                       <div className="text-[11px] font-black text-slate-400 uppercase">LVL {selectedCase.securityLevel || '0'}</div>
                    </div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Kräfte / Einheiten</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedCase.involvedUnits || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Involved Parties */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Involvierte Personen
                </h4>
                <div className="bg-[#1a1c23]/60 p-5 rounded-xl border border-white/5 space-y-1 shadow-inner">
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Zeugen / Antragsteller / Geschädigte</div>
                  <div className="text-[11px] font-medium text-slate-300 whitespace-pre-wrap">{selectedCase.witnesses || selectedCase.applicant || 'Keine Angaben'}</div>
                </div>
              </div>

              {/* Section: Evidence/Measures */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  {selectedCase.type === 'Strafanzeige' ? 'Beweismittel & Werte' : 'Maßnahmen & Ergebnis'}
                </h4>
                <div className="bg-[#1a1c23]/60 p-5 rounded-xl border border-white/5 space-y-1 shadow-inner">
                  {selectedCase.type === 'Strafanzeige' ? (
                    <>
                      <div className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Beweismittel / Schadenswert</div>
                      <div className="text-[11px] font-medium text-slate-300">{selectedCase.evidenceList || 'Keine'} {selectedCase.propertyValue ? `| Wert: ${selectedCase.propertyValue}` : ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Maßnahmen & Ergebnis</div>
                      <div className="text-[11px] font-medium text-slate-300">{selectedCase.measures || 'N/A'} ➔ {selectedCase.result || 'Offen'}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Section: Narrative */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Dokumentierter Sachverhalt
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-2xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedCase.content || selectedCase.incidentDetails || 'Kein Text hinterlegt.'}
                  </div>
                </div>
              </div>

              {/* Section: Internal Notes & Reminders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Wiedervorlage</h4>
                  <div className="bg-blue-600/5 border border-blue-500/10 p-6 rounded-2xl space-y-4 shadow-inner">
                    <div className="space-y-2">
                      {(selectedCase.reminders || []).map(r => (
                        <button key={r.id} onClick={() => toggleReminder(r.id)} className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all ${r.completed ? 'bg-black/20 border-white/5 opacity-50' : 'bg-blue-600/10 border-blue-500/20'}`}>
                           <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>{r.completed && '✓'}</div>
                           <div className="text-left flex-1 min-w-0">
                              <div className={`text-[10px] font-bold uppercase truncate ${r.completed ? 'line-through' : 'text-white'}`}>{r.text}</div>
                              <div className="text-[8px] text-slate-500 font-black">{new Date(r.dueDate).toLocaleDateString('de-DE')}</div>
                           </div>
                        </button>
                      ))}
                      {(!selectedCase.reminders || selectedCase.reminders.length === 0) && (
                        <div className="text-[9px] font-bold text-slate-600 uppercase text-center py-4 italic">Keine Aufgaben</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">Dienstliche Notizen</h4>
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl shadow-inner h-full">
                    <div className="text-[10px] text-slate-400 italic leading-relaxed whitespace-pre-wrap">
                      {selectedCase.notes || 'Keine internen Notizen vorhanden.'}
                    </div>
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

export default CaseSearchPage;
