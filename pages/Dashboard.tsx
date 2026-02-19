
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Permission, CitizenSubmission, IncidentReport, Reminder } from '../types';
import { DASHBOARD_BG } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, limit, doc, updateDoc, db } from '../firebase';

interface DesktopApp {
  id: string;
  label: string;
  icon: string;
  path: string;
  permission: Permission;
  color: string;
  group: 'Dienstbetrieb' | 'Ermittlungen' | 'Verwaltung';
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [newTips, setNewTips] = useState<CitizenSubmission[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [upcomingReminders, setUpcomingReminders] = useState<{caseId: string, caseTitle: string, reminder: Reminder}[]>([]);

  useEffect(() => {
    if (!user) return;

    if (hasPermission(Permission.VIEW_TIPS)) {
      const unsubTips = onSnapshot(query(dbCollections.submissions, orderBy("timestamp", "desc"), limit(5)), (snap) => {
        const tips = snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenSubmission));
        const activeNewTips = tips.filter(t => t.status === 'Neu');
        if (activeNewTips.length > 0 && activeNewTips.length > newTips.length) {
          setShowNotification(true);
        }
        setNewTips(activeNewTips);
      });
      return () => unsubTips();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubReports = onSnapshot(query(dbCollections.reports, orderBy("timestamp", "desc"), limit(50)), (snap) => {
      const allReports = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport));
      const remindersList: {caseId: string, caseTitle: string, reminder: Reminder}[] = [];
      
      allReports.forEach(report => {
        if (report.reminders && report.reminders.length > 0) {
          report.reminders.forEach(rem => {
            if (!rem.completed) {
              remindersList.push({
                caseId: report.id,
                caseTitle: report.title || report.violation || report.reportNumber,
                reminder: rem
              });
            }
          });
        }
      });

      remindersList.sort((a, b) => new Date(a.reminder.dueDate).getTime() - new Date(b.reminder.dueDate).getTime());
      setUpcomingReminders(remindersList.slice(0, 5));
    });

