
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { JobApplication, IncidentReport, Permission, User, CitizenSubmission } from '../types';
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
  const { user, isSidebarOpen, setSidebarOpen, hasPermission, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);

  // Firestore Data States
  const [allApps, setAllApps] = useState<JobApplication[]>([]);
  const [allReports, setAllReports] = useState<IncidentReport[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<CitizenSubmission[]>([]);
  
  // Selection states
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<CitizenSubmission | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Real-time Listeners
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
    } catch (e) { console.error(e); }
  };

  const apps: DesktopApp[] = [
    { id: 'fleet', label: 'Fuhrpark', icon: '🚓', color: 'bg-blue-500' },
    { id: 'evidence', label: 'Asservatenkammer', icon: '📦', color: 'bg-orange-500' },
    { id: 'warrants', label: 'Fahndung', icon: '🔍', color: 'bg-red-600', permission: Permission.VIEW_WARRANTS },
    { id: 'reports', label: 'Einsatzberichte', icon: '📝', color: 'bg-blue-600', permission: Permission.VIEW_REPORTS, path: '/incident-report' },
    { id: 'complaints', label: 'Strafanzeigen', icon: '⚖️', color: 'bg-slate-700', permission: Permission.CREATE_REPORTS, path: '/criminal-complaint' },
    { id: 'mail', label: 'Posteingang', icon: '📥', color: 'bg-amber-600', permission: Permission.VIEW_REPORTS },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.MANAGE_USERS, path: '/admin' },
    { id: 'apps', label: 'Bewerbungen', icon: '📁', color: 'bg-emerald-600', permission: Permission.MANAGE_USERS },
    { id: 'radio', label: 'Funk', icon: '📻', color: 'bg-gray-600' },
  ];

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-[#000000] overflow-hidden flex flex-col relative font-sans select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e3a8a33,transparent)] pointer-events-none"></div>

      <main className="flex-1 p-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 auto-rows-min gap-10 z-10 overflow-y-auto custom-scrollbar">
        {apps.map((app) => (hasPermission(app.permission || Permission.VIEW_REPORTS) && (
          <button key={app.id} onClick={() => handleAppClick(app)} className="group flex flex-col items-center gap-2 w-24 h-28 transition-all hover:bg-white/5 rounded-xl p-2">
            <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-black/50 group-hover:scale-110 transition-all border border-white/10`}>{app.icon}</div>
            <span className="text-[11px] font-semibold text-white text-center drop-shadow-md">{app.label}</span>
          </button>
        )))}
      </main>

      {activeWindow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-[4px] animate-in fade-in">
          <div className="w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in overflow-hidden max-h-[85vh]">
            <div className="h-12 bg-slate-900 flex items-center justify-between px-6 border-b border-white/5">
              <span className="text-[10px] font-black uppercase text-blue-400">{apps.find(a => a.id === activeWindow)?.label}</span>
              <button onClick={() => {setActiveWindow(null); setSelectedApp(null); setSelectedSubmission(null);}} className="text-slate-500 hover:text-white transition-all">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {activeWindow === 'mail' && (
                !selectedSubmission ? (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500 border-b border-white/10"><th className="pb-4">Typ</th><th className="pb-4">Betreff</th><th className="pb-4 text-right">Aktion</th></tr></thead>
                    <tbody>{allSubmissions.map(s => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all"><td className="py-4">{s.type}</td><td className="py-4 font-bold">{s.title}</td><td className="py-4 text-right"><button onClick={() => {setSelectedSubmission(s); updateSubmissionStatus(s.id, 'Gelesen');}} className="text-blue-500">Öffnen</button></td></tr>
                    ))}</tbody>
                  </table>
                ) : (
                  <div className="space-y-6"><h2 className="text-2xl font-black">{selectedSubmission.title}</h2><div className="p-6 bg-white/5 rounded-2xl whitespace-pre-wrap">{selectedSubmission.content}</div><button onClick={() => setSelectedSubmission(null)} className="text-blue-500">Zurück</button></div>
                )
              )}
              {activeWindow === 'apps' && (
                !selectedApp ? (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-slate-500 border-b border-white/10"><th className="pb-4">Bewerber</th><th className="pb-4">Laufbahn</th><th className="pb-4 text-right">Aktion</th></tr></thead>
                    <tbody>{allApps.map(a => (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-all"><td className="py-4 font-bold uppercase">{a.name}</td><td className="py-4">{a.careerPath}</td><td className="py-4 text-right"><button onClick={() => setSelectedApp(a)} className="text-blue-500">Prüfen</button></td></tr>
                    ))}</tbody>
                  </table>
                ) : (
                  <div className="space-y-6"><h2 className="text-2xl font-black uppercase">{selectedApp.name} - {selectedApp.careerPath}</h2><div className="grid grid-cols-2 gap-8"><div className="p-6 bg-white/5 rounded-2xl"><h4 className="font-bold mb-4">Motivation</h4>{selectedApp.motivation}</div><div className="p-6 bg-white/5 rounded-2xl"><h4 className="font-bold mb-4">Details</h4>OOC: {selectedApp.oocAge} | Discord: {selectedApp.discordId}</div></div><div className="flex gap-4"><button onClick={() => updateAppStatus(selectedApp.id, 'Eingeladen')} className="bg-emerald-600 px-6 py-2 rounded-lg font-bold">Einladen</button><button onClick={() => updateAppStatus(selectedApp.id, 'Abgelehnt')} className="bg-red-600 px-6 py-2 rounded-lg font-bold">Ablehnen</button></div></div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="h-12 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-2 z-[100]">
        <div className="flex items-center gap-1 h-full"><button onClick={() => setIsStartMenuOpen(!isStartMenuOpen)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10"><img src={POLICE_LOGO_RAW} className="h-7 w-auto" /></button></div>
        <div className="flex items-center gap-4 h-full pr-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10">🔔</button>
          <div className="flex flex-col items-end leading-none"><span className="text-[11px] font-black text-white">{time.toLocaleTimeString()}</span><span className="text-[8px] text-slate-500 uppercase">{time.toLocaleDateString()}</span></div>
        </div>
      </footer>

      {isStartMenuOpen && (
        <div className="absolute bottom-14 left-2 w-80 bg-[#0f172a] border border-white/10 rounded-3xl p-4 z-[150] shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-white/5 mb-4 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">{user.lastName[0]}</div><div className="text-[10px] font-black uppercase text-white">{user.rank} {user.lastName}</div></div>
          <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-4 p-4 hover:bg-red-900/20 text-red-500 rounded-2xl transition-all">🚪<span className="text-[10px] font-black uppercase tracking-[0.2em]">Abmelden</span></button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
