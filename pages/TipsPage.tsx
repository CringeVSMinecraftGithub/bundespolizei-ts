
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
    <PoliceOSWindow title="Ermittlung / Bürgerhinweise">
      <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500">
        
        {/* Modern Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/60 backdrop-blur-md p-6 rounded-[32px] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">💡</div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Eingangs <span className="text-amber-500">Management</span></h1>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Zentrale Auswertung Bürgerhinweise</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-3 rounded-2xl w-80 focus-within:border-amber-500 transition-all shadow-inner">
            <span className="text-slate-600 ml-2">🔍</span>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Meldung suchen..." className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 px-2 placeholder:text-slate-700" />
          </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* Enhanced List Panel */}
          <div className="w-96 flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center px-4">
               <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Posteingang ({filteredSubmissions.length})</h3>
               <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div><div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div></div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {filteredSubmissions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { setSelectedSubmission(s); if (s.status === 'Neu') updateStatus(s.id, 'Gelesen'); }} 
                  className={`w-full text-left p-5 border rounded-[28px] transition-all relative overflow-hidden group ${selectedSubmission?.id === s.id ? 'bg-amber-600/10 border-amber-500/40 shadow-xl' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-center w-full mb-3">
                    <span className={`text-[7px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${s.status === 'Neu' ? 'bg-blue-600/20 border-blue-500 text-blue-400 animate-pulse' : 'bg-black/30 border-white/10 text-slate-500'}`}>{s.status}</span>
                    <span className="text-[8px] font-mono text-slate-600 font-bold">{new Date(s.timestamp).toLocaleDateString('de-DE')} • {new Date(s.timestamp).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="text-[12px] font-black text-white uppercase tracking-tight truncate group-hover:text-amber-500 transition-colors">{s.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-[8px] text-slate-500">📍</span>
                     <div className="text-[9px] font-bold text-slate-500 truncate uppercase tracking-widest">{s.location || 'Keine Ortsangabe'}</div>
                  </div>
                  {s.anonymous && <div className="absolute top-0 right-0 p-1 px-3 bg-red-600/20 text-red-500 text-[6px] font-black uppercase tracking-widest border-l border-b border-red-500/20 rounded-bl-xl">Anonym</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Fully Detailed Content Panel */}
          <div className="flex-1 min-w-0">
            {selectedSubmission ? (
              <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[40px] border border-white/5 overflow-hidden shadow-2xl animate-in slide-in-from-right-6 duration-500">
                
                {/* Visual Identity Bar */}
                <div className="p-10 border-b border-white/10 shrink-0 bg-gradient-to-r from-amber-600/10 to-transparent">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest">BÜRGERHINWEIS ID: {selectedSubmission.id.slice(-8).toUpperCase()}</span>
                        {selectedSubmission.anonymous && <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest">ANONYME QUELLE</span>}
                      </div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{selectedSubmission.title}</h2>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status der Bearbeitung</div>
                       <div className="text-amber-500 font-black text-xs uppercase bg-amber-500/10 px-6 py-3 rounded-2xl border border-amber-500/20 tracking-[0.2em] shadow-lg shadow-amber-900/10">{selectedSubmission.status}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     <div className="bg-black/30 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Ereignisort</div>
                        <div className="text-[11px] font-black text-slate-200 uppercase truncate">{selectedSubmission.location || 'Keine Angabe'}</div>
                     </div>
                     <div className="bg-black/30 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Gemeldeter Zeitpunkt</div>
                        <div className="text-[11px] font-black text-slate-200 uppercase">{selectedSubmission.incidentTime ? new Date(selectedSubmission.incidentTime).toLocaleString('de-DE') : 'Nicht erfasst'}</div>
                     </div>
                     <div className="bg-black/30 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Einreicher</div>
                        <div className="text-[11px] font-black text-slate-200 uppercase truncate">{selectedSubmission.anonymous ? 'Anonyme Übermittlung' : selectedSubmission.contactName}</div>
                     </div>
                     <div className="bg-black/30 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Empfangsdatum</div>
                        <div className="text-[11px] font-black text-slate-200 uppercase">{new Date(selectedSubmission.timestamp).toLocaleString('de-DE')}</div>
                     </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                   
                   {/* Description Block */}
                   <div className="space-y-5">
                     <div className="flex items-center gap-4">
                        <div className="h-0.5 flex-1 bg-amber-500/20"></div>
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Detailbeschreibung des Vorfalls</h4>
                        <div className="h-0.5 flex-1 bg-amber-500/20"></div>
                     </div>
                     <div className="bg-black/40 p-10 border border-white/5 rounded-[48px] text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-medium shadow-2xl italic tracking-wide">
                        "{selectedSubmission.content}"
                     </div>
                   </div>

                   {/* Investigation Data Grid */}
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                      
                      {/* Suspect & Evidence */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> 
                           Täterbeschreibung / Beweismittel
                        </h4>
                        <div className="bg-red-900/5 p-8 border border-red-500/10 rounded-[40px] text-slate-300 text-sm leading-relaxed min-h-[120px] shadow-inner">
                           {selectedSubmission.suspectInfo ? selectedSubmission.suspectInfo : "Es wurden keine spezifischen Täter- oder Beweisinformationen hinterlegt."}
                        </div>
                      </div>

                      {/* Contact & Witness Data */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                           Ermittlungsrelevante Kontaktdaten
                        </h4>
                        {!selectedSubmission.anonymous ? (
                          <div className="grid grid-cols-2 gap-4 bg-blue-600/5 p-8 rounded-[40px] border border-blue-500/10 shadow-inner">
                             <div>
                               <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Geburtsdatum</div>
                               <div className="text-xs font-black text-white uppercase">{selectedSubmission.contactBirthdate || 'N/A'}</div>
                             </div>
                             <div>
                               <div className="text-[8px] font-black text-slate-600 uppercase mb-1">E-Mail Adresse</div>
                               <div className="text-xs font-black text-blue-400">{selectedSubmission.contactEmail || 'N/A'}</div>
                             </div>
                             <div className="col-span-2 pt-4 border-t border-white/5 mt-4">
                               <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Meldeadresse des Zeugen</div>
                               <div className="text-xs font-black text-white uppercase">{selectedSubmission.contactAddress || 'N/A'}</div>
                             </div>
                             <div className="pt-4">
                               <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Telefon / Erreichbarkeit</div>
                               <div className="text-xs font-black text-blue-400">{selectedSubmission.contactPhone || 'N/A'}</div>
                             </div>
                          </div>
                        ) : (
                          <div className="bg-black/30 p-8 rounded-[40px] border border-white/5 flex flex-col items-center justify-center text-center opacity-40">
                             <div className="text-3xl mb-3">🕵️‍♂️</div>
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identität des Absenders ist durch das Anonymitäts-System geschützt.</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                {/* Interaction Area */}
                {hasPermission(Permission.MANAGE_TIPS) && (
                  <div className="p-8 border-t border-white/10 flex gap-6 shrink-0 bg-slate-900/60 backdrop-blur-xl">
                    <button onClick={() => updateStatus(selectedSubmission.id, 'Archiviert')} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] border border-white/5 transition-all shadow-xl active:scale-95">In das Archiv verschieben</button>
                    <button onClick={() => deleteSub(selectedSubmission.id)} className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-95">Meldung Löschen</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[40px] p-20 text-center space-y-6 opacity-30">
                 <div className="text-7xl animate-bounce">💡</div>
                 <div className="text-slate-600 font-black uppercase tracking-[0.5em] text-sm">Wählen Sie einen Datensatz zur Auswertung</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default TipsPage;
