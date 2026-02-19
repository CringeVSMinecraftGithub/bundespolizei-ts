
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db, deleteDoc } from '../firebase';
import { CitizenSubmission, Permission } from '../types';
import { useAuth } from '../App';

const TipsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [allSubmissions, setAllSubmissions] = useState<CitizenSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<CitizenSubmission | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.submissions, orderBy("timestamp", "desc")), (snap) => {
      setAllSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenSubmission)));
    });
    return unsub;
  }, []);

  const updateStatus = async (id: string, status: CitizenSubmission['status']) => {
    try {
      await updateDoc(doc(db, "submissions", id), { status });
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({ ...selectedSubmission, status });
      }
    } catch (e) { console.error(e); }
  };

  const deleteSub = async (id: string) => {
    if (confirm("Meldung unwiderruflich aus dem System löschen?")) {
      await deleteDoc(doc(db, "submissions", id));
      setSelectedSubmission(null);
    }
  };

  const filteredSubmissions = allSubmissions.filter(s => 
    s.type === 'Hinweis' && 
    (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (s.location && s.location.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <PoliceOSWindow title="Bürgerhinweise • Posteingang">
      <div className="h-full flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500">
        
        {/* Compact Search Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/80 p-4 rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-xl">💡</div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Hinweis <span className="text-amber-500">Eingang</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-xl w-72 focus-within:border-amber-500 transition-all">
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-[11px] font-black uppercase text-slate-200 px-2 placeholder:text-slate-700" 
            />
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          
          {/* List Sidebar - More Compact */}
          <div className="w-80 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center px-2">
               <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Eingang ({filteredSubmissions.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
              {filteredSubmissions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { setSelectedSubmission(s); if (s.status === 'Neu') updateStatus(s.id, 'Gelesen'); }} 
                  className={`w-full text-left p-5 border rounded-2xl transition-all relative ${selectedSubmission?.id === s.id ? 'bg-amber-600/10 border-amber-500/40 shadow-md' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${s.status === 'Neu' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/30 border-white/10 text-slate-500'}`}>{s.status}</span>
                    <span className="text-[8px] font-mono text-slate-600">{new Date(s.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="text-[12px] font-black text-white uppercase truncate tracking-tight leading-tight">{s.title}</div>
                  <div className="text-[10px] font-bold text-slate-600 truncate uppercase mt-1">📍 {s.location || 'N/A'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form-Style Detail Panel */}
          <div className="flex-1 min-w-0">
            {selectedSubmission ? (
              <div className="h-full flex flex-col bg-[#111317] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-500">
                
                {/* Header Info Bar */}
                <div className="p-8 bg-[#1a1c23] border-b border-white/10 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-6">
                    <div className="bg-amber-600/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col items-center min-w-[120px]">
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Hinweis-ID</span>
                      <span className="text-base font-mono font-black text-white">{selectedSubmission.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{selectedSubmission.title}</h2>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase border ${selectedSubmission.anonymous ? 'text-red-500 border-red-500/20' : 'text-emerald-500 border-emerald-500/20'}`}>
                          {selectedSubmission.anonymous ? 'Anonyme Quelle' : 'Verifizierter Kontakt'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(selectedSubmission.timestamp).toLocaleString('de-DE')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Status</div>
                    <div className="text-[12px] font-black text-amber-500 uppercase bg-amber-500/10 px-5 py-2 rounded-xl border border-amber-500/20">
                      {selectedSubmission.status}
                    </div>
                  </div>
                </div>

                {/* Form Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                  
                  {/* Metadata Matrix */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ereignisort</div>
                        <div className="text-[12px] font-bold text-slate-200 uppercase truncate">{selectedSubmission.location || 'N/A'}</div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ereigniszeit</div>
                        <div className="text-[12px] font-bold text-slate-200 uppercase">{selectedSubmission.incidentTime ? new Date(selectedSubmission.incidentTime).toLocaleString('de-DE') : 'Unbekannt'}</div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Melder Name</div>
                        <div className="text-[12px] font-bold text-slate-200 uppercase truncate">{selectedSubmission.anonymous ? 'GESCHÜTZT' : selectedSubmission.contactName}</div>
                     </div>
                     <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Eingang Zeit</div>
                        <div className="text-[12px] font-bold text-slate-200 uppercase">{new Date(selectedSubmission.timestamp).toLocaleTimeString('de-DE')}</div>
                     </div>
                  </div>

                  {/* Main Observation & Details Split */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                     
                     {/* Observation Text */}
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                           <span className="w-5 h-0.5 bg-amber-500"></span> 
                           Beobachtungsschilderung
                        </h4>
                        <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-[32px] shadow-inner min-h-[200px]">
                           <div className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap font-medium">
                              {selectedSubmission.content || 'Keine detaillierte Schilderung vorhanden.'}
                           </div>
                        </div>
                     </div>

                     {/* Right Side: Suspect & Contact */}
                     <div className="space-y-8">
                        
                        {/* Suspect / Evidence */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                              <span className="w-5 h-0.5 bg-red-600"></span> 
                              Täter / Beweismittel
                           </h4>
                           <div className="bg-red-900/5 border border-red-500/10 p-6 rounded-[24px] shadow-inner text-slate-400 text-[12px] leading-relaxed">
                              {selectedSubmission.suspectInfo || 'Keine Angaben zu Tätern oder Beweisen hinterlegt.'}
                           </div>
                        </div>

                        {/* Contact Data (if not anonymous) */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                              <span className="w-5 h-0.5 bg-blue-600"></span> 
                              Kontaktdaten (Zeuge)
                           </h4>
                           {!selectedSubmission.anonymous ? (
                              <div className="grid grid-cols-2 gap-4 bg-blue-600/5 border border-blue-500/10 p-6 rounded-[24px] shadow-inner">
                                 <div>
                                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Telefon</div>
                                    <div className="text-[11px] font-bold text-blue-400">{selectedSubmission.contactPhone || 'N/A'}</div>
                                 </div>
                                 <div>
                                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">E-Mail</div>
                                    <div className="text-[11px] font-bold text-blue-400 truncate">{selectedSubmission.contactEmail || 'N/A'}</div>
                                 </div>
                                 <div className="col-span-2 pt-3 border-t border-white/5 mt-1">
                                    <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Adresse</div>
                                    <div className="text-[11px] font-bold text-slate-300 uppercase truncate">{selectedSubmission.contactAddress || 'Keine Adresse'}</div>
                                 </div>
                              </div>
                           ) : (
                              <div className="bg-black/40 border border-white/5 p-8 rounded-[24px] flex flex-col items-center justify-center text-center opacity-40">
                                 <span className="text-3xl mb-2">🕵️‍♂️</span>
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anonymität gewahrt</span>
                              </div>
                           )}
                        </div>

                     </div>
                  </div>
                </div>

                {/* Fixed Footer Actions */}
                <div className="p-8 bg-black/40 border-t border-white/10 flex gap-6 shrink-0">
                  <button 
                    onClick={() => updateStatus(selectedSubmission.id, 'Archiviert')} 
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Meldung Archivieren
                  </button>
                  <button 
                    onClick={() => deleteSub(selectedSubmission.id)} 
                    className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Eintrag Löschen
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[32px] p-20 text-center space-y-4 opacity-20">
                 <div className="text-6xl animate-pulse">💡</div>
                 <div className="text-slate-600 font-black uppercase tracking-widest text-[12px]">Wählen Sie einen Hinweis zur Bearbeitung</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default TipsPage;
