
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db, deleteDoc } from '../firebase';
import { CitizenSubmission, Permission } from '../types';
import { useAuth } from '../App';

const TipsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [allSubmissions, setAllSubmissions] = useState<CitizenSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<CitizenSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setIsModalOpen(false);
    }
  };

  const filteredSubmissions = allSubmissions.filter(s => 
    s.type === 'Hinweis' && 
    (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (s.location && s.location.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleOpenSubmission = (s: CitizenSubmission) => {
    setSelectedSubmission(s);
    setIsModalOpen(true);
    if (s.status === 'Neu') updateStatus(s.id, 'Gelesen');
  };

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

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {filteredSubmissions.map(s => (
              <div 
                key={s.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-amber-600/10 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl">💡</div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${s.status === 'Neu' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/30 border-white/10 text-slate-500'}`}>{s.status}</span>
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">{new Date(s.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{s.title}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">📍 {s.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Quelle</div>
                    <div className={`text-[10px] font-black uppercase ${s.anonymous ? 'text-red-500' : 'text-emerald-500'}`}>{s.anonymous ? 'Anonym' : 'Verifiziert'}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenSubmission(s)}
                    className="px-6 py-2.5 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white border border-amber-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {filteredSubmissions.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">💡</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Hinweise gefunden</div>
              </div>
            )}
          </div>
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedSubmission?.title || 'Hinweisdetails'}
          subtitle={`Hinweis-ID: ${selectedSubmission?.id.slice(-8).toUpperCase() || 'N/A'}`}
          icon="💡"
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic tracking-widest">BTS-ZENTRALE • Letzte Aktualisierung: {new Date().toLocaleTimeString()}</div>
              <div className="flex gap-4">
                {selectedSubmission && (
                  <>
                    <button 
                      onClick={() => updateStatus(selectedSubmission.id, 'Archiviert')} 
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Archivieren
                    </button>
                    <button 
                      onClick={() => deleteSub(selectedSubmission.id)} 
                      className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Löschen
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedSubmission && (
            <div className="space-y-8">
              {/* Section: Metadata */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-amber-500"></span> 
                  Einsatz- & Meldedaten
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Ereignisort</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedSubmission.location || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Ereigniszeit</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedSubmission.incidentTime ? new Date(selectedSubmission.incidentTime).toLocaleString('de-DE') : 'Unbekannt'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Melder Name</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedSubmission.anonymous ? 'GESCHÜTZT' : selectedSubmission.contactName}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Eingang Zeit</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{new Date(selectedSubmission.timestamp).toLocaleTimeString('de-DE')}</div>
                  </div>
                </div>
              </div>

              {/* Section: Observation */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-amber-500"></span> 
                  Beobachtungsschilderung
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner min-h-[150px]">
                  <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedSubmission.content || 'Keine detaillierte Schilderung vorhanden.'}
                  </div>
                </div>
              </div>

              {/* Section: Suspects & Evidence */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-red-600"></span> 
                  Täter / Beweismittel
                </h4>
                <div className="bg-red-900/5 border border-red-500/10 p-6 rounded-xl shadow-inner text-slate-400 text-[10px] leading-relaxed">
                  {selectedSubmission.suspectInfo || 'Keine Angaben zu Tätern oder Beweisen hinterlegt.'}
                </div>
              </div>

              {/* Section: Contact Data */}
              {!selectedSubmission.anonymous && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                    <span className="w-5 h-0.5 bg-blue-600"></span> 
                    Kontaktdaten (Zeuge)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-600/5 border border-blue-500/10 p-6 rounded-xl shadow-inner">
                    <div>
                      <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Telefon</div>
                      <div className="text-[11px] font-bold text-blue-400">{selectedSubmission.contactPhone || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-600 uppercase mb-1">E-Mail</div>
                      <div className="text-[11px] font-bold text-blue-400 truncate">{selectedSubmission.contactEmail || 'N/A'}</div>
                    </div>
                    <div className="md:col-span-2 pt-3 border-t border-white/5 mt-1">
                      <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Adresse</div>
                      <div className="text-[11px] font-bold text-slate-300 uppercase">{selectedSubmission.contactAddress || 'Keine Adresse'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DataModal>
      </div>
    </PoliceOSWindow>
  );
};

export default TipsPage;
