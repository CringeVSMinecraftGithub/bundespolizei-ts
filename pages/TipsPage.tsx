
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
    if (confirm("Meldung unwiderruflich löschen?")) {
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
    <PoliceOSWindow title="Internetwache / Bürgerhinweise">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight uppercase">Bürger <span className="text-amber-500 font-bold">Hinweise</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Schnittstelle zur Internetwache Teamstadt</p>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1d24] border border-slate-700/50 p-4 rounded-xl w-96">
            <span className="text-slate-500 ml-2">🔍</span>
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="In Meldungen suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Eingänge ({filteredSubmissions.length})</h3>
            <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              {filteredSubmissions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => {
                    setSelectedSubmission(s);
                    if (s.status === 'Neu') updateStatus(s.id, 'Gelesen');
                  }}
                  className={`w-full text-left p-5 border rounded-sm transition-all flex flex-col gap-2 ${selectedSubmission?.id === s.id ? 'bg-amber-600/10 border-amber-600/50 shadow-lg shadow-amber-900/10' : 'bg-[#1a1d24] border-slate-700/50 hover:border-slate-500'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      s.status === 'Neu' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                      s.status === 'Gelesen' ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' :
                      'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    }`}>{s.status}</span>
                    <span className="text-[10px] font-mono text-slate-500">{new Date(s.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="text-sm font-bold text-white uppercase tracking-tighter truncate">{s.title}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-black">{s.contactInfo || 'Anonym'}</div>
                </button>
              ))}
              {filteredSubmissions.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-sm italic">Keine Hinweise gefunden.</div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="bg-[#1a1d24] border border-slate-700/50 p-10 rounded-sm space-y-8 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-8">
                  <div className="space-y-1">
                    <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Bürgerhinweis</div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{selectedSubmission.title}</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Übermittelt am: {new Date(selectedSubmission.timestamp).toLocaleString('de-DE')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-black uppercase">Status</div>
                    <div className={`text-xs font-black uppercase px-4 py-1.5 rounded-full border mt-2 ${
                      selectedSubmission.status === 'Archiviert' ? 'text-amber-500 border-amber-500 bg-amber-500/5' : 
                      selectedSubmission.status === 'Neu' ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 
                      'text-slate-400 border-slate-600 bg-slate-800/20'
                    }`}>{selectedSubmission.status}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inhalt der Meldung</h4>
                  <div className="bg-black/20 p-8 border border-white/5 rounded-sm min-h-[250px] text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-light italic">
                    "{selectedSubmission.content}"
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kontaktinformationen</h4>
                  <div className="bg-black/20 p-4 border border-white/5 font-bold text-white text-xs uppercase">
                    {selectedSubmission.contactInfo || 'KEINE KONTAKTDATEN HINTERLEGT (ANONYM)'}
                  </div>
                </div>

                {hasPermission(Permission.MANAGE_TIPS) && (
                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={() => updateStatus(selectedSubmission.id, 'Archiviert')} 
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                    >
                      Meldung Archivieren
                    </button>
                    <button 
                      onClick={() => deleteSub(selectedSubmission.id)} 
                      className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      Meldung Löschen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1d24]/50 border border-slate-700/50 rounded-sm p-20 text-center space-y-4">
                 <div className="text-6xl grayscale opacity-20">💡</div>
                 <div className="text-slate-600 font-bold uppercase tracking-widest text-xs">Wählen Sie einen Hinweis aus der Liste aus,<br/>um die Details einzusehen.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default TipsPage;
