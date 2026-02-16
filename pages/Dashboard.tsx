
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { JobApplication, IncidentReport, Permission, CitizenSubmission } from '../types';
import { POLICE_LOGO_RAW, DASHBOARD_BG } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';

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
  const { user, hasPermission, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);

  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<CitizenSubmission[]>([]);
  
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<CitizenSubmission | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const unsubApps = onSnapshot(query(dbCollections.applications, orderBy("timestamp", "desc")), (snap) => {
      setAllApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication)));
    });
    const unsubSubmissions = onSnapshot(query(dbCollections.submissions, orderBy("timestamp", "desc")), (snap) => {
      setAllSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenSubmission)));
    });

    return () => {
      clearInterval(timer);
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
    { id: 'mail', label: 'Posteingang', icon: '📥', color: 'bg-amber-600', permission: Permission.VIEW_REPORTS },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.ADMIN_ACCESS, path: '/admin' },
    { id: 'apps', label: 'Bewerbungen', icon: '📂', color: 'bg-emerald-600', permission: Permission.VIEW_APPLICATIONS },
  ];

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-[#020617] overflow-hidden flex flex-col relative font-sans select-none">
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover transition-opacity duration-1000"
        style={{ 
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.7)), url('${DASHBOARD_BG}')`,
          backgroundPosition: '50% 30%'
        }}
      ></div>

      <main className="flex-1 p-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 auto-rows-min gap-10 z-10 overflow-y-auto custom-scrollbar">
        {apps.map((app) => (hasPermission(app.permission || Permission.VIEW_REPORTS) && (
          <button 
            key={app.id} 
            onClick={() => handleAppClick(app)} 
            className="group flex flex-col items-center gap-2 w-24 h-28 transition-all hover:bg-white/10 rounded-xl p-2"
          >
            <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-all border border-white/20 backdrop-blur-sm group-hover:border-white/40`}>
              {app.icon}
            </div>
            <span className="text-[11px] font-bold text-white text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase tracking-tight">
              {app.label}
            </span>
          </button>
        )))}
      </main>

      <div className="absolute bottom-20 right-10 z-20 flex flex-col gap-3">
         {hasPermission(Permission.CREATE_REPORTS) && (
           <>
            <button onClick={() => navigate('/incident-report')} className="bg-blue-600/90 hover:bg-blue-500 backdrop-blur-md text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-4 transition-all border border-white/10 active:scale-95">
                <span className="text-xl">📝</span> Neuer Einsatzbericht
            </button>
            <button onClick={() => navigate('/criminal-complaint')} className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-4 transition-all border border-white/10 active:scale-95">
                <span className="text-xl">⚖️</span> Neue Strafanzeige
            </button>
           </>
         )}
      </div>

      {activeWindow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-6xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in duration-300 overflow-hidden max-h-[92vh]">
            
            <div className="h-14 bg-slate-900 flex items-center justify-between px-8 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xl">{apps.find(a => a.id === activeWindow)?.icon}</span>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">{apps.find(a => a.id === activeWindow)?.label}</span>
              </div>
              <button onClick={() => {setActiveWindow(null); setSelectedApp(null); setSelectedSubmission(null);}} className="text-slate-500 hover:text-white transition-all text-xl p-2">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeWindow === 'mail' && (
                <div className="p-10">
                  {!selectedSubmission ? (
                    <div className="space-y-4">
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">Posteingang</h2>
                      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="text-slate-500 border-b border-white/10 bg-black/40"><th className="p-6">Eingang</th><th className="p-6">Typ</th><th className="p-6">Betreff</th><th className="p-6 text-right">Aktion</th></tr></thead>
                          <tbody>{allSubmissions.map(s => (
                            <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                              <td className="p-6 text-slate-500">{new Date(s.timestamp).toLocaleDateString('de-DE')}</td>
                              <td className="p-6 font-bold text-blue-500 uppercase">{s.type}</td>
                              <td className="p-6 font-bold text-white">{s.title}</td>
                              <td className="p-6 text-right"><button onClick={() => {setSelectedSubmission(s); updateSubmissionStatus(s.id, 'Gelesen');}} className="text-blue-500 font-black uppercase text-[10px]">Öffnen</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <button onClick={() => setSelectedSubmission(null)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest">← Zurück zur Übersicht</button>
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{selectedSubmission.title}</h2>
                        <p className="text-slate-500 text-xs">{new Date(selectedSubmission.timestamp).toLocaleString('de-DE')} • Status: {selectedSubmission.status}</p>
                      </div>
                      <div className="p-8 bg-slate-900/80 border border-white/5 rounded-[40px] text-slate-300 leading-relaxed whitespace-pre-wrap shadow-inner">{selectedSubmission.content}</div>
                    </div>
                  )}
                </div>
              )}

              {activeWindow === 'apps' && (
                <div className="p-10">
                  {!selectedApp ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-10">
                        <div>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Bewerbungs-Portal</h2>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Personalverwaltung Teamstadt</p>
                        </div>
                        <div className="bg-slate-900 border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center">
                           <span className="text-2xl font-black text-white">{allApps.length}</span>
                           <span className="text-[8px] text-slate-500 uppercase font-black">Gesamt</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="text-slate-500 border-b border-white/10 bg-black/40"><th className="p-6">Name</th><th className="p-6">Laufbahn</th><th className="p-6">Status</th><th className="p-6 text-right">Aktion</th></tr></thead>
                          <tbody>{allApps.map(a => (
                            <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                              <td className="p-6"><span className="font-black text-white uppercase text-sm">{a.name}</span></td>
                              <td className="p-6 font-bold text-slate-400">{a.careerPath}</td>
                              <td className="p-6">
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                                  a.status === 'Eingegangen' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                  a.status === 'Eingeladen' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                  a.status === 'Abgelehnt' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                  'bg-slate-500/10 border-slate-500/30 text-slate-500'
                                }`}>{a.status}</span>
                              </td>
                              <td className="p-6 text-right"><button onClick={() => setSelectedApp(a)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">Details</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto space-y-10 pb-20">
                      <button onClick={() => setSelectedApp(null)} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">← Zurück</button>
                      <h2 className="text-6xl font-black text-white uppercase tracking-tighter">{selectedApp.name}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900/60 p-8 rounded-[32px] border border-white/5">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Personalien</h4>
                          <p className="text-white font-bold">{selectedApp.name}</p>
                          <p className="text-slate-400 text-xs mt-2">{selectedApp.icBirthDate}</p>
                        </div>
                        <div className="bg-slate-900/60 p-8 rounded-[32px] border border-white/5">
                          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Laufbahn</h4>
                          <p className="text-white font-bold uppercase">{selectedApp.careerPath}</p>
                        </div>
                        <div className="bg-slate-900/60 p-8 rounded-[32px] border border-white/5">
                          <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Status</h4>
                          <p className="text-white font-bold uppercase">{selectedApp.status}</p>
                        </div>
                      </div>
                      <div className="p-10 bg-slate-900/40 border border-white/5 rounded-[48px]">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6">Motivation</h4>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedApp.motivation}</p>
                      </div>
                      {hasPermission(Permission.MANAGE_APPLICATIONS) && (
                        <div className="flex gap-4">
                            <button onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} className="flex-1 bg-emerald-600 py-6 rounded-[28px] font-black uppercase text-xs tracking-widest">Einladen</button>
                            <button onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} className="flex-1 bg-red-600/20 text-red-500 border border-red-500/30 py-6 rounded-[28px] font-black uppercase text-xs tracking-widest">Ablehnen</button>
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

      <footer className="h-12 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-2 z-[100] shrink-0">
        <div className="flex items-center gap-1 h-full">
          <button onClick={() => setIsStartMenuOpen(!isStartMenuOpen)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all">
            <img src={POLICE_LOGO_RAW} className="h-7 w-auto" alt="Logo" />
          </button>
          <div className="flex items-center gap-1 px-3 h-full">
             <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center gap-4 h-full pr-4 text-slate-400">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[11px] font-black text-white">{time.toLocaleTimeString('de-DE')}</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest">{time.toLocaleDateString('de-DE')}</span>
          </div>
        </div>
      </footer>

      {isStartMenuOpen && (
        <div className="absolute bottom-14 left-2 w-80 bg-[#0f172a] border border-white/10 rounded-3xl p-4 z-[150] shadow-2xl animate-in slide-in-from-bottom-4 backdrop-blur-3xl">
          <div className="p-6 border-b border-white/5 mb-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-black text-white text-xl shadow-lg">{user.lastName[0]}</div>
            <div className="flex flex-col">
              <div className="text-[11px] font-black uppercase text-white tracking-tighter">{user.rank} {user.lastName}</div>
              <div className="text-[8px] text-blue-500 font-bold uppercase tracking-widest mt-1">{user.role}</div>
            </div>
          </div>
          <div className="space-y-1">
             <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-4 p-4 hover:bg-red-900/20 text-red-500 rounded-2xl transition-all group">
                <span className="text-lg">🚪</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Abmelden</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
