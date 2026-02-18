
import React from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { POLICE_LOGO_RAW } from '../constants';

const Header: React.FC = () => {
  const { user, logout, setSettingsOpen, roles } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const mainRole = roles.find(r => r.id === user.role);

  return (
    <header className="h-28 bg-[#0a0f1e]/95 backdrop-blur-xl border-b border-blue-900/40 flex items-center justify-between px-12 shadow-2xl relative z-[100] shrink-0">
      {/* Linker Bereich: Logo */}
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="flex items-center gap-4 group transition-all">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-20 w-auto drop-shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform" />
        </Link>
      </div>

      {/* Zentraler Bereich: Banner - Jetzt mit vertikaler Zentrierung */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-2xl text-center whitespace-nowrap">
          Bundespolizei Teamstadt
        </h1>
        <div className="h-1.5 w-40 bg-blue-600 rounded-full mt-2 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
      </div>

      {/* Rechter Bereich: Profil & Actions */}
      <div className="flex items-center gap-6">
        <div className="text-right flex flex-col justify-center border-r border-white/10 pr-8">
          <div className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-1.5">
            {user.firstName} {user.lastName}
          </div>
          <div className="flex flex-col items-end gap-1">
             <div className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] leading-none">
                {user.rank} • {user.badgeNumber}
             </div>
             <div className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em] bg-white/5 px-3 py-1 rounded-md border border-white/5 w-fit">
                {mainRole?.name || user.role}
             </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="h-14 w-14 flex items-center justify-center rounded-[20px] bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-xl active:scale-90 group"
            title="Einstellungen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="h-14 w-14 flex items-center justify-center rounded-[20px] bg-red-900/10 border border-red-900/20 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-xl active:scale-90 group"
            title="Abmelden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
