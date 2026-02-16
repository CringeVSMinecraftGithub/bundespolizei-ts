
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
    <PoliceOSWindow title="Personalwesen / Bewerbungen">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight uppercase">Bewerber <span className="text-emerald-500 font-bold">Portal</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Personalmanagement der Bundespolizei Teamstadt</p>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1d24] border border-slate-700/50 p-4 rounded-xl w-96">
            <span className="text-slate-500 ml-2">🔍</span>
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Nach Namen oder Laufbahn suchen..." 
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Eingänge ({filteredApps.length})</h3>
            <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              {filteredApps.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setSelectedApp(a)}
                  className={`w-full text-left p-5 border rounded-sm transition-all flex flex-col gap-2 ${selectedApp?.id === a.id ? 'bg-emerald-600/10 border-emerald-600/50 shadow-lg shadow-emerald-900/10' : 'bg-[#1a1d24] border-slate-700/50 hover:border-slate-500'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      a.status === 'Eingegangen' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                      a.status === 'Eingeladen' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                      a.status === 'Abgelehnt' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                      'bg-slate-500/10 border-slate-500/30 text-slate-500'
                    }`}>{a.status}</span>
                    <span className="text-[10px] font-mono text-slate-500">{new Date(a.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="text-sm font-bold text-white uppercase tracking-tighter truncate">{a.name}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-black">{a.careerPath}</div>
                </button>
              ))}
              {filteredApps.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-sm italic">Keine Bewerbungen gefunden.</div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <div className="bg-[#1a1d24] border border-slate-700/50 p-10 rounded-sm space-y-8 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-8">
                  <div className="space-y-1">
                    <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{selectedApp.careerPath}</div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{selectedApp.name}</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Discord ID: {selectedApp.discordId} • IC Alter: {selectedApp.icBirthDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-black uppercase">Status</div>
                    <div className={`text-xs font-black uppercase px-4 py-1.5 rounded-full border mt-2 ${
                      selectedApp.status === 'Eingeladen' ? 'text-emerald-500 border-emerald-500 bg-emerald-500/5' : 
                      selectedApp.status === 'Abgelehnt' ? 'text-red-500 border-red-500 bg-red-500/5' : 
                      'text-blue-500 border-blue-500 bg-blue-500/5'
                    }`}>{selectedApp.status}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kontaktdaten</h4>
                    <div className="bg-black/20 p-4 border border-white/5 space-y-2">
                       <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Telefon:</span><span className="text-xs font-bold text-white uppercase">{selectedApp.icPhone}</span></div>
                       <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Eingang:</span><span className="text-xs font-bold text-white uppercase">{new Date(selectedApp.timestamp).toLocaleString('de-DE')}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Qualifikation</h4>
                    <div className="bg-black/20 p-4 border border-white/5">
                       <div className="text-xs font-bold text-white uppercase">{selectedApp.careerPath}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motivationsschreiben</h4>
                  <div className="bg-black/20 p-8 border border-white/5 rounded-sm min-h-[150px] text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-light">
                    {selectedApp.motivation}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lebenslauf</h4>
                  <div className="bg-black/20 p-8 border border-white/5 rounded-sm min-h-[150px] text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-light">
                    {selectedApp.cv}
                  </div>
                </div>

                {hasPermission(Permission.MANAGE_APPLICATIONS) && (
                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                    >
                      Zum Gespräch einladen
                    </button>
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} 
                      className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      Bewerbung Ablehnen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a1d24]/50 border border-slate-700/50 rounded-sm p-20 text-center space-y-4">
                 <div className="text-6xl grayscale opacity-20">📂</div>
                 <div className="text-slate-600 font-bold uppercase tracking-widest text-xs">Wählen Sie einen Bewerber aus der Liste aus,<br/>um das Dossier einzusehen.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default ApplicationsPage;
