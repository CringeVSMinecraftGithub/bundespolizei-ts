
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { JobApplication, IncidentReport, Permission, CitizenSubmission } from '../types';
import { POLICE_LOGO_RAW } from '../constants';
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
  const [allReports, setAllReports] = useState<IncidentReport[]>([]);
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
    const unsubReports = onSnapshot(query(dbCollections.reports, orderBy("date", "desc")), (snap) => {
      setAllReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport)));
    });

    return () => {
      clearInterval(timer);
      unsubApps();
      unsubSubmissions();
      unsubReports();
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
    { id: 'fleet', label: 'Fuhrpark', icon: '🚓', color: 'bg-blue-500', path: '/fleet', permission: Permission.VIEW_REPORTS },
    { id: 'evidence', label: 'Asservatenkammer', icon: '📦', color: 'bg-orange-500', path: '/evidence', permission: Permission.VIEW_REPORTS },
    { id: 'warrants', label: 'Fahndung', icon: '🔍', color: 'bg-red-600', path: '/warrants', permission: Permission.VIEW_WARRANTS },
    { id: 'reports', label: 'Einsatzberichte', icon: '📝', color: 'bg-blue-600', permission: Permission.VIEW_REPORTS, path: '/incident-report' },
    { id: 'complaints', label: 'Strafanzeigen', icon: '⚖️', color: 'bg-slate-700', permission: Permission.CREATE_REPORTS, path: '/criminal-complaint' },
    { id: 'mail', label: 'Posteingang', icon: '📥', color: 'bg-amber-600', permission: Permission.VIEW_REPORTS },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.MANAGE_USERS, path: '/admin' },
    { id: 'apps', label: 'Bewerbungen', icon: '📁', color: 'bg-emerald-600', permission: Permission.MANAGE_USERS },
  ];

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-[#000000] overflow-hidden flex flex-col relative font-sans select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e3a8a33,transparent)] pointer-events-none"></div>

      {/* Desktop Icons */}
      <main className="flex-1 p-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 auto-rows-min gap-10 z-10 overflow-y-auto custom-scrollbar">
        {apps.map((app) => (hasPermission(app.permission || Permission.VIEW_REPORTS) && (
          <button key={app.id} onClick={() => handleAppClick(app)} className="group flex flex-col items-center gap-2 w-24 h-28 transition-all hover:bg-white/5 rounded-xl p-2">
            <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-black/50 group-hover:scale-110 transition-all border border-white/10`}>{app.icon}</div>
            <span className="text-[11px] font-semibold text-white text-center drop-shadow-md">{app.label}</span>
          </button>
        )))}
      </main>

      {/* Window System */}
      {activeWindow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-6xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in duration-300 overflow-hidden max-h-[92vh]">
            
            {/* Title Bar */}
            <div className="h-14 bg-slate-900 flex items-center justify-between px-8 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xl">{apps.find(a => a.id === activeWindow)?.icon}</span>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">{apps.find(a => a.id === activeWindow)?.label}</span>
              </div>
              <button onClick={() => {setActiveWindow(null); setSelectedApp(null); setSelectedSubmission(null);}} className="text-slate-500 hover:text-white transition-all text-xl p-2">✕</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Mail / Submissions View */}
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

              {/* Job Applications View */}
              {activeWindow === 'apps' && (
                <div className="p-10">
                  {!selectedApp ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-10">
                        <div>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Bewerbungs-Portal</h2>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Personalverwaltung Teamstadt</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="bg-slate-900 border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center">
                              <span className="text-2xl font-black text-white">{allApps.length}</span>
                              <span className="text-[8px] text-slate-500 uppercase font-black">Gesamt</span>
                           </div>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="text-slate-500 border-b border-white/10 bg-black/40"><th className="p-6">Name</th><th className="p-6">Laufbahn</th><th className="p-6">Status</th><th className="p-6 text-right">Aktion</th></tr></thead>
                          <tbody>{allApps.map(a => (
                            <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="font-black text-white uppercase text-sm">{a.name}</span>
                                  <span className="text-slate-500 text-[9px] uppercase tracking-widest">{new Date(a.timestamp).toLocaleDateString('de-DE')}</span>
                                </div>
                              </td>
                              <td className="p-6 font-bold text-slate-400">{a.careerPath}</td>
                              <td className="p-6">
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                                  a.status === 'Eingegangen' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                  a.status === 'Eingeladen' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                  a.status === 'Abgelehnt' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                  'bg-slate-500/10 border-slate-500/30 text-slate-500'
                                }`}>{a.status}</span>
                              </td>
                              <td className="p-6 text-right"><button onClick={() => setSelectedApp(a)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">Details ansehen</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto space-y-10 pb-20">
                      
                      {/* Detailed App Header */}
                      <div className="flex justify-between items-center">
                        <button onClick={() => setSelectedApp(null)} className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                           <span className="text-lg">←</span> Zurück zur Liste
                        </button>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] text-slate-500 font-black uppercase">Eingang:</span>
                           <span className="text-[10px] text-slate-300 font-mono">{new Date(selectedApp.timestamp).toLocaleString('de-DE')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/10 pb-10">
                        <div className="space-y-4">
                          <div className="bg-blue-600/10 border border-blue-600/30 text-blue-500 text-[9px] font-black uppercase px-3 py-1 rounded-full w-fit tracking-[0.2em]">{selectedApp.careerPath}</div>
                          <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">{selectedApp.name}</h2>
                          <p className="text-slate-400 text-lg font-medium">{selectedApp.position}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                           <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Aktueller Bewerberstatus</div>
                           <div className={`text-xl font-black uppercase px-8 py-4 rounded-[28px] border shadow-2xl ${
                                  selectedApp.status === 'Eingegangen' ? 'bg-blue-600 border-white/20 text-white' :
                                  selectedApp.status === 'Eingeladen' ? 'bg-emerald-600 border-white/20 text-white' :
                                  selectedApp.status === 'Abgelehnt' ? 'bg-red-600 border-white/20 text-white' :
                                  'bg-slate-700 border-white/20 text-white'
                                }`}>{selectedApp.status}</div>
                        </div>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Personalien IC */}
                        <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
                          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                             <span className="text-2xl">👤</span>
                             <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Personalien (IC)</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Vor- & Nachname</span><span className="text-sm font-bold text-white uppercase">{selectedApp.name}</span></div>
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Geburtsdatum</span><span className="text-sm font-bold text-white">{selectedApp.icBirthDate ? new Date(selectedApp.icBirthDate).toLocaleDateString('de-DE') : 'Unbekannt'}</span></div>
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Telefonnummer</span><span className="text-sm font-bold text-white">{selectedApp.icPhone || 'N/A'}</span></div>
                          </div>
                        </div>

                        {/* OOC & Kontakt */}
                        <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
                          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                             <span className="text-2xl">🎮</span>
                             <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Out of Character (OOC)</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Alter (Reallife)</span><span className="text-sm font-bold text-white">{selectedApp.oocAge || 'N/A'} Jahre</span></div>
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Discord Kennung</span><span className="text-sm font-bold text-white">{selectedApp.discordId || 'N/A'}</span></div>
                            {selectedApp.extraField && <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Zusatzinfo</span><span className="text-sm font-bold text-white">{selectedApp.extraField}</span></div>}
                          </div>
                        </div>

                        {/* System & Log */}
                        <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[32px] space-y-6 shadow-xl">
                          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                             <span className="text-2xl">🛠️</span>
                             <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System-Informationen</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Bewerbungs-ID</span><span className="text-[10px] font-mono text-slate-400">{selectedApp.id}</span></div>
                            <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase font-black">Gewünschte Laufbahn</span><span className="text-sm font-bold text-white uppercase">{selectedApp.careerPath}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Large Text Blocks */}
                      <div className="space-y-8">
                        <div className="p-10 bg-slate-900/40 border border-white/5 rounded-[48px] shadow-2xl">
                          <div className="flex items-center gap-4 mb-8">
                             <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center text-xl">✍️</div>
                             <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Motivation & Ziele</h4>
                          </div>
                          <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap border-l-4 border-blue-600/30 pl-8">{selectedApp.motivation}</div>
                        </div>

                        <div className="p-10 bg-slate-900/40 border border-white/5 rounded-[48px] shadow-2xl">
                          <div className="flex items-center gap-4 mb-8">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center text-xl">📜</div>
                             <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Lebenslauf & Erfahrungen</h4>
                          </div>
                          <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap border-l-4 border-indigo-600/30 pl-8">{selectedApp.cv}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col md:flex-row gap-6 pt-10">
                        <button 
                          onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_60px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                        >
                          <span>✓</span> Bewerber Einladen
                        </button>
                        <button 
                          onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} 
                          className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.3em] border border-red-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                        >
                          <span>✕</span> Ablehnen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <footer className="h-12 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-2 z-[100] shrink-0">
        <div className="flex items-center gap-1 h-full">
          <button onClick={() => setIsStartMenuOpen(!isStartMenuOpen)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all">
            <img src={POLICE_LOGO_RAW} className="h-7 w-auto" alt="Logo" />
          </button>
        </div>
        <div className="flex items-center gap-4 h-full pr-4 text-slate-400">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[11px] font-black text-white">{time.toLocaleTimeString()}</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest">{time.toLocaleDateString()}</span>
          </div>
        </div>
      </footer>

      {/* Start Menu */}
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
