
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy } from '../firebase';
import { IncidentReport } from '../types';

const CaseSearchPage: React.FC = () => {
  const [allCases, setAllCases] = useState<IncidentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<IncidentReport | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.reports, orderBy("timestamp", "desc")), (snap) => {
      setAllCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport)));
    });
    return unsub;
  }, []);

  const filteredCases = allCases.filter(c => 
    c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.applicant && c.applicant.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <PoliceOSWindow title="Vorgangssuche">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight uppercase">Vorgangs <span className="text-blue-500 font-bold">Suche</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Zentrales Archiv der Bundespolizei Teamstadt</p>
          </div>
        </div>

        <div className="bg-[#1a1d24] border border-slate-700/50 p-6 rounded-sm flex items-center gap-4 sticky top-0 z-20 shadow-xl">
          <span className="text-slate-500">🔍</span>
          <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Nach Aktenzeichen (z.B. REP-1234), Beamten oder Beteiligten suchen..." 
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Suchergebnisse ({filteredCases.length})</h3>
            <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              {filteredCases.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-5 border rounded-sm transition-all flex flex-col gap-2 ${selectedCase?.id === c.id ? 'bg-blue-600/10 border-blue-600/50' : 'bg-[#1a1d24] border-slate-700/50 hover:border-slate-500'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.type === 'Einsatzbericht' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>{c.type}</span>
                    <span className="text-[10px] font-mono text-slate-500">{c.reportNumber}</span>
                  </div>
                  <div className="text-sm font-bold text-white uppercase tracking-tighter truncate">{c.title || c.violation || 'Unbenannter Vorgang'}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold flex justify-between">
                    <span>{c.officerName}</span>
                    <span>{new Date(c.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                </button>
              ))}
              {filteredCases.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-sm italic">Keine Vorgänge gefunden.</div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <div className="bg-[#1a1d24] border border-slate-700/50 p-10 rounded-sm space-y-8 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-8">
                  <div className="space-y-1">
                    <div className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{selectedCase.reportNumber}</div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedCase.title || selectedCase.violation}</h2>
                    <p className="text-slate-500 text-xs italic">{selectedCase.location} • {new Date(selectedCase.date || selectedCase.timestamp).toLocaleString('de-DE')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-black uppercase">Status</div>
                    <div className={`text-xs font-black uppercase px-3 py-1 rounded-full border mt-1 ${selectedCase.status === 'Offen' ? 'text-blue-500 border-blue-500' : 'text-emerald-500 border-emerald-500'}`}>{selectedCase.status}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zuständigkeit</h4>
                    <div className="bg-black/20 p-4 border border-white/5 space-y-1">
                       <div className="text-xs font-bold text-white uppercase">{selectedCase.officerName}</div>
                       <div className="text-[9px] text-blue-500 font-black uppercase">{selectedCase.officerBadge}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Beteiligte</h4>
                    <div className="bg-black/20 p-4 border border-white/5">
                       <div className="text-xs font-bold text-white uppercase">{selectedCase.applicant || selectedCase.involvedOfficers || 'Keine Angabe'}</div>
                       {selectedCase.suspect && <div className="text-[10px] text-red-500 mt-1 uppercase font-black">Täter: {selectedCase.suspect}</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inhalt / Dokumentation</h4>
                  <div className="bg-black/20 p-8 border border-white/5 rounded-sm min-h-[200px] text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedCase.content || selectedCase.incidentDetails || 'Keine Detailbeschreibung vorhanden.'}
                  </div>
                </div>

                {selectedCase.notes && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zusätzliche Notizen</h4>
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500/80 text-xs italic">
                      {selectedCase.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1d24]/50 border border-slate-700/50 rounded-sm p-20 text-center space-y-4">
                 <div className="text-6xl grayscale opacity-20">📁</div>
                 <div className="text-slate-600 font-bold uppercase tracking-widest text-xs">Wählen Sie einen Vorgang aus der Liste aus,<br/>um die Details anzuzeigen.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CaseSearchPage;
