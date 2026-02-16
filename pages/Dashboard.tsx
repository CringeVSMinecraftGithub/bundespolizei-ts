
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { JobApplication, Permission, CitizenSubmission } from '../types';
import { DASHBOARD_BG } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db, deleteDoc } from '../firebase';

interface DesktopApp {
  id: string;
  label: string;
  icon: string;
  path?: string;
  permission?: Permission;
  color: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [activeWindow, setActiveWindow] = useState<string | null>(null);

  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<CitizenSubmission[]>([]);
  
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<CitizenSubmission | null>(null);

  useEffect(() => {
    const unsubApps = onSnapshot(query(dbCollections.applications, orderBy("timestamp", "desc")), (snap) => {
      setAllApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
    });
    const unsubSubmissions = onSnapshot(query(dbCollections.submissions, orderBy("timestamp", "desc")), (snap) => {
      setAllSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenSubmission)));
    });

    return () => {
      unsubApps();
      unsubSubmissions();
    };
  }, []);

  const handleAppClick = (app: DesktopApp) => {
    if (app.path && app.path !== '#') navigate(app.path);
    else setActiveWindow(app.id);
  };

  const updateSubmissionStatus = async (id: string, status: CitizenSubmission['status']) => {
    try {
      await updateDoc(doc(db, "submissions", id), { status });
    } catch (e) { console.error(e); }
  };

  const deleteSubmission = async (id: string) => {
    if (confirm("Hinweis unwiderruflich löschen?")) {
      await deleteDoc(doc(db, "submissions", id));
      setSelectedSubmission(null);
    }
  };

  const updateAppStatus = async (id: string, status: JobApplication['status']) => {
    try {
      await updateDoc(doc(db, "applications", id), { status });
      if (selectedApp) setSelectedApp({...selectedApp, status});
    } catch (e) { console.error(e); }
  };

  const apps: DesktopApp[] = [
    { id: 'cases', label: 'Vorgangssuche', icon: '📁', color: 'bg-blue-700', path: '/cases', permission: Permission.VIEW_REPORTS },
    { id: 'fleet', label: 'Fuhrpark', icon: '🚓', color: 'bg-blue-500', path: '/fleet', permission: Permission.VIEW_REPORTS },
    { id: 'evidence', label: 'Asservatenkammer', icon: '📦', color: 'bg-orange-500', path: '/evidence', permission: Permission.VIEW_REPORTS },
    { id: 'warrants', label: 'Fahndung', icon: '🔍', color: 'bg-red-600', path: '/warrants', permission: Permission.VIEW_WARRANTS },
    { id: 'reports', label: 'Einsatzberichte', icon: '📝', color: 'bg-blue-600', permission: Permission.VIEW_REPORTS, path: '/incident-report' },
    { id: 'complaints', label: 'Strafanzeigen', icon: '⚖️', color: 'bg-slate-700', permission: Permission.CREATE_REPORTS, path: '/criminal-complaint' },
    { id: 'mail', label: 'Bürgerhinweise', icon: '💡', color: 'bg-amber-600', permission: Permission.VIEW_TIPS },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.ADMIN_ACCESS, path: '/admin' },
    { id: 'apps', label: 'Bewerbungen', icon: '📂', color: 'bg-emerald-600', permission: Permission.VIEW_APPLICATIONS },
  ];

  if (!user) return null;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col relative font-sans select-none">
      {/* Background Image fixed within the dashboard main area */}
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover transition-opacity duration-1000"
        style={{ 
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.5), rgba(2, 6, 23, 0.8)), url('${DASHBOARD_BG}')`,
          backgroundPosition: '50% 30%'
        }}
      ></div>

      <main className="flex-1 p-12 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 auto-rows-min gap-12 z-10 overflow-y-auto custom-scrollbar">
        {apps.map((app) => (hasPermission(app.permission || Permission.VIEW_REPORTS) && (
          <button 
            key={app.id} 
            onClick={() => handleAppClick(app)} 
            className="group flex flex-col items-center gap-3 w-24 h-32 transition-all hover:bg-white/5 rounded-2xl p-2"
          >
            <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-all border border-white/20 backdrop-blur-md group-hover:border-white/40`}>
              {app.icon}
            </div>
            <span className="text-[10px] font-black text-white text-center drop-shadow-[0_2px_10px_rgba(0,0,0,1)] uppercase tracking-tight">
              {app.label}
            </span>
          </button>
        )))}
      </main>

      <div className="absolute bottom-10 right-10 z-20 flex flex-col gap-4">
         {hasPermission(Permission.CREATE_REPORTS) && (
           <>
            <button onClick={() => navigate('/incident-report')} className="bg-blue-600/90 hover:bg-blue-500 backdrop-blur-md text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-5 transition-all border border-white/10 active:scale-95">
                <span className="text-xl">📝</span> Neuer Einsatzbericht
            </button>
            <button onClick={() => navigate('/criminal-complaint')} className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-5 transition-all border border-white/10 active:scale-95">
                <span className="text-xl">⚖️</span> Neue Strafanzeige
            </button>
           </>
         )}
      </div>

      {activeWindow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-6xl bg-[#0f172a] border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,0.9)] flex flex-col animate-in zoom-in duration-300 overflow-hidden max-h-[90vh]">
            
            <div className="h-16 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-10 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-5">
                <span className="text-2xl">{apps.find(a => a.id === activeWindow)?.icon}</span>
                <span className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em]">{apps.find(a => a.id === activeWindow)?.label}</span>
              </div>
              <button onClick={() => {setActiveWindow(null); setSelectedApp(null); setSelectedSubmission(null);}} className="text-slate-500 hover:text-white transition-all text-2xl p-2 hover:rotate-90">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeWindow === 'mail' && (
                <div className="p-12">
                  {!selectedSubmission ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-end mb-10">
                        <div>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Bürgerhinweise</h2>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Schnittstelle Internetwache</p>
                        </div>
                        <div className="bg-blue-600/10 border border-blue-600/20 px-6 py-2 rounded-full text-blue-500 text-[10px] font-black uppercase">{allSubmissions.filter(s => s.type === 'Hinweis').length} Meldungen</div>
                      </div>
                      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="text-slate-500 border-b border-white/10 bg-black/40 uppercase font-black tracking-widest text-[9px]"><th className="p-8">Eingang</th><th className="p-8">Betreff</th><th className="p-8 text-center">Status</th><th className="p-8 text-right">Aktion</th></tr></thead>
                          <tbody className="divide-y divide-white/5">{allSubmissions.filter(s => s.type === 'Hinweis').map(s => (
                            <tr key={s.id} className="hover:bg-white/5 transition-all">
                              <td className="p-8 text-slate-500 font-mono">{new Date(s.timestamp).toLocaleDateString('de-DE')}</td>
                              <td className="p-8 font-bold text-white uppercase tracking-tight">{s.title}</td>
                              <td className="p-8 text-center"><span className={`px-4 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${s.status === 'Neu' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-slate-500/10 border-slate-500/30 text-slate-500'}`}>{s.status}</span></td>
                              <td className="p-8 text-right"><button onClick={() => {setSelectedSubmission(s); updateSubmissionStatus(s.id, 'Gelesen');}} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Öffnen</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 py-12">
                      <button onClick={() => setSelectedSubmission(null)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">← Zurück zur Übersicht</button>
                      <div className="space-y-4 border-b border-white/5 pb-10">
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{selectedSubmission.title}</h2>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-slate-500">Übermittelt am {new Date(selectedSubmission.timestamp).toLocaleString('de-DE')}</span>
                          <span className="text-blue-500">Kontakt: {selectedSubmission.contactInfo}</span>
                        </div>
                      </div>
                      <div className="p-12 bg-slate-900/80 border border-white/5 rounded-[48px] text-slate-200 text-lg leading-relaxed whitespace-pre-wrap shadow-inner min-h-[300px] font-light">{selectedSubmission.content}</div>
                      {hasPermission(Permission.MANAGE_TIPS) && (
                        <div className="flex gap-6">
                           <button onClick={() => deleteSubmission(selectedSubmission.id)} className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-6 rounded-[32px] font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all">Meldung löschen</button>
                           <button onClick={() => updateSubmissionStatus(selectedSubmission.id, 'Archiviert')} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-6 rounded-[32px] font-black uppercase text-xs tracking-widest transition-all">Meldung Archivieren</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeWindow === 'apps' && (
                <div className="p-12">
                  {!selectedApp ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-12">
                        <div>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Bewerber-Portal</h2>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Personalwesen Teamstadt</p>
                        </div>
                        <div className="bg-slate-900/80 border border-white/10 px-8 py-4 rounded-3xl flex flex-col items-center">
                           <span className="text-3xl font-black text-white">{allApps.length}</span>
                           <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Datenbankeinträge</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="text-slate-500 border-b border-white/10 bg-black/40 font-black uppercase tracking-widest text-[9px]"><th className="p-8">Kandidat</th><th className="p-8">Angestrebte Laufbahn</th><th className="p-8 text-center">Prüfstatus</th><th className="p-8 text-right">Verwaltung</th></tr></thead>
                          <tbody className="divide-y divide-white/5">{allApps.map(a => (
                            <tr key={a.id} className="hover:bg-white/5 transition-all">
                              <td className="p-8"><span className="font-black text-white uppercase text-sm tracking-tight">{a.name}</span></td>
                              <td className="p-8 font-bold text-slate-400 uppercase tracking-widest text-[10px]">{a.careerPath}</td>
                              <td className="p-8 text-center">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                                  a.status === 'Eingegangen' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                  a.status === 'Eingeladen' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                  a.status === 'Abgelehnt' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                  'bg-slate-500/10 border-slate-500/30 text-slate-500'
                                }`}>{a.status}</span>
                              </td>
                              <td className="p-8 text-right"><button onClick={() => setSelectedApp(a)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">Dossier öffnen</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto space-y-12 pb-24 pt-8">
                      <button onClick={() => setSelectedApp(null)} className="flex items-center gap-3 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"><span>←</span> Zurück zum Bewerberpool</button>
                      <h2 className="text-7xl font-black text-white uppercase tracking-tighter leading-none">{selectedApp.name}</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/80 p-10 rounded-[40px] border border-white/5 shadow-xl">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Personalien</h4>
                          <div className="space-y-1">
                            <p className="text-white font-black text-lg uppercase tracking-tight">{selectedApp.name}</p>
                            <p className="text-slate-400 text-xs font-bold">{selectedApp.icBirthDate}</p>
                          </div>
                        </div>
                        <div className="bg-slate-900/80 p-10 rounded-[40px] border border-white/5 shadow-xl">
                          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Laufbahn</h4>
                          <p className="text-white font-black text-lg uppercase tracking-tight">{selectedApp.careerPath}</p>
                        </div>
                        <div className="bg-slate-900/80 p-10 rounded-[40px] border border-white/5 shadow-xl">
                          <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-4">Prüfstatus</h4>
                          <p className="text-white font-black text-lg uppercase tracking-tight">{selectedApp.status}</p>
                        </div>
                      </div>

                      <div className="p-12 bg-slate-900/40 border border-white/5 rounded-[56px] shadow-inner">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Motivationsschreiben</h4>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-light text-lg">{selectedApp.motivation}</p>
                      </div>

                      <div className="p-12 bg-slate-900/40 border border-white/5 rounded-[56px] shadow-inner">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Lebenslauf / Qualifikationen</h4>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-light text-lg">{selectedApp.cv}</p>
                      </div>

                      {hasPermission(Permission.MANAGE_APPLICATIONS) && (
                        <div className="flex gap-6 pt-10">
                            <button onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-8 rounded-[36px] font-black uppercase text-sm tracking-[0.3em] shadow-2xl shadow-emerald-950/40 transition-all">Zum Gespräch einladen</button>
                            <button onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} className="flex-1 bg-red-600/10 text-red-500 border border-red-500/20 py-8 rounded-[36px] font-black uppercase text-sm tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all">Bewerbung Ablehnen</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
