
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
     s.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <PoliceOSWindow title="Ermittlung / Bürgerhinweise">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-xl">💡</div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Internet <span className="text-amber-500">Wache</span></h1>
          </div>
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-xl w-64 focus-within:border-amber-500 transition-all">
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="In Meldungen suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 px-2 placeholder:text-slate-700" 
            />
          </div>
        </div>

        {/* Main Split View */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* List Panel */}
          <div className="w-80 flex flex-col gap-3 shrink-0">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Eingangskorb ({filteredSubmissions.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {filteredSubmissions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => {
                    setSelectedSubmission(s);
                    if (s.status === 'Neu') updateStatus(s.id, 'Gelesen');
                  }}
                  className={`w-full text-left p-4 border rounded-2xl transition-all flex flex-col gap-2 ${selectedSubmission?.id === s.id ? 'bg-amber-600/10 border-amber-500/40' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${s.status === 'Neu' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'text-slate-500'}`}>{s.status}</span>
                    <span className="text-[8px] font-mono text-slate-700">{new Date(s.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="text-[11px] font-black text-white uppercase truncate">{s.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          <div className="flex-1 min-w-0">
            {selectedSubmission ? (
              <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[32px] border border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                
                {/* Fixed Top Bar in Details */}
                <div className="p-8 border-b border-white/10 shrink-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-black text-amber-500 uppercase">Bürgerhinweis</span>
                        <span className="text-[8px] font-mono text-slate-600">REF: #{selectedSubmission.id.slice(-4).toUpperCase()}</span>
                      </div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedSubmission.title}</h2>
                    </div>
                    <div className="text-right">
                       <div className="text-[9px] font-black uppercase px-4 py-2 rounded-xl border border-amber-500/30 text-amber-500 bg-amber-500/5">{selectedSubmission.status}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Absender</div>
                        <div className="text-[11px] font-bold text-slate-200">{selectedSubmission.contactInfo || 'Anonym'}</div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Zeitpunkt Eingang</div>
                        <div className="text-[11px] font-bold text-slate-200">{new Date(selectedSubmission.timestamp).toLocaleString('de-DE')}</div>
                     </div>
                  </div>
                </div>

                {/* Content Body (Internal Scroll) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                   <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-3">Inhalt der Eingabe</h4>
                     <div className="bg-black/40 p-8 border border-white/5 rounded-3xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        "{selectedSubmission.content}"
                     </div>
                   </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                {hasPermission(Permission.MANAGE_TIPS) && (
                  <div className="p-6 border-t border-white/10 flex gap-4 shrink-0 bg-black/20">
                    <button 
                      onClick={() => updateStatus(selectedSubmission.id, 'Archiviert')} 
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/5"
                    >
                      Archivieren
                    </button>
                    <button 
                      onClick={() => deleteSub(selectedSubmission.id)} 
                      className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[32px] p-20 text-center space-y-4">
                 <div className="text-4xl opacity-20">💡</div>
                 <div className="text-slate-600 font-black uppercase tracking-widest text-[10px]">Wählen Sie eine Meldung</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default TipsPage;
