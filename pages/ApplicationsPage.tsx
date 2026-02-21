import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';
import { JobApplication, Permission } from '../types';
import { useAuth } from '../App';

const ApplicationsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleOpenApp = (app: JobApplication) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  return (
    <PoliceOSWindow title="Personalwesen / Bewerbermanagement">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-4 rounded-2xl border border-white/5 shadow-lg">
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

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {filteredApps.map(a => (
              <div 
                key={a.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                    {a.careerPath === 'Mittlerer Dienst' ? '🛡️' : '🎓'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">#{a.id.slice(-6).toUpperCase()}</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-black text-emerald-500 uppercase">{a.careerPath}</span>
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">{new Date(a.timestamp).toLocaleString('de-DE')}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{a.name}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Status: {a.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase">Discord</div>
                    <div className="text-[10px] font-black text-emerald-500 uppercase">{a.discordId || 'N/A'}</div>
                  </div>
                  <button 
                    onClick={() => handleOpenApp(a)}
                    className="px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Anzeigen
                  </button>
                </div>
              </div>
            ))}
            {filteredApps.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">📂</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Bewerbungen gefunden</div>
              </div>
            )}
          </div>
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedApp?.name || 'Bewerberdetails'}
          subtitle={`Bewerber-ID: ${selectedApp?.id.slice(-6).toUpperCase() || 'N/A'}`}
          icon={selectedApp?.careerPath === 'Mittlerer Dienst' ? '🛡️' : '🎓'}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Personalwesen • AES-256 Verschlüsselt</div>
              <div className="flex gap-4">
                {selectedApp && hasPermission(Permission.MANAGE_APPLICATIONS) && (
                  <>
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} 
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                      Einladen
                    </button>
                    <button 
                      onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} 
                      className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      Ablehnen
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Schließen
                </button>
              </div>
            </div>
          }
        >
          {selectedApp && (
            <div className="space-y-8">
              {/* Section: Personal Information */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Persönliche Informationen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Discord ID</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase truncate">{selectedApp.discordId || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Geschlecht</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.gender || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Geburtsdatum</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.icBirthDate || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Telefonnummer</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.icPhone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Qualification */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Qualifikation & Erfahrung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Schulabschluss</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.education || 'N/A'}</div>
                  </div>
                  <div className="bg-[#1a1c23]/60 p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Bisherige Erfahrung</div>
                    <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedApp.experience || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Section: Motivation */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Motivation & Beweggründe
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.motivation}
                  </div>
                </div>
              </div>

              {/* Section: CV */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-emerald-600"></span> 
                  Lebenslauf / Werdegang
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedApp.cv}
                  </div>
                </div>
              </div>

              {/* Section: Status Details */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-slate-700"></span> 
                  Bewerbungsstatus
                </h4>
                <div className="bg-black/30 border border-white/5 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Aktueller Status</div>
                    <div className="text-[12px] font-black text-emerald-500 uppercase mt-1">{selectedApp.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Eingangsdatum</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1">{new Date(selectedApp.timestamp).toLocaleString('de-DE')}</div>
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

export default ApplicationsPage;
