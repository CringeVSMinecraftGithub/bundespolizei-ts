
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { POLICE_LOGO_RAW } from '../constants';

interface PoliceOSWindowProps {
  title: string;
  children: React.ReactNode;
}

const PoliceOSWindow: React.FC<PoliceOSWindowProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarItems = [
    { label: 'Akten', icon: '📁', path: '/incident-report', group: 'Favorisierte Apps' },
    { label: 'Ermittlungen', icon: '🔍', path: '/criminal-complaint', group: 'Favorisierte Apps' },
    { label: 'Einstellungen', icon: '⚙️', path: '/admin', group: 'Oft genutzte Apps' },
    { label: 'Mail', icon: '✉️', path: '/dashboard', group: 'Oft genutzte Apps' },
    { label: 'Akten', icon: '📂', path: '/incident-report', group: 'Oft genutzte Apps' },
    { label: 'Officer', icon: '👮', path: '/dashboard', group: 'Oft genutzte Apps' },
    { label: 'Kalender', icon: '📅', path: '/dashboard', group: 'Oft genutzte Apps' },
    { label: 'Wissensdatenbank', icon: '📖', path: '/dashboard', group: 'Oft genutzte Apps' },
  ];

  return (
    <div className="h-screen w-screen bg-[#111317] flex flex-col overflow-hidden text-slate-300 select-none">
      {/* Window Title Bar */}
      <div className="h-8 bg-[#005a9e] flex items-center justify-between px-2 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <img src={POLICE_LOGO_RAW} alt="BPOL" className="h-4 w-auto invert brightness-0" />
          <span className="text-[11px] font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center h-full">
          <button className="h-full px-3 hover:bg-white/10 text-white text-xs">_</button>
          <button className="h-full px-3 hover:bg-white/10 text-white text-xs">□</button>
          <button onClick={() => navigate('/dashboard')} className="h-full px-3 hover:bg-red-600 text-white text-xs">✕</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 md:w-48 bg-[#1a1c23] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar py-2">
          {['Favorisierte Apps', 'Oft genutzte Apps'].map((group) => (
            <div key={group} className="mb-4">
              <div className="px-4 py-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">
                {group}
              </div>
              {sidebarItems.filter(i => i.group === group).map((item, idx) => (
                <button
                  key={`${item.label}-${idx}`}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-all text-left ${location.pathname === item.path ? 'bg-white/5 border-l-2 border-[#005a9e]' : 'border-l-2 border-transparent'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-semibold text-slate-400 hidden md:block">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#16181d] p-8 custom-scrollbar relative">
          {children}
        </main>
      </div>

      {/* OS Taskbar (Bottom) */}
      <footer className="h-10 bg-[#0c0e12] border-t border-white/5 flex items-center justify-between px-2 shrink-0 z-50">
        <div className="flex items-center gap-1 h-full">
          <button onClick={() => navigate('/dashboard')} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded transition-all">
             <img src={POLICE_LOGO_RAW} alt="Start" className="h-5 w-auto" />
          </button>
          <div className="h-8 px-3 bg-white/5 border-b border-[#005a9e] flex items-center gap-2 rounded-t transition-all ml-1">
             <span className="text-[10px] text-white font-medium">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 h-full pr-4 text-slate-500">
           <div className="text-[10px] font-medium hidden lg:block italic">
             CopNet since 2018 - bring your Roleplay to the next level! | Impressum | Datenschutz
           </div>
           <div className="flex flex-col items-end leading-none">
             <span className="text-[10px] font-bold text-slate-300">
               {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
             </span>
             <span className="text-[9px] font-medium">
               {new Date().toLocaleDateString('de-DE')}
             </span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default PoliceOSWindow;
