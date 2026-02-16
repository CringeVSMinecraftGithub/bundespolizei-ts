
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { POLICE_LOGO_RAW } from '../constants';

const Header: React.FC = () => {
  const { user, logout, isSidebarOpen, setSidebarOpen } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  return (
    <header className="h-24 bg-[#0a0f1e] border-b border-blue-900/40 flex items-center justify-between px-8 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative z-[100]">
      <div className="flex items-center gap-5">
        <Link to="/dashboard" className="flex items-center gap-4 group">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-14 w-auto drop-shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-transform group-hover:scale-105" />
          <div className="flex flex-col border-l border-slate-800 pl-4">
            <span className="text-xl font-black tracking-tight text-white uppercase leading-none">
              Bundespolizei
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase mt-2">
              Präsidium Teamstadt
            </span>
          </div>
        </Link>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex flex-col items-center">
        <div className="text-3xl font-black text-white/90 uppercase tracking-[-0.05em]">Bundespolizei Teamstadt</div>
        <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mt-1">Zentrales Intranet</div>
      </div>

      <div className="flex items-center gap-6">
        {user.isAdmin && (
          <Link to="/admin" className="h-12 px-6 flex items-center gap-3 bg-blue-600/10 border border-blue-600/30 rounded-xl text-[10px] font-black uppercase text-blue-500 hover:bg-blue-600 hover:text-white transition-all">
            Verwaltung
          </Link>
        )}
        
        <div className="flex items-center gap-5 pl-6 border-l border-slate-800">
          <div className="text-right flex flex-col justify-center">
            <div className="text-[12px] font-black text-white uppercase tracking-tighter leading-none">{user.rank} {user.lastName}</div>
            <div className="text-[9px] text-slate-500 font-bold mt-1.5 uppercase leading-none flex items-center justify-end gap-2">
              <span className="text-blue-500">{user.badgeNumber}</span>
              <span className="h-2 w-[1px] bg-slate-700"></span>
              <span className="text-slate-400">{user.role}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 font-black text-lg shadow-inner">
            {user.lastName[0]}
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
            title="Abmelden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
