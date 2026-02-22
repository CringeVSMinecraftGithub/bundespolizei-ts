
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Permission } from '../types';

interface PoliceOSWindowProps {
  title: string;
  children: React.ReactNode;
}

const PoliceOSWindow: React.FC<PoliceOSWindowProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const sidebarItems = [
    // Dienstbetrieb
    { label: 'Kalender', icon: '📅', path: '/calendar', group: 'Dienstbetrieb', perm: Permission.VIEW_CALENDAR },
    { label: 'Presse-Portal', icon: '📰', path: '/press', group: 'Dienstbetrieb', perm: Permission.MANAGE_NEWS },
    { label: 'Einsatzberichte', icon: '📝', path: '/incident-report', group: 'Dienstbetrieb', perm: Permission.VIEW_REPORTS },
    { label: 'Strafanzeigen', icon: '⚖️', path: '/criminal-complaint', group: 'Dienstbetrieb', perm: Permission.CREATE_REPORTS },
    { label: 'Stellenausschreibungen', icon: '💼', path: '/jobs', group: 'Dienstbetrieb' },
    
    // Ermittlungen
    { label: 'Vorgangssuche', icon: '🔍', path: '/cases', group: 'Ermittlungen', perm: Permission.VIEW_REPORTS },
    { label: 'Fahndungen', icon: '👤', path: '/warrants', group: 'Ermittlungen', perm: Permission.VIEW_WARRANTS },
    { label: 'Asservaten', icon: '📦', path: '/evidence', group: 'Ermittlungen', perm: Permission.MANAGE_EVIDENCE },
    { label: 'Bürgerhinweise', icon: '💡', path: '/tips', group: 'Ermittlungen', perm: Permission.VIEW_TIPS },
    
    // Verwaltung
    { label: 'Fuhrpark', icon: '🚓', path: '/fleet', group: 'Verwaltung', perm: Permission.MANAGE_FLEET },
    { label: 'Organigramm', icon: '📊', path: '/org-chart', group: 'Verwaltung' },
    { label: 'Bewerbungen', icon: '📂', path: '/applications', group: 'Verwaltung', perm: Permission.VIEW_APPLICATIONS },
    { label: 'Administration', icon: '⚙️', path: '/admin', group: 'Verwaltung', perm: Permission.ADMIN_ACCESS },
  ];

  return (
    <div className="h-full w-full bg-[#111317] flex flex-col overflow-hidden text-slate-300 select-none animate-in fade-in duration-300">
      {/* Window Title Bar (Sub-Header) */}
      <div className="h-10 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <span className="text-xl">📁</span>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-center h-full">
          <button onClick={() => navigate('/dashboard')} className="h-full px-6 hover:bg-red-600 text-white text-sm transition-all">✕</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 md:w-56 bg-[#1a1c23] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar py-4">
          {['Dienstbetrieb', 'Ermittlungen', 'Verwaltung'].map((group) => {
            // Filter items: allow if no permission is required OR if user has the permission
            const items = sidebarItems.filter(i => i.group === group && (!i.perm || hasPermission(i.perm)));
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-6">
                <div className="px-6 py-2 text-[8px] font-black text-slate-600 uppercase tracking-widest hidden md:block border-b border-white/5 mb-2 mx-4">
                  {group}
                </div>
                {items.map((item, idx) => (
                  <button
                    key={`${item.label}-${idx}`}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-4 px-6 py-3 hover:bg-white/5 transition-all text-left ${location.pathname === item.path ? 'bg-blue-600/10 border-r-4 border-blue-500 text-blue-400' : 'text-slate-500'}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0c10] p-10 custom-scrollbar relative">
          {children}
        </main>
      </div>

      {/* OS Taskbar (Internal Mini-Status) */}
      <footer className="h-8 bg-black/60 border-t border-white/5 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">
          Zentrales Datenbanksystem der Bundespolizei Teamstadt • Autorisierte Sitzung
        </div>
        <div className="flex items-center gap-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">
           Status: <span className="text-emerald-500">Live</span>
        </div>
      </footer>
    </div>
  );
};

export default PoliceOSWindow;