    return () => unsubReports();
  }, [user]);

  const toggleReminder = async (caseId: string, reminderId: string) => {
    const reportRef = doc(db, "reports", caseId);
    onSnapshot(reportRef, (s) => {
        if (s.exists()) {
            const data = s.data() as IncidentReport;
            const updatedReminders = data.reminders?.map(r => 
                r.id === reminderId ? { ...r, completed: !r.completed } : r
            );
            updateDoc(reportRef, { reminders: updatedReminders });
        }
    });
  };

  const apps: DesktopApp[] = [
    // Dienstbetrieb
    { id: 'reports', label: 'Einsatzberichte', icon: '📝', color: 'bg-blue-600', permission: Permission.VIEW_REPORTS, path: '/incident-report', group: 'Dienstbetrieb' },
    { id: 'complaints', label: 'Strafanzeigen', icon: '⚖️', color: 'bg-slate-700', permission: Permission.CREATE_REPORTS, path: '/criminal-complaint', group: 'Dienstbetrieb' },
    { id: 'calendar', label: 'Kalender', icon: '📅', color: 'bg-blue-800', path: '/calendar', permission: Permission.VIEW_CALENDAR, group: 'Dienstbetrieb' },
    { id: 'press', label: 'Presse-Portal', icon: '📰', color: 'bg-indigo-600', permission: Permission.MANAGE_NEWS, path: '/press', group: 'Dienstbetrieb' },
    
    // Ermittlungen
    { id: 'cases', label: 'Vorgangssuche', icon: '📁', color: 'bg-blue-700', path: '/cases', permission: Permission.VIEW_REPORTS, group: 'Ermittlungen' },
    { id: 'warrants', label: 'Fahndung', icon: '🔍', color: 'bg-red-600', path: '/warrants', permission: Permission.VIEW_WARRANTS, group: 'Ermittlungen' },
    { id: 'evidence', label: 'Asservatenkammer', icon: '📦', color: 'bg-orange-500', path: '/evidence', permission: Permission.MANAGE_EVIDENCE, group: 'Ermittlungen' },
    { id: 'mail', label: 'Bürgerhinweise', icon: '💡', color: 'bg-amber-600', permission: Permission.VIEW_TIPS, path: '/tips', group: 'Ermittlungen' },
    
    // Verwaltung
    { id: 'fleet', label: 'Fuhrpark', icon: '🚓', color: 'bg-blue-500', path: '/fleet', permission: Permission.MANAGE_FLEET, group: 'Verwaltung' },
    { id: 'apps', label: 'Bewerbungen', icon: '📂', color: 'bg-emerald-600', permission: Permission.VIEW_APPLICATIONS, path: '/applications', group: 'Verwaltung' },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.ADMIN_ACCESS, path: '/admin', group: 'Verwaltung' },
  ];

  if (!user) return null;

  const categories = ['Dienstbetrieb', 'Ermittlungen', 'Verwaltung'] as const;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col relative font-sans select-none">
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover transition-opacity duration-1000"
        style={{ 
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.85)), url('${DASHBOARD_BG}')`,
          backgroundPosition: '50% 30%'
        }}
      ></div>

      {showNotification && newTips.length > 0 && (
        <div className="absolute top-8 right-8 z-[200] animate-in slide-in-from-right-8 duration-500">
          <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 max-w-sm">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center text-2xl animate-pulse">
              💡
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">System-Meldung</div>
              <div className="text-xs font-bold text-white uppercase tracking-tight">
                {newTips.length} neue{newTips.length > 1 ? '' : 'r'} Bürgerhinweis{newTips.length > 1 ? 'e' : ''} eingegangen
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => navigate('/tips')} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Ansehen
              </button>
              <button 
                onClick={() => setShowNotification(false)} 
                className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest text-center"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-10 lg:p-14 flex flex-col xl:flex-row gap-12">
        <div className="flex-1 space-y-16 animate-in fade-in slide-in-from-top-4 duration-700 pb-20">
          {categories.map(category => {
            const filteredApps = apps.filter(app => app.group === category && hasPermission(app.permission));
            if (filteredApps.length === 0) return null;

            return (
              <div key={category} className="space-y-8">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="w-1 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/50">{category}</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-8 gap-y-12">
                  {filteredApps.map((app) => (
                    <button 
                      key={app.id} 
                      onClick={() => navigate(app.path)} 
                      className="group flex flex-col items-center gap-4 w-24 transition-all active:scale-95"
                    >
                      <div className={`w-16 h-16 ${app.color} rounded-2xl flex items-center justify-center text-3xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:-translate-y-2 transition-all border border-white/20 backdrop-blur-md group-hover:border-white/40 group-hover:shadow-blue-900/40`}>
                        {app.icon}
                      </div>
                      <span className="text-[9px] font-black text-white/80 text-center uppercase tracking-widest group-hover:text-white transition-colors drop-shadow-lg leading-relaxed">
                        {app.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full xl:w-96 animate-in fade-in slide-in-from-right-4 duration-1000 delay-300">
           <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 h-fit shadow-2xl sticky top-0">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500">Fristen & Wiedervorlage</h3>
                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-black">{upcomingReminders.length}</span>
              </div>

              <div className="space-y-4">
                {upcomingReminders.map(({caseId, caseTitle, reminder}) => (
                  <div key={reminder.id} className="group bg-white/5 border border-white/5 hover:border-blue-500/30 p-5 rounded-2xl transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[150px]">{caseTitle}</span>
                       <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${
                         new Date(reminder.dueDate) < new Date() ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                       }`}>
                         {new Date(reminder.dueDate).toLocaleDateString('de-DE')}
                       </span>
                    </div>
                    <div className="text-[11px] font-bold text-white uppercase tracking-tight mb-4">{reminder.text}</div>
                    <div className="flex gap-2">
                       <button onClick={() => navigate('/cases')} className="flex-1 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest py-2 rounded-lg transition-all text-slate-400">Vorgang</button>
                       <button onClick={() => toggleReminder(caseId, reminder.id)} className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[9px] font-black uppercase tracking-widest py-2 rounded-lg transition-all border border-blue-500/20">Erledigt</button>
                    </div>
                  </div>
                ))}
                
                {upcomingReminders.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="text-3xl mb-4 opacity-10">📅</div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Keine anstehenden Fristen</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
