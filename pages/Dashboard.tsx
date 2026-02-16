
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Permission, CitizenSubmission } from '../types';
import { DASHBOARD_BG } from '../constants';
import { dbCollections, onSnapshot, query, orderBy, limit } from '../firebase';

interface DesktopApp {
  id: string;
  label: string;
  icon: string;
  path: string;
  permission?: Permission;
  color: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [newTips, setNewTips] = useState<CitizenSubmission[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!user || !hasPermission(Permission.VIEW_TIPS)) return;

    // Listen for new tips (status: 'Neu')
    const unsubTips = onSnapshot(query(dbCollections.submissions, orderBy("timestamp", "desc"), limit(5)), (snap) => {
      const tips = snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenSubmission));
      const activeNewTips = tips.filter(t => t.status === 'Neu');
      
      if (activeNewTips.length > 0 && activeNewTips.length > newTips.length) {
        setShowNotification(true);
      }
      setNewTips(activeNewTips);
    });

    return () => unsubTips();
  }, [user]);

  const apps: DesktopApp[] = [
    { id: 'cases', label: 'Vorgangssuche', icon: '📁', color: 'bg-blue-700', path: '/cases', permission: Permission.VIEW_REPORTS },
    { id: 'fleet', label: 'Fuhrpark', icon: '🚓', color: 'bg-blue-500', path: '/fleet', permission: Permission.VIEW_REPORTS },
    { id: 'evidence', label: 'Asservatenkammer', icon: '📦', color: 'bg-orange-500', path: '/evidence', permission: Permission.VIEW_REPORTS },
    { id: 'warrants', label: 'Fahndung', icon: '🔍', color: 'bg-red-600', path: '/warrants', permission: Permission.VIEW_WARRANTS },
    { id: 'reports', label: 'Einsatzberichte', icon: '📝', color: 'bg-blue-600', permission: Permission.VIEW_REPORTS, path: '/incident-report' },
    { id: 'complaints', label: 'Strafanzeigen', icon: '⚖️', color: 'bg-slate-700', permission: Permission.CREATE_REPORTS, path: '/criminal-complaint' },
    { id: 'mail', label: 'Bürgerhinweise', icon: '💡', color: 'bg-amber-600', permission: Permission.VIEW_TIPS, path: '/tips' },
    { id: 'personnel', label: 'Administration', icon: '⚙️', color: 'bg-indigo-600', permission: Permission.ADMIN_ACCESS, path: '/admin' },
    { id: 'apps', label: 'Bewerbungen', icon: '📂', color: 'bg-emerald-600', permission: Permission.VIEW_APPLICATIONS, path: '/applications' },
  ];

  if (!user) return null;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col relative font-sans select-none">
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover transition-opacity duration-1000"
        style={{ 
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.85)), url('${DASHBOARD_BG}')`,
          backgroundPosition: '50% 30%'
        }}
      ></div>

      {/* Subtle Notification Toast */}
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

      {/* Desktop Grid Layout - Top Left Aligned */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-10 lg:p-14">
        
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
             <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
             <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Operationale Anwendungen</h2>
          </div>

          {/* Grid starts at top left, not centered */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-8 gap-y-12">
            {apps.map((app) => (hasPermission(app.permission || Permission.VIEW_REPORTS) && (
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
            )))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
