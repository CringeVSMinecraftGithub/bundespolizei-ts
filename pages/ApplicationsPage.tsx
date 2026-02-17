
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';
import { JobApplication, Permission } from '../types';
import { useAuth } from '../App';

const ApplicationsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.applications, orderBy("timestamp", "desc")), (snap) => {
      setAllApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
    });
    return unsub;
  }, []);

  const updateAppStatus = async (id: string, status: JobApplication['status']) => {
    try {
      await updateDoc(doc(db, "applications", id), { status });
      if (selectedApp?.id === id) {
        setSelectedApp({ ...selectedApp, status });
      }
    } catch (e) { console.error(e); }
  };

  const filteredApps = allApps.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.careerPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PoliceOSWindow title="Personalwesen / Bewerbermanagement">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center text-xl">📂</div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Bewerber <span className="text-emerald-500">Cockpit</span></h1>
          </div>
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-xl w-64 focus-within:border-emerald-500 transition-all">
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-200 placeholder:text-slate-700 px-2" 
            />
          </div>
        </div>

        {/* Main Split View */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* List Panel */}
          <div className="w-80 flex flex-col gap-3 shrink-0">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Eingang ({filteredApps.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {filteredApps.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setSelectedApp(a)}
                  className={`w-full text-left p-4 border rounded-2xl transition-all flex items-center gap-4 ${selectedApp?.id === a.id ? 'bg-emerald-600/10 border-emerald-500/40' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="text-lg">{a.careerPath === 'Mittlerer Dienst' ? '🛡️' : '🎓'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-white uppercase truncate">{a.name}</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase">{a.status}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          <div className="flex-1 min-w-0">
            {selectedApp ? (
              <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[32px] border border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                {/* Fixed Top Bar in Details */}
                <div className="p-8 border-b border-white/10 shrink-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-500 uppercase">{selectedApp.careerPath}</span>
                        <span className="text-[8px] font-mono text-slate-600">ID: {selectedApp.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{selectedApp.name}</h2>
                    </div>
                    <div className="text-right">
                       <div className="text-[9px] font-black uppercase px-4 py-2 rounded-xl border border-blue-500 text-blue-500 bg-blue-500/5">{selectedApp.status}</div>
                    </div>
                  </div>
                  
                  {/* Info Grid (No Scrolling needed for these) */}
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Discord</div>
                        <div className="text-[11px] font-bold text-slate-200">{selectedApp.discordId || 'N/A'}</div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Geburtsdatum</div>
                        <div className="text-[11px] font-bold text-slate-200">{selectedApp.icBirthDate || 'N/A'}</div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Telefon</div>
                        <div className="text-[11px] font-bold text-slate-200">{selectedApp.icPhone || 'N/A'}</div>
                     </div>
                  </div>
                </div>

                {/* Content Body (Internal Scroll) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Motivation</h4>
                        <div className="bg-black/30 p-6 border border-white/5 rounded-2xl text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedApp.motivation}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Lebenslauf</h4>
                        <div className="bg-black/30 p-6 border border-white/5 rounded-2xl text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedApp.cv}
                        </div>
                      </div>
                   </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                {hasPermission(Permission.MANAGE_APPLICATIONS) && (
                  <div className="p-6 border-t border-white/10 flex gap-4 shrink-0 bg-black/20">
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Einladen
                    </button>
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} 
                      className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1c23]/30 border border-white/5 rounded-[32px] p-20 text-center space-y-4">
                 <div className="text-4xl opacity-20">📂</div>
                 <div className="text-slate-600 font-black uppercase tracking-widest text-[10px]">Wählen Sie einen Datensatz</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default ApplicationsPage;
